use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// --- State ---

pub struct AppState {
    pub cwd: Mutex<String>,
    pub session_id: Mutex<Option<String>>,
    pub is_running: Mutex<bool>,
}

// --- Types ---

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileNode {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub children: Option<Vec<FileNode>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<u64>,
}

// --- Helpers ---

fn resolve_path(path: &str, cwd: &str) -> PathBuf {
    let p = Path::new(path);
    if p.is_absolute() {
        p.to_path_buf()
    } else {
        Path::new(cwd).join(path)
    }
}

fn relativize_path(path: &str, cwd: &str) -> String {
    // Strip ./ prefix
    let path = path.strip_prefix("./").unwrap_or(path);

    // If absolute, strip cwd prefix
    let result = if Path::new(path).is_absolute() {
        // Try stripping cwd with and without trailing slash
        let cwd_with_slash = if cwd.ends_with('/') {
            cwd.to_string()
        } else {
            format!("{}/", cwd)
        };
        if let Some(rel) = path.strip_prefix(&cwd_with_slash) {
            rel.to_string()
        } else if let Ok(rel) = Path::new(path).strip_prefix(cwd) {
            rel.to_string_lossy().to_string()
        } else {
            path.to_string()
        }
    } else {
        path.to_string()
    };

    // Strip any remaining ./ prefix from the result
    result.strip_prefix("./").unwrap_or(&result).to_string()
}

fn build_tree(dir: &Path, relative_base: &str, max_depth: usize, depth: usize) -> std::io::Result<Vec<FileNode>> {
    if depth >= max_depth {
        return Ok(vec![]);
    }

    let mut entries: Vec<FileNode> = vec![];
    let mut dir_entries: Vec<_> = std::fs::read_dir(dir)?
        .filter_map(|e| e.ok())
        .collect();

    dir_entries.sort_by(|a, b| {
        let a_dir = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let b_dir = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        b_dir.cmp(&a_dir).then(a.file_name().cmp(&b.file_name()))
    });

    for entry in dir_entries {
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.')
            || name == "node_modules"
            || name == "target"
            || name == "__pycache__"
            || name == "build"
            || name == "dist"
            || name == ".svelte-kit"
            || name == "venv"
            || name == ".venv"
            || name == "env"
        {
            continue;
        }

        let path = entry.path();
        let relative = if relative_base.is_empty() {
            name.clone()
        } else {
            format!("{}/{}", relative_base, name)
        };

        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let size = if !is_dir {
            entry.metadata().ok().map(|m| m.len())
        } else {
            None
        };

        let children = if is_dir {
            Some(build_tree(&path, &relative, max_depth, depth + 1)?)
        } else {
            None
        };

        entries.push(FileNode {
            name,
            path: relative,
            is_dir,
            children,
            size,
        });
    }

    Ok(entries)
}

fn compute_diff(old: &str, new: &str) -> Vec<serde_json::Value> {
    let diff = TextDiff::from_lines(old, new);
    diff.iter_all_changes()
        .map(|change| {
            let tag = match change.tag() {
                ChangeTag::Delete => "remove",
                ChangeTag::Insert => "add",
                ChangeTag::Equal => "context",
            };
            serde_json::json!({
                "type": tag,
                "content": change.value().trim_end_matches('\n'),
            })
        })
        .collect()
}

// --- FS Commands ---

#[tauri::command]
pub async fn get_cwd(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.cwd.lock().await.clone())
}

#[tauri::command]
pub async fn set_cwd(path: String, state: State<'_, AppState>) -> Result<(), String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("{} is not a directory", path));
    }
    *state.cwd.lock().await = path;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileNode>, String> {
    let p = Path::new(&path);
    if !p.is_dir() {
        return Err(format!("{} is not a directory", path));
    }
    build_tree(p, "", 6, 0).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let cwd = state.cwd.lock().await.clone();
    let full_path = resolve_path(&path, &cwd);
    tokio::fs::read_to_string(&full_path)
        .await
        .map_err(|e| format!("Failed to read {}: {}", full_path.display(), e))
}

// --- Agent Commands ---

#[tauri::command]
pub async fn send_message(
    app: AppHandle,
    message: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    {
        let mut running = state.is_running.lock().await;
        if *running {
            return Err("Agent is already processing a message".to_string());
        }
        *running = true;
    }

    let cwd = state.cwd.lock().await.clone();
    let session_id = state.session_id.lock().await.clone();

    tokio::spawn(async move {
        let result = run_agent(app.clone(), &message, &cwd, session_id.as_deref()).await;

        let state = app.state::<AppState>();
        *state.is_running.lock().await = false;

        match result {
            Ok(_) => {
                let _ = app.emit("agent:done", ());
            }
            Err(e) => {
                let _ = app.emit("agent:error", &e);
            }
        }
        let _ = app.emit("agent:status", "idle");
    });

    Ok(())
}

#[tauri::command]
pub async fn is_agent_running(state: State<'_, AppState>) -> Result<bool, String> {
    Ok(*state.is_running.lock().await)
}

// --- Agent Runner ---

async fn run_agent(
    app: AppHandle,
    message: &str,
    cwd: &str,
    session_id: Option<&str>,
) -> Result<(), String> {
    let _ = app.emit("agent:status", "thinking");

    let mut cmd = Command::new("claude");
    cmd.arg("-p")
        .arg(message)
        .arg("--output-format")
        .arg("stream-json")
        .arg("--verbose")
        .arg("--include-partial-messages")
        .current_dir(cwd)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    if let Some(sid) = session_id {
        cmd.arg("--resume").arg(sid);
    }

    let mut child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start claude CLI: {}. Is it installed?", e))?;

    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_thinking = String::new();
    let mut current_text = String::new();
    let mut block_types: Vec<String> = Vec::new();
    let mut had_text = false;

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() {
            continue;
        }

        let value: serde_json::Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(_) => continue,
        };

        let msg_type = value["type"].as_str().unwrap_or("");

        match msg_type {
            "system" => {
                if let Some(sid) = value["session_id"].as_str() {
                    let state = app.state::<AppState>();
                    *state.session_id.lock().await = Some(sid.to_string());
                }
            }
            "stream_event" => {
                let event = &value["event"];
                let event_type = event["type"].as_str().unwrap_or("");

                match event_type {
                    "content_block_start" => {
                        let index = event["index"].as_u64().unwrap_or(0) as usize;
                        let block_type = event["content_block"]["type"]
                            .as_str()
                            .unwrap_or("")
                            .to_string();

                        while block_types.len() <= index {
                            block_types.push(String::new());
                        }
                        block_types[index] = block_type.clone();

                        if block_type == "text" {
                            let _ = app.emit("agent:status", "active");
                        }
                    }
                    "content_block_delta" => {
                        let index = event["index"].as_u64().unwrap_or(0) as usize;
                        let block_type =
                            block_types.get(index).map(|s| s.as_str()).unwrap_or("");

                        match block_type {
                            "text" => {
                                if let Some(text) = event["delta"]["text"].as_str() {
                                    current_text.push_str(text);
                                    had_text = true;
                                    let _ = app.emit("agent:text-delta", text);
                                }
                            }
                            "thinking" => {
                                if let Some(text) = event["delta"]["thinking"].as_str() {
                                    current_thinking.push_str(text);
                                }
                            }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
            "assistant" => {
                // Turn complete — finalize text/thinking, then emit actions

                // Emit turn-end so frontend can finalize streamed text
                let _ = app.emit(
                    "agent:turn-end",
                    serde_json::json!({
                        "had_text": had_text,
                        "thinking": if current_thinking.is_empty() { None } else { Some(&current_thinking) },
                    }),
                );

                // Process tool_use blocks for file actions
                if let Some(content) = value["message"]["content"].as_array() {
                    for block in content {
                        if block["type"].as_str() != Some("tool_use") {
                            continue;
                        }

                        let name = block["name"].as_str().unwrap_or("");
                        let input = &block["input"];

                        let action = match name {
                            "Read" => {
                                let path =
                                    relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                serde_json::json!({
                                    "kind": "read",
                                    "path": path,
                                })
                            }
                            "Write" => {
                                let path =
                                    relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                let content = input["content"].as_str().unwrap_or("");
                                serde_json::json!({
                                    "kind": "create",
                                    "path": path,
                                    "content": content,
                                })
                            }
                            "Edit" => {
                                let path =
                                    relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                let old = input["old_string"].as_str().unwrap_or("");
                                let new = input["new_string"].as_str().unwrap_or("");
                                let diff = compute_diff(old, new);
                                serde_json::json!({
                                    "kind": "edit",
                                    "path": path,
                                    "diff": diff,
                                })
                            }
                            "MultiEdit" => {
                                let path =
                                    relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                // Combine all edits into one diff
                                let mut all_diffs = Vec::new();
                                if let Some(edits) = input["edits"].as_array() {
                                    for edit in edits {
                                        let old = edit["old_string"].as_str().unwrap_or("");
                                        let new = edit["new_string"].as_str().unwrap_or("");
                                        all_diffs.extend(compute_diff(old, new));
                                    }
                                }
                                serde_json::json!({
                                    "kind": "edit",
                                    "path": path,
                                    "diff": all_diffs,
                                })
                            }
                            "Bash" => {
                                let command = input["command"].as_str().unwrap_or("");
                                serde_json::json!({
                                    "kind": "run",
                                    "command": command,
                                })
                            }
                            "Glob" | "Grep" => {
                                let pattern = input["pattern"]
                                    .as_str()
                                    .or_else(|| input["glob"].as_str())
                                    .unwrap_or("");
                                serde_json::json!({
                                    "kind": "read",
                                    "path": pattern,
                                })
                            }
                            _ => continue,
                        };

                        let _ = app.emit("agent:action", action);
                    }
                }

                // Reset for next turn
                current_text.clear();
                current_thinking.clear();
                block_types.clear();
                had_text = false;
            }
            "result" => {
                // Final result — response is complete
            }
            _ => {}
        }
    }

    // Read stderr and wait for child to exit
    let err_output = if let Some(mut se) = stderr {
        let mut buf = String::new();
        let _ = tokio::io::AsyncReadExt::read_to_string(&mut se, &mut buf).await;
        buf
    } else {
        String::new()
    };

    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        let detail = err_output.trim();
        if !detail.is_empty() {
            return Err(format!("Claude error: {}", detail));
        }
        return Err(format!("Claude exited with status: {}", status));
    }

    Ok(())
}

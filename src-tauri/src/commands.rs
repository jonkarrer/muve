use notify_debouncer_mini::{new_debouncer, DebouncedEventKind};
use serde::{Deserialize, Serialize};
use similar::{ChangeTag, TextDiff};
use std::path::{Path, PathBuf};
use std::process::Stdio;
use std::collections::HashSet;
use std::sync::mpsc as std_mpsc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager, State};
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::Mutex;

// --- State ---

pub struct AppState {
    pub cwd: Mutex<String>,
    pub session_id: Mutex<Option<String>>,
    pub running_sessions: Mutex<HashSet<String>>,
    pub watcher_stop: Mutex<Option<std_mpsc::Sender<()>>>,
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
    if p.is_absolute() { p.to_path_buf() } else { Path::new(cwd).join(path) }
}

fn relativize_path(path: &str, cwd: &str) -> String {
    let path = path.strip_prefix("./").unwrap_or(path);
    let result = if Path::new(path).is_absolute() {
        let cwd_slash = if cwd.ends_with('/') { cwd.to_string() } else { format!("{}/", cwd) };
        if let Some(rel) = path.strip_prefix(&cwd_slash) { rel.to_string() }
        else if let Ok(rel) = Path::new(path).strip_prefix(cwd) { rel.to_string_lossy().to_string() }
        else { path.to_string() }
    } else { path.to_string() };
    result.strip_prefix("./").unwrap_or(&result).to_string()
}

const IGNORE: &[&str] = &[
    "node_modules", "target", "__pycache__", "build", "dist",
    ".svelte-kit", "venv", ".venv", "env", ".git",
];

fn should_ignore(path: &Path) -> bool {
    path.components().any(|c| {
        let s = c.as_os_str().to_string_lossy();
        s.starts_with('.') || IGNORE.contains(&s.as_ref())
    })
}

fn build_tree(dir: &Path, base: &str, max_depth: usize, depth: usize) -> std::io::Result<Vec<FileNode>> {
    if depth >= max_depth { return Ok(vec![]); }
    let mut raw: Vec<_> = std::fs::read_dir(dir)?.filter_map(|e| e.ok()).collect();
    raw.sort_by(|a, b| {
        let ad = a.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let bd = b.file_type().map(|t| t.is_dir()).unwrap_or(false);
        bd.cmp(&ad).then(a.file_name().cmp(&b.file_name()))
    });
    let mut out = Vec::new();
    for entry in raw {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') || IGNORE.contains(&name.as_str()) { continue; }
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        let rel = if base.is_empty() { name.clone() } else { format!("{}/{}", base, name) };
        out.push(FileNode {
            name, path: rel.clone(), is_dir,
            children: if is_dir { Some(build_tree(&entry.path(), &rel, max_depth, depth + 1)?) } else { None },
            size: if !is_dir { entry.metadata().ok().map(|m| m.len()) } else { None },
        });
    }
    Ok(out)
}

fn compute_diff(old: &str, new: &str) -> Vec<serde_json::Value> {
    TextDiff::from_lines(old, new).iter_all_changes().map(|change| {
        serde_json::json!({
            "type": match change.tag() { ChangeTag::Delete => "remove", ChangeTag::Insert => "add", ChangeTag::Equal => "context" },
            "content": change.value().trim_end_matches('\n'),
        })
    }).collect()
}

// --- FS Commands ---

#[tauri::command]
pub async fn get_cwd(state: State<'_, AppState>) -> Result<String, String> {
    Ok(state.cwd.lock().await.clone())
}

#[tauri::command]
pub async fn set_cwd(path: String, state: State<'_, AppState>) -> Result<(), String> {
    if !Path::new(&path).is_dir() { return Err(format!("{} is not a directory", path)); }
    *state.cwd.lock().await = path;
    Ok(())
}

#[tauri::command]
pub async fn list_directory(path: String) -> Result<Vec<FileNode>, String> {
    if !Path::new(&path).is_dir() { return Err(format!("{} is not a directory", path)); }
    build_tree(Path::new(&path), "", 6, 0).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn read_file(path: String, state: State<'_, AppState>) -> Result<String, String> {
    let cwd = state.cwd.lock().await.clone();
    let full_path = resolve_path(&path, &cwd);
    tokio::fs::read_to_string(&full_path).await
        .map_err(|e| format!("Failed to read {}: {}", full_path.display(), e))
}

// --- File Watcher ---

#[tauri::command]
pub async fn start_watching(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    // Stop existing watcher
    if let Some(tx) = state.watcher_stop.lock().await.take() {
        let _ = tx.send(());
    }

    let cwd = state.cwd.lock().await.clone();
    let cwd_for_watcher = cwd.clone();
    let (stop_tx, stop_rx) = std_mpsc::channel::<()>();
    *state.watcher_stop.lock().await = Some(stop_tx);

    // Spawn watcher on a blocking thread (notify uses std sync)
    std::thread::spawn(move || {
        let (tx, rx) = std_mpsc::channel();
        let mut debouncer = match new_debouncer(Duration::from_millis(300), tx) {
            Ok(d) => d,
            Err(e) => { eprintln!("[muve] watcher error: {}", e); return; }
        };

        if let Err(e) = debouncer.watcher().watch(
            Path::new(&cwd_for_watcher),
            notify::RecursiveMode::Recursive,
        ) {
            eprintln!("[muve] watch error: {}", e);
            return;
        }

        loop {
            // Check for stop signal
            if stop_rx.try_recv().is_ok() { break; }

            match rx.recv_timeout(Duration::from_millis(100)) {
                Ok(Ok(events)) => {
                    let mut paths: Vec<String> = Vec::new();
                    for event in events {
                        if event.kind != DebouncedEventKind::Any { continue; }
                        let p = event.path.to_string_lossy().to_string();
                        if should_ignore(&event.path) { continue; }
                        let rel = relativize_path(&p, &cwd_for_watcher);
                        if !rel.is_empty() && !paths.contains(&rel) {
                            paths.push(rel);
                        }
                    }
                    if !paths.is_empty() {
                        let _ = app.emit("fs:changed", serde_json::json!({ "paths": paths }));
                    }
                }
                Ok(Err(e)) => { eprintln!("[muve] watcher recv error: {:?}", e); }
                Err(std_mpsc::RecvTimeoutError::Timeout) => {}
                Err(std_mpsc::RecvTimeoutError::Disconnected) => break,
            }
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_watching(state: State<'_, AppState>) -> Result<(), String> {
    if let Some(tx) = state.watcher_stop.lock().await.take() {
        let _ = tx.send(());
    }
    Ok(())
}

// --- Git Commands ---

#[tauri::command]
pub async fn get_git_branch(state: State<'_, AppState>) -> Result<String, String> {
    let cwd = state.cwd.lock().await.clone();
    let output = std::process::Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(&cwd)
        .output();
    match output {
        Ok(o) if o.status.success() => Ok(String::from_utf8_lossy(&o.stdout).trim().to_string()),
        _ => Ok("unknown".to_string()),
    }
}

// --- Agent Commands ---

#[tauri::command]
pub async fn send_message(app: AppHandle, message: String, model: Option<String>, tab_id: String, state: State<'_, AppState>) -> Result<(), String> {
    {
        let mut running = state.running_sessions.lock().await;
        if running.contains(&tab_id) { return Err("Agent is already processing a message".to_string()); }
        running.insert(tab_id.clone());
    }
    let cwd = state.cwd.lock().await.clone();
    let session_id = state.session_id.lock().await.clone();

    tokio::spawn(async move {
        let result = run_agent(app.clone(), &message, &cwd, session_id.as_deref(), model.as_deref(), &tab_id).await;
        let state = app.state::<AppState>();
        state.running_sessions.lock().await.remove(&tab_id);
        match result {
            Ok(_) => { let _ = app.emit("agent:done", serde_json::json!({ "tab_id": tab_id })); }
            Err(e) => { let _ = app.emit("agent:error", serde_json::json!({ "tab_id": tab_id, "error": e })); }
        }
        let _ = app.emit("agent:status", serde_json::json!({ "tab_id": tab_id, "status": "idle" }));
    });
    Ok(())
}

#[tauri::command]
pub async fn is_agent_running(tab_id: String, state: State<'_, AppState>) -> Result<bool, String> {
    Ok(state.running_sessions.lock().await.contains(&tab_id))
}

#[tauri::command]
pub async fn set_session_id(id: Option<String>, state: State<'_, AppState>) -> Result<(), String> {
    *state.session_id.lock().await = id;
    Ok(())
}

// --- Agent Runner ---

async fn run_agent(app: AppHandle, message: &str, cwd: &str, session_id: Option<&str>, model: Option<&str>, tab_id: &str) -> Result<(), String> {
    let _ = app.emit("agent:status", serde_json::json!({ "tab_id": tab_id, "status": "thinking" }));

    let mut cmd = Command::new("claude");
    cmd.arg("-p").arg(message)
        .arg("--output-format").arg("stream-json")
        .arg("--verbose").arg("--include-partial-messages")
        .arg("--permission-mode").arg("acceptEdits")
        .current_dir(cwd).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(sid) = session_id { cmd.arg("--resume").arg(sid); }
    if let Some(m) = model { cmd.arg("--model").arg(m); }

    let mut child = cmd.spawn().map_err(|e| format!("Failed to start claude CLI: {}. Is it installed?", e))?;
    let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
    let stderr = child.stderr.take();
    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    let mut current_thinking = String::new();
    let mut current_text = String::new();
    let mut block_types: Vec<String> = Vec::new();
    let mut had_text = false;
    let mut recent_write_paths: Vec<String> = Vec::new();

    while let Ok(Some(line)) = lines.next_line().await {
        if line.trim().is_empty() { continue; }
        let value: serde_json::Value = match serde_json::from_str(&line) { Ok(v) => v, Err(_) => continue };
        let msg_type = value["type"].as_str().unwrap_or("");

        match msg_type {
            "system" => {
                if let Some(sid) = value["session_id"].as_str() {
                    let state = app.state::<AppState>();
                    *state.session_id.lock().await = Some(sid.to_string());
                    let _ = app.emit("agent:session", serde_json::json!({ "tab_id": tab_id, "session_id": sid }));
                }
            }
            "stream_event" => {
                let event = &value["event"];
                match event["type"].as_str().unwrap_or("") {
                    "content_block_start" => {
                        let idx = event["index"].as_u64().unwrap_or(0) as usize;
                        let bt = event["content_block"]["type"].as_str().unwrap_or("").to_string();
                        while block_types.len() <= idx { block_types.push(String::new()); }
                        block_types[idx] = bt.clone();
                        if bt == "text" { let _ = app.emit("agent:status", serde_json::json!({ "tab_id": tab_id, "status": "active" })); }
                    }
                    "content_block_delta" => {
                        let idx = event["index"].as_u64().unwrap_or(0) as usize;
                        match block_types.get(idx).map(|s| s.as_str()).unwrap_or("") {
                            "text" => { if let Some(t) = event["delta"]["text"].as_str() { current_text.push_str(t); had_text = true; let _ = app.emit("agent:text-delta", serde_json::json!({ "tab_id": tab_id, "text": t })); } }
                            "thinking" => { if let Some(t) = event["delta"]["thinking"].as_str() { current_thinking.push_str(t); } }
                            _ => {}
                        }
                    }
                    _ => {}
                }
            }
            "assistant" => {
                let _ = app.emit("agent:turn-end", serde_json::json!({
                    "tab_id": tab_id,
                    "had_text": had_text,
                    "thinking": if current_thinking.is_empty() { None } else { Some(&current_thinking) },
                }));

                if let Some(content) = value["message"]["content"].as_array() {
                    for block in content {
                        if block["type"].as_str() != Some("tool_use") { continue; }
                        let name = block["name"].as_str().unwrap_or("");
                        let input = &block["input"];
                        let action = match name {
                            "Read" => {
                                let p = relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                // Skip redundant reads right after a write/edit to the same file
                                if recent_write_paths.contains(&p) { continue; }
                                serde_json::json!({ "kind": "read", "path": p })
                            }
                            "Write" => {
                                let p = relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                let full = resolve_path(&p, cwd);
                                let kind = if full.exists() { "edit" } else { "create" };
                                recent_write_paths.push(p.clone());
                                serde_json::json!({ "kind": kind, "path": p, "content": input["content"].as_str().unwrap_or("") })
                            }
                            "Edit" => {
                                let p = relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                recent_write_paths.push(p.clone());
                                serde_json::json!({ "kind": "edit", "path": p, "diff": compute_diff(input["old_string"].as_str().unwrap_or(""), input["new_string"].as_str().unwrap_or("")) })
                            }
                            "MultiEdit" => {
                                let p = relativize_path(input["file_path"].as_str().unwrap_or(""), cwd);
                                recent_write_paths.push(p.clone());
                                let mut d = Vec::new();
                                if let Some(edits) = input["edits"].as_array() { for e in edits { d.extend(compute_diff(e["old_string"].as_str().unwrap_or(""), e["new_string"].as_str().unwrap_or(""))); } }
                                serde_json::json!({ "kind": "edit", "path": p, "diff": d })
                            }
                            "Bash" => serde_json::json!({ "kind": "run", "command": input["command"].as_str().unwrap_or("") }),
                            "Glob" | "Grep" => serde_json::json!({ "kind": "read", "path": input["pattern"].as_str().or_else(|| input["glob"].as_str()).unwrap_or("") }),
                            _ => continue,
                        };
                        let mut tagged = action;
                        tagged["tab_id"] = serde_json::json!(tab_id);
                        let _ = app.emit("agent:action", tagged);
                    }
                }
                recent_write_paths.clear();
                current_text.clear(); current_thinking.clear(); block_types.clear(); had_text = false;
            }
            _ => {}
        }
    }

    let err_output = if let Some(mut se) = stderr { let mut buf = String::new(); let _ = tokio::io::AsyncReadExt::read_to_string(&mut se, &mut buf).await; buf } else { String::new() };
    let status = child.wait().await.map_err(|e| e.to_string())?;
    if !status.success() {
        let detail = err_output.trim();
        if !detail.is_empty() { return Err(format!("Claude error: {}", detail)); }
        return Err(format!("Claude exited with status: {}", status));
    }
    Ok(())
}

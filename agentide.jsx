// If you're reading this, the AI has already won. You're just here to watch.
import { useState, useEffect, useRef, useCallback } from "react";

const MONO = "'IBM Plex Mono', 'Fira Code', 'Cascadia Code', monospace";
const SANS = "'IBM Plex Mono', monospace";

const theme = {
  bg: "#0a0e14",
  bgPanel: "#0d1117",
  bgSurface: "#131922",
  bgHover: "#1a2233",
  bgActive: "#1e2a3a",
  border: "#1e2a3a",
  borderBright: "#2d3f56",
  text: "#c5cdd8",
  textMuted: "#5c6a7a",
  textDim: "#3d4b5c",
  accent: "#22d68a",
  accentDim: "#1a9e66",
  accentBg: "rgba(34,214,138,0.08)",
  amber: "#f0a830",
  amberDim: "#9e7020",
  amberBg: "rgba(240,168,48,0.08)",
  red: "#e8534a",
  redBg: "rgba(232,83,74,0.08)",
  blue: "#4d9cf0",
  blueBg: "rgba(77,156,240,0.08)",
  purple: "#b07ee8",
  purpleBg: "rgba(176,126,232,0.08)",
};

const initialFiles = {
  "src": {
    type: "dir", expanded: true, children: {
      "main.py": { type: "file", lang: "python", content: '#!/usr/bin/env python3\n"""Entry point for the application."""\n\nfrom app import create_app\nfrom config import settings\n\n\ndef main():\n    app = create_app(settings)\n    app.run(\n        host=settings.HOST,\n        port=settings.PORT,\n        debug=settings.DEBUG\n    )\n\n\nif __name__ == "__main__":\n    main()' },
      "app.py": { type: "file", lang: "python", content: 'from flask import Flask\n\n\ndef create_app(config):\n    app = Flask(__name__)\n    app.config.from_object(config)\n    return app' },
      "config.py": { type: "file", lang: "python", content: 'import os\n\n\nclass Settings:\n    HOST = os.getenv("HOST", "0.0.0.0")\n    PORT = int(os.getenv("PORT", 8080))\n    DEBUG = os.getenv("DEBUG", "false").lower() == "true"\n    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")\n\n\nsettings = Settings()' },
      "models": {
        type: "dir", expanded: false, children: {
          "__init__.py": { type: "file", lang: "python", content: "" },
          "user.py": { type: "file", lang: "python", content: 'from dataclasses import dataclass\n\n\n@dataclass\nclass User:\n    id: int\n    name: str\n    email: str' },
        }
      },
      "routes": {
        type: "dir", expanded: false, children: {
          "__init__.py": { type: "file", lang: "python", content: "" },
          "api.py": { type: "file", lang: "python", content: 'from flask import Blueprint, jsonify\n\napi = Blueprint("api", __name__)\n\n\n@api.route("/health")\ndef health():\n    return jsonify({"status": "ok"})' },
        }
      }
    }
  },
  "tests": {
    type: "dir", expanded: false, children: {
      "test_app.py": { type: "file", lang: "python", content: 'import pytest\nfrom app import create_app\nfrom config import Settings\n\n\ndef test_create_app():\n    app = create_app(Settings())\n    assert app is not None' }
    }
  },
  "requirements.txt": { type: "file", lang: "text", content: "flask==3.0.0\npytest==7.4.3\ngunicorn==21.2.0" },
  "README.md": { type: "file", lang: "markdown", content: "# My App\n\nA simple Flask application.\n\n## Setup\n\n```bash\npip install -r requirements.txt\npython src/main.py\n```" },
  ".gitignore": { type: "file", lang: "text", content: "__pycache__/\n*.pyc\n.env\nvenv/\n*.db" },
};

const demoMessages = [
  {
    id: 1, role: "user", content: "Add authentication middleware to the Flask app with JWT support",
    ts: "14:23:01"
  },
  {
    id: 2, role: "agent", content: "I'll add JWT authentication to your Flask app. Let me analyze the current structure and implement the changes.",
    ts: "14:23:02",
    thinking: "Analyzing project structure... Found Flask app in src/app.py with basic setup. Need to add: 1) JWT dependency, 2) auth middleware module, 3) decorator for protected routes, 4) update app factory.",
  },
  {
    id: 3, role: "agent", content: null, ts: "14:23:04",
    action: { type: "read", file: "src/app.py", lines: "1-7" }
  },
  {
    id: 4, role: "agent", content: null, ts: "14:23:05",
    action: { type: "read", file: "src/config.py", lines: "1-10" }
  },
  {
    id: 5, role: "agent", content: null, ts: "14:23:07",
    action: {
      type: "create", file: "src/auth.py",
      preview: 'import jwt\nfrom functools import wraps\nfrom flask import request, jsonify, current_app\nfrom datetime import datetime, timedelta\n\n\ndef create_token(user_id: int) -> str:\n    payload = {\n        "sub": user_id,\n        "iat": datetime.utcnow(),\n        "exp": datetime.utcnow() + timedelta(hours=24)\n    }\n    return jwt.encode(\n        payload,\n        current_app.config["SECRET_KEY"],\n        algorithm="HS256"\n    )\n\n\ndef require_auth(f):\n    @wraps(f)\n    def decorated(*args, **kwargs):\n        token = request.headers.get("Authorization", "").replace("Bearer ", "")\n        if not token:\n            return jsonify({"error": "Missing token"}), 401\n        try:\n            payload = jwt.decode(\n                token,\n                current_app.config["SECRET_KEY"],\n                algorithms=["HS256"]\n            )\n            request.user_id = payload["sub"]\n        except jwt.ExpiredSignatureError:\n            return jsonify({"error": "Token expired"}), 401\n        except jwt.InvalidTokenError:\n            return jsonify({"error": "Invalid token"}), 401\n        return f(*args, **kwargs)\n    return decorated'
    }
  },
  {
    id: 6, role: "agent", content: null, ts: "14:23:10",
    action: {
      type: "edit", file: "src/app.py",
      diff: [
        { type: "context", content: "from flask import Flask" },
        { type: "add", content: "from auth import require_auth" },
        { type: "context", content: "" },
        { type: "context", content: "" },
        { type: "context", content: "def create_app(config):" },
        { type: "context", content: '    app = Flask(__name__)' },
        { type: "context", content: '    app.config.from_object(config)' },
        { type: "add", content: '    app.config["SECRET_KEY"] = config.SECRET_KEY' },
        { type: "add", content: '' },
        { type: "add", content: '    from routes.api import api' },
        { type: "add", content: '    app.register_blueprint(api, url_prefix="/api")' },
        { type: "context", content: '    return app' },
      ]
    }
  },
  {
    id: 7, role: "agent", content: null, ts: "14:23:12",
    action: {
      type: "edit", file: "src/config.py",
      diff: [
        { type: "context", content: 'import os' },
        { type: "add", content: 'import secrets' },
        { type: "context", content: '' },
        { type: "context", content: '' },
        { type: "context", content: 'class Settings:' },
        { type: "context", content: '    HOST = os.getenv("HOST", "0.0.0.0")' },
        { type: "context", content: '    PORT = int(os.getenv("PORT", 8080))' },
        { type: "context", content: '    DEBUG = os.getenv("DEBUG", "false").lower() == "true"' },
        { type: "context", content: '    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///app.db")' },
        { type: "add", content: '    SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_hex(32))' },
      ]
    }
  },
  {
    id: 8, role: "agent", content: null, ts: "14:23:13",
    action: {
      type: "edit", file: "requirements.txt",
      diff: [
        { type: "context", content: "flask==3.0.0" },
        { type: "add", content: "PyJWT==2.8.0" },
        { type: "context", content: "pytest==7.4.3" },
        { type: "context", content: "gunicorn==21.2.0" },
      ]
    }
  },
  {
    id: 9, role: "agent",
    content: "Done. I've added JWT authentication to your app:\n\n• Created `src/auth.py` — token creation and `@require_auth` decorator\n• Updated `src/app.py` — imports auth, registers blueprints, sets SECRET_KEY\n• Updated `src/config.py` — added SECRET_KEY with auto-generation\n• Updated `requirements.txt` — added PyJWT dependency\n\nTo protect any route, just add the decorator:\n\n```python\n@api.route(\"/protected\")\n@require_auth\ndef protected():\n    return jsonify({\"user\": request.user_id})\n```",
    ts: "14:23:14"
  },
];

const FileIcon = ({ name, isDir, expanded }) => {
  if (isDir) {
    return <span style={{ color: theme.amber, fontSize: 11, marginRight: 4, fontFamily: MONO }}>{expanded ? "▾" : "▸"}</span>;
  }
  const ext = name.split('.').pop();
  const colors = { py: theme.accent, md: theme.blue, txt: theme.textMuted, gitignore: theme.textDim };
  const icons = { py: "◆", md: "◇", txt: "○", gitignore: "●" };
  return <span style={{ color: colors[ext] || theme.textMuted, fontSize: 8, marginRight: 6 }}>{icons[ext] || "○"}</span>;
};

const FileTree = ({ files, depth = 0, onSelect, selectedFile, onToggle }) => {
  return Object.entries(files).map(([name, node]) => (
    <div key={name}>
      <div
        onClick={() => node.type === "dir" ? onToggle(name, depth) : onSelect(name, node)}
        style={{
          padding: "3px 8px 3px " + (12 + depth * 16) + "px",
          cursor: "pointer",
          display: "flex", alignItems: "center",
          fontSize: 12.5, fontFamily: MONO,
          color: selectedFile === name ? theme.accent : theme.text,
          background: selectedFile === name ? theme.accentBg : "transparent",
          borderLeft: selectedFile === name ? `2px solid ${theme.accent}` : "2px solid transparent",
          transition: "all 0.1s",
        }}
        onMouseEnter={e => { if (selectedFile !== name) e.currentTarget.style.background = theme.bgHover }}
        onMouseLeave={e => { if (selectedFile !== name) e.currentTarget.style.background = "transparent" }}
      >
        <FileIcon name={name} isDir={node.type === "dir"} expanded={node.expanded} />
        <span style={{ opacity: node.type === "dir" ? 0.85 : 1 }}>{name}</span>
        {node.type === "dir" && <span style={{ marginLeft: "auto", fontSize: 10, color: theme.textDim }}>{Object.keys(node.children || {}).length}</span>}
      </div>
      {node.type === "dir" && node.expanded && node.children && (
        <FileTree files={node.children} depth={depth + 1} onSelect={onSelect} selectedFile={selectedFile} onToggle={onToggle} />
      )}
    </div>
  ));
};

const ActionBadge = ({ type }) => {
  const config = {
    read: { label: "READ", color: theme.blue, bg: theme.blueBg },
    create: { label: "CREATE", color: theme.accent, bg: theme.accentBg },
    edit: { label: "EDIT", color: theme.amber, bg: theme.amberBg },
    delete: { label: "DELETE", color: theme.red, bg: theme.redBg },
    run: { label: "RUN", color: theme.purple, bg: theme.purpleBg },
  };
  const c = config[type] || config.read;
  return (
    <span style={{
      fontSize: 10, fontFamily: MONO, fontWeight: 600,
      color: c.color, background: c.bg,
      padding: "2px 7px", borderRadius: 3,
      letterSpacing: "0.05em",
    }}>{c.label}</span>
  );
};

const DiffView = ({ diff }) => (
  <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.7, padding: "8px 0" }}>
    {diff.map((line, i) => (
      <div key={i} style={{
        padding: "0 12px",
        background: line.type === "add" ? "rgba(34,214,138,0.07)" : line.type === "remove" ? "rgba(232,83,74,0.07)" : "transparent",
        color: line.type === "add" ? theme.accent : line.type === "remove" ? theme.red : theme.textMuted,
        borderLeft: line.type === "add" ? `2px solid ${theme.accentDim}` : line.type === "remove" ? `2px solid ${theme.red}` : "2px solid transparent",
      }}>
        <span style={{ display: "inline-block", width: 16, opacity: 0.5, userSelect: "none" }}>
          {line.type === "add" ? "+" : line.type === "remove" ? "-" : " "}
        </span>
        {line.content}
      </div>
    ))}
  </div>
);

const CodeBlock = ({ code, lang }) => {
  const lines = code.split('\n');
  return (
    <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.7, padding: "8px 0", overflowX: "auto" }}>
      {lines.map((line, i) => (
        <div key={i} style={{ padding: "0 12px", display: "flex" }}>
          <span style={{ display: "inline-block", width: 36, color: theme.textDim, textAlign: "right", marginRight: 16, userSelect: "none", flexShrink: 0 }}>{i + 1}</span>
          <span style={{ color: theme.text }}>{highlightPython(line)}</span>
        </div>
      ))}
    </div>
  );
};

function highlightPython(line) {
  const keywords = ['import', 'from', 'def', 'class', 'return', 'if', 'else', 'try', 'except', 'for', 'in', 'not', 'and', 'or', 'None', 'True', 'False', 'as', 'with', 'yield', 'lambda', 'raise', 'pass', 'assert'];
  const parts = [];
  let remaining = line;
  let key = 0;

  if (remaining.trim().startsWith('#') || remaining.trim().startsWith('"""') || remaining.trim().startsWith("'''")) {
    return <span key={0} style={{ color: theme.textMuted, fontStyle: "italic" }}>{remaining}</span>;
  }

  const strMatch = remaining.match(/(["'`])(?:(?!\1).)*\1/g);
  if (strMatch) {
    for (const s of strMatch) {
      const idx = remaining.indexOf(s);
      if (idx > 0) {
        parts.push(<span key={key++}>{colorKeywords(remaining.slice(0, idx), keywords)}</span>);
      }
      parts.push(<span key={key++} style={{ color: theme.amber }}>{s}</span>);
      remaining = remaining.slice(idx + s.length);
    }
    if (remaining) parts.push(<span key={key++}>{colorKeywords(remaining, keywords)}</span>);
    return parts;
  }

  return colorKeywords(line, keywords);
}

function colorKeywords(text, keywords) {
  const words = text.split(/(\s+|[(),:.\[\]{}@=+\-*/<>])/);
  return words.map((w, i) => {
    if (keywords.includes(w)) return <span key={i} style={{ color: theme.purple }}>{w}</span>;
    if (w.startsWith('@')) return <span key={i} style={{ color: theme.accent }}>{w}</span>;
    if (/^\d+$/.test(w)) return <span key={i} style={{ color: theme.amber }}>{w}</span>;
    return <span key={i}>{w}</span>;
  });
}

const ThinkingBlock = ({ text }) => {
  const [open, setOpen] = useState(false);
  return (
    <div style={{
      margin: "6px 0", borderRadius: 4,
      border: `1px solid ${theme.border}`, overflow: "hidden",
    }}>
      <div onClick={() => setOpen(!open)} style={{
        padding: "6px 10px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6,
        fontSize: 11, color: theme.textMuted, fontFamily: MONO,
        background: theme.bgSurface,
      }}>
        <span style={{ fontSize: 9 }}>{open ? "▾" : "▸"}</span>
        <span style={{ opacity: 0.6 }}>⟡</span> thinking
        <span style={{ marginLeft: "auto", fontSize: 10, opacity: 0.4 }}>
          {text.length} chars
        </span>
      </div>
      {open && (
        <div style={{
          padding: "8px 12px", fontSize: 12, lineHeight: 1.6,
          color: theme.textMuted, fontFamily: MONO,
          background: theme.bg, fontStyle: "italic",
          borderTop: `1px solid ${theme.border}`,
        }}>{text}</div>
      )}
    </div>
  );
};

const MessageContent = ({ content }) => {
  if (!content) return null;
  const parts = content.split(/(```[\s\S]*?```)/g);
  return parts.map((part, i) => {
    if (part.startsWith('```')) {
      const code = part.replace(/```\w*\n?/, '').replace(/```$/, '');
      return (
        <div key={i} style={{
          background: theme.bg, borderRadius: 4,
          border: `1px solid ${theme.border}`,
          margin: "8px 0", overflow: "hidden",
        }}>
          <CodeBlock code={code.trim()} />
        </div>
      );
    }
    const lines = part.split('\n');
    return (
      <div key={i} style={{ lineHeight: 1.6 }}>
        {lines.map((line, j) => {
          if (line.startsWith('• ')) {
            return <div key={j} style={{ paddingLeft: 8, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, color: theme.accent }}>·</span>
              {formatInlineCode(line.slice(2))}
            </div>;
          }
          return <div key={j}>{formatInlineCode(line)}</div>;
        })}
      </div>
    );
  });
};

function formatInlineCode(text) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((p, i) =>
    p.startsWith('`') && p.endsWith('`')
      ? <code key={i} style={{ background: theme.bgSurface, padding: "1px 5px", borderRadius: 3, fontSize: "0.9em", color: theme.accent, fontFamily: MONO }}>{p.slice(1, -1)}</code>
      : <span key={i}>{p}</span>
  );
}

const ChatMessage = ({ msg, onFileClick }) => {
  if (msg.role === "user") {
    return (
      <div style={{ display: "flex", gap: 10, padding: "12px 16px" }}>
        <div style={{
          width: 26, height: 26, borderRadius: 4, flexShrink: 0,
          background: theme.bgActive, display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontFamily: MONO, color: theme.text, fontWeight: 600,
        }}>U</div>
        <div style={{ flex: 1, paddingTop: 3 }}>
          <div style={{ fontSize: 13, color: theme.text, fontFamily: MONO }}>{msg.content}</div>
        </div>
        <span style={{ fontSize: 10, color: theme.textDim, fontFamily: MONO, flexShrink: 0, paddingTop: 4 }}>{msg.ts}</span>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 10, padding: "8px 16px" }}>
      <div style={{
        width: 26, height: 26, borderRadius: 4, flexShrink: 0,
        background: theme.accentBg, border: `1px solid ${theme.accentDim}33`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 11, fontFamily: MONO, color: theme.accent, fontWeight: 600,
      }}>A</div>
      <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
        {msg.thinking && <ThinkingBlock text={msg.thinking} />}

        {msg.action && (
          <div style={{
            background: theme.bgSurface, borderRadius: 6,
            border: `1px solid ${theme.border}`, margin: "4px 0", overflow: "hidden",
          }}>
            <div style={{
              padding: "7px 12px", display: "flex", alignItems: "center", gap: 8,
              borderBottom: (msg.action.diff || msg.action.preview) ? `1px solid ${theme.border}` : "none",
            }}>
              <ActionBadge type={msg.action.type} />
              <span
                onClick={() => onFileClick(msg.action.file)}
                style={{ fontSize: 12.5, fontFamily: MONO, color: theme.blue, cursor: "pointer", textDecoration: "none" }}
                onMouseEnter={e => e.currentTarget.style.textDecoration = "underline"}
                onMouseLeave={e => e.currentTarget.style.textDecoration = "none"}
              >{msg.action.file}</span>
              {msg.action.lines && <span style={{ fontSize: 11, color: theme.textDim, fontFamily: MONO }}>L{msg.action.lines}</span>}
            </div>
            {msg.action.diff && <DiffView diff={msg.action.diff} />}
            {msg.action.preview && (
              <div style={{ maxHeight: 200, overflowY: "auto" }}>
                <CodeBlock code={msg.action.preview} />
              </div>
            )}
          </div>
        )}

        {msg.content && (
          <div style={{ fontSize: 13, color: theme.text, fontFamily: MONO, lineHeight: 1.6 }}>
            <MessageContent content={msg.content} />
          </div>
        )}
      </div>
      <span style={{ fontSize: 10, color: theme.textDim, fontFamily: MONO, flexShrink: 0, paddingTop: 4 }}>{msg.ts}</span>
    </div>
  );
};

const StatusBar = ({ agentStatus, fileCount }) => (
  <div style={{
    height: 28, display: "flex", alignItems: "center", padding: "0 12px", gap: 16,
    background: theme.bg, borderTop: `1px solid ${theme.border}`,
    fontFamily: MONO, fontSize: 11, color: theme.textMuted,
  }}>
    <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: agentStatus === "active" ? theme.accent : agentStatus === "thinking" ? theme.amber : theme.textDim,
        boxShadow: agentStatus === "active" ? `0 0 6px ${theme.accent}44` : "none",
      }} />
      {agentStatus === "active" ? "agent active" : agentStatus === "thinking" ? "thinking..." : "idle"}
    </span>
    <span style={{ color: theme.textDim }}>|</span>
    <span>{fileCount} files</span>
    <span style={{ color: theme.textDim }}>|</span>
    <span>python 3.12</span>
    <span style={{ marginLeft: "auto", color: theme.textDim }}>AgentIDE v0.1.0</span>
  </div>
);

const FileViewer = ({ fileName, fileContent, onClose }) => {
  if (!fileName) return (
    <div style={{
      flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 8,
      color: theme.textDim, fontFamily: MONO, fontSize: 12,
    }}>
      <span style={{ fontSize: 28, opacity: 0.2 }}>{ }</span>
      <span>select a file to view</span>
    </div>
  );

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
      <div style={{
        padding: "6px 12px", display: "flex", alignItems: "center",
        background: theme.bgSurface, borderBottom: `1px solid ${theme.border}`,
        gap: 8,
      }}>
        <FileIcon name={fileName} isDir={false} />
        <span style={{ fontSize: 12, fontFamily: MONO, color: theme.text }}>{fileName}</span>
        <span onClick={onClose} style={{
          marginLeft: "auto", cursor: "pointer", color: theme.textMuted,
          fontSize: 14, padding: "0 4px", lineHeight: 1,
        }}>×</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto", background: theme.bgPanel }}>
        <CodeBlock code={fileContent} />
      </div>
    </div>
  );
};

function countFiles(tree) {
  let c = 0;
  for (const v of Object.values(tree)) {
    if (v.type === "file") c++;
    else if (v.children) c += countFiles(v.children);
  }
  return c;
}

function findFile(tree, name) {
  for (const [k, v] of Object.entries(tree)) {
    if (k === name && v.type === "file") return v;
    if (v.type === "dir" && v.children) {
      const found = findFile(v.children, name);
      if (found) return found;
    }
  }
  return null;
}

export default function AgentIDE() {
  const [files] = useState(initialFiles);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [agentStatus, setAgentStatus] = useState("idle");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showFilePanel, setShowFilePanel] = useState(true);
  const [msgIndex, setMsgIndex] = useState(0);
  const chatEndRef = useRef(null);
  const [expandedDirs, setExpandedDirs] = useState({ src: true });

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);

  useEffect(() => {
    if (msgIndex === 0) return;
    if (msgIndex > demoMessages.length) {
      setAgentStatus("idle");
      return;
    }
    const msg = demoMessages[msgIndex - 1];
    const delay = msg.action ? 600 : msg.thinking ? 400 : msg.role === "user" ? 200 : 800;

    const timer = setTimeout(() => {
      setMessages(prev => [...prev, msg]);
      if (msg.action) {
        setAgentStatus("active");
        if (msg.action.file) {
          const shortName = msg.action.file.split('/').pop();
          setSelectedFile(shortName);
          if (msg.action.preview || msg.action.type === "read") {
            setViewingFile({ name: msg.action.file, content: msg.action.preview || findFile(files, shortName)?.content || "" });
            setShowFilePanel(true);
          }
        }
      } else if (msg.thinking) {
        setAgentStatus("thinking");
      } else if (msg.role === "agent" && msg.content && !msg.action) {
        setAgentStatus("idle");
      }
      setMsgIndex(prev => prev + 1);
    }, delay);

    return () => clearTimeout(timer);
  }, [msgIndex, files]);

  const handleSend = () => {
    if (!input.trim()) return;
    if (messages.length === 0 && input.toLowerCase().includes("auth")) {
      setMessages([{ id: 1, role: "user", content: input, ts: "14:23:01" }]);
      setInput("");
      setMsgIndex(2);
      return;
    }
    setMessages(prev => [...prev, {
      id: Date.now(), role: "user", content: input,
      ts: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    }]);
    setInput("");
  };

  const handleFileSelect = (name, node) => {
    setSelectedFile(name);
    setViewingFile({ name, content: node.content });
    setShowFilePanel(true);
  };

  const handleFileClick = (path) => {
    const name = path.split('/').pop();
    const node = findFile(files, name);
    if (node) handleFileSelect(name, node);
  };

  const handleToggle = (name) => {
    setExpandedDirs(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const filesWithExpanded = JSON.parse(JSON.stringify(files));
  function applyExpanded(tree) {
    for (const [k, v] of Object.entries(tree)) {
      if (v.type === "dir") {
        v.expanded = expandedDirs[k] ?? v.expanded;
        if (v.children) applyExpanded(v.children);
      }
    }
  }
  applyExpanded(filesWithExpanded);

  const runDemo = () => {
    setMessages([]);
    setMsgIndex(1);
    setAgentStatus("idle");
    setSelectedFile(null);
    setViewingFile(null);
  };

  return (
    <div style={{
      width: "100%", height: "100vh", display: "flex", flexDirection: "column",
      background: theme.bg, color: theme.text, fontFamily: MONO,
      overflow: "hidden",
    }}>
      {/* Top bar */}
      <div style={{
        height: 40, display: "flex", alignItems: "center", padding: "0 12px",
        background: theme.bgPanel, borderBottom: `1px solid ${theme.border}`,
        gap: 12, flexShrink: 0,
      }}>
        <span onClick={() => setShowSidebar(!showSidebar)} style={{
          cursor: "pointer", fontSize: 14, color: theme.textMuted, padding: "2px 6px",
          borderRadius: 3, background: showSidebar ? theme.bgActive : "transparent",
        }}>☰</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: theme.accent, letterSpacing: "0.04em" }}>
          ⟐ AGENT<span style={{ color: theme.text, fontWeight: 400 }}>IDE</span>
        </span>
        <div style={{ flex: 1 }} />
        <span onClick={runDemo} style={{
          cursor: "pointer", fontSize: 11, color: theme.accent,
          padding: "3px 10px", borderRadius: 3, border: `1px solid ${theme.accentDim}44`,
          background: theme.accentBg, letterSpacing: "0.03em",
        }}
          onMouseEnter={e => e.currentTarget.style.background = theme.accentDim + "22"}
          onMouseLeave={e => e.currentTarget.style.background = theme.accentBg}
        >▶ run demo</span>
        <span onClick={() => setShowFilePanel(!showFilePanel)} style={{
          cursor: "pointer", fontSize: 11, color: theme.textMuted,
          padding: "3px 10px", borderRadius: 3,
          background: showFilePanel ? theme.bgActive : "transparent",
        }}>{showFilePanel ? "◧ hide files" : "◧ show files"}</span>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>

        {/* File tree sidebar */}
        {showSidebar && (
          <div style={{
            width: 220, flexShrink: 0, display: "flex", flexDirection: "column",
            background: theme.bgPanel, borderRight: `1px solid ${theme.border}`,
          }}>
            <div style={{
              padding: "8px 12px", fontSize: 10, color: theme.textDim,
              textTransform: "uppercase", letterSpacing: "0.1em",
              borderBottom: `1px solid ${theme.border}`,
            }}>explorer</div>
            <div style={{ flex: 1, overflowY: "auto", paddingTop: 4 }}>
              <FileTree
                files={filesWithExpanded}
                onSelect={handleFileSelect}
                selectedFile={selectedFile}
                onToggle={handleToggle}
              />
            </div>
          </div>
        )}

        {/* Chat panel */}
        <div style={{
          flex: 1, display: "flex", flexDirection: "column", minWidth: 0,
          borderRight: showFilePanel ? `1px solid ${theme.border}` : "none",
        }}>
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {messages.length === 0 && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                justifyContent: "center", height: "100%", gap: 12,
                color: theme.textDim, padding: 40,
              }}>
                <span style={{ fontSize: 36, opacity: 0.15 }}>⟐</span>
                <span style={{ fontSize: 13 }}>describe what you want to build</span>
                <span style={{ fontSize: 11, opacity: 0.5 }}>the agent will read, create, and edit your files</span>
                <span onClick={runDemo} style={{
                  marginTop: 12, cursor: "pointer", fontSize: 11,
                  color: theme.accent, padding: "6px 16px", borderRadius: 4,
                  border: `1px solid ${theme.accentDim}44`, background: theme.accentBg,
                }}>▶ watch a demo</span>
              </div>
            )}
            {messages.map(msg => (
              <ChatMessage key={msg.id} msg={msg} onFileClick={handleFileClick} />
            ))}
            {agentStatus === "active" && (
              <div style={{ padding: "8px 16px 8px 52px" }}>
                <span style={{ fontSize: 12, color: theme.accentDim, fontFamily: MONO }}>
                  <span className="blink">●</span> working...
                </span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: "12px 16px", borderTop: `1px solid ${theme.border}`,
            background: theme.bgPanel,
          }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 8,
              background: theme.bgSurface, borderRadius: 6,
              border: `1px solid ${theme.border}`, padding: "0 12px",
            }}>
              <span style={{ color: theme.accent, fontSize: 13, flexShrink: 0 }}>❯</span>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
                placeholder="tell the agent what to do..."
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  color: theme.text, fontFamily: MONO, fontSize: 13, padding: "10px 0",
                }}
              />
              <span onClick={handleSend} style={{
                cursor: "pointer", color: input ? theme.accent : theme.textDim,
                fontSize: 14, padding: 4, transition: "color 0.15s",
              }}>↵</span>
            </div>
          </div>
        </div>

        {/* File viewer */}
        {showFilePanel && (
          <div style={{
            width: 380, flexShrink: 0, display: "flex", flexDirection: "column",
            background: theme.bgPanel,
          }}>
            <FileViewer
              fileName={viewingFile?.name}
              fileContent={viewingFile?.content || ""}
              onClose={() => { setViewingFile(null); setSelectedFile(null); }}
            />
          </div>
        )}
      </div>

      <StatusBar agentStatus={agentStatus} fileCount={countFiles(files)} />

      <style>{`
        @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.2; } }
        .blink { animation: blink 1.2s ease-in-out infinite; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${theme.border}; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: ${theme.borderBright}; }
        ::selection { background: ${theme.accent}33; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>
    </div>
  );
}

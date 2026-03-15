#!/usr/bin/env node
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const MODULE_GLOBALS = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react-dom/client": "window.ReactDOM",
};

const DEFAULT_PORT = 3742;

// --- CLI argument parsing ---

let targetFile = null;
let port = DEFAULT_PORT;
let exportMode = false;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--port" && args[i + 1]) {
    port = parseInt(args[i + 1], 10);
    i++;
  } else if (args[i] === "--export") {
    exportMode = true;
  } else if (!args[i].startsWith("--")) {
    targetFile = args[i];
  }
}

if (!targetFile) {
  console.error("\n  Usage: node jsx-viewer.js <file.jsx> [--port 3742] [--export]\n");
  process.exit(1);
}

targetFile = path.resolve(process.cwd(), targetFile);

if (!fs.existsSync(targetFile)) {
  console.error(`\n  File not found: ${targetFile}\n`);
  process.exit(1);
}

const fileName = path.basename(targetFile);

// --- Source transform ---

function transformSource(raw) {
  const exportAssignments = [];
  let defaultExportName = null;

  // Replace import statements
  let source = raw.replace(
    /^import\s+([\s\S]+?)\s+from\s+["']([^"']+)["'];?\s*$/gm,
    (match, imports, modulePath) => {
      const global = MODULE_GLOBALS[modulePath];
      if (!global) {
        return `/* [jsx-viewer] unsupported import: ${match.trim()} */\nconsole.warn("[jsx-viewer] Skipped import from \\"${modulePath}\\" — module not available");`;
      }
      const trimmed = imports.trim();
      // import * as X from "mod"
      if (trimmed.startsWith("* as ")) {
        const name = trimmed.slice(5).trim();
        return `const ${name} = ${global};`;
      }
      // import X from "mod" (default import)
      if (!trimmed.startsWith("{")) {
        // Could be: import React, { useState } from "react"
        if (trimmed.includes(",")) {
          const [defaultImport, rest] = trimmed.split(",", 2);
          return `const ${defaultImport.trim()} = ${global};\nconst ${rest.trim()} = ${global};`;
        }
        return `const ${trimmed} = ${global};`;
      }
      // import { x, y } from "mod"
      return `const ${trimmed} = ${global};`;
    }
  );

  // Strip side-effect-only imports
  source = source.replace(
    /^import\s+["'][^"']+["'];?\s*$/gm,
    (match) => `/* [jsx-viewer] stripped: ${match.trim()} */`
  );

  // Handle export default function/class
  source = source.replace(
    /^export\s+default\s+function\s+(\w+)/gm,
    (_match, name) => {
      defaultExportName = name;
      return `function ${name}`;
    }
  );

  source = source.replace(
    /^export\s+default\s+class\s+(\w+)/gm,
    (_match, name) => {
      defaultExportName = name;
      return `class ${name}`;
    }
  );

  // Handle export default <anonymous function/arrow>
  if (!defaultExportName) {
    source = source.replace(
      /^export\s+default\s+function\s*\(/gm,
      () => {
        defaultExportName = "__DefaultExport__";
        return `const __DefaultExport__ = function(`;
      }
    );
  }

  if (!defaultExportName) {
    source = source.replace(
      /^export\s+default\s+\(/gm,
      () => {
        defaultExportName = "__DefaultExport__";
        return `const __DefaultExport__ = (`;
      }
    );
  }

  // Handle export default <identifier>;
  if (!defaultExportName) {
    source = source.replace(
      /^export\s+default\s+(\w+)\s*;?\s*$/gm,
      (_match, name) => {
        defaultExportName = name;
        return `/* default export: ${name} */`;
      }
    );
  }

  // Handle named exports: export function/const/let/var/class
  source = source.replace(
    /^export\s+(function|const|let|var|class)\s+(\w+)/gm,
    (_match, keyword, name) => {
      exportAssignments.push(name);
      return `${keyword} ${name}`;
    }
  );

  // Build final source
  let result = "window.__JSX_VIEWER_EXPORTS__ = {};\n\n" + source;

  if (defaultExportName) {
    result += `\n\nwindow.__JSX_VIEWER_EXPORTS__.default = ${defaultExportName};`;
  }

  for (const name of exportAssignments) {
    result += `\nwindow.__JSX_VIEWER_EXPORTS__["${name}"] = ${name};`;
  }

  return result;
}

// --- HTML generation ---

function generateHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>JSX Viewer — ${fileName}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { min-height: 100vh; }
    #error-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(30, 0, 0, 0.95);
      color: #ff6b6b;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      padding: 40px;
      overflow: auto;
    }
    #error-overlay.visible { display: block; }
    #error-overlay h2 { font-size: 18px; margin-bottom: 16px; color: #ff8a8a; }
    #error-overlay pre {
      font-size: 13px; line-height: 1.6; white-space: pre-wrap;
      word-break: break-word; color: #ffcccc;
    }
    #error-overlay button {
      position: absolute; top: 16px; right: 16px;
      background: transparent; border: 1px solid #ff6b6b44;
      color: #ff6b6b; padding: 4px 12px; border-radius: 4px;
      cursor: pointer; font-size: 12px;
    }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <div id="error-overlay">
    <button onclick="document.getElementById('error-overlay').classList.remove('visible')">Dismiss</button>
    <h2 id="error-title">Error</h2>
    <pre id="error-details"></pre>
  </div>

  <script>
    function showError(title, details) {
      document.getElementById("error-title").textContent = title;
      document.getElementById("error-details").textContent = details;
      document.getElementById("error-overlay").classList.add("visible");
    }

    function hideError() {
      document.getElementById("error-overlay").classList.remove("visible");
    }

    async function loadAndRender() {
      try {
        const res = await fetch("/source.jsx?t=" + Date.now());
        if (!res.ok) {
          showError("Failed to load source", await res.text());
          return;
        }
        const source = await res.text();

        let transformed;
        try {
          transformed = Babel.transform(source, {
            presets: ["react"],
            filename: "${fileName}",
          }).code;
        } catch (err) {
          showError("JSX Transpilation Error", err.message);
          return;
        }

        try {
          const fn = new Function(transformed);
          fn();
        } catch (err) {
          showError("Runtime Error (module evaluation)", err.message + "\\n\\n" + err.stack);
          return;
        }

        const exports = window.__JSX_VIEWER_EXPORTS__ || {};
        const Component = exports.default || Object.values(exports).find(v => typeof v === "function");

        if (!Component) {
          showError("No Component Found", "The file does not export a React component.\\nMake sure you have a default export.");
          return;
        }

        hideError();
        const root = ReactDOM.createRoot(document.getElementById("root"));
        try {
          root.render(React.createElement(Component));
        } catch (err) {
          showError("Render Error", err.message + "\\n\\n" + err.stack);
        }
      } catch (err) {
        showError("Unexpected Error", err.message + "\\n\\n" + (err.stack || ""));
      }
    }

    // SSE live reload
    const evtSource = new EventSource("/events");
    evtSource.onmessage = function(event) {
      if (event.data === "reload") {
        location.reload();
      }
    };

    window.onerror = function(msg, source, line, col, err) {
      showError("Uncaught Error", msg + "\\n" + (source || "") + ":" + (line || "") + ":" + (col || "") + "\\n\\n" + (err && err.stack || ""));
    };

    loadAndRender();
  <\/script>
</body>
</html>`;
}

// --- Export mode ---

function generateExportHTML(transformedSource) {
  const escapedSource = transformedSource
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\$/g, "\\$");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${fileName.replace(/\.jsx$/, "")}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { min-height: 100vh; }
    #error-overlay {
      display: none;
      position: fixed; inset: 0; z-index: 99999;
      background: rgba(30, 0, 0, 0.95);
      color: #ff6b6b;
      font-family: "SF Mono", "Fira Code", "Consolas", monospace;
      padding: 40px;
      overflow: auto;
    }
    #error-overlay.visible { display: block; }
    #error-overlay h2 { font-size: 18px; margin-bottom: 16px; color: #ff8a8a; }
    #error-overlay pre {
      font-size: 13px; line-height: 1.6; white-space: pre-wrap;
      word-break: break-word; color: #ffcccc;
    }
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"><\/script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"><\/script>
  <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"><\/script>
</head>
<body>
  <div id="root"></div>
  <div id="error-overlay">
    <h2 id="error-title">Error</h2>
    <pre id="error-details"></pre>
  </div>

  <script>
    function showError(title, details) {
      document.getElementById("error-title").textContent = title;
      document.getElementById("error-details").textContent = details;
      document.getElementById("error-overlay").classList.add("visible");
    }

    (function() {
      var source = \`${escapedSource}\`;

      var transformed;
      try {
        transformed = Babel.transform(source, {
          presets: ["react"],
          filename: "${fileName}",
        }).code;
      } catch (err) {
        showError("JSX Transpilation Error", err.message);
        return;
      }

      try {
        var fn = new Function(transformed);
        fn();
      } catch (err) {
        showError("Runtime Error", err.message + "\\n\\n" + err.stack);
        return;
      }

      var exports = window.__JSX_VIEWER_EXPORTS__ || {};
      var Component = exports.default || Object.values(exports).find(function(v) { return typeof v === "function"; });

      if (!Component) {
        showError("No Component Found", "The file does not export a React component.");
        return;
      }

      ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(Component));
    })();
  <\/script>
</body>
</html>`;
}

if (exportMode) {
  const raw = fs.readFileSync(targetFile, "utf-8");
  const transformed = transformSource(raw);
  const html = generateExportHTML(transformed);
  const outputFile = path.join(
    path.dirname(targetFile),
    fileName.replace(/\.jsx$/, ".html")
  );
  fs.writeFileSync(outputFile, html, "utf-8");
  console.log(`\n  Exported: ${outputFile}\n`);
  process.exit(0);
}

// --- SSE ---

const sseClients = new Set();

function broadcast(data) {
  for (const client of sseClients) {
    client.write(`data: ${data}\n\n`);
  }
}

// --- HTTP server ---

const server = http.createServer((req, res) => {
  const url = req.url.split("?")[0];

  if (url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(generateHTML());
    return;
  }

  if (url === "/source.jsx") {
    try {
      const raw = fs.readFileSync(targetFile, "utf-8");
      const transformed = transformSource(raw);
      res.writeHead(200, {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
      });
      res.end(transformed);
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end(`Failed to read file: ${err.message}`);
    }
    return;
  }

  if (url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    res.write(":ok\n\n");
    sseClients.add(res);
    const heartbeat = setInterval(() => res.write(":heartbeat\n\n"), 30000);
    req.on("close", () => {
      sseClients.delete(res);
      clearInterval(heartbeat);
    });
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

// --- File watcher ---

function setupWatcher() {
  let lastChange = 0;
  const DEBOUNCE_MS = 150;
  const targetDir = path.dirname(targetFile);

  function onChange() {
    const now = Date.now();
    if (now - lastChange < DEBOUNCE_MS) return;
    lastChange = now;
    console.log(`  Reloading: ${fileName}`);
    broadcast("reload");
  }

  // Watch the directory to handle atomic saves (write-to-temp + rename)
  // used by Warp, vim, VS Code, and other editors
  try {
    fs.watch(targetDir, { persistent: true }, (_event, changedFile) => {
      if (changedFile === fileName) {
        onChange();
      }
    });
  } catch {
    fs.watchFile(targetFile, { interval: 500 }, onChange);
  }
}

// --- Browser auto-open ---

function openBrowser(url) {
  const cmd =
    process.platform === "darwin"
      ? `open "${url}"`
      : process.platform === "win32"
        ? `start "" "${url}"`
        : `xdg-open "${url}"`;

  exec(cmd, (err) => {
    if (err) {
      console.log(`  Could not open browser. Visit: ${url}`);
    }
  });
}

// --- Start ---

function tryListen(currentPort, attempts) {
  server.listen(currentPort, () => {
    const url = `http://localhost:${currentPort}`;
    console.log(`\n  JSX Viewer`);
    console.log(`  File:    ${targetFile}`);
    console.log(`  URL:     ${url}`);
    console.log(`  Watching for changes...\n`);
    setupWatcher();
    openBrowser(url);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE" && attempts < 10) {
      server.removeAllListeners("error");
      tryListen(currentPort + 1, attempts + 1);
    } else {
      console.error(`\n  Failed to start server: ${err.message}\n`);
      process.exit(1);
    }
  });
}

tryListen(port, 0);

process.on("SIGINT", () => {
  console.log("\n  Shutting down...\n");
  server.close();
  process.exit(0);
});

process.on("SIGTERM", () => {
  server.close();
  process.exit(0);
});

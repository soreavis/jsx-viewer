# jsx-viewer

[![CI](https://github.com/soreavis/jsx-viewer/actions/workflows/ci.yml/badge.svg)](https://github.com/soreavis/jsx-viewer/actions/workflows/ci.yml)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18-green?logo=nodedotjs&logoColor=white)
![Zero dependencies](https://img.shields.io/badge/dependencies-zero-brightgreen)

Zero-dependency Node.js tool that serves a JSX file in your browser with live reload and a one-command export to standalone HTML.

## Features

- **Zero dependencies**: Uses only Node.js built-ins — nothing to install
- **Live reload**: Watches your file and reloads the browser instantly via SSE
- **React 18 + JSX**: Loads React and Babel Standalone from CDN at runtime
- **Error overlay**: Shows transpilation and runtime errors inline in the browser
- **Export mode**: Bundles your component into a self-contained HTML file
- **Auto-opens browser**: Navigates to the preview URL on startup
- **Port fallback**: Increments port automatically if the default is in use

## Prerequisites

- Node.js >= 18
- Internet connection (React and Babel are loaded from CDN)

## Quick Start

### 1. Clone

```bash
git clone git@github.com:soreavis/jsx-viewer.git
cd jsx-viewer
```

### 2. Run

```bash
node jsx-viewer.js <file.jsx>
```

### 3. Export

```bash
node jsx-viewer.js <file.jsx> --export
```

Writes `<file>.html` next to your JSX file — no server needed.

## Usage

```
node jsx-viewer.js <file.jsx> [--port 3742] [--export]
```

| Option | Default | Description |
|--------|---------|-------------|
| `<file.jsx>` | required | Path to the JSX file to preview |
| `--port <n>` | `3742` | Port to listen on (auto-increments if busy) |
| `--export` | — | Write a standalone HTML file instead of starting the server |

## How It Works

The viewer starts a local HTTP server and serves a shell page that loads React 18 and Babel Standalone from CDN. On each request, `jsx-viewer.js` reads your file, strips/rewrites ES module `import` statements into CDN globals, and sends the transformed source to the browser where Babel transpiles JSX in-place. A Server-Sent Events endpoint (`/events`) pushes a `reload` message whenever the file changes, triggering a full page refresh.

Export mode skips the server and writes a self-contained HTML file with the transformed source embedded inline.

## Troubleshooting

### "No Component Found" error in browser
- Make sure your JSX file has a default export (`export default function MyComponent`)

### Imports from packages other than `react` / `react-dom` show warnings
- Only `react`, `react-dom`, and `react-dom/client` are mapped to CDN globals. Other imports are skipped with a console warning. For third-party components, inline them or load them via a CDN script tag inside your JSX.

### Port already in use
- The viewer will automatically try the next port up. Check the terminal output for the actual URL.

### Export HTML is blank
- Open the browser console — a transpilation or runtime error is likely. The same error overlay visible in the dev server is present in the exported file.

## Credits

- Maintained by [soreavis](https://github.com/soreavis)
- Built with [Claude Code](https://claude.ai/code)

## License

MIT License — see [LICENSE](LICENSE) for details.

# Usage

```
node jsx-viewer.js <file.jsx> [--port <n>] [--export]
```

| Option | Default | Description |
|--------|---------|-------------|
| `<file.jsx>` | required | Path to the file to preview. Resolved against the working directory. |
| `--port <n>` | `3742` | Port to listen on. Increments if the port is taken. |
| `--export` | — | Write a standalone HTML file and exit. No server starts. |
| `--help`, `-h` | — | Print usage and exit. |

## The file argument

The first argument that does not begin with `--` is treated as the input file. Pass more than one and the last wins.

**The extension affects the output name.** Export strips a trailing `.jsx` and appends `.html`, so `App.jsx` writes `App.html`. Any other extension is kept and `.html` is appended: `App.js` writes `App.js.html`. The output path can never equal the input path, so exporting will not overwrite your source.

## Ports

If the requested port is in use, the server tries the next one, up to ten times. The URL it settled on is printed at startup.

The server binds `127.0.0.1` only. It is reachable from the machine it runs on and nowhere else. This is deliberate: `/source.jsx` serves the contents of the watched file, and binding all interfaces would publish that file to the local network.

## Routes

| Path | Response |
|------|----------|
| `/` | The shell page: React, Babel, the error overlay, and the loader script. |
| `/source.jsx` | The watched file, transformed. Read from disk on every request, sent with `Cache-Control: no-cache`. |
| `/events` | Server-Sent Events stream. Sends `reload` when the file changes. |

Anything else returns 404.

## Exit codes

| Code | Cause |
|------|-------|
| `0` | Help printed, or export finished. |
| `1` | No file argument, the file does not exist, or the server could not bind after its retries. |

`Ctrl-C` (SIGINT) and SIGTERM close the server and exit.

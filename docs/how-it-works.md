# How it works

## Server mode

1. The file path is resolved and checked. A missing file exits 1 before anything binds.
2. An HTTP server listens on `127.0.0.1`, on the requested port or the next free one.
3. The browser is opened at that URL (`open`, `start`, or `xdg-open` by platform). If that fails, the URL is printed instead.
4. `/` returns the shell page. It loads React 18 and Babel Standalone from unpkg, and contains an error overlay and a loader script.
5. The loader fetches `/source.jsx` with a timestamp query so nothing is cached.
6. The server reads the file from disk on every request and runs the transform (see [Supported syntax](supported-syntax.md)). Nothing is cached server-side either — the response always reflects what is on disk.
7. Babel transpiles the result in the browser with the `react` preset.
8. The output is evaluated with `new Function`. The transform has appended assignments that collect exports onto `window.__JSX_VIEWER_EXPORTS__`.
9. The loader takes `default` from that object, or the first exported value that is a function.
10. `ReactDOM.createRoot().render()` mounts it into `#root`.

Failures at steps 7, 8, 9 and 10 each fill the overlay with their own heading, so the stage that broke is visible without opening devtools. A `window.onerror` handler catches what escapes.

## Watching

The **directory** is watched, not the file, and events are filtered down to the one filename. Watching the file directly would miss most saves: editors including vim and VS Code write a temporary file and rename it over the original, which destroys the inode a file watch is attached to.

Changes are debounced by 150 ms, because a single save often produces several events. If `fs.watch` throws — some network and container filesystems do not support it — the tool falls back to polling the file every 500 ms.

## Reloading

The page holds an EventSource connection to `/events`. When the file changes, the server sends `reload` to every connected client and the page calls `location.reload()`.

This reloads the page. It does not patch modules, so component state is lost on every save. A comment heartbeat goes out every 30 seconds to stop idle proxies closing the stream.

## Export mode

Export runs the same transform, embeds the result in the page as a template literal, writes the file, and exits. Backslashes, backticks and `$` in the source are escaped so they survive being placed inside that literal.

Three things differ from the dev server:

- React is loaded from the **production** builds rather than the development ones. Development-only warnings do not appear.
- There is no `/events` stream and no watcher. The file is a snapshot of the source at export time.
- The error overlay has no dismiss button.

Babel is still fetched from unpkg and still transpiles at page load, so the file needs network access to run. Standalone here means it needs no server, not that it works offline.

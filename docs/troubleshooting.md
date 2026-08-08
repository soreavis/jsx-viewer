# Troubleshooting

## "No Component Found"

The file has no default export, or its default export is not a function.

It also appears when the export is written as a list — `export { App }` is not recognised by the transform. Change it to `export default function App()`. See [Supported syntax](supported-syntax.md).

## Syntax error mentioning `import` or `export`

The statement is indented. Every pattern in the transform is anchored to the start of a line, so an indented `import` is passed through verbatim and reaches the browser as an ES module statement in a context that does not allow one. Move it to column 0.

## "Skipped import from ... — module not available", then a ReferenceError

The module is not one of the three mapped specifiers. The import was removed, so the name is never bound and the first use throws. Inline the dependency's source into the file.

## Nothing reloads when I save

Check the terminal — a successful reload prints `Reloading: <file>`.

If nothing prints, the change did not reach the watcher. The watcher is attached to the directory the file was in at startup and filters on the exact filename, so renaming or moving the file while the server runs stops reloads until you restart. On network shares and some container filesystems `fs.watch` is unavailable and the tool falls back to polling every 500 ms — a save may take that long to register.

## State resets every time I save

Expected. Reloads are full page reloads, not hot module replacement. There is no way to preserve state across a save.

## Port already in use

The server increments the port and tries again, up to ten times. Read the URL printed at startup rather than assuming 3742. If all attempts fail, it exits 1.

## I cannot reach the server from my phone or another machine

By design. The server binds `127.0.0.1` and nothing else, because `/source.jsx` serves the contents of the file being watched.

## Exported HTML is blank

Open the browser console. The overlay in the exported file reports transpilation and runtime errors the same way the dev server does, and a blank page usually means one fired before mount.

Also check the network. The export embeds your source but still loads React and Babel from unpkg at page open, so it fails offline or behind a proxy that blocks the CDN.

## Export wrote a file named `something.js.html`

Export strips a trailing `.jsx` and appends `.html`. An input with any other extension keeps it, so `App.js` becomes `App.js.html`. Rename the input to `.jsx` if you want a clean `App.html`.

Before v1.0.1 this case overwrote the input file, because the output name was produced by substituting `.jsx` with `.html` and a non-matching extension left the path unchanged.

## Behaviour differs between the dev server and the export

The dev server loads React's development builds; the export loads the production builds. Development-only warnings, and errors that React only surfaces in development, appear in one and not the other.

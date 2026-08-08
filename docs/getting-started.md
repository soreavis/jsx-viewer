# Getting started

## Requirements

- Node.js 18 or newer.
- A browser.
- Network access. React and Babel are loaded from unpkg when the page opens — in the dev server and in exported HTML alike. Neither works offline.

There is nothing to install. The tool is one file and uses only Node.js built-ins.

## Get the file

```bash
# Clone it — one file, no install
git clone https://github.com/soreavis/jsx-viewer.git
cd jsx-viewer
```

## Write a component

The file must have a default export, and the export must be a function. Save this as `hello.jsx`:

```jsx
// hello.jsx — the default export must be a function
import React, { useState } from "react";

export default function Hello() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

## Run it

```bash
# Serve it, watch it, and open the browser
node jsx-viewer.js hello.jsx
```

The server starts on `http://localhost:3742` and your browser opens at that address. The terminal prints the file it is watching and the URL it actually bound — read it rather than assuming the port, because a busy port shifts it.

## Edit it

Save the file and the browser reloads. This is a full page reload, not hot module replacement: component state resets every time. A counter you clicked back to zero after a save is the tool working as designed, not a bug.

Stop the server with `Ctrl-C`.

## Export it

```bash
# Write hello.html next to the input and exit — no server
node jsx-viewer.js hello.jsx --export
```

Writes `hello.html` next to the input and exits without starting a server. The file runs by opening it — no server, no build step — but it still fetches React and Babel from the network.

Next: [Usage](usage.md) for the full command line, or [Supported syntax](supported-syntax.md) for what the transform accepts.

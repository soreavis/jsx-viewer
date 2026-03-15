# Contributing

Contributions are welcome.

## Getting started

```bash
git clone git@github.com:soreavis/jsx-viewer.git
cd jsx-viewer
```

No install step needed — the tool has zero dependencies.

## Running tests

No tests configured yet. To manually verify, run:

```bash
node --check jsx-viewer.js
node jsx-viewer.js --help 2>&1 || true
```

## Linting

No linter configured yet. The codebase uses `"use strict"` and Node.js built-ins only.

## Submitting changes

1. Fork this repo
2. Create a branch (`fix/description` or `feat/description`)
3. Make your changes
4. Ensure `node --check jsx-viewer.js` passes
5. Open a pull request

# Contributing

Contributions are welcome.

## Getting started

```bash
# Clone the repo — there is no install step, the tool has zero dependencies
git clone https://github.com/soreavis/jsx-viewer.git
cd jsx-viewer
```

## Running tests

The same three checks CI runs:

```bash
# Syntax of the transformer itself
node --check jsx-viewer.js

# Exports fixtures through the real CLI and parses what it emits
node test/transform.test.js

# Fails on private data that a later commit cannot take back
node test/hygiene.test.js
```

`node --check` alone is not enough. It validates the transformer's syntax and
says nothing about the syntax of the code it emits — the two are independent,
which is how a transform producing unparseable output once shipped green.

## Linting

No linter configured. The codebase uses `"use strict"` and Node.js built-ins only.

## Submitting changes

1. Fork this repo
2. Create a branch (`fix/description` or `feat/description`)
3. Make your changes
4. Ensure all three checks above pass
5. Open a pull request

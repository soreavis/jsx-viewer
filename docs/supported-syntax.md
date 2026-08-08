# Supported syntax

The transform is a set of regular expressions over the file text, not a parser. That keeps the tool dependency-free and sets the limits below.

**Statements must start at column 0.** Every pattern is anchored to the beginning of a line. An indented `import` or `export` is left untouched, reaches the browser as a bare ES module statement inside a `new Function` body, and fails there with a syntax error.

## Modules

Three specifiers resolve:

| Import from | Becomes |
|-------------|---------|
| `react` | `window.React` |
| `react-dom` | `window.ReactDOM` |
| `react-dom/client` | `window.ReactDOM` |

Anything else is replaced with a comment and a `console.warn`. The name is then unbound, so the first line that uses it throws a `ReferenceError` at render time — the warning in the console is the earlier and clearer signal. To use a third-party component, paste its source into the file.

## Imports

These forms are rewritten:

```jsx
// Default, named, default plus named, and namespace
import React from "react";
import { useState, useEffect } from "react";
import React, { useState, useEffect } from "react";
import * as React from "react";
```

Multi-line imports work — the pattern spans newlines up to the `from` clause:

```jsx
// Spans newlines up to the from clause
import React, {
  useState,
  useEffect,
} from "react";
```

Side-effect imports such as `import "./styles.css"` are removed. There is no asset pipeline; a stylesheet has to be a `<style>` element in the component or a tag added at runtime.

## Exports

These are recognised and registered:

```jsx
// Default exports — named, class, anonymous, arrow, and by identifier
export default function App() {}
export default class App {}
export default function () {}
export default () => {};
export default App;

// Named exports on the declaration
export function helper() {}
export const value = 1;
export class Thing {}
```

These are **not** recognised and pass through unchanged, which breaks the page:

```jsx
// List and re-export forms — passed through verbatim, then the page breaks
export { App };
export { App as default };
export * from "./other";
```

Rewrite them as a direct `export default` on the declaration.

## Choosing the component

The loader renders `default` if the file has one. Otherwise it renders the first exported value that happens to be a function — useful when a file exports one named component, unreliable when it exports several. Prefer a default export.

## TypeScript

Not supported. Babel runs with the `react` preset only, so type annotations are a syntax error.

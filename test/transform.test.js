#!/usr/bin/env node
"use strict";

/**
 * Prove the import transform emits code that actually parses.
 *
 * `node --check jsx-viewer.js` — the only gate this repo had — validates the
 * TRANSFORMER's syntax and says nothing about the syntax of what it EMITS. The
 * two are independent, and the gap shipped a real bug: `split(",", 2)` caps the
 * result array length in JS rather than limiting the number of splits (unlike
 * Python's maxsplit), so every named import past the first was discarded and
 * `import React, { useState, useEffect }` became:
 *
 *     const { useState = window.React;
 *
 * — unterminated, unparseable, and `--export` still exited 0 reporting success.
 * A green CI plus a success exit code meant nothing caught it.
 *
 * Each case below exports a fixture through the real CLI and parses the emitted
 * import lines with `new Function`. Run: node test/transform.test.js
 */

const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CLI = path.join(__dirname, "..", "jsx-viewer.js");

const CASES = [
  {
    name: "default + two named imports (the shipped bug)",
    jsx: 'import React, { useState, useEffect } from "react";\n' +
      "export default function App() { return <b>hi</b>; }\n",
    expect: ["const React = window.React;", "const { useState, useEffect } = window.React;"],
  },
  {
    name: "default + four named imports",
    jsx: 'import React, { useState, useEffect, useMemo, useRef } from "react";\n' +
      "export default function App() { return <b>hi</b>; }\n",
    expect: ["const { useState, useEffect, useMemo, useRef } = window.React;"],
  },
  {
    name: "default + one named import",
    jsx: 'import React, { useState } from "react";\n' +
      "export default function App() { return <b>hi</b>; }\n",
    expect: ["const { useState } = window.React;"],
  },
  {
    name: "bare default import",
    jsx: 'import React from "react";\nexport default function App() { return <b>hi</b>; }\n',
    expect: ["const React = window.React;"],
  },
  {
    name: "named-only import",
    jsx: 'import { useState } from "react";\nexport default function App() { return <b>hi</b>; }\n',
    expect: ["const { useState } = window.React;"],
  },
  {
    name: "namespace import",
    jsx: 'import * as React from "react";\nexport default function App() { return <b>hi</b>; }\n',
    expect: ["const React = window.React;"],
  },
];

function exportFixture(jsx) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "jsx-viewer-test-"));
  const jsxPath = path.join(dir, "fixture.jsx");
  fs.writeFileSync(jsxPath, jsx);
  execFileSync(process.execPath, [CLI, jsxPath, "--export"], { stdio: "pipe" });
  const html = fs.readFileSync(path.join(dir, "fixture.html"), "utf8");
  fs.rmSync(dir, { recursive: true, force: true });
  return html;
}

let failed = 0;

for (const c of CASES) {
  let html;
  try {
    html = exportFixture(c.jsx);
  } catch (err) {
    console.log(`  FAIL ${c.name} — export threw: ${err.message}`);
    failed++;
    continue;
  }

  const emitted = html
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.startsWith("const ") && l.includes("window.React"));

  const problems = [];

  // The emitted import block is plain JS, so it must parse on its own.
  try {
    new Function(emitted.join("\n"));
  } catch (err) {
    problems.push(`emitted code does not parse: ${err.message}`);
  }

  for (const want of c.expect) {
    if (!emitted.includes(want)) problems.push(`missing line: ${want}`);
  }

  if (problems.length) {
    failed++;
    console.log(`  FAIL ${c.name}`);
    problems.forEach((p) => console.log(`       ${p}`));
    emitted.forEach((l) => console.log(`       emitted: ${l}`));
  } else {
    console.log(`  ok   ${c.name}`);
  }
}

if (failed) {
  console.log(`\n✘ ${failed} of ${CASES.length} transform case(s) failed`);
  process.exit(1);
}
console.log(`\n✔ ${CASES.length} transform cases emit parseable code`);

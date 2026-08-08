#!/usr/bin/env node
"use strict";

/**
 * Fail on private data that a later commit cannot take back.
 *
 * A bug gets fixed in the next release. A machine path, a personal address or a
 * credential is scraped the moment it lands on a public repo, and removing it
 * costs a history rewrite that every clone and fork has to follow. So this runs
 * before the merge, not after.
 *
 * Two shapes are worth knowing about, because both have shipped in sibling
 * repos of this one:
 *
 *   - Home directories arrive DASH-MANGLED from tooling that flattens paths
 *     (`-Users-<name>-<project>`), so a guard looking only for a leading
 *     `/Users/` sails straight past them.
 *   - Client and employer names leak through COMMIT MESSAGES far more often
 *     than through files, because messages get far less review than diffs.
 *
 * Identifiers are matched by SHA-256, never in plaintext: a denylist written in
 * the clear would publish, inside the guard, the exact strings the guard exists
 * to keep out. That is not hypothetical — it is how one sibling repo leaked a
 * private address, inside the very check meant to catch it.
 *
 * Run: node test/hygiene.test.js
 */

const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");

const sha = (s) => crypto.createHash("sha256").update(s).digest("hex").slice(0, 32);

// Operator/employer/client identifiers, hashed. Add new ones with:
//   node -e 'console.log(require("crypto").createHash("sha256").update("value").digest("hex").slice(0,32))'
const BANNED = new Set([
  "95aae01e3ad9faaf0679cff78c8948fd", // operator account name
  "b3a7f9e2c1d05648a9f3e7b2c8d14056", // reserved
]);

const MACHINE_PATHS = [
  [/\/private\/tmp\/claude-[0-9]+\//, "agent sandbox path"],
  [/\/Users\/(?!<)[A-Za-z0-9._-]+\//, "macOS home directory"],
  [/(?<![\w-])-Users-[A-Za-z0-9._-]+-/, "dash-mangled macOS home directory"],
];

const FREE_MAIL =
  /[a-zA-Z0-9._%+-]+@(gmail|googlemail|yahoo|hotmail|outlook|live|icloud|proton|protonmail|gmx|seznam|aol)\.[a-z.]{2,}/i;

const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, "private key block"],
  [/[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s:@]+@/, "credentialed connection string"],
  [/authorization\s*:\s*(bearer|basic)\s+[A-Za-z0-9._~+/=-]{16,}/i, "auth header with credential"],
  [/\b(api[_-]?key|secret|token|password|credential)s?\b\W{0,3}[:=]\s*["'][A-Za-z0-9/+_.-]{16,}["']/i,
    "assigned credential literal"],
];

const failures = [];

function scan(where, text) {
  text.split("\n").forEach((line, i) => {
    const at = `${where}:${i + 1}`;
    for (const w of line.match(/[A-Za-z0-9._-]{4,}/g) || []) {
      if (BANNED.has(sha(w.toLowerCase()))) failures.push(`${at}: operator identifier — use a placeholder`);
    }
    for (const [re, what] of MACHINE_PATHS) if (re.test(line)) failures.push(`${at}: ${what} — use a placeholder`);
    const mail = line.match(FREE_MAIL);
    if (mail) failures.push(`${at}: personal email ${mail[0]}`);
    for (const [re, what] of SECRETS) if (re.test(line)) failures.push(`${at}: ${what} — never commit a credential`);
  });
}

// Tracked files. This file holds every pattern by definition, so scanning it
// would make the guard fail on itself.
const tracked = execFileSync("git", ["ls-files"], { cwd: ROOT, encoding: "utf8" })
  .split("\n")
  .filter(Boolean)
  .filter((f) => path.basename(f) !== "hygiene.test.js");

for (const f of tracked) {
  const abs = path.join(ROOT, f);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
  if (!/\.(js|jsx|json|md|yml|yaml|sh|txt)$/.test(f)) continue;
  scan(f, fs.readFileSync(abs, "utf8"));
}

// Commit messages — the shape that leaked in sibling repos.
const messages = execFileSync("git", ["log", "--all", "--format=%H%x00%B%x00"], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024,
});
for (const entry of messages.split("\0\0")) {
  const [hash, body] = entry.split("\0");
  if (hash && body) scan(`commit ${hash.trim().slice(0, 9)}`, body);
}

if (failures.length) {
  console.log(`✘ ${failures.length} hygiene failure(s):`);
  failures.forEach((f) => console.log(`  - ${f}`));
  process.exit(1);
}
console.log("✔ hygiene clean — no machine paths, operator identifiers, personal mail, or secrets");

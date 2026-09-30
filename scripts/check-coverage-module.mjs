#!/usr/bin/env node
/**
 * Gate: the published coverage modules keep the promises made about them, and print their
 * digests.
 *
 * Three of those promises are structural, so a gate can hold them, for EVERY published
 * version (`cov-v1.ts`, and `cov-v2.ts` beside it since ops decisions D48 item 5 and D82):
 *
 *   1. ZERO IMPORTS. A module must not import anything — not a package, not a sibling
 *      file, not a type. Anyone auditing the coverage model should need one file and a
 *      copy of Node, and nothing else. The moment it imports a helper, "read the
 *      published function" becomes "read the published function and its dependency tree".
 *      (That includes the other version: cov-v2 repeats cov-v1's helpers rather than
 *      importing them, so each file stands alone.)
 *
 *   2. NO CLOCK, NO I/O, NO RANDOMNESS. The function is pure and time is a parameter. A
 *      grep is a blunt instrument, but it catches the exact regression that matters: the
 *      well-meaning `Date.now()` added to make a signature "more convenient".
 *
 *   3. ONE VERSION PER FILE. `cov-vN.ts` declares `cov-vN`, and its vector file targets
 *      `cov-vN`. A behaviour change creates the next version alongside; it never edits a
 *      published one.
 *
 * And one promise is a measurement: a FROZEN module's digest is pinned here. cov-v1 is the
 * module every answer reporting `algoVersion: "cov-v1"` came from; its digest is what the
 * edge published at `/v1/meta` and what readers pinned. Now that a second module lives
 * beside it, an edit to the wrong file would be one keystroke away, so the gate compares
 * the bytes with the pinned digest instead of trusting the version string alone.
 *
 * Then it prints each module's SHA-256. That digest is what a deployment publishes at its
 * own diagnostics route, and what continuous integration compares against the deployed
 * bundle: the code answering a coverage query must be the code published here. Printing
 * it here means anyone can compute the comparison themselves.
 *
 * Run: node scripts/check-coverage-module.mjs
 */
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

import { ROOT, readJson, fail } from './lib/spec.mjs';

/** Every published module, the vector file that targets it, and its pinned digest if frozen. */
const MODULES = [
  {
    version: 'cov-v1',
    file: 'cov-v1.ts',
    vectors: 'vectors.json',
    // Frozen since the edge first published it (measured 2026-09-17, FS-10 §4.6 dated note).
    pinned: '96b19df421e4c3d8b719de736640133c3c2376dbc92045f13b83384c0184267a',
  },
  { version: 'cov-v2', file: 'cov-v2.ts', vectors: 'cov-v2.vectors.json', pinned: null },
];

const IMPURE = [
  { pattern: /Date\.now\s*\(/, why: 'reads the clock — time is a parameter (`nowUtc`), never an ambient fact' },
  { pattern: /new\s+Date\s*\(\s*\)/, why: 'reads the clock — `new Date()` with no argument is Date.now() wearing a hat' },
  { pattern: /Math\.random\s*\(/, why: 'introduces randomness into a function that must be reproducible forever' },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|require\s*\(|process\.env/, why: 'performs I/O or reads ambient configuration' },
  { pattern: /\bcrypto\b/, why: 'signature verification belongs to the caller — a pure function cannot do crypto without I/O' },
];

const problems = [];
const digests = [];

for (const { version, file, vectors: vectorName, pinned } of MODULES) {
  const path = join(ROOT, 'coverage', file);
  const bytes = readFileSync(path);
  const source = bytes.toString('utf8');
  const vectors = readJson(join(ROOT, 'coverage', vectorName));
  const lines = source.split(/\r?\n/);

  // 1. Zero imports. Matched at line start so a mention inside a comment or a string does
  // not trip it, and `export ... from` is caught too — a re-export is an import.
  lines.forEach((line, index) => {
    if (/^\s*(import\s|export\s+(\*|\{[^}]*\})\s+from\s)/.test(line)) {
      problems.push(
        `coverage/${file}:${index + 1}: a published coverage module must have no imports — ` +
          `one file plus Node is the whole audit surface.\n      ${line.trim()}`,
      );
    }
  });

  // 2. No clock, no I/O, no randomness.
  lines.forEach((line, index) => {
    const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
    for (const rule of IMPURE) {
      if (rule.pattern.test(code)) {
        problems.push(`coverage/${file}:${index + 1}: ${rule.why}\n      ${line.trim()}`);
      }
    }
  });

  // 3. One version per file.
  const declared = source.match(/export const ALGO_VERSION = '([^']+)'/);
  if (!declared) {
    problems.push(`coverage/${file}: does not export ALGO_VERSION`);
  } else if (declared[1] !== version) {
    problems.push(
      `coverage/${file}: declares ${JSON.stringify(declared[1])}, not ${version}. A behaviour change ` +
        `creates the next version alongside this file; it never renames this one, because every answer ` +
        `already given under ${version} must stay reproducible from this exact source.`,
    );
  }
  if (vectors.algoVersion !== version) {
    problems.push(`coverage/${vectorName} targets ${JSON.stringify(vectors.algoVersion)}, not ${version}`);
  }

  const digest = createHash('sha256').update(bytes).digest('hex');
  if (pinned !== null && digest !== pinned) {
    problems.push(
      `coverage/${file} has changed: sha256 ${digest}, pinned ${pinned}. ${version} is FROZEN — every ` +
        `answer a deployment gave under it must stay reproducible from these exact bytes, and readers ` +
        `pinned this digest. Restore the file; a behaviour change is a new version beside it.`,
    );
  }
  digests.push(`  ${version}: moduleSha256 = ${digest}${pinned !== null ? ' (frozen, pinned)' : ''}`);
}

fail(
  problems,
  `the coverage modules are dependency-free, clock-free and declare their own versions\n` +
    `${digests.join('\n')}\n` +
    `  (a deployment publishes the digest of the module it runs at /v1/meta; it must equal one of these)`,
);

#!/usr/bin/env node
/**
 * Gate: the published coverage module keeps the promises made about it, and print its
 * digest.
 *
 * Three of those promises are structural, so a gate can hold them:
 *
 *   1. ZERO IMPORTS. `cov-v1.ts` must not import anything — not a package, not a sibling
 *      file, not a type. Anyone auditing the coverage model should need this one file and
 *      a copy of Node, and nothing else. The moment it imports a helper, "read the
 *      published function" becomes "read the published function and its dependency tree".
 *
 *   2. NO CLOCK, NO I/O, NO RANDOMNESS. The function is pure and time is a parameter. A
 *      grep is a blunt instrument, but it catches the exact regression that matters: the
 *      well-meaning `Date.now()` added to make a signature "more convenient".
 *
 *   3. ONE VERSION PER FILE. The module declares `cov-v1` and the vector file targets
 *      `cov-v1`. A behaviour change creates `cov-v2` alongside; it never edits this file.
 *
 * Then it prints the module's SHA-256. That digest is what a deployment publishes at its
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

const MODULE = join(ROOT, 'coverage', 'cov-v1.ts');
const source = readFileSync(MODULE, 'utf8');
const vectors = readJson(join(ROOT, 'coverage', 'vectors.json'));
const problems = [];

// 1. Zero imports. Matched at line start so a mention inside a comment or a string does
// not trip it, and `export ... from` is caught too — a re-export is an import.
const lines = source.split(/\r?\n/);
lines.forEach((line, index) => {
  if (/^\s*(import\s|export\s+(\*|\{[^}]*\})\s+from\s)/.test(line)) {
    problems.push(
      `coverage/cov-v1.ts:${index + 1}: the published coverage module must have no imports — ` +
        `one file plus Node is the whole audit surface.\n      ${line.trim()}`,
    );
  }
});

// 2. No clock, no I/O, no randomness.
const IMPURE = [
  { pattern: /Date\.now\s*\(/, why: 'reads the clock — time is a parameter (`nowUtc`), never an ambient fact' },
  { pattern: /new\s+Date\s*\(\s*\)/, why: 'reads the clock — `new Date()` with no argument is Date.now() wearing a hat' },
  { pattern: /Math\.random\s*\(/, why: 'introduces randomness into a function that must be reproducible forever' },
  { pattern: /\bfetch\s*\(|XMLHttpRequest|require\s*\(|process\.env/, why: 'performs I/O or reads ambient configuration' },
  { pattern: /\bcrypto\b/, why: 'signature verification belongs to the caller — a pure function cannot do crypto without I/O' },
];
lines.forEach((line, index) => {
  const code = line.replace(/\/\/.*$/, '').replace(/^\s*\*.*$/, '');
  for (const rule of IMPURE) {
    if (rule.pattern.test(code)) {
      problems.push(`coverage/cov-v1.ts:${index + 1}: ${rule.why}\n      ${line.trim()}`);
    }
  }
});

// 3. One version per file.
const declared = source.match(/export const ALGO_VERSION = '([^']+)'/);
if (!declared) {
  problems.push('coverage/cov-v1.ts: does not export ALGO_VERSION');
} else if (declared[1] !== 'cov-v1') {
  problems.push(
    `coverage/cov-v1.ts: declares ${JSON.stringify(declared[1])}. A behaviour change creates ` +
      `coverage/cov-v2.ts alongside this file; it never renames this one, because every answer ` +
      `already given under cov-v1 must stay reproducible from this exact source.`,
  );
}
if (vectors.algoVersion !== 'cov-v1') {
  problems.push(`coverage/vectors.json targets ${JSON.stringify(vectors.algoVersion)}, not cov-v1`);
}

const digest = createHash('sha256').update(readFileSync(MODULE)).digest('hex');

fail(
  problems,
  `coverage/cov-v1.ts is dependency-free, clock-free and declares cov-v1\n` +
    `  moduleSha256 = ${digest}\n` +
    `  (a deployment publishes this digest at /v1/meta; it must equal this value)`,
);

#!/usr/bin/env node
/**
 * Gate: the published coverage module keeps the promises made about it, and prints its
 * digest.
 *
 * Three of those promises are structural, so a gate can hold them, for every module listed
 * below (today one, `cov-v1.ts`):
 *
 *   1. ZERO IMPORTS. A module must not import anything — not a package, not a sibling
 *      file, not a type. Anyone auditing the coverage model should need one file and a
 *      copy of Node, and nothing else. The moment it imports a helper, "read the
 *      published function" becomes "read the published function and its dependency tree".
 *      (That will include a later version: it repeats its predecessor's helpers rather
 *      than importing them, so each file stands alone.)
 *
 *   2. NO CLOCK, NO I/O, NO RANDOMNESS. The function is pure and time is a parameter. A
 *      grep is a blunt instrument, but it catches the exact regression that matters: the
 *      well-meaning `Date.now()` added to make a signature "more convenient".
 *
 *   3. ONE VERSION PER FILE. `cov-vN.ts` declares `cov-vN`, and its vector file targets
 *      `cov-vN`.
 *
 * And one promise is a measurement: the module's digest is pinned here. It is what the edge
 * publishes at `/v1/meta` and what readers compare, so the gate checks the bytes against the
 * pinned digest instead of trusting the version string alone. Until the public launch the
 * module changes in place (ops decision D136): a change moves this pin in the same commit,
 * and the `coverage/cov-v1.ts` section of CHANGELOG.md records the date and every digest the
 * edge has served. From the launch a published module is never edited: a change in behaviour
 * creates the next version beside it, pinned the same way, and a published pin never moves.
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

/** Every published module, the vector file that targets it, and its pinned digest. */
const MODULES = [
  {
    version: 'cov-v1',
    file: 'cov-v1.ts',
    vectors: 'vectors.json',
    // Pinned 2026-10-12 (ops decision D136): the function as changed on 2026-09-30, under its
    // own name. The edge served 96b19df4… from 2026-09-17 and a2c5f117… from 2026-09-30; the
    // CHANGELOG's coverage/cov-v1.ts section records all three digests and what moved.
    pinned: 'd1a3a4cba8e448d358dc9dfde8f150d76174584fdb4aa8391087331c5d78fe33',
  },
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
        `creates the next version alongside this file once the network is public; it never renames ` +
        `this one, because every answer given under ${version} must be reproducible from the source ` +
        `the CHANGELOG names for it.`,
    );
  }
  if (vectors.algoVersion !== version) {
    problems.push(`coverage/${vectorName} targets ${JSON.stringify(vectors.algoVersion)}, not ${version}`);
  }

  const digest = createHash('sha256').update(bytes).digest('hex');
  if (pinned !== null && digest !== pinned) {
    problems.push(
      `coverage/${file} has changed: sha256 ${digest}, pinned ${pinned}. The edge mirrors these bytes ` +
        `and publishes their digest, and readers compare it. Before the public launch a change in place ` +
        `moves this pin in the same commit, with a dated entry in the CHANGELOG's coverage section ` +
        `(ops decision D136); from the launch, restore the file — a behaviour change is a new version beside it.`,
    );
  }
  digests.push(`  ${version}: moduleSha256 = ${digest}${pinned !== null ? ' (pinned)' : ''}`);
}

fail(
  problems,
  `the coverage module is dependency-free, clock-free and declares its own version\n` +
    `${digests.join('\n')}\n` +
    `  (a deployment publishes the digest of the module it runs at /v1/meta; it must equal this one)`,
);

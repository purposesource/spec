#!/usr/bin/env node
/**
 * Gate: copy law, applied to a contract repository.
 *
 * A schema description is published copy. It is read by OSPO reviewers, quoted into
 * procurement documents, and rendered on documentation pages — so the claim rules that
 * govern the website govern this repository too, and a gate is the only way that stays
 * true after the twentieth edit.
 *
 * Three families of rule:
 *
 *   1. LEAK GUARDS — identifiers belonging to a different, unrelated venture must never
 *      appear in a movement repository (the resource firewall). Also catches an
 *      unsubstituted `{ORG}` / `{DOMAIN}` placeholder, which would publish a template
 *      instead of a contract.
 *
 *   2. OVERCLAIM GUARDS — the specific phrasings that were examined and rejected because
 *      each is one screenshot away from being refuted. The permitted forms are the
 *      narrower, provable ones (no distributable private profit with published capped
 *      costs; every RECORDED allocation and disbursement independently reconcilable; no
 *      copyright assignment, ever; amnesty COVENANTS with their scope stated).
 *
 *   3. THE MENTION RULE — the predecessor movement may be MENTIONED, never used as a
 *      self-description. Mechanically: any line using the phrase must carry the inline
 *      allow marker, which makes each deliberate mention a visible, reviewable decision
 *      rather than a habit. (Same mechanic as the website's copy lint; the canonical
 *      pattern file lives there, and this is the narrow local subset.)
 *
 * Plus one pin: wherever the exclusive-verification sentence appears, it must name the
 * canonical host exactly, since that string is printed on physical certificates.
 *
 * Before scanning, the claim rules are SELF-TESTED against the forbidden shortenings they
 * exist to catch and against the permitted forms those are most easily confused with
 * (D29 §6.1, §6.2). A gate that cannot fail is worse than no gate, and a pattern that also
 * caught the approved wording would be deleted by the first author it blocked.
 *
 * This file excludes ITSELF from the scan — a lint cannot be tripped by the patterns it
 * is built from — and that is the only exclusion.
 *
 * Run: node scripts/check-copy.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

import { ROOT, config, fail } from './lib/spec.mjs';

const cfg = config();
const SELF = 'scripts/check-copy.mjs';
const ALLOW_MARKER = 'copy-lint-allow: mention';

const SCAN_DIRS = ['schemas', 'openapi', 'coverage', 'examples', 'kits', 'scripts', '.github'];
const SCAN_FILES = ['README.md', 'CHANGELOG.md', 'NOTICE', 'redocly.yaml', 'spec.config.json', 'package.json'];
const SCAN_EXTENSIONS = ['.md', '.json', '.yaml', '.yml', '.ts', '.mjs', '.txt', ''];

// Leak and placeholder guards. Nothing here is a judgement call.
const LEAK_RULES = [
  { pattern: /\brabten\b/i, why: 'a different venture\'s name must never appear in a movement repository (resource firewall)' },
  { pattern: /\bstiftung\b/i, why: 'wrong legal form and wrong venture — this entity is not one' },
  { pattern: /\brendlio\b/i, why: 'no identifier from the arm\'s-length venture belongs in movement code or config' },
  { pattern: /\{ORG\}|\{DOMAIN\}/, why: 'unsubstituted placeholder — substitute from spec.config.json before publishing' },
];

// Overclaim guards. Each has a narrower permitted form; the reason is stated so the
// failure message teaches instead of scolding.
const UNCAPPED_CHARITY_WHY =
  'uncapped "all of it to charity" is false once any direct cost is charged to Purpose Fees. State the D29 form instead: direct costs charged to Purpose Fees are capped and published to the invoice; any cost support is listed by name.';

const CLAIM_RULES = [
  {
    pattern: /nobody\s+profits/i,
    why: 'processors, intermediaries and contractors are paid — the claim is one invoice away from a gotcha. Permitted: "no distributable private profit — direct costs charged to Purpose Fees are capped and published to the invoice; any cost support is listed by name" (D29).',
  },
  {
    pattern: /every\s+(franc|dollar|euro)\b/i,
    why: 'the bank legs to the listed recipients cannot be publicly proven end to end (D33: no intermediary). Permitted: "every recorded allocation and disbursement is independently reconcilable".',
  },
  {
    // "100% to charity", "100% of profits go to charity", "100 % of profit goes to charity":
    // the shortening D29 §6.2 forbids by name. At most one noun (optionally preceded by
    // "of" / "the") between the percentage and the verb, so the permitted §6.2 sentence —
    // "100% of profit BEYOND published operating needs goes to charity …" — stays
    // unmatched; the self-test pins both sides. An earlier form matched only "goes", so
    // the plural sentence slipped past the gate.
    pattern: /100\s*%\s*(?:(?:of\s+)?(?:the\s+)?\w+\s+)?(?:go(?:es)?\s+)?to\s+charit/i,
    why: UNCAPPED_CHARITY_WHY,
  },
  {
    // The same claim without the percentage.
    pattern: /\ball\s+(?:profits?|proceeds|revenue|fees|money)\s+(?:go(?:es)?\s+)?to\s+charit/i,
    why: UNCAPPED_CHARITY_WHY,
  },
  {
    pattern: /\bno\s+CLA\b/i,
    why: 'the contribution instrument is counsel-confirmed and its final ceremony is not ours to pre-guarantee. The permanent promise is about copyright: "no copyright assignment, ever".',
  },
  {
    pattern: /amnesty\s+on\s+purchase/i,
    why: 'bare "amnesty on purchase" overstates the scope. Use "amnesty covenants" and say whose covenants they are.',
  },
  {
    pattern: /\bfranc\s+traceable\b|\bfully\s+traceable\b/i,
    why: 'traceability claims must be scoped to what the published ledger actually proves.',
  },
];

const MENTION_RULE = {
  pattern: /open[\s-]source/i,
  why:
    'the predecessor movement may be mentioned but never used as a self-description. If this line is a deliberate ' +
    `mention, append the marker "${ALLOW_MARKER}" to it so the decision is visible in review.`,
};

const VERIFY_PIN = /verify only at\s+([^\s"'`,;)]+)/gi;
const expectedVerifyHost = cfg.verifyStatement.replace(/^verify only at\s+/i, '');

/* ----------------------------------------------------------------------- self-test */

// Prove the claim rules can fail before trusting them to pass. `mustMatch` are forbidden
// forms; `mustNotMatch` are the PERMITTED forms they are most easily confused with — the
// list that matters, because a rule that also caught the approved wording would be
// quietly deleted by the first author it blocked. Only CLAIM_RULES are probed: the leak
// and mention rules are literal identifiers with nothing to confuse them with.
const SELF_TEST = {
  mustMatch: [
    'nobody profits from this',
    'every franc is visible',
    '100% to charity',
    '100% of the fee goes to charity',
    // D29 §6.2 forbids this shortening by name; "100 %" with a space is the same claim.
    '100% of profits go to charity',
    '100% of profit goes to charity',
    '100 % of profits go to charity',
    '100% revenue to charity',
    'all profits to charity',
    'all proceeds go to charity',
    'no CLA, no signup',
    'amnesty on purchase',
    'fully traceable',
  ],
  mustNotMatch: [
    // D29 §6.2 — the one permitted "goes to charity" sentence: its qualifier sits between
    // the noun and the destination. (Its owner's name is a banned identifier here and is
    // not part of the sentence under test.)
    '100% of profit beyond published operating needs goes to charity and to charity programmes',
    // The permitted forms the rules themselves point to.
    'no distributable private profit — direct costs charged to Purpose Fees are capped and published to the invoice; any cost support is listed by name',
    'every recorded allocation and disbursement is independently reconcilable',
    'no copyright assignment, ever',
    'amnesty covenants, with their scope stated',
    'the direct costs charged to Purpose Fees are capped and published; the remainder is passed on directly to the listed recipients',
  ],
};

function selfTest() {
  const found = [];
  for (const text of SELF_TEST.mustMatch) {
    if (!CLAIM_RULES.some((rule) => rule.pattern.test(text))) {
      found.push(`self-test: no claim rule matches ${JSON.stringify(text)} — the gate would let it through`);
    }
  }
  for (const text of SELF_TEST.mustNotMatch) {
    const offender = CLAIM_RULES.find((rule) => rule.pattern.test(text));
    if (offender) {
      found.push(`self-test: claim rule ${offender.pattern} matches the PERMITTED form ${JSON.stringify(text)}`);
    }
  }
  return found;
}

const selfTestProblems = selfTest();
if (selfTestProblems.length > 0) fail(selfTestProblems, '');

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.git') continue;
      walk(full, out);
    } else if (SCAN_EXTENSIONS.some((ext) => (ext === '' ? !entry.includes('.') : entry.endsWith(ext)))) {
      out.push(full);
    }
  }
  return out;
}

const files = [];
for (const dir of SCAN_DIRS) walk(join(ROOT, dir), files);
for (const file of SCAN_FILES) {
  try {
    statSync(join(ROOT, file));
    files.push(join(ROOT, file));
  } catch {
    // A missing optional file is not this gate's business.
  }
}

const problems = [];
let mentions = 0;
let scanned = 0;

for (const path of files) {
  const rel = relative(ROOT, path).replace(/\\/g, '/');
  if (rel === SELF) continue;
  scanned += 1;

  const text = readFileSync(path, 'utf8');
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    const at = `${rel}:${index + 1}`;

    for (const rule of LEAK_RULES) {
      if (rule.pattern.test(line)) problems.push(`${at}: banned identifier — ${rule.why}\n      ${line.trim()}`);
    }
    for (const rule of CLAIM_RULES) {
      if (rule.pattern.test(line)) problems.push(`${at}: banned claim — ${rule.why}\n      ${line.trim()}`);
    }
    if (MENTION_RULE.pattern.test(line)) {
      if (line.includes(ALLOW_MARKER)) mentions += 1;
      else problems.push(`${at}: unmarked mention — ${MENTION_RULE.why}\n      ${line.trim()}`);
    }
  });

  for (const match of text.matchAll(VERIFY_PIN)) {
    const host = match[1].replace(/[.,]$/, '');
    if (host !== expectedVerifyHost) {
      problems.push(
        `${rel}: the exclusive-verification sentence must name ${expectedVerifyHost} exactly ` +
          `(found ${JSON.stringify(host)}). That string is printed on certificates.`,
      );
    }
  }
}

if (scanned === 0) problems.push('nothing was scanned — this gate would pass vacuously');

fail(
  problems,
  `copy clean across ${scanned} files (${mentions} marked mention${mentions === 1 ? '' : 's'} of the predecessor movement)`,
);

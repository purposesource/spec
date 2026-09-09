#!/usr/bin/env node
/**
 * Gate: every published claim-language kit is a valid, correctly addressed, figure-free document.
 *
 * A kit is the one document that tells an organisation what it may say in public about a
 * certificate it holds, and it is contractually binding on the holder (CERT-053). That makes
 * it copy AND contract at the same time, which is why it gets a gate of its own rather than
 * riding on the schema check:
 *
 *   1. `kits/` is not empty. A gate over an empty directory passes forever and proves nothing.
 *   2. Every `kits/*.json` validates against `schemas/claim-kit.v1.json`.
 *   3. THE NAME AND THE URL AGREE. `kits/kit-{n}.json` carries `kitVersion: "kit-{n}"` and is
 *      published at `{siteBaseUrl}/kits/v{n}` — the file name carries the document's identifier
 *      (the `{family}-{n}` grammar of `att-1` and `ent-terms-1`) and the URL carries the site's
 *      permalink token. Both halves are derived from spec.config.json here, so a domain or org
 *      rename is one edit and a test run rather than a hunt.
 *   4. EVERY PERMITTED PATTERN ENDS WITH THE EXCLUSIVE-VERIFICATION SENTENCE, spelled from
 *      spec.config.json (CERT-027). The schema pins the sentence too; this asserts it against
 *      the configured host rather than against a literal, which is the half a rename would break.
 *   5. NO CURRENCY FIGURE, ANYWHERE IN THE DOCUMENT. A kit publishes a pattern with braced
 *      placeholders, never one organisation's filled-in claim, and a figure inside a document the
 *      renderer embeds into every certificate would be a number about somebody else's purchase.
 *      The regular expression is the website's currency lint verbatim, deliberately: the two
 *      repositories publish the same document and must not disagree about what a figure is.
 *   6. THE EXAMPLE IS A PUBLISHED KIT, byte for byte, not a hand-written imitation of one. Kit
 *      wording is claim language under the claim rules; an example that drifted from the real
 *      document is exactly the file somebody copies into a press release. (Same precedent as
 *      `category-menu.v1.example.json`, where the example IS the published artifact.)
 *
 * Rules 3–6 are proved able to fail: the self-test at the end runs each of them against a
 * document that breaks it, so a rule that stopped matching cannot sit here looking green.
 *
 * Run: node scripts/check-kits.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, EXAMPLE_DIR, config, createValidatorWithAllSchemas, fail } from './lib/spec.mjs';

const KIT_DIR = join(ROOT, 'kits');
const KIT_SCHEMA_ID = 'https://purposesource.org/spec/schemas/claim-kit.v1.json';
const EXAMPLE_FILE = join(EXAMPLE_DIR, 'claim-kit.v1.example.json');

/** The website's currency lint, verbatim (website/scripts/check-copy.mjs CURRENCY_RE). */
const CURRENCY_RE = /(?:CHF|EUR|USD|[$€£])\s?\d[\d.,']*/g;

const cfg = config();
const { ajv } = createValidatorWithAllSchemas();
const validate = ajv.getSchema(KIT_SCHEMA_ID);
const problems = [];

if (!validate) {
  problems.push(
    `no schema is addressable at ${KIT_SCHEMA_ID} — schemas/claim-kit.v1.json is the contract ` +
      'every kit is validated against, and without it this gate would check nothing',
  );
}

/**
 * The four rules that are not the schema's, over one kit document.
 *
 * Returns problems rather than exiting, so the self-test below can drive it over documents
 * that are meant to fail. `file` is only used to say where.
 */
function kitProblems(file, text, kit) {
  const found = [];
  const where = `kits/${file}`;

  const match = /^kit-([0-9]+)\.json$/.exec(file);
  if (!match) {
    found.push(
      `${where}: a kit file is named kit-{n}.json — the identifier a certificate payload pins ` +
        'as claimKitVersion (D17) is the file name, so a file nobody can derive it from is not publishable',
    );
    return found;
  }
  const n = match[1];

  if (kit.kitVersion !== `kit-${n}`) {
    found.push(`${where}: kitVersion must be "kit-${n}" to match the file name (found ${JSON.stringify(kit.kitVersion)})`);
  }

  const expectedPermalink = `${cfg.siteBaseUrl}/kits/v${n}`;
  if (kit.permalink !== expectedPermalink) {
    found.push(
      `${where}: permalink must be ${expectedPermalink} (found ${JSON.stringify(kit.permalink)}) — ` +
        `kit-${n} is published at /kits/v${n}, and both halves derive from spec.config.json`,
    );
  }

  for (const [name, variant] of Object.entries(kit.variants ?? {})) {
    const pattern = variant?.permittedPattern;
    if (typeof pattern === 'string' && !pattern.endsWith(cfg.verifyStatement)) {
      found.push(
        `${where}: variants.${name}.permittedPattern must end with ${JSON.stringify(cfg.verifyStatement)} ` +
          '(CERT-027). That sentence is printed on certificates, and a claim that offers any other ' +
          'address to verify at is outside the kit.',
      );
    }
  }

  CURRENCY_RE.lastIndex = 0;
  const figure = CURRENCY_RE.exec(text);
  if (figure) {
    found.push(
      `${where}: currency figure ${JSON.stringify(figure[0])}. A kit publishes a pattern with braced ` +
        'placeholders, never a filled-in claim: the renderer embeds this document into every ' +
        "certificate, so a figure here is a number about somebody else's purchase.",
    );
  }

  return found;
}

/* ------------------------------------------------------------------------ the real kits */

const files = existsSync(KIT_DIR) ? readdirSync(KIT_DIR).filter((name) => name.endsWith('.json')).sort() : [];

if (files.length === 0) {
  problems.push(
    'kits/ holds no document — this gate would pass vacuously. The claim-language kit is what ' +
      'makes CERT-053 enforceable; a repository that publishes none has nothing to bind a claim to.',
  );
}

const texts = new Map();

for (const file of files) {
  const path = join(KIT_DIR, file);
  const text = readFileSync(path, 'utf8');
  texts.set(file, text);

  let kit;
  try {
    kit = JSON.parse(text);
  } catch (error) {
    problems.push(`kits/${file}: is not valid JSON — ${error.message}`);
    continue;
  }

  if (validate && !validate(kit)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`kits/${file}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }

  problems.push(...kitProblems(file, text, kit));
}

/* ------------------------------------------------------- the example is a published kit */

if (!existsSync(EXAMPLE_FILE)) {
  problems.push(
    'examples/claim-kit.v1.example.json is missing. Every schema owes one known-good instance ' +
      '(VS-05), and for this contract the instance is a copy of a published kit.',
  );
} else if (files.length > 0) {
  const example = readFileSync(EXAMPLE_FILE, 'utf8');
  const identical = [...texts.entries()].filter(([, text]) => text === example).map(([file]) => file);
  if (identical.length === 0) {
    problems.push(
      'examples/claim-kit.v1.example.json is not byte-identical to any document in kits/. The ' +
        'example for this contract is a PUBLISHED kit, not an imitation of one: kit wording is ' +
        'claim language, and an example that has drifted is the file somebody copies into a press ' +
        `release. Known kits: ${files.join(', ')}.`,
    );
  }
}

/* ------------------------------------------------------------------------- the self-test */

/**
 * Prove the four local rules can fail before trusting them to pass.
 *
 * Each case is a well-formed kit with exactly one thing wrong, and the expected failure is
 * matched by a substring of the message. A rule that silently stopped matching — because a
 * field was renamed, or a regular expression was "tidied" — shows up here rather than as a
 * green gate over a document nobody checked.
 */
function selfTest() {
  const wellFormed = {
    kitVersion: 'kit-9',
    permalink: `${cfg.siteBaseUrl}/kits/v9`,
    variants: { supporter: { permittedPattern: `{organisation} holds something. ${cfg.verifyStatement}` } },
  };
  const cases = [
    ['kit-9.json', wellFormed, null],
    ['kit-9.json', { ...wellFormed, kitVersion: 'kit-1' }, 'kitVersion must be "kit-9"'],
    ['kit-9.json', { ...wellFormed, permalink: 'https://example.invalid/kits/v9' }, 'permalink must be'],
    ['kits.json', wellFormed, 'named kit-{n}.json'],
    [
      'kit-9.json',
      { ...wellFormed, variants: { supporter: { permittedPattern: 'holds something. Verify at purposesource.org/verify.' } } },
      'must end with',
    ],
  ];

  const found = [];
  for (const [file, kit, expected] of cases) {
    const text = JSON.stringify(kit);
    const got = kitProblems(file, text, kit);
    if (expected === null) {
      if (got.length > 0) found.push(`self-test: a well-formed kit was rejected — ${got[0]}`);
    } else if (!got.some((problem) => problem.includes(expected))) {
      found.push(`self-test: ${JSON.stringify(expected)} was not reported for ${file} — the rule is inert`);
    }
  }

  // The currency rule is tested over the document TEXT, which is where it applies: a figure
  // can sit in a note or a prohibition, not only in a pattern.
  const withFigure = JSON.stringify({ ...wellFormed, note: 'Purpose Fee amount: USD 400' });
  if (!kitProblems('kit-9.json', withFigure, wellFormed).some((problem) => problem.includes('currency figure'))) {
    found.push('self-test: a currency figure in a kit was not reported — the figure rule is inert');
  }

  return found;
}

problems.push(...selfTest());

fail(
  problems,
  `${files.length} claim-language kit(s) validate, are addressed at ${cfg.siteBaseUrl}/kits/, ` +
    `end with ${JSON.stringify(cfg.verifyStatement)}, and carry no figure`,
);

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
 *   2. EVERY KIT VALIDATES AGAINST THE SHAPE ITS OWN `schemaVersion` NAMES: 1 is
 *      `schemas/claim-kit.v1.json`, 2 is `schemas/claim-kit.v2.json` (ops decision D44). A kit
 *      naming any other shape is refused, never validated against a guess. kit-1 is a v1 document
 *      and stays one; a breaking change of the kit's shape is a new schema file (versioning
 *      policy 2), so this dispatch is the one place the two shapes meet.
 *   3. THE NAME AND THE URL AGREE. `kits/kit-{n}.json` carries `kitVersion: "kit-{n}"` and is
 *      published at `{siteBaseUrl}/kits/v{n}` — the file name carries the document's identifier
 *      (the `{family}-{n}` grammar of `att-1` and `ent-terms-1`) and the URL carries the site's
 *      permalink token. Both halves are derived from spec.config.json here, so a domain or org
 *      rename is one edit and a test run rather than a hunt.
 *   4. EVERY CLAIM ENDS WITH THE EXCLUSIVE-VERIFICATION SENTENCE, spelled from spec.config.json
 *      (CERT-027): in a v1 kit every `permittedPattern`; in a v2 kit every line whose `use` is not
 *      `clause` (a clause is words added inside a line) and every template, and the document's own
 *      `verify` member is that sentence. The schemas pin the sentence too; this asserts it against
 *      the configured host rather than against a literal, which is the half a rename would break.
 *   5. NO CURRENCY FIGURE, ANYWHERE IN THE DOCUMENT. A kit publishes a pattern with braced
 *      placeholders, never one organisation's filled-in claim, and a figure inside a document the
 *      renderer embeds into every certificate would be a number about somebody else's purchase.
 *      The regular expression is the website's currency lint verbatim, deliberately: the two
 *      repositories publish the same document and must not disagree about what a figure is.
 *   6. A V2 KIT STATES THE PLEDGE ONCE. `pledge.text` is the only place a v2 kit says where a
 *      Purpose Fee goes, and a line reaches it only through the `{pledge}` placeholder. The same
 *      text anywhere else in the file would be a restated pledge, which is exactly what the kit
 *      forbids its holders to write. (Byte-equality with the canonical pledge of statutes Art. 5(5)
 *      is held by the publishing repository's tests: this repository does not carry the pledge.)
 *   7. EACH EXAMPLE IS ITS PUBLISHED KIT, byte for byte, not a hand-written imitation of one:
 *      `examples/claim-kit.v1.example.json` is `kits/kit-1.json` and
 *      `examples/claim-kit.v2.example.json` is `kits/kit-2.json`. Kit wording is claim language
 *      under the claim rules; an example that drifted from the real document is exactly the file
 *      somebody copies into a press release. (Same precedent as `category-menu.v1.example.json`,
 *      where the example IS the published artifact.)
 *
 * The document rules (2 to 6) are proved able to fail: the self-test at the end runs each of them
 * against a document that breaks it, so a rule that stopped matching cannot sit here looking green.
 *
 * Run: node scripts/check-kits.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, EXAMPLE_DIR, config, createValidatorWithAllSchemas, fail } from './lib/spec.mjs';

const KIT_DIR = join(ROOT, 'kits');

/** Each example, and the published kit it must equal byte for byte. */
const EXAMPLE_PAIRS = [
  ['claim-kit.v1.example.json', 'kit-1.json'],
  ['claim-kit.v2.example.json', 'kit-2.json'],
];

/** The website's currency lint, verbatim (website/scripts/check-copy.mjs CURRENCY_RE). */
const CURRENCY_RE = /(?:CHF|EUR|USD|[$€£])\s?\d[\d.,']*/g;

const cfg = config();

/** `schemaVersion` -> the `$id` of the shape a kit declaring it is validated against. */
const KIT_SCHEMA_IDS = new Map([
  [1, `${cfg.schemaBaseUrl}/claim-kit.v1.json`],
  [2, `${cfg.schemaBaseUrl}/claim-kit.v2.json`],
]);

const { ajv } = createValidatorWithAllSchemas();
const validators = new Map();
const problems = [];

for (const [version, id] of KIT_SCHEMA_IDS) {
  const validate = ajv.getSchema(id);
  if (validate) {
    validators.set(version, validate);
  } else {
    problems.push(
      `no schema is addressable at ${id} — it is the contract every kit declaring schemaVersion ${version} ` +
        'is validated against, and without it this gate would check nothing for those kits',
    );
  }
}

/**
 * Every claim a kit publishes that must end with the verification sentence, as [where, text].
 * v1: each variant's one `permittedPattern`. v2: each line whose `use` is not `clause`, and each
 * template. A member that is not a string is the schema's to report, not this rule's.
 */
function claimsOf(kit) {
  const claims = [];
  for (const [name, variant] of Object.entries(kit?.variants ?? {})) {
    if (kit.schemaVersion === 2) {
      (Array.isArray(variant?.lines) ? variant.lines : []).forEach((line, index) => {
        if (line?.use !== 'clause' && typeof line?.text === 'string') {
          claims.push([`variants.${name}.lines[${index}] (${line.id})`, line.text]);
        }
      });
      (Array.isArray(variant?.templates) ? variant.templates : []).forEach((template, index) => {
        if (typeof template?.text === 'string') {
          claims.push([`variants.${name}.templates[${index}] (${template.id})`, template.text]);
        }
      });
    } else if (typeof variant?.permittedPattern === 'string') {
      claims.push([`variants.${name}.permittedPattern`, variant.permittedPattern]);
    }
  }
  return claims;
}

/**
 * The rules that are not the schema's, over one kit document.
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

  if (!KIT_SCHEMA_IDS.has(kit?.schemaVersion)) {
    found.push(
      `${where}: schemaVersion ${JSON.stringify(kit?.schemaVersion)} names no published kit shape — ` +
        `${[...KIT_SCHEMA_IDS].map(([version, id]) => `${version} is ${id.split('/').pop()}`).join(', ')}. ` +
        'A kit is validated against the shape it declares, never against a guess.',
    );
  }

  if (kit?.kitVersion !== `kit-${n}`) {
    found.push(`${where}: kitVersion must be "kit-${n}" to match the file name (found ${JSON.stringify(kit?.kitVersion)})`);
  }

  const expectedPermalink = `${cfg.siteBaseUrl}/kits/v${n}`;
  if (kit?.permalink !== expectedPermalink) {
    found.push(
      `${where}: permalink must be ${expectedPermalink} (found ${JSON.stringify(kit?.permalink)}) — ` +
        `kit-${n} is published at /kits/v${n}, and both halves derive from spec.config.json`,
    );
  }

  for (const [claimAt, claim] of claimsOf(kit)) {
    if (!claim.endsWith(cfg.verifyStatement)) {
      found.push(
        `${where}: ${claimAt} must end with ${JSON.stringify(cfg.verifyStatement)} ` +
          '(CERT-027). That sentence is printed on certificates, and a claim that offers any other ' +
          'address to verify at is outside the kit.',
      );
    }
  }

  if (kit?.schemaVersion === 2) {
    if (kit.verify !== cfg.verifyStatement) {
      found.push(
        `${where}: verify must be ${JSON.stringify(cfg.verifyStatement)} (found ${JSON.stringify(kit.verify)}) — ` +
          'the document states the one verification sentence it requires at the end of every claim',
      );
    }
    const pledge = kit.pledge?.text;
    if (typeof pledge === 'string' && pledge.length > 0) {
      const spelled = JSON.stringify(pledge).slice(1, -1);
      const count = text.split(spelled).length - 1;
      if (count !== 1) {
        found.push(
          `${where}: the pledge text appears ${count} times in the file. A v2 kit states the pledge once, ` +
            'in pledge.text, and a line reaches it only through the {pledge} placeholder: a second copy is a ' +
            'restated pledge, which the kit forbids its holders to write.',
        );
      }
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

  const validate = validators.get(kit?.schemaVersion);
  if (validate && !validate(kit)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`kits/${file}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }

  problems.push(...kitProblems(file, text, kit));
}

/* ------------------------------------------------------ each example is its published kit */

for (const [exampleFile, kitFile] of EXAMPLE_PAIRS) {
  const examplePath = join(EXAMPLE_DIR, exampleFile);
  if (!existsSync(examplePath)) {
    problems.push(
      `examples/${exampleFile} is missing. Every schema owes one known-good instance (VS-05), and for ` +
        `this contract the instance is a copy of a published kit, kits/${kitFile}.`,
    );
  } else if (!texts.has(kitFile)) {
    problems.push(
      `examples/${exampleFile} is the published copy of kits/${kitFile}, which does not exist. ` +
        `Known kits: ${files.join(', ') || '(none)'}.`,
    );
  } else if (readFileSync(examplePath, 'utf8') !== texts.get(kitFile)) {
    problems.push(
      `examples/${exampleFile} is not byte-identical to kits/${kitFile}. The example for this contract ` +
        'is a PUBLISHED kit, not an imitation of one: kit wording is claim language, and an example that ' +
        'has drifted is the file somebody copies into a press release.',
    );
  }
}

/* ------------------------------------------------------------------------- the self-test */

/**
 * Prove the document rules can fail before trusting them to pass.
 *
 * Each case is a well-formed kit with exactly one thing wrong, and the expected failure is
 * matched by a substring of the message. A rule that silently stopped matching — because a
 * field was renamed, or a regular expression was "tidied" — shows up here rather than as a
 * green gate over a document nobody checked.
 */
function selfTest() {
  const wellFormed = {
    schemaVersion: 1,
    kitVersion: 'kit-9',
    permalink: `${cfg.siteBaseUrl}/kits/v9`,
    variants: { supporter: { permittedPattern: `{organisation} holds something. ${cfg.verifyStatement}` } },
  };
  const wellFormedV2 = {
    schemaVersion: 2,
    kitVersion: 'kit-9',
    permalink: `${cfg.siteBaseUrl}/kits/v9`,
    verify: cfg.verifyStatement,
    pledge: { text: 'the one pledge sentence this test document states', source: 'self-test' },
    variants: {
      supporter: {
        lines: [
          { id: 'holder', use: 'base', text: `{organisation} holds something. ${cfg.verifyStatement}` },
          { id: 'pledge', use: 'line', text: `The pledge: “{pledge}”. ${cfg.verifyStatement}` },
          { id: 'amount', use: 'clause', text: 'Purpose Fee: {amount} for {period}.' },
        ],
        templates: [{ id: 'post', channel: 'short-post', text: `{organisation} holds something. ${cfg.verifyStatement}` }],
      },
    },
  };
  /** A copy of the v2 document with one thing changed. */
  const v2 = (change) => {
    const kit = structuredClone(wellFormedV2);
    change(kit);
    return kit;
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
    ['kit-9.json', { ...wellFormed, schemaVersion: 3 }, 'names no published kit shape'],
    ['kit-9.json', { ...wellFormed, schemaVersion: undefined }, 'names no published kit shape'],
    ['kit-9.json', wellFormedV2, null],
    ['kit-9.json', v2((kit) => { kit.variants.supporter.lines[0].text = '{organisation} holds something.'; }), 'lines[0] (holder) must end with'],
    ['kit-9.json', v2((kit) => { kit.variants.supporter.templates[0].text = 'Verify at purposesource.org/verify.'; }), 'templates[0] (post) must end with'],
    ['kit-9.json', v2((kit) => { kit.verify = 'verify at purposesource.org'; }), 'verify must be'],
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

  // A clause is words added inside a line, so it carries no verification sentence: the
  // well-formed v2 document above has one, and the ending rule must leave it alone.
  if (claimsOf(wellFormedV2).some(([where]) => where.includes('(amount)'))) {
    found.push('self-test: a clause was treated as a claim — the ending rule would refuse every v2 kit');
  }

  // The pledge rule is tested over the document TEXT, where a restated pledge would sit.
  const restated = JSON.stringify({ ...wellFormedV2, note: wellFormedV2.pledge.text });
  if (!kitProblems('kit-9.json', restated, wellFormedV2).some((problem) => problem.includes('pledge text appears 2 times'))) {
    found.push('self-test: a pledge stated twice in a v2 kit was not reported — the pledge rule is inert');
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
  `${files.length} claim-language kit(s) validate against the shape their schemaVersion names, are addressed at ` +
    `${cfg.siteBaseUrl}/kits/, end every claim with ${JSON.stringify(cfg.verifyStatement)}, state a v2 pledge once, ` +
    'carry no figure, and each example is its published kit',
);

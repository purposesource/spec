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
 *      `schemas/claim-kit.v1.json`, the one kit shape. A kit naming any other shape is refused,
 *      never validated against a guess. Until the public launch the shape changes in place (on
 *      2026-10-12 it took ops decision D44's lines, templates and badge; ops decision D136); from
 *      the launch a breaking change of the kit's shape is a new schema file (versioning policy 2),
 *      and this dispatch is where the shapes would meet.
 *   3. THE NAME AND THE URL AGREE. `kits/kit-{n}.json` carries `kitVersion: "kit-{n}"` and is
 *      published at `{siteBaseUrl}/kits/v{n}` — the file name carries the document's identifier
 *      (the `{family}-{n}` grammar of `att-1` and `ent-terms-1`) and the URL carries the site's
 *      permalink token. Both halves are derived from spec.config.json here, so a domain or org
 *      rename is one edit and a test run rather than a hunt.
 *   4. EVERY CLAIM ENDS WITH THE EXCLUSIVE-VERIFICATION SENTENCE, spelled from spec.config.json
 *      (CERT-027): every line whose `use` is not `clause` (a clause is words added inside a line)
 *      and every template, and the document's own `verify` member is that sentence. The schemas pin the sentence too; this asserts it against
 *      the configured host rather than against a literal, which is the half a rename would break.
 *   5. NO CURRENCY FIGURE, ANYWHERE IN THE DOCUMENT. A kit publishes a pattern with braced
 *      placeholders, never one organisation's filled-in claim, and a figure inside a document the
 *      renderer embeds into every certificate would be a number about somebody else's purchase.
 *      The regular expression is the website's currency lint verbatim, deliberately: the two
 *      repositories publish the same document and must not disagree about what a figure is.
 *   6. A KIT STATES THE PLEDGE ONCE. `pledge.text` is the only place a kit says where a
 *      Purpose Fee goes, and a line reaches it only through the `{pledge}` placeholder. The same
 *      text anywhere else in the file would be a restated pledge, which is exactly what the kit
 *      forbids its holders to write. (Byte-equality with the canonical pledge of statutes Art. 5(5)
 *      is held by the publishing repository's tests: this repository does not carry the pledge.)
 *   7. EACH EXAMPLE IS ITS PUBLISHED KIT, byte for byte, not a hand-written imitation of one:
 *      `examples/claim-kit.v1.example.json` is `kits/kit-1.json`. Kit wording is claim language
 *      under the claim rules; an example that drifted from the real document is exactly the file
 *      somebody copies into a press release. (Same precedent as `category-menu.v1.example.json`,
 *      where the example IS the published artifact.) One further example shows a variant no kit
 *      carries yet: `examples/claim-kit.v1.contributor.example.json` is `kits/kit-1.json` with a
 *      contributor variant added and nothing else changed (1.2.0, ops decision D115, slice P05).
 *      Its words are a sample, the first note of each of its two word sets says so in the document
 *      itself (1.3.0, ops decision D181: the contributor words and the volunteer words), and rules
 *      3 to 6 hold over it as over a kit.
 *   8. THE CONTRIBUTOR VARIANT'S SHAPE IS PROVED BOTH WAYS over that sample. A contributor share
 *      template is admitted, in either word set, and so is a sponsor variant beside the contributor's. A face missing one of the renderer's words, with a word of its own, an
 *      empty word, a placeholder its word is not filled with, a money line without its figure or a
 *      share line without its share is refused; so are a contributor variant without a face, without
 *      its volunteer words, for another class too or with a badge, a volunteer word set without a
 *      share line, with a member of its own, without its base line or with a line that does not end
 *      with the verification sentence, a face or a volunteer word set on any other variant, and
 *      `{login}` or `{projects}` in another variant's lines or templates. Each refusal must come from
 *      the member it is about: a document refused for some other reason proves nothing.
 *
 * The document rules (2 to 6) are proved able to fail: the self-test at the end runs each of them
 * against a document that breaks it, so a rule that stopped matching cannot sit here looking green.
 *
 * Run: node scripts/check-kits.mjs
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

import { ROOT, EXAMPLE_DIR, config, createValidatorWithAllSchemas, fail } from './lib/spec.mjs';

const KIT_DIR = join(ROOT, 'kits');

/** Each example, and the published kit it must equal byte for byte. */
const EXAMPLE_PAIRS = [['claim-kit.v1.example.json', 'kit-1.json']];

/** Each further example: the published kit it adds one variant to, and that variant's key. */
const SAMPLE_EXAMPLES = [['claim-kit.v1.contributor.example.json', 'kit-1.json', 'contributor']];

/** How a sample variant's first note opens: the document's own word that its words are not published. */
const SAMPLE_MARK = 'SAMPLE — ';

/** The website's currency lint, verbatim (website/scripts/check-copy.mjs CURRENCY_RE). */
const CURRENCY_RE = /(?:CHF|EUR|USD|[$€£])\s?\d[\d.,']*/g;

const cfg = config();

/** `schemaVersion` -> the `$id` of the shape a kit declaring it is validated against. */
const KIT_SCHEMA_IDS = new Map([[1, `${cfg.schemaBaseUrl}/claim-kit.v1.json`]]);

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
 * Every claim a kit publishes that must end with the verification sentence, as [where, text]:
 * each line whose `use` is not `clause`, and each template. A member that is not a string is the
 * schema's to report, not this rule's.
 */
function claimsOf(kit) {
  const claims = [];
  for (const [name, variant] of Object.entries(kit?.variants ?? {})) {
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
  }
  return claims;
}

/**
 * The rules that are not the schema's, over one kit document.
 *
 * Returns problems rather than exiting, so the self-test below can drive it over documents
 * that are meant to fail. `file` is the kit's file name, which its identifier and address derive
 * from; `where` names the file read, which for a further example is not the kit's own.
 */
function kitProblems(file, text, kit, where = `kits/${file}`) {
  const found = [];

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

  if (kit?.verify !== cfg.verifyStatement) {
    found.push(
      `${where}: verify must be ${JSON.stringify(cfg.verifyStatement)} (found ${JSON.stringify(kit?.verify)}) — ` +
        'the document states the one verification sentence it requires at the end of every claim',
    );
  }
  const pledge = kit?.pledge?.text;
  if (typeof pledge === 'string' && pledge.length > 0) {
    const spelled = JSON.stringify(pledge).slice(1, -1);
    const count = text.split(spelled).length - 1;
    if (count !== 1) {
      found.push(
        `${where}: the pledge text appears ${count} times in the file. A kit states the pledge once, ` +
          'in pledge.text, and a line reaches it only through the {pledge} placeholder: a second copy is a ' +
          'restated pledge, which the kit forbids its holders to write.',
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

/* ------------------------------------ the further example: its published kit plus one variant */

/**
 * Rule 8: the contributor variant's shape (claim-kit.v1 1.2.0; its volunteer word set and share line,
 * 1.3.0), proved both ways over the sample.
 *
 * Every case is the sample with one thing changed, after the sample itself is shown to validate, so
 * a refusal tests the rule and not a broken sample. A refusal counts only when the validator names
 * the member and the keyword it is about: a document refused for another reason proves nothing here.
 */
function contributorShapeProblems(sample, validate) {
  const errorsOf = (doc) => (validate(doc) ? [] : [...(validate.errors ?? [])]);
  const first = errorsOf(sample)[0];
  if (first) {
    return {
      found: [`the contributor sample does not validate, so no refusal over it would prove anything — ${first.instancePath} ${first.message}`],
      admitted: 0,
      refused: 0,
    };
  }
  const verify = cfg.verifyStatement;
  /** A sponsor variant, admitted below, for the cases that need one beside the contributor's. */
  const sponsor = {
    appliesTo: ['supporter.sponsor'],
    lines: [{ id: 'sponsor', use: 'base', text: `{organisation} sponsors the Purpose Source Association for {period}. ${verify}` }],
    permittedNotes: [],
    templates: [],
    badge: null,
    prohibited: ['we support charity'],
    binding: sample.variants.supporter.binding,
  };
  /** The sample with one thing changed: `change(variants, contributor)`. */
  const changed = (change) => {
    const doc = structuredClone(sample);
    change(doc.variants, doc.variants.contributor);
    return doc;
  };

  const admitted = [
    ['a contributor share template naming {login} and {projects}', changed((v, c) => {
      c.templates = [{ id: 'post', channel: 'short-post', text: `{login} is a credited contributor to {projects}. ${verify}` }];
    })],
    ['a volunteer share template naming {login} and {projects}', changed((v, c) => {
      c.volunteer.templates = [{ id: 'post', channel: 'short-post', text: `{login} volunteered on {projects}. ${verify}` }];
    })],
    ['a sponsor variant beside the contributor one', changed((v) => { v.sponsor = structuredClone(sponsor); })],
  ];
  const refused = [
    ['a face without the money line', '/variants/contributor/face', 'required', (v, c) => { delete c.face.moneyLine; }],
    ['a face word of its own', '/variants/contributor/face', 'additionalProperties', (v, c) => { c.face.subtitle = 'Thank you'; }],
    ['an empty face word', '/variants/contributor/face/lead', 'minLength', (v, c) => { c.face.lead = ''; }],
    ['a placeholder in a word filled with none', '/variants/contributor/face/headline', 'pattern', (v, c) => { c.face.headline = 'Credited in {period}'; }],
    ['a placeholder its word is not filled with', '/variants/contributor/face/projectMany', 'pattern', (v, c) => { c.face.projectMany = '{count} projects'; }],
    ['a money line without its figure', '/variants/contributor/face/moneyLine', 'pattern', (v, c) => { c.face.moneyLine = 'Purpose Fees passed on to listed charities in {period}'; }],
    ['a face without the share line', '/variants/contributor/face', 'required', (v, c) => { delete c.face.shareLine; }],
    ['a share line without its share', '/variants/contributor/face/shareLine', 'pattern', (v, c) => { c.face.shareLine = 'For {period}, the holder recorded a choice.'; }],
    ['a share line naming a placeholder it is not filled with', '/variants/contributor/face/shareLine', 'pattern', (v, c) => { c.face.shareLine = '{share} of {amount} was left to the Association.'; }],
    ['a contributor variant without a face', '/variants/contributor', 'required', (v, c) => { delete c.face; }],
    ['a contributor variant without its volunteer words', '/variants/contributor', 'required', (v, c) => { delete c.volunteer; }],
    ['a volunteer face without the share line', '/variants/contributor/volunteer/face', 'required', (v, c) => { delete c.volunteer.face.shareLine; }],
    ['a volunteer status-only sentence naming the holder', '/variants/contributor/volunteer/face/statusOnlyLine', 'pattern', (v, c) => { c.volunteer.face.statusOnlyLine = 'With thanks to {login}, in {period}.'; }],
    ['a volunteer word set with a member of its own', '/variants/contributor/volunteer', 'additionalProperties', (v, c) => { c.volunteer.badge = null; }],
    ['a volunteer word set without its base line', '/variants/contributor/volunteer/lines', 'contains', (v, c) => { c.volunteer.lines = c.volunteer.lines.filter((line) => line.use !== 'base'); }],
    ['a volunteer line without the verification sentence', '/variants/contributor/volunteer/lines/0/text', 'pattern', (v, c) => { c.volunteer.lines[0].text = '{login} volunteered on {projects}.'; }],
    ['a contributor variant for another class too', '/variants/contributor/appliesTo', 'const', (v, c) => { c.appliesTo.push('steward.registration'); }],
    ['a contributor variant with a badge', '/variants/contributor/badge', 'const', (v, c) => { c.badge = structuredClone(v.statusOnly.badge); }],
    ['a contributor variant with no prohibition', '/variants/contributor/prohibited', 'minItems', (v, c) => { c.prohibited = []; }],
    ['a contributor line naming a placeholder outside the set', '/variants/contributor/lines/0/text', 'pattern', (v, c) => { c.lines[0].text = `{name} is a credited contributor. ${verify}`; }],
    ['a contributor line without the verification sentence', '/variants/contributor/lines/0/text', 'pattern', (v, c) => { c.lines[0].text = '{login} is a credited contributor to {projects}.'; }],
    ['a face on the supporter variant', '/variants/supporter/face', 'false schema', (v, c) => { v.supporter.face = structuredClone(c.face); }],
    ['a face on the status-only variant', '/variants/statusOnly/face', 'false schema', (v, c) => { v.statusOnly.face = structuredClone(c.face); }],
    ['a face on a sponsor variant', '/variants/sponsor/face', 'false schema', (v, c) => { v.sponsor = { ...structuredClone(sponsor), face: structuredClone(c.face) }; }],
    ['volunteer words on the supporter variant', '/variants/supporter/volunteer', 'false schema', (v, c) => { v.supporter.volunteer = structuredClone(c.volunteer); }],
    ['volunteer words on the status-only variant', '/variants/statusOnly/volunteer', 'false schema', (v, c) => { v.statusOnly.volunteer = structuredClone(c.volunteer); }],
    ['volunteer words on a sponsor variant', '/variants/sponsor/volunteer', 'false schema', (v, c) => { v.sponsor = { ...structuredClone(sponsor), volunteer: structuredClone(c.volunteer) }; }],
    ['{login} in a supporter line', '/variants/supporter/lines/0/text', 'not', (v) => { v.supporter.lines[0].text = `{login} holds a Purpose Source {lane} Entitlement for {period}. ${verify}`; }],
    ['{projects} in a supporter template', '/variants/supporter/templates/0/text', 'not', (v) => { v.supporter.templates[0].text = `{organisation} covers {projects}. ${verify}`; }],
    ['{login} in a status-only line', '/variants/statusOnly/lines/0/text', 'not', (v) => { v.statusOnly.lines[0].text = `{login} is covered; coverage status: {status}. ${verify}`; }],
    ['{projects} in a sponsor line', '/variants/sponsor/lines/0/text', 'not', (v) => { v.sponsor = structuredClone(sponsor); v.sponsor.lines[0].text = `{organisation} sponsors {projects}. ${verify}`; }],
  ];

  const found = [];
  for (const [what, doc] of admitted) {
    const error = errorsOf(doc)[0];
    if (error) found.push(`contributor shape: ${what} was refused — ${error.instancePath} ${error.message}`);
  }
  for (const [what, path, keyword, change] of refused) {
    const errors = errorsOf(changed(change));
    if (errors.length === 0) {
      found.push(`contributor shape: ${what} was admitted — the rule is inert`);
    } else if (!errors.some((error) => error.instancePath === path && error.keyword === keyword)) {
      found.push(`contributor shape: ${what} was refused, but not by \`${keyword}\` at ${path} — ${errors[0].instancePath} ${errors[0].message}`);
    }
  }
  return { found, admitted: admitted.length, refused: refused.length };
}

const shape = { admitted: 0, refused: 0 };

for (const [exampleFile, kitFile, variantKey] of SAMPLE_EXAMPLES) {
  const where = `examples/${exampleFile}`;
  const examplePath = join(EXAMPLE_DIR, exampleFile);
  if (!existsSync(examplePath)) {
    problems.push(`${where} is missing. It shows the ${variantKey} variant, which no kit carries yet, in kits/${kitFile}'s document.`);
    continue;
  }
  if (!texts.has(kitFile)) {
    problems.push(`${where} adds a variant to kits/${kitFile}, which does not exist. Known kits: ${files.join(', ') || '(none)'}.`);
    continue;
  }
  const text = readFileSync(examplePath, 'utf8');
  let sample;
  try {
    sample = JSON.parse(text);
  } catch (error) {
    problems.push(`${where}: is not valid JSON — ${error.message}`);
    continue;
  }
  const kit = JSON.parse(texts.get(kitFile));
  const { [variantKey]: variant, ...others } = sample?.variants ?? {};
  if (kit?.variants?.[variantKey] !== undefined) {
    problems.push(
      `kits/${kitFile} carries a ${variantKey} variant now, so ${where} has served its purpose: remove it and its row ` +
        'here, and prove rule 8 over the kit itself.',
    );
    continue;
  }
  if (variant === undefined) {
    problems.push(`${where} carries no ${variantKey} variant, and showing that variant is the only reason it exists.`);
    continue;
  }
  if (!isDeepStrictEqual({ ...sample, variants: others }, kit)) {
    problems.push(
      `${where} differs from kits/${kitFile} outside its ${variantKey} variant. It is that kit with one variant added and ` +
        "nothing else changed: a kit's words edited in an example are the drifted copy somebody quotes.",
    );
  }
  const note = Array.isArray(variant?.permittedNotes) ? variant.permittedNotes[0] : undefined;
  if (typeof note !== 'string' || !note.startsWith(SAMPLE_MARK)) {
    problems.push(
      `${where}: the ${variantKey} variant's first note must open ${JSON.stringify(SAMPLE_MARK)}. Its words are a sample, ` +
        'not published wording, and the document has to say so itself: it is read without this gate.',
    );
  }
  // A word set of the variant is read on its own (the renderer prints one set), so its own first note says so too (1.3.0).
  if (variant?.volunteer !== undefined) {
    const setNote = Array.isArray(variant.volunteer?.permittedNotes) ? variant.volunteer.permittedNotes[0] : undefined;
    if (typeof setNote !== 'string' || !setNote.startsWith(SAMPLE_MARK)) {
      problems.push(
        `${where}: the ${variantKey} variant's volunteer word set's first note must open ${JSON.stringify(SAMPLE_MARK)}, as the ` +
          "variant's own does: a certificate prints one word set, and each is read without this gate.",
      );
    }
  }
  problems.push(...kitProblems(kitFile, text, sample, where));
  const validate = validators.get(sample?.schemaVersion);
  if (variantKey === 'contributor' && validate) {
    const result = contributorShapeProblems(sample, validate);
    problems.push(...result.found);
    shape.admitted += result.admitted;
    shape.refused += result.refused;
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
  /** A copy of the well-formed document with one thing changed. */
  const changed = (change) => {
    const kit = structuredClone(wellFormed);
    change(kit);
    return kit;
  };

  const cases = [
    ['kit-9.json', wellFormed, null],
    ['kit-9.json', { ...wellFormed, kitVersion: 'kit-1' }, 'kitVersion must be "kit-9"'],
    ['kit-9.json', { ...wellFormed, permalink: 'https://example.invalid/kits/v9' }, 'permalink must be'],
    ['kits.json', wellFormed, 'named kit-{n}.json'],
    ['kit-9.json', { ...wellFormed, schemaVersion: 2 }, 'names no published kit shape'],
    ['kit-9.json', { ...wellFormed, schemaVersion: undefined }, 'names no published kit shape'],
    ['kit-9.json', changed((kit) => { kit.variants.supporter.lines[0].text = '{organisation} holds something.'; }), 'lines[0] (holder) must end with'],
    ['kit-9.json', changed((kit) => { kit.variants.supporter.templates[0].text = 'Verify at purposesource.org/verify.'; }), 'templates[0] (post) must end with'],
    ['kit-9.json', changed((kit) => { kit.verify = 'verify at purposesource.org'; }), 'verify must be'],
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
  // well-formed document above has one, and the ending rule must leave it alone.
  if (claimsOf(wellFormed).some(([where]) => where.includes('(amount)'))) {
    found.push('self-test: a clause was treated as a claim — the ending rule would refuse every kit');
  }

  // The pledge rule is tested over the document TEXT, where a restated pledge would sit.
  const restated = JSON.stringify({ ...wellFormed, note: wellFormed.pledge.text });
  if (!kitProblems('kit-9.json', restated, wellFormed).some((problem) => problem.includes('pledge text appears 2 times'))) {
    found.push('self-test: a pledge stated twice in a kit was not reported — the pledge rule is inert');
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
    `${cfg.siteBaseUrl}/kits/, end every claim with ${JSON.stringify(cfg.verifyStatement)}, state the pledge once, ` +
    `and carry no figure; each example is its published kit, ${SAMPLE_EXAMPLES.length} further example(s) add one ` +
    'variant marked SAMPLE to a published kit and change nothing else, and the contributor variant\'s shape holds ' +
    `${shape.refused} refusals and ${shape.admitted} admissions`,
);

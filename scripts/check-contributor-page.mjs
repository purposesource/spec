#!/usr/bin/env node
/**
 * Gate: the contributor page's contracts say what the design and the operator ruled, beyond what
 * JSON Schema can say on its own (ops decision D116 and its dated notes of 2026-10-06; design
 * PROFILE-PAGE-2026-10-06).
 *
 *   contrast   `examples/contributor-page-contrast.v1.golden.json`: every figure is the WCAG 2.2
 *              ratio of its colours, recomputed here; every text pair reaches 4.5 and every focus
 *              ring 3; the button text on each accent is whichever of white and black contrasts
 *              more; the rows are the eight presets of the two schemas, `purpose` in both modes
 *              (design §4.3).
 *   preview    `examples/contributor-page-preview.v1.golden.json`: each vector's document is a
 *              valid `contributor-page.v1`, its preimage is the document reduced exactly as that
 *              schema's description defines, its text is the RFC 8785 form of the preimage, and
 *              `previewSha256` is the SHA-256 of that text's UTF-8 bytes (design §3.6). The vectors
 *              between them reduce a GitHub picture, keep an upload, drop a card's files, and
 *              carry non-ASCII text. Every string of a preimage is well-formed Unicode: a lone
 *              surrogate is refused, never serialised (I-JSON, as RFC 8785 assumes).
 *   alias      `examples/contributor-page-alias.v1.golden.json`: each vector's message, HMAC-SHA256
 *              under the published test key, and addressMac (the first 26 characters of the
 *              digest's lower-case unpadded base32) recompute, and the vectors include a login in
 *              mixed case that gives the same MAC as its lower-case form (design §7.2).
 *   build      `examples/contributor-page-build.v1.golden.json`: on a page without the login, no
 *              repository under the person's own account is listed or counted, and one selected
 *              by hand is refused (contributor-page.v1 `repositoriesSection`; settings check (j)).
 *              The gate's own reading of that one builder rule answers every vector, and each
 *              expected section is a valid `repositoriesSection`.
 *   never      no member of the three page schemas is named for points, shares, bands, ranks,
 *              percentiles, scores, months, amounts or a person's GitHub id, and no published page
 *              example or vector carries a currency figure, a person's GitHub node id (the current
 *              `U_` form or the legacy base64 "04:User" form) or a GitHub picture address (design
 *              §8.7; the plan's correction 11; design correction 5).
 *   defaults   the `defaults` settings example is the schema's `default` for every member, so the
 *              document a new person starts from is the one the schema describes (status-only by
 *              default, the GitHub picture; design §2.4 and the D116 dated note of ~11:50Z).
 *   agree      the closed lists the settings and the public document share are the same lists.
 *   facts      in the page examples, every link is its table template with its handle, and the
 *              summary's counts are the rows the page shows (design §8.1: a count never reveals a
 *              hidden row).
 *   refusals   the schemas refuse what the design rules out, proved on copies of the examples: a
 *              `subId` or a `points` member, search off the login address, an address or adopter
 *              section without the login, a certificate whose display does not match the page, a
 *              page with no vouched section, a duplicate section, a raw picture URL, a link that is
 *              not an https address, a link handle outside its platform's characters, a Matrix id
 *              shaped like a path, a person's node id where a repository's belongs, a
 *              `generatedAt` finer than its day, two links for one platform, a Mastodon link with
 *              no instance, an upper-case or short colour, a bio with four line breaks, a name with
 *              a bidi override, and an alias carrying a login.
 *   goldens    every `examples/*.golden.json` is one a gate checks.
 *
 * Every rule is proved able to fail before the examples are trusted to pass.
 *
 * Run: node scripts/check-contributor-page.mjs
 */
import { createHash, createHmac } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, config, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';
import { rebuild, parseWebsite } from './lib/link-rules.mjs';

const cfg = config();
const { ajv, schemas } = createValidatorWithAllSchemas();
const schemaJson = (file) => schemas.find((s) => s.file === file)?.json;
const validator = (file) => ajv.getSchema(`${cfg.schemaBaseUrl}/${file}`);
const example = (name) => readJson(join(EXAMPLE_DIR, name));

const PAGE = 'contributor-page.v1.json';
const SETTINGS = 'contributor-page-settings.v1.json';
const ALIAS = 'contributor-page-alias.v1.json';
const PAGE_EXAMPLES = ['contributor-page.v1.example.json', 'contributor-page.v1.anonymous.example.json'];
const GOLDENS = [
  'link-rules.v1.golden.json',
  'contributor-page-contrast.v1.golden.json',
  'contributor-page-preview.v1.golden.json',
  'contributor-page-alias.v1.golden.json',
  'contributor-page-build.v1.golden.json'
];

const table = example('link-platforms.v1.example.json');
const real = {
  contrast: example('contributor-page-contrast.v1.golden.json'),
  preview: example('contributor-page-preview.v1.golden.json'),
  aliasGolden: example('contributor-page-alias.v1.golden.json'),
  build: example('contributor-page-build.v1.golden.json'),
  page: example('contributor-page.v1.example.json'),
  anonymous: example('contributor-page.v1.anonymous.example.json'),
  settings: example('contributor-page-settings.v1.example.json'),
  defaults: example('contributor-page-settings.v1.defaults.example.json'),
  alias: example('contributor-page-alias.v1.example.json'),
  schemas: { page: schemaJson(PAGE), settings: schemaJson(SETTINGS), alias: schemaJson(ALIAS) }
};

/* ------------------------------------------------------------------------- contrast */

const linear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const twoDecimals = (x) => Math.round(x * 100) / 100;
const HEX = /^#[0-9a-f]{6}$/;

function contrastProblems(golden, settingsSchema, pageSchema) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/contributor-page-contrast.v1.golden.json: ${message}`]);
  const presets = settingsSchema.$defs.preset.enum;
  const pagePresets = pageSchema.properties.theme.properties.preset.enum;
  if (presets.join(',') !== pagePresets.join(',')) add('contrast', 'the two schemas list different presets');
  const rows = golden.rows ?? [];
  if (rows.length === 0) add('contrast', 'no rows — this gate would pass vacuously');
  const modes = new Map();
  for (const row of rows) {
    const where = `${row.preset}/${row.mode}`;
    modes.set(row.preset, [...(modes.get(row.preset) ?? []), row.mode]);
    for (const key of ['ground', 'ink', 'muted', 'accent', 'onAccent', 'focus']) if (!HEX.test(row[key] ?? '')) add('contrast', `${where}: ${key} is not #rrggbb`);
    if (found.length > 0) continue;
    if (row.focus !== golden.focusRings?.[row.mode]) add('contrast', `${where}: the focus ring is not the ${row.mode} ring of focusRings`);
    const better = ratio('#ffffff', row.accent) >= ratio('#000000', row.accent) ? '#ffffff' : '#000000';
    if (row.onAccent !== better) add('contrast', `${where}: the button text must be ${better}, whichever of white and black contrasts more with the accent`);
    const computed = {
      ink: ratio(row.ink, row.ground),
      muted: ratio(row.muted, row.ground),
      accent: ratio(row.accent, row.ground),
      onAccent: ratio(row.onAccent, row.accent),
      focus: ratio(row.focus, row.ground)
    };
    for (const [pair, value] of Object.entries(computed)) {
      if (row.ratios?.[pair] !== twoDecimals(value)) add('contrast', `${where}: ${pair} is recorded as ${row.ratios?.[pair]}, WCAG 2.2 gives ${twoDecimals(value)}`);
      const minimum = pair === 'focus' ? golden.minimums.focus : golden.minimums.text;
      if (value < minimum) add('contrast', `${where}: ${pair} at ${twoDecimals(value)}:1 is below ${minimum}:1`);
    }
  }
  if (golden.minimums?.text !== 4.5 || golden.minimums?.focus !== 3) add('contrast', 'the minimums are 4.5 for text (WCAG 2.2 AA) and 3 for a focus ring');
  for (const preset of presets) {
    const seen = (modes.get(preset) ?? []).sort().join(',');
    const expected = preset === 'purpose' ? 'dark,light' : null;
    if (expected ? seen !== expected : !['light', 'dark'].includes(seen)) {
      add('contrast', `${preset} has rows for [${seen}]; \`purpose\` follows the visitor and needs both modes, every other preset one`);
    }
  }
  for (const preset of modes.keys()) if (!presets.includes(preset)) add('contrast', `${preset} is not a preset of the schemas`);
  return found;
}

/* -------------------------------------------------------------------------- preview */

/**
 * RFC 8785 for integers, strings, booleans, null, arrays and objects; anything else is refused,
 * and so is a string that is not well-formed Unicode: JSON.stringify writes a lone surrogate as a
 * `\u` escape, a UTF-8 encoder as U+FFFD and System.Text.Json not at all, so no two
 * implementations would agree on its digest (I-JSON, RFC 7493, which RFC 8785 assumes).
 */
function canonical(value) {
  if (typeof value === 'string' && !value.isWellFormed()) throw new Error(`the string ${JSON.stringify(value)} holds a lone surrogate, which has no canonical form`);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`a non-integer number ${value} has no place in this document`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${canonical(key)}:${canonical(value[key])}`).join(',')}}`;
}

/** The preimage, exactly as contributor-page.v1's description defines it. */
function preimage(document) {
  const out = structuredClone(document);
  delete out.generatedAt;
  delete out.versionId;
  if (out.card) delete out.card.h16;
  if (out.picture?.kind === 'github') out.picture = { kind: 'github' };
  return out;
}

const validatePage = validator(PAGE);

function previewProblems(golden) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/contributor-page-preview.v1.golden.json: ${message}`]);
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('preview', 'no vectors — this gate would pass vacuously');
  const exercised = { githubReduced: false, uploadKept: false, cardDropped: false, nonAscii: false };
  for (const v of vectors) {
    if (!validatePage(v.document)) add('preview', `${v.id}: the document is not a valid contributor-page.v1 (${ajv.errorsText(validatePage.errors)})`);
    for (const text of [...strings(v.document), ...keysOf(v.document)].filter((s) => !s.isWellFormed())) {
      found.push(['unicode', `examples/contributor-page-preview.v1.golden.json: ${v.id}: ${JSON.stringify(text)} is not well-formed Unicode; a preimage holds none (I-JSON)`]);
    }
    const pre = preimage(v.document);
    if (JSON.stringify(sortDeep(pre)) !== JSON.stringify(sortDeep(v.preimage))) add('preview', `${v.id}: the preimage is not the document reduced as the schema defines it`);
    let text;
    try {
      text = canonical(pre);
    } catch (error) {
      add('preview', `${v.id}: ${error.message}`);
      continue;
    }
    if (text !== v.canonical) add('preview', `${v.id}: \`canonical\` is not the RFC 8785 form of the preimage`);
    const digest = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
    if (digest !== v.previewSha256) add('preview', `${v.id}: previewSha256 is ${v.previewSha256}, the preimage's text hashes to ${digest}`);
    if (v.document.picture?.kind === 'github' && Object.keys(v.document.picture).length > 1) exercised.githubReduced = true;
    if (v.document.picture?.kind === 'upload' || v.document.cover?.kind === 'upload') exercised.uploadKept = true;
    if (v.document.card?.h16) exercised.cardDropped = true;
    if (/[^\u0000-\u007f]/.test(text)) exercised.nonAscii = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) add('preview', `no vector exercises ${what}`);
  return found;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  return value;
}

/** Every member name of a document, at any depth. */
function keysOf(node, out = []) {
  if (Array.isArray(node)) for (const item of node) keysOf(item, out);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      out.push(key);
      keysOf(value, out);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------- alias */

/** RFC 4648 base32, lower case, no padding. */
function base32(bytes) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

/** The alias's addressMac, exactly as contributor-page-alias.v1's description defines it. */
function addressMac(keyHex, login) {
  const message = `u-login:${login.toLowerCase()}`;
  const digest = createHmac('sha256', Buffer.from(keyHex, 'hex')).update(Buffer.from(message, 'utf8')).digest();
  return { message, hex: digest.toString('hex'), mac: base32(digest).slice(0, 26) };
}

function aliasProblems(golden, aliasExample, namedPage) {
  const found = [];
  const add = (message) => found.push(['alias', `examples/contributor-page-alias.v1.golden.json: ${message}`]);
  if (!/^[0-9a-f]{64}$/.test(golden.keyHex ?? '')) {
    add('keyHex is not 32 bytes in lower-case hex, the shape of PSN_PAGE_ALIAS_KEY');
    return found;
  }
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('no vectors — this gate would pass vacuously');
  const byLower = new Map();
  for (const v of vectors) {
    const got = addressMac(golden.keyHex, v.login);
    if (v.message !== got.message) add(`${v.id}: the message is ${JSON.stringify(v.message)}, the definition gives ${JSON.stringify(got.message)}`);
    if (v.hmacSha256Hex !== got.hex) add(`${v.id}: hmacSha256Hex is ${v.hmacSha256Hex}, HMAC-SHA256 under keyHex gives ${got.hex}`);
    if (v.addressMac !== got.mac) add(`${v.id}: addressMac is ${v.addressMac}, the definition gives ${got.mac}`);
    if (v.path !== `u/k/${got.mac}.json`) add(`${v.id}: the path is ${v.path}, the alias lives at u/k/${got.mac}.json`);
    byLower.set(v.login.toLowerCase(), [...(byLower.get(v.login.toLowerCase()) ?? []), v.login]);
  }
  if (![...byLower.values()].some((logins) => logins.length > 1 && logins.some((l) => l !== l.toLowerCase()))) {
    add('no vector gives a mixed-case login beside its lower-case form, so the lower-casing is not pinned');
  }
  if (namedPage.address === 'login' && !vectors.some((v) => v.login === namedPage.login)) {
    add(`no vector names the login of examples/contributor-page.v1.example.json (${namedPage.login}), whose page the alias example points to`);
  }
  if (aliasExample.pid !== namedPage.pid) add(`examples/contributor-page-alias.v1.example.json points to ${aliasExample.pid}, the named page is ${namedPage.pid}`);
  return found;
}

/* ---------------------------------------------------------------------------- build */

const validateRepositoriesSection = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/$defs/repositoriesSection`);
const SHOWS_LOGIN = 'page.repository_shows_login';

/**
 * The gate's own reading of the one builder rule `contributor-page.v1` `repositoriesSection`
 * states and settings check (j) refuses: not the builder, which is C# in the platform.
 */
function buildRepositories(input) {
  const own = (r) => r.owner.toLowerCase() === input.login.toLowerCase();
  const choice = input.repositories;
  if (choice.mode === 'selected' && !input.showLogin && input.credited.some((r) => choice.selected.includes(r.nodeId) && own(r))) {
    return { refused: SHOWS_LOGIN };
  }
  let rows = choice.mode === 'all' ? input.credited.filter((r) => !choice.hidden.includes(r.nodeId)) : input.credited.filter((r) => choice.selected.includes(r.nodeId));
  const leftOut = input.showLogin ? [] : rows.filter(own).map((r) => ({ nodeId: r.nodeId, code: SHOWS_LOGIN }));
  if (!input.showLogin) rows = rows.filter((r) => !own(r));
  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const owners = [...new Set(rows.map((r) => r.owner))].sort(byName);
  const groups = owners.map((owner) => ({
    owner,
    repos: rows
      .filter((r) => r.owner === owner)
      .sort((a, b) => byName(a.name, b.name))
      .map((r) => ({ nodeId: r.nodeId, name: r.name, ...(choice.years ? { years: { from: r.from, to: r.to } } : {}), listing: r.listing }))
  }));
  return { repositories: groups.length > 0 ? { id: 'repositories', groups } : null, counts: { projects: rows.length, organisations: groups.length }, leftOut };
}

function buildProblems(golden) {
  const found = [];
  const add = (message) => found.push(['build', `examples/contributor-page-build.v1.golden.json: ${message}`]);
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('no vectors — this gate would pass vacuously');
  const exercised = { leftOutHidden: false, listedShown: false, refusedSelected: false, caseFolded: false, nothingLeft: false };
  for (const v of vectors) {
    const got = buildRepositories(v.input);
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(v.expect))) add(`${v.id}: expects ${JSON.stringify(v.expect)}, the rule gives ${JSON.stringify(got)}`);
    if (v.expect.repositories && !validateRepositoriesSection(v.expect.repositories)) add(`${v.id}: the expected section is not a valid repositoriesSection (${ajv.errorsText(validateRepositoriesSection.errors)})`);
    const ownRows = (v.expect.repositories?.groups ?? []).filter((g) => g.owner.toLowerCase() === v.input.login.toLowerCase());
    if (!v.input.showLogin && ownRows.length > 0) add(`${v.id}: a page without the login lists a group under the person's own login ${v.input.login}`);
    if (!v.input.showLogin && (v.expect.leftOut ?? []).length > 0) exercised.leftOutHidden = true;
    if (v.input.showLogin && ownRows.length > 0) exercised.listedShown = true;
    if (v.expect.refused === SHOWS_LOGIN) exercised.refusedSelected = true;
    if ((v.expect.leftOut ?? []).some((x) => v.input.credited.find((r) => r.nodeId === x.nodeId)?.owner !== v.input.login)) exercised.caseFolded = true;
    if (v.expect.repositories === null) exercised.nothingLeft = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) add(`no vector exercises ${what}`);
  return found;
}

/* ---------------------------------------------------------------------------- never */

const BANNED_MEMBER = /^(points?|microshares?|shares?|bands?|ranks?|ranking|percentiles?|scores?|months?|amounts?|.*minor|impact.*|subid|sub|githubid|usernodeid|avatarurl.*)$/i;
const CURRENCY = /\b(?:CHF|EUR|USD|GBP)\b|[$€£]\s?[0-9]|[0-9]\s?(?:CHF|EUR|USD|GBP)\b/;
/** A user's GitHub node id: the current `U_…` form, or the legacy base64 of "04:User…". */
const PERSON_NODE_ID = /^(?:U_[A-Za-z0-9_-]+|MDQ6VXNlcj[A-Za-z0-9+/=]*)$/;
const PICTURE_SOURCE = /githubusercontent\.com/i;

function memberNames(node, out = []) {
  if (Array.isArray(node)) for (const item of node) memberNames(item, out);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'properties' || key === 'patternProperties') && value && typeof value === 'object') out.push(...Object.keys(value));
      memberNames(value, out);
    }
  }
  return out;
}
function strings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) for (const item of node) strings(item, out);
  else if (node && typeof node === 'object') for (const value of Object.values(node)) strings(value, out);
  return out;
}

function neverProblems(schemaSet, documents) {
  const found = [];
  for (const [name, schema] of Object.entries(schemaSet)) {
    for (const member of memberNames(schema).filter((m) => BANNED_MEMBER.test(m))) {
      found.push(['never', `the ${name} schema has a member named ${member}: no page carries points, shares, ranks, months, amounts or a person's GitHub id (design §8.7)`]);
    }
  }
  for (const [where, document] of documents) {
    for (const text of strings(document)) {
      if (CURRENCY.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} reads as a money figure; nothing on a page carries one (design §8.4)`]);
      if (PERSON_NODE_ID.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} is a person's GitHub node id, which no page carries (the plan's correction 11)`]);
      if (PICTURE_SOURCE.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} names GitHub's picture host, which names the person's numeric id (design correction 5)`]);
    }
  }
  return found;
}

/* ------------------------------------------------------------------ defaults, agree */

function defaultsProblems(defaults, settingsSchema) {
  const found = [];
  for (const [member, schema] of Object.entries(settingsSchema.properties)) {
    if (member === 'schemaVersion') continue;
    const expected = JSON.parse(JSON.stringify(collectDefault(schema)));
    if (JSON.stringify(sortDeep(defaults[member])) !== JSON.stringify(sortDeep(expected))) {
      found.push(['defaults', `examples/contributor-page-settings.v1.defaults.example.json: ${member} is ${JSON.stringify(defaults[member])}, the schema's default is ${JSON.stringify(expected)}`]);
    }
  }
  return found;
}
/** A member's default: its own, or for an object without one, the object of its members' defaults. */
function collectDefault(schema) {
  if (schema.default !== undefined) return schema.default;
  if (schema.properties) {
    return Object.fromEntries(
      Object.entries(schema.properties)
        .filter(([, member]) => member.default !== undefined || member.properties)
        .map(([key, member]) => [key, collectDefault(member)]),
    );
  }
  return undefined;
}

function agreeProblems(settingsSchema, pageSchema) {
  const found = [];
  const s = settingsSchema;
  const p = pageSchema;
  const pairs = [
    ['layout', s.properties.layout.enum, p.properties.layout.enum],
    ['preset', s.$defs.preset.enum, p.properties.theme.properties.preset.enum],
    ['picture kind', s.$defs.picture.properties.kind.enum, p.properties.picture.properties.kind.enum],
    ['cover kind', s.$defs.cover.properties.kind.enum, p.properties.cover.properties.kind.enum],
    ['cover preset', s.$defs.coverPreset.enum, p.properties.cover.properties.preset.enum],
    ['address', s.properties.address.enum, p.properties.address.enum],
    ['section id', s.$defs.sectionId.enum, ['summarySection', 'certificatesSection', 'repositoriesSection', 'adopterSection', 'linksSection', 'sponsorsSection'].map((d) => p.$defs[d].properties.id.const)],
    ['card element', Object.keys(s.properties.card.properties), Object.keys(p.properties.card.properties).filter((k) => k !== 'h16')]
  ];
  for (const [what, a, b] of pairs) {
    if ((a ?? []).join(',') !== (b ?? []).join(',')) found.push(['agree', `the ${what} lists differ: settings [${a}], page [${b}]`]);
  }
  return found;
}

/* ---------------------------------------------------------------------------- facts */

function factsProblems(pages) {
  const found = [];
  for (const [where, doc] of pages) {
    const section = (id) => doc.sections.find((x) => x.id === id);
    for (const [kind, items] of [['links', section('links')?.items ?? []], ['sponsors', section('sponsors')?.items ?? []]]) {
      for (const item of items) {
        const platform = table.platforms.find((x) => x.id === item.platform);
        const form = platform?.forms.find((f) => f.id === (item.form ?? platform.forms[0].id));
        const built = form ? rebuild(table, platform, form, item.handle, item.instance) : { refused: 'platform_unknown' };
        if (built.url !== item.url) found.push(['facts', `${where}: the ${kind} item ${item.platform} ${item.handle} has url ${item.url}, its template gives ${built.url ?? built.refused}`]);
      }
    }
    const website = section('links')?.website;
    if (website && parseWebsite(table, website.url).url !== website.url) found.push(['facts', `${where}: the website ${website.url} is not what the website steps make of it`]);
    const summary = section('summary');
    const repositories = section('repositories');
    const certificates = section('certificates');
    if (summary && repositories) {
      const rows = repositories.groups.reduce((n, g) => n + g.repos.length, 0);
      if (summary.projects !== undefined && summary.projects !== rows) found.push(['facts', `${where}: the summary counts ${summary.projects} projects beside ${rows} listed rows`]);
      if (summary.organisations !== undefined && summary.organisations !== repositories.groups.length) found.push(['facts', `${where}: the summary counts ${summary.organisations} organisations beside ${repositories.groups.length} groups`]);
    }
    if (summary?.certificates !== undefined && certificates && summary.certificates !== certificates.items.length) {
      found.push(['facts', `${where}: the summary counts ${summary.certificates} certificates beside ${certificates.items.length} listed`]);
    }
  }
  return found;
}

/* ------------------------------------------------------------------------- refusals */

const validateSettings = validator(SETTINGS);
const validateAlias = validator(ALIAS);
const sectionOf = (doc, id) => doc.sections.find((x) => x.id === id);
const REFUSALS = [
  ['page', 'a subId member', (d) => { d.subId = 'U_kgDOexample01'; }],
  ['page', 'a points member', (d) => { sectionOf(d, 'summary').points = 1200; }],
  ['page', 'search off the login address', (d) => { d.address = 'mixed'; }],
  ['page', 'the login address without the login', (d) => { delete d.login; d.search = false; d.sections = d.sections.filter((x) => !['adopter', 'certificates'].includes(x.id)); d.card.login = false; d.card.adopter = false; d.autoUpdated = d.autoUpdated.filter((x) => x !== 'login'); }],
  ['anonymous', 'an adopter section without the login', (d) => { d.sections.push({ id: 'adopter', items: [{ nodeId: 'R_kgDOSMPL0001', fullName: 'example-org/ledger-tools', evidence: { kind: 'merged-pr', number: 42 } }] }); }],
  ['anonymous', 'a full certificate on a page without the login', (d) => { sectionOf(d, 'certificates').items[0].disclosure = 'full'; }],
  ['page', 'a status-only certificate on a page with the login', (d) => { const item = sectionOf(d, 'certificates').items[0]; item.disclosure = 'status-only'; delete item.repos; }],
  ['anonymous', 'no vouched section', (d) => { d.sections = d.sections.filter((x) => x.id === 'links'); d.card.summary = false; }],
  ['page', 'a section twice', (d) => { d.sections.push(structuredClone(sectionOf(d, 'links'))); }],
  ['page', 'a raw picture URL', (d) => { d.picture = { kind: 'upload', h16: '6616e65bafbcf60a', url: 'https://avatars.githubusercontent.com/u/1?v=4' }; }],
  ['page', 'a link that is not an https address', (d) => { sectionOf(d, 'links').items[0].url = 'javascript:alert(1)'; }],
  ['page', 'a link handle with a bidi override', (d) => { sectionOf(d, 'links').items[0].handle = 'alex\u202eelpmaxe'; }],
  ['page', 'a link handle with a slash', (d) => { sectionOf(d, 'links').items[0].handle = 'alex-example/../evil'; }],
  ['page', 'a Matrix id shaped like a path', (d) => { const m = sectionOf(d, 'links').items.find((l) => l.platform === 'matrix'); m.handle = '../..:matrix.org'; m.url = 'https://matrix.to/#/@../..:matrix.org'; }],
  ['page', "a person's node id as a repository's", (d) => { sectionOf(d, 'repositories').groups[0].repos[0].nodeId = 'U_kgDOexample01'; }],
  ['page', "a person's legacy node id as a certificate's repository", (d) => { sectionOf(d, 'certificates').items[0].repos[0].nodeId = 'MDQ6VXNlcjEyMzQ1Njc='; }],
  ['page', 'a generatedAt finer than its day', (d) => { d.generatedAt = '2027-03-01T03:47:12Z'; }],
  ['page', 'a month in the years', (d) => { sectionOf(d, 'repositories').groups[0].repos[0].years = { from: '2026-03', to: 2027 }; }],
  ['page', 'a claim status', (d) => { sectionOf(d, 'repositories').groups[0].repos[0].listing = 'verified'; }],
  ['page', 'an accent dark ground off the purpose preset', (d) => { d.theme.preset = 'mocha'; }],
  ['settings', 'search off the login address', (d) => { d.address = 'mixed'; }],
  ['settings', 'the login address without showLogin', (d) => { d.identity.showLogin = false; d.search = false; d.address = 'login'; d.sections.find((x) => x.id === 'adopter').on = false; }],
  ['settings', 'the adopter section without showLogin', (d) => { d.identity.showLogin = false; d.search = false; d.address = 'anonymous'; }],
  ['settings', 'a section missing', (d) => { d.sections.pop(); }],
  ['settings', 'a section twice', (d) => { d.sections[5] = { id: 'summary', on: false }; }],
  ['settings', 'a raw picture URL', (d) => { d.picture = { kind: 'upload', file: 'https://example.org/me.png' }; }],
  ['settings', 'an SVG upload named by path', (d) => { d.cover = { kind: 'upload', file: 'uploads/cover.svg' }; }],
  ['settings', 'two links for one platform', (d) => { d.links.push({ platform: 'linkedin', handle: 'alex-example-2' }); }],
  ['settings', 'a Mastodon link with no instance', (d) => { delete d.links.find((l) => l.platform === 'mastodon').instance; }],
  ['settings', 'a Matrix id shaped like a path', (d) => { d.links.find((l) => l.platform === 'matrix').handle = 'a/../b:matrix.org'; }],
  ['settings', "a person's node id among the hidden repositories", (d) => { d.repositories.hidden = ['U_kgDOexample01']; }],
  ['settings', 'a stored link carrying a URL', (d) => { d.links[0].url = 'https://www.linkedin.com/in/alex-example'; }],
  ['settings', 'an upper-case colour', (d) => { d.theme.accent = '#3A7BD5'; }],
  ['settings', 'a bio with four line breaks', (d) => { d.identity.bio = 'a\nb\nc\nd\ne'; }],
  ['settings', 'a name with a bidi override', (d) => { d.identity.displayName = 'Alex \u202eelpmaxE'; }],
  ['settings', 'a website with a query', (d) => { d.website = { url: 'https://alex.dev/?ref=x' }; }],
  ['settings', 'an amount switch', (d) => { d.summary.amounts = false; }],
  ['alias', 'an alias carrying a login', (d) => { d.login = 'example-contributor'; }]
];

const CONTRACT = { page: 'contributor-page.v1', anonymous: 'contributor-page.v1', settings: 'contributor-page-settings.v1', alias: 'contributor-page-alias.v1' };

function refusalProblems(docs, refusals) {
  const found = [];
  const validators = { page: validatePage, anonymous: validatePage, settings: validateSettings, alias: validateAlias };
  for (const [base, what, breakIt] of refusals) {
    const copy = structuredClone(docs[base]);
    breakIt(copy);
    if (validators[base](copy)) found.push(['refusals', `${CONTRACT[base]} admits ${what}`]);
  }
  return found;
}

/* -------------------------------------------------------------------------- goldens */

function goldenFilesProblems(names) {
  const found = [];
  for (const name of names.filter((n) => !GOLDENS.includes(n))) found.push(['goldens', `examples/${name} is a golden file no gate checks`]);
  for (const name of GOLDENS.filter((n) => !names.includes(n))) found.push(['goldens', `examples/${name} is missing`]);
  return found;
}

/* ------------------------------------------------------------------------------ run */

function allProblems(state) {
  return [
    ...contrastProblems(state.contrast, state.schemas.settings, state.schemas.page),
    ...previewProblems(state.preview),
    ...aliasProblems(state.aliasGolden, state.alias, state.page),
    ...buildProblems(state.build),
    ...neverProblems(state.schemas, [
      ...PAGE_EXAMPLES.map((name, i) => [`examples/${name}`, i === 0 ? state.page : state.anonymous]),
      ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document]),
      ['examples/contributor-page-alias.v1.example.json', state.alias]
    ]),
    ...defaultsProblems(state.defaults, state.schemas.settings),
    ...agreeProblems(state.schemas.settings, state.schemas.page),
    ...factsProblems([['examples/contributor-page.v1.example.json', state.page], ['examples/contributor-page.v1.anonymous.example.json', state.anonymous]]),
    ...refusalProblems(state, state.refusals ?? REFUSALS),
    ...goldenFilesProblems(state.goldenFiles)
  ];
}

const SELF_TEST = [
  ['contrast', (s) => { s.contrast.rows[3].ratios.accent = 6.0; }],
  ['contrast', (s) => { s.contrast.rows[2].muted = '#b0a090'; }],
  ['contrast', (s) => { s.contrast.rows = s.contrast.rows.filter((r) => r.preset !== 'signal'); }],
  ['preview', (s) => { s.preview.vectors[0].previewSha256 = '0'.repeat(64); }],
  ['preview', (s) => { s.preview.vectors[1].preimage.picture = { kind: 'github', letters: 'S' }; }],
  ['preview', (s) => { s.preview.vectors = s.preview.vectors.filter((v) => v.id !== 'PV-3'); }],
  ['unicode', (s) => { const v = s.preview.vectors[1]; v.document.identity.displayName = 'Sam \ud800'; v.preimage.identity.displayName = 'Sam \ud800'; }],
  ['alias', (s) => { s.aliasGolden.vectors[0].addressMac = s.aliasGolden.vectors[2].addressMac; }],
  ['alias', (s) => { s.aliasGolden.vectors[3].hmacSha256Hex = '0'.repeat(64); }],
  ['alias', (s) => { s.aliasGolden.vectors = s.aliasGolden.vectors.filter((v) => v.id !== 'AV-2'); }],
  ['build', (s) => { const v = s.build.vectors[0]; v.expect.repositories.groups.push({ owner: 'sam-codes', repos: [{ nodeId: 'R_kgDOSMPL0021', name: 'dotfiles', years: { from: 2026, to: 2026 }, listing: 'registered' }] }); }],
  ['build', (s) => { s.build.vectors[0].expect.counts.projects = 3; }],
  ['build', (s) => { s.build.vectors = s.build.vectors.filter((v) => v.id !== 'BV-3'); }],
  ['never', (s) => { s.schemas.page.$defs.summarySection.properties.rank = { type: 'integer' }; }],
  ['never', (s) => { s.anonymous.identity.bio = 'Paid CHF 120 to get here'; }],
  ['never', (s) => { s.anonymous.identity.bio = 'MDQ6VXNlcjEyMzQ1Njc='; }],
  ['defaults', (s) => { s.defaults.address = 'login'; }],
  ['agree', (s) => { s.schemas.page.properties.layout.enum = ['paper', 'profile']; }],
  ['facts', (s) => { sectionOf(s.page, 'links').items[0].url = 'https://www.linkedin.com/in/someone-else'; }],
  ['facts', (s) => { sectionOf(s.page, 'summary').projects = 4; }],
  ['refusals', (s) => { s.refusals = [['page', 'an unchanged page', () => {}]]; }],
  ['goldens', (s) => { s.goldenFiles = [...s.goldenFiles, 'unchecked.v1.golden.json']; }]
];

function selfTest() {
  const problems = [];
  for (const [rule, breakIt] of SELF_TEST) {
    const state = baseState();
    breakIt(state);
    if (!allProblems(state).some(([fired]) => fired === rule)) problems.push(`self-test: breaking a copy for rule "${rule}" was not caught`);
  }
  return problems;
}

function baseState() {
  const goldenFiles = readdirSync(EXAMPLE_DIR).filter((name) => name.endsWith('.golden.json')).sort();
  return { ...structuredClone(real), goldenFiles };
}

const selfTestProblems = selfTest();
if (selfTestProblems.length > 0) fail(selfTestProblems, '');

const state = baseState();
const problems = allProblems(state).map(([, message]) => message);
fail(
  problems,
  `the contributor page contracts hold: ${state.contrast.rows.length} preset rows meet WCAG 2.2 AA as recorded, ` +
    `${state.preview.vectors.length} preview vectors recompute, ${state.aliasGolden.vectors.length} alias MAC vectors recompute, ` +
    `${state.build.vectors.length} builder vectors keep a hidden login off the repository list, no page member or example carries points, money or a GitHub id, ` +
    `the defaults are the schema's, ${REFUSALS.length} refusals hold, and every rule was proved able to fail`,
);

#!/usr/bin/env node
/**
 * Gate: the contributor page's link table keeps its own rules, and every shared golden case gets
 * the answer the golden file records.
 *
 * `examples/link-platforms.v1.example.json` IS the table (ops decision D116 item 1; design
 * PROFILE-PAGE-2026-10-06 §5): the platform and the website edge vendor it byte for byte, and every
 * address a contributor page shows is rebuilt from it. `examples/link-rules.v1.golden.json` holds the
 * cases each implementation runs — loose input in, strict output or a refusal out. `check:examples`
 * proves the table has the schema's shape; this gate proves what a shape cannot:
 *
 *   TABLE
 *     ids        platform ids unique, form ids unique within a platform;
 *     kinds      exactly one `verified` platform, GitHub, never typed; eight `sponsorship` platforms
 *                (the D116 dated note of ~09:40Z); Discord, Matrix, Twitch, Reddit and Telegram are
 *                among the social ones (the operator's addition, the same note);
 *     regex      every pattern compiles as ECMAScript with the `u` flag; a grammar captures nothing;
 *                each match rule has exactly one source for its candidate (a `hostPattern` or `path`
 *                capturing `h`, a `query`, or a `fragment` capturing `h`);
 *     hosts      a rule's `hosts` are the platform's; every template's host is one the platform
 *                admits (so an output is itself an input the table accepts);
 *     reserved   every reserved word could be a handle of the platform (otherwise it is dead data,
 *                most likely a typo that protects nothing);
 *     sorted     the plain lists are sorted, so a diff of the table reads as what changed;
 *     names      our own domain and the fold of our name are spec.config.json's `apexDomain` and
 *                `org`, so renaming either is still one edit plus a test run;
 *     copies     the `platform` enums of contributor-page-settings.v1 and contributor-page.v1 are the
 *                table's social and sponsorship ids, in table order (the schemas are self-contained,
 *                so each carries a copy, as the category enums do).
 *
 *   GOLDEN
 *     pin        `tableSha256` is the SHA-256 of the table's bytes: the cases were run against this
 *                table, and an implementation compares the pin with the table it vendors;
 *     answers    every case, run through the steps of schemas/link-platforms.v1.json by
 *                scripts/lib/link-rules.mjs, gets exactly its `expect`;
 *     codes      every refusal is a `$defs.refusalCode` of link-platforms.v1;
 *     hostile    the link cases and the website cases each refuse an IDN look-alike, `javascript:`,
 *                `data:`, userinfo, a port and a path traversal;
 *     coverage   every typed platform has an accepted and a refused case, and every form an accepted
 *                one;
 *     stored     every accepted answer is a valid stored link of contributor-page-settings.v1 and a
 *                valid published link of contributor-page.v1 — so the table can never produce what
 *                the two contracts refuse.
 *
 * Every rule is proved able to fail before the table is trusted to pass: the self-test breaks a copy
 * once per rule and requires that rule, by name, to fire.
 *
 * Run: node scripts/check-link-rules.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, config, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';
import { parseLink, parseWebsite } from './lib/link-rules.mjs';

const cfg = config();
const TABLE_FILE = 'link-platforms.v1.example.json';
const GOLDEN_FILE = 'link-rules.v1.golden.json';
const REQUIRED_TAGS = ['idn', 'javascript', 'data', 'userinfo', 'port', 'path-traversal'];
const OPERATOR_ADDED = ['discord', 'matrix', 'twitch', 'reddit', 'telegram'];
const SPONSORSHIP_PLATFORMS = 8;

const { ajv, schemas } = createValidatorWithAllSchemas();
const schemaJson = (file) => schemas.find((s) => s.file === file)?.json;
const def = (file, name) => ajv.getSchema(`${cfg.schemaBaseUrl}/${file}#/$defs/${name}`);

const tableBytes = readFileSync(join(EXAMPLE_DIR, TABLE_FILE));
const realTable = JSON.parse(tableBytes.toString('utf8'));
const realGolden = readJson(join(EXAMPLE_DIR, GOLDEN_FILE));

const sortKeys = (value) =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortKeys(value[key])]))
    : value;
const same = (a, b) => JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
const isSorted = (list) => list.every((item, i) => i === 0 || list[i - 1] < item);
const hostOf = (template) => template.slice('https://'.length, template.indexOf('/', 'https://'.length));
const captures = (source) => (source ?? '').includes('(?<h>');

function compiles(source) {
  try {
    new RegExp(source, 'u');
    return true;
  } catch {
    return false;
  }
}

/** Every rule over the table, as [rule, message] pairs. */
function tableProblems(table) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/${TABLE_FILE}: ${message}`]);
  const platforms = table.platforms ?? [];

  const ids = platforms.map((p) => p.id);
  if (new Set(ids).size !== ids.length) add('ids', 'platform ids are not unique');
  for (const p of platforms) {
    const formIds = p.forms.map((f) => f.id);
    if (new Set(formIds).size !== formIds.length) add('ids', `${p.id}: form ids are not unique`);
  }

  const verified = platforms.filter((p) => p.kind === 'verified');
  if (verified.length !== 1 || verified[0].id !== 'github' || verified[0].typed !== false) {
    add('kinds', 'exactly one platform is `verified`, and it is GitHub, never typed (D116 dated note of ~09:40Z: only the GitHub login is verified)');
  }
  const sponsorship = platforms.filter((p) => p.kind === 'sponsorship');
  if (sponsorship.length !== SPONSORSHIP_PLATFORMS) {
    add('kinds', `${sponsorship.length} sponsorship platforms; the D116 dated note of ~09:40Z rules our own buttons for eight`);
  }
  const social = platforms.filter((p) => p.kind === 'social').map((p) => p.id);
  for (const id of OPERATOR_ADDED.filter((id) => !social.includes(id))) {
    add('kinds', `the social platform ${id} is missing; the operator added Discord, Matrix, Twitch, Reddit and Telegram (D116 dated note of ~09:40Z)`);
  }

  const patterns = [['pipeline.urlCharacters', table.pipeline.urlCharacters], ['pipeline.outputPattern', table.pipeline.outputPattern]];
  for (const p of platforms) {
    for (const [i, source] of (p.hostPatterns ?? []).entries()) {
      patterns.push([`${p.id}.hostPatterns[${i}]`, source]);
      if (source.includes('(?<')) add('regex', `${p.id}.hostPatterns[${i}] captures; only a match rule's hostPattern may`);
    }
    for (const [i, refused] of (p.refusedPaths ?? []).entries()) patterns.push([`${p.id}.refusedPaths[${i}]`, refused.pattern]);
    for (const form of p.forms) {
      patterns.push([`${p.id}.${form.id}.handle`, form.handle]);
      if (form.handle.includes('(?<') || /\((?!\?)/.test(form.handle)) add('regex', `${p.id}.${form.id}.handle has a capturing group; a grammar captures nothing`);
      for (const [i, rule] of (form.match ?? []).entries()) {
        for (const key of ['hostPattern', 'path', 'fragment']) if (rule[key]) patterns.push([`${p.id}.${form.id}.match[${i}].${key}`, rule[key]]);
        const sources = [captures(rule.hostPattern), captures(rule.path), rule.query !== undefined, captures(rule.fragment)].filter(Boolean).length;
        if (sources !== 1) add('regex', `${p.id}.${form.id}.match[${i}] has ${sources} sources for its candidate; exactly one is the rule`);
        for (const host of rule.hosts ?? []) {
          if (!(p.hosts ?? []).includes(host)) add('hosts', `${p.id}.${form.id}.match[${i}] names ${host}, which is not among the platform's hosts`);
        }
      }
    }
  }
  for (const [where, source] of patterns) if (!compiles(source)) add('regex', `${where} does not compile as an ECMAScript pattern with the u flag`);

  for (const p of platforms) {
    for (const form of p.forms) {
      const host = hostOf(form.output);
      if (p.typed === false) continue;
      const admitted = host === '{instance}' ? p.hostsFrom === 'mastodonInstances' : (p.hosts ?? []).includes(host);
      if (!admitted) add('hosts', `${p.id}.${form.id}: the template's host ${host} is not one the platform admits, so its own output would be refused`);
    }
    for (const word of p.reserved ?? []) {
      const possible = p.forms.some((form) => {
        const h = form.fold === 'upper' ? word.toUpperCase() : word;
        return new RegExp(form.handle, 'u').test(h);
      });
      if (!possible) add('reserved', `${p.id}: the reserved word "${word}" is no handle any form admits, so reserving it protects nothing`);
    }
  }

  const lists = [
    ['pipeline.refusedSchemes', table.pipeline.refusedSchemes],
    ['refusedTlds', table.refusedTlds],
    ['mastodonInstances', table.mastodonInstances],
    ['website.redirectors', table.website.redirectors],
    ['website.displayScripts', table.website.displayScripts],
    ['text.nameTokens', table.text.nameTokens],
    ['reservedLogins', table.reservedLogins],
    ...platforms.map((p) => [`${p.id}.reserved`, p.reserved ?? []])
  ];
  for (const [where, list] of lists) if (!isSorted(list)) add('sorted', `${where} is not sorted`);

  if (!table.website.ownDomains.includes(cfg.apexDomain)) add('names', `website.ownDomains does not hold spec.config.json's apexDomain ${cfg.apexDomain}`);
  if (table.text.skeletonTerm !== cfg.org) add('names', `text.skeletonTerm is ${table.text.skeletonTerm}, spec.config.json's org is ${cfg.org}`);

  const copies = [
    ['contributor-page-settings.v1.json', 'socialPlatform', social],
    ['contributor-page-settings.v1.json', 'sponsorPlatform', sponsorship.map((p) => p.id)],
    ['contributor-page.v1.json', 'socialPlatform', social],
    ['contributor-page.v1.json', 'sponsorPlatform', sponsorship.map((p) => p.id)]
  ];
  for (const [file, name, expected] of copies) {
    const values = schemaJson(file)?.$defs?.[name]?.enum;
    if (!Array.isArray(values) || values.join(',') !== expected.join(',')) {
      add('copies', `schemas/${file} $defs.${name} (${values?.join(', ')}) is not the table's ${name === 'socialPlatform' ? 'social' : 'sponsorship'} ids in table order (${expected.join(', ')})`);
    }
  }
  return found;
}

const refusalCodes = schemaJson('link-platforms.v1.json')?.$defs?.refusalCode?.enum ?? [];
const validators = {
  settingsLink: def('contributor-page-settings.v1.json', 'link'),
  settingsSponsor: def('contributor-page-settings.v1.json', 'sponsor'),
  settingsWebsite: def('contributor-page-settings.v1.json', 'websiteUrl'),
  pageLinks: def('contributor-page.v1.json', 'linksSection'),
  pageSponsors: def('contributor-page.v1.json', 'sponsorsSection')
};

/** Every rule over the golden file, as [rule, message] pairs. */
function goldenProblems(table, golden, bytes) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/${GOLDEN_FILE}: ${message}`]);

  const digest = createHash('sha256').update(bytes).digest('hex');
  if (golden.tableSha256 !== digest) {
    add('pin', `tableSha256 is ${golden.tableSha256}, the table's bytes hash to ${digest}: run the cases against this table and re-pin`);
  }

  const seen = new Set();
  const byPlatform = new Map();
  const tagged = { link: new Set(), website: new Set() };
  const all = [...(golden.cases ?? []).map((c) => ['link', c]), ...(golden.websiteCases ?? []).map((c) => ['website', c])];
  if (all.length === 0) add('answers', 'no cases — this gate would pass vacuously');

  for (const [kind, c] of all) {
    if (seen.has(c.id)) add('answers', `${c.id} appears twice`);
    seen.add(c.id);
    if (!/^[LW][0-9]{3}$/.test(c.id ?? '') || (kind === 'link') !== c.id.startsWith('L')) add('answers', `${c.id}: ids are L### for link cases and W### for website cases`);

    const got = kind === 'link' ? parseLink(table, c.platform, c.input) : parseWebsite(table, c.input);
    if (!same(got, c.expect)) {
      add('answers', `${c.id} (${kind === 'link' ? c.platform : 'website'} ${JSON.stringify(c.input)}): expects ${JSON.stringify(c.expect)}, the table's steps answer ${JSON.stringify(got)}`);
    }
    const refused = c.expect?.refused;
    if (refused !== undefined && !refusalCodes.includes(refused)) add('codes', `${c.id}: ${JSON.stringify(refused)} is not a refusal code of link-platforms.v1`);
    if (refused !== undefined) for (const tag of c.tags ?? []) tagged[kind].add(tag);

    if (kind === 'link') {
      const entry = byPlatform.get(c.platform) ?? { accepted: new Set(), refused: 0 };
      if (refused === undefined) entry.accepted.add(c.expect.form);
      else entry.refused += 1;
      byPlatform.set(c.platform, entry);
      if (refused === undefined) {
        const platform = table.platforms.find((p) => p.id === c.platform);
        const stored = { platform: c.platform, form: c.expect.form, handle: c.expect.handle };
        if (c.expect.instance !== undefined) stored.instance = c.expect.instance;
        const sponsor = platform?.kind === 'sponsorship';
        const storedOk = (sponsor ? validators.settingsSponsor : validators.settingsLink)?.(stored);
        const section = sponsor ? { id: 'sponsors', items: [{ ...stored, url: c.expect.url }] } : { id: 'links', items: [{ ...stored, url: c.expect.url }] };
        const publishedOk = (sponsor ? validators.pageSponsors : validators.pageLinks)?.(section);
        if (!storedOk) add('stored', `${c.id}: the answer is not a valid stored link of contributor-page-settings.v1`);
        if (!publishedOk) add('stored', `${c.id}: the answer is not a valid published link of contributor-page.v1`);
      }
    } else if (refused === undefined && !validators.settingsWebsite?.(c.expect.url)) {
      add('stored', `${c.id}: ${c.expect.url} is not a website address contributor-page-settings.v1 admits`);
    }
  }

  for (const kind of ['link', 'website']) {
    for (const tag of REQUIRED_TAGS.filter((t) => !tagged[kind].has(t))) {
      add('hostile', `no refused ${kind} case is tagged ${tag}; each hostile class (${REQUIRED_TAGS.join(', ')}) is refused in both`);
    }
  }
  for (const platform of table.platforms) {
    if (platform.typed === false) continue;
    const entry = byPlatform.get(platform.id);
    if (!entry || entry.accepted.size === 0 || entry.refused === 0) add('coverage', `${platform.id} needs an accepted and a refused case`);
    for (const form of platform.forms) if (!entry?.accepted.has(form.id)) add('coverage', `${platform.id}.${form.id} has no accepted case`);
  }
  return found;
}

/* ------------------------------------------------------------------------ self-test */

const clone = (value) => structuredClone(value);
const SELF_TEST = [
  ['ids', (t) => { t.platforms[2].id = t.platforms[1].id; }],
  ['kinds', (t) => { t.platforms = t.platforms.filter((p) => p.id !== 'polar'); }],
  ['kinds', (t) => { t.platforms = t.platforms.filter((p) => p.id !== 'matrix'); }],
  ['regex', (t) => { t.platforms.find((p) => p.id === 'x').forms[0].handle = '^(?<h>[A-Za-z0-9_]{1,15})$'; }],
  ['regex', (t) => { t.platforms.find((p) => p.id === 'x').forms[0].match[0].path = '^/[^/]+/?$'; }],
  ['hosts', (t) => { t.platforms.find((p) => p.id === 'linkedin').forms[0].output = 'https://lnkd.in/{h}'; }],
  ['reserved', (t) => { t.platforms.find((p) => p.id === 'x').reserved.push('not-a-handle'); }],
  ['sorted', (t) => { t.mastodonInstances.reverse(); }],
  ['names', (t) => { t.website.ownDomains = ['example.org']; }],
  ['copies', (t) => { t.platforms.find((p) => p.id === 'reddit').id = 'lemmy'; }]
];
const GOLDEN_SELF_TEST = [
  ['pin', (t, g) => { g.tableSha256 = '0'.repeat(64); }],
  ['answers', (t) => { t.platforms.find((p) => p.id === 'linkedin').reserved = ['alice-example']; }],
  ['answers', (t, g) => { g.cases[0].expect = { refused: 'host_not_allowed' }; }],
  ['codes', (t, g) => { g.websiteCases.find((c) => c.expect.refused === 'redirector').expect.refused = 'shortener'; }],
  ['hostile', (t, g) => { for (const c of g.cases) c.tags = (c.tags ?? []).filter((tag) => tag !== 'idn'); }],
  ['coverage', (t, g) => { g.cases = g.cases.filter((c) => c.platform !== 'polar'); }],
  ['stored', (t, g) => {
    const p = t.platforms.find((x) => x.id === 'gitlab');
    p.forms[0].handle = '^[A-Za-z0-9_:]{1,64}$';
    g.cases.push({ id: 'L999', platform: 'gitlab', input: 'alice:dev', expect: { form: 'profile', handle: 'alice:dev', url: 'https://gitlab.com/alice:dev' } });
  }]
];

function selfTest() {
  const problems = [];
  for (const [rule, breakIt] of SELF_TEST) {
    const table = clone(realTable);
    breakIt(table);
    if (!tableProblems(table).some(([fired]) => fired === rule)) problems.push(`self-test: breaking the table for rule "${rule}" was not caught`);
  }
  for (const [rule, breakIt] of GOLDEN_SELF_TEST) {
    const table = clone(realTable);
    const golden = clone(realGolden);
    breakIt(table, golden);
    if (!goldenProblems(table, golden, tableBytes).some(([fired]) => fired === rule)) problems.push(`self-test: breaking the golden cases for rule "${rule}" was not caught`);
  }
  return problems;
}

const selfTestProblems = selfTest();
if (selfTestProblems.length > 0) fail(selfTestProblems, '');

const problems = [...tableProblems(realTable), ...goldenProblems(realTable, realGolden, tableBytes)].map(([, message]) => message);
const accepted = [...realGolden.cases, ...realGolden.websiteCases].filter((c) => c.expect.refused === undefined).length;
fail(
  problems,
  `the link table holds its rules (${realTable.platforms.length} platforms, ${realTable.mastodonInstances.length} Mastodon instances; SHA-256 ${createHash('sha256').update(tableBytes).digest('hex')}), ` +
    `and its steps give all ${realGolden.cases.length + realGolden.websiteCases.length} golden answers (${accepted} accepted, the rest refused); every rule proved able to fail`,
);

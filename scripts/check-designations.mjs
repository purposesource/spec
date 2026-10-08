#!/usr/bin/env node
/**
 * Gate: the designations' publication in summary keeps the arithmetic and the floor its two
 * contracts promise, and the contracts still refuse what they must.
 *
 * `repo-record.v1` publishes a repository's own designation (`designation`, no floor) and its
 * contributors' designations in summary (`contributorDesignations`, from 5 designators);
 * `designations-summary.v1` publishes the registry-wide totals for a month (ops decisions D117 §6
 * and D121 item 1; statutes Art. 8(4); Calculation Rules Nr. 25 and Nr. 26). JSON Schema can say
 * that a member exists and has the right shape; it cannot say that shares sum to 100, that a list
 * is ordered by them, or that a mean has one decimal. The descriptions promise those, so this
 * gate holds the examples to them:
 *
 *   THE PROJECT'S DESIGNATION (`examples/repo-record.v1*.example.json`)
 *     hundred    `categories` and `association` make exactly 100, and no category is at 0;
 *     month      `effectiveFrom` is not later than the record's month (the UTC month of
 *                `generatedAt`);
 *     derived    `impactCategoryDefaults` is the slugs above 0, largest share first, ties in the
 *                statutes' menu order — present whenever `designation` is.
 *
 *   THE CONTRIBUTORS' SUMMARY (`examples/repo-record.v1*.example.json`)
 *     floor      `designators` is at least 5 (D121 item 1);
 *     decimal    every mean carries at most one decimal and is a mean the stated rounding can
 *                give: some whole total T from 0 to 100 × n rounds to it;
 *     hundred    the means make 100 within rounding: within 100 ± 0.05 × (the number of members).
 *
 *   THE MONTHLY SUMMARY (`examples/designations-summary.v1*.example.json`)
 *     month      `month` is the first seven characters of `generatedAt`;
 *     hundred    in each half, the totals sum to exactly 100 × `designations`;
 *     floor      a `contributors` half counts at least 5 designations, and at least one example
 *                shows the half absent.
 *
 *   THE ROUNDING RULE ITSELF is self-tested on worked vectors (halves round up, in integers), so
 *   the formula the descriptions print and the one this gate applies cannot drift apart.
 *
 *   REFUSALS. Each contract still refuses, by its own keywords: a contributors' summary below the
 *   floor (4 designators; 5 and 6 are admitted — the boundary on both sides), a member that could
 *   carry a person (`holders`, `designatorIds`, `repositories`), a category at 0 in a project's
 *   designation, a slug off the menu, and a monthly summary labelled `registry-v0`.
 *
 * Run: node scripts/check-designations.mjs
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv } = createValidatorWithAllSchemas();
const recordSchema = ajv.getSchema(`${BASE}/repo-record.v1.json`);
const summarySchema = ajv.getSchema(`${BASE}/designations-summary.v1.json`);
if (!recordSchema || !summarySchema) {
  fail(['repo-record.v1 or designations-summary.v1 did not resolve by $id'], '');
}

/** The statutes' order (Art. 7), the menu's order: ties in `impactCategoryDefaults` follow it. */
const MENU_ORDER = ['health', 'education', 'poverty-relief', 'humanitarian-aid', 'environment', 'animal-welfare', 'research'];

/** The published rounding: one decimal, halves up, in integers. Returns tenths. */
function meanTenths(total, n) {
  return Math.floor((20 * total + n) / (2 * n));
}

const sum = (values) => values.reduce((a, b) => a + b, 0);
const monthOf = (instant) => String(instant).slice(0, 7);
const oneDecimal = (value) => Number.isFinite(value) && Math.abs(Math.round(value * 10) - value * 10) < 1e-9;

/* ------------------------------------------------------------- the rounding, self-tested */

const VECTORS = [
  // [total, n, tenths]
  [300, 7, 429], // 42.857… → 42.9
  [200, 7, 286], // 28.571… → 28.6
  [9, 4, 23], // 2.25 → 2.3: a half rounds up
  [3, 60, 1], // 0.05 → 0.1: a half rounds up
  [1, 30, 0], // 0.033… → 0.0: a member can read 0.0
  [500, 5, 1000], // 100 → 100.0
  [0, 5, 0],
  [250, 6, 417], // 41.666… → 41.7
];
for (const [total, n, tenths] of VECTORS) {
  const got = meanTenths(total, n);
  if (got !== tenths) problems.push(`self-test: the rounding gives ${got} tenths for ${total} over ${n}, the rule ${tenths}`);
}

/* -------------------------------------------------------------------------- the records */

const exampleFiles = readdirSync(EXAMPLE_DIR).filter((name) => /\.example\.json$/.test(name));
const recordFiles = exampleFiles.filter((name) => name.startsWith('repo-record.v1.'));
const summaryFiles = exampleFiles.filter((name) => name.startsWith('designations-summary.v1.'));

let designations = 0;
let contributorSummaries = 0;
for (const name of recordFiles) {
  const at = `examples/${name}`;
  const doc = readJson(join(EXAMPLE_DIR, name));
  const d = doc.designation;
  if (d) {
    designations += 1;
    const shares = Object.values(d.categories ?? {});
    if (sum(shares) + d.association !== 100) problems.push(`${at}: designation's categories and association make ${sum(shares) + d.association}, not 100`);
    if (shares.some((s) => s === 0)) problems.push(`${at}: designation carries a category at 0; a share of 0 is no member`);
    if (d.effectiveFrom > monthOf(doc.generatedAt)) problems.push(`${at}: designation.effectiveFrom ${d.effectiveFrom} is later than the record's month ${monthOf(doc.generatedAt)}`);
    const derived = Object.entries(d.categories ?? {})
      .filter(([, share]) => share > 0)
      .sort(([a, x], [b, y]) => y - x || MENU_ORDER.indexOf(a) - MENU_ORDER.indexOf(b))
      .map(([slug]) => slug);
    if (JSON.stringify(doc.impactCategoryDefaults) !== JSON.stringify(derived)) {
      problems.push(`${at}: impactCategoryDefaults ${JSON.stringify(doc.impactCategoryDefaults)} is not the designation's slugs above 0, largest share first, ties in menu order (${JSON.stringify(derived)})`);
    }
  }
  const c = doc.contributorDesignations;
  if (c) {
    contributorSummaries += 1;
    const n = c.designators;
    if (!(Number.isInteger(n) && n >= 5)) problems.push(`${at}: contributorDesignations.designators ${n} is below the floor of 5 (D121 item 1)`);
    const members = [...Object.entries(c.categories ?? {}), ['association', c.association]];
    for (const [member, value] of members) {
      if (!oneDecimal(value)) {
        problems.push(`${at}: contributorDesignations ${member} ${value} carries more than one decimal`);
        continue;
      }
      const tenths = Math.round(value * 10);
      let reachable = false;
      for (let total = 0; total <= 100 * n && !reachable; total += 1) reachable = meanTenths(total, n) === tenths;
      if (!reachable) problems.push(`${at}: contributorDesignations ${member} ${value} is no mean of whole percents over ${n} designators under the published rounding`);
    }
    const tenthsSum = sum(members.map(([, value]) => Math.round(value * 10)));
    if (Math.abs(tenthsSum - 1000) > members.length * 0.5) {
      problems.push(`${at}: contributorDesignations' members sum to ${tenthsSum / 10}, outside 100 ± 0.05 × ${members.length}`);
    }
  }
}
if (designations === 0) problems.push('no repo-record.v1 example carries `designation` — this gate would pass vacuously');
if (contributorSummaries === 0) problems.push('no repo-record.v1 example carries `contributorDesignations` — this gate would pass vacuously');

/* ------------------------------------------------------------------ the monthly summary */

let withContributors = 0;
let withoutContributors = 0;
for (const name of summaryFiles) {
  const at = `examples/${name}`;
  const doc = readJson(join(EXAMPLE_DIR, name));
  if (doc.month !== monthOf(doc.generatedAt)) problems.push(`${at}: month ${doc.month} is not the month of generatedAt ${doc.generatedAt}`);
  for (const half of ['projects', 'contributors']) {
    const t = doc[half];
    if (!t) continue;
    const total = sum(Object.values(t.categories ?? {})) + t.association;
    if (total !== 100 * t.designations) problems.push(`${at}: ${half}' totals sum to ${total}, not 100 × ${t.designations}`);
  }
  if (doc.contributors) {
    withContributors += 1;
    if (doc.contributors.designations < 5) problems.push(`${at}: contributors counts ${doc.contributors.designations} designations, below the floor`);
  } else {
    withoutContributors += 1;
  }
}
if (withContributors === 0) problems.push('no designations-summary.v1 example shows the contributors\' half');
if (withoutContributors === 0) problems.push('no designations-summary.v1 example shows the contributors\' half absent below the floor');

/* --------------------------------------------------------------------------- refusals */

const record = readJson(join(EXAMPLE_DIR, 'repo-record.v1.example.json'));
const summary = readJson(join(EXAMPLE_DIR, 'designations-summary.v1.example.json'));
const clone = (doc) => JSON.parse(JSON.stringify(doc));
const withRecord = (edit) => {
  const doc = clone(record);
  edit(doc);
  return doc;
};
const withSummary = (edit) => {
  const doc = clone(summary);
  edit(doc);
  return doc;
};

const mustRefuse = [
  ['repo-record.v1', recordSchema, 'a contributors\' summary of 4 designators (N − 1)', withRecord((d) => { d.contributorDesignations.designators = 4; })],
  ['repo-record.v1', recordSchema, 'a contributors\' summary naming holders', withRecord((d) => { d.contributorDesignations.holders = ['MDQ6VXNlcjE=']; })],
  ['repo-record.v1', recordSchema, 'a contributors\' summary with designator ids', withRecord((d) => { d.contributorDesignations.designatorIds = ['U_kgDOAbc001']; })],
  ['repo-record.v1', recordSchema, 'a project designation with a category at 0', withRecord((d) => { d.designation.categories.health = 0; })],
  ['repo-record.v1', recordSchema, 'a project designation naming a slug off the menu', withRecord((d) => { d.designation.categories['space-exploration'] = 10; })],
  ['repo-record.v1', recordSchema, 'a project designation naming who saved it', withRecord((d) => { d.designation.setBy = 'acme-admin'; })],
  ['repo-record.v1', recordSchema, 'a contributors\' mean above 100', withRecord((d) => { d.contributorDesignations.association = 100.1; })],
  ['designations-summary.v1', summarySchema, 'a contributors\' half of 4 designations', withSummary((d) => { d.contributors.designations = 4; })],
  ['designations-summary.v1', summarySchema, 'a half naming its repositories', withSummary((d) => { d.contributors.repositories = ['R_kgDOAbc123']; })],
  ['designations-summary.v1', summarySchema, 'a published count of distinct designators', withSummary((d) => { d.designators = 9; })],
  ['designations-summary.v1', summarySchema, 'a category total of 0', withSummary((d) => { d.projects.categories.research = 0; })],
  ['designations-summary.v1', summarySchema, 'the source registry-v0', withSummary((d) => { d.source = 'registry-v0'; })],
  ['designations-summary.v1', summarySchema, 'no projects half', withSummary((d) => { delete d.projects; })],
];
for (const [key, validate, what, doc] of mustRefuse) {
  if (validate(doc)) problems.push(`${key}: admits ${what}`);
}

const mustAdmit = [
  ['repo-record.v1', recordSchema, 'a contributors\' summary of 5 designators (N)', withRecord((d) => { d.contributorDesignations.designators = 5; })],
  ['repo-record.v1', recordSchema, 'a contributors\' summary of 6 designators (N + 1)', withRecord((d) => { d.contributorDesignations.designators = 6; })],
  ['repo-record.v1', recordSchema, 'a record with no contributors\' summary (below the floor)', withRecord((d) => { delete d.contributorDesignations; })],
  ['repo-record.v1', recordSchema, 'a designation leaving everything to the Association, with `[]` derived', withRecord((d) => {
    d.designation.categories = {};
    d.designation.association = 100;
    d.impactCategoryDefaults = [];
  })],
  ['designations-summary.v1', summarySchema, 'a month with no designation of either kind', withSummary((d) => {
    d.projects = { designations: 0, categories: {}, association: 0 };
    delete d.contributors;
  })],
];
for (const [key, validate, what, doc] of mustAdmit) {
  if (!validate(doc)) problems.push(`${key}: refuses ${what} — ${JSON.stringify(validate.errors?.[0] ?? {})}`);
}

fail(
  problems,
  `designations: ${designations} project designation(s) make 100 and derive their slug list, ${contributorSummaries} contributors' summar${contributorSummaries === 1 ? 'y keeps' : 'ies keep'} ` +
    `the floor and the rounding, ${summaryFiles.length} monthly summar${summaryFiles.length === 1 ? 'y keeps' : 'ies keep'} its totals (${withoutContributors} below the floor), ` +
    `${VECTORS.length} rounding vectors hold, and ${mustRefuse.length} refusals and ${mustAdmit.length} admissions stand`,
);

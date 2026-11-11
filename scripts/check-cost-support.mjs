#!/usr/bin/env node
/**
 * Gate: a cost-support document's arithmetic holds in every example, and a month whose pool is below 0 is refused when it
 * is carried wrong (`cost-support.v1` 1.8.0, `ledger-row.v1` 1.7.0).
 *
 * JSON Schema cannot say that a total is the sum of its array or that one member is a sum of others. `cost-support.v1`
 * states those identities in its description, as THE ARITHMETIC A READER CHECKS, so this gate holds every example to them:
 *
 *   identity (1)       `chargedToFeesMinor` = max(0, `directCostsTotalMinor` − `supportTotalMinor` −
 *                      `reserveAdvanceTotalMinor`) + `deferredChargesTotalMinor`;
 *   identity (2)       `supportTotalMinor` + `reserveAdvanceTotalMinor` ≤ `directCostsTotalMinor`;
 *   identity (3)       `passedOnMinor` = `purposeFeesNetMinor` + `poolCarryInMinor` − `poolCarryOutMinor` −
 *                      `chargedToFeesMinor` − `reserveRetentionMinor` + `interestMinor` (− `hardshipPayMinor` on a document
 *                      that still carries the struck member);
 *   identity (5)       each total is the sum of its array;
 *   identity (6)       where `payouts[]` is present, `purposeFeesNetMinor` is Σ (`netMinor` − `heldMinor`), and each
 *                      `transferDueBy` is `creditedOn` plus `deadlineDays` days;
 *   identity (10)      the pool is `purposeFeesNetMinor` + `poolCarryInMinor`; `poolCarryOutMinor` is that pool where it is
 *                      below 0 and absent otherwise; charges and retention never exceed max(0, pool);
 *   across documents   an example that carries a pool in (`poolCarryInMinor`) has an example of the calendar month before
 *                      whose `poolCarryOutMinor` is the same figure.
 *
 * Identity (4), the month's transfers, is `check:transfers`'. The year's cap is not tested here: after a month whose pool is
 * below 0 a month that charges nothing may stand above the cap of the year so far, which is a fact of the year and never a
 * failure of that month (`yearRunningTotalMinor`). Identities (7) to (9), the reserve's own currency (1.7.0), are not tested
 * here either.
 *
 * PLANTS. Each planted document changes the January or February 2028 example in one way and must be refused by the rule
 * named beside it: the schema's own keyword, found by the conditional it sits in, or one of the identities above. A plant
 * may break a second rule too; the gate fails when the named one is not among those that refuse it. The `pool-carry` row
 * example is held the same way to its 1.7.0 conditional, and its `rowHash` recomputes from the row and its stated
 * `prevHash` (FS07-040: SHA-256 of `prevHash` and the RFC 8785 text of the row without its two chain members). Two
 * admissions stand beside them, a month below 0 that passes its interest on alone and a month that carries a pool in and
 * stays below 0, which carries its whole pool on; and February read with no carry must break identity (3), so the identity
 * is shown to count the carry.
 *
 * Run: node scripts/check-cost-support.mjs
 */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv } = createValidatorWithAllSchemas();
const costSchema = ajv.getSchema(`${BASE}/cost-support.v1.json`);
const rowSchema = ajv.getSchema(`${BASE}/ledger-row.v1.json`);
if (!costSchema || !rowSchema) {
  fail(['cost-support.v1 or ledger-row.v1 did not resolve by $id'], '');
}

/* ------------------------------------------------------------------------ the rules, by name */

/** The index in `allOf` of the one conditional `test` finds, so a reordered `allOf` still names the same rule. */
const conditionalAt = (schema, what, test) => {
  const found = schema.allOf.map((c, i) => (test(c) ? i : -1)).filter((i) => i >= 0);
  if (found.length !== 1) fail([`${what}: ${found.length} conditionals match, where exactly one was expected`], '');
  return found[0];
};
const sameJson = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const COST_CONDITIONALS = [
  ['the first conditional', conditionalAt(costSchema.schema, 'cost-support.v1', (c) => sameJson(c.if, { required: ['poolCarryOutMinor'] }))],
  ['the second conditional', conditionalAt(costSchema.schema, 'cost-support.v1', (c) => sameJson(c.if, { required: ['poolCarryInMinor'] }))],
  ['the third conditional', conditionalAt(costSchema.schema, 'cost-support.v1', (c) => c.if?.properties?.purposeFeesNetMinor?.exclusiveMaximum === 0)],
];
const ROW_CONDITIONALS = [
  ['the 1.7.0 conditional', conditionalAt(rowSchema.schema, 'ledger-row.v1', (c) => c.if?.properties?.type?.const === 'pool-carry')],
];

/** What the schema refuses in `doc`, each error named by the conditional it sits in, or by its keyword. */
const schemaRules = (validate, doc, conditionals) => {
  if (validate(doc)) return [];
  return validate.errors.map((e) => {
    const detail = `${e.instancePath || '/'} ${e.message}`;
    for (const [rule, index] of conditionals) {
      if (e.schemaPath.startsWith(`#/allOf/${index}/`)) return { rule, detail };
    }
    if (e.keyword === 'minimum') return { rule: "the schema's minimum", detail };
    return { rule: `the schema (${e.keyword})`, detail };
  });
};

const value = (v) => (typeof v === 'number' ? v : 0);
const total = (items, member) => (items ?? []).reduce((sum, item) => sum + value(item[member]), 0);
const addDays = (day, days) => new Date(Date.parse(`${day}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

/** The identities (1), (2), (3), (5), (6) and (10) that `doc` breaks, each by its number. */
const identityRules = (doc) => {
  const found = [];
  const say = (rule, detail) => found.push({ rule, detail });
  const costs = doc.directCostsTotalMinor;
  const support = doc.supportTotalMinor;
  const advanced = value(doc.reserveAdvanceTotalMinor);
  const deferred = value(doc.deferredChargesTotalMinor);
  const fees = doc.purposeFeesNetMinor;
  const carryIn = value(doc.poolCarryInMinor);
  const carryOut = value(doc.poolCarryOutMinor);
  const charged = doc.chargedToFeesMinor;
  const retained = doc.reserveRetentionMinor;

  const wantCharged = Math.max(0, costs - support - advanced) + deferred;
  if (charged !== wantCharged) {
    say('identity (1)', `chargedToFeesMinor is ${charged}, where max(0, ${costs} − ${support} − ${advanced}) + ${deferred} is ${wantCharged}`);
  }
  if (support + advanced > costs) {
    say('identity (2)', `supportTotalMinor ${support} + reserveAdvanceTotalMinor ${advanced} is more than directCostsTotalMinor ${costs}`);
  }
  const wantPassed = fees + carryIn - carryOut - charged - retained + value(doc.interestMinor) - value(doc.hardshipPayMinor);
  if (doc.passedOnMinor !== wantPassed) {
    say('identity (3)', `passedOnMinor is ${doc.passedOnMinor}, where ${fees} + ${carryIn} − ${carryOut} − ${charged} − ${retained} + ${value(doc.interestMinor)} is ${wantPassed}`);
  }
  const sums = [
    ['directCostsTotalMinor', costs, total(doc.directCosts, 'amountMinor')],
    ['supportTotalMinor', support, total(doc.supporters, 'amountMinor')],
    ['reserveAdvanceTotalMinor', advanced, total(doc.directCosts, 'reserveAdvanceMinor')],
    ['deferredChargesTotalMinor', deferred, total(doc.deferredCharges, 'amountMinor')],
  ];
  for (const [member, written, summed] of sums) {
    if (written !== summed) say('identity (5)', `${member} is ${written}, where its array sums to ${summed}`);
  }
  if (Array.isArray(doc.payouts)) {
    const summed = doc.payouts.reduce((sum, p) => sum + p.netMinor - value(p.heldMinor), 0);
    if (fees !== summed) say('identity (6)', `purposeFeesNetMinor is ${fees}, where Σ (netMinor − heldMinor) is ${summed}`);
    for (const p of doc.payouts) {
      const due = addDays(p.creditedOn, p.deadlineDays);
      if (p.transferDueBy !== due) say('identity (6)', `${p.payoutRef}'s transferDueBy is ${p.transferDueBy}, where ${p.creditedOn} + ${p.deadlineDays} days is ${due}`);
    }
  }
  const pool = fees + carryIn;
  if (pool < 0 && doc.poolCarryOutMinor !== pool) {
    say('identity (10)', `the pool is ${pool}, below 0, and poolCarryOutMinor is ${doc.poolCarryOutMinor ?? 'absent'}`);
  }
  if (pool >= 0 && doc.poolCarryOutMinor !== undefined) {
    say('identity (10)', `the pool is ${pool}, not below 0, and poolCarryOutMinor is ${doc.poolCarryOutMinor}`);
  }
  if (charged + retained > Math.max(0, pool)) {
    say('identity (10)', `chargedToFeesMinor + reserveRetentionMinor is ${charged + retained}, more than the pool's max(0, ${pool})`);
  }
  return found;
};

const monthBefore = (month) => {
  const [year, number] = month.split('-').map(Number);
  return number === 1 ? `${year - 1}-12` : `${year}-${String(number - 1).padStart(2, '0')}`;
};

/** An example that carries a pool in, against the examples of the calendar month before. */
const acrossRules = (doc, all) => {
  if (doc.poolCarryInMinor === undefined) return [];
  const before = monthBefore(doc.month);
  const earlier = all.filter((other) => other.month === before);
  if (earlier.length === 0) {
    return [{ rule: 'across documents', detail: `${doc.month} carries ${doc.poolCarryInMinor} in, and no example is of ${before}` }];
  }
  if (!earlier.some((other) => other.poolCarryOutMinor === doc.poolCarryInMinor)) {
    const outs = earlier.map((other) => other.poolCarryOutMinor ?? 'absent').join(', ');
    return [{ rule: 'across documents', detail: `${doc.month} carries ${doc.poolCarryInMinor} in, and ${before}'s poolCarryOutMinor is ${outs}` }];
  }
  return [];
};

const costRules = (doc, all) => [...schemaRules(costSchema, doc, COST_CONDITIONALS), ...identityRules(doc), ...acrossRules(doc, all)];

/* ---------------------------------------------------------------------------- the examples */

const files = readdirSync(EXAMPLE_DIR)
  .filter((name) => name.startsWith('cost-support.v1') && name.endsWith('.example.json'))
  .sort();
const examples = files.map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const docs = examples.map((e) => e.doc);
for (const { name, doc } of examples) {
  for (const { rule, detail } of costRules(doc, docs)) problems.push(`${name}: ${rule}: ${detail}`);
}
const carriedOut = docs.filter((d) => d.poolCarryOutMinor !== undefined).length;
const carriedIn = docs.filter((d) => d.poolCarryInMinor !== undefined).length;

const exampleOf = (month) => {
  const found = examples.filter((e) => e.doc.month === month);
  if (found.length !== 1) fail([`expected exactly one cost-support.v1 example of ${month}, found ${found.length}`], '');
  return found[0].doc;
};
const january = exampleOf('2028-01');
const february = exampleOf('2028-02');
const planted = (base, edit) => {
  const doc = structuredClone(base);
  edit(doc);
  return doc;
};

/* ------------------------------------------------------------------------------ the plants */

const costPlants = [
  ['January with passedOnMinor −21000', "the schema's minimum", planted(january, (d) => { d.passedOnMinor = -21000; })],
  ['January without poolCarryOutMinor', 'the third conditional', planted(january, (d) => { delete d.poolCarryOutMinor; })],
  ['January with chargedToFeesMinor 100', 'the first conditional', planted(january, (d) => { d.chargedToFeesMinor = 100; })],
  ['January with poolCarryOutMinor −20999', 'identity (10)', planted(january, (d) => { d.poolCarryOutMinor = -20999; })],
  ['February with poolCarryInMinor −20999', 'across documents', planted(february, (d) => { d.poolCarryInMinor = -20999; })],
  ['February with passedOnMinor 48088, the carry left out', 'identity (3)', planted(february, (d) => { d.passedOnMinor = 48088; })],
  [
    'February with poolCarryOutMinor −1 beside its pool of 31040, nothing charged or retained',
    'identity (10)',
    planted(february, (d) => {
      d.directCosts = [];
      d.directCostsTotalMinor = 0;
      d.chargedToFeesMinor = 0;
      d.yearRunningTotalMinor = 0;
      d.reserveRetentionMinor = 0;
      d.poolCarryOutMinor = -1;
      d.passedOnMinor = 31041;
    }),
  ],
  [
    'February with 100 of interest and an invoice of 29538 in place of the 2400',
    'identity (10)',
    planted(february, (d) => {
      d.interestMinor = 100;
      d.directCosts[0].amountMinor = 29538;
      d.directCostsTotalMinor = 29538;
      d.chargedToFeesMinor = 29538;
      d.yearRunningTotalMinor = 29538;
      d.passedOnMinor = 50;
      [13, 13, 12, 12].forEach((amount, i) => { d.transfers[i].amountMinor = amount; });
    }),
  ],
];
for (const [what, rule, doc] of costPlants) {
  const refused = costRules(doc, docs);
  if (!refused.some((r) => r.rule === rule)) {
    const named = refused.map((r) => r.rule).join(', ') || 'nothing';
    problems.push(`cost-support.v1: ${what} is not refused by ${rule} (refused by: ${named})`);
  }
}
// The interest plant breaks the bound alone: passed on stays above 0 and every other identity holds.
const interestPlant = costPlants[costPlants.length - 1][2];
if (interestPlant.passedOnMinor <= 0 || costRules(interestPlant, docs).some((r) => r.rule !== 'identity (10)')) {
  problems.push('cost-support.v1: the interest plant breaks more than identity (10)\'s bound, so it proves nothing about it');
}
// The carried-out plant breaks identity (10)'s second half alone: a carry stated beside a pool that is not below 0, which no
// conditional of the schema and no other identity refuses.
const carriedOutPlant = costPlants.find(([what]) => what.startsWith('February with poolCarryOutMinor −1'))[2];
const carriedOutRefusals = costRules(carriedOutPlant, docs);
if (carriedOutRefusals.length !== 1 || !carriedOutRefusals[0].detail.includes('not below 0')) {
  const named = carriedOutRefusals.map((r) => `${r.rule} (${r.detail})`).join('; ') || 'nothing';
  problems.push(`cost-support.v1: the carried-out plant is refused by ${named}, where identity (10)'s second half alone must refuse it`);
}

const costAdmissions = [
  ['January with 40 of interest, passed on alone', planted(january, (d) => { d.interestMinor = 40; d.passedOnMinor = 40; })],
  [
    'a month that carries a pool in and stays below 0 (15000 of its own and the -21000 carried), carrying -6000 on',
    planted(february, (d) => {
      d.purposeFeesNetMinor = 15000;
      d.payouts[0].netMinor = 15000;
      d.directCosts = [];
      d.directCostsTotalMinor = 0;
      d.chargedToFeesMinor = 0;
      d.yearRunningTotalMinor = 0;
      d.reserveRetentionMinor = 0;
      d.reserveRetentionNote = january.reserveRetentionNote;
      d.poolCarryOutMinor = -6000;
      d.passedOnMinor = 0;
      d.transfers = [];
    }),
  ],
];
for (const [what, doc] of costAdmissions) {
  const refused = costRules(doc, docs);
  if (refused.length > 0) problems.push(`cost-support.v1: refuses ${what} (${refused[0].rule}: ${refused[0].detail})`);
}
// February with no carry is no admission of the schema, which the first rule above would refuse: the identities alone
// read it, and identity (3) must refuse its passed-on figure, which counts the carry.
const februaryUncarried = planted(february, (d) => { delete d.poolCarryInMinor; });
if (!identityRules(februaryUncarried).some((r) => r.rule === 'identity (3)')) {
  problems.push('cost-support.v1: February read with no carry keeps identity (3), so the identity does not count the carry');
}

/* ----------------------------------------------------------------------- the pool-carry row */

const jcs = (v) => {
  if (Array.isArray(v)) return `[${v.map(jcs).join(',')}]`;
  if (v !== null && typeof v === 'object') {
    return `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${jcs(v[k])}`).join(',')}}`;
  }
  if (typeof v === 'number' && !Number.isSafeInteger(v)) throw new Error(`not an integer the row can carry: ${v}`);
  return JSON.stringify(v);
};
const row = readJson(join(EXAMPLE_DIR, 'ledger-row.v1.pool-carry.example.json'));
if (row.type !== 'pool-carry') problems.push('ledger-row.v1.pool-carry.example.json: its type is not pool-carry');
if (!rowSchema(row)) problems.push(`ledger-row.v1.pool-carry.example.json: ${JSON.stringify(rowSchema.errors?.[0] ?? {})}`);
const { prevHash, rowHash, ...body } = row;
const recomputed = createHash('sha256').update(prevHash + jcs(body), 'utf8').digest('hex');
if (recomputed !== rowHash) {
  problems.push(`ledger-row.v1.pool-carry.example.json: rowHash ${rowHash} does not recompute from the row and its prevHash (${recomputed})`);
}
if (row.externalKey !== `car:${row.assignedMonth}` || row.assignedMonth !== monthBefore(row.month)) {
  problems.push('ledger-row.v1.pool-carry.example.json: its key is not car: and the calendar month before its own');
}
if (row.assignedAmountMinor !== january.poolCarryOutMinor || february.poolCarryInMinor !== row.assignedAmountMinor) {
  problems.push('ledger-row.v1.pool-carry.example.json: its amount is not January\'s poolCarryOutMinor and February\'s poolCarryInMinor');
}

const rowPlants = [
  ['the pool-carry row with amountMinor −21000', (r) => { r.amountMinor = -21000; }],
  ['the pool-carry row with assignedAmountMinor 0', (r) => { r.assignedAmountMinor = 0; }],
  ['the pool-carry row keyed car:2028-1', (r) => { r.externalKey = 'car:2028-1'; }],
  ['the pool-carry row with a payoutRef', (r) => { r.payoutRef = 'SAMPLE-REMIT-002803'; }],
  ['the pool-carry row with an entId', (r) => { r.entId = 'ent_01kv3w7qrzr32j6ngdr5q9x6b7'; }],
];
for (const [what, edit] of rowPlants) {
  const refused = schemaRules(rowSchema, planted(row, edit), ROW_CONDITIONALS);
  if (!refused.some((r) => r.rule === 'the 1.7.0 conditional')) {
    const named = refused.map((r) => r.rule).join(', ') || 'nothing';
    problems.push(`ledger-row.v1: ${what} is not refused by the 1.7.0 conditional (refused by: ${named})`);
  }
}

fail(
  problems,
  `cost-support: ${examples.length} example(s) keep identities (1) to (3), (5), (6) and (10) (${carriedOut} carrying a pool ` +
    `below 0 out, ${carriedIn} carrying one in, each against the month before's); ${costPlants.length} planted documents are ` +
    `refused by the rule named for each and ${costAdmissions.length} admissions stand; the pool-carry row recomputes its ` +
    `rowHash and ${rowPlants.length} planted rows are refused by its 1.7.0 conditional`,
);

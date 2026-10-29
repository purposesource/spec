#!/usr/bin/env node
/**
 * Gate: the month's transfers record keeps the link and the arithmetic its contract promises, and
 * the contract still refuses what must never be published.
 *
 * `transfers.v1` publishes what became of one locked month's shares, after the transfers happen, and
 * names the month's frozen cost-support document by the SHA-256 of its exact bytes (ops decision D64
 * item 1, the checked register's row 24). JSON Schema cannot compare two documents, hash one or sum
 * across items, so the description states those rules and this gate holds the examples to them:
 *
 *   IDENTITY (4), AS `cost-support.v1` 1.5.0 RESTATES IT: the month's transfers sum to `passedOnMinor` — a document's own
 *   rows where it carries any, and otherwise the rows of the month's transfers record that names its bytes; with no
 *   record published the identity is open, never failed (no transfer of the month has been executed, or the month's
 *   record is withheld), and a month that passed nothing on meets it on its own. Every
 *   cost-support example meets it, and the verdict is held to planted pairs: the document the month lock writes
 *   (`transfers: []`) met through its record, open without one and failed by a record one minor unit short.
 *
 *   THE RECORD (`examples/transfers.v1*.example.json`)
 *     link      `costSupportSha256` is the SHA-256 of the exact bytes of a `cost-support.v1` example of
 *               the same month and currency;
 *     sum       the rows' amounts sum to that document's `passedOnMinor`: `cost-support.v1` identity
 *               (4), which a document the month lock froze (`transfers: []`) meets through this record;
 *               and where the document carries rows of its own, the record has a row for each, with
 *               the same recipient, category and amount;
 *     export    where a `ledger-export.v1` example of the month exists, it names the same document
 *               (`batch.costSupportSha256`) and the same `lockedAt`, its `totals.disbursed` is the sum,
 *               and the record has one row per recipient of its `disburse` rows and no other, with
 *               their summed magnitude, their `categoryFundId`, and an `endToEndId` that starts with
 *               their `note` (and is it, on a first attempt);
 *     rows      one row per recipient, in `recipientId` order; an `endToEndId` names the record's month
 *               and its recipient (the last 12 characters of the ULID); a transfer is not dated before
 *               the day of the lock, nor after the day of the record's own `generatedAt` (Europe/
 *               Zurich); `receiptRef` is the reference of one of the row's receipts; a row names at most
 *               one bank line and each receipt once;
 *     dated     `generatedAt` is never earlier than `lockedAt`;
 *     regen     two records of one month and one link, in `generatedAt` order, are one record
 *               regenerated: the same rows (recipient, category, amount), no receipt withdrawn, a
 *               transfer that goes back to `scheduled` says why in a note, and a transfer that stays
 *               keeps its day and identifier unless a later attempt replaced it.
 *   Each rule is held to planted documents, the ones it must flag and the ones it must pass, so a rule
 *   that stopped matching fails here before the examples are trusted to pass.
 *
 *   REFUSALS. The contract still refuses, by its own keywords and with every `format` keyword removed
 *   too (draft 2020-12 makes `format` an annotation, so a reader's validator may ignore it): every
 *   member that could carry an account, a person or a screening, a status this version does not state
 *   (`held`, `frozen`), a transfer without its day or identifier, a scheduled share with a day, a
 *   receipt or evidence, a receipt reference without its receipt and a receipt without its reference,
 *   a receipt without its document's hash and a bank line with one, a receipt filed under a name
 *   rather than its `rct_` id (as the row's reference, and as its evidence's), a bank reference longer
 *   than the bank's 35 characters, a share of 0 or of a fraction, the
 *   42-character reference form no bank carries, an attempt outside 2 to 9, a record without its link,
 *   its currency, its lock or a row, and the `registry-v0` label. It still admits what a real month
 *   holds: a scheduled share with or without the identifier of a prepared attempt, a transfer whose
 *   bank gave no reference and whose receipt has not arrived, a transfer with two receipts, a bank
 *   reference of the full 35 characters, the ninth attempt, a note on a transfer, and a month whose
 *   only transfer came back.
 *
 * Run: node scripts/check-transfers.mjs
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, SCHEMA_DIR, createAjv, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv } = createValidatorWithAllSchemas();
const transfersSchema = ajv.getSchema(`${BASE}/transfers.v1.json`);
if (!transfersSchema) {
  fail(['transfers.v1 did not resolve by $id'], '');
}

/** The schema with every `format` keyword removed, compiled on its own: the reading a validator that ignores `format` gives. */
const withoutFormats = (node) => {
  if (Array.isArray(node)) return node.map(withoutFormats);
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).filter(([key, value]) => !(key === 'format' && typeof value === 'string')).map(([key, value]) => [key, withoutFormats(value)]));
  }
  return node;
};
const looseSchema = createAjv().compile(withoutFormats(readJson(join(SCHEMA_DIR, 'transfers.v1.json'))));

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const instant = (text) => Date.parse(text);
const zurichDay = (text) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(text));
const sum = (rows) => rows.reduce((total, row) => total + row.amountMinor, 0);
const attemptOf = (endToEndId) => (/-([2-9])$/.exec(endToEndId ?? '') ? Number(/-([2-9])$/.exec(endToEndId)[1]) : 1);
const receiptsOf = (row) => (row.evidence ?? []).filter((entry) => entry.kind === 'recipient-receipt');
const clone = (doc) => JSON.parse(JSON.stringify(doc));

/* -------------------------------------------------------------------------- what is linked */

const exampleFiles = readdirSync(EXAMPLE_DIR).filter((name) => name.endsWith('.example.json'));

/** Every `cost-support.v1` example, by the SHA-256 of its exact bytes: the documents a record can name. */
const costSupportByHash = new Map(
  exampleFiles
    .filter((name) => name.startsWith('cost-support.v1.'))
    .map((name) => {
      const bytes = readFileSync(join(EXAMPLE_DIR, name));
      return [sha256(bytes), { name, doc: JSON.parse(bytes.toString('utf8')) }];
    }),
);

/** Every `ledger-export.v1` example: the months whose `disburse` rows a record is held to. */
const exportsOf = exampleFiles.filter((name) => name.startsWith('ledger-export.v1.')).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));

/* ---------------------------------------------------------------------------------- rules */

/**
 * `cost-support.v1` IDENTITY (4), AS 1.5.0 RESTATES IT: the month's transfers sum to `passedOnMinor`. A document that carries
 * rows answers it with them. A document the month lock froze carries `transfers: []`: a month that passed nothing on meets it
 * as it stands, and any other answers it through the month's transfers record, which names the document by its bytes' SHA-256.
 * Until that record is published the identity is OPEN, never failed: no transfer of the month has been executed, or the
 * month's record is withheld.
 * Returns `met`, `open` or `failed: <why>`.
 */
const identityFour = (costSupport, record) => {
  if (costSupport.transfers.length > 0) {
    const own = sum(costSupport.transfers);
    return own === costSupport.passedOnMinor ? 'met' : `failed: its own transfers[] sum to ${own}, and passedOnMinor is ${costSupport.passedOnMinor}`;
  }
  if (record === null) return costSupport.passedOnMinor === 0 ? 'met' : 'open';
  const total = sum(record.transfers);
  return total === costSupport.passedOnMinor ? 'met' : `failed: its transfers record's rows sum to ${total}, and passedOnMinor is ${costSupport.passedOnMinor}`;
};

/** link and sum: the record against the cost-support document it names. */
const frozenProblems = (record, costSupport, at, named) => {
  const found = [];
  if (costSupport.month !== record.month) found.push(`${at}: names ${named}, whose month is ${costSupport.month}, not ${record.month}`);
  if (costSupport.currency !== record.currency) found.push(`${at}: its currency is ${record.currency}, and ${named}'s is ${costSupport.currency}`);
  const total = sum(record.transfers);
  if (total !== costSupport.passedOnMinor) {
    found.push(`${at}: its rows sum to ${total}, and ${named}'s passedOnMinor is ${costSupport.passedOnMinor} (cost-support.v1 identity (4))`);
  }
  if (costSupport.transfers.length > 0) {
    const key = (row) => `${row.recipientId}|${row.category}|${row.amountMinor}`;
    const own = costSupport.transfers.map(key).sort().join(',');
    const ours = record.transfers.map(key).sort().join(',');
    if (own !== ours) found.push(`${at}: its rows are not the recipients, categories and amounts of ${named}'s own transfers[]`);
  }
  return found;
};

/** link, sum and export: the record against the document it names and the month's export. */
const linkProblems = (record, at) => {
  const found = [];
  const total = sum(record.transfers);
  const frozen = costSupportByHash.get(record.costSupportSha256);
  if (!frozen) {
    found.push(`${at}: costSupportSha256 ${record.costSupportSha256} is the SHA-256 of no cost-support.v1 example's bytes`);
  } else {
    found.push(...frozenProblems(record, frozen.doc, at, `examples/${frozen.name}`));
  }

  for (const { name, doc } of exportsOf.filter(({ doc }) => doc.month === record.month)) {
    const where = `${at} against examples/${name}`;
    if (doc.batch?.costSupportSha256 !== record.costSupportSha256) {
      found.push(`${where}: the export names cost-support document ${doc.batch?.costSupportSha256}, and the record ${record.costSupportSha256}`);
      continue;
    }
    if (doc.lockedAt !== record.lockedAt) found.push(`${where}: lockedAt is ${record.lockedAt}, and the export's is ${doc.lockedAt}`);
    if (doc.totals?.disbursed !== total) found.push(`${where}: the rows sum to ${total}, and the export's totals.disbursed is ${doc.totals?.disbursed}`);
    const shares = new Map();
    for (const row of doc.rows.filter((r) => r.type === 'disburse')) {
      const share = shares.get(row.recipientId) ?? { amount: 0, categories: new Set(), notes: new Set() };
      share.amount += -row.amountMinor;
      share.categories.add(row.categoryFundId);
      share.notes.add(row.note);
      shares.set(row.recipientId, share);
    }
    const listed = new Set(record.transfers.map((row) => row.recipientId));
    for (const recipient of shares.keys()) {
      if (!listed.has(recipient)) found.push(`${where}: the export's disburse rows pay ${recipient}, and the record has no row for it`);
    }
    for (const row of record.transfers) {
      const share = shares.get(row.recipientId);
      if (!share) {
        found.push(`${where}: the record has a row for ${row.recipientId}, which no disburse row of the export pays`);
        continue;
      }
      if (row.amountMinor !== share.amount) found.push(`${where}: ${row.recipientId}'s row states ${row.amountMinor}, and its disburse rows ${share.amount}`);
      if (share.categories.size !== 1 || !share.categories.has(row.category)) {
        found.push(`${where}: ${row.recipientId}'s row is in ${row.category}, and its disburse rows in ${[...share.categories].join(', ')}`);
      }
      if (row.endToEndId !== undefined) {
        const [note] = share.notes;
        const startsRight = share.notes.size === 1 && row.endToEndId.startsWith(note);
        const firstIsNote = attemptOf(row.endToEndId) !== 1 || row.endToEndId === note;
        if (!startsRight || !firstIsNote) found.push(`${where}: ${row.recipientId}'s endToEndId ${row.endToEndId} does not start with, or as a first attempt is not, its disburse note ${[...share.notes].join(', ')}`);
      }
    }
  }
  return found;
};

/** rows and dated: what one record says of itself. */
const rowProblems = (record, at) => {
  const found = [];
  if (instant(record.generatedAt) < instant(record.lockedAt)) found.push(`${at}: generatedAt ${record.generatedAt} is earlier than lockedAt ${record.lockedAt}`);
  const lockDay = zurichDay(record.lockedAt);
  const ownDay = zurichDay(record.generatedAt);
  const yyyymm = record.month.replace('-', '');
  let previous = '';
  record.transfers.forEach((row, index) => {
    const where = `${at}: transfers[${index}] (${row.recipientId})`;
    if (!(row.recipientId > previous)) found.push(`${where} is not after ${previous || 'the start'}: one row per recipient, in recipientId order`);
    previous = row.recipientId;
    if (row.endToEndId !== undefined && !row.endToEndId.startsWith(`psn-${yyyymm}-${row.recipientId.slice(-12)}`)) {
      found.push(`${where}: endToEndId ${row.endToEndId} does not name the month ${record.month} and this recipient`);
    }
    if (row.status === 'transferred') {
      if (row.date < lockDay) found.push(`${where}: transferred on ${row.date}, before the lock's day ${lockDay}`);
      if (row.date > ownDay) found.push(`${where}: transferred on ${row.date}, after the record's own day ${ownDay}`);
    }
    const receipts = receiptsOf(row);
    if (row.receiptRef !== undefined && !receipts.some((entry) => entry.ref === row.receiptRef)) {
      found.push(`${where}: receiptRef ${row.receiptRef} is the reference of none of its receipts`);
    }
    if ((row.evidence ?? []).filter((entry) => entry.kind === 'bank-line').length > 1) found.push(`${where}: names more than one bank line`);
    if (new Set(receipts.map((entry) => entry.ref)).size !== receipts.length) found.push(`${where}: names one receipt twice`);
  });
  return found;
};

/** regen: a later record of the same month and link is the earlier one regenerated. */
const regenerationProblems = (earlier, later, at) => {
  const found = [];
  if (instant(later.generatedAt) < instant(earlier.generatedAt)) found.push(`${at}: the later record is dated ${later.generatedAt}, before ${earlier.generatedAt}`);
  const byRecipient = new Map(later.transfers.map((row) => [row.recipientId, row]));
  if (later.transfers.length !== earlier.transfers.length) found.push(`${at}: ${earlier.transfers.length} row(s) became ${later.transfers.length}: a month's rows are fixed from its first publication`);
  for (const before of earlier.transfers) {
    const after = byRecipient.get(before.recipientId);
    const where = `${at}: ${before.recipientId}`;
    if (!after) {
      found.push(`${where}'s row is gone`);
      continue;
    }
    if (after.amountMinor !== before.amountMinor || after.category !== before.category) found.push(`${where}'s share changed`);
    const kept = new Set(receiptsOf(after).map((entry) => `${entry.ref}|${entry.sha256}`));
    for (const entry of receiptsOf(before)) {
      if (!kept.has(`${entry.ref}|${entry.sha256}`) && after.status === 'transferred' && attemptOf(after.endToEndId) === attemptOf(before.endToEndId)) {
        found.push(`${where}: receipt ${entry.ref} was withdrawn`);
      }
    }
    if (before.status === 'transferred' && after.status === 'scheduled' && after.note === undefined) {
      found.push(`${where}: went back from transferred to scheduled with no note saying why`);
    }
    if (before.status === 'transferred' && after.status === 'transferred' && attemptOf(after.endToEndId) <= attemptOf(before.endToEndId)
      && (after.date !== before.date || after.endToEndId !== before.endToEndId)) {
      found.push(`${where}: its transfer's day or identifier changed, and no later attempt replaced it`);
    }
  }
  return found;
};

/* ------------------------------------------------------------------------------ the examples */

const recordFiles = exampleFiles.filter((name) => name.startsWith('transfers.v1.')).sort();
const records = recordFiles.map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));

let rows = 0;
let againstExport = 0;
let laterAttempt = 0;
let returned = 0;
let withReceipt = 0;
let pairs = 0;
for (const { name, doc } of records) {
  const at = `examples/${name}`;
  problems.push(...linkProblems(doc, at), ...rowProblems(doc, at));
  rows += doc.transfers.length;
  if (exportsOf.some((e) => e.doc.month === doc.month && e.doc.batch?.costSupportSha256 === doc.costSupportSha256)) againstExport += 1;
  if (doc.transfers.some((row) => row.status === 'scheduled' && attemptOf(row.endToEndId) > 1)) laterAttempt += 1;
  if (doc.transfers.some((row) => row.status === 'scheduled' && row.note !== undefined)) returned += 1;
  if (doc.transfers.some((row) => row.receiptRef !== undefined)) withReceipt += 1;
}

const months = new Map();
for (const record of records) {
  const key = `${record.doc.month}|${record.doc.costSupportSha256}`;
  months.set(key, [...(months.get(key) ?? []), record]);
}
for (const group of months.values()) {
  const ordered = [...group].sort((a, b) => instant(a.doc.generatedAt) - instant(b.doc.generatedAt));
  for (let i = 1; i < ordered.length; i++) {
    pairs += 1;
    problems.push(...regenerationProblems(ordered[i - 1].doc, ordered[i].doc, `examples/${ordered[i - 1].name} then examples/${ordered[i].name}`));
  }
}

/* Identity (4) over every cost-support example, each with the newest record that names its bytes, if any: a document that
   carries rows meets it with them, and the frozen one meets it through its record. */
let identityChecked = 0;
for (const [hash, { name, doc }] of costSupportByHash) {
  const naming = records.filter((r) => r.doc.costSupportSha256 === hash).sort((a, b) => instant(b.doc.generatedAt) - instant(a.doc.generatedAt));
  const verdict = identityFour(doc, naming[0]?.doc ?? null);
  identityChecked += 1;
  if (verdict !== 'met') problems.push(`examples/${name}: cost-support.v1 identity (4) is ${verdict}`);
}

if (records.length === 0) problems.push('no transfers.v1 example — this gate would pass vacuously');
if (againstExport === 0) problems.push('no transfers.v1 example has its month\'s ledger-export.v1 example naming the same document — the export rules would pass vacuously');
if (laterAttempt === 0) problems.push('no transfers.v1 example shows a scheduled share under a later attempt\'s identifier');
if (returned === 0) problems.push('no transfers.v1 example shows a transfer that came back');
if (withReceipt === 0) problems.push('no transfers.v1 example shows a receipt');
if (pairs === 0) problems.push('no two transfers.v1 examples of one month — the regeneration rule would pass vacuously');

/* ------------------------------------------------------------- the rules, held to plants */

const main = readJson(join(EXAMPLE_DIR, 'transfers.v1.example.json'));
const later = readJson(join(EXAMPLE_DIR, 'transfers.v1.returned.example.json'));
let identityPlants = 0;
const edit = (doc, change) => {
  const copy = clone(doc);
  change(copy);
  return copy;
};
const row = (doc, recipient) => {
  const found = doc.transfers.find((r) => r.recipientId === recipient);
  if (!found) throw new Error(`no row for ${recipient} in the example the plants edit`);
  return found;
};
const EDUCATION_SENT = 'rcp_0svacmgratb4f4q0syghrz8ym4';
const EDUCATION_RETRIED = 'rcp_8jf9xfejcgadg7cgyag0hmkcxb';
const HEALTH_RECEIPTED = 'rcp_f5cc8xgz81c00nrve04pdahejb';
const HEALTH_RETURNED = 'rcp_tg8g3ps3smxzdpy1zt0zesjnx9';

const shifted = (at, seconds) => new Date(instant(at) + seconds * 1000).toISOString().replace(/\.000Z$/, 'Z');
const linkMustFlag = [
  ['a link one character off', edit(main, (d) => { d.costSupportSha256 = `${d.costSupportSha256.slice(0, -1)}d`; })],
  ['rows that sum one minor unit off', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor += 1; })],
  ['two rows that trade a minor unit (the sum holds, the export does not)', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor += 1; row(d, HEALTH_RECEIPTED).amountMinor -= 1; })],
  ['a missing row', edit(main, (d) => { d.transfers = d.transfers.filter((r) => r.recipientId !== HEALTH_RETURNED); })],
  ['a row in another category', edit(main, (d) => { row(d, EDUCATION_SENT).category = 'health'; })],
  ['another currency', edit(main, (d) => { d.currency = 'EUR'; })],
  ['another lock instant than the export\'s', edit(main, (d) => { d.lockedAt = shifted(d.lockedAt, 1); })],
  ['a first attempt whose identifier is not its disburse note', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-q0syghrz8ym5'; })],
];
const rowsMustFlag = [
  ['rows out of recipientId order', edit(main, (d) => { d.transfers.reverse(); })],
  ['one recipient twice', edit(main, (d) => { d.transfers.splice(1, 0, clone(d.transfers[0])); })],
  ['a transfer dated before the lock\'s day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-11-30'; })],
  ['a transfer dated after the record\'s own day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-12-03'; })],
  ['an identifier of another month', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202710-q0syghrz8ym4'; })],
  ['an identifier of another recipient', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-rve04pdahejb'; })],
  ['a receipt reference none of the row\'s receipts carries', edit(main, (d) => { row(d, HEALTH_RECEIPTED).receiptRef = 'rct_01kmrb4x7e2q9w5n3t8v6y0zhb'; })],
  ['two bank lines', edit(main, (d) => { row(d, EDUCATION_SENT).evidence.push({ kind: 'bank-line', ref: 'SMPL-2027-12-01-0099' }); })],
  ['one receipt named twice', edit(main, (d) => { const r = row(d, HEALTH_RECEIPTED); r.evidence.push(clone(r.evidence[1])); })],
  ['a record dated before its lock', edit(main, (d) => { d.generatedAt = shifted(d.lockedAt, -1); })],
];
const regenMustFlag = [
  ['a receipt withdrawn', edit(later, (d) => { const r = row(d, HEALTH_RECEIPTED); delete r.receiptRef; r.evidence = r.evidence.filter((e) => e.kind !== 'recipient-receipt'); })],
  ['a transfer gone back to scheduled with no note', edit(later, (d) => { delete row(d, HEALTH_RETURNED).note; })],
  ['a share that changed', edit(later, (d) => { row(d, EDUCATION_SENT).amountMinor -= 1; row(d, EDUCATION_RETRIED).amountMinor += 1; })],
  ['a transfer re-dated with no later attempt', edit(later, (d) => { row(d, HEALTH_RECEIPTED).date = '2027-12-02'; })],
  ['a later record dated before the earlier one', edit(later, (d) => { d.generatedAt = shifted(main.generatedAt, -1); })],
  ['a row gone', edit(later, (d) => { d.transfers = d.transfers.filter((r) => r.recipientId !== HEALTH_RETURNED); })],
];
const mustPass = [
  ['the record as first published', main, null],
  ['the record regenerated with a later attempt sent, a receipt and a transfer that came back', later, main],
  ['the share that came back sent again as attempt 2', edit(later, (d) => {
    const r = row(d, HEALTH_RETURNED);
    delete r.note;
    Object.assign(r, { status: 'transferred', date: '2027-12-03', endToEndId: 'psn-202711-y1zt0zesjnx9-2', evidence: [{ kind: 'bank-line', ref: 'SMPL-2027-12-03-0002' }] });
  }), later],
  ['every share still scheduled but one', edit(main, (d) => {
    for (const r of d.transfers.filter((x) => x.recipientId !== EDUCATION_SENT)) {
      for (const member of ['date', 'receiptRef', 'evidence', 'endToEndId']) delete r[member];
      r.status = 'scheduled';
    }
  }), null],
];

/* Identity (4) as restated, held to the document the month lock writes (`transfers: []`, what the platform's composer
   writes into every frozen document) and to the record that answers it: met through the record, open without one, failed
   by a record one minor unit off, met on its own where nothing was passed on, and, for a document that carries rows, met
   or failed by them alone. */
const linked = costSupportByHash.get(main.costSupportSha256)?.doc;
if (!linked) {
  problems.push('examples/transfers.v1.example.json names no cost-support example, so identity (4) cannot be held to plants');
} else {
  const frozen = edit(linked, (d) => { d.transfers = []; });
  const nothingPassedOn = edit(frozen, (d) => { d.passedOnMinor = 0; });
  const identityCases = [
    ['a frozen document and its record', frozen, main, 'met'],
    ['a frozen document and its record regenerated', frozen, later, 'met'],
    ['a frozen document with no record yet', frozen, null, 'open'],
    ['a frozen document and a record one minor unit short', frozen, edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor -= 1; }), 'failed'],
    ['a frozen document of a month that passed nothing on', nothingPassedOn, null, 'met'],
    ['a frozen document of a month that passed nothing on, and a record', nothingPassedOn, main, 'failed'],
    ['a document that carries its rows', linked, null, 'met'],
    ['a document whose own rows are one minor unit short', edit(linked, (d) => { d.transfers[0].amountMinor -= 1; }), main, 'failed'],
  ];
  for (const [what, costSupport, record, expected] of identityCases) {
    const verdict = identityFour(costSupport, record);
    if (!verdict.startsWith(expected)) problems.push(`identity (4) says ${verdict} for ${what}, not ${expected}`);
  }
  identityPlants = identityCases.length;

  /* The frozen document is what the record answers for: a record over it fails the link's sum rule alone when it is off. */
  const offByOne = edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor -= 1; });
  if (frozenProblems(offByOne, frozen, 'planted', 'the frozen document').length !== 1) {
    problems.push('the sum rule does not flag, alone, a record one minor unit short of a frozen document\'s passedOnMinor');
  }
  if (frozenProblems(main, frozen, 'planted', 'the frozen document').length !== 0) {
    problems.push('the link rules flag the record of a frozen document that carries no rows');
  }
}

for (const [what, doc] of linkMustFlag) {
  if (linkProblems(doc, 'planted').length === 0) problems.push(`the link rules pass ${what}`);
}
for (const [what, doc] of rowsMustFlag) {
  if (rowProblems(doc, 'planted').length === 0) problems.push(`the row rules pass ${what}`);
}
for (const [what, doc] of regenMustFlag) {
  if (regenerationProblems(main, doc, 'planted').length === 0) problems.push(`the regeneration rule passes ${what}`);
}
for (const [what, doc, before] of mustPass) {
  const found = [...linkProblems(doc, 'planted'), ...rowProblems(doc, 'planted'), ...(before ? regenerationProblems(before, doc, 'planted') : [])];
  if (found.length > 0) problems.push(`the rules flag ${what} (${found[0]})`);
  if (!transfersSchema(doc)) problems.push(`transfers.v1 refuses ${what} — ${JSON.stringify(transfersSchema.errors?.[0] ?? {})}`);
}

/* ------------------------------------------------------------------------------ refusals */

const refuse = [
  ['an account number on a row', edit(main, (d) => { row(d, EDUCATION_SENT).iban = 'CH0000000000000000000'; })],
  ['a recipient\'s name on a row', edit(main, (d) => { row(d, EDUCATION_SENT).recipientName = 'SAMPLE recipient'; })],
  ['a screening on a row', edit(main, (d) => { row(d, EDUCATION_RETRIED).screening = 'clear'; })],
  ['a hold\'s raw reason on a row', edit(main, (d) => { row(d, EDUCATION_RETRIED).holdReason = 'no-account'; })],
  ['a steward on a row', edit(main, (d) => { row(d, EDUCATION_SENT).signedBy = 'acc_0000000000000000000000000a'; })],
  ['a member the record does not have', edit(main, (d) => { d.passedOnMinor = 97264; })],
  ['the status held, which this version does not state', edit(main, (d) => { row(d, EDUCATION_RETRIED).status = 'held'; })],
  ['the status frozen', edit(main, (d) => { row(d, EDUCATION_RETRIED).status = 'frozen'; })],
  ['a transfer with no day', edit(main, (d) => { delete row(d, EDUCATION_SENT).date; })],
  ['a transfer with no identifier', edit(main, (d) => { delete row(d, EDUCATION_SENT).endToEndId; })],
  ['a scheduled share with a day', edit(main, (d) => { row(d, EDUCATION_RETRIED).date = '2027-12-01'; })],
  ['a scheduled share with a receipt', edit(main, (d) => {
    Object.assign(row(d, EDUCATION_RETRIED), { receiptRef: 'rct_01kmrb4x7e2q9w5n3t8v6y0zhc', evidence: [{ kind: 'recipient-receipt', ref: 'rct_01kmrb4x7e2q9w5n3t8v6y0zhc', sha256: '0'.repeat(64) }] });
  })],
  ['a scheduled share with evidence', edit(main, (d) => { row(d, EDUCATION_RETRIED).evidence = [{ kind: 'bank-line', ref: 'SMPL-2027-12-01-0014' }]; })],
  ['a receipt reference without its receipt', edit(main, (d) => { row(d, EDUCATION_SENT).receiptRef = 'rct_01kmrb4x7e2q9w5n3t8v6y0zhd'; })],
  ['a receipt without its reference on the row', edit(main, (d) => { delete row(d, HEALTH_RECEIPTED).receiptRef; })],
  ['a receipt without its document\'s hash', edit(main, (d) => { delete row(d, HEALTH_RECEIPTED).evidence[1].sha256; })],
  ['a bank line with a hash', edit(main, (d) => { row(d, EDUCATION_SENT).evidence[0].sha256 = '0'.repeat(64); })],
  ['a name as a row\'s receipt reference', edit(main, (d) => { row(d, HEALTH_RECEIPTED).receiptRef = 'Receipt from SAMPLE recipient.pdf'; })],
  ['a name as a receipt\'s evidence reference', edit(main, (d) => { row(d, HEALTH_RECEIPTED).evidence[1].ref = 'Receipt from SAMPLE recipient.pdf'; })],
  ['a bank reference of 36 characters', edit(main, (d) => { row(d, EDUCATION_SENT).evidence[0].ref = `SMPL-${'0'.repeat(31)}`; })],
  ['a hash in capitals', edit(main, (d) => { const e = row(d, HEALTH_RECEIPTED).evidence[1]; e.sha256 = e.sha256.toUpperCase(); })],
  ['a hash one character short', edit(main, (d) => { const e = row(d, HEALTH_RECEIPTED).evidence[1]; e.sha256 = e.sha256.slice(1); })],
  ['evidence of a kind this record does not carry', edit(main, (d) => { row(d, EDUCATION_SENT).evidence[0].kind = 'invoice'; })],
  ['a URL to a receipt', edit(main, (d) => { row(d, HEALTH_RECEIPTED).evidence[1].url = 'https://example.org/receipt.pdf'; })],
  ['an empty evidence array', edit(main, (d) => { row(d, EDUCATION_SENT).evidence = []; })],
  ['a share of 0', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor = 0; })],
  ['a negative share', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor = -24316; })],
  ['a share in fractions of a minor unit', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor = 24316.5; })],
  ['the 42-character reference form no bank carries', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-2027-11-rcp_0svacmgratb4f4q0syghrz8ym4'; })],
  ['attempt 1 written as a suffix', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-q0syghrz8ym4-1'; })],
  ['a tenth attempt', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-q0syghrz8ym4-10'; })],
  ['an identifier in capitals', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-Q0SYGHRZ8YM4'; })],
  ['a recipient id in capitals', edit(main, (d) => { row(d, EDUCATION_SENT).recipientId = 'rcp_0SVACMGRATB4F4Q0SYGHRZ8YM4'; })],
  ['a category in capitals', edit(main, (d) => { row(d, EDUCATION_SENT).category = 'Education'; })],
  ['an empty note', edit(main, (d) => { row(d, EDUCATION_SENT).note = ''; })],
  ['a day that is not a day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-12-1'; })],
  ['an instant with a fraction of a second', edit(main, (d) => { d.generatedAt = '2027-12-02T06:05:00.250Z'; })],
  ['an instant with an offset', edit(main, (d) => { d.lockedAt = '2027-12-01T10:10:00+01:00'; })],
  ['no link', edit(main, (d) => { delete d.costSupportSha256; })],
  ['a link in capitals', edit(main, (d) => { d.costSupportSha256 = d.costSupportSha256.toUpperCase(); })],
  ['no currency', edit(main, (d) => { delete d.currency; })],
  ['a currency not in ISO 4217\'s form', edit(main, (d) => { d.currency = 'chf'; })],
  ['no lock instant', edit(main, (d) => { delete d.lockedAt; })],
  ['no row', edit(main, (d) => { d.transfers = []; })],
  ['no source', edit(main, (d) => { delete d.source; })],
  ['the source registry-v0', edit(main, (d) => { d.source = 'registry-v0'; })],
  ['a month that is no month', edit(main, (d) => { d.month = '2027-13'; })],
];
/* Refused only where `format` is asserted: a calendar date that does not exist keeps the pattern's shape. */
const refuseByFormatOnly = [
  ['the 30th of February', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2028-02-30'; })],
];
for (const [what, doc] of refuse) {
  if (transfersSchema(doc)) problems.push(`transfers.v1: admits ${what}`);
  if (looseSchema(doc)) problems.push(`transfers.v1 without format: admits ${what}`);
}
for (const [what, doc] of refuseByFormatOnly) {
  if (transfersSchema(doc)) problems.push(`transfers.v1: admits ${what}`);
}

const admit = [
  ['a scheduled share with no prepared attempt', edit(main, (d) => { delete row(d, EDUCATION_RETRIED).endToEndId; })],
  ['a transfer whose bank gave no reference and whose receipt has not arrived', edit(main, (d) => { delete row(d, EDUCATION_SENT).evidence; })],
  ['a transfer with two receipts', edit(main, (d) => {
    row(d, HEALTH_RECEIPTED).evidence.push({ kind: 'recipient-receipt', ref: 'rct_01kmrb4x7e2q9w5n3t8v6y0zhe', sha256: '1'.repeat(64) });
  })],
  ['a bank reference of the full 35 characters', edit(main, (d) => { row(d, EDUCATION_SENT).evidence[0].ref = `SMPL-${'0'.repeat(30)}`; })],
  ['the ninth attempt', edit(main, (d) => { row(d, EDUCATION_RETRIED).endToEndId = 'psn-202711-cgyag0hmkcxb-9'; })],
  ['a note on a transfer', edit(main, (d) => { row(d, EDUCATION_SENT).note = 'SAMPLE note.'; })],
  ['a month whose only transfer came back', edit(main, (d) => {
    for (const r of d.transfers) {
      for (const member of ['date', 'receiptRef', 'evidence', 'endToEndId']) delete r[member];
      r.status = 'scheduled';
    }
    row(d, EDUCATION_SENT).note = 'Transferred on 2027-12-01 and returned by the receiving bank, so the share is owed again until it is sent again.';
  })],
  ['a single row', edit(main, (d) => { d.transfers = d.transfers.slice(0, 1); })],
  ['a fixture plane', edit(main, (d) => { d.source = 'fixture'; })],
  ['a production plane', edit(main, (d) => { d.source = 'platform'; })],
];
for (const [what, doc] of admit) {
  if (!transfersSchema(doc)) problems.push(`transfers.v1: refuses ${what} — ${JSON.stringify(transfersSchema.errors?.[0] ?? {})}`);
  if (!looseSchema(doc)) problems.push(`transfers.v1 without format: refuses ${what} — ${JSON.stringify(looseSchema.errors?.[0] ?? {})}`);
}

fail(
  problems,
  `transfers record: ${records.length} example(s), ${rows} row(s), each linked to a cost-support example by its bytes' SHA-256 ` +
    `with the rows summing to its passedOnMinor (${againstExport} also held to the month's export's disburse rows; ` +
    `${laterAttempt} with a later attempt scheduled, ${returned} with a transfer that came back, ${withReceipt} with a receipt; ` +
    `${pairs} regeneration pair(s)); cost-support.v1 identity (4) is met by all ${identityChecked} cost-support example(s) and ` +
    `gives the restated verdict on ${identityPlants} planted pairs; the link rules flag ${linkMustFlag.length} plants, the row rules ${rowsMustFlag.length} and ` +
    `the regeneration rule ${regenMustFlag.length}, and ${mustPass.length} pass; ${refuse.length} refusals stand with and without ` +
    `format, ${refuseByFormatOnly.length} by format alone, and ${admit.length} admissions`,
);

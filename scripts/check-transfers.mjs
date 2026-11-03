#!/usr/bin/env node
/**
 * Gate: the month's transfers record keeps the link and the arithmetic its contract promises, the
 * contract still refuses what must never be published, and a `cost-support.v1` document's own
 * transfer rows keep the rules 1.6.0 gives them.
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
 *               the identifier their `note` carries after `EndToEndId ` (and is it, on a first attempt:
 *               1.1.0's (d), FS07-062's ruling (c));
 *     rows      one row per recipient, in `recipientId` order; an `endToEndId` names the record's month
 *               and its recipient (the last 12 characters of the ULID); a transfer is not dated, and a
 *               share not held, before the day of the lock, nor after the day of the record's own
 *               `generatedAt` (Europe/Zurich); a transfer paid in the record's currency pays the share
 *               and states no rate, and one paid in another currency states its rate (1.1.0);
 *               `receiptRef` is the reference of one of the row's receipts; a row names at most one bank
 *               line and each receipt once;
 *     dated     `generatedAt` is never earlier than `lockedAt`;
 *     regen     two records of one month and one link, in `generatedAt` order, are one record
 *               regenerated: the same rows (recipient, category, amount), no receipt withdrawn, a
 *               transfer that goes back to `scheduled` or `held` says why in a note, and a transfer that
 *               stays keeps its day, identifier, what it paid, its rate, its charges and its release
 *               mark unless a later attempt replaced it;
 *     charges   (g) a transferred row's `chargesMinor` is the amount of the fees account's `transfer-out`
 *               line that carries its `endToEndId`, less the share, wherever a `fees-account-statement.v1`
 *               document carries that line. No statement example covers the record's month, so the rule
 *               is held to planted statements.
 *   Each rule is held to planted documents, the ones it must flag and the ones it must pass, so a rule
 *   that stopped matching fails here before the examples are trusted to pass.
 *
 *   REFUSALS. The contract still refuses, by its own keywords and with every `format` keyword removed
 *   too (draft 2020-12 makes `format` an annotation, so a reader's validator may ignore it): every
 *   member that could carry an account, a person, a screening, a hold's cause or the transfer day's
 *   record, a status this version does not state (`frozen`), a ground that is not one of the four
 *   generic words (the raw cause, `screening`, `frozen`), a held share without its day or ground, or
 *   with an identifier, a day of transfer or evidence, a ground or a day held on any other status, a
 *   transfer without its day, its identifier, what it paid, its currency or its charges, a rate
 *   without its day and a day without its rate, a rate that is no decimal string and a rate's day
 *   that is no day, a release mark that is not `true`, each of what a transfer paid, its currency,
 *   its rate with its day, its charges and its release mark on a share that is not transferred, a
 *   scheduled share with a day, a receipt or evidence, a receipt reference without its
 *   receipt and a receipt without its reference, a receipt without its document's hash and a bank
 *   line with one, a receipt filed under a name rather than its `rct_` id (as the row's reference, and
 *   as its evidence's), a bank reference longer than the bank's 35 characters, a share of 0 or of a
 *   fraction, the 42-character reference form no bank carries, an attempt outside 2 to 9, a record
 *   without its link, its currency, its lock or a row, and the `registry-v0` label. It still admits
 *   what a real month holds: a scheduled share with or without the identifier of a prepared attempt,
 *   a share held under each of the four grounds, with or without a note, a transfer whose bank gave no
 *   reference and whose receipt has not arrived, a transfer with two receipts, charges below 0, a
 *   transfer released by two board members, a bank reference of the full 35 characters, the ninth
 *   attempt, a note on a transfer, and a month whose only transfer came back.
 *
 *   A COST-SUPPORT DOCUMENT'S OWN ROWS (`cost-support.v1` 1.6.0). A document written by hand may
 *   carry rows of its own in `transfers[]`, and from 1.6.0 on it can state each as this record states
 *   it. No cost-support example carries a held share, a later attempt, what a transfer paid or the
 *   class `fees-account-charges`, so the row's rules are held to planted documents edited from
 *   `cost-support.v1.example.json`, each one edit away from a document the contract admits. The
 *   contract refuses, with every `format` keyword removed too: a held share without its day or its
 *   ground, or with a day of transfer, a receipt, evidence, an identifier, what a transfer paid,
 *   charges or the release mark; a ground that is not one of the four generic words (`frozen`, the
 *   raw cause, `screening`) and the status `frozen`; a day held or a ground on a transfer or on a
 *   scheduled share; each of what a transfer paid, its currency, its rate, its charges and its
 *   release mark on a scheduled share; a rate without its day and a day without its rate; a rate
 *   that is no decimal string, a release mark that is not `true`, a payment of 0 or of a fraction, a
 *   paid currency not in ISO 4217's form and charges of a fraction; attempt 1 written as a suffix, a
 *   tenth attempt, a suffix with no attempt and the long form with a suffix; and a class no rule
 *   names. Its days carry `format` alone, as every day of that contract does, so a day that does
 *   not exist is refused by `format` alone. It admits a transfer and a scheduled share as 1.5.0
 *   states them, a share held under each of the four grounds, with or without a note, a transfer
 *   with what it paid in the document's currency, its charges of 0 or above 0, with and without the
 *   release mark, one paid in another currency with its rate, the rate's day and charges below 0,
 *   the short form of attempts 1, 2 and 9, and an invoice of the class `fees-account-charges`.
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

/** What a `disburse` row's note carries before the first attempt's identifier (FS07-062's ruling (c); `RowEmitter`). */
const NOTE_LABEL = 'EndToEndId ';

/** The identifier a `disburse` row's note carries after its label, or null for a note that carries none. */
const identifierOf = (note) => (typeof note === 'string' && note.startsWith(NOTE_LABEL) ? note.slice(NOTE_LABEL.length) : null);

/** What a transfer stated that stays fixed while its attempt does: the debit line and the payment file never change. */
const FIXED_ON_A_TRANSFER = ['date', 'endToEndId', 'paidAmountMinor', 'paidCurrency', 'rate', 'rateDate', 'chargesMinor', 'singleRelease'];

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

/** Every `fees-account-statement.v1` example: the debit lines a transfer's charges are held to (identity (g)). */
const statementsOf = exampleFiles
  .filter((name) => name.startsWith('fees-account-statement.v1.'))
  .map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));

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

/** link, sum and export: the record against the document it names and the month's export (`exports`, the examples unless planted). */
const linkProblems = (record, at, exports = exportsOf) => {
  const found = [];
  const total = sum(record.transfers);
  const frozen = costSupportByHash.get(record.costSupportSha256);
  if (!frozen) {
    found.push(`${at}: costSupportSha256 ${record.costSupportSha256} is the SHA-256 of no cost-support.v1 example's bytes`);
  } else {
    found.push(...frozenProblems(record, frozen.doc, at, `examples/${frozen.name}`));
  }

  for (const { name, doc } of exports.filter(({ doc }) => doc.month === record.month)) {
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
        // (d): the note carries the first attempt's identifier after its label; a first attempt is it, a later one starts with it.
        const [note] = share.notes;
        const identifier = share.notes.size === 1 ? identifierOf(note) : null;
        const startsRight = identifier !== null && row.endToEndId.startsWith(identifier);
        const firstIsIt = attemptOf(row.endToEndId) !== 1 || row.endToEndId === identifier;
        if (!startsRight || !firstIsIt) {
          found.push(
            `${where}: ${row.recipientId}'s endToEndId ${row.endToEndId} does not start with, or as a first attempt is not, the identifier its disburse note carries after "${NOTE_LABEL}" (${[...share.notes].join(', ')})`,
          );
        }
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
      const converted = row.paidCurrency !== record.currency;
      if (converted && row.rate === undefined) found.push(`${where}: paid in ${row.paidCurrency}, not the record's ${record.currency}, and states no rate`);
      if (!converted && row.rate !== undefined) found.push(`${where}: paid in the record's own currency, and states a rate`);
      if (!converted && row.paidAmountMinor !== row.amountMinor) {
        found.push(`${where}: paid ${row.paidAmountMinor} in the record's own currency, and the share is ${row.amountMinor}`);
      }
    }
    if (row.status === 'held') {
      if (row.heldOn < lockDay) found.push(`${where}: held on ${row.heldOn}, before the lock's day ${lockDay}`);
      if (row.heldOn > ownDay) found.push(`${where}: held on ${row.heldOn}, after the record's own day ${ownDay}`);
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
    if (before.status === 'transferred' && after.status !== 'transferred' && after.note === undefined) {
      found.push(`${where}: went back from transferred to ${after.status} with no note saying why`);
    }
    if (before.status === 'transferred' && after.status === 'transferred' && attemptOf(after.endToEndId) <= attemptOf(before.endToEndId)) {
      const moved = FIXED_ON_A_TRANSFER.filter((member) => after[member] !== before[member]);
      if (moved.length > 0) found.push(`${where}: its transfer's ${moved.join(', ')} changed, and no later attempt replaced it`);
    }
  }
  return found;
};

/**
 * charges, (g): a transferred row's `chargesMinor` is the amount of the fees account's debit line that executed it, less the
 * share. The line is the `transfer-out` line that carries the row's `endToEndId` on a statement (`statements`, the examples
 * unless planted); a row no statement carries is not held here, and two lines naming one transfer are.
 */
const chargesProblems = (record, at, statements = statementsOf) => {
  const found = [];
  for (const row of record.transfers.filter((r) => r.status === 'transferred')) {
    const lines = statements.flatMap(({ name, doc }) =>
      doc.lines.filter((line) => line.class === 'transfer-out' && line.endToEndId === row.endToEndId).map((line) => ({ name, line })),
    );
    if (lines.length === 0) continue;
    const where = `${at}: ${row.recipientId}`;
    if (lines.length > 1) {
      found.push(`${where}: ${lines.length} transfer-out lines carry ${row.endToEndId} (${lines.map((l) => l.name).join(', ')}), and one debit line executes a transfer`);
      continue;
    }
    const [{ name, line }] = lines;
    if (line.direction !== 'debit' || line.currency !== record.currency) {
      found.push(`${where}: the transfer-out line of ${name} carrying ${row.endToEndId} is no debit in ${record.currency}`);
      continue;
    }
    if (line.amountMinor - row.amountMinor !== row.chargesMinor) {
      found.push(`${where}: chargesMinor is ${row.chargesMinor}, and its debit line of ${name} booked ${line.amountMinor} for a share of ${row.amountMinor} (identity (g))`);
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
let held = 0;
let converted = 0;
let singleReleased = 0;
let withReceipt = 0;
let pairs = 0;
for (const { name, doc } of records) {
  const at = `examples/${name}`;
  problems.push(...linkProblems(doc, at), ...rowProblems(doc, at), ...chargesProblems(doc, at));
  rows += doc.transfers.length;
  if (exportsOf.some((e) => e.doc.month === doc.month && e.doc.batch?.costSupportSha256 === doc.costSupportSha256)) againstExport += 1;
  if (doc.transfers.some((row) => row.status === 'scheduled' && attemptOf(row.endToEndId) > 1)) laterAttempt += 1;
  if (doc.transfers.some((row) => row.status !== 'transferred' && row.note !== undefined)) returned += 1;
  if (doc.transfers.some((row) => row.status === 'held')) held += 1;
  if (doc.transfers.some((row) => row.rate !== undefined)) converted += 1;
  if (doc.transfers.some((row) => row.singleRelease === true)) singleReleased += 1;
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
if (held === 0) problems.push('no transfers.v1 example shows a held share');
if (converted === 0) problems.push('no transfers.v1 example shows a transfer paid in another currency, with its rate');
if (singleReleased === 0) problems.push('no transfers.v1 example shows a transfer one board member alone released');
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
const RETURNED_NOTE = 'Sent on 2027-12-01 and returned by the receiving bank, so the share is owed again until it is sent again.';
const GROUNDS = ['struck (Art. 7 Abs. 6)', 'transfer returned', 'account not confirmed', 'a precondition of the transfer is open'];

/** A share as `held` (struck by default), with its day and ground and nothing a transfer or an attempt has. */
const holding = (target, ground = GROUNDS[0], heldOn = '2027-12-02') => {
  for (const member of ['date', 'endToEndId', 'receiptRef', 'evidence', ...FIXED_ON_A_TRANSFER]) delete target[member];
  Object.assign(target, { status: 'held', heldOn, ground });
};

/** The month's export example, its `disburse` notes edited by `change` (planted exports for the (d) rule). */
const credit = exportsOf.find(({ doc }) => doc.month === main.month);
if (!credit) fail(['no ledger-export.v1 example of the record\'s month — the (d) plants have nothing to edit'], '');
const plantedExports = (change) => [{ name: `${credit.name} (planted)`, doc: edit(credit.doc, (d) => { for (const r of d.rows.filter((x) => x.type === 'disburse')) change(r); }) }];

/** A planted statement of December 2027 carrying a `transfer-out` debit line for each transferred row of `record`, at the share plus its charges. */
const plantedStatement = (record) => [{
  name: 'fees-account-statement.v1 (planted)',
  doc: {
    month: '2027-12',
    currency: record.currency,
    lines: record.transfers.filter((r) => r.status === 'transferred').map((r) => ({
      bookingDate: r.date, direction: 'debit', reversal: false, amountMinor: r.amountMinor + r.chargesMinor, currency: record.currency,
      class: 'transfer-out', endToEndId: r.endToEndId,
    })),
  },
}];

const shifted = (at, seconds) => new Date(instant(at) + seconds * 1000).toISOString().replace(/\.000Z$/, 'Z');
const linkMustFlag = [
  ['a link one character off', edit(main, (d) => { d.costSupportSha256 = `${d.costSupportSha256.slice(0, -1)}d`; })],
  ['rows that sum one minor unit off', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor += 1; })],
  ['two rows that trade a minor unit (the sum holds, the export does not)', edit(main, (d) => { row(d, EDUCATION_SENT).amountMinor += 1; row(d, HEALTH_RECEIPTED).amountMinor -= 1; })],
  ['a missing row', edit(main, (d) => { d.transfers = d.transfers.filter((r) => r.recipientId !== HEALTH_RETURNED); })],
  ['a row in another category', edit(main, (d) => { row(d, EDUCATION_SENT).category = 'health'; })],
  ['another currency', edit(main, (d) => { d.currency = 'EUR'; })],
  ['another lock instant than the export\'s', edit(main, (d) => { d.lockedAt = shifted(d.lockedAt, 1); })],
  ['a first attempt whose identifier is not its disburse note\'s', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-q0syghrz8ym5'; })],
];
const exportsMustFlag = [
  ['disburse notes that carry the identifier with no label', plantedExports((r) => { r.note = identifierOf(r.note); })],
  ['disburse notes that carry another label', plantedExports((r) => { r.note = `Reference ${identifierOf(r.note)}`; })],
];
const rowsMustFlag = [
  ['rows out of recipientId order', edit(main, (d) => { d.transfers.reverse(); })],
  ['one recipient twice', edit(main, (d) => { d.transfers.splice(1, 0, clone(d.transfers[0])); })],
  ['a transfer dated before the lock\'s day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-11-30'; })],
  ['a transfer dated after the record\'s own day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-12-03'; })],
  ['a share held before the lock\'s day', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), GROUNDS[2], '2027-11-30'); })],
  ['a share held after the record\'s own day', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), GROUNDS[2], '2027-12-03'); })],
  ['an identifier of another month', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202710-q0syghrz8ym4'; })],
  ['an identifier of another recipient', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'psn-202711-rve04pdahejb'; })],
  ['a transfer paid in another currency with no rate', edit(main, (d) => { const r = row(d, HEALTH_RECEIPTED); delete r.rate; delete r.rateDate; })],
  ['a rate on a transfer paid in the record\'s currency', edit(main, (d) => { Object.assign(row(d, EDUCATION_SENT), { rate: '1.0000', rateDate: '2027-11-30' }); })],
  ['a transfer paid in the record\'s currency, not for its share', edit(main, (d) => { row(d, EDUCATION_SENT).paidAmountMinor -= 1; })],
  ['a receipt reference none of the row\'s receipts carries', edit(main, (d) => { row(d, HEALTH_RECEIPTED).receiptRef = 'rct_01kmrb4x7e2q9w5n3t8v6y0zhb'; })],
  ['two bank lines', edit(main, (d) => { row(d, EDUCATION_SENT).evidence.push({ kind: 'bank-line', ref: 'SMPL-2027-12-01-0099' }); })],
  ['one receipt named twice', edit(main, (d) => { const r = row(d, HEALTH_RECEIPTED); r.evidence.push(clone(r.evidence[1])); })],
  ['a record dated before its lock', edit(main, (d) => { d.generatedAt = shifted(d.lockedAt, -1); })],
];
const regenMustFlag = [
  ['a receipt withdrawn', edit(later, (d) => { const r = row(d, HEALTH_RECEIPTED); delete r.receiptRef; r.evidence = r.evidence.filter((e) => e.kind !== 'recipient-receipt'); })],
  ['a transfer gone back to held with no note', edit(later, (d) => { delete row(d, HEALTH_RETURNED).note; })],
  ['a transfer gone back to scheduled with no note', edit(later, (d) => {
    const r = row(d, HEALTH_RETURNED);
    for (const member of ['heldOn', 'ground', 'note']) delete r[member];
    r.status = 'scheduled';
  })],
  ['a share that changed', edit(later, (d) => { row(d, EDUCATION_SENT).amountMinor -= 1; row(d, EDUCATION_RETRIED).amountMinor += 1; })],
  ['a transfer re-dated with no later attempt', edit(later, (d) => { row(d, HEALTH_RECEIPTED).date = '2027-12-02'; })],
  ['a transfer whose charges changed with no later attempt', edit(later, (d) => { row(d, HEALTH_RECEIPTED).chargesMinor += 1; })],
  ['a transfer that paid another amount with no later attempt', edit(later, (d) => { row(d, HEALTH_RECEIPTED).paidAmountMinor -= 1; })],
  ['a transfer whose rate changed with no later attempt', edit(later, (d) => { row(d, HEALTH_RECEIPTED).rate = '1.0613'; })],
  ['a transfer whose release mark went with no later attempt', edit(later, (d) => { delete row(d, EDUCATION_SENT).singleRelease; })],
  ['a later record dated before the earlier one', edit(later, (d) => { d.generatedAt = shifted(main.generatedAt, -1); })],
  ['a row gone', edit(later, (d) => { d.transfers = d.transfers.filter((r) => r.recipientId !== HEALTH_RETURNED); })],
];
const chargesMustFlag = [
  ['charges one minor unit above what the debit line booked', edit(main, (d) => { row(d, HEALTH_RECEIPTED).chargesMinor += 1; }), plantedStatement(main)],
  ['charges of 0 where the debit line booked more than the share', main, plantedStatement(edit(main, (d) => { row(d, EDUCATION_SENT).chargesMinor = 12; }))],
  ['a debit line booked in another currency', main, plantedStatement(main).map((s) => ({ ...s, doc: { ...s.doc, lines: s.doc.lines.map((l) => ({ ...l, currency: 'EUR' })) } }))],
  ['two transfer-out lines carrying one identifier', main, [...plantedStatement(main), ...plantedStatement(main)]],
];
const mustPass = [
  ['the record as first published', main, null],
  ['the record regenerated with a later attempt sent, a receipt and a transfer that came back and is held', later, main],
  ['the share that came back sent again as attempt 2', edit(later, (d) => {
    const r = row(d, HEALTH_RETURNED);
    for (const member of ['heldOn', 'ground', 'note']) delete r[member];
    Object.assign(r, {
      status: 'transferred', date: '2027-12-03', endToEndId: 'psn-202711-y1zt0zesjnx9-2', paidAmountMinor: 21650, paidCurrency: 'GBP', rate: '0.8904',
      rateDate: '2027-12-02', chargesMinor: 91, evidence: [{ kind: 'bank-line', ref: 'SMPL-2027-12-03-0002' }],
    });
  }), later],
  ['the share that came back owed again before its hold, with its note', edit(later, (d) => {
    const r = row(d, HEALTH_RETURNED);
    for (const member of ['heldOn', 'ground']) delete r[member];
    r.status = 'scheduled';
  }), main],
  ['a share struck from its recipient after the close, held', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); }), null],
  ['a share held back on the day of the lock', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), GROUNDS[2], '2027-12-01'); }), null],
  ['every share still scheduled but one', edit(main, (d) => {
    for (const r of d.transfers.filter((x) => x.recipientId !== EDUCATION_SENT)) {
      for (const member of ['date', 'receiptRef', 'evidence', 'endToEndId', ...FIXED_ON_A_TRANSFER]) delete r[member];
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
for (const [what, exports] of exportsMustFlag) {
  if (linkProblems(main, 'planted', exports).length === 0) problems.push(`the link rules pass an export whose ${what}`);
}
if (linkProblems(main, 'planted', plantedExports(() => {})).length !== 0) problems.push('the link rules flag the export example copied as it stands');
for (const [what, doc] of rowsMustFlag) {
  if (rowProblems(doc, 'planted').length === 0) problems.push(`the row rules pass ${what}`);
}
for (const [what, doc] of regenMustFlag) {
  if (regenerationProblems(main, doc, 'planted').length === 0) problems.push(`the regeneration rule passes ${what}`);
}
for (const [what, doc, statements] of chargesMustFlag) {
  if (chargesProblems(doc, 'planted', statements).length === 0) problems.push(`the charges rule passes ${what}`);
}
for (const [what, doc, before] of mustPass) {
  const found = [
    ...linkProblems(doc, 'planted'),
    ...rowProblems(doc, 'planted'),
    ...chargesProblems(doc, 'planted', plantedStatement(doc)),
    ...(before ? regenerationProblems(before, doc, 'planted') : []),
  ];
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
  ['the transfer day\'s release mode on a row', edit(main, (d) => { row(d, EDUCATION_SENT).releaseMode = 'two-person'; })],
  ['a rate\'s source text on a row', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rateSource = 'SAMPLE reference rates'; })],
  ['a member the record does not have', edit(main, (d) => { d.passedOnMinor = 97264; })],
  ['the status frozen', edit(main, (d) => { row(d, EDUCATION_RETRIED).status = 'frozen'; })],
  ['a held share with no day held', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); delete row(d, EDUCATION_RETRIED).heldOn; })],
  ['a held share with no ground', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); delete row(d, EDUCATION_RETRIED).ground; })],
  ['a held share with an identifier', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); row(d, EDUCATION_RETRIED).endToEndId = 'psn-202711-cgyag0hmkcxb-2'; })],
  ['a held share with a day of transfer', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); row(d, EDUCATION_RETRIED).date = '2027-12-01'; })],
  ['a held share with evidence', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); row(d, EDUCATION_RETRIED).evidence = [{ kind: 'bank-line', ref: 'SMPL-2027-12-01-0014' }]; })],
  ['a held share with charges', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED)); row(d, EDUCATION_RETRIED).chargesMinor = 0; })],
  ['the cause a hold\'s record gives, as the ground', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), 'sanctions-removed'); })],
  ['screening as the ground', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), 'screening'); })],
  ['frozen as the ground', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), 'frozen'); })],
  ['a ground in capitals', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), 'Struck (Art. 7 Abs. 6)'); })],
  ['a ground on a transfer', edit(main, (d) => { row(d, EDUCATION_SENT).ground = GROUNDS[2]; })],
  ['a day held on a scheduled share', edit(main, (d) => { row(d, EDUCATION_RETRIED).heldOn = '2027-12-02'; })],
  ['a transfer with no day', edit(main, (d) => { delete row(d, EDUCATION_SENT).date; })],
  ['a transfer with no identifier', edit(main, (d) => { delete row(d, EDUCATION_SENT).endToEndId; })],
  ['a transfer without what it paid', edit(main, (d) => { delete row(d, EDUCATION_SENT).paidAmountMinor; })],
  ['a transfer without the currency it paid in', edit(main, (d) => { delete row(d, EDUCATION_SENT).paidCurrency; })],
  ['a transfer without its charges', edit(main, (d) => { delete row(d, EDUCATION_SENT).chargesMinor; })],
  ['a rate without its day', edit(main, (d) => { delete row(d, HEALTH_RECEIPTED).rateDate; })],
  ['a rate\'s day without the rate', edit(main, (d) => { row(d, EDUCATION_SENT).rateDate = '2027-11-30'; })],
  ['a rate as a number', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rate = 1.0612; })],
  ['a rate with an exponent', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rate = '1.0612e0'; })],
  ['a rate with a sign', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rate = '-1.0612'; })],
  ['a rate with a comma', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rate = '1,0612'; })],
  ['a release mark that is not true', edit(main, (d) => { row(d, EDUCATION_SENT).singleRelease = false; })],
  ['a release mark on a scheduled share', edit(main, (d) => { row(d, EDUCATION_RETRIED).singleRelease = true; })],
  ['what a transfer paid on a scheduled share', edit(main, (d) => { row(d, EDUCATION_RETRIED).paidAmountMinor = 24316; })],
  ['the currency a transfer paid in on a scheduled share', edit(main, (d) => { row(d, EDUCATION_RETRIED).paidCurrency = 'CHF'; })],
  ['a rate and its day on a scheduled share', edit(main, (d) => { Object.assign(row(d, EDUCATION_RETRIED), { rate: '1.0612', rateDate: '2027-11-30' }); })],
  ['charges on a scheduled share', edit(main, (d) => { row(d, EDUCATION_RETRIED).chargesMinor = 0; })],
  ['charges in fractions of a minor unit', edit(main, (d) => { row(d, HEALTH_RECEIPTED).chargesMinor = 45.5; })],
  ['a payment of 0', edit(main, (d) => { row(d, EDUCATION_SENT).paidAmountMinor = 0; })],
  ['a paid currency in lowercase', edit(main, (d) => { row(d, HEALTH_RECEIPTED).paidCurrency = 'eur'; })],
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
  ['an identifier with its note\'s label', edit(main, (d) => { row(d, EDUCATION_SENT).endToEndId = 'EndToEndId psn-202711-q0syghrz8ym4'; })],
  ['a recipient id in capitals', edit(main, (d) => { row(d, EDUCATION_SENT).recipientId = 'rcp_0SVACMGRATB4F4Q0SYGHRZ8YM4'; })],
  ['a category in capitals', edit(main, (d) => { row(d, EDUCATION_SENT).category = 'Education'; })],
  ['an empty note', edit(main, (d) => { row(d, EDUCATION_SENT).note = ''; })],
  ['a day that is not a day', edit(main, (d) => { row(d, EDUCATION_SENT).date = '2027-12-1'; })],
  ['a rate\'s day that is not a day', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rateDate = '2027-11-3'; })],
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
  ['a share held on the 30th of February', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), GROUNDS[2], '2028-02-30'); })],
  ['a rate of the 30th of February', edit(main, (d) => { row(d, HEALTH_RECEIPTED).rateDate = '2028-02-30'; })],
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
  ...GROUNDS.map((ground) => [`a share held, ${ground}`, edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), ground); })]),
  ['a held share with its note', edit(main, (d) => { holding(row(d, EDUCATION_RETRIED), GROUNDS[1]); row(d, EDUCATION_RETRIED).note = RETURNED_NOTE; })],
  ['a transfer whose bank gave no reference and whose receipt has not arrived', edit(main, (d) => { delete row(d, EDUCATION_SENT).evidence; })],
  ['a transfer with two receipts', edit(main, (d) => {
    row(d, HEALTH_RECEIPTED).evidence.push({ kind: 'recipient-receipt', ref: 'rct_01kmrb4x7e2q9w5n3t8v6y0zhe', sha256: '1'.repeat(64) });
  })],
  ['charges below 0, a conversion that cost less than the share', edit(main, (d) => { row(d, HEALTH_RECEIPTED).chargesMinor = -23; })],
  ['a transfer two board members released', edit(main, (d) => { delete row(d, EDUCATION_SENT).singleRelease; })],
  ['a bank reference of the full 35 characters', edit(main, (d) => { row(d, EDUCATION_SENT).evidence[0].ref = `SMPL-${'0'.repeat(30)}`; })],
  ['the ninth attempt', edit(main, (d) => { row(d, EDUCATION_RETRIED).endToEndId = 'psn-202711-cgyag0hmkcxb-9'; })],
  ['a note on a transfer', edit(main, (d) => { row(d, EDUCATION_SENT).note = 'SAMPLE note.'; })],
  ['a month whose only transfer came back', edit(main, (d) => {
    for (const r of d.transfers) {
      for (const member of ['date', 'receiptRef', 'evidence', 'endToEndId', ...FIXED_ON_A_TRANSFER]) delete r[member];
      r.status = 'scheduled';
    }
    row(d, EDUCATION_SENT).note = RETURNED_NOTE;
  })],
  ['a single row', edit(main, (d) => { d.transfers = d.transfers.slice(0, 1); })],
  ['a fixture plane', edit(main, (d) => { d.source = 'fixture'; })],
  ['a production plane', edit(main, (d) => { d.source = 'platform'; })],
];
for (const [what, doc] of admit) {
  if (!transfersSchema(doc)) problems.push(`transfers.v1: refuses ${what} — ${JSON.stringify(transfersSchema.errors?.[0] ?? {})}`);
  if (!looseSchema(doc)) problems.push(`transfers.v1 without format: refuses ${what} — ${JSON.stringify(looseSchema.errors?.[0] ?? {})}`);
}

/* ------------------------------------------- cost-support.v1 1.6.0: a document's own transfer rows */

/* A document written by hand may carry rows of its own, and from 1.6.0 on states each as this record does. No cost-support
   example carries a held share, a later attempt, what a transfer paid or the new class, so the row's rules are held to
   documents edited from `cost-support.v1.example.json`, each one edit away from a document the contract admits. */
const costSupportSchema = ajv.getSchema(`${BASE}/cost-support.v1.json`);
if (!costSupportSchema) fail(['cost-support.v1 did not resolve by $id'], '');
const looseCostSupport = createAjv().compile(withoutFormats(readJson(join(SCHEMA_DIR, 'cost-support.v1.json'))));
const handWritten = readJson(join(EXAMPLE_DIR, 'cost-support.v1.example.json'));

/** The row the plants edit: a transfer of June 2027 in the document's currency, as 1.5.0 states one, with no note. */
const OWN_ROW = 'rcp_tg8g3ps3smxzdpy1zt0zesjnx9';
/** Its identifier in the short form: the month and the last 12 characters of the recipient's ULID (1.3.0). */
const OWN_SHORT = 'psn-202706-y1zt0zesjnx9';
const RETURNED_IN_JULY = 'Sent on 2027-07-20 and returned by the receiving bank, so the share is owed again until it is sent again.';

/** The example with `change` applied to its own row. */
const ownRow = (change) => edit(handWritten, (d) => { change(row(d, OWN_ROW)); });
/** The row held (struck by default), with its day and ground and nothing a transfer or an attempt has. */
const holdingOwn = (target, ground = GROUNDS[0], heldOn = '2027-07-15') => holding(target, ground, heldOn);
/** The row scheduled, as 1.5.0 states one: no day, receipt, evidence or note, and nothing a transfer has. */
const scheduling = (target) => {
  for (const member of ['date', 'receiptRef', 'evidence', 'note', ...FIXED_ON_A_TRANSFER]) delete target[member];
  target.status = 'scheduled';
};
/** What the row's transfer paid in the document's own currency, with charges of 0, and `more`. */
const paying = (target, more = {}) => Object.assign(target, { paidAmountMinor: target.amountMinor, paidCurrency: handWritten.currency, chargesMinor: 0 }, more);
/** The same transfer paid in EUR: 4983 at 1.0612, rounded down (ops decision D177 item 2), its debit line 2 below the share. */
const converting = (target, more = {}) => Object.assign(target, { paidAmountMinor: 5287, paidCurrency: 'EUR', rate: '1.0612', rateDate: '2027-07-19', chargesMinor: -2 }, more);

const costSupportRefuse = [
  ['a held share with no day held', ownRow((r) => { holdingOwn(r); delete r.heldOn; })],
  ['a held share with no ground', ownRow((r) => { holdingOwn(r); delete r.ground; })],
  ['a held share with a day of transfer', ownRow((r) => { holdingOwn(r); r.date = '2027-07-20'; })],
  ['a held share with a receipt', ownRow((r) => { holdingOwn(r); r.receiptRef = 'RCPT-2027-06-HEALTH-2'; })],
  ['a held share with evidence', ownRow((r) => { holdingOwn(r); r.evidence = [{ kind: 'bank-line', ref: 'STMT-2027-07-0115' }]; })],
  ['a held share with an identifier', ownRow((r) => { holdingOwn(r); r.endToEndId = `${OWN_SHORT}-2`; })],
  ['a held share with what a transfer paid', ownRow((r) => { holdingOwn(r); r.paidAmountMinor = 4983; })],
  ['a held share with charges', ownRow((r) => { holdingOwn(r); r.chargesMinor = 0; })],
  ['a held share with the release mark', ownRow((r) => { holdingOwn(r); r.singleRelease = true; })],
  ['frozen as the ground', ownRow((r) => holdingOwn(r, 'frozen'))],
  ['the cause a hold\'s record gives, as the ground', ownRow((r) => holdingOwn(r, 'sanctions-removed'))],
  ['screening as the ground', ownRow((r) => holdingOwn(r, 'screening'))],
  ['a ground in capitals', ownRow((r) => holdingOwn(r, 'Struck (Art. 7 Abs. 6)'))],
  ['the status frozen', ownRow((r) => { scheduling(r); r.status = 'frozen'; })],
  ['a day held on a transfer', ownRow((r) => { r.heldOn = '2027-07-15'; })],
  ['a ground on a transfer', ownRow((r) => { r.ground = GROUNDS[2]; })],
  ['a day held on a scheduled share', ownRow((r) => { scheduling(r); r.heldOn = '2027-07-15'; })],
  ['a ground on a scheduled share', ownRow((r) => { scheduling(r); r.ground = GROUNDS[2]; })],
  ['what a transfer paid on a scheduled share', ownRow((r) => { scheduling(r); r.paidAmountMinor = 4983; })],
  ['the currency a transfer paid in on a scheduled share', ownRow((r) => { scheduling(r); r.paidCurrency = 'CHF'; })],
  ['a rate and its day on a scheduled share', ownRow((r) => { scheduling(r); Object.assign(r, { rate: '1.0612', rateDate: '2027-07-19' }); })],
  ['charges on a scheduled share', ownRow((r) => { scheduling(r); r.chargesMinor = 0; })],
  ['the release mark on a scheduled share', ownRow((r) => { scheduling(r); r.singleRelease = true; })],
  ['a rate without its day', ownRow((r) => { converting(r); delete r.rateDate; })],
  ['a rate\'s day without the rate', ownRow((r) => { converting(r); delete r.rate; })],
  ['a rate as a number', ownRow((r) => converting(r, { rate: 1.0612 }))],
  ['a rate with an exponent', ownRow((r) => converting(r, { rate: '1.0612e0' }))],
  ['a rate with a sign', ownRow((r) => converting(r, { rate: '-1.0612' }))],
  ['a rate with a comma', ownRow((r) => converting(r, { rate: '1,0612' }))],
  ['a release mark that is not true', ownRow((r) => paying(r, { singleRelease: false }))],
  ['a payment of 0', ownRow((r) => paying(r, { paidAmountMinor: 0 }))],
  ['a payment in fractions of a minor unit', ownRow((r) => paying(r, { paidAmountMinor: 4983.5 }))],
  ['a paid currency in lowercase', ownRow((r) => converting(r, { paidCurrency: 'eur' }))],
  ['charges in fractions of a minor unit', ownRow((r) => paying(r, { chargesMinor: 0.5 }))],
  ['attempt 1 written as a suffix', ownRow((r) => { r.endToEndId = `${OWN_SHORT}-1`; })],
  ['a tenth attempt', ownRow((r) => { r.endToEndId = `${OWN_SHORT}-10`; })],
  ['a suffix with no attempt', ownRow((r) => { r.endToEndId = `${OWN_SHORT}-`; })],
  ['the long form with a suffix', ownRow((r) => { r.endToEndId = `${r.endToEndId}-2`; })],
  ['a class no rule names', edit(handWritten, (d) => { d.directCosts[0].class = 'fees-account-charge'; })],
];
/* The contract's days carry `format` alone, as every day of it always has: a day that does not exist is refused by `format` alone. */
const costSupportRefuseByFormatOnly = [
  ['a share held on the 30th of February', ownRow((r) => holdingOwn(r, GROUNDS[2], '2027-02-30'))],
  ['a rate of the 30th of February', ownRow((r) => converting(r, { rateDate: '2027-02-30' }))],
];
const costSupportAdmit = [
  ['six transfers as 1.5.0 states them (the example as it stands)', handWritten],
  ['a scheduled share as 1.5.0 states one', ownRow(scheduling)],
  ...GROUNDS.map((ground) => [`a share held, ${ground}`, ownRow((r) => holdingOwn(r, ground))]),
  ['a held share with its note', ownRow((r) => { holdingOwn(r, GROUNDS[1], '2027-07-21'); r.note = RETURNED_IN_JULY; })],
  ['a transfer with what it paid in the document\'s currency, charges of 0 and the release mark', ownRow((r) => paying(r, { singleRelease: true }))],
  ['a transfer two board members released, its charges above 0', ownRow((r) => paying(r, { chargesMinor: 45 }))],
  ['a transfer paid in another currency with its rate and the rate\'s day, its charges below 0', ownRow((r) => converting(r))],
  ['the short form of a first attempt', ownRow((r) => { r.endToEndId = OWN_SHORT; })],
  ['the second attempt', ownRow((r) => { r.endToEndId = `${OWN_SHORT}-2`; })],
  ['the ninth attempt', ownRow((r) => { r.endToEndId = `${OWN_SHORT}-9`; })],
  ['an invoice of the class fees-account-charges', edit(handWritten, (d) => { d.directCosts[0].class = 'fees-account-charges'; })],
];
for (const [what, doc] of costSupportRefuse) {
  if (costSupportSchema(doc)) problems.push(`cost-support.v1: admits ${what}`);
  if (looseCostSupport(doc)) problems.push(`cost-support.v1 without format: admits ${what}`);
}
for (const [what, doc] of costSupportRefuseByFormatOnly) {
  if (costSupportSchema(doc)) problems.push(`cost-support.v1: admits ${what}`);
}
for (const [what, doc] of costSupportAdmit) {
  if (!costSupportSchema(doc)) problems.push(`cost-support.v1: refuses ${what} — ${JSON.stringify(costSupportSchema.errors?.[0] ?? {})}`);
  if (!looseCostSupport(doc)) problems.push(`cost-support.v1 without format: refuses ${what} — ${JSON.stringify(looseCostSupport.errors?.[0] ?? {})}`);
}

fail(
  problems,
  `transfers record: ${records.length} example(s), ${rows} row(s), each linked to a cost-support example by its bytes' SHA-256 ` +
    `with the rows summing to its passedOnMinor (${againstExport} also held to the month's export's disburse rows; ` +
    `${laterAttempt} with a later attempt scheduled, ${returned} with a transfer that came back, ${held} with a held share, ` +
    `${converted} with a transfer paid in another currency, ${singleReleased} with a transfer one board member released, ` +
    `${withReceipt} with a receipt; ${pairs} regeneration pair(s)); cost-support.v1 identity (4) is met by all ${identityChecked} ` +
    `cost-support example(s) and gives the restated verdict on ${identityPlants} planted pairs; the link rules flag ` +
    `${linkMustFlag.length} plants and ${exportsMustFlag.length} planted exports, the row rules ${rowsMustFlag.length}, the ` +
    `regeneration rule ${regenMustFlag.length} and the charges rule ${chargesMustFlag.length}, and ${mustPass.length} pass; ` +
    `${refuse.length} refusals stand with and without format, ${refuseByFormatOnly.length} by format alone, and ${admit.length} admissions; ` +
    `a cost-support.v1 document's own transfer rows (1.6.0): ${costSupportRefuse.length} refusals with and without format, ` +
    `${costSupportRefuseByFormatOnly.length} by format alone, and ${costSupportAdmit.length} admissions`,
);

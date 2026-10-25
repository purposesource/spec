#!/usr/bin/env node
/**
 * Gate: the published statement of the fees account keeps the rules its contract promises, and
 * the contract still refuses what must never be published.
 *
 * `fees-account-statement.v1` publishes one locked month's balances and booked lines of the fees
 * account (statutes Art. 12 para. 1, Art. 20 para. 1). JSON Schema can say that a member exists and
 * has the right shape; it cannot say that a line was booked in the document's month, that the lines
 * are in date order, that they lead from the opening balance to the closing one, or that a document's
 * instant follows the lock. The description promises those, so this gate holds the examples to them:
 *
 *   THE STATEMENT (`examples/fees-account-statement.v1*.example.json`)
 *     month      every line's `bookingDate` is in `month`;
 *     order      the lines are in booking-date order, earliest first;
 *     bridge     `openingBalanceMinor`, plus every `credit` line's `amountMinor`, less every `debit`
 *                line's, is `closingBalanceMinor`, every line is in the document's `currency`, and the
 *                month is not before `accountOpenedOn`'s (PS-2299). The examples show a month without
 *                movement, whose two balances are equal, and the rule itself is held to five planted
 *                documents, three it flags and two it passes;
 *     effect     an `effectMonth` is later than the line's booking month;
 *     dated      `generatedAt`, the latest of the lock's instant and the instants of the lines and
 *                classes the document shows, is never earlier than `lockedAt`, and is later when the
 *                document shows a class that takes effect after its booking month (`effectMonth`),
 *                a class recorded after the lock. A line with no class implies nothing about it:
 *                the line may have reached the store late or have had no class when the month
 *                locked, and a line or class stamped between the lock run's start and its commit
 *                dates a fully classed month past `lockedAt` too. The examples show a class taking
 *                effect later, a line with no class yet and a month dated at its lock, and the rule
 *                itself is held to four planted documents, two it flags and two it passes.
 *
 *   REFUSALS. The contract still refuses, by its own keywords: every member that could carry a
 *   payer or a person (a counterparty's name or account, remittance text, return details, who
 *   classed a line and why), a line classed `personnel` (a personnel cost is published as one
 *   line per function, never by name, so a month holding one is withheld), an end-to-end
 *   identifier on any line but the Association's own transfers or in any form but the
 *   Association's own (a payer's text, the 42-character form no bank carries, an attempt outside 2
 *   to 9), an `effectMonth` with no class, a document without either balance, its currency or the
 *   day the account opened, a balance in anything but whole minor units, a zero amount, ISO's
 *   direction codes in place of the words, a class off the list, and the `registry-v0` label. It
 *   still admits what a real month holds: a line with no class yet, a transfer line whose entry
 *   carries no identifier of that form, the ninth attempt, a returned later attempt, a reversal, a
 *   line with no value date or bank reference, a debit balance, and a month without movement.
 *
 * Run: node scripts/check-fees-account-statement.mjs
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv } = createValidatorWithAllSchemas();
const statementSchema = ajv.getSchema(`${BASE}/fees-account-statement.v1.json`);
if (!statementSchema) {
  fail(['fees-account-statement.v1 did not resolve by $id'], '');
}

const monthOf = (day) => String(day).slice(0, 7);
const instant = (text) => Date.parse(text);

/* ---------------------------------------------------------------------------- the examples */

const statementFiles = readdirSync(EXAMPLE_DIR)
  .filter((name) => /\.example\.json$/.test(name))
  .filter((name) => name.startsWith('fees-account-statement.v1.'));

/**
 * The dating rule's findings for one document: `generatedAt` never earlier than `lockedAt`, and later
 * than it when a line shows a class that takes effect after its booking month, which the store admits
 * only once the month is locked. A line with no class, and a later `generatedAt` beside every line
 * classed in its own month, are not findings.
 */
const datingProblems = (doc, at) => {
  const found = [];
  const generated = instant(doc.generatedAt);
  const locked = instant(doc.lockedAt);
  const classedLater = doc.lines.filter((line) => line.effectMonth !== undefined).length;
  if (generated < locked) found.push(`${at}: generatedAt ${doc.generatedAt} is earlier than lockedAt ${doc.lockedAt}`);
  if (classedLater > 0 && !(generated > locked)) {
    found.push(`${at}: shows ${classedLater} class(es) taking effect after their booking month, each recorded after the lock, and generatedAt ${doc.generatedAt} is not later than lockedAt ${doc.lockedAt}`);
  }
  return found;
};

/**
 * The balance rule's findings for one document (PS-2299): the lines lead from `openingBalanceMinor`
 * to `closingBalanceMinor` (credits added, debits taken away), every line is in the document's
 * `currency`, and the month is not before the month of `accountOpenedOn`.
 */
const balanceProblems = (doc, at) => {
  const found = [];
  const net = doc.lines.reduce((sum, line) => sum + (line.direction === 'credit' ? line.amountMinor : -line.amountMinor), 0);
  if (doc.openingBalanceMinor + net !== doc.closingBalanceMinor) {
    found.push(`${at}: openingBalanceMinor ${doc.openingBalanceMinor} and the lines (${net}) give ${doc.openingBalanceMinor + net}, and closingBalanceMinor is ${doc.closingBalanceMinor}`);
  }
  doc.lines.forEach((line, index) => {
    if (line.currency !== doc.currency) found.push(`${at}: lines[${index}] is in ${line.currency}, and the balances are in ${doc.currency}`);
  });
  if (monthOf(doc.accountOpenedOn) > doc.month) {
    found.push(`${at}: the month ${doc.month} is before the account's opening month ${monthOf(doc.accountOpenedOn)}`);
  }
  return found;
};

let lines = 0;
let classedLater = 0;
let unclassed = 0;
let atLock = 0;
let withoutMovement = 0;
for (const name of statementFiles) {
  const at = `examples/${name}`;
  const doc = readJson(join(EXAMPLE_DIR, name));
  problems.push(...balanceProblems(doc, at));
  if (doc.lines.length === 0) withoutMovement += 1;
  let previous = '';
  doc.lines.forEach((line, index) => {
    lines += 1;
    const where = `${at}: lines[${index}]`;
    if (monthOf(line.bookingDate) !== doc.month) problems.push(`${where} was booked ${line.bookingDate}, outside the document's month ${doc.month}`);
    if (line.bookingDate < previous) problems.push(`${where} (${line.bookingDate}) comes after a line booked ${previous}: the lines are in booking-date order`);
    previous = line.bookingDate;
    if (line.effectMonth !== undefined && !(line.effectMonth > monthOf(line.bookingDate))) {
      problems.push(`${where}: effectMonth ${line.effectMonth} is not later than its booking month ${monthOf(line.bookingDate)}`);
    }
  });
  problems.push(...datingProblems(doc, at));
  if (doc.lines.some((line) => line.effectMonth !== undefined)) classedLater += 1;
  if (doc.lines.some((line) => line.class === undefined)) unclassed += 1;
  if (instant(doc.generatedAt) === instant(doc.lockedAt)) atLock += 1;
}
if (statementFiles.length === 0) problems.push('no fees-account-statement.v1 example — this gate would pass vacuously');
if (classedLater === 0) problems.push('no fees-account-statement.v1 example shows a class taking effect after its booking month');
if (unclassed === 0) problems.push('no fees-account-statement.v1 example lists a line with no class yet');
if (atLock === 0) problems.push('no fees-account-statement.v1 example is dated at its lock');
if (withoutMovement === 0) problems.push('no fees-account-statement.v1 example is a month without movement');

/* ---------------------------------------------------------------- the main example, edited */

const statement = readJson(join(EXAMPLE_DIR, 'fees-account-statement.v1.example.json'));
const clone = (doc) => JSON.parse(JSON.stringify(doc));
const withStatement = (edit) => {
  const doc = clone(statement);
  edit(doc);
  return doc;
};
/** The first line of the main example with the given class. */
const lineOf = (doc, cls) => {
  const found = doc.lines.find((line) => line.class === cls);
  if (!found) throw new Error(`examples/fees-account-statement.v1.example.json has no ${cls} line for the edits below`);
  return found;
};

/* The dating rule, held to planted documents: the two it must flag, and the two the store can
   produce that it must pass, so neither "a line with no class was delivered late" nor "a fully
   classed month is dated at its lock", both untrue of the store, can creep in unnoticed. */
const shifted = (at, seconds) => new Date(instant(at) + seconds * 1000).toISOString().replace(/\.000Z$/, 'Z');
const mustFlag = [
  ['a document dated before its lock', withStatement((d) => { d.generatedAt = shifted(d.lockedAt, -1); })],
  ['a class taking effect after its booking month in a document dated at its lock', withStatement((d) => {
    d.generatedAt = d.lockedAt;
    lineOf(d, 'interest').effectMonth = '2027-08';
  })],
];
const mustPass = [
  ['a line still without a class at the lock, in a document dated at its lock', withStatement((d) => {
    d.generatedAt = d.lockedAt;
    delete lineOf(d, 'bank-charge').class;
  })],
  ['a month classed in full and dated after its lock by a record stamped before the lock committed', withStatement((d) => { d.generatedAt = shifted(d.lockedAt, 41); })],
];
for (const [what, doc] of mustFlag) {
  if (datingProblems(doc, 'planted').length === 0) problems.push(`the dating rule passes ${what}`);
}
for (const [what, doc] of mustPass) {
  const found = datingProblems(doc, 'planted');
  if (found.length > 0) problems.push(`the dating rule flags ${what} (${found[0]})`);
}

/* The balance rule, held to planted documents the same way: three it must flag, and two the store
   produces that it must pass. */
const balancesMustFlag = [
  ['lines that do not lead from the opening balance to the closing one', withStatement((d) => { d.closingBalanceMinor += 1; })],
  ['a line in another currency than the balances', withStatement((d) => { lineOf(d, 'invoice').currency = 'EUR'; })],
  ['a month before the account\'s opening month', withStatement((d) => { d.accountOpenedOn = '2027-08-01'; })],
];
const balancesMustPass = [
  ['a month without movement whose two balances are equal', withStatement((d) => { d.lines = []; d.closingBalanceMinor = d.openingBalanceMinor; })],
  ['an account overdrawn all month', withStatement((d) => { d.openingBalanceMinor -= 2000000; d.closingBalanceMinor -= 2000000; })],
];
for (const [what, doc] of balancesMustFlag) {
  if (balanceProblems(doc, 'planted').length === 0) problems.push(`the balance rule passes ${what}`);
}
for (const [what, doc] of balancesMustPass) {
  const found = balanceProblems(doc, 'planted');
  if (found.length > 0) problems.push(`the balance rule flags ${what} (${found[0]})`);
}

/* ------------------------------------------------------------------------------ refusals */

const mustRefuse = [
  ['a counterparty name', withStatement((d) => { lineOf(d, 'misdirected').counterpartyName = 'SAMPLE payer'; })],
  ['a counterparty account', withStatement((d) => { lineOf(d, 'transfer-out').counterpartyAccount = 'CH0000000000000000000'; })],
  ['remittance text', withStatement((d) => { lineOf(d, 'misdirected').remittance = 'SAMPLE invoice 123'; })],
  ['return details', withStatement((d) => { lineOf(d, 'transfer-returned').returnInfo = { reasonCode: 'AC04' }; })],
  ['who classed a line', withStatement((d) => { lineOf(d, 'misdirected').classifiedBy = 'acc_0000000000000000000000000a'; })],
  ['a steward\'s reason', withStatement((d) => { lineOf(d, 'misdirected').reason = 'SAMPLE: paid twice by a person'; })],
  ['an internal line id', withStatement((d) => { lineOf(d, 'invoice').bslId = 'bsl_0000000000000000000000000a'; })],
  ['a line classed personnel', withStatement((d) => { lineOf(d, 'invoice').class = 'personnel'; })],
  ['an end-to-end id on a payout credit', withStatement((d) => { lineOf(d, 'payout-credit').endToEndId = 'psn-202706-7kq2m4vx9tra'; })],
  ['an end-to-end id on a misdirected credit', withStatement((d) => { lineOf(d, 'misdirected').endToEndId = 'psn-202706-7kq2m4vx9tra'; })],
  ['an end-to-end id on a line with no class', withStatement((d) => { delete lineOf(d, 'transfer-out').class; })],
  ['a payer\'s own end-to-end text on a transfer line', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'NOTPROVIDED'; })],
  ['the 42-character form no bank carries', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'psn-2027-06-rcp_f5cc8xgz81c00nrve04pdahejb'; })],
  ['an end-to-end id in capitals', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'psn-202706-7KQ2M4VX9TRA'; })],
  ['attempt 1 written as a suffix', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'psn-202706-7kq2m4vx9tra-1'; })],
  ['a tenth attempt', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'psn-202706-7kq2m4vx9tra-10'; })],
  ['an effectMonth with no class', withStatement((d) => { const line = lineOf(d, 'interest'); delete line.class; line.effectMonth = '2027-08'; })],
  ['no opening balance', withStatement((d) => { delete d.openingBalanceMinor; })],
  ['no closing balance', withStatement((d) => { delete d.closingBalanceMinor; })],
  ['a balance in anything but whole minor units', withStatement((d) => { d.openingBalanceMinor = 12500.5; })],
  ['a balance written as a string', withStatement((d) => { d.closingBalanceMinor = String(d.closingBalanceMinor); })],
  ['no currency', withStatement((d) => { delete d.currency; })],
  ['a currency not in ISO 4217\'s form', withStatement((d) => { d.currency = 'chf'; })],
  ['no day the account opened', withStatement((d) => { delete d.accountOpenedOn; })],
  ['a day the account opened that is no date', withStatement((d) => { d.accountOpenedOn = '17.05.2027'; })],
  ['a zero amount', withStatement((d) => { lineOf(d, 'interest').amountMinor = 0; })],
  ['a negative amount', withStatement((d) => { lineOf(d, 'bank-charge').amountMinor = -450; })],
  ['ISO\'s direction code in place of the word', withStatement((d) => { lineOf(d, 'payout-credit').direction = 'CRDT'; })],
  ['a class off the list', withStatement((d) => { lineOf(d, 'invoice').class = 'donation'; })],
  ['a bank reference over 35 characters', withStatement((d) => { lineOf(d, 'invoice').bankReference = 'R'.repeat(36); })],
  ['a bank reference with a line break', withStatement((d) => { lineOf(d, 'invoice').bankReference = 'STMT-2027-07\n0251'; })],
  ['a bank reference starting with a space', withStatement((d) => { lineOf(d, 'invoice').bankReference = ' STMT-2027-07-0251'; })],
  ['the source registry-v0', withStatement((d) => { d.source = 'registry-v0'; })],
  ['no lock instant', withStatement((d) => { delete d.lockedAt; })],
];
for (const [what, doc] of mustRefuse) {
  if (statementSchema(doc)) problems.push(`fees-account-statement.v1: admits ${what}`);
}

const mustAdmit = [
  ['a line with no class yet', withStatement((d) => { delete lineOf(d, 'bank-charge').class; })],
  ['a transfer line whose entry carries no identifier of the Association\'s form', withStatement((d) => { delete lineOf(d, 'transfer-out').endToEndId; })],
  ['the ninth attempt', withStatement((d) => { lineOf(d, 'transfer-out').endToEndId = 'psn-202706-7kq2m4vx9tra-9'; })],
  ['a returned later attempt', withStatement((d) => { lineOf(d, 'transfer-returned').endToEndId = 'psn-202706-3nz8hb6wq1cd-2'; })],
  ['a reversal', withStatement((d) => { const line = lineOf(d, 'payout-credit'); line.direction = 'debit'; line.reversal = true; })],
  ['a line with no value date and no bank reference', withStatement((d) => { const line = lineOf(d, 'interest'); delete line.valueDate; delete line.bankReference; })],
  ['a line in another currency', withStatement((d) => { lineOf(d, 'invoice').currency = 'EUR'; })],
  ['a single line', withStatement((d) => { d.lines = d.lines.slice(0, 1); })],
  ['a month without movement', withStatement((d) => { d.lines = []; d.closingBalanceMinor = d.openingBalanceMinor; })],
  ['a debit balance', withStatement((d) => { d.openingBalanceMinor = -1250; d.closingBalanceMinor = -1250; })],
];
for (const [what, doc] of mustAdmit) {
  if (!statementSchema(doc)) problems.push(`fees-account-statement.v1: refuses ${what} — ${JSON.stringify(statementSchema.errors?.[0] ?? {})}`);
}

fail(
  problems,
  `fees-account statement: ${statementFiles.length} example(s) keep ${lines} line(s) in their month and in date order, ` +
    `bridging their balances (${classedLater} showing a class that takes effect after its booking month, ${unclassed} a line ` +
    `with no class yet, ${atLock} dated at its lock, ${withoutMovement} without movement); the dating rule flags ` +
    `${mustFlag.length} planted documents and passes ${mustPass.length}, the balance rule flags ${balancesMustFlag.length} ` +
    `and passes ${balancesMustPass.length}, and ${mustRefuse.length} refusals and ${mustAdmit.length} admissions stand`,
);

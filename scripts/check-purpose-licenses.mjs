#!/usr/bin/env node
/**
 * Gate: the compliance export keeps the form its contract promises, and the contract still refuses what the file must
 * never hold.
 *
 * `purpose-licenses.v1` is one line of `purpose-licenses.csv` (FS-04 FS04-067): the organisation's own download of the
 * Entitlements its Licences page lists, one line each. JSON Schema can say what one line holds. It cannot say how the
 * lines are framed in the file, that the header names the columns in their order, that no two lines share an
 * Entitlement, or that the lines come in the page's order. The description promises those, so this gate holds the
 * examples to them:
 *
 *   THE HEADER (`schemas/purpose-licenses.v1.json`)
 *     `x-psn.csvHeader` is the schema's own properties in their order, every one of them required, and no other
 *     member is admitted: a line holds the header's columns and nothing else.
 *
 *   THE FILE (`examples/purpose-licenses.v1*.example.csv`)
 *     form      every character printable ASCII, so no byte-order mark, no carriage return and no tab; every line, the
 *               header included, ends with a line feed; no blank line; no double quote anywhere, since no field of
 *               this file is ever quoted;
 *     header    the first line is `x-psn.csvHeader`;
 *     rows      every other line has one field per column and validates against the schema;
 *     one each  no two lines share an `entId`;
 *     order     the page's: the Entitlements with no term first, then by `termStart`, latest first, then by `entId`,
 *               ascending.
 *   Each rule is held to a planted file it must flag, and the examples between them show every lane sold, every
 *   status, a term-less row of each kind, a Project the registry no longer lists, a legacy repository id and an
 *   organisation with nothing to list.
 *
 *   REFUSALS. The contract still refuses, by its own keywords: a column the header does not name (an amount, a payer,
 *   a coverage answer) and a missing one; the `donation` lane; the published record's `void` and the coverage answer's
 *   `lapsed-in-grace` as a status; the two stored holds a buyer is never shown, and a sub-state outside `pending`; a
 *   Project with no repository, a Pass or a Portfolio naming one, and a name without its id; a term with one date, an
 *   `active`, `grace` or `suspended` row with none, and a day in any other form; a field a spreadsheet would read as a
 *   formula (`=`, `+`, `-` or `@` first); a band with a currency; and a boolean in any spelling but `true` and `false`.
 *   It still admits what a real Licences page holds: a pending purchase with and without a sub-state, a refunded or a
 *   lapsed purchase with no term, a revoked and a suspended term, a grace window not recorded, a Project the registry
 *   no longer lists, a legacy repository id, a Portfolio, a term with no Schedule version and no band, and a test-mode
 *   Entitlement. Each refusal and admission holds twice: where `format` is asserted, and where it is an annotation, as
 *   draft 2020-12 has it by default, except 30 February, which only an asserted `format` can see.
 *
 * Run: node scripts/check-purpose-licenses.mjs
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { csvTable } from './lib/csv.mjs';
import { EXAMPLE_DIR, SCHEMA_DIR, createAjv, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const schema = readJson(join(SCHEMA_DIR, 'purpose-licenses.v1.json'));
const { ajv } = createValidatorWithAllSchemas();
const validateRow = ajv.getSchema(schema.$id);
if (!validateRow) fail(['purpose-licenses.v1 did not resolve by $id'], '');

/**
 * The same schema as a reader whose validator takes `format` as an annotation reads it: draft 2020-12's default, and
 * so the reading of many a consumer's validator. Every refusal below must hold for it too, except the calendar's
 * (30 February), which only an asserted `format` can see; so the patterns carry the forms on their own.
 */
const withoutFormats = (node) => {
  if (Array.isArray(node)) return node.map(withoutFormats);
  if (node === null || typeof node !== 'object') return node;
  return Object.fromEntries(Object.entries(node).filter(([key]) => key !== 'format').map(([key, value]) => [key, withoutFormats(value)]));
};
const validateRowFormatBlind = createAjv().compile(withoutFormats(schema));

/* ------------------------------------------------------------------------------ the header */

const sameList = (a, b) => Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, k) => v === b[k]);

/** What the header rule finds in a schema: `x-psn.csvHeader` is its properties in order, all required, nothing else. */
const headerProblems = (doc) => {
  const found = [];
  const header = doc['x-psn']?.csvHeader;
  const properties = Object.keys(doc.properties ?? {});
  if (!sameList(header, properties)) {
    found.push(`x-psn.csvHeader ${JSON.stringify(header)} is not the properties in their order ${JSON.stringify(properties)}`);
  }
  if (!sameList(doc.required, properties)) found.push('`required` is not every column, in the header\'s order');
  if (doc.additionalProperties !== false) found.push('`additionalProperties` is not false, so a line could hold a column the header does not name');
  return found;
};

problems.push(...headerProblems(schema).map((p) => `schemas/purpose-licenses.v1.json: ${p}`));
const header = schema['x-psn']?.csvHeader;
if (problems.length > 0 || !Array.isArray(header)) fail(problems, '');

const swapped = structuredClone(schema);
[swapped['x-psn'].csvHeader[1], swapped['x-psn'].csvHeader[2]] = [swapped['x-psn'].csvHeader[2], swapped['x-psn'].csvHeader[1]];
const optional = structuredClone(schema);
optional.required = optional.required.filter((name) => name !== 'band');
const open = structuredClone(schema);
delete open.additionalProperties;
for (const [what, doc] of [['a header in another order', swapped], ['a column not required', optional], ['a line open to more columns', open]]) {
  if (headerProblems(doc).length === 0) problems.push(`the header rule passes ${what}`);
}

/* -------------------------------------------------------------------------------- the file */

/** The Licences page's order: no term first, then `termStart` latest first, then `entId` ascending. */
const pageOrder = (a, b) => {
  if ((a.termStart === '') !== (b.termStart === '')) return a.termStart === '' ? -1 : 1;
  if (a.termStart !== b.termStart) return a.termStart > b.termStart ? -1 : 1;
  if (a.entId === b.entId) return 0;
  return a.entId < b.entId ? -1 : 1;
};

/** What the file rules find in one CSV text, and the rows they read. */
const fileProblems = (text, at) => {
  const found = [];
  for (let k = 0; k < text.length; k += 1) {
    const code = text.charCodeAt(k);
    if (code !== 0x0a && (code < 0x20 || code > 0x7e)) {
      found.push(`${at}: character ${k + 1} (U+${code.toString(16).toUpperCase().padStart(4, '0')}) is not printable ASCII`);
      break;
    }
  }
  if (text.includes('"')) found.push(`${at}: holds a double quote, and no field of this file is ever quoted`);
  const table = csvTable(text, header);
  found.push(...table.problems.map((p) => `${at}: ${p}`));
  const seen = new Map();
  table.rows.forEach((row, index) => {
    const where = `${at} line ${table.lines[index]}`;
    if (!validateRow(row)) found.push(`${where}: ${ajv.errorsText(validateRow.errors)}`);
    if (seen.has(row.entId)) found.push(`${where}: ${row.entId} is on line ${seen.get(row.entId)} too, and a file has one line per Entitlement`);
    else seen.set(row.entId, table.lines[index]);
    if (index > 0 && pageOrder(table.rows[index - 1], row) >= 0) {
      found.push(`${where}: ${row.entId} comes after ${table.rows[index - 1].entId}, which the page lists after it`);
    }
  });
  return { found, rows: table.rows };
};

const exampleFiles = readdirSync(EXAMPLE_DIR)
  .filter((name) => /^purpose-licenses\.v1\.(?:[a-z0-9][a-z0-9-]*\.)?example\.csv$/.test(name))
  .sort();
const exampleRows = [];
let emptyFiles = 0;
for (const name of exampleFiles) {
  const { found, rows } = fileProblems(readFileSync(join(EXAMPLE_DIR, name), 'utf8'), `examples/${name}`);
  problems.push(...found);
  exampleRows.push(...rows);
  if (rows.length === 0) emptyFiles += 1;
}

const shown = [
  ['no purpose-licenses.v1 example', exampleFiles.length > 0],
  ['no example is an organisation with nothing to list (the header alone)', emptyFiles > 0],
  ...['project', 'pass'].map((lane) => [`no example row is a \`${lane}\``, exampleRows.some((r) => r.lane === lane)]),
  ...schema.properties.status.enum.map((status) => [`no example row is \`${status}\``, exampleRows.some((r) => r.status === status)]),
  ...['pending', 'revoked', 'lapsed'].map((status) => [
    `no example row is a \`${status}\` one with no term`,
    exampleRows.some((r) => r.status === status && r.termStart === ''),
  ]),
  ['no example row is a `lapsed` one with a term', exampleRows.some((r) => r.status === 'lapsed' && r.termStart !== '')],
  ['no example row is a Project the registry no longer lists', exampleRows.some((r) => r.lane === 'project' && r.repoNameWithOwner === '')],
  ['no example row carries a legacy repository id', exampleRows.some((r) => r.repoNodeId.startsWith('MDEwOlJlcG9zaXRvcnk'))],
  ['no example row shows a grace window', exampleRows.some((r) => r.graceEndsAt !== '')],
];
for (const [what, holds] of shown) {
  if (!holds) problems.push(`${what}: the examples are the fixtures the producer builds against, and should show it`);
}

/* The file rules, held to planted files: each must be flagged, so none can pass by being unable to fail. */
const mainText = readFileSync(join(EXAMPLE_DIR, 'purpose-licenses.v1.example.csv'), 'utf8');
const mainLines = mainText.split('\n').slice(0, -1);
const fromLines = (lines) => `${lines.join('\n')}\n`;
const datedFirst = mainLines.findIndex((line, k) => k > 0 && line.split(',')[6] !== '');
const swappedLines = (k) => mainLines.map((line, j) => (j === k ? mainLines[k + 1] : j === k + 1 ? mainLines[k] : line));
const mustFlag = [
  ['carriage returns before the line feeds', mainText.replace(/\n/g, '\r\n')],
  ['a byte-order mark', `﻿${mainText}`],
  ['a last line with no line feed', mainText.slice(0, -1)],
  ['a blank line', fromLines([mainLines[0], '', ...mainLines.slice(1)])],
  ['a quoted field', fromLines(mainLines.map((line, k) => (k === 1 ? line.replace(/^([^,]*)/, '"$1"') : line)))],
  ['a tab in a field', fromLines(mainLines.map((line, k) => (k === 1 ? line.replace(',project,', ',project\t,') : line)))],
  ['a character that is not ASCII', fromLines(mainLines.map((line, k) => (k === 1 ? line.replace('example-maintainers', 'exämple-maintainers') : line)))],
  ['a header in another order', fromLines([mainLines[0].replace('termStart,termEnd', 'termEnd,termStart'), ...mainLines.slice(1)])],
  ['a header without its last column', fromLines([mainLines[0].replace(/,sandbox$/, ''), ...mainLines.slice(1)])],
  ['a line with a field too many', fromLines(mainLines.map((line, k) => (k === 1 ? `${line},false` : line)))],
  ['a line with a field too few', fromLines(mainLines.map((line, k) => (k === 1 ? line.replace(/,false$/, '') : line)))],
  ['one Entitlement on two lines', fromLines([...mainLines, mainLines[mainLines.length - 1]])],
  ['a term-less line after a dated one', fromLines(swappedLines(datedFirst - 1))],
  ['an earlier term before a later one', fromLines(swappedLines(datedFirst))],
  ['two term-less lines out of id order', fromLines(swappedLines(1))],
  ['an empty text', ''],
];
for (const [what, text] of mustFlag) {
  if (fileProblems(text, 'planted').found.length === 0) problems.push(`the file rules pass ${what}`);
}

/* ------------------------------------------------------------------------------ refusals */

const rowWhere = (pick) => {
  const found = exampleRows.find(pick);
  if (!found) throw new Error('examples/purpose-licenses.v1.example.csv lacks a row the edits below start from');
  return found;
};
const activeProject = rowWhere((r) => r.lane === 'project' && r.status === 'active');
const activePass = rowWhere((r) => r.lane === 'pass' && r.status === 'active');
const pendingProject = rowWhere((r) => r.status === 'pending');
const edited = (row, edit) => {
  const copy = { ...row };
  edit(copy);
  return copy;
};
const project = (edit) => edited(activeProject, edit);
const pass = (edit) => edited(activePass, edit);
const pending = (edit) => edited(pendingProject, edit);
const formulas = ['=', '+', '-', '@'];

const mustRefuse = [
  ['an amount column', project((r) => { r.amountMinor = '340000'; })],
  ['a payer column', project((r) => { r.payerName = 'Example Industries AG'; })],
  ['a coverage answer column', project((r) => { r.coverage = 'yes-via-project'; })],
  ['a line without its band column', project((r) => { delete r.band; })],
  ['the donation lane', pass((r) => { r.lane = 'donation'; })],
  ['a lane in capitals', project((r) => { r.lane = 'Project'; })],
  ['the published record\'s `void`', project((r) => { r.status = 'void'; })],
  ['the coverage answer\'s `lapsed-in-grace` as a status', project((r) => { r.status = 'lapsed-in-grace'; })],
  ['the stored hold `screening-hold`', pending((r) => { r.pendingSubstate = 'screening-hold'; })],
  ['the stored hold `refused-pending-open-34`', pending((r) => { r.pendingSubstate = 'refused-pending-open-34'; })],
  ['a sub-state on an active row', project((r) => { r.pendingSubstate = 'held'; })],
  ['a Project with no repository', project((r) => { r.repoNodeId = ''; r.repoNameWithOwner = ''; })],
  ['a Pass naming a repository', pass((r) => { r.repoNodeId = activeProject.repoNodeId; })],
  ['a Portfolio naming a repository', pass((r) => { r.lane = 'portfolio'; r.repoNodeId = activeProject.repoNodeId; })],
  ['a name without its id', pass((r) => { r.repoNameWithOwner = activeProject.repoNameWithOwner; })],
  ['a term with its start alone', project((r) => { r.termEnd = ''; })],
  ['a term with its end alone', project((r) => { r.termStart = ''; })],
  ...['active', 'grace', 'suspended'].map((status) => [
    `a \`${status}\` row with no term`,
    project((r) => { r.status = status; r.termStart = ''; r.termEnd = ''; }),
  ]),
  ...['2027-6-1', '01.06.2027', '2027-06-01T00:00:00Z', '20270601', '2027-13-01', '2027-06-32'].map((day) => [
    `the day ${JSON.stringify(day)}`,
    project((r) => { r.termStart = day; }),
  ]),
  ['the day "2027-02-30"', project((r) => { r.termStart = '2027-02-30'; }), 'calendar'],
  ['a grace end in another form', project((r) => { r.graceEndsAt = '2028/07/01'; })],
  ...formulas.flatMap((lead) => [
    [`a repository id beginning \`${lead}\``, project((r) => { r.repoNodeId = `${lead}kgDOSMPL0001`; })],
    [`a repository name beginning \`${lead}\``, project((r) => { r.repoNameWithOwner = `${lead}example-maintainers/formula-engine`; })],
    [`a band beginning \`${lead}\``, project((r) => { r.band = `${lead}1-5B`; })],
    [`a Schedule version beginning \`${lead}\``, project((r) => { r.scheduleVersion = `${lead}v1`; })],
  ]),
  ['a repository id beginning `_`', project((r) => { r.repoNodeId = '_kgDOSMPL0001'; })],
  ['an Entitlement id in capitals', project((r) => { r.entId = r.entId.toUpperCase(); })],
  ['an organisation\'s id in place of the Entitlement\'s', project((r) => { r.entId = r.entId.replace(/^ent_/, 'co_'); })],
  ['a band with a currency', project((r) => { r.band = 'CHF 1-5B'; })],
  ['a band with the label\'s dollar sign', project((r) => { r.band = '$1B–5B'; })],
  ['a band over 32 characters', project((r) => { r.band = `1${'0'.repeat(31)}M`; })],
  ['a Schedule version without its v', project((r) => { r.scheduleVersion = '1'; })],
  ...['TRUE', 'True', 'yes', '1', ''].flatMap((spelling) => [
    [`autoRenew ${JSON.stringify(spelling)}`, project((r) => { r.autoRenew = spelling; })],
    [`sandbox ${JSON.stringify(spelling)}`, project((r) => { r.sandbox = spelling; })],
  ]),
  ['a field with a leading space', project((r) => { r.band = ' 1-5B'; })],
  ['a field with a comma', project((r) => { r.repoNameWithOwner = 'example-maintainers/formula,engine'; })],
  ['a field with a line feed', project((r) => { r.band = '1-5B\n'; })],
];
for (const [what, row, only] of mustRefuse) {
  if (validateRow(row)) problems.push(`purpose-licenses.v1: admits ${what}`);
  if (only !== 'calendar' && validateRowFormatBlind(row)) problems.push(`purpose-licenses.v1: admits ${what} where \`format\` is an annotation`);
}

const mustAdmit = [
  ['a pending purchase with no sub-state', pending((r) => { r.pendingSubstate = ''; })],
  ...schema.properties.pendingSubstate.anyOf[1].enum.map((substate) => [
    `a pending purchase \`${substate}\``,
    pending((r) => { r.pendingSubstate = substate; }),
  ]),
  ['a refunded purchase with no term', pending((r) => { r.status = 'revoked'; r.pendingSubstate = ''; })],
  ['an invoice that lapsed before any term', pending((r) => { r.status = 'lapsed'; r.pendingSubstate = ''; })],
  ['a revoked term', project((r) => { r.status = 'revoked'; r.autoRenew = 'false'; })],
  ['a suspended term', project((r) => { r.status = 'suspended'; })],
  ['a grace row whose grace end is not recorded', project((r) => { r.status = 'grace'; })],
  ['a Project the registry no longer lists', project((r) => { r.repoNameWithOwner = ''; })],
  ['a legacy repository id', project((r) => { r.repoNodeId = 'MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODk='; })],
  ['a Portfolio', pass((r) => { r.lane = 'portfolio'; })],
  ['a term with no Schedule version and no band', project((r) => { r.scheduleVersion = ''; r.band = ''; })],
  ['a two-part Schedule version', project((r) => { r.scheduleVersion = 'v1.1'; })],
  ['the Schedule\'s highest band', project((r) => { r.band = '5B+'; })],
  ['a test-mode Entitlement', project((r) => { r.sandbox = 'true'; })],
];
for (const [what, row] of mustAdmit) {
  if (!validateRow(row)) problems.push(`purpose-licenses.v1: refuses ${what} — ${ajv.errorsText(validateRow.errors)}`);
  if (!validateRowFormatBlind(row)) problems.push(`purpose-licenses.v1: refuses ${what} where \`format\` is an annotation`);
}

fail(
  problems,
  `purpose-licenses: the header is the schema's ${header.length} columns (the rule flags 3 planted schemas); ` +
    `${exampleFiles.length} example(s) keep the file's form, one line per Entitlement and the page's order over ` +
    `${exampleRows.length} line(s); the file rules flag ${mustFlag.length} planted files; ` +
    `${mustRefuse.length} refusals and ${mustAdmit.length} admissions stand, with \`format\` asserted and as an annotation`,
);

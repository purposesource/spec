#!/usr/bin/env node
/**
 * Gate: the advisory votes' two contracts keep what their descriptions promise, and still refuse
 * what must never be published.
 *
 * `consultation.v1` publishes one vote's newest version, the document exactly as the platform
 * stored it; `consultation-index.v1` lists every vote with the header of its newest version (ops
 * decision D143; platform migration 0098). JSON Schema can say which members a version of each kind
 * carries and that every published count is at least 5; it cannot relate two numbers or two
 * documents. The descriptions promise those relations ("WHAT A READER CHECKS"), so this gate holds
 * the examples to them:
 *
 *   ONE VERSION (`examples/consultation.v1*.example.json`)
 *     hash       `sha256` is the SHA-256 of `document`'s RFC 8785 form;
 *     band       `asked.to` is `asked.from` + 4, and a numeric turnout is no more than `asked.to` − 5;
 *     numbering  questions run 1, 2, 3… in order, and so do each question's options;
 *     counts     a published count names every option of its question once, in order; a
 *                single-choice question's counts sum to `respondents`; a tick-any option's `count`
 *                and `notTicked` sum to `respondents`, and the options' counts together exceed
 *                `respondents` by at least 5 (the ticks beyond one per respondent); a required
 *                question's `respondents` is the numeric turnout, and an optional question's
 *                `noAnswer` is the numeric turnout less its `respondents`;
 *     time       `openedAt` is before `closesAt`, `closedAt` is not before `closesAt`, a withdrawal
 *                is not before `openedAt`, and `generatedAt` is not before `publishedAt`.
 *
 *   TWO VERSIONS OF ONE VOTE (any two examples of one `consultationId` whose versions follow)
 *     chain      the later one's `supersedesSha256` is the earlier one's `sha256`, and its
 *                `publishedAt` is not earlier;
 *     frozen     the later one repeats every frozen fact of the earlier one, the questions' words
 *                included (their counts aside).
 *
 *   THE INDEX (`examples/consultation-index.v1*.example.json`)
 *     once       each vote is listed once;
 *     order      newest `openedAt` first, two opened in the same second by `consultationId`;
 *     agree      an entry whose vote has an example document at the same version carries that
 *                document's version, kind, instants, hash, title, audience and sample mark;
 *     dated      `generatedAt` is not before any entry's `publishedAt`.
 *
 *   THE RFC 8785 FORM ITSELF is self-tested on fixed vectors, and EVERY RULE ABOVE IS PROVED ABLE
 *   TO FAIL on a planted document before the examples are judged; the rules that hold a count a
 *   reader works out to 5 are proved to stop at 5, on a document planted at that edge.
 *
 *   REFUSALS. Each contract still refuses, by its own keywords, what must never be published: the
 *   admins' list of qualifying projects or any member that could carry a person or a written
 *   answer, a count, a turnout or a "no answer" under 5, a question's respondents under 10, a band
 *   that is not a range of five, counts per question beside a turnout that does not allow them, a
 *   count on a written-answer question, a sample vote on the production plane or under a board
 *   reference that is not `SAMPLE-`, and a member of one kind on a version of another; the index
 *   refuses any figure. ADMISSIONS. And it still admits what a real vote holds, each state of the
 *   small-count rule included: a sample that asked fewer than 5, an almost-everyone turnout with
 *   fewer than 10 answering, a numeric turnout under 10, an almost-everyone turnout with nothing per
 *   question, and an admins result with no repository figures.
 *
 * Run: node scripts/check-consultations.mjs
 */
import { createHash } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv } = createValidatorWithAllSchemas();
const voteSchema = ajv.getSchema(`${BASE}/consultation.v1.json`);
const indexSchema = ajv.getSchema(`${BASE}/consultation-index.v1.json`);
if (!voteSchema || !indexSchema) {
  fail(['consultation.v1 or consultation-index.v1 did not resolve by $id'], '');
}

/* ------------------------------------------------------------------ the RFC 8785 form */

/** RFC 8785 for the values these documents hold: integers, strings, booleans, null, arrays, objects (keys in UTF-16 order). */
function jcs(value) {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isSafeInteger(value)) throw new Error(`not an integer these contracts admit: ${value}`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(jcs).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${jcs(value[key])}`).join(',')}}`;
}
const sha256 = (value) => createHash('sha256').update(jcs(value), 'utf8').digest('hex');

const VECTORS = [
  [{ b: 1, a: [true, null, 'x'] }, '{"a":[true,null,"x"],"b":1}'],
  // UTF-16 code units order the keys: U+20AC sorts before a surrogate pair (U+1F600 is D83D DE00).
  [{ '\u{1F600}': 2, '€': 1, z: 0 }, '{"z":0,"€":1,"\u{1F600}":2}'],
  [{ s: 'line\nbreak "quoted" \u0001' }, '{"s":"line\\nbreak \\"quoted\\" \\u0001"}'],
];
for (const [value, form] of VECTORS) {
  if (jcs(value) !== form) problems.push(`self-test: the RFC 8785 form of ${JSON.stringify(value)} is ${jcs(value)}, not ${form}`);
}

/* ------------------------------------------------------------------------- the rules */

const sum = (values) => values.reduce((a, b) => a + b, 0);
const same = (a, b) => jcs(a) === jcs(b);

/** The frozen facts every version repeats (the questions are compared without their counts). */
const FROZEN = ['consultationId', 'title', 'summary', 'audience', 'sample', 'advisory', 'algoVersion', 'provisional', 'resolution', 'openedAt', 'closesAt', 'asked', 'rule'];
const frozenQuestions = (doc) => doc.questions.map(({ counts, ...question }) => question);

/** What the description promises of one version's file, as problems (none when it holds). */
function versionProblems(file) {
  const out = [];
  const d = file.document;
  if (sha256(d) !== file.sha256) out.push(`sha256 ${file.sha256} is not the SHA-256 of the document's RFC 8785 form (${sha256(d)})`);
  if (d.asked.to !== d.asked.from + 4) out.push(`asked runs from ${d.asked.from} to ${d.asked.to}, not a range of five`);
  if (d.turnout?.state === 'count' && d.turnout.count > d.asked.to) {
    out.push(`the turnout ${d.turnout.count} is more than the ${d.asked.to} the people asked can be`);
  } else if (d.turnout?.state === 'count' && d.turnout.count > d.asked.to - 5) {
    // A number only where at least 5 of those asked did not answer: above `asked.to` − 5, a reader works out that fewer did not.
    out.push(`the turnout ${d.turnout.count} leaves fewer than 5 of the ${d.asked.from} to ${d.asked.to} people asked who did not answer, and the turnout is a number only when at least 5 did not`);
  }
  d.questions.forEach((q, i) => {
    if (q.no !== i + 1) out.push(`question ${i + 1} is numbered ${q.no}`);
    q.options.forEach((o, j) => {
      if (o.no !== j + 1) out.push(`question ${q.no}'s option ${j + 1} is numbered ${o.no}`);
    });
    const c = q.counts;
    if (c?.state !== 'published') return;
    if (!same(c.options.map((o) => o.no), q.options.map((o) => o.no))) {
      out.push(`question ${q.no}'s counts name options ${JSON.stringify(c.options.map((o) => o.no))}, not each of its options once, in order`);
    }
    if (q.kind === 'single' && sum(c.options.map((o) => o.count)) !== c.respondents) {
      out.push(`question ${q.no}'s counts sum to ${sum(c.options.map((o) => o.count))}, not its ${c.respondents} respondents`);
    }
    if (q.kind === 'multiple') {
      for (const o of c.options) {
        if (o.count + o.notTicked !== c.respondents) out.push(`question ${q.no}'s option ${o.no}: ${o.count} ticked and ${o.notTicked} not ticked are not its ${c.respondents} respondents`);
      }
      // Everyone who answers it ticks at least one choice, so the ticks beyond one per respondent are a count a reader works
      // out (over two choices, those who ticked both), held to 5 like every count shown (D143's dated note of 2026-10-19).
      const ticks = sum(c.options.map((o) => o.count));
      if (ticks - c.respondents < 5) {
        out.push(`question ${q.no}'s choices are ticked ${ticks} times by its ${c.respondents} respondents: fewer than 5 ticks beyond one per respondent, a count a reader works out`);
      }
    }
    // Every answer answers a required question (a ballot that leaves one out is refused), so its respondents are the turnout.
    if (q.required && d.turnout?.state === 'count' && c.respondents !== d.turnout.count) {
      out.push(`question ${q.no} is required, and its ${c.respondents} respondents are not the turnout ${d.turnout.count}: every answer answers a required question`);
    }
    if (!q.required && d.turnout?.state === 'count' && c.noAnswer !== d.turnout.count - c.respondents) {
      out.push(`question ${q.no}'s "no answer" ${c.noAnswer} is not the turnout ${d.turnout.count} less its ${c.respondents} respondents`);
    }
  });
  if (!(d.openedAt < d.closesAt)) out.push(`openedAt ${d.openedAt} is not before closesAt ${d.closesAt}`);
  if (d.closedAt !== undefined && d.closedAt < d.closesAt) out.push(`closedAt ${d.closedAt} is before closesAt ${d.closesAt}`);
  if (d.withdrawal !== undefined && d.withdrawal.at < d.openedAt) out.push(`the withdrawal ${d.withdrawal.at} is before openedAt ${d.openedAt}`);
  if (file.generatedAt < file.publishedAt) out.push(`generatedAt ${file.generatedAt} is before publishedAt ${file.publishedAt}`);
  return out;
}

/** What the description promises of two versions of one vote that follow each other. */
function chainProblems(earlier, later) {
  const out = [];
  if (later.supersedesSha256 !== earlier.sha256) out.push(`version ${later.document.version}'s supersedesSha256 is not version ${earlier.document.version}'s sha256`);
  if (later.publishedAt < earlier.publishedAt) out.push(`version ${later.document.version} is published before version ${earlier.document.version}`);
  for (const member of FROZEN) {
    if (!same(earlier.document[member], later.document[member])) out.push(`version ${later.document.version} does not repeat \`${member}\` as version ${earlier.document.version} froze it`);
  }
  if (!same(frozenQuestions(earlier.document), frozenQuestions(later.document))) out.push(`version ${later.document.version} does not repeat the questions as version ${earlier.document.version} froze them`);
  return out;
}

/** What the description promises of an index, against the vote documents at hand (by id and version). */
function indexProblems(index, documents) {
  const out = [];
  const entries = index.consultations;
  const ids = entries.map((e) => e.consultationId);
  if (new Set(ids).size !== ids.length) out.push('a vote is listed more than once');
  for (let i = 1; i < entries.length; i += 1) {
    const [a, b] = [entries[i - 1], entries[i]];
    if (a.openedAt < b.openedAt || (a.openedAt === b.openedAt && a.consultationId > b.consultationId)) {
      out.push(`${b.consultationId} is listed after ${a.consultationId}, out of the order (newest openedAt first, then consultationId)`);
    }
  }
  for (const entry of entries) {
    if (index.generatedAt < entry.publishedAt) out.push(`generatedAt ${index.generatedAt} is before ${entry.consultationId}'s publishedAt ${entry.publishedAt}`);
    const file = documents.get(`${entry.consultationId}@${entry.version}`);
    if (!file) continue;
    const d = file.document;
    const expected = {
      consultationId: d.consultationId, title: d.title, audience: d.audience, sample: d.sample, openedAt: d.openedAt, closesAt: d.closesAt,
      ...(d.closedAt !== undefined ? { closedAt: d.closedAt } : {}),
      ...(d.withdrawal !== undefined ? { withdrawnAt: d.withdrawal.at } : {}),
      version: d.version, kind: d.kind, publishedAt: file.publishedAt, sha256: file.sha256,
    };
    if (!same(entry, expected)) out.push(`the entry for ${entry.consultationId} does not carry its version ${entry.version} document's header`);
  }
  return out;
}

/* ---------------------------------------------------------------------- the examples */

const names = readdirSync(EXAMPLE_DIR).filter((name) => /\.example\.json$/.test(name));
const voteFiles = names.filter((name) => name.startsWith('consultation.v1.'));
const indexFiles = names.filter((name) => name.startsWith('consultation-index.v1.'));
const versions = voteFiles.map((name) => ({ name, file: readJson(join(EXAMPLE_DIR, name)) }));
const documents = new Map(versions.map(({ file }) => [`${file.document.consultationId}@${file.document.version}`, file]));

/* ---------- every rule able to fail, on documents planted from the examples, before they are judged */

const main = readJson(join(EXAMPLE_DIR, 'consultation.v1.example.json'));
const clone = (value) => structuredClone(value);
let plantsJudged = 0;
let edgesJudged = 0;
/** A planted document must make its rule report: a rule that passes it could pass anything. */
function mustFail(rule, found) {
  plantsJudged += 1;
  if (found.length === 0) problems.push(`self-test: the ${rule} rule passes a document planted to break it`);
}
/** A document planted at a rule's edge must pass every rule: a rule that refuses it holds more than the description says. */
function mustPass(rule, found) {
  edgesJudged += 1;
  if (found.length !== 0) problems.push(`self-test: the ${rule} rule refuses a document planted at its edge (${found[0]})`);
}
/** The main example with `edit` applied to a copy, its hash recomputed unless the edit is to the hash. */
function planted(edit, { rehash = true } = {}) {
  const file = clone(main);
  edit(file);
  if (rehash) file.sha256 = sha256(file.document);
  return file;
}
/** The main example answered by `n`, not 41: each of its two required questions answered by all of them, its sums kept. */
function answeredBy(file, n) {
  const [single, tickAny] = file.document.questions;
  file.document.turnout.count = n;
  single.counts.respondents = n;
  single.counts.options[2].count = n - single.counts.options[0].count - single.counts.options[1].count;
  tickAny.counts.respondents = n;
  for (const o of tickAny.counts.options) o.notTicked = n - o.count;
}
/** The main example's tick-any question, its 41 respondents ticking its three choices `counts` times, its sums kept. */
function ticked(file, counts) {
  const q = file.document.questions[1];
  q.counts.options = counts.map((count, i) => ({ no: i + 1, count, notTicked: q.counts.respondents - count }));
}
const PLANTS = [
  ['hash', planted((f) => { f.sha256 = '0'.repeat(64); }, { rehash: false })],
  ['band', planted((f) => { f.document.asked.to = f.document.asked.from + 5; })],
  ['band (turnout)', planted((f) => { f.document.asked = { from: 35, to: 39 }; })],
  // 55 answered of 55 to 59 asked, so at most 4 did not: the smallest such count. Both required questions are answered by
  // the 55, so this rule alone refuses it (a turnout of 59 beside 41 respondents would break theirs too); 54 is its edge.
  ['band (fewer than 5 not answering)', planted((f) => answeredBy(f, 55))],
  ['numbering', planted((f) => { f.document.questions[1].no = 3; })],
  ['numbering (options)', planted((f) => { f.document.questions[0].options[2].no = 4; f.document.questions[0].counts.options[2].no = 4; })],
  ['counts (names)', planted((f) => { f.document.questions[0].counts.options.reverse(); })],
  ['counts (single sum)', planted((f) => { f.document.questions[0].counts.options[0].count += 1; })],
  ['counts (tick-any sum)', planted((f) => { f.document.questions[1].counts.options[1].notTicked += 1; })],
  // A turnout of 44 beside 41 respondents to each required question: 3 would have left one out.
  ['counts (required respondents)', planted((f) => { f.document.turnout.count = 44; })],
  // D143's dated note of 2026-10-19: 20 respondents tick 12 and 9 of two choices, every count shown is 5 or more, and 1 ticked both.
  ['counts (ticks beyond one, two choices)', planted((f) => {
    const q = f.document.questions[2];
    q.kind = 'multiple';
    q.counts = { state: 'published', respondents: 20, noAnswer: 21, options: [{ no: 1, count: 12, notTicked: 8 }, { no: 2, count: 9, notTicked: 11 }] };
  })],
  // 41 respondents tick 20, 16 and 9 of three choices: 4 ticks beyond one per respondent; 5 is its edge.
  ['counts (ticks beyond one, three choices)', planted((f) => ticked(f, [20, 16, 9]))],
  ['time (open period)', planted((f) => { f.document.closesAt = f.document.openedAt; })],
  ['time (close)', planted((f) => { f.document.closedAt = '2027-03-31T08:59:59Z'; })],
  ['time (generatedAt)', planted((f) => { f.generatedAt = '2027-04-02T10:11:11Z'; })],
];
for (const [rule, file] of PLANTS) mustFail(rule, versionProblems(file));
// The counts a reader works out are held to 5, and to no more: 54 of 55 to 59 answering leaves 5 who did not, and 46 ticks
// by 41 respondents leave 5 beyond one each. One more answer, or one tick fewer, is a plant above.
const EDGES = [
  ['band (fewer than 5 not answering)', planted((f) => answeredBy(f, 54))],
  ['counts (ticks beyond one)', planted((f) => ticked(f, [20, 17, 9]))],
];
for (const [rule, file] of EDGES) mustPass(rule, versionProblems(file));
// An optional question's "no answer", on a plant of its own: the main example's only published questions are required.
{
  const file = clone(main);
  const q = file.document.questions[1];
  q.required = false;
  q.counts.noAnswer = 6;
  file.sha256 = sha256(file.document);
  mustFail('"no answer"', versionProblems(file));
}
{
  const result = documents.get(`${main.document.consultationId}@2`);
  if (!result) {
    problems.push('examples: the main example\'s version 2 (consultation.v1.result.example.json) is missing, so the chain rules have no pair');
  } else {
    const broken = clone(main);
    broken.supersedesSha256 = '0'.repeat(64);
    mustFail('chain (predecessor)', chainProblems(result, broken));
    const reworded = clone(main);
    reworded.document.questions[0].prompt = 'A question the opening did not freeze?';
    reworded.sha256 = sha256(reworded.document);
    mustFail('frozen (questions)', chainProblems(result, reworded));
    const retitled = clone(main);
    retitled.document.title = 'A title the opening did not freeze';
    retitled.sha256 = sha256(retitled.document);
    mustFail('frozen (facts)', chainProblems(result, retitled));
    const early = clone(main);
    early.publishedAt = '2027-03-30T00:00:00Z';
    mustFail('chain (publication order)', chainProblems(result, early));
  }
}
{
  const index = readJson(join(EXAMPLE_DIR, 'consultation-index.v1.example.json'));
  const twice = clone(index);
  twice.consultations.push(clone(twice.consultations[0]));
  const reordered = clone(index);
  reordered.consultations.reverse();
  const disagrees = clone(index);
  disagrees.consultations[2].title = 'A title the document does not carry';
  const undated = clone(index);
  undated.generatedAt = '2027-04-02T10:11:11Z';
  for (const [rule, plant] of [['once', twice], ['order', reordered], ['agree', disagrees], ['dated', undated]]) {
    mustFail(`index ${rule}`, indexProblems(plant, documents));
  }
}

/* ---------- the examples themselves */

for (const { name, file } of versions) {
  for (const problem of versionProblems(file)) problems.push(`examples/${name}: ${problem}`);
}
for (const { name, file } of versions) {
  const earlier = documents.get(`${file.document.consultationId}@${file.document.version - 1}`);
  if (earlier) for (const problem of chainProblems(earlier, file)) problems.push(`examples/${name}: ${problem}`);
}
let checkedEntries = 0;
for (const name of indexFiles) {
  const index = readJson(join(EXAMPLE_DIR, name));
  for (const problem of indexProblems(index, documents)) problems.push(`examples/${name}: ${problem}`);
  checkedEntries += index.consultations.filter((e) => documents.has(`${e.consultationId}@${e.version}`)).length;
}
const pairs = versions.filter(({ file }) => documents.has(`${file.document.consultationId}@${file.document.version - 1}`)).length;
if (pairs < 2) problems.push(`examples: only ${pairs} pair(s) of versions that follow each other; the chain rules need the main example's three versions`);
if (checkedEntries < 2) problems.push(`examples: only ${checkedEntries} index entr(ies) have a document to agree with`);
for (const kind of ['announcement', 'result', 'answer', 'withdrawal']) {
  if (!versions.some(({ file }) => file.document.kind === kind)) problems.push(`examples: no consultation.v1 example shows a ${kind}`);
}

/* ------------------------------------------------------------ refusals and admissions */

const result = documents.get(`${main.document.consultationId}@2`) ?? main;
const announcement = documents.get(`${main.document.consultationId}@1`) ?? main;
const withdrawal = versions.find(({ file }) => file.document.kind === 'withdrawal')?.file ?? main;
const index = readJson(join(EXAMPLE_DIR, 'consultation-index.v1.example.json'));

/** A copy of `base` with `edit` applied (the schema is what judges it; the hash is not its question). */
function variant(base, edit) {
  const file = clone(base);
  edit(file);
  return file;
}
/** Every question's counts withheld from the vote (nothing per question), for the turnout pairings below. */
function nothingPerQuestion(file, perQuestion) {
  file.document.perQuestion = perQuestion;
  for (const q of file.document.questions) q.counts = { state: q.kind === 'text' ? 'noCount' : 'notPublished' };
}

const REFUSED = [
  ['the admins\' list of qualifying projects', variant(main, (f) => { f.document.adminRepos = [{ nodeId: 'R_kgDOExample01', stars: 51 }]; })],
  ['a count per project', variant(main, (f) => { f.document.repositories.perRepository = [{ nodeId: 'R_kgDOExample01', asked: 3 }]; })],
  ['who was asked', variant(main, (f) => { f.document.electorate = ['acc_01mbx3q5tcz0d7r9fqkgw2he4n']; })],
  ['a ballot', variant(main, (f) => { f.document.ballots = [{ answers: { 1: [2] } }]; })],
  ['a written answer', variant(main, (f) => { f.document.questions[3].answers = ['A written answer.']; })],
  ['a count by group', variant(main, (f) => { f.document.questions[0].counts.byGroup = { contributors: 9, admins: 9 }; })],
  ['a count under 5', variant(main, (f) => { f.document.questions[0].counts.options[2].count = 4; })],
  ['a tick-any "not ticked" under 5', variant(main, (f) => { f.document.questions[1].counts.options[0].notTicked = 4; })],
  ['a "no answer" under 5', variant(main, (f) => { f.document.questions[2].required = false; f.document.questions[0].required = false; f.document.questions[0].counts.noAnswer = 4; })],
  ['respondents under 10', variant(main, (f) => { f.document.questions[0].counts.respondents = 9; })],
  ['a numeric turnout under 5', variant(main, (f) => { nothingPerQuestion(f, 'fewerThan10'); f.document.turnout = { state: 'count', count: 4 }; })],
  ['a turnout under 5 beside counts', variant(main, (f) => { f.document.turnout = { state: 'fewerThan5' }; })],
  ['almost everyone beside counts', variant(main, (f) => { f.document.turnout = { state: 'almostAll' }; })],
  ['counts beside a turnout under 10', variant(main, (f) => { f.document.turnout = { state: 'count', count: 9 }; })],
  ['nothing per question beside a turnout of 10 or more', variant(main, (f) => { nothingPerQuestion(f, 'fewerThan10'); })],
  ['"almost everyone" per question beside a number', variant(main, (f) => { nothingPerQuestion(f, 'almostAll'); })],
  ['a fewer-than-5 turnout with "almost everyone" per question', variant(main, (f) => { nothingPerQuestion(f, 'almostAll'); f.document.turnout = { state: 'fewerThan5' }; })],
  ['a question left unpublished beside counts', variant(main, (f) => { f.document.questions[0].counts = { state: 'notPublished' }; })],
  ['a figure beside a withheld question', variant(main, (f) => { f.document.questions[2].counts.respondents = 38; })],
  ['a count on a written-answer question', variant(main, (f) => { f.document.questions[3].counts = { state: 'withheld' }; })],
  ['a choice question with no count', variant(main, (f) => { f.document.questions[0].counts = { state: 'noCount' }; })],
  ['a required written-answer question', variant(announcement, (f) => { f.document.questions[3].required = true; })],
  ['a written-answer question with options', variant(announcement, (f) => { f.document.questions[3].options = [{ no: 1, label: 'Yes' }, { no: 2, label: 'No' }]; })],
  ['a choice question with one option', variant(announcement, (f) => { f.document.questions[2].options.pop(); })],
  ['written answers alone', variant(announcement, (f) => { f.document.questions = [{ ...f.document.questions[3], no: 1 }]; })],
  ['a tick-any count without "not ticked"', variant(main, (f) => { delete f.document.questions[1].counts.options[0].notTicked; })],
  ['a single-choice count with "not ticked"', variant(main, (f) => { f.document.questions[0].counts.options[0].notTicked = 23; })],
  ['a required question with a "no answer"', variant(main, (f) => { f.document.questions[0].counts.noAnswer = 5; })],
  ['a band that is not a range of five', variant(main, (f) => { f.document.asked = { from: 57, to: 61 }; })],
  ['a sample under a board reference', variant(main, (f) => { f.document.sample = true; f.document.rule.minimumAsked = null; f.document.rule.adminMinAgeMonths = null; f.document.rule.adminMinStars = null; f.document.rule.adminsPerOwner = null; })],
  ['a SAMPLE- reference on a vote that is not a sample', variant(main, (f) => { f.document.resolution.reference = 'SAMPLE-2027-02-20'; })],
  ['a sample vote on the production plane', variant(main, (f) => {
    f.source = 'platform';
    Object.assign(f.document, { sample: true });
    f.document.resolution.reference = 'SAMPLE-2027-02-20';
    Object.assign(f.document.rule, { minimumAsked: null, adminMinAgeMonths: null, adminMinStars: null, adminsPerOwner: null });
  })],
  ['a sample that keeps the minimum', variant(main, (f) => {
    Object.assign(f.document, { sample: true });
    f.document.resolution.reference = 'SAMPLE-2027-02-20';
    Object.assign(f.document.rule, { adminMinAgeMonths: null, adminMinStars: null, adminsPerOwner: null });
  })],
  ['an admins vote that drops its numbers', variant(withdrawal, (f) => { f.document.rule.adminMinStars = null; })],
  ['an admins vote read from contribution counts', variant(withdrawal, (f) => { f.document.algoVersion = 'PP-v0'; f.document.provisional = true; })],
  ['a contributors\' vote without the provisional label', variant(main, (f) => { f.document.provisional = false; })],
  ['an admins result with repository figures', variant(result, (f) => { f.document.audience = 'admins'; f.document.algoVersion = null; f.document.provisional = false; Object.assign(f.document.rule, { contributorWindowMonths: null, windowFirst: null, windowLast: null }); })],
  ['a board answer on a result', variant(result, (f) => { f.document.boardAnswer = clone(main.document.boardAnswer); })],
  ['an answer without the board\'s answer', variant(main, (f) => { f.document.boardAnswer = null; })],
  ['a due date for the board\'s answer', variant(result, (f) => { f.document.answerDueAt = '2027-04-30T09:00:00Z'; })],
  ['a result member on an announcement', variant(announcement, (f) => { f.document.closedAt = '2027-03-31T09:03:27Z'; })],
  ['counts on an announcement', variant(announcement, (f) => { f.document.questions[0].counts = { state: 'notPublished' }; })],
  ['a withdrawal member on a result', variant(result, (f) => { f.document.withdrawal = { at: '2027-03-12T14:00:00Z', reference: 'BR-2027-03-12' }; })],
  ['a withdrawal without its reference', variant(withdrawal, (f) => { delete f.document.withdrawal.reference; })],
  ['an announcement after version 1', variant(announcement, (f) => { f.document.version = 2; })],
  ['a result as version 1', variant(result, (f) => { f.document.version = 1; f.supersedesSha256 = null; })],
  ['version 1 superseding something', variant(announcement, (f) => { f.supersedesSha256 = '1'.repeat(64); })],
  ['a later version superseding nothing', variant(main, (f) => { f.supersedesSha256 = null; })],
  ['an instant with a fraction', variant(main, (f) => { f.publishedAt = '2027-04-02T10:11:12.250Z'; })],
  ['an advice that is not advisory', variant(main, (f) => { f.document.advisory = false; })],
  ['a registry-v0 vote', variant(main, (f) => { f.source = 'registry-v0'; })],
];
for (const [what, file] of REFUSED) {
  if (voteSchema(file)) problems.push(`consultation.v1 admits ${what}; it must refuse it`);
}

const ADMITTED = [
  // A sample on the test site that asked fewer than 5 and was answered by fewer than 5 (the dev acceptance's shape).
  ['a sample that asked fewer than 5', variant(result, (f) => {
    Object.assign(f.document, { sample: true, asked: { from: 0, to: 4 }, turnout: { state: 'fewerThan5' } });
    f.document.resolution.reference = 'SAMPLE-2027-02-20';
    Object.assign(f.document.rule, { minimumAsked: null, adminMinAgeMonths: null, adminMinStars: null, adminsPerOwner: null });
    nothingPerQuestion(f, 'fewerThan10');
  })],
  ['almost everyone answering, fewer than 10', variant(result, (f) => { nothingPerQuestion(f, 'fewerThan10'); f.document.turnout = { state: 'almostAll' }; })],
  ['a numeric turnout under 10', variant(result, (f) => { nothingPerQuestion(f, 'fewerThan10'); f.document.turnout = { state: 'count', count: 7 }; })],
  ['almost everyone answering, nothing per question', variant(result, (f) => { nothingPerQuestion(f, 'almostAll'); f.document.turnout = { state: 'almostAll' }; })],
  ['every question withheld', variant(result, (f) => { for (const q of f.document.questions) q.counts = { state: q.kind === 'text' ? 'noCount' : 'withheld' }; })],
  ['an admins result with no repository figures', variant(result, (f) => {
    Object.assign(f.document, { audience: 'admins', algoVersion: null, provisional: false, repositories: null });
    Object.assign(f.document.rule, { contributorWindowMonths: null, windowFirst: null, windowLast: null });
  })],
  ['a vote on the production plane', variant(main, (f) => { f.source = 'platform'; })],
];
for (const [what, file] of ADMITTED) {
  if (!voteSchema(file)) {
    const why = (voteSchema.errors ?? []).slice(0, 3).map((e) => `${e.instancePath || '(root)'} ${e.message}`).join('; ');
    problems.push(`consultation.v1 refuses ${what}; it must admit it (${why})`);
  }
}

const INDEX_REFUSED = [
  ['a turnout', variant(index, (f) => { f.consultations[2].turnout = { state: 'count', count: 41 }; })],
  ['the people asked', variant(index, (f) => { f.consultations[2].asked = { from: 55, to: 59 }; })],
  ['a count of answers', variant(index, (f) => { f.consultations[2].answered = 41; })],
  ['a sample vote on the production plane', variant(index, (f) => { f.source = 'platform'; })],
  ['a result without its close', variant(index, (f) => { delete f.consultations[2].closedAt; })],
  ['a close on an open vote', variant(index, (f) => { f.consultations[0].closedAt = '2027-04-12T08:00:00Z'; })],
  ['a withdrawal without its instant', variant(index, (f) => { delete f.consultations[1].withdrawnAt; })],
  ['an announcement after version 1', variant(index, (f) => { f.consultations[0].version = 2; })],
  ['a registry-v0 index', variant(index, (f) => { f.source = 'registry-v0'; })],
];
for (const [what, file] of INDEX_REFUSED) {
  if (indexSchema(file)) problems.push(`consultation-index.v1 admits ${what}; it must refuse it`);
}
const empty = readJson(join(EXAMPLE_DIR, 'consultation-index.v1.empty.example.json'));
if (!indexSchema(empty) || empty.consultations.length !== 0) problems.push('consultation-index.v1.empty.example.json must be an index with no vote, which the contract admits');

fail(
  problems,
  `${versions.length} consultation.v1 and ${indexFiles.length} consultation-index.v1 examples keep their rules (${pairs} chained pairs, ` +
    `${checkedEntries} index entries checked against their documents); ${plantsJudged} planted documents each fail their rule, ` +
    `and ${edgesJudged} planted at a rule's edge pass every rule; ` +
    `${REFUSED.length + INDEX_REFUSED.length} refusals and ${ADMITTED.length + 1} admissions hold`,
);

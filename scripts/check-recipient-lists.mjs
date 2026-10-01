#!/usr/bin/env node
/**
 * Gate: the Recipient List examples keep the order, the dates and the agreement the two List
 * contracts promise, and the contracts still refuse what they must.
 *
 * `recipient-list.v1` publishes one released List version; `recipient-lists.v1` is the index of
 * every release, with what became of its publication and every removal under statutes Art. 7(6).
 * JSON Schema can say that each member exists and has the right shape; it cannot say that one
 * entry comes after another, that a notice ran thirty days, or that two documents agree. The
 * descriptions promise those, so this gate holds the examples to them:
 *
 *   LIST VERSIONS (`examples/recipient-list.v1*.example.json`)
 *     order      `recipients` is in strictly ascending `recipientId` order, the List's order
 *                (the tiebreak of `shareRule`, Calculation Rules Nr. 9);
 *     dates      the decision precedes the release (`adoptedAt` is on or before the UTC date of
 *                `generatedAt`), and every active entry's three activation dates are on or before
 *                `adoptedAt` — the decision names checks already made (Recipient Rules §4(1), §5(1));
 *                an entry no earlier list example lists as active is activated by this version, so
 *                its `activeFrom` is not before this version's `effectiveFrom` (migration 0050's
 *                LED_RECIPIENT_BEFORE_ITS_VERSION).
 *
 *   INDEXES (`examples/recipient-lists.v1*.example.json`)
 *     order      `versions` newest first, tokens strictly descending as (major, minor), releases
 *                strictly descending in time; `removals` newest first, one per organisation;
 *     url        each `url` ends in `/recipient-list/{version}.json`;
 *     instant    no `releasedAt`, `publishedAt` or `removedAt` is later than `generatedAt`;
 *     notice     no publication is proven before its release; a `recorded` entry's notice is no
 *                later than its own publication, and the first day of `effectiveFrom` is at least
 *                thirty days after the notice's UTC date (migration 0050's whole-UTC-day count);
 *     proof      a `recorded` entry's notice is the proven publication of that entry or of an
 *                earlier `recorded` one (the record holds no other notice);
 *     late       a `late` entry's proven publication is fewer than thirty days before the first
 *                day of its `effectiveFrom` — what makes it late.
 *
 *   ACROSS THE EXAMPLES
 *     agree      an index entry for a version a list example covers carries its `effectiveFrom`,
 *                its `generatedAt` as `releasedAt`, and its plane — and at least one does; a
 *                removal names the organisation as the list example does;
 *     removed    no list example whose `effectiveFrom` is the UTC month of a removal or later
 *                lists the removed organisation (migration 0050's whole-list rule);
 *     resolve    the `cost-support.v1` example's `recipientListVersion` is a list example's
 *                version, and every transfer resolves against it id for id to an ACTIVE entry of
 *                the transfer's category (no pending entry receives a share, Financial Regulation
 *                §9(1)).
 *
 *   THE CONTRACTS REFUSE (proved from the examples, so the proof moves with the shapes it guards)
 *     a pending entry carrying `standard`, `activeFrom` or an activation date; an active entry
 *     without them; a published screening record (`standard.screening`, Financial Regulation
 *     §9(7)); a share other than 0; the members that left the version document (`noticeGivenAt`,
 *     `removedAt`, `removalGround`) and those the mapping of the released body does not take
 *     (`standardUrl`, a version `note`, an entry's `website`, `address`, `activeTo` or `note`); a
 *     `draft` version or a `proposed` share rule; a document without `source`; a sample
 *     `decisionRef` on a `platform` document and a production address on a `fixture` one; a
 *     `sample` mark on a `platform` document and an unmarked entry on a `fixture` one; and in the
 *     index, a ground spelled `sanctions-hit`, a `recorded` entry without its notice, a
 *     publication on a `released` or `void` entry, a notice on a `late` one, and a production `url`
 *     on a `fixture` index. A `platform` version with no sample marks and an empty index must
 *     still validate.
 *
 * Every example rule is proved able to fail before the examples are trusted to pass: the
 * self-test breaks a copy of the examples once per rule and requires that rule, by name, to fire.
 *
 * Run: node scripts/check-recipient-lists.mjs
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const LIST_EXAMPLE = /^recipient-list\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const INDEX_EXAMPLE = /^recipient-lists\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const COST_SUPPORT_EXAMPLE = 'cost-support.v1.example.json';
const NOTICE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------------------- helpers */

/** `v2.1` -> [2, 1]; `v2` -> [2, 0], the (major, minor) order migration 0050 sorts tokens by. */
function tokenOrder(version) {
  const match = /^v([0-9]+)(?:\.([0-9]+))?$/.exec(String(version));
  return match ? [Number(match[1]), Number(match[2] ?? 0)] : [Number.NaN, Number.NaN];
}
const tokenAfter = (a, b) => {
  const [am, an] = tokenOrder(a);
  const [bm, bn] = tokenOrder(b);
  return am > bm || (am === bm && an > bn);
};
const utcDate = (instant) => new Date(Date.parse(instant)).toISOString().slice(0, 10);
const firstDay = (month) => `${month}-01`;
const daysBetween = (fromDate, toDate) => Math.round((Date.parse(`${toDate}T00:00:00Z`) - Date.parse(`${fromDate}T00:00:00Z`)) / DAY_MS);

/* --------------------------------------------------------------------------------- rules */

/**
 * Problems with one list version document, each `{ rule, message }`. `activeBefore` holds the ids an
 * earlier list example (a lower token) lists as active: any other active entry is activated here.
 */
function listProblems(name, doc, activeBefore = new Set()) {
  const found = [];
  const add = (rule, message) => found.push({ rule, message: `examples/${name}: ${message}` });
  const recipients = Array.isArray(doc.recipients) ? doc.recipients : [];

  recipients.forEach((entry, i) => {
    if (i > 0 && !(recipients[i - 1].recipientId < entry.recipientId)) {
      add('order', `recipients[${i}] ${entry.recipientId} does not come strictly after ${recipients[i - 1].recipientId} — the List's order is ascending recipientId`);
    }
    if (entry.status === 'active') {
      for (const member of ['sanctionsScreenedOn', 'accountConfirmedOn', 'grantLetterAcceptedOn']) {
        if (typeof entry[member] === 'string' && !(entry[member] <= doc.adoptedAt)) {
          add('dates', `recipients[${i}] ${member} ${entry[member]} is after the decision of ${doc.adoptedAt} that names it`);
        }
      }
      if (!activeBefore.has(entry.recipientId) && typeof entry.activeFrom === 'string' && entry.activeFrom < doc.effectiveFrom) {
        add('dates', `recipients[${i}] ${entry.recipientId} is activated by ${doc.version} from ${entry.activeFrom}, before the version takes effect (${doc.effectiveFrom})`);
      }
    }
  });
  if (typeof doc.generatedAt === 'string' && !(doc.adoptedAt <= utcDate(doc.generatedAt))) {
    add('dates', `adoptedAt ${doc.adoptedAt} is after the release instant ${doc.generatedAt} — the decision comes first`);
  }
  return found;
}

/** Problems with one index document, each `{ rule, message }`. */
function indexProblems(name, doc) {
  const found = [];
  const add = (rule, message) => found.push({ rule, message: `examples/${name}: ${message}` });
  const versions = Array.isArray(doc.versions) ? doc.versions : [];
  const removals = Array.isArray(doc.removals) ? doc.removals : [];
  const generated = Date.parse(doc.generatedAt);

  versions.forEach((entry, i) => {
    const at = `versions[${i}] (${entry.version})`;
    if (i > 0) {
      const previous = versions[i - 1];
      if (!tokenAfter(previous.version, entry.version)) {
        add('order', `${at} does not sort strictly before ${previous.version} — newest first, one entry per token`);
      }
      if (!(Date.parse(previous.releasedAt) > Date.parse(entry.releasedAt))) {
        add('order', `${at} was released at ${entry.releasedAt}, not before ${previous.version}'s ${previous.releasedAt} — tokens are released in order`);
      }
    }
    if (typeof entry.url !== 'string' || !entry.url.endsWith(`/recipient-list/${entry.version}.json`)) {
      add('url', `${at} url ${JSON.stringify(entry.url)} does not name /recipient-list/${entry.version}.json`);
    }
    for (const member of ['releasedAt', 'publishedAt']) {
      if (typeof entry[member] === 'string' && Date.parse(entry[member]) > generated) {
        add('instant', `${at} ${member} ${entry[member]} is after the document's generatedAt ${doc.generatedAt}`);
      }
    }
    if (typeof entry.publishedAt === 'string' && Date.parse(entry.publishedAt) < Date.parse(entry.releasedAt)) {
      add('notice', `${at} is proven published at ${entry.publishedAt}, before its release at ${entry.releasedAt}`);
    }
    if (entry.status === 'recorded' && typeof entry.noticeGivenAt === 'string') {
      if (Date.parse(entry.noticeGivenAt) > Date.parse(entry.publishedAt)) {
        add('notice', `${at} gives notice at ${entry.noticeGivenAt}, after its own publication at ${entry.publishedAt}`);
      }
      const days = daysBetween(utcDate(entry.noticeGivenAt), firstDay(entry.effectiveFrom));
      if (!(days >= NOTICE_DAYS)) {
        add('notice', `${at} takes effect from ${entry.effectiveFrom}, ${days} day(s) after its notice of ${entry.noticeGivenAt} (UTC date), not ${NOTICE_DAYS}`);
      }
      // The record holds as notice only the proven publication of this version or of an earlier recorded one.
      const proofs = versions.filter((other) => other.status === 'recorded' && !tokenAfter(other.version, entry.version));
      if (!proofs.some((other) => Date.parse(other.publishedAt) === Date.parse(entry.noticeGivenAt))) {
        add('proof', `${at} gives notice at ${entry.noticeGivenAt}, which is the proven publication of no recorded version at or before it`);
      }
    }
    if (entry.status === 'late' && typeof entry.publishedAt === 'string') {
      const days = daysBetween(utcDate(entry.publishedAt), firstDay(entry.effectiveFrom));
      if (days >= NOTICE_DAYS) {
        add('late', `${at} is late, but its publication of ${entry.publishedAt} came ${days} day(s) before ${firstDay(entry.effectiveFrom)}, not fewer than ${NOTICE_DAYS}`);
      }
    }
  });

  const seen = new Set();
  removals.forEach((removal, i) => {
    const at = `removals[${i}] (${removal.recipientId})`;
    if (i > 0 && !(Date.parse(removals[i - 1].removedAt) > Date.parse(removal.removedAt))) {
      add('order', `${at} removed at ${removal.removedAt} does not come strictly before ${removals[i - 1].removedAt} — newest first`);
    }
    if (seen.has(removal.recipientId)) add('order', `${at} is removed twice — one removal per organisation, ever`);
    seen.add(removal.recipientId);
    if (Date.parse(removal.removedAt) > generated) {
      add('instant', `${at} removedAt ${removal.removedAt} is after the document's generatedAt ${doc.generatedAt}`);
    }
  });
  return found;
}

/** Agreement between the list examples, the index examples and the cost-support example. */
function acrossProblems(listDocs, indexDocs, costSupport) {
  const found = [];
  const add = (rule, message) => found.push({ rule, message });
  let compared = 0;

  for (const { name: listName, doc: list } of listDocs) {
    const byId = new Map((list.recipients ?? []).map((entry) => [entry.recipientId, entry]));
    for (const { name: indexName, doc: index } of indexDocs) {
      for (const entry of index.versions ?? []) {
        if (entry.version !== list.version) continue;
        compared += 1;
        if (entry.effectiveFrom !== list.effectiveFrom) {
          add('agree', `examples/${indexName}: ${entry.version}'s effectiveFrom ${entry.effectiveFrom} is not examples/${listName}'s ${list.effectiveFrom}`);
        }
        if (entry.releasedAt !== list.generatedAt) {
          add('agree', `examples/${indexName}: ${entry.version}'s releasedAt ${entry.releasedAt} is not examples/${listName}'s generatedAt ${list.generatedAt} — a version document carries its release instant`);
        }
        if (index.source !== list.source) {
          add('agree', `examples/${indexName}: source ${JSON.stringify(index.source)} lists examples/${listName}, whose source is ${JSON.stringify(list.source)} — one plane publishes both`);
        }
      }
      for (const removal of index.removals ?? []) {
        const listed = byId.get(removal.recipientId);
        if (listed && listed.name !== removal.name) {
          add('agree', `examples/${indexName}: removal of ${removal.recipientId} names ${JSON.stringify(removal.name)}, examples/${listName} ${JSON.stringify(listed.name)}`);
        }
        const removedIn = typeof removal.removedAt === 'string' ? utcDate(removal.removedAt).slice(0, 7) : null;
        if (listed && removedIn !== null && list.effectiveFrom >= removedIn) {
          add('removed', `examples/${listName} takes effect from ${list.effectiveFrom} and lists ${removal.recipientId}, removed at ${removal.removedAt} (examples/${indexName}) — no version taking effect from the month of a removal or later lists the organisation`);
        }
      }
    }
  }
  if (compared === 0 && listDocs.length > 0) {
    add('agree', 'no index example lists a list example\'s version — the agreement would be checked vacuously');
  }

  if (costSupport) {
    const list = listDocs.find(({ doc }) => doc.version === costSupport.recipientListVersion)?.doc;
    if (!list) {
      add('resolve', `examples/${COST_SUPPORT_EXAMPLE}: recipientListVersion ${JSON.stringify(costSupport.recipientListVersion)} is no list example's version — its transfers would resolve against nothing`);
    } else {
      const byId = new Map(list.recipients.map((entry) => [entry.recipientId, entry]));
      (costSupport.transfers ?? []).forEach((transfer, i) => {
        const entry = byId.get(transfer.recipientId);
        const at = `examples/${COST_SUPPORT_EXAMPLE}: transfers[${i}] ${transfer.recipientId}`;
        if (!entry) add('resolve', `${at} is not listed by version ${list.version}`);
        else if (entry.status !== 'active') add('resolve', `${at} is ${entry.status} in version ${list.version} — no pending entry receives a share`);
        else if (transfer.category !== undefined && transfer.category !== entry.category) {
          add('resolve', `${at} is in ${transfer.category}, but version ${list.version} lists it in ${entry.category}`);
        }
      });
    }
  }
  return found;
}

/** The ids a list example with a lower token than `doc` lists as active. */
function activeBefore(listDocs, doc) {
  return new Set(
    listDocs
      .filter(({ doc: other }) => tokenAfter(doc.version, other.version))
      .flatMap(({ doc: other }) => (other.recipients ?? []).filter((entry) => entry.status === 'active').map((entry) => entry.recipientId)),
  );
}

function allProblems(listDocs, indexDocs, costSupport) {
  return [
    ...listDocs.flatMap(({ name, doc }) => listProblems(name, doc, activeBefore(listDocs, doc))),
    ...indexDocs.flatMap(({ name, doc }) => indexProblems(name, doc)),
    ...acrossProblems(listDocs, indexDocs, costSupport),
  ];
}

/* ----------------------------------------------------------------------------- self-test */

/**
 * ANTI-INERTIA. Each case breaks one copy of the examples in one way and requires the named rule
 * to fire. A rule that stopped matching would otherwise sit here looking green forever.
 */
function selfTest(listDocs, indexDocs, costSupport) {
  const clone = (value) => structuredClone(value);
  const firstList = listDocs[0];
  const firstIndex = indexDocs.find(({ doc }) => (doc.versions ?? []).length >= 2 && (doc.removals ?? []).length >= 1) ?? indexDocs[0];
  if (!firstList || !firstIndex) return ['self-test: no list or index example to break'];

  const breakList = (mutate) => {
    const doc = clone(firstList.doc);
    mutate(doc);
    return [{ name: firstList.name, doc }, ...listDocs.slice(1)];
  };
  const breakIndex = (mutate) => {
    const doc = clone(firstIndex.doc);
    mutate(doc);
    return indexDocs.map((entry) => (entry === firstIndex ? { name: firstIndex.name, doc } : entry));
  };
  const recordedEntry = (doc) => doc.versions.find((entry) => entry.status === 'recorded');
  const ownEntry = (doc) => doc.versions.find((entry) => entry.version === firstList.doc.version);
  const lateEntry = (doc) => doc.versions.find((entry) => entry.status === 'late');
  const activeEntry = (doc) => doc.recipients.find((entry) => entry.status === 'active');
  const listedRemoval = (doc) => doc.removals.find((removal) => firstList.doc.recipients.some((entry) => entry.recipientId === removal.recipientId));

  const cases = [
    ['order', breakList((d) => { d.recipients = [...d.recipients].reverse(); }), indexDocs, costSupport],
    ['dates', breakList((d) => { activeEntry(d).grantLetterAcceptedOn = '2099-01-01'; }), indexDocs, costSupport],
    ['dates', breakList((d) => { d.adoptedAt = '2099-01-01'; }), indexDocs, costSupport],
    ['dates', breakList((d) => { activeEntry(d).activeFrom = '2000-01'; }), indexDocs, costSupport],
    ['proof', listDocs, breakIndex((d) => {
      const entry = ownEntry(d);
      entry.noticeGivenAt = new Date(Date.parse(entry.noticeGivenAt) + DAY_MS).toISOString();
    }), costSupport],
    ['late', listDocs, breakIndex((d) => {
      const entry = lateEntry(d);
      entry.publishedAt = new Date(Date.parse(entry.releasedAt) + 1000).toISOString();
    }), costSupport],
    ['order', listDocs, breakIndex((d) => { d.versions = [...d.versions].reverse(); }), costSupport],
    ['order', listDocs, breakIndex((d) => { d.removals = [d.removals[0], clone(d.removals[0])]; }), costSupport],
    ['url', listDocs, breakIndex((d) => { d.versions[0].url = d.versions[0].url.replace(/\/[^/]+\.json$/, '/v99.json'); }), costSupport],
    ['instant', listDocs, breakIndex((d) => { d.generatedAt = '2000-01-01T00:00:00Z'; }), costSupport],
    ['notice', listDocs, breakIndex((d) => {
      const entry = recordedEntry(d);
      entry.noticeGivenAt = new Date(Date.parse(`${entry.effectiveFrom}-01T00:00:00Z`) - 10 * DAY_MS).toISOString();
    }), costSupport],
    ['notice', listDocs, breakIndex((d) => {
      const entry = recordedEntry(d);
      entry.noticeGivenAt = new Date(Date.parse(entry.publishedAt) + 1000).toISOString();
    }), costSupport],
    ['notice', listDocs, breakIndex((d) => {
      const entry = recordedEntry(d);
      entry.publishedAt = new Date(Date.parse(entry.releasedAt) - 1000).toISOString();
    }), costSupport],
    ['agree', listDocs, breakIndex((d) => {
      for (const entry of d.versions) if (entry.version === firstList.doc.version) entry.releasedAt = '2026-01-01T00:00:00Z';
    }), costSupport],
    ['agree', listDocs, breakIndex((d) => { listedRemoval(d).name = 'SAMPLE — another name'; }), costSupport],
    ['removed', listDocs, breakIndex((d) => { listedRemoval(d).removedAt = '2000-01-01T00:00:00Z'; }), costSupport],
    ['resolve', breakList((d) => {
      const id = costSupport.transfers[0].recipientId;
      const entry = d.recipients.find((e) => e.recipientId === id);
      entry.status = 'pending';
    }), indexDocs, costSupport],
    ['resolve', listDocs, indexDocs, { ...clone(costSupport), recipientListVersion: 'v999' }],
  ];

  const failures = [];
  for (const [rule, lists, indexes, cost] of cases) {
    const fired = allProblems(lists, indexes, cost).map((p) => p.rule);
    if (!fired.includes(rule)) {
      failures.push(`self-test: a copy broken for the "${rule}" rule did not trip it (fired: ${fired.join(', ') || 'nothing'})`);
    }
  }
  return failures;
}

/* ---------------------------------------------------------------- the contracts refuse */

/** Each refusal the two contracts promise, proved on a copy of an example. */
function contractProblems(ajv, listDocs, indexDoc) {
  const problems = [];
  const listSchema = ajv.getSchema('https://purposesource.org/spec/schemas/recipient-list.v1.json');
  const indexSchema = ajv.getSchema('https://purposesource.org/spec/schemas/recipient-lists.v1.json');
  if (!listSchema || !indexSchema) return ['the recipient-list.v1 or recipient-lists.v1 schema did not resolve by $id'];

  const clone = (value) => structuredClone(value);
  const active = (doc) => doc.recipients.find((entry) => entry.status === 'active');
  const pending = (doc) => doc.recipients.find((entry) => entry.status === 'pending');
  // The active shapes are proved on the first list example with an active entry, the pending ones on the first with a pending entry.
  const listDoc = listDocs.map(({ doc }) => doc).find((doc) => active(doc));
  const pendingDoc = listDocs.map(({ doc }) => doc).find((doc) => pending(doc));
  const withList = (mutate) => { const doc = clone(listDoc); mutate(doc); return doc; };
  const withPending = (mutate) => { const doc = clone(pendingDoc); mutate(doc); return doc; };
  const withIndex = (mutate) => { const doc = clone(indexDoc); mutate(doc); return doc; };
  const entryWith = (doc, status) => doc.versions.find((entry) => entry.status === status);
  const onPlatform = (d) => {
    d.source = 'platform';
    d.decisionRef = 'Minute 2026-12-03 item 4';
    for (const entry of d.recipients) delete entry.sample;
  };

  if (!pendingDoc) problems.push('examples/recipient-list.v1*.example.json: some list example needs a pending entry for the refusals below to be proved');
  if (!listDoc) problems.push('examples/recipient-list.v1*.example.json: some list example needs an active entry for the refusals below to be proved');
  for (const status of ['recorded', 'late', 'released', 'void']) {
    if (!entryWith(indexDoc, status)) problems.push(`examples/recipient-lists.v1.example.json: needs a ${status} entry for the refusals below to be proved`);
  }
  if (problems.length > 0) return problems;

  const refusals = [
    ['recipient-list.v1', listSchema, 'a pending entry carrying standard', withPending((d) => { pending(d).standard = clone(active(listDoc).standard); })],
    ['recipient-list.v1', listSchema, 'a pending entry carrying activeFrom', withPending((d) => { pending(d).activeFrom = d.effectiveFrom; })],
    ['recipient-list.v1', listSchema, 'a pending entry carrying an activation date', withPending((d) => { pending(d).sanctionsScreenedOn = d.adoptedAt; })],
    ['recipient-list.v1', listSchema, 'an active entry without sanctionsScreenedOn', withList((d) => { delete active(d).sanctionsScreenedOn; })],
    ['recipient-list.v1', listSchema, 'an active entry without standard', withList((d) => { delete active(d).standard; })],
    ['recipient-list.v1', listSchema, 'a published screening record (standard.screening)', withList((d) => {
      active(d).standard.screening = ['SECO', 'EU', 'UN', 'OFAC'].map((list) => ({ list, checkedAt: d.adoptedAt, result: 'clear' }));
    })],
    ['recipient-list.v1', listSchema, 'a share other than 0', withList((d) => { active(d).shareBps = 5000; })],
    ['recipient-list.v1', listSchema, 'noticeGivenAt in the version document', withList((d) => { d.noticeGivenAt = null; })],
    ['recipient-list.v1', listSchema, 'removedAt and removalGround on an entry', withList((d) => { active(d).removedAt = d.generatedAt; active(d).removalGround = 'registration lost'; })],
    ['recipient-list.v1', listSchema, 'a draft version', withList((d) => { d.status = 'draft'; })],
    ['recipient-list.v1', listSchema, 'a proposed share rule', withList((d) => { d.shareRule.status = 'proposed'; })],
    ['recipient-list.v1', listSchema, 'a standardUrl, which the mapping does not take', withList((d) => { d.standardUrl = 'https://example.org/sample-recipient-rules'; })],
    ['recipient-list.v1', listSchema, 'a version note, which the mapping does not take', withList((d) => { d.note = 'SAMPLE — free text'; })],
    ['recipient-list.v1', listSchema, "an entry's website, which the mapping does not take", withList((d) => { active(d).website = 'https://example.org/sample-recipient'; })],
    ['recipient-list.v1', listSchema, "an entry's address, which the mapping does not take", withList((d) => { active(d).address = 'SAMPLE — an address'; })],
    ['recipient-list.v1', listSchema, "an entry's activeTo, which the mapping does not take", withList((d) => { active(d).activeTo = '2099-12'; })],
    ['recipient-list.v1', listSchema, "an entry's note, which the mapping does not take", withList((d) => { active(d).note = 'SAMPLE — free text'; })],
    ['recipient-list.v1', listSchema, 'a document without source', withList((d) => { delete d.source; })],
    ['recipient-list.v1', listSchema, 'a platform document with a SAMPLE decisionRef', withList((d) => { onPlatform(d); d.decisionRef = 'SAMPLE-MINUTE-1'; })],
    ['recipient-list.v1', listSchema, 'a fixture document naming production in decisionRef', withList((d) => { d.decisionRef = 'Minute https://purposesource.org/m/1'; })],
    ['recipient-list.v1', listSchema, 'a platform document whose entries are marked sample', withList((d) => { onPlatform(d); active(d).sample = true; })],
    ['recipient-list.v1', listSchema, 'a fixture document with an entry not marked sample', withList((d) => { delete active(d).sample; })],
    ['recipient-list.v1', listSchema, 'a sample mark of false', withList((d) => { active(d).sample = false; })],
    ['recipient-lists.v1', indexSchema, 'a ground spelled sanctions-hit', withIndex((d) => { d.removals[0].ground = 'sanctions-hit'; })],
    ['recipient-lists.v1', indexSchema, 'a recorded entry without noticeGivenAt', withIndex((d) => { delete entryWith(d, 'recorded').noticeGivenAt; })],
    ['recipient-lists.v1', indexSchema, 'a released entry carrying publishedAt', withIndex((d) => { entryWith(d, 'released').publishedAt = d.generatedAt; })],
    ['recipient-lists.v1', indexSchema, 'a void entry carrying publishBatchId', withIndex((d) => { entryWith(d, 'void').publishBatchId = entryWith(d, 'recorded').publishBatchId; })],
    ['recipient-lists.v1', indexSchema, 'a late entry carrying noticeGivenAt', withIndex((d) => { entryWith(d, 'late').noticeGivenAt = entryWith(d, 'late').publishedAt; })],
    ['recipient-lists.v1', indexSchema, 'a fixture index naming production in a url', withIndex((d) => { d.versions[0].url = `https://api.purposesource.org/v1/recipient-list/${d.versions[0].version}.json`; })],
  ];
  for (const [contract, validate, what, doc] of refusals) {
    if (validate(doc)) problems.push(`schemas/${contract}.json: must refuse ${what}`);
  }

  const admissions = [
    ['recipient-list.v1', listSchema, 'a platform version with no sample marks', withList(onPlatform)],
    ['recipient-lists.v1', indexSchema, 'an index before the first release', withIndex((d) => { d.versions = []; d.removals = []; })],
  ];
  for (const [contract, validate, what, doc] of admissions) {
    if (!validate(doc)) problems.push(`schemas/${contract}.json: must admit ${what} (${JSON.stringify(validate.errors?.[0] ?? {})})`);
  }
  return problems;
}

/* ---------------------------------------------------------------------------------- main */

const names = existsSync(EXAMPLE_DIR) ? readdirSync(EXAMPLE_DIR).sort() : [];
const listDocs = names.filter((n) => LIST_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const indexDocs = names.filter((n) => INDEX_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const costSupport = existsSync(join(EXAMPLE_DIR, COST_SUPPORT_EXAMPLE)) ? readJson(join(EXAMPLE_DIR, COST_SUPPORT_EXAMPLE)) : null;

const problems = [];
if (listDocs.length === 0) problems.push('no recipient-list.v1 example — this gate would pass vacuously');
if (indexDocs.length === 0) problems.push('no recipient-lists.v1 example — this gate would pass vacuously');
if (!costSupport) problems.push(`no ${COST_SUPPORT_EXAMPLE} — the resolve rule would pass vacuously`);
if (problems.length === 0) {
  problems.push(...selfTest(listDocs, indexDocs, costSupport));
  problems.push(...allProblems(listDocs, indexDocs, costSupport).map((p) => `[${p.rule}] ${p.message}`));
  const { ajv } = createValidatorWithAllSchemas();
  problems.push(...contractProblems(ajv, listDocs, indexDocs[0].doc));
}

const entries = listDocs.reduce((sum, { doc }) => sum + (doc.recipients ?? []).length, 0);
const versions = indexDocs.reduce((sum, { doc }) => sum + (doc.versions ?? []).length, 0);
const removals = indexDocs.reduce((sum, { doc }) => sum + (doc.removals ?? []).length, 0);
fail(
  problems,
  `recipient lists: ${listDocs.length} version example(s), ${entries} entries in the List's order; ` +
    `indexes: ${indexDocs.length} example(s), ${versions} versions and ${removals} removal(s), ordered, dated and in agreement; ` +
    `the cost-support transfers resolve to active entries; the two contracts refuse what they must (self-test: every rule can fail)`,
);

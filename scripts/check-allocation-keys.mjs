#!/usr/bin/env node
/**
 * Gate: every example allocation key hashes to the text two stewards approved, and the index
 * examples agree with the keys and with the rules of the four statuses.
 *
 * `allocation-key.v1` publishes the board's key for one month together with the exact text the
 * two approvals hashed (`approvedBody`, a string) and that hash (`bodySha256`). The point of the
 * artifact is that anyone can recompute the one from the other and read the key back out of the
 * approved text. JSON Schema can say that both members exist and have the right shape; it cannot
 * say that one is the SHA-256 of the other, or that the key inside the text is the key beside it.
 * An example whose hash does not recompute is exactly the example somebody copies into a
 * renderer's test, so this gate holds the examples to what the schema descriptions promise:
 *
 *   KEY DOCUMENTS (`examples/allocation-key.v1*.example.json`)
 *     hash       `bodySha256` is the SHA-256 of the UTF-8 bytes of `approvedBody`, as carried;
 *     canonical  `approvedBody` is its own RFC 8785 form (sorted members, no whitespace,
 *                integers only), so the bytes are the ones the proposal store writes;
 *     body       the parsed text's `actKind` is `policy-adopt`, and its `effectiveMonth`,
 *                `decisionRef`, `listVersion`, `weights` and `stewardDefaultVector` equal the
 *                document's `effectiveMonth`, `decisionRef`, `listVersion`, `weights` and `key`;
 *     sum        the key's shares sum to exactly 10000;
 *     envelope   `generatedAt` equals `releasedAt` (the document is written once);
 *     menu       the text's `categoryFunds` are the published menu's seven, `{fundId, name}`,
 *                sorted by `fundId` — the proposal carries the menu it was checked against.
 *
 *   THE KEY AGAINST THE LIST (reader check 5; `examples/recipient-list.v1*.example.json` and
 *   `examples/recipient-lists.v1*.example.json`)
 *     weights    a list example is published for the key's `listVersion`, `weights` names every
 *                entry it lists, pending ones included, and one category's entries carry equal
 *                weights (the allocator splits a category equally, so unequal ones would be
 *                published and not applied);
 *     derive     `key` is the largest remainder of 10000 over each category's sum of the weights
 *                of `listVersion`'s ACTIVE entries, less those the List index shows removed before
 *                `releasedAt`, ties to the ascending category id, a category at 0 left out;
 *     version    the List index lists `listVersion`, released before the key and taking effect at
 *                or before `effectiveMonth`, and no version the index shows `released` or
 *                `recorded` (so not closed late or void when the key was released) was released
 *                before the key, takes effect at or before `effectiveMonth` and sorts after it.
 *
 *   THE CONTRACT REFUSES a key without `listVersion` or `weights`, a weight below 1, and a
 *   weight named by anything but an `rcp_` id (proved on copies of the example).
 *
 *   INDEXES (`examples/allocation-keys.v1*.example.json`)
 *     order      `keys` is newest `effectiveMonth` first, one entry per month;
 *     instant    no `releasedAt` is later than the document's `generatedAt`;
 *     url        each `url` ends in `/allocation-keys/{effectiveMonth}.json`;
 *     date       `recorded` is published before the month's first day, `late` on or after it,
 *                and no publication date is earlier than the UTC date of the release;
 *     agree      an index entry for a month a key example covers carries that key's
 *                `bodySha256`, `decisionRef`, `releasedAt` and plane — and at least one does,
 *                so the agreement is never checked vacuously.
 *
 * Every rule is proved able to fail before the examples are trusted to pass: the self-test
 * breaks a copy of the examples once per rule and requires that rule, by name, to fire.
 *
 * Run: node scripts/check-allocation-keys.mjs
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';

const KEY_EXAMPLE = /^allocation-key\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const INDEX_EXAMPLE = /^allocation-keys\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const LIST_EXAMPLE = /^recipient-list\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const LIST_INDEX_EXAMPLE = /^recipient-lists\.v1(?:\.[a-z0-9][a-z0-9-]*)?\.example\.json$/;
const MENU_EXAMPLE = 'category-menu.v1.example.json';
const KEY_TOTAL_BPS = 10000;

/* --------------------------------------------------------------------------- canonical */

/**
 * RFC 8785 for the value space the proposal body uses: objects, arrays, strings, integers,
 * booleans and null. A non-integer number or a lone surrogate is refused rather than guessed
 * at, as the platform's canonicaliser refuses them. Members sort by UTF-16 code unit, which is
 * what `Array.prototype.sort()` compares; `JSON.stringify` of a string is RFC 8785's escaping.
 */
function canonical(value, path = '$') {
  if (value === null || typeof value === 'boolean') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) throw new Error(`${path}: ${value} is not a safe integer`);
    return String(Object.is(value, -0) ? 0 : value);
  }
  if (typeof value === 'string') {
    if (!value.isWellFormed()) throw new Error(`${path}: a string with a lone surrogate`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map((item, i) => canonical(item, `${path}[${i}]`)).join(',')}]`;
  if (typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((name) => `${canonical(name, `${path}.${name}`)}:${canonical(value[name], `${path}.${name}`)}`)
      .join(',')}}`;
  }
  throw new Error(`${path}: a value of type ${typeof value}`);
}

const sha256Hex = (text) => createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');

const sameEntries = (a, b) => {
  const left = Object.entries(a ?? {}).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
  const right = Object.entries(b ?? {}).sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));
  return JSON.stringify(left) === JSON.stringify(right);
};

/* ------------------------------------------------------------------------------- rules */

/** Problems with one key document, each `{ rule, message }`. */
function keyProblems(name, doc, menu) {
  const found = [];
  const add = (rule, message) => found.push({ rule, message: `examples/${name}: ${message}` });
  const text = typeof doc.approvedBody === 'string' ? doc.approvedBody : '';

  if (sha256Hex(text) !== doc.bodySha256) {
    add('hash', `bodySha256 ${doc.bodySha256} is not the SHA-256 of approvedBody's UTF-8 bytes (${sha256Hex(text)})`);
  }

  let body = null;
  try {
    body = JSON.parse(text);
  } catch (error) {
    add('canonical', `approvedBody is not JSON text: ${error.message}`);
  }

  if (body !== null) {
    let form = null;
    try {
      form = canonical(body);
    } catch (error) {
      add('canonical', `approvedBody has no RFC 8785 form: ${error.message}`);
    }
    if (form !== null && form !== text) {
      add('canonical', 'approvedBody is not its own RFC 8785 form — the bytes the approvals hashed are the canonical text, and nothing else');
    }

    if (body.actKind !== 'policy-adopt') add('body', `approvedBody's actKind is ${JSON.stringify(body.actKind)}, not "policy-adopt"`);
    if (body.effectiveMonth !== doc.effectiveMonth) {
      add('body', `approvedBody's effectiveMonth ${JSON.stringify(body.effectiveMonth)} is not the document's ${JSON.stringify(doc.effectiveMonth)}`);
    }
    if (body.decisionRef !== doc.decisionRef) {
      add('body', `approvedBody's decisionRef ${JSON.stringify(body.decisionRef)} is not the document's ${JSON.stringify(doc.decisionRef)}`);
    }
    if (!sameEntries(body.stewardDefaultVector, doc.key)) {
      add('body', "approvedBody's stewardDefaultVector is not the document's key — the published key must be the approved one");
    }
    if (body.listVersion !== doc.listVersion) {
      add('body', `approvedBody's listVersion ${JSON.stringify(body.listVersion)} is not the document's ${JSON.stringify(doc.listVersion)}`);
    }
    if (!sameEntries(body.weights, doc.weights)) {
      add('body', "approvedBody's weights are not the document's weights — the published weights must be the approved ones");
    }

    const expectedFunds = menu.categories
      .map((row) => ({ fundId: row.category_id, name: row.name }))
      .sort((a, b) => (a.fundId < b.fundId ? -1 : a.fundId > b.fundId ? 1 : 0));
    if (JSON.stringify(body.categoryFunds) !== JSON.stringify(expectedFunds)) {
      add('menu', `approvedBody's categoryFunds are not the published menu's seven {fundId, name}, sorted by fundId`);
    }
  }

  const total = Object.values(doc.key ?? {}).reduce((sum, bps) => sum + bps, 0);
  if (total !== KEY_TOTAL_BPS) add('sum', `the key's shares sum to ${total}, not ${KEY_TOTAL_BPS}`);

  if (doc.generatedAt !== doc.releasedAt) {
    add('envelope', `generatedAt ${doc.generatedAt} is not releasedAt ${doc.releasedAt} — a document written once carries its release instant`);
  }
  return found;
}

/** Problems with one index document, each `{ rule, message }`. */
function indexProblems(name, doc) {
  const found = [];
  const add = (rule, message) => found.push({ rule, message: `examples/${name}: ${message}` });
  const keys = Array.isArray(doc.keys) ? doc.keys : [];

  keys.forEach((entry, i) => {
    const at = `keys[${i}] (${entry.effectiveMonth})`;
    if (i > 0 && !(keys[i - 1].effectiveMonth > entry.effectiveMonth)) {
      add('order', `${at} does not come strictly after ${keys[i - 1].effectiveMonth} — newest first, one entry per month`);
    }
    if (Date.parse(entry.releasedAt) > Date.parse(doc.generatedAt)) {
      add('instant', `${at} was released at ${entry.releasedAt}, after the document's generatedAt ${doc.generatedAt}`);
    }
    if (typeof entry.url !== 'string' || !entry.url.endsWith(`/allocation-keys/${entry.effectiveMonth}.json`)) {
      add('url', `${at} url ${JSON.stringify(entry.url)} does not name /allocation-keys/${entry.effectiveMonth}.json`);
    }
    if (entry.publishedOn !== undefined) {
      const firstDay = `${entry.effectiveMonth}-01`;
      if (entry.status === 'recorded' && !(entry.publishedOn < firstDay)) {
        add('date', `${at} is recorded but published on ${entry.publishedOn}, not before ${firstDay}`);
      }
      if (entry.status === 'late' && entry.publishedOn < firstDay) {
        add('date', `${at} is late but published on ${entry.publishedOn}, before ${firstDay}`);
      }
      if (typeof entry.releasedAt === 'string' && entry.publishedOn < entry.releasedAt.slice(0, 10)) {
        add('date', `${at} is published on ${entry.publishedOn}, before the UTC date of its release ${entry.releasedAt}`);
      }
    }
  });
  return found;
}

/** Every key example's month, where an index example covers it, must agree field for field. */
function agreementProblems(keyDocs, indexDocs) {
  const found = [];
  let compared = 0;
  for (const { name: keyName, doc: key } of keyDocs) {
    for (const { name: indexName, doc: index } of indexDocs) {
      for (const entry of index.keys ?? []) {
        if (entry.effectiveMonth !== key.effectiveMonth) continue;
        compared += 1;
        for (const member of ['bodySha256', 'decisionRef', 'releasedAt']) {
          if (entry[member] !== key[member]) {
            found.push({
              rule: 'agree',
              message: `examples/${indexName}: the ${entry.effectiveMonth} entry's ${member} ${JSON.stringify(entry[member])} is not examples/${keyName}'s ${JSON.stringify(key[member])}`,
            });
          }
        }
        if (index.source !== key.source) {
          found.push({
            rule: 'agree',
            message: `examples/${indexName}: source ${JSON.stringify(index.source)} lists examples/${keyName}, whose source is ${JSON.stringify(key.source)} — one plane publishes both`,
          });
        }
      }
    }
  }
  if (compared === 0 && keyDocs.length > 0) {
    found.push({ rule: 'agree', message: 'no index example lists a key example\'s month — the agreement would be checked vacuously' });
  }
  return found;
}

/**
 * Reader check (5): the key derived from the weights over the List version it names.
 * For each category k, W_k sums the weights of `listVersion`'s active entries in k, leaving out
 * every entry the List index shows removed before the key's release; the key is the largest
 * remainder of 10000 over the W_k, ties to the ascending category id, and a category at 0 is
 * left out. An entry's category slug `s` counts for `cat-s`, the list's own `fundId`.
 */
function deriveKey(list, weights, removedIds) {
  const fundOf = new Map((list.categories ?? []).map((row) => [row.slug, row.fundId ?? `cat-${row.slug}`]));
  const sums = new Map();
  for (const entry of list.recipients ?? []) {
    if (entry.status !== 'active' || removedIds.has(entry.recipientId)) continue;
    const category = fundOf.get(entry.category) ?? `cat-${entry.category}`;
    sums.set(category, (sums.get(category) ?? 0) + (weights[entry.recipientId] ?? 0));
  }
  const categories = [...sums.keys()].filter((k) => sums.get(k) > 0).sort();
  const total = categories.reduce((sum, k) => sum + sums.get(k), 0);
  if (total === 0) return {};
  const floors = new Map();
  const remainders = new Map();
  for (const k of categories) {
    const quota = sums.get(k) * KEY_TOTAL_BPS;
    floors.set(k, Math.floor(quota / total));
    remainders.set(k, quota % total);
  }
  let left = KEY_TOTAL_BPS - [...floors.values()].reduce((sum, bps) => sum + bps, 0);
  const byRemainder = [...categories].sort((a, b) => remainders.get(b) - remainders.get(a) || (a < b ? -1 : a > b ? 1 : 0));
  for (const k of byRemainder) {
    if (left === 0) break;
    floors.set(k, floors.get(k) + 1);
    left -= 1;
  }
  return Object.fromEntries([...floors].filter(([, bps]) => bps > 0));
}

/** Every key example against the List example it names and the List index's removals. */
function listProblems(keyDocs, listDocs, listIndexDocs) {
  const found = [];
  let derived = 0;
  for (const { name, doc } of keyDocs) {
    const add = (rule, message) => found.push({ rule, message: `examples/${name}: ${message}` });
    const list = listDocs.find(({ doc: candidate }) => candidate.version === doc.listVersion)?.doc;
    if (!list) {
      add('weights', `no recipient-list.v1 example is version ${JSON.stringify(doc.listVersion)}, the key's listVersion — check (5) would be skipped`);
      continue;
    }
    const weights = doc.weights ?? {};
    const byCategory = new Map();
    for (const entry of list.recipients ?? []) {
      if (!Number.isInteger(weights[entry.recipientId])) {
        add('weights', `${entry.recipientId} (${entry.status}, ${entry.category}) is listed by ${list.version} and has no weight — every listed entry carries one`);
        continue;
      }
      const seen = byCategory.get(entry.category);
      if (seen !== undefined && seen !== weights[entry.recipientId]) {
        add('weights', `${entry.category} carries unequal weights (${seen} and ${weights[entry.recipientId]}) — one category's entries are weighted equally`);
      }
      byCategory.set(entry.category, seen ?? weights[entry.recipientId]);
    }
    const removedIds = new Set(
      listIndexDocs.flatMap(({ doc: index }) =>
        (index.removals ?? []).filter((r) => Date.parse(r.removedAt) < Date.parse(doc.releasedAt)).map((r) => r.recipientId),
      ),
    );
    const expected = deriveKey(list, weights, removedIds);
    derived += 1;
    if (!sameEntries(expected, doc.key)) {
      add('derive', `key ${JSON.stringify(doc.key)} is not the key its weights give over ${list.version}'s active entries less ${removedIds.size} removal(s) before ${doc.releasedAt}: ${JSON.stringify(expected)}`);
    }
  }
  if (derived === 0 && keyDocs.length > 0) {
    found.push({ rule: 'derive', message: 'no key example was derived against a list example — check (5) would be checked vacuously' });
  }
  return found;
}

/** `v2.1` -> [2, 1]; `v2` -> [2, 0]: the (major, minor) order List tokens sort by. */
function tokenAfter(a, b) {
  const order = (version) => {
    const match = /^v([0-9]+)(?:\.([0-9]+))?$/.exec(String(version));
    return match ? [Number(match[1]), Number(match[2] ?? 0)] : [Number.NaN, Number.NaN];
  };
  const [am, an] = order(a);
  const [bm, bn] = order(b);
  return am > bm || (am === bm && an > bn);
}

/**
 * `listVersion` is the version in force for `effectiveMonth` as the key's release could know it: released before
 * the key, taking effect at or before the month, and no later-sorting version that was then still open (the index
 * shows it `released` or `recorded`) qualified too. A version closed late or void AFTER the key's release may still
 * be the key's, so the index's present `late` and `void` entries are neither required nor refused here.
 */
function versionProblems(keyDocs, listIndexDocs) {
  const found = [];
  const entries = listIndexDocs.flatMap(({ doc }) => doc.versions ?? []);
  for (const { name, doc } of keyDocs) {
    const add = (message) => found.push({ rule: 'version', message: `examples/${name}: ${message}` });
    const released = Date.parse(doc.releasedAt);
    const own = entries.find((entry) => entry.version === doc.listVersion);
    if (!own) {
      add(`listVersion ${JSON.stringify(doc.listVersion)} is in no recipient-lists.v1 example — a key names a released List version`);
      continue;
    }
    if (!(Date.parse(own.releasedAt) < released)) {
      add(`listVersion ${own.version} was released at ${own.releasedAt}, not before the key's release at ${doc.releasedAt}`);
    }
    if (!(own.effectiveFrom <= doc.effectiveMonth)) {
      add(`listVersion ${own.version} takes effect from ${own.effectiveFrom}, after the key's month ${doc.effectiveMonth}`);
    }
    const newer = entries.find((entry) => ['released', 'recorded'].includes(entry.status)
      && Date.parse(entry.releasedAt) < released
      && entry.effectiveFrom <= doc.effectiveMonth
      && tokenAfter(entry.version, doc.listVersion));
    if (newer) {
      add(`listVersion ${own.version} is not the version in force for ${doc.effectiveMonth}: ${newer.version}, released at ${newer.releasedAt} and taking effect from ${newer.effectiveFrom}, sorts after it`);
    }
  }
  return found;
}

function allProblems(keyDocs, indexDocs, menu, listDocs, listIndexDocs) {
  return [
    ...keyDocs.flatMap(({ name, doc }) => keyProblems(name, doc, menu)),
    ...indexDocs.flatMap(({ name, doc }) => indexProblems(name, doc)),
    ...agreementProblems(keyDocs, indexDocs),
    ...listProblems(keyDocs, listDocs, listIndexDocs),
    ...versionProblems(keyDocs, listIndexDocs),
  ];
}

/* --------------------------------------------------------------------------- self-test */

/**
 * ANTI-INERTIA. Each case breaks one copy of the examples in one way and requires the named rule
 * to fire. A rule that stopped matching would otherwise sit here looking green forever.
 */
function selfTest(keyDocs, indexDocs, menu, listDocs, listIndexDocs) {
  const clone = (value) => structuredClone(value);
  const firstKey = keyDocs[0];
  const firstIndex = indexDocs.find(({ doc }) => (doc.keys ?? []).length >= 2) ?? indexDocs[0];
  if (!firstKey || !firstIndex) return ['self-test: no key or index example to break'];
  const keyList = listDocs.find(({ doc }) => doc.version === firstKey.doc.listVersion);
  if (!keyList || listIndexDocs.length === 0) return ['self-test: no List example for the key to break'];

  const breakKey = (mutate) => {
    const doc = clone(firstKey.doc);
    mutate(doc);
    return [{ name: firstKey.name, doc }];
  };
  const breakIndex = (mutate) => {
    const doc = clone(firstIndex.doc);
    mutate(doc);
    return [{ name: firstIndex.name, doc }];
  };
  const reserialised = (doc) => JSON.stringify(JSON.parse(doc.approvedBody), null, 1);
  const withBody = (doc, change) => {
    const body = JSON.parse(doc.approvedBody);
    change(body);
    doc.approvedBody = canonical(body);
    doc.bodySha256 = sha256Hex(doc.approvedBody);
  };
  const firstCategory = (doc) => Object.keys(doc.key)[0];
  const firstListed = (doc) => keyList.doc.recipients.map((entry) => entry.recipientId).find((id) => id in doc.weights);

  const cases = [
    ['hash', breakKey((d) => { d.bodySha256 = sha256Hex(`${d.approvedBody}\n`); }), [firstIndex]],
    ['canonical', breakKey((d) => { d.approvedBody = reserialised(d); d.bodySha256 = sha256Hex(d.approvedBody); }), [firstIndex]],
    ['body', breakKey((d) => withBody(d, (b) => { b.actKind = 'schedule-publish'; })), [firstIndex]],
    ['body', breakKey((d) => { d.key[firstCategory(d)] += 1; d.key[Object.keys(d.key)[1]] -= 1; }), [firstIndex]],
    ['sum', breakKey((d) => {
      const total = Object.values(d.key).reduce((sum, bps) => sum + bps, 0);
      d.key[firstCategory(d)] += KEY_TOTAL_BPS + 1 - total;
      withBody(d, (b) => { b.stewardDefaultVector = { ...d.key }; });
    }), [firstIndex]],
    ['menu', breakKey((d) => withBody(d, (b) => { b.categoryFunds = [...b.categoryFunds].reverse(); })), [firstIndex]],
    ['envelope', breakKey((d) => { d.generatedAt = '2099-01-01T00:00:00Z'; }), [firstIndex]],
    ['order', [firstKey], breakIndex((d) => { d.keys = [...d.keys].reverse(); })],
    ['instant', [firstKey], breakIndex((d) => { d.generatedAt = '2000-01-01T00:00:00Z'; })],
    ['url', [firstKey], breakIndex((d) => { d.keys[0].url = d.keys[0].url.replace(/\d{4}-\d{2}\.json$/, '1999-01.json'); })],
    ['date', [firstKey], breakIndex((d) => {
      const entry = d.keys.find((e) => e.status === 'recorded') ?? d.keys[0];
      entry.status = 'recorded';
      entry.publishedOn = `${entry.effectiveMonth}-01`;
    })],
    ['agree', [firstKey], indexDocs.map(({ name, doc }) => {
      const copy = clone(doc);
      for (const entry of copy.keys ?? []) {
        if (entry.effectiveMonth === firstKey.doc.effectiveMonth) entry.bodySha256 = '0'.repeat(64);
      }
      return { name, doc: copy };
    })],
    // Reader check (5). Each copy keeps the body in step with the document, so only the named rule's reason is new.
    ['body', breakKey((d) => { d.listVersion = 'v999'; }), [firstIndex]],
    ['body', breakKey((d) => { d.weights[firstListed(d)] += 1; }), [firstIndex]],
    ['weights', breakKey((d) => { d.listVersion = 'v999'; withBody(d, (b) => { b.listVersion = d.listVersion; }); }), [firstIndex]],
    ['weights', breakKey((d) => { delete d.weights[firstListed(d)]; withBody(d, (b) => { b.weights = { ...d.weights }; }); }), [firstIndex]],
    ['weights', breakKey((d) => { d.weights[firstListed(d)] += 1; withBody(d, (b) => { b.weights = { ...d.weights }; }); }), [firstIndex]],
    ['derive', breakKey((d) => {
      const [a, b] = Object.keys(d.key);
      d.key[a] += 1;
      d.key[b] -= 1;
      withBody(d, (body) => { body.stewardDefaultVector = { ...d.key }; });
    }), [firstIndex]],
    ['derive', [firstKey], [firstIndex], listDocs.map(({ name, doc }) => {
      const copy = clone(doc);
      if (copy.version === keyList.doc.version) copy.recipients.find((entry) => entry.status === 'active').status = 'pending';
      return { name, doc: copy };
    }), listIndexDocs],
    ['version', breakKey((d) => {
      d.listVersion = listIndexDocs.flatMap(({ doc }) => doc.versions ?? []).find((e) => tokenAfter(d.listVersion, e.version)).version;
      withBody(d, (b) => { b.listVersion = d.listVersion; });
    }), [firstIndex]],
    ['version', [firstKey], [firstIndex], listDocs, listIndexDocs.map(({ name, doc }) => {
      const copy = clone(doc);
      for (const entry of copy.versions ?? []) {
        if (entry.version === firstKey.doc.listVersion) entry.releasedAt = new Date(Date.parse(firstKey.doc.releasedAt) + 1000).toISOString();
      }
      return { name, doc: copy };
    })],
    ['derive', [firstKey], [firstIndex], listDocs, [
      ...listIndexDocs,
      {
        name: 'recipient-lists.v1.self-test',
        doc: {
          removals: [{
            recipientId: keyList.doc.recipients.find((e) => e.status === 'active').recipientId,
            removedAt: new Date(Date.parse(firstKey.doc.releasedAt) - 1000).toISOString(),
          }],
        },
      },
    ]],
  ];

  const failures = [];
  for (const [rule, keys, indexes, lists = listDocs, listIndexes = listIndexDocs] of cases) {
    const fired = allProblems(keys, indexes, menu, lists, listIndexes).map((p) => p.rule);
    if (!fired.includes(rule)) {
      failures.push(`self-test: a copy broken for the "${rule}" rule did not trip it (fired: ${fired.join(', ') || 'nothing'})`);
    }
  }
  return failures;
}

/* ------------------------------------------------------------------------------- main */

const names = existsSync(EXAMPLE_DIR) ? readdirSync(EXAMPLE_DIR).sort() : [];
const keyDocs = names.filter((n) => KEY_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const indexDocs = names.filter((n) => INDEX_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const menu = readJson(join(EXAMPLE_DIR, MENU_EXAMPLE));
const listDocs = names.filter((n) => LIST_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));
const listIndexDocs = names.filter((n) => LIST_INDEX_EXAMPLE.test(n)).map((name) => ({ name, doc: readJson(join(EXAMPLE_DIR, name)) }));

/** The key's contract refuses what reader check (5) needs present, proved on copies of the first example. */
function contractProblems(keyDoc) {
  const { ajv } = createValidatorWithAllSchemas();
  const validate = ajv.getSchema('https://purposesource.org/spec/schemas/allocation-key.v1.json');
  if (!validate) return ['schemas/allocation-key.v1.json: did not resolve by $id'];
  const withKey = (mutate) => {
    const doc = structuredClone(keyDoc);
    mutate(doc);
    return doc;
  };
  const firstWeighted = Object.keys(keyDoc.weights ?? {})[0];
  const refusals = [
    ['a key without listVersion', withKey((d) => { delete d.listVersion; })],
    ['a key without weights', withKey((d) => { delete d.weights; })],
    ['a weight below 1', withKey((d) => { d.weights[firstWeighted] = 0; })],
    ['a weight named by anything but an rcp_ id', withKey((d) => { d.weights['cat-health'] = 1; })],
  ];
  return refusals.filter(([, doc]) => validate(doc)).map(([what]) => `schemas/allocation-key.v1.json: must refuse ${what}`);
}

const problems = [];
if (keyDocs.length === 0) problems.push('no allocation-key.v1 example — this gate would pass vacuously');
if (indexDocs.length === 0) problems.push('no allocation-keys.v1 example — this gate would pass vacuously');
if (listDocs.length === 0) problems.push('no recipient-list.v1 example — reader check (5) would pass vacuously');
if (listIndexDocs.length === 0) problems.push('no recipient-lists.v1 example — reader check (5) would read no removals');
if (problems.length === 0) {
  problems.push(...selfTest(keyDocs, indexDocs, menu, listDocs, listIndexDocs));
  problems.push(...allProblems(keyDocs, indexDocs, menu, listDocs, listIndexDocs).map((p) => `[${p.rule}] ${p.message}`));
  problems.push(...contractProblems(keyDocs[0].doc));
}

const entries = indexDocs.reduce((sum, { doc }) => sum + (doc.keys ?? []).length, 0);
fail(
  problems,
  `allocation keys: ${keyDocs.length} example(s), each hashing to the approved text it carries, publishing that text's key and ` +
    `deriving it from its weights over the List version it names (reader check 5); ` +
    `indexes: ${indexDocs.length} example(s), ${entries} entries, ordered, dated and in agreement with the keys (self-test: every rule can fail)`,
);

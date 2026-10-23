#!/usr/bin/env node
/**
 * Gate: the signing key set has one contract in two places, its verdict is published whole, and
 * the key set and its incident list refuse what a verifier would refuse.
 *
 * `/jwks.json` and `/sandbox/jwks.json` answer with the `Jwks` component of
 * `openapi/edge-public.v1.yaml`, which the website's and the platform's gates read from the API
 * description itself. `schemas/jwks.v1.json` is the same contract as one self-contained download.
 * Two copies of a contract drift unless something holds them together, and the verdict a verifier
 * gives against the set is published as prose (`getJwks`) and as data (`x-psn.keyVerdict`), which
 * drift the same way. So this gate asserts:
 *
 *   ONE CONTRACT  the component and the schema file are equal keyword for keyword, annotations
 *                 (descriptions, titles, `x-psn`) aside. The comparison is held to two planted
 *                 copies first: one that differs in a constraint, which it must flag, and one that
 *                 differs in a description only, which it must pass.
 *   THE VERDICT   every code in `x-psn.keyVerdict.codes` has one of the five published classes, each
 *                 class is used, and `getJwks` names every code and no other; the claim each `typ`
 *                 is dated by is the one its contract fixes: the families listed are exactly the
 *                 schemas that carry a signature profile, each row's `typ` is that profile's
 *                 `typHeader` (null where it fixes none, and only one row may be null), and its
 *                 claim is a required member of the contract.
 *   THE EXAMPLES  every key set published here (`examples/jwks.v1*.example.json` and the examples of
 *                 the two key-set routes) names each kid once, closes each window after it opens,
 *                 carries sandbox keys exactly when it is marked `sandbox`, and holds one `active`
 *                 production key when it holds any; a compromised key has an incident list among
 *                 the examples, the lists it names (`psn:incidents`) are examples that name it,
 *                 earliest first, and its `notAfter` is not later than the exposure those lists
 *                 declare. Every incident list is dated by its own instant (`date` is the UTC
 *                 date of `generatedAt`), names each key once in kid order, closes each exposure
 *                 after it opens and no later than the list, and lists its forged entries once each
 *                 in log order; one example lists forged entries and one lists none. Each rule is
 *                 held to a planted document it must flag.
 *   REFUSALS      the key set (the schema file and the component alike) refuses a production key
 *                 without its standing, a key stating one member of the two, a retired or
 *                 compromised key whose window never closes, a status it does not define,
 *                 incident lists on any key but a compromised one or named outside their path
 *                 grammar, and the shapes no verifier resolves; it admits a test key stating
 *                 neither, the committed keys with no envelope, the honest empty set, the
 *                 withdrawn shape the platform publishes, and a compromised key whose first list
 *                 is not published yet. The incident list refuses a list with no plane label or
 *                 the curated registry's, a sandbox key, a key without its exposure, a forged entry
 *                 carrying anything but its position and hash, and a member it does not define.
 *
 * Run: node scripts/check-jwks.mjs
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, EXAMPLE_DIR, createAjv, createValidatorWithAllSchemas, readJson, readYamlFile, fail } from './lib/spec.mjs';

const problems = [];
const BASE = 'https://purposesource.org/spec/schemas';
const { ajv, schemas } = createValidatorWithAllSchemas();
const keySetSchema = ajv.getSchema(`${BASE}/jwks.v1.json`);
const incidentSchema = ajv.getSchema(`${BASE}/key-incidents.v1.json`);
if (!keySetSchema || !incidentSchema) {
  fail(['jwks.v1 or key-incidents.v1 did not resolve by $id'], '');
}

const openapi = readYamlFile(join(ROOT, 'openapi', 'edge-public.v1.yaml'));
const component = openapi?.components?.schemas?.Jwks;
const fileSchema = schemas.find(({ file }) => file === 'jwks.v1.json').json;
const getJwks = openapi?.paths?.['/jwks.json']?.get;
const getSandboxJwks = openapi?.paths?.['/sandbox/jwks.json']?.get;
if (!component || !getJwks || !getSandboxJwks) {
  fail(['openapi/edge-public.v1.yaml: the Jwks component, getJwks or getSandboxJwks did not resolve'], '');
}

const clone = (doc) => JSON.parse(JSON.stringify(doc));
const instant = (text) => Date.parse(text);

/* ---------------------------------------------------------------------------- one contract */

/** Keywords that describe and never constrain: the two copies may word them differently. */
const ANNOTATIONS = new Set(['$schema', '$id', '$comment', 'title', 'description', 'examples', 'example', 'x-psn']);

/** The constraint keywords of a schema, annotations removed at every depth (a property NAMED `description` is kept). */
function constraints(node, inProperties = false) {
  if (Array.isArray(node)) return node.map((item) => constraints(item));
  if (!node || typeof node !== 'object') return node;
  const out = {};
  for (const [key, value] of Object.entries(node)) {
    if (!inProperties && ANNOTATIONS.has(key)) continue;
    const childIsPropertyMap = !inProperties && (key === 'properties' || key === 'dependentRequired' || key === '$defs');
    out[key] = inProperties ? constraints(value) : constraints(value, childIsPropertyMap);
  }
  return out;
}

/** The first JSON pointer at which two constraint trees differ, or null. Member order does not count. */
function firstDifference(left, right, at = '') {
  if (left === right) return null;
  const leftObject = left !== null && typeof left === 'object';
  const rightObject = right !== null && typeof right === 'object';
  if (!leftObject || !rightObject || Array.isArray(left) !== Array.isArray(right)) return at || '/';
  if (Array.isArray(left)) {
    if (left.length !== right.length) return `${at}/length`;
    for (let i = 0; i < left.length; i += 1) {
      const found = firstDifference(left[i], right[i], `${at}/${i}`);
      if (found) return found;
    }
    return null;
  }
  for (const key of [...new Set([...Object.keys(left), ...Object.keys(right)])].sort()) {
    if (!(key in left) || !(key in right)) return `${at}/${key}`;
    const found = firstDifference(left[key], right[key], `${at}/${key}`);
    if (found) return found;
  }
  return null;
}

const twoCopies = (componentSide, fileSide) => firstDifference(constraints(componentSide), constraints(fileSide));

const plantedConstraint = clone(fileSchema);
plantedConstraint.properties.keys.items.allOf[0].if.properties.kid.pattern = '^psn-(prod|dev)-';
const plantedWording = clone(fileSchema);
plantedWording.properties.keys.items.properties['psn:status'].description = 'Worded otherwise.';
if (twoCopies(component, plantedConstraint) === null) problems.push('the two-copies rule passes a copy whose production-key condition differs');
if (twoCopies(component, plantedWording) !== null) problems.push('the two-copies rule flags a copy that differs in a description only');

const differs = twoCopies(component, fileSchema);
if (differs !== null) {
  problems.push(
    `schemas/jwks.v1.json and the Jwks component of openapi/edge-public.v1.yaml differ at ${differs}: they are one contract, ` +
      'so a change to either is made to both',
  );
}

/* ----------------------------------------------------------------------------- the verdict */

const verdict = fileSchema['x-psn']?.keyVerdict ?? {};
const CLASSES = ['accept', 'warn', 'token', 'key-set', 'unsupported'];
const outcomes = verdict.outcomes ?? {};
const codes = verdict.codes ?? {};
if (JSON.stringify(Object.keys(outcomes).sort()) !== JSON.stringify([...CLASSES].sort())) {
  problems.push(`x-psn.keyVerdict.outcomes must describe exactly the five classes ${CLASSES.join(', ')} (found ${Object.keys(outcomes).join(', ')})`);
}
for (const [code, cls] of Object.entries(codes)) {
  if (!CLASSES.includes(cls)) problems.push(`x-psn.keyVerdict.codes.${code}: "${cls}" is not one of the five classes`);
  if (!/^[a-z]+(_[a-z]+)+$/.test(code)) problems.push(`x-psn.keyVerdict.codes: "${code}" is not a code (lower-case words joined by underscores)`);
}
for (const cls of CLASSES) {
  if (!Object.values(codes).includes(cls)) problems.push(`x-psn.keyVerdict: no code has the class ${cls}`);
}
if (codes.typ_unknown !== 'unsupported') problems.push('x-psn.keyVerdict.codes.typ_unknown must be the one unsupported code');

/** The codes a text names: every backticked token of underscore-joined lower-case words. */
const codesNamedIn = (text) => new Set([...String(text ?? '').matchAll(/`([a-z]+(?:_[a-z]+)+)`/g)].map((m) => m[1]));
const named = codesNamedIn(getJwks.description);
for (const code of Object.keys(codes)) {
  if (!named.has(code)) problems.push(`getJwks's description does not name \`${code}\`, a code of x-psn.keyVerdict`);
}
for (const code of named) {
  if (!(code in codes)) problems.push(`getJwks's description names \`${code}\`, which x-psn.keyVerdict does not publish`);
}

const signed = schemas.filter(({ json }) => json['x-psn']?.signature).map(({ file, json }) => ({ key: file.replace(/\.json$/, ''), json }));
const rows = Array.isArray(verdict.signingInstant) ? verdict.signingInstant : [];
const listed = rows.map((row) => row.contract);
if (JSON.stringify([...listed].sort()) !== JSON.stringify(signed.map(({ key }) => key).sort())) {
  problems.push(
    `x-psn.keyVerdict.signingInstant must list exactly the signed contracts (${signed.map(({ key }) => key).join(', ')}); ` +
      `it lists ${listed.join(', ')}`,
  );
}
if (rows.filter((row) => row.typ === null).length !== 1) problems.push('x-psn.keyVerdict.signingInstant: exactly one family is dated with no `typ`');
for (const row of rows) {
  const contract = signed.find(({ key }) => key === row.contract)?.json;
  if (!contract) continue;
  const typHeader = contract['x-psn'].signature.typHeader ?? null;
  if (row.typ !== typHeader) problems.push(`x-psn.keyVerdict.signingInstant: ${row.contract} is dated under typ ${JSON.stringify(row.typ)}, but its contract fixes ${JSON.stringify(typHeader)}`);
  if (!contract.properties?.[row.claim] || !(contract.required ?? []).includes(row.claim)) {
    problems.push(`x-psn.keyVerdict.signingInstant: ${row.contract} is dated by \`${row.claim}\`, which is not a required member of its contract`);
  }
  if (row.typ !== null && !String(getJwks.description).includes(`\`${row.typ}\``)) problems.push(`getJwks's description does not name the typ \`${row.typ}\``);
  if (!String(getJwks.description).includes(`\`${row.claim}\``)) problems.push(`getJwks's description does not name the claim \`${row.claim}\``);
}

/* ---------------------------------------------------------------------------- the examples */

const exampleFiles = (prefix) =>
  readdirSync(EXAMPLE_DIR)
    .filter((name) => /\.example\.json$/.test(name) && name.startsWith(prefix))
    .sort();

const keySets = [
  ...exampleFiles('jwks.v1.').map((name) => [`examples/${name}`, readJson(join(EXAMPLE_DIR, name))]),
  ...[['/jwks.json', getJwks], ['/sandbox/jwks.json', getSandboxJwks]].flatMap(([path, operation]) =>
    Object.entries(operation.responses?.['200']?.content?.['application/json']?.examples ?? {}).map(([name, example]) => [`${path} example "${name}"`, example.value]),
  ),
];
const incidents = exampleFiles('key-incidents.v1.').map((name) => [`examples/${name}`, readJson(join(EXAMPLE_DIR, name))]);

/** What a key set example must keep that the schema cannot say. */
function keySetProblems(doc, at) {
  const found = [];
  const keys = Array.isArray(doc?.keys) ? doc.keys : [];
  const kids = keys.map((key) => key.kid);
  for (const kid of new Set(kids)) {
    if (kids.filter((other) => other === kid).length > 1) found.push(`${at}: carries ${kid} more than once`);
  }
  for (const key of keys) {
    const window = key['psn:validityWindow'];
    if (window && typeof window.notAfter === 'string' && !(instant(window.notAfter) > instant(window.notBefore))) {
      found.push(`${at}: ${key.kid}'s window closes at ${window.notAfter}, not after it opens at ${window.notBefore}`);
    }
  }
  const sandboxKeys = keys.filter((key) => String(key.kid).startsWith('psn-sandbox-'));
  if (doc?.sandbox === true && sandboxKeys.length !== keys.length) found.push(`${at}: is marked sandbox and carries a key that is not a sandbox key`);
  if (doc?.sandbox !== true && sandboxKeys.length > 0) found.push(`${at}: is not marked sandbox and carries ${sandboxKeys[0].kid}`);
  const production = keys.filter((key) => String(key.kid).startsWith('psn-prod-'));
  const active = production.filter((key) => key['psn:status'] === 'active');
  if (production.length > 0 && active.length !== 1) found.push(`${at}: holds ${active.length} active production keys; exactly one is (FS08-101)`);
  return found;
}

/** What an incident list example must keep that the schema cannot say. */
function incidentProblems(doc, at) {
  const found = [];
  if (typeof doc.generatedAt === 'string' && new Date(instant(doc.generatedAt)).toISOString().slice(0, 10) !== doc.date) {
    found.push(`${at}: date ${doc.date} is not the UTC date of generatedAt ${doc.generatedAt}`);
  }
  const kids = doc.keys.map((key) => key.kid);
  if (JSON.stringify(kids) !== JSON.stringify([...new Set(kids)].sort())) found.push(`${at}: names its keys more than once or out of kid order (${kids.join(', ')})`);
  for (const key of doc.keys) {
    const { from, until } = key.exposure;
    if (!(instant(until) > instant(from))) found.push(`${at}: ${key.kid}'s exposure ends at ${until}, not after it starts at ${from}`);
    if (instant(until) > instant(doc.generatedAt)) found.push(`${at}: ${key.kid}'s exposure ends at ${until}, after the list was recorded at ${doc.generatedAt}`);
  }
  doc.forged.forEach((entry, index) => {
    if (index > 0 && !(entry.seq > doc.forged[index - 1].seq)) found.push(`${at}: forged[${index}] (seq ${entry.seq}) is not after seq ${doc.forged[index - 1].seq}: once each, in log order`);
  });
  const hashes = doc.forged.map((entry) => entry.h);
  if (new Set(hashes).size !== hashes.length) found.push(`${at}: lists a hash more than once`);
  return found;
}

/**
 * A compromised key's incident lists among the examples, and its window against their exposure. A key
 * that names its lists (`psn:incidents`) is held to exactly those: each path is an example's, earliest
 * first, and each of those lists names the key. A key that names none yet is held to the lists that
 * name its kid.
 */
function compromiseProblems(doc, at, lists) {
  const found = [];
  const listAt = (path) => lists.find(([, list]) => `/ct/incident-${list.date}.json` === path)?.[1];
  for (const key of (doc?.keys ?? []).filter((entry) => entry['psn:status'] === 'compromised')) {
    const paths = key['psn:incidents'];
    let named;
    if (Array.isArray(paths)) {
      if (JSON.stringify(paths) !== JSON.stringify([...paths].sort())) found.push(`${at}: ${key.kid} names its incident lists out of date order`);
      named = [];
      for (const path of paths) {
        const list = listAt(path);
        if (!list) found.push(`${at}: ${key.kid} names ${path}, which no key-incidents.v1 example is`);
        else if (!list.keys.some((entry) => entry.kid === key.kid)) found.push(`${at}: ${key.kid} names ${path}, which does not name the key`);
        else named.push(list);
      }
    } else {
      named = lists.map(([, list]) => list).filter((list) => list.keys.some((entry) => entry.kid === key.kid));
    }
    const exposures = named.flatMap((list) => list.keys.filter((entry) => entry.kid === key.kid).map((entry) => entry.exposure));
    if (exposures.length === 0) {
      found.push(`${at}: ${key.kid} is compromised, and no incident list among the examples names it`);
      continue;
    }
    const from = Math.min(...exposures.map((exposure) => instant(exposure.from)));
    if (instant(key['psn:validityWindow'].notAfter) > from) {
      found.push(`${at}: ${key.kid}'s notAfter ${key['psn:validityWindow'].notAfter} is later than the exposure its incident list declares from ${new Date(from).toISOString()}`);
    }
  }
  return found;
}

for (const [at, doc] of keySets) {
  problems.push(...keySetProblems(doc, at), ...compromiseProblems(doc, at, incidents));
  if (!keySetSchema(doc)) problems.push(`${at}: does not validate against jwks.v1 — ${JSON.stringify(keySetSchema.errors?.[0] ?? {})}`);
}
for (const [at, doc] of incidents) problems.push(...incidentProblems(doc, at));
if (keySets.length < 4) problems.push(`only ${keySets.length} key set examples were read — this gate would pass on too little`);
if (!keySets.some(([, doc]) => (doc.keys ?? []).some((key) => key['psn:status'] === 'compromised'))) problems.push('no key set example holds a compromised key');
if (!keySets.some(([, doc]) => (doc.keys ?? []).some((key) => !('psn:status' in key)))) problems.push('no key set example holds a test key stating neither member');
if (!incidents.some(([, doc]) => doc.forged.length > 0)) problems.push('no key-incidents.v1 example lists a forged entry');
if (!incidents.some(([, doc]) => doc.forged.length === 0)) problems.push('no key-incidents.v1 example shows an enumeration that found nothing');

const mainKeySet = readJson(join(EXAMPLE_DIR, 'jwks.v1.example.json'));
const compromisedKeySet = readJson(join(EXAMPLE_DIR, 'jwks.v1.compromised.example.json'));
const mainIncident = readJson(join(EXAMPLE_DIR, 'key-incidents.v1.example.json'));
const edited = (doc, edit) => {
  const copy = clone(doc);
  edit(copy);
  return copy;
};
const keyOf = (doc, kid) => {
  const found = doc.keys.find((key) => key.kid === kid);
  if (!found) throw new Error(`no ${kid} in the example the planted documents below edit`);
  return found;
};

/* Each example rule, held to a planted document it must flag, by the words of its own finding: a document
   another rule happens to flag does not prove this one can fail. */
const plantedFlags = [
  ['the kid carried twice', 'more than once', keySetProblems(edited(mainKeySet, (d) => { d.keys.push(clone(d.keys[0])); }), 'planted')],
  ['a window that closes as it opens', 'not after it opens', keySetProblems(edited(mainKeySet, (d) => { const w = keyOf(d, 'psn-prod-2026-1')['psn:validityWindow']; w.notAfter = w.notBefore; }), 'planted')],
  ['two active production keys', 'active production keys', keySetProblems(edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2026-1')['psn:status'] = 'active'; }), 'planted')],
  ['a sandbox key in a production set', 'is not marked sandbox', keySetProblems(edited(mainKeySet, (d) => { d.keys.push({ ...clone(d.keys[1]), kid: 'psn-sandbox-2027-1' }); }), 'planted')],
  ['a production key in the sandbox set', 'is marked sandbox', keySetProblems(edited(mainKeySet, (d) => { d.sandbox = true; }), 'planted')],
  ['a compromised key whose window outlasts its exposure', 'is later than the exposure', compromiseProblems(edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:validityWindow'].notAfter = '2027-03-11T00:00:00Z'; }), 'planted', incidents)],
  ['a compromised key no incident list names', 'no incident list among the examples names it', compromiseProblems(edited(compromisedKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); key.kid = 'psn-prod-2027-9'; delete key['psn:incidents']; }), 'planted', incidents)],
  ['a key naming a list that does not name it', 'which does not name the key', compromiseProblems(edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1').kid = 'psn-prod-2027-9'; }), 'planted', incidents)],
  ['a key naming a list no example is', 'which no key-incidents.v1 example is', compromiseProblems(edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'].push('/ct/incident-2027-03-15.json'); }), 'planted', incidents)],
  ['a key naming its lists out of date order', 'out of date order', compromiseProblems(edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'].unshift('/ct/incident-2027-05-20.json'); }), 'planted', incidents)],
  ['a list dated otherwise than its instant', 'is not the UTC date of generatedAt', incidentProblems(edited(mainIncident, (d) => { d.date = '2027-03-13'; }), 'planted')],
  ['an exposure that ends before it starts', 'not after it starts', incidentProblems(edited(mainIncident, (d) => { d.keys[0].exposure.until = d.keys[0].exposure.from; }), 'planted')],
  ['an exposure that ends after the list was recorded', 'after the list was recorded', incidentProblems(edited(mainIncident, (d) => { d.keys[0].exposure.until = '2027-03-14T16:00:00Z'; }), 'planted')],
  ['forged entries out of log order', 'in log order', incidentProblems(edited(mainIncident, (d) => { d.forged.reverse(); }), 'planted')],
  ['a hash listed twice', 'a hash more than once', incidentProblems(edited(mainIncident, (d) => { d.forged.push({ seq: 118260, h: d.forged[0].h }); }), 'planted')],
  ['a key named twice', 'more than once or out of kid order', incidentProblems(edited(mainIncident, (d) => { d.keys.push(clone(d.keys[0])); }), 'planted')],
];
for (const [what, words, found] of plantedFlags) {
  if (!found.some((line) => line.includes(words))) problems.push(`the example rules pass ${what}`);
}

/* ------------------------------------------------------------------------------ refusals */

const componentValidator = createAjv().compile(component);
const keySetValidators = [['jwks.v1', keySetSchema], ['the Jwks component', componentValidator]];

const keySetMustRefuse = [
  ['a production key with no status', edited(mainKeySet, (d) => { delete keyOf(d, 'psn-prod-2027-1')['psn:status']; })],
  ['a production key with no window', edited(mainKeySet, (d) => { delete keyOf(d, 'psn-prod-2027-1')['psn:validityWindow']; })],
  ['a production key stating neither member', edited(mainKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); delete key['psn:status']; delete key['psn:validityWindow']; })],
  ['a test key with a status and no window', edited(mainKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); key.kid = 'psn-dev-2027-1'; delete key['psn:validityWindow']; })],
  ['a test key with a window and no status', edited(mainKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); key.kid = 'psn-dev-2027-1'; delete key['psn:status']; })],
  ['a retired key whose window never closed', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2026-1')['psn:validityWindow'].notAfter = null; })],
  ['a retired key whose window states no end', edited(mainKeySet, (d) => { delete keyOf(d, 'psn-prod-2026-1')['psn:validityWindow'].notAfter; })],
  ['a compromised key that does not say where acceptance ends', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:validityWindow'].notAfter = null; })],
  ['a status the set does not define', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:status'] = 'suspended'; })],
  ['a window with no start', edited(mainKeySet, (d) => { delete keyOf(d, 'psn-prod-2027-1')['psn:validityWindow'].notBefore; })],
  ['a window end that is a date and no instant', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2026-1')['psn:validityWindow'].notAfter = '2027-01-01'; })],
  ['a kid outside the grammar', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2027-1').kid = 'PSN-PROD-2027-1'; })],
  ['alg: none on a key', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2027-1').alg = 'none'; })],
  ['a member the document does not define', edited(mainKeySet, (d) => { d.alg = 'none'; })],
  ['no keys', edited(mainKeySet, (d) => { delete d.keys; })],
  ['incident lists on an active key', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'] = ['/ct/incident-2027-03-14.json']; })],
  ['incident lists on a retired key', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2026-1')['psn:incidents'] = ['/ct/incident-2027-03-14.json']; })],
  ['incident lists on a test key stating no status', edited(mainKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); key.kid = 'psn-dev-2027-1'; delete key['psn:status']; delete key['psn:validityWindow']; key['psn:incidents'] = ['/ct/incident-2027-03-14.json']; })],
  ['an incident list named by an absolute address', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'] = ['https://api.purposesource.org/ct/incident-2027-03-14.json']; })],
  ['an incident list named outside its path grammar', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'] = ['/ct/incident-2027-03-14.jws']; })],
  ['an empty list of incident lists', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'] = []; })],
  ['an incident list named twice', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'].push('/ct/incident-2027-03-14.json'); })],
];
const keySetMustAdmit = [
  ['a test key stating neither member', edited(mainKeySet, (d) => { const key = keyOf(d, 'psn-prod-2027-1'); key.kid = 'psn-dev-2027-1'; delete key['psn:status']; delete key['psn:validityWindow']; })],
  ['the committed keys with no envelope', { keys: clone(mainKeySet.keys) }],
  ['the honest empty set', { schemaVersion: 1, keys: [] }],
  ['an active key whose window states no end', edited(mainKeySet, (d) => { delete keyOf(d, 'psn-prod-2027-1')['psn:validityWindow'].notAfter; })],
  ['an active key with a scheduled end', edited(mainKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:validityWindow'].notAfter = '2028-01-01T00:00:00Z'; })],
  ['a key published withdrawn, its window closing as it opens', edited(mainKeySet, (d) => { const w = keyOf(d, 'psn-prod-2026-1')['psn:validityWindow']; w.notAfter = w.notBefore; })],
  ['a compromised key whose window ended at its retirement', edited(compromisedKeySet, (d) => { const key = keyOf(d, 'psn-prod-2026-1'); key['psn:status'] = 'compromised'; })],
  ['a compromised key whose first incident list is not published yet', edited(compromisedKeySet, (d) => { delete keyOf(d, 'psn-prod-2027-1')['psn:incidents']; })],
  ['a compromised key naming two incident lists', edited(compromisedKeySet, (d) => { keyOf(d, 'psn-prod-2027-1')['psn:incidents'].push('/ct/incident-2027-04-02.json'); })],
];
for (const [label, validate] of keySetValidators) {
  for (const [what, doc] of keySetMustRefuse) {
    if (validate(doc)) problems.push(`${label}: admits ${what}`);
  }
  for (const [what, doc] of keySetMustAdmit) {
    if (!validate(doc)) problems.push(`${label}: refuses ${what} — ${JSON.stringify(validate.errors?.[0] ?? {})}`);
  }
}

const incidentMustRefuse = [
  ['a list with no plane label', edited(mainIncident, (d) => { delete d.source; })],
  ['the curated registry as its plane', edited(mainIncident, (d) => { d.source = 'registry-v0'; })],
  ['a sandbox key', edited(mainIncident, (d) => { d.keys[0].kid = 'psn-sandbox-2027-1'; })],
  ['a key without its exposure', edited(mainIncident, (d) => { delete d.keys[0].exposure; })],
  ['an exposure with no end', edited(mainIncident, (d) => { delete d.keys[0].exposure.until; })],
  ['no key', edited(mainIncident, (d) => { d.keys = []; })],
  ['a forged entry carrying the token', edited(mainIncident, (d) => { d.forged[0].jws = 'eyJhbGciOiJFUzI1NiJ9.e30.AAAA'; })],
  ['a forged entry naming a subject', edited(mainIncident, (d) => { d.forged[0].sub = 'Example Industries AG'; })],
  ['a forged entry with no hash', edited(mainIncident, (d) => { delete d.forged[0].h; })],
  ['a hash in capitals', edited(mainIncident, (d) => { d.forged[0].h = d.forged[0].h.toUpperCase(); })],
  ['a date that is not a date', edited(mainIncident, (d) => { d.date = '2027-3-14'; })],
  ['a member the list does not define', edited(mainIncident, (d) => { d.reissued = []; })],
];
const incidentMustAdmit = [
  ['an enumeration that found nothing', edited(mainIncident, (d) => { d.forged = []; })],
  ['two keys', edited(mainIncident, (d) => { d.keys.push({ kid: 'psn-prod-2027-2', exposure: clone(d.keys[0].exposure) }); })],
  ['a sample plane\'s list', edited(mainIncident, (d) => { d.source = 'sample'; })],
];
for (const [what, doc] of incidentMustRefuse) {
  if (incidentSchema(doc)) problems.push(`key-incidents.v1: admits ${what}`);
}
for (const [what, doc] of incidentMustAdmit) {
  if (!incidentSchema(doc)) problems.push(`key-incidents.v1: refuses ${what} — ${JSON.stringify(incidentSchema.errors?.[0] ?? {})}`);
}

fail(
  problems,
  `key set: jwks.v1 and the Jwks component are one contract; ${Object.keys(codes).length} verdict codes in five classes, ` +
    `all named by getJwks, and ${rows.length} signed families dated by their contracts' claims; ${keySets.length} key sets and ` +
    `${incidents.length} incident lists keep their rules (${plantedFlags.length} planted documents flagged); ` +
    `${keySetMustRefuse.length} refusals and ${keySetMustAdmit.length} admissions stand for both copies, and ` +
    `${incidentMustRefuse.length} refusals and ${incidentMustAdmit.length} admissions for the incident list`,
);

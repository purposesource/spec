/**
 * cov-v1 test suite — the frozen vector run plus the properties the vectors cannot state.
 *
 * Run: node --experimental-strip-types --test coverage/cov-v1.test.ts   (or `npm test`)
 *
 * Zero dependencies: Node's own test runner and its own type stripping. The published
 * module must be runnable by anyone who has Node and nothing else, and a test suite that
 * needed a toolchain would quietly contradict that.
 *
 * What is asserted here:
 *   1. every vector in vectors.json, by DEEP EQUALITY over the whole result;
 *   2. all eight FS-00 §6.3 answers are producible from the fixtures (FS10-120(b));
 *   3. the answer enum is exactly the eight values, in the COM-009 order;
 *   4. purity — same inputs, same output, and no clock dependence;
 *   5. the caller-owned error: a missing repo record throws rather than answering;
 *   6. the wire shaping of `toCoverageResponse`, including proof absence on `no`.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  ALGO_VERSION,
  COVERAGE_ANSWERS,
  coverage,
  CoverageInputError,
  isCoverageAnswer,
  toCoverageResponse,
} from './cov-v1.ts';
import type { CompanyRecord, CoverageAnswer, CoverageResult, RepoRecord, WaiverRecord } from './cov-v1.ts';

const HERE = dirname(fileURLToPath(import.meta.url));

interface WaiverDocument {
  schemaVersion: number;
  generatedAt: string;
  nodeId?: string;
  scope?: string;
  waivers: WaiverRecord[];
}

interface Vector {
  id: string;
  description: string;
  fsRef: string;
  now: string;
  repo: string;
  company: CompanyRecord | null;
  companyRef?: { coId?: string; domain?: string };
  waivers: string | WaiverDocument;
  expect: CoverageResult;
}

interface VectorFile {
  algoVersion: string;
  specVersion: string;
  repos: Record<string, RepoRecord>;
  emptyWaivers: WaiverDocument;
  vectors: Vector[];
}

const vectorFile = JSON.parse(readFileSync(join(HERE, 'vectors.json'), 'utf8')) as VectorFile;

function resolveWaivers(vector: Vector): WaiverRecord[] {
  if (typeof vector.waivers === 'string') {
    const named = (vectorFile as unknown as Record<string, WaiverDocument | undefined>)[vector.waivers];
    assert.ok(named, `vector ${vector.id} names an unknown waiver document: ${vector.waivers}`);
    return named.waivers;
  }
  return vector.waivers.waivers;
}

function resolveRepo(vector: Vector): RepoRecord {
  const repo = vectorFile.repos[vector.repo];
  assert.ok(repo, `vector ${vector.id} names an unknown repo fixture: ${vector.repo}`);
  return repo;
}

function run(vector: Vector): CoverageResult {
  return coverage(vector.company, resolveRepo(vector), resolveWaivers(vector), vector.now, vector.companyRef);
}

test('the vector file targets this module version', () => {
  assert.equal(vectorFile.algoVersion, ALGO_VERSION);
});

test('the answer enum is exactly the eight frozen values in COM-009 order', () => {
  // FS-00 §6.3. This test exists so that adding a ninth answer, or reordering the lane
  // enumeration, cannot happen quietly — it has to happen here, in a diff someone reads.
  assert.deepStrictEqual(
    [...COVERAGE_ANSWERS],
    [
      'yes-via-pass',
      'yes-via-project',
      'yes-via-portfolio',
      'yes-via-waiver',
      'yes-via-donation',
      'no',
      'lapsed-in-grace',
      'no-entitlement-required-under-threshold',
    ],
  );
  assert.equal(COVERAGE_ANSWERS.length, 8);
  assert.ok(isCoverageAnswer('lapsed-in-grace'));
  assert.equal(isCoverageAnswer('maybe'), false);
});

test('every vector has a unique id and a spec reference', () => {
  const ids = new Set<string>();
  for (const vector of vectorFile.vectors) {
    assert.equal(ids.has(vector.id), false, `duplicate vector id: ${vector.id}`);
    ids.add(vector.id);
    assert.ok(vector.fsRef.length > 0, `vector ${vector.id} cites no spec reference`);
    assert.ok(vector.description.length > 0, `vector ${vector.id} has no description`);
  }
  assert.ok(vectorFile.vectors.length >= 20, 'the vector suite got smaller — vectors are appended, never removed');
});

// 1. The frozen vectors.
for (const vector of vectorFile.vectors) {
  test(`${vector.id}: ${vector.description}`, () => {
    const actual = run(vector);
    assert.deepStrictEqual(actual, vector.expect, `${vector.id} (${vector.fsRef})`);
  });
}

// 2. FS10-120(b): each of the eight answers must be producible end-to-end from fixtures.
test('all eight answer values are produced by the vector suite (FS10-120(b))', () => {
  const produced = new Set<CoverageAnswer>();
  for (const vector of vectorFile.vectors) produced.add(run(vector).answer);
  const missing = COVERAGE_ANSWERS.filter((answer) => !produced.has(answer));
  assert.deepStrictEqual(missing, [], `answers with no vector: ${missing.join(', ')}`);
});

// 3. Purity.
test('the function is pure: identical inputs give a deep-equal result every time', () => {
  for (const vector of vectorFile.vectors) {
    const first = run(vector);
    const second = run(vector);
    assert.deepStrictEqual(second, first, vector.id);
  }
});

test('the function reads no clock: time is only ever the parameter', () => {
  // Same artifacts, two different `now` values, two different answers. If the module
  // ever reached for Date.now() this would either stop discriminating or start
  // depending on the day the suite runs.
  const active = vectorFile.vectors.find((v) => v.id === 'VEC-14-boundary-now-equals-period-end-is-active');
  const grace = vectorFile.vectors.find((v) => v.id === 'VEC-15-boundary-now-equals-grace-end-is-grace');
  assert.ok(active, 'the now==periodEnd boundary vector is required by FS10-020');
  assert.ok(grace, 'the now==graceEnd boundary vector is required by FS10-020');
  assert.equal(run(active).answer, 'yes-via-project');
  assert.equal(run(grace).answer, 'lapsed-in-grace');

  // And the same instant expressed three ways must agree.
  const repo = resolveRepo(active);
  const waivers = resolveWaivers(active);
  const asString = coverage(active.company, repo, waivers, '2027-05-15T00:00:00Z');
  const asDate = coverage(active.company, repo, waivers, new Date('2027-05-15T00:00:00Z'));
  const asMillis = coverage(active.company, repo, waivers, Date.parse('2027-05-15T00:00:00Z'));
  assert.deepStrictEqual(asDate, asString);
  assert.deepStrictEqual(asMillis, asString);
});

test('the input arrays are never mutated', () => {
  const vector = vectorFile.vectors[0];
  assert.ok(vector);
  const repo = resolveRepo(vector);
  const waivers = resolveWaivers(vector);
  const before = JSON.stringify({ company: vector.company, repo, waivers });
  coverage(vector.company, repo, waivers, vector.now);
  assert.equal(JSON.stringify({ company: vector.company, repo, waivers }), before);
});

// 4. Errors the caller owns.
test('a missing repo record throws — an unregistered repository is 404, not an answer', () => {
  assert.throws(
    () => coverage(null, undefined as unknown as RepoRecord, [], '2027-06-01T00:00:00Z'),
    (error: unknown) => {
      assert.ok(error instanceof CoverageInputError);
      assert.equal(error.code, 'repo_not_registered');
      return true;
    },
  );
});

test('an unparsable `now` throws rather than silently answering no', () => {
  const repo: RepoRecord = { nodeId: 'R_kgDOAbc123', state: 'verified' };
  assert.throws(() => coverage(null, repo, [], 'not-a-date'), (error: unknown) => {
    assert.ok(error instanceof CoverageInputError);
    assert.equal(error.code, 'invalid_now');
    return true;
  });
});

test('a malformed date inside a signed record fails closed to no contribution', () => {
  // A producer bug must not become a false `yes`. The term is simply not active.
  const repo: RepoRecord = { nodeId: 'R_kgDOAbc123', state: 'verified' };
  const company: CompanyRecord = {
    coId: 'co_01jf8w2c9km3q7xz5r0v4t6y8b',
    verification: 'officer-attested',
    domains: [],
    entitlements: [
      {
        entId: 'ent_01jf8w2c9km3q7xz5r0v4t6y9b',
        lane: 'project',
        scope: { kind: 'project', repos: ['R_kgDOAbc123'] },
        status: 'active',
        periodStart: 'whenever',
        periodEnd: 'later',
        scheduleVersion: 'v1',
        vestedWindows: [],
      },
    ],
  };
  const result = coverage(company, repo, [], '2027-06-01T12:00:00Z');
  assert.equal(result.answer, 'no');
  assert.equal(result.proofRef, undefined);
});

test('waivers may be omitted by a JS caller without crashing', () => {
  const repo: RepoRecord = { nodeId: 'R_kgDOAbc123', state: 'verified' };
  const result = coverage(null, repo, undefined as unknown as WaiverRecord[], '2027-06-01T12:00:00Z');
  assert.equal(result.answer, 'no');
  assert.equal(result.basis.note, 'no registry record for this organization');
});

// 5. Wire shaping.
test('toCoverageResponse builds the FS-10 §4.4 body and omits proof on `no`', () => {
  const passVector = vectorFile.vectors.find((v) => v.id === 'VEC-01-yes-via-pass');
  const noVector = vectorFile.vectors.find((v) => v.id === 'VEC-12-no-unknown-company');
  assert.ok(passVector);
  assert.ok(noVector);

  const yes = toCoverageResponse(run(passVector), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org/',
    entitlementJwsSha256: 'b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184',
  });
  assert.deepStrictEqual(yes, {
    answer: 'yes-via-pass',
    basis: run(passVector).basis,
    asOf: '2027-06-01T12:00:00Z',
    proof: {
      type: 'entitlement-jws',
      url: 'https://api.purposesource.org/v1/entitlements/co_01jf8w2c9km3q7xz5r0v4t6y8b.jws',
      sha256: 'b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184',
    },
  });

  const no = toCoverageResponse(run(noVector), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.equal(no.proof, undefined, '`no` carries no proof (FS-10 §4.4)');
  assert.equal(no.asOf, '2027-06-01T12:00:00Z');
});

test('a waiver answer proves itself with the waiver record, fragment-addressed', () => {
  const vector = vectorFile.vectors.find((v) => v.id === 'VEC-05-yes-via-waiver-stub-no-account');
  assert.ok(vector);
  const response = toCoverageResponse(run(vector), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.deepStrictEqual(response.proof, {
    type: 'waiver-record',
    url: 'https://api.purposesource.org/v1/waivers/R_kgDOAbc123.json#wvr_01jk2a6g3qr7v1bd9w4z8x0c3f',
  });
});

test('an omitted digest is omitted, never fabricated', () => {
  const vector = vectorFile.vectors.find((v) => v.id === 'VEC-21-under-threshold');
  assert.ok(vector);
  const response = toCoverageResponse(run(vector), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.equal(response.proof?.type, 'entitlement-jws');
  assert.equal(response.proof?.sha256, undefined);
  assert.deepStrictEqual(response.dates, { selfCertifiedAt: '2027-03-10T09:00:00Z' });
});

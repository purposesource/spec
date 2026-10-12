/**
 * cov-v1 test suite — the vector run and the properties the vectors cannot state.
 *
 * Run: node --experimental-strip-types --test coverage/cov-v1.test.ts   (or `npm test`)
 *
 * Zero dependencies: Node's own test runner and its own type stripping. The published
 * module must be runnable by anyone who has Node and nothing else, and a test suite that
 * needed a toolchain would quietly contradict that.
 *
 * What is asserted here:
 *   1. every vector in vectors.json, by DEEP EQUALITY over the whole outcome;
 *   2. the first text's 25 vectors (2026-09-17) are all still here, first and in order;
 *   3. all eight FS-00 §6.3 answers are producible from the fixtures (FS10-120(b)), and the
 *      three things the 2026-09-30 change made (D48 item 5, D82) each have vectors;
 *   4. the answer enum is exactly the eight values, in the COM-009 order;
 *   5. purity — same inputs, same output, and no clock dependence;
 *   6. the caller-owned error, and `repo_not_registered` returned rather than thrown;
 *   7. the wire shaping of `toCoverageResponse`, including proof absence on `no` and an
 *      omitted digest.
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
  isRepoNotRegistered,
  toCoverageResponse,
} from './cov-v1.ts';
import type {
  CompanyRecord,
  CoverageAnswer,
  CoverageOutcome,
  CoverageResult,
  RepoRecord,
  NoRecordRepo,
  WaiverRecord,
} from './cov-v1.ts';

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
  /** A fixture name, or null for a repository with no published record. */
  repo: string | null;
  /** The repository asked about when `repo` is null. */
  repoNodeId?: string;
  company: CompanyRecord | null;
  companyRef?: { coId?: string; domain?: string };
  waivers: string | WaiverDocument;
  expect: CoverageOutcome;
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

function resolveRepo(vector: Vector): RepoRecord | NoRecordRepo {
  if (vector.repo === null) {
    assert.ok(vector.repoNodeId, `vector ${vector.id} has no record and names no repository`);
    return { nodeId: vector.repoNodeId, state: 'no-record' };
  }
  const repo = vectorFile.repos[vector.repo];
  assert.ok(repo, `vector ${vector.id} names an unknown repo fixture: ${vector.repo}`);
  return repo;
}

function run(vector: Vector): CoverageOutcome {
  return coverage(vector.company, resolveRepo(vector), resolveWaivers(vector), vector.now, vector.companyRef);
}

const byId = (id: string): Vector => {
  const found = vectorFile.vectors.find((v) => v.id === id);
  assert.ok(found, `the suite no longer carries ${id}`);
  return found;
};

const answerOf = (outcome: CoverageOutcome): CoverageResult => {
  assert.ok(!isRepoNotRegistered(outcome), 'expected an answer, got repo_not_registered');
  return outcome;
};

test('the vector file targets this module version', () => {
  assert.equal(vectorFile.algoVersion, ALGO_VERSION);
  assert.equal(ALGO_VERSION, 'cov-v1');
});

test('the answer enum is exactly the eight frozen values in COM-009 order', () => {
  // The 2026-09-30 change answers a new QUESTION (a work with no record) with an OLD answer:
  // no ninth value.
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
});

// 1. The vectors.
for (const vector of vectorFile.vectors) {
  test(`${vector.id}: ${vector.description}`, () => {
    assert.deepStrictEqual(run(vector), vector.expect, `${vector.id} (${vector.fsRef})`);
  });
}

// 2. The first text's vectors.
test("the first text's 25 vectors are all still here, first and in order", () => {
  // The function changed in place on 2026-09-30 (D48 item 5, D82) and answers every question
  // its first text (2026-09-17) could answer the same way, so that text's 25 vectors stay,
  // with their ids, inputs and answers; only a `verified` record is now reported as
  // `registered`, which (c) below checks. None of them asks about a work with no record:
  // the first text could not take one.
  const first = vectorFile.vectors.slice(0, 25);
  assert.equal(first.length, 25);
  first.forEach((vector, index) => {
    assert.ok(vector.id.startsWith(`VEC-${String(index + 1).padStart(2, '0')}-`), vector.id);
    assert.notEqual(vector.repo, null, `${vector.id} asks about a work with no record`);
  });
  const later = vectorFile.vectors.slice(25).filter((vector) => vector.id.startsWith('VEC-'));
  assert.deepStrictEqual(later.map((vector) => vector.id), [], 'a first-text vector sits after the first 25');
});

// 3. Coverage of the answers and of the three changes.
test('all eight answer values are produced by the vector suite (FS10-120(b))', () => {
  const produced = new Set<CoverageAnswer>();
  for (const vector of vectorFile.vectors) {
    const outcome = run(vector);
    if (!isRepoNotRegistered(outcome)) produced.add(outcome.answer);
  }
  const missing = COVERAGE_ANSWERS.filter((answer) => !produced.has(answer));
  assert.deepStrictEqual(missing, [], `answers with no vector: ${missing.join(', ')}`);
});

test('(a) a Pass inside its term covers a work with no record, and says why', () => {
  const result = answerOf(run(byId('V2-01-no-record-pass-covers')));
  assert.equal(result.answer, 'yes-via-pass');
  assert.equal(result.basis.repo.repoState, 'no-record');
  assert.equal(result.basis.reason, 'pass-any-work');
  assert.equal(result.basis.entitlement?.lane, 'pass');
  assert.deepStrictEqual(result.proofRef, { type: 'entitlement-jws', coId: 'co_01jf8w2c9km3q7xz5r0v4t6y8b' });
});

test('(a) without a current Pass a work with no record is repo_not_registered, returned and not thrown', () => {
  const ids = vectorFile.vectors.filter((v) => v.repo === null && 'error' in v.expect).map((v) => v.id);
  assert.ok(ids.length >= 11, `expected the refusals to be pinned, found ${ids.length}`);
  for (const id of ids) {
    const outcome = run(byId(id));
    assert.ok(isRepoNotRegistered(outcome), id);
    assert.deepStrictEqual(outcome, { error: 'repo_not_registered', algoVersion: 'cov-v1', repo: { nodeId: 'R_kgDONoRec01' } }, id);
  }
});

test('(a) each kind of organisation not answered about a work with no record has its vector', () => {
  // coverage/README.md and the CHANGELOG name these; a sentence there with no vector behind it
  // is a promise nobody checks. Each is repo_not_registered, and each is only a Pass away from
  // an answer: V2-01 is the same question asked by a Pass inside its term.
  const pinned = {
    'a Project naming other repositories': 'V2-04-no-record-project-only-is-not-registered',
    'a Project naming this very node id': 'V2-20-no-record-project-naming-it-is-not-registered',
    'a Portfolio': 'V2-16-no-record-portfolio-is-not-registered',
    'a network-scope donation term': 'V2-17-no-record-network-donation-is-not-registered',
    'a suspended Pass': 'V2-06-no-record-suspended-pass-is-not-registered',
    'a void Pass': 'V2-18-no-record-void-pass-is-not-registered',
    'a Pass in its grace window': 'V2-07-no-record-pass-in-grace-is-not-registered',
    'a Pass not yet started': 'V2-19-no-record-pass-not-yet-started-is-not-registered',
    'a threshold self-certification': 'V2-08-no-record-under-threshold-is-not-registered',
    'a waiver': 'V2-09-no-record-waivers-are-not-read',
    'no company record': 'V2-05-no-record-unknown-company-is-not-registered',
  };
  for (const [who, id] of Object.entries(pinned)) {
    const vector = byId(id);
    assert.equal(vector.repo, null, `${who}: ${id} must ask about a work with no record`);
    assert.ok(isRepoNotRegistered(run(vector)), `${who}: ${id}`);
  }
  const lanes = new Set(
    Object.values(pinned).flatMap((id) => (byId(id).company?.entitlements ?? []).map((ent) => ent.lane)),
  );
  assert.deepStrictEqual([...lanes].sort(), ['donation', 'pass', 'portfolio', 'project']);
});

test('(a) `reason` appears only where the repository has no record', () => {
  for (const vector of vectorFile.vectors) {
    const outcome = run(vector);
    if (isRepoNotRegistered(outcome)) continue;
    if (vector.repo === null) {
      assert.equal(outcome.basis.reason, 'pass-any-work', vector.id);
      assert.equal(outcome.basis.repo.repoState, 'no-record', vector.id);
    } else {
      assert.equal('reason' in outcome.basis, false, `${vector.id} carries a reason about a registered repository`);
      assert.notEqual(outcome.basis.repo.repoState, 'no-record', vector.id);
    }
  }
});

test('(b) a registered repository nobody claimed answers like any registered one', () => {
  const fixture = vectorFile.repos.registered;
  assert.ok(fixture, 'the suite needs a record published for an unclaimed repository');
  assert.equal(fixture.state, 'registered');
  // The record carries no claim status for this function to read (D82 item 3).
  for (const member of ['claimed', 'claim', 'claimedAt', 'admins']) {
    assert.equal(member in (fixture as unknown as Record<string, unknown>), false, member);
  }
  const answers = vectorFile.vectors
    .filter((v) => v.repo === 'registered')
    .map((v) => answerOf(run(v)).answer)
    .sort();
  assert.deepStrictEqual(answers, ['no', 'yes-via-pass', 'yes-via-portfolio', 'yes-via-project']);
});

test('(c) no answer reports `verified`; `registered` is the one public state', () => {
  let fromVerified = 0;
  for (const vector of vectorFile.vectors) {
    const outcome = run(vector);
    if (isRepoNotRegistered(outcome)) continue;
    assert.notEqual(outcome.basis.repo.repoState as string, 'verified', vector.id);
    const record = vector.repo === null ? null : vectorFile.repos[vector.repo];
    if (record?.state === 'verified') {
      fromVerified += 1;
      assert.equal(outcome.basis.repo.repoState, 'registered', vector.id);
    }
    if (record && record.state !== 'verified') {
      assert.equal(outcome.basis.repo.repoState, record.state, `${vector.id}: a non-verified state is reported as published`);
    }
  }
  assert.ok(fromVerified >= 20, `expected most of the first text's vectors to read a verified record, found ${fromVerified}`);
  assert.equal(answerOf(run(byId('V2-15-suspended-record-reports-suspended'))).basis.repo.repoState, 'suspended');
  assert.equal(answerOf(run(byId('VEC-24-delisted-repo-still-computes'))).basis.repo.repoState, 'delisted');
  assert.equal(answerOf(run(byId('V2-21-quit-record-reports-quit'))).basis.repo.repoState, 'quit');
});

// 5. Purity.
test('the function is pure: identical inputs give a deep-equal result every time', () => {
  for (const vector of vectorFile.vectors) {
    assert.deepStrictEqual(run(vector), run(vector), vector.id);
  }
});

test('the function reads no clock: time is only ever the parameter', () => {
  const active = byId('VEC-14-boundary-now-equals-period-end-is-active');
  const grace = byId('VEC-15-boundary-now-equals-grace-end-is-grace');
  assert.equal(answerOf(run(active)).answer, 'yes-via-project');
  assert.equal(answerOf(run(grace)).answer, 'lapsed-in-grace');

  const repo = resolveRepo(active);
  const waivers = resolveWaivers(active);
  const asString = coverage(active.company, repo, waivers, '2027-05-15T00:00:00Z');
  const asDate = coverage(active.company, repo, waivers, new Date('2027-05-15T00:00:00Z'));
  const asMillis = coverage(active.company, repo, waivers, Date.parse('2027-05-15T00:00:00Z'));
  assert.deepStrictEqual(asDate, asString);
  assert.deepStrictEqual(asMillis, asString);

  // And for a work with no record: one millisecond past the Pass's term, it is no longer
  // reached, so the same inputs answer differently only because the instant moved.
  const noRecord = byId('V2-02-no-record-pass-at-period-end');
  const later = new Date(Date.parse(noRecord.now) + 1).toISOString();
  assert.ok(isRepoNotRegistered(coverage(noRecord.company, resolveRepo(noRecord), [], later)));
});

test('the input arrays are never mutated', () => {
  for (const vector of [vectorFile.vectors[0], byId('V2-09-no-record-waivers-are-not-read')]) {
    assert.ok(vector);
    const repo = resolveRepo(vector);
    const waivers = resolveWaivers(vector);
    const before = JSON.stringify({ company: vector.company, repo, waivers });
    coverage(vector.company, repo, waivers, vector.now, vector.companyRef);
    assert.equal(JSON.stringify({ company: vector.company, repo, waivers }), before);
  }
});

// 6. Errors the caller owns.
test('a missing repository input throws — the caller passes a record or the no-record marker', () => {
  for (const missing of [undefined, null, { state: 'no-record' }, { nodeId: '', state: 'no-record' }]) {
    assert.throws(
      () => coverage(null, missing as unknown as RepoRecord, [], '2027-06-01T00:00:00Z'),
      (error: unknown) => {
        assert.ok(error instanceof CoverageInputError);
        assert.equal(error.code, 'repo_input_missing');
        return true;
      },
      JSON.stringify(missing),
    );
  }
});

test('an unparsable `now` throws rather than silently answering', () => {
  const repo: RepoRecord = { nodeId: 'R_kgDOAbc123', state: 'registered' };
  const noRecord: NoRecordRepo = { nodeId: 'R_kgDONoRec01', state: 'no-record' };
  for (const input of [repo, noRecord]) {
    assert.throws(() => coverage(null, input, [], 'not-a-date'), (error: unknown) => {
      assert.ok(error instanceof CoverageInputError);
      assert.equal(error.code, 'invalid_now');
      return true;
    });
  }
});

test('a malformed date inside a signed record fails closed, registered or not', () => {
  const company: CompanyRecord = {
    coId: 'co_01jf8w2c9km3q7xz5r0v4t6y8b',
    verification: 'officer-attested',
    domains: [],
    entitlements: [
      {
        entId: 'ent_01jf8w2c9km3q7xz5r0v4t6y9b',
        lane: 'pass',
        scope: { kind: 'network' },
        status: 'active',
        periodStart: 'whenever',
        periodEnd: 'later',
        scheduleVersion: 'v1',
        vestedWindows: [],
      },
    ],
  };
  const registered = coverage(company, { nodeId: 'R_kgDOAbc123', state: 'registered' }, [], '2027-06-01T12:00:00Z');
  assert.equal(answerOf(registered).answer, 'no');
  assert.equal(answerOf(registered).proofRef, undefined);
  const noRecord = coverage(company, { nodeId: 'R_kgDONoRec01', state: 'no-record' }, [], '2027-06-01T12:00:00Z');
  assert.ok(isRepoNotRegistered(noRecord), 'a Pass whose dates cannot be read reaches nothing');
});

test('waivers may be omitted by a JS caller without crashing', () => {
  const repo: RepoRecord = { nodeId: 'R_kgDOAbc123', state: 'registered' };
  const result = answerOf(coverage(null, repo, undefined as unknown as WaiverRecord[], '2027-06-01T12:00:00Z'));
  assert.equal(result.answer, 'no');
  assert.equal(result.basis.note, 'no registry record for this organization');
});

// 7. Wire shaping.
test('toCoverageResponse builds the FS-10 §4.4 body, for a work with no record too', () => {
  const vector = byId('V2-01-no-record-pass-covers');
  const result = answerOf(run(vector));
  const body = toCoverageResponse(result, {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org/',
    entitlementJwsSha256: 'b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184',
  });
  assert.deepStrictEqual(body, {
    answer: 'yes-via-pass',
    basis: result.basis,
    asOf: '2027-06-01T12:00:00Z',
    proof: {
      type: 'entitlement-jws',
      url: 'https://api.purposesource.org/v1/entitlements/co_01jf8w2c9km3q7xz5r0v4t6y8b.jws',
      sha256: 'b1946ac92492d2347c6235b4d2611184b1946ac92492d2347c6235b4d2611184',
    },
  });
  assert.equal(body.basis.reason, 'pass-any-work');

  const no = toCoverageResponse(answerOf(run(byId('VEC-12-no-unknown-company'))), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.equal(no.proof, undefined, '`no` carries no proof (FS-10 §4.4)');
});

test('a waiver answer proves itself with the waiver record, fragment-addressed', () => {
  const response = toCoverageResponse(answerOf(run(byId('VEC-05-yes-via-waiver-stub-no-account'))), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.deepStrictEqual(response.proof, {
    type: 'waiver-record',
    url: 'https://api.purposesource.org/v1/waivers/R_kgDOAbc123.json#wvr_01jk2a6g3qr7v1bd9w4z8x0c3f',
  });
});

test('an omitted digest is omitted, never fabricated', () => {
  const response = toCoverageResponse(answerOf(run(byId('VEC-21-under-threshold'))), {
    asOf: '2027-06-01T12:00:00Z',
    apiBaseUrl: 'https://api.purposesource.org',
  });
  assert.equal(response.proof?.type, 'entitlement-jws');
  assert.equal(response.proof?.sha256, undefined);
  assert.deepStrictEqual(response.dates, { selfCertifiedAt: '2027-03-10T09:00:00Z' });
});

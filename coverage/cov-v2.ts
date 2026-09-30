/**
 * cov-v2 — the coverage answer function, published.
 *
 * WHAT THIS IS
 * ------------
 * The pure, versioned function that answers "is this organisation covered for this
 * repository?". It is published here, in the open, because a coverage model nobody can
 * audit is a coverage model nobody should believe. Anyone can run these lines against
 * the published artifacts and reproduce the answer the edge gives, byte for byte.
 *
 * Frozen contract: FS-00 §6.3 (the eight answer values) and FS-10 §4.3 (the ordered
 * steps). URS COM-009 owns the semantics. This file adds no answer, removes none, and
 * reorders nothing.
 *
 * WHAT CHANGED FROM cov-v1, AND NOTHING ELSE DID
 * ----------------------------------------------
 * `./cov-v1.ts` stays beside this file, byte for byte, so every answer a deployment gave
 * under `cov-v1` stays reproducible. cov-v2 answers differently in exactly three places:
 *
 *  1. A PASS COVERS ANY WORK UNDER THE LICENCE, REGISTERED OR NOT (ops decision D48 item 5,
 *     carried out by D82 item 10). A repository with no published record is no longer
 *     only the caller's `404 repo_not_registered`: the caller passes `{ nodeId, state:
 *     'no-record' }`, and an organisation holding a Pass inside its term is answered
 *     `yes-via-pass` with `basis.repo.repoState: 'no-record'` and `basis.reason:
 *     'pass-any-work'` — the reason says why a repository with no record is covered.
 *     `no-record` says what the caller found and nothing more: no record is published under
 *     this node id. The repository may be registered and not yet published, or not under
 *     the licence at all; the answer checks neither, and the Pass covers it either way.
 *     Every other organisation still gets `repo_not_registered`, now RETURNED rather than
 *     thrown, because it is a fact about the repository and not a caller defect.
 *  2. A REGISTERED REPOSITORY IS ONE THING, CLAIMED OR NOT (D82 item 1). A record published
 *     for a repository its admins never claimed answers exactly like any other record; the
 *     record carries no claim status and this function reads none.
 *  3. ONE PUBLIC STATE, `registered` (D82's dated note (d) of 2026-09-29). A record that
 *     still says `verified` — the token published before D82 — is read as registered and
 *     reported as `registered`; `suspended`, `quit` and `delisted` are reported as before.
 *
 * Change 1 moves the interface in two places, neither of them an answer: `coverage()` returns
 * a `CoverageOutcome` (an answer, or `repo_not_registered`) where cov-v1 returned only an
 * answer, and a missing repository argument throws with code `repo_input_missing` where
 * cov-v1 threw with code `repo_not_registered`.
 *
 * Every other rule is cov-v1's, in cov-v1's order, and the 25 frozen cov-v1 vectors are
 * carried into ./cov-v2.vectors.json with only the algorithm version and the state token
 * moved (./cov-v2.test.ts proves the carry is faithful).
 *
 * PURITY IS THE POINT
 * -------------------
 * No I/O. No clock read — `nowUtc` is a parameter. No network, no crypto, no
 * dependencies, not even a type import. Two calls with the same arguments return the
 * same result forever. That is what makes the vector suite in ./cov-v2.vectors.json a
 * meaningful test rather than a snapshot of a Tuesday.
 *
 * WHAT THIS IS NOT
 * ----------------
 *  · It does NOT verify the entitlement record's signature. The caller MUST verify the
 *    JWS against the pinned production JWKS BEFORE calling, and answer `no` with
 *    basis.note = "entitlement record failed verification" if it fails (FS-10 §4.2).
 *    A pure function cannot do crypto without I/O, and a function that silently trusted
 *    an unverified record would be the most expensive bug in the system.
 *  · It does NOT resolve a domain to a company. That is a lookup in the published
 *    domain index, and it is the caller's job (FS-10 §4.2 input 4). A domain mapping to
 *    more than one company is `409 company_ambiguous` and never reaches this function.
 *  · It does NOT read the registry. The caller fetches `/registry/repo/{node_id}.json` and
 *    passes the record, or `{ nodeId, state: 'no-record' }` when there is none. Whether
 *    that absence is an answer or `404 repo_not_registered` is decided HERE, so every
 *    deployment decides it the same way. Passing nothing at all is a caller defect and
 *    throws — see CoverageInputError.
 *  · It does NOT build URLs or hashes. `proofRef` names the proof; `toCoverageResponse`
 *    turns it into the wire shape once the caller supplies the base URL and the JWS
 *    digest it already had to compute for verification.
 *
 * VERSIONING
 * ----------
 * A change in behaviour creates `cov-v3` ALONGSIDE this file. cov-v2 is never mutated
 * once published: every answer given by a deployment reporting `algoVersion: "cov-v2"`
 * must stay reproducible from this exact source. FS10-020 makes that mechanical — the edge
 * mirrors this module byte for byte, CI fails on a hash difference, and the running
 * deployment publishes its own module digest at `/v1/meta`.
 *
 * PHASE
 * -----
 * There is no coverage route on production at v0 (FS-00 §6.10 as amended 2026-09-01): the
 * v0 coverage proof is the published entitlement JWS plus the verify page. The computed
 * route runs on preview and dev, and activates on production at P-M3.
 */

/** The eight answer values. Exactly FS-00 §6.3 — restated from COM-009, never extended. */
export const COVERAGE_ANSWERS = [
  'yes-via-pass',
  'yes-via-project',
  'yes-via-portfolio',
  'yes-via-waiver',
  'yes-via-donation',
  'no',
  'lapsed-in-grace',
  'no-entitlement-required-under-threshold',
] as const;

export type CoverageAnswer = (typeof COVERAGE_ANSWERS)[number];

/** The algorithm version echoed in every basis block and reported at `/v1/meta`. */
export const ALGO_VERSION = 'cov-v2';

export type EntitlementLane = 'pass' | 'project' | 'portfolio' | 'donation';

/**
 * The PUBLISHED status projection (FS05-052). `pending` is never published, `revoked`
 * publishes as `void`, and `grace`/`lapsed` are not statuses at all — this function
 * derives them from the dates. If you find yourself wanting a `grace` status here, the
 * bug is upstream.
 */
export type PublishedEntitlementStatus = 'active' | 'suspended' | 'void';

/**
 * The states a published repository record carries (`repo-record.v1` 1.4.0). `registered`
 * is the one state a record published from ops decision D82 on shows for a registered
 * repository that is not suspended, claimed or not; `verified` is what records published
 * before D82 carried, and is read as `registered`. The platform's internal `detected`
 * never appears in a record.
 */
export type RecordRepoState = 'registered' | 'verified' | 'suspended' | 'quit' | 'delisted';

/**
 * The states an ANSWER reports in `basis.repo.repoState`. One public state for a
 * registered repository (D82's dated note (d)), so `verified` is never reported; and
 * `no-record` when no record is published under the node id asked about, which only a Pass
 * answers about (D48 item 5). `no-record` is what the caller found, not a registry state:
 * the repository may be registered and not yet published, or not under the licence at all,
 * and the answer checks neither.
 */
export type PublishedRepoState = 'registered' | 'suspended' | 'quit' | 'delisted' | 'no-record';

export type ScopeKind = 'project' | 'portfolio' | 'network';

export interface Scope {
  kind: ScopeKind;
  /**
   * The repository node_ids the term's paid coverage names — exactly one for a Project
   * bought under ops decision D42; the array bound of 50 is the shape's, not a purchasable
   * quantity. Never the usage declaration (D16, COM-020, ENG-029, D42).
   */
  repos?: readonly string[];
  /** Owner-organisation node_id for a portfolio-scoped term. */
  org?: string;
}

export interface VestedWindow {
  /** Term start. Provenance only — never a lower bound on vesting (D12 as amended). */
  from: string;
  /** Term end. The operative bound: vested iff version publication date <= this. */
  to: string;
}

export interface ThresholdRegistration {
  selfCertifiedAt: string;
  expiresAt: string;
}

/** The frozen entitlement object (FS-00 §6.2 amendment note, 2026-09-01). */
export interface Entitlement {
  entId: string;
  lane: EntitlementLane;
  scope: Scope;
  status: PublishedEntitlementStatus;
  periodStart: string;
  periodEnd: string;
  graceEnd?: string;
  scheduleVersion: string;
  vestedWindows: readonly VestedWindow[];
  thresholdRegistration?: ThresholdRegistration;
}

/** The decoded payload of `/entitlements/{co_ulid}.jws` (FS-10 §4.2 input 1). */
export interface CompanyRecord {
  coId: string;
  name?: string;
  domains?: readonly string[];
  verification: 'domain-verified' | 'officer-attested' | 'unverified';
  entitlements: readonly Entitlement[];
  thresholdRegistration?: ThresholdRegistration;
}

/** The fields of `/registry/repo/{node_id}.json` this function reads (input 2). */
export interface RepoRecord {
  nodeId: string;
  state: RecordRepoState;
  owner?: {
    login?: string;
    /** Compared against a portfolio term's `scope.org`. */
    orgId?: string;
  };
}

/**
 * What the caller passes when `/registry/repo/{node_id}.json` does not exist: the node id it
 * was asked about, and nothing else. No record means no owner and no waiver list, and only
 * a Pass inside its term is answered about such a repository (D48 item 5, D82 item 10).
 */
export interface NoRecordRepo {
  nodeId: string;
  state: 'no-record';
}

export interface WaiverBeneficiary {
  coId?: string;
  name: string;
  domain?: string;
}

/** One entry of `/waivers/{node_id}.json` (input 3). */
export interface WaiverRecord {
  wvrId: string;
  repoNodeId?: string;
  beneficiary: WaiverBeneficiary;
  grantedAt: string;
  /**
   * grantedAt + 72 h. Read by the VESTING generator only (FS05-063). This function
   * ignores it on purpose: cooling governs whether vesting attaches permanently, never
   * whether the beneficiary is covered today. A waiver inside its cooling window is
   * covered exactly like any other (5th collision).
   */
  coolingEndsAt?: string;
  /** Prospective revocation. Absent or null means live. */
  revokedAt?: string | null;
}

/**
 * The company reference as the CALLER received it. Optional fifth argument, additive to
 * the frozen four-argument signature.
 *
 * It exists for exactly one branch: FS-10 §4.3 step 3's "unresolvable but
 * waiver-eligible ⇒ yes-via-waiver". A waiver grant normally mints an unverified `co_`
 * stub plus a registry entry, so beneficiaries resolve by ULID even with no account and
 * no verified domain — that is the ordinary path and needs nothing extra. This parameter
 * covers the residual case where the caller was handed a reference that resolves to no
 * company record at all, yet a live waiver names it. Without it that branch is
 * unreachable, and an unreachable branch in a coverage function is a promise nobody can
 * keep (D14 reachability).
 */
export interface CompanyRef {
  coId?: string;
  domain?: string;
}

/**
 * Why an answer holds when the other basis members cannot show it. One value today:
 * `pass-any-work` — the repository has no published record, and the organisation's Pass
 * covers it because a Pass covers any work under the licence, registered or not (D48
 * item 5). Absent from every other answer.
 */
export type CoverageReason = 'pass-any-work';

export interface CoverageBasis {
  algoVersion: typeof ALGO_VERSION;
  company: { coId: string; verification?: CompanyRecord['verification'] } | null;
  note?: string;
  repo: { nodeId: string; repoState: PublishedRepoState };
  entitlement?: {
    entId: string;
    lane: EntitlementLane;
    periodStart?: string;
    periodEnd?: string;
  };
  waiver?: { wvrId: string; grantedAt: string };
  reason?: CoverageReason;
}

export interface CoverageDates {
  periodEnd?: string;
  graceEnd?: string;
  selfCertifiedAt?: string;
}

export type ProofRef =
  | { type: 'entitlement-jws'; coId: string }
  | { type: 'waiver-record'; repoNodeId: string; wvrId: string };

export interface CoverageResult {
  answer: CoverageAnswer;
  basis: CoverageBasis;
  dates?: CoverageDates;
  /**
   * Which artifact proves the answer. Named, not addressed: this function builds no URL
   * and computes no digest. Absent for `no` (FS-10 §4.4).
   */
  proofRef?: ProofRef;
}

/**
 * The question cannot be answered about this repository: it has no published record, and
 * the organisation holds no Pass inside its term. The caller answers
 * `404 repo_not_registered` (FS-10 §4.5). Returned, never thrown — it is a fact about the
 * repository, not a step the caller skipped.
 */
export interface RepoNotRegistered {
  error: 'repo_not_registered';
  algoVersion: typeof ALGO_VERSION;
  repo: { nodeId: string };
}

export type CoverageOutcome = CoverageResult | RepoNotRegistered;

/** Thrown when the caller skipped a step it owns (FS-10 §4.3 step 1). */
export class CoverageInputError extends Error {
  readonly code: string;
  constructor(message: string, code = 'invalid_coverage_input') {
    super(message);
    this.name = 'CoverageInputError';
    this.code = code;
  }
}

// ---------------------------------------------------------------------------------
// Time. Every comparison in this module goes through these two helpers, so there is
// exactly one place where a date can be misread.
// ---------------------------------------------------------------------------------

function toMillis(value: string | number | Date): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return value;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    throw new CoverageInputError(`nowUtc is not a parsable instant: ${String(value)}`, 'invalid_now');
  }
  return parsed;
}

/**
 * Parses an artifact-supplied instant. Returns null for absent OR unparsable values,
 * and every caller below treats null as "this term cannot contribute coverage" —
 * fail-closed. A malformed date in a signed record is a producer bug; answering `yes`
 * on the strength of one would be ours.
 */
function instant(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

function normaliseDomain(domain: string): string {
  return domain.trim().toLowerCase().replace(/\.$/, '');
}

/**
 * The state an answer reports for a record's state. `verified` — the token records
 * published before D82 carried — is reported as `registered`, the one public state a
 * registered repository has (D82's dated note (d)). Every other token is reported as the
 * record carries it, as cov-v1 did.
 */
function publicRepoState(state: RecordRepoState): PublishedRepoState {
  return state === 'verified' ? 'registered' : state;
}

// ---------------------------------------------------------------------------------
// Predicates
// ---------------------------------------------------------------------------------

/**
 * Does this term's scope reach this repository?
 *
 * A Pass reaches every work under the licence, registered or not (D48 item 5) — that is
 * what a Pass IS, and why it wins the precedence order (FS-10 §4.3 step 5a). Project terms
 * match a named node_id. Portfolio terms match the repo record's owner organisation id,
 * which is why a repo transfer changes portfolio matching from the next publish while the
 * repository key itself never moves (FS10-121).
 */
function appliesToRepo(ent: Entitlement, repo: RepoRecord): boolean {
  if (ent.lane === 'pass') return true;
  const scope = ent.scope;
  if (!scope) return false;
  if (scope.kind === 'network') return true;
  if (scope.kind === 'project') return Array.isArray(scope.repos) && scope.repos.includes(repo.nodeId);
  if (scope.kind === 'portfolio') {
    const orgId = repo.owner?.orgId;
    return typeof orgId === 'string' && orgId.length > 0 && scope.org === orgId;
  }
  return false;
}

/**
 * Inside the paid term? `now == periodEnd` is STILL INSIDE (FS10-121, the boundary
 * rule) — an entitlement does not evaporate on the last second of the term the payer
 * bought. Grace is derived separately, at step 9, and is never a status.
 */
function isWithinTerm(ent: Entitlement, nowMs: number): boolean {
  if (ent.status !== 'active') return false;
  const start = instant(ent.periodStart);
  const end = instant(ent.periodEnd);
  if (start === null || end === null) return false;
  return start <= nowMs && nowMs <= end;
}

/**
 * In the 30-day grace window? `periodEnd < now <= graceEnd`, and `now == graceEnd` is
 * still grace (COM-042, FS10-121). Beyond graceEnd the term contributes nothing — no
 * dunning, no enforcement posture, just an honest `no` (COM-046).
 */
function isWithinGrace(ent: Entitlement, nowMs: number): boolean {
  if (ent.status !== 'active') return false;
  const end = instant(ent.periodEnd);
  const grace = instant(ent.graceEnd);
  if (end === null || grace === null) return false;
  return end < nowMs && nowMs <= grace;
}

/**
 * Deterministic pick among equally-qualifying terms: latest `periodEnd` first, then
 * `entId` ascending. Money-adjacent code gets no coin flips — two deployments handed
 * the same artifacts must name the same `entId` in the basis (FS-00 §7.3 discipline).
 */
function pickTerm(candidates: readonly Entitlement[]): Entitlement | null {
  if (candidates.length === 0) return null;
  const sorted = candidates.slice().sort((a, b) => {
    const aEnd = instant(a.periodEnd) ?? Number.NEGATIVE_INFINITY;
    const bEnd = instant(b.periodEnd) ?? Number.NEGATIVE_INFINITY;
    if (aEnd !== bEnd) return bEnd - aEnd;
    return a.entId < b.entId ? -1 : a.entId > b.entId ? 1 : 0;
  });
  return sorted[0] ?? null;
}

/** Same determinism rule for grace, ordered by the later `graceEnd`. */
function pickGraceTerm(candidates: readonly Entitlement[]): Entitlement | null {
  if (candidates.length === 0) return null;
  const sorted = candidates.slice().sort((a, b) => {
    const aGrace = instant(a.graceEnd) ?? Number.NEGATIVE_INFINITY;
    const bGrace = instant(b.graceEnd) ?? Number.NEGATIVE_INFINITY;
    if (aGrace !== bGrace) return bGrace - aGrace;
    return a.entId < b.entId ? -1 : a.entId > b.entId ? 1 : 0;
  });
  return sorted[0] ?? null;
}

/**
 * Waiver eligibility (FS-10 §4.3 step 2), computed BEFORE any company short-circuit so
 * that a waived organisation is reachable even when it has no entitlement record — the
 * D14 reachability rule. Eligibility is answered later, at step 6, after lane
 * precedence: a company that both holds a Pass and was granted a waiver answers
 * `yes-via-pass`, because the stronger, paid basis is the truthful one.
 *
 * Matching order: `beneficiary.coId` first, then verified-domain equality. A domain on
 * an unverified company is NOT a match — otherwise anyone could claim someone else's
 * waiver by asserting their domain.
 *
 * Among eligible waivers the earliest live `grantedAt` wins (tie-break `wvrId`): that
 * is the grant from which current coverage actually runs.
 */
function findEligibleWaiver(
  waivers: readonly WaiverRecord[],
  company: CompanyRecord | null,
  companyRef: CompanyRef | undefined,
  nowMs: number,
): WaiverRecord | null {
  const coId = company?.coId ?? companyRef?.coId;
  const verifiedDomains = new Set<string>(
    company && company.verification === 'domain-verified' && Array.isArray(company.domains)
      ? company.domains.map(normaliseDomain)
      : [],
  );
  // A caller-supplied domain counts only when no company record resolved at all — the
  // step-3 residual branch. Once a record exists, its own verified domains govern.
  if (!company && companyRef?.domain) verifiedDomains.add(normaliseDomain(companyRef.domain));

  const live = waivers.filter((waiver) => {
    const granted = instant(waiver.grantedAt);
    if (granted === null || granted > nowMs) return false;
    const revoked = instant(waiver.revokedAt);
    if (revoked !== null && revoked <= nowMs) return false;
    const beneficiary = waiver.beneficiary;
    if (!beneficiary) return false;
    if (coId && beneficiary.coId && beneficiary.coId === coId) return true;
    if (beneficiary.domain && verifiedDomains.has(normaliseDomain(beneficiary.domain))) return true;
    return false;
  });

  if (live.length === 0) return null;
  const byCoId = live.filter((w) => coId && w.beneficiary.coId === coId);
  const pool = byCoId.length > 0 ? byCoId : live;
  const sorted = pool.slice().sort((a, b) => {
    const aGranted = instant(a.grantedAt) ?? Number.POSITIVE_INFINITY;
    const bGranted = instant(b.grantedAt) ?? Number.POSITIVE_INFINITY;
    if (aGranted !== bGranted) return aGranted - bGranted;
    return a.wvrId < b.wvrId ? -1 : a.wvrId > b.wvrId ? 1 : 0;
  });
  return sorted[0] ?? null;
}

/**
 * The threshold registration in force, if any. Record level first, then any term-level
 * block, taking the latest `expiresAt`.
 *
 * On "not superseded" (FS-10 §4.3 step 8): this function only reaches step 8 after every
 * lane, the waiver and the donation lane have already failed to answer, so nothing that
 * could supersede the registration is present. Reaching step 8 IS the not-superseded
 * test. An expired registration falls through and coverage reverts toward `no`
 * (COM-055/057).
 */
function activeThreshold(company: CompanyRecord, nowMs: number): ThresholdRegistration | null {
  const candidates: ThresholdRegistration[] = [];
  if (company.thresholdRegistration) candidates.push(company.thresholdRegistration);
  for (const ent of company.entitlements ?? []) {
    if (ent.thresholdRegistration) candidates.push(ent.thresholdRegistration);
  }
  const live = candidates.filter((reg) => {
    const expires = instant(reg.expiresAt);
    return expires !== null && nowMs <= expires;
  });
  if (live.length === 0) return null;
  const sorted = live.slice().sort((a, b) => (instant(b.expiresAt) ?? 0) - (instant(a.expiresAt) ?? 0));
  return sorted[0] ?? null;
}

/**
 * Step 1 for a repository with NO published record (D48 item 5, D82 item 10).
 *
 * Only a Pass inside its term is answered about it: a Pass covers any work under the
 * licence, registered or not, which is what D82 item 10 asks of cov-v2 ("a `cov-v2` answers
 * that a Pass covers any work under the licence"). Nothing else is answered here. A
 * Portfolio is matched through the record's owner and a waiver is published under the
 * record's node id, so neither can be read without a record; a Project, a donation term, a
 * threshold self-certification and a Pass in its grace window keep cov-v1's outcome for a
 * work with no record, `repo_not_registered`, each pinned by a vector. Answering any of them
 * here would be a new version beside this one. The Pass is picked by the same rule as step 5a
 * (suspended and void terms excluded, latest `periodEnd`, then `entId`), so the basis names
 * the same term a registered repository's answer would name.
 */
function noRecordWork(company: CompanyRecord | null, nodeId: string, nowMs: number): CoverageOutcome {
  const pass = company
    ? pickTerm(
        (company.entitlements ?? []).filter(
          (ent) => ent && ent.status === 'active' && ent.lane === 'pass' && isWithinTerm(ent, nowMs),
        ),
      )
    : null;
  if (!company || !pass) {
    return { error: 'repo_not_registered', algoVersion: ALGO_VERSION, repo: { nodeId } };
  }
  return {
    answer: 'yes-via-pass',
    basis: {
      algoVersion: ALGO_VERSION,
      company: { coId: company.coId, verification: company.verification },
      repo: { nodeId, repoState: 'no-record' },
      entitlement: {
        entId: pass.entId,
        lane: pass.lane,
        periodStart: pass.periodStart,
        periodEnd: pass.periodEnd,
      },
      reason: 'pass-any-work',
    },
    proofRef: { type: 'entitlement-jws', coId: company.coId },
  };
}

// ---------------------------------------------------------------------------------
// The function
// ---------------------------------------------------------------------------------

/**
 * Compute the coverage answer.
 *
 * @param companyRecord The verified, decoded entitlement record, or null when the
 *   organisation resolved to nothing. Absence of a record is `no`, never an error
 *   (COM-057) — legibility for scanners.
 * @param repoRecord The published repo record, or `{ nodeId, state: 'no-record' }`
 *   when `/registry/repo/{node_id}.json` does not exist. Required either way.
 * @param waiverList The repository's waiver artifact entries (possibly empty). Not read
 *   for a repository with no record, which has no waiver artifact.
 * @param nowUtc The instant to answer as of. A parameter, never a clock read.
 * @param companyRef Optional: the reference as received. See CompanyRef.
 * @returns The answer, or `repo_not_registered` when the repository has no published
 *   record and the organisation holds no Pass inside its term — the caller's `404`.
 */
export function coverage(
  companyRecord: CompanyRecord | null,
  repoRecord: RepoRecord | NoRecordRepo,
  waiverList: readonly WaiverRecord[],
  nowUtc: string | number | Date,
  companyRef?: CompanyRef,
): CoverageOutcome {
  // Step 1 — repo gate. The caller says what it found; this function decides what an
  // absence means, so every deployment decides it the same way.
  if (!repoRecord || typeof repoRecord.nodeId !== 'string' || repoRecord.nodeId.length === 0) {
    throw new CoverageInputError(
      'repoRecord with a nodeId is required — pass the published record, or { nodeId, state: ' +
        "'no-record' } when /registry/repo/{node_id}.json does not exist",
      'repo_input_missing',
    );
  }
  const nowMs = toMillis(nowUtc);
  if (repoRecord.state === 'no-record') return noRecordWork(companyRecord, repoRecord.nodeId, nowMs);
  const record: RepoRecord = repoRecord;
  const waivers = Array.isArray(waiverList) ? waiverList : [];

  // A delisted or quit repository still computes: entitlements and vesting stand (D12).
  // The state travels in the basis so the caller can say so out loud.
  const repoBasis = { nodeId: record.nodeId, repoState: publicRepoState(record.state) };

  // Step 2 — waiver eligibility, computed before any company short-circuit.
  const waiver = findEligibleWaiver(waivers, companyRecord, companyRef, nowMs);

  // Step 3 — company resolution.
  if (!companyRecord) {
    if (waiver) {
      return {
        answer: 'yes-via-waiver',
        basis: {
          algoVersion: ALGO_VERSION,
          company: waiver.beneficiary.coId ? { coId: waiver.beneficiary.coId } : null,
          repo: repoBasis,
          waiver: { wvrId: waiver.wvrId, grantedAt: waiver.grantedAt },
        },
        proofRef: { type: 'waiver-record', repoNodeId: record.nodeId, wvrId: waiver.wvrId },
      };
    }
    return {
      answer: 'no',
      basis: {
        algoVersion: ALGO_VERSION,
        company: null,
        note: 'no registry record for this organization',
        repo: repoBasis,
      },
    };
  }

  const companyBasis = { coId: companyRecord.coId, verification: companyRecord.verification };
  const entitlementProof: ProofRef = { type: 'entitlement-jws', coId: companyRecord.coId };

  // Step 4 — suspension filter. A chargeback-suspended or voided term is excluded from
  // every step below, so it answers `no` immediately (COM-024).
  const usable = (companyRecord.entitlements ?? []).filter((ent) => ent && ent.status === 'active');

  // Step 5 — lane precedence, in the COM-009 enumeration order.
  const lanes: readonly { lane: EntitlementLane; answer: CoverageAnswer }[] = [
    { lane: 'pass', answer: 'yes-via-pass' },
    { lane: 'project', answer: 'yes-via-project' },
    { lane: 'portfolio', answer: 'yes-via-portfolio' },
  ];
  for (const { lane, answer } of lanes) {
    const term = pickTerm(
      usable.filter((ent) => ent.lane === lane && isWithinTerm(ent, nowMs) && appliesToRepo(ent, record)),
    );
    if (term) {
      return {
        answer,
        basis: {
          algoVersion: ALGO_VERSION,
          company: companyBasis,
          repo: repoBasis,
          entitlement: {
            entId: term.entId,
            lane: term.lane,
            periodStart: term.periodStart,
            periodEnd: term.periodEnd,
          },
        },
        proofRef: entitlementProof,
      };
    }
  }

  // Step 6 — waiver. Revocation is prospective; historic windows are the verify page's
  // business, not coverage-now's (CERT-042).
  if (waiver) {
    return {
      answer: 'yes-via-waiver',
      basis: {
        algoVersion: ALGO_VERSION,
        company: companyBasis,
        repo: repoBasis,
        waiver: { wvrId: waiver.wvrId, grantedAt: waiver.grantedAt },
      },
      proofRef: { type: 'waiver-record', repoNodeId: record.nodeId, wvrId: waiver.wvrId },
    };
  }

  // Step 7 — donation lane, scope rules as recorded.
  const donation = pickTerm(
    usable.filter((ent) => ent.lane === 'donation' && isWithinTerm(ent, nowMs) && appliesToRepo(ent, record)),
  );
  if (donation) {
    return {
      answer: 'yes-via-donation',
      basis: {
        algoVersion: ALGO_VERSION,
        company: companyBasis,
        repo: repoBasis,
        entitlement: {
          entId: donation.entId,
          lane: donation.lane,
          periodStart: donation.periodStart,
          periodEnd: donation.periodEnd,
        },
      },
      proofRef: entitlementProof,
    };
  }

  // Step 8 — threshold self-certification. Carries `selfCertifiedAt`, and still carries
  // the entitlement-JWS proof, because the registration block travels inside that same
  // signed record (FS-10 §4.4).
  const threshold = activeThreshold(companyRecord, nowMs);
  if (threshold) {
    return {
      answer: 'no-entitlement-required-under-threshold',
      basis: { algoVersion: ALGO_VERSION, company: companyBasis, repo: repoBasis },
      dates: { selfCertifiedAt: threshold.selfCertifiedAt },
      proofRef: entitlementProof,
    };
  }

  // Step 9 — grace, derived from dates and never published as a status.
  const graceTerm = pickGraceTerm(
    usable.filter(
      (ent) =>
        (ent.lane === 'pass' || ent.lane === 'project' || ent.lane === 'portfolio' || ent.lane === 'donation') &&
        appliesToRepo(ent, record) &&
        isWithinGrace(ent, nowMs),
    ),
  );
  if (graceTerm) {
    const dates: CoverageDates = { periodEnd: graceTerm.periodEnd };
    if (graceTerm.graceEnd) dates.graceEnd = graceTerm.graceEnd;
    return {
      answer: 'lapsed-in-grace',
      basis: {
        algoVersion: ALGO_VERSION,
        company: companyBasis,
        repo: repoBasis,
        entitlement: { entId: graceTerm.entId, lane: graceTerm.lane },
      },
      dates,
      proofRef: entitlementProof,
    };
  }

  // Step 10 — no.
  return {
    answer: 'no',
    basis: { algoVersion: ALGO_VERSION, company: companyBasis, repo: repoBasis },
  };
}

// ---------------------------------------------------------------------------------
// Wire shaping
// ---------------------------------------------------------------------------------

export interface CoverageProof {
  type: 'entitlement-jws' | 'waiver-record';
  url: string;
  sha256?: string;
}

/** The `/v1/coverage` response body (FS-10 §4.4). */
export interface CoverageResponse {
  answer: CoverageAnswer;
  basis: CoverageBasis;
  asOf: string;
  dates?: CoverageDates;
  proof?: CoverageProof;
}

export interface ResponseOptions {
  /** Echoed so a consumer can re-verify the answer against the same instant (FS10-121). */
  asOf: string;
  /** e.g. https://api.purposesource.org — from configuration, never hardcoded here. */
  apiBaseUrl: string;
  /**
   * Digest of the entitlement JWS the caller already verified. Optional: an honest
   * omission beats a fabricated hash, and a pure function could not compute one.
   */
  entitlementJwsSha256?: string;
}

/**
 * Turn a result into the published response shape. Separated from `coverage` because
 * URLs and digests need configuration and I/O, and the frozen function must have
 * neither. `no` carries no proof (FS-10 §4.4). A `repo_not_registered` outcome is not a
 * result and is not accepted here: the caller answers it with the error envelope.
 */
export function toCoverageResponse(result: CoverageResult, options: ResponseOptions): CoverageResponse {
  const base = options.apiBaseUrl.replace(/\/+$/, '');
  const response: CoverageResponse = {
    answer: result.answer,
    basis: result.basis,
    asOf: options.asOf,
  };
  if (result.dates) response.dates = result.dates;

  const ref = result.proofRef;
  if (ref) {
    if (ref.type === 'entitlement-jws') {
      const proof: CoverageProof = { type: 'entitlement-jws', url: `${base}/v1/entitlements/${ref.coId}.jws` };
      if (options.entitlementJwsSha256) proof.sha256 = options.entitlementJwsSha256;
      response.proof = proof;
    } else {
      response.proof = {
        type: 'waiver-record',
        url: `${base}/v1/waivers/${ref.repoNodeId}.json#${ref.wvrId}`,
      };
    }
  }
  return response;
}

/** Narrowing helper: is this outcome the caller's `404 repo_not_registered`? */
export function isRepoNotRegistered(outcome: CoverageOutcome): outcome is RepoNotRegistered {
  return 'error' in outcome && outcome.error === 'repo_not_registered';
}

/** Narrowing helper for consumers validating an answer string off the wire. */
export function isCoverageAnswer(value: unknown): value is CoverageAnswer {
  return typeof value === 'string' && (COVERAGE_ANSWERS as readonly string[]).includes(value);
}

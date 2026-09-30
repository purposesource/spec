# `cov-v2` and `cov-v1` — the published coverage functions

**Pre-launch.** This repository is part of the Purpose Source Network build; nothing here is a public commitment yet.

This directory holds the reference implementations of the coverage answer, published so
that the model can be audited rather than believed.

| File | What it is |
|---|---|
| `cov-v2.ts` | The version in force from 2026-09-30. The pure function. Zero dependencies, no I/O, no clock read. |
| `cov-v2.vectors.json` | Its vectors — complete published artifacts in, exact outcome out. cov-v1's 25 frozen vectors carried, plus the new ones. |
| `cov-v2.test.ts` | Its runner, the proof that the carried vectors are cov-v1's, and the properties the vectors cannot state. |
| `cov-v1.ts` | The first version, **frozen**: byte-identical to what the edge published, its SHA-256 pinned by `npm run check:module`. |
| `vectors.json` | cov-v1's frozen test vectors. |
| `cov-v1.test.ts` | cov-v1's runner. |

## Run it

```sh
node --experimental-strip-types --test coverage/cov-v1.test.ts coverage/cov-v2.test.ts
```

Node 22.18+ or 24+ (type stripping is on by default there; the flag is harmless and keeps
older 22.x working). Nothing else is needed — no bundler, no compiler, no install.

## Use it

```ts
import { coverage, isRepoNotRegistered, toCoverageResponse } from './cov-v2.ts';

// The caller owns these four steps FIRST:
//   1. validate the repo id and the company reference
//   2. resolve a domain through the published domain index (POST only)
//   3. fetch the entitlement record and VERIFY ITS SIGNATURE against the JWKS
//   4. fetch the repo record and the waiver artifact; when the record is absent, pass
//      { nodeId, state: 'unregistered' } instead of it
const outcome = coverage(companyRecord, repoRecordOrUnregistered, waiverList, new Date().toISOString());
if (isRepoNotRegistered(outcome)) {
  // 404 repo_not_registered: no record, and no Pass reaches the repository
} else {
  const body = toCoverageResponse(outcome, { asOf, apiBaseUrl, entitlementJwsSha256 });
}
```

The function answers with one of exactly eight values and a `basis` block naming what
produced it, or tells the caller the question cannot be asked (`repo_not_registered`). It
never throws for a coverage-relevant fact: an organisation with no record is `no`, not an
error. It throws only when the caller skipped something the caller owns.

## What cov-v2 changes, and why

Three things, each required by an ops decision, and nothing else:

1. **A Pass covers any work under the licence, registered or not** (D48 item 5, carried out
   by D82 item 10). A repository with no published record was always the caller's
   `404 repo_not_registered` under cov-v1. Under cov-v2, an organisation holding a Pass
   inside its term is answered `yes-via-pass` about it, with `basis.repo.repoState:
   "unregistered"` and `basis.reason: "pass-any-work"`, which says why. Every other
   organisation still gets `repo_not_registered`, now returned by the function rather than
   decided by each caller, so every deployment decides it the same way.
2. **A registered repository is one thing, claimed or not** (D82 item 1). A record published
   for a repository its admins never claimed answers exactly like any other record. The
   record carries no claim status, and the function reads none.
3. **One public state, `registered`** (D82's dated note (d) of 2026-09-29). A record that
   still says `verified`, the token published before D82, is read as registered and reported
   as `registered`. `suspended`, `quit` and `delisted` are reported as before.

Everything else is cov-v1's, in cov-v1's order. `cov-v2.test.ts` proves it: each of cov-v1's
25 frozen vectors is carried into `cov-v2.vectors.json` with the same inputs and the same
answer, and only `basis.algoVersion` and the `verified` token moved.

What cov-v2 deliberately does not change: only a Pass **inside its term** reaches a work
with no record. A Pass in its grace window, a Project, a Portfolio, a waiver, a donation or a
threshold self-certification are cov-v1's answers about a registered repository, and D48 item
5 and D82 did not move them; each has a vector pinning `repo_not_registered`.

## The eight answers

`yes-via-pass` · `yes-via-project` · `yes-via-portfolio` · `yes-via-waiver` ·
`yes-via-donation` · `no` · `lapsed-in-grace` · `no-entitlement-required-under-threshold`

Frozen in FS-00 §6.3, semantics owned by URS COM-009, step order in FS-10 §4.3. cov-v2 adds
no ninth: it answers a new question (a work with no record) with an existing answer.

## Things worth knowing before you read the code

- **Waivers are evaluated early and answered late.** Eligibility is computed before any
  company short-circuit, so a waived organisation is reachable even with no account and no
  verified domain. It is answered *after* lane precedence, so a payer who also holds a
  waiver gets the truthful stronger basis.
- **Grace is arithmetic, not a status.** Nothing ever publishes `grace` or `lapsed`. The
  dates in the signed record produce them. `now == periodEnd` is inside the term;
  `now == graceEnd` is inside grace; a millisecond later is `no`.
- **The 72-hour waiver cooling window does not touch the answer.** It governs whether
  vesting attaches permanently. The beneficiary is covered from the grant either way.
- **A delisted or quit repository still computes.** Entitlements and vesting stand; the
  repository state travels in the basis, and the badge goes neutral independently.
- **A work with no record is not a repository with an empty record.** It has no owner, so no
  Portfolio can match it, and no waiver list, because waivers are published under a
  registered repository's node id. Only the Pass reaches it.
- **A domain matches only when it is verified.** Otherwise a waiver could be claimed by
  anyone willing to assert somebody else's domain — see the anti-spoof vector.
- **Ties are broken deterministically** (latest period end, then id). Two deployments
  handed the same artifacts must name the same entitlement in the basis.

## Phase

There is no coverage route on production at v0: the v0 coverage proof is the published
entitlement JWS plus the verify page (FS-00 §6.10 as amended 2026-09-01). The computed route
runs on preview and dev, and activates on production at P-M3 with no schema change.

## The mirror rule

FS10-020: the edge Worker mirrors the version it runs (`workers/edge/src/coverage/cov-v2.ts`
in the website repository) verbatim from this directory, and CI fails if the mirror's hash
differs from the copy here. The running deployment publishes its own module digest and
`algoVersion` at `GET /v1/meta`, so anyone can check that the code answering their query is
the code published here: hash the file that `algoVersion` names.

A change in behaviour creates the next version **alongside** these files. A published version
is never mutated: every answer ever given by a deployment reporting `algoVersion: "cov-v1"`
stays reproducible from `cov-v1.ts`, whose digest `npm run check:module` pins, and the same
will hold for `cov-v2` once a deployment has answered with it.

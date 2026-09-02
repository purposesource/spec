# `cov-v1` — the published coverage function

**Pre-launch.** This repository is part of the Purpose Source Network build; nothing here is a public commitment yet.

This directory holds the reference implementation of the coverage answer, published so
that the model can be audited rather than believed.

| File | What it is |
|---|---|
| `cov-v1.ts` | The pure function. Zero dependencies, no I/O, no clock read. |
| `vectors.json` | The frozen test vectors — complete published artifacts in, exact result out. |
| `cov-v1.test.ts` | The runner, plus the properties the vectors cannot state (purity, enum shape, error ownership). |

## Run it

```sh
node --experimental-strip-types --test coverage/cov-v1.test.ts
```

Node 22.18+ or 24+ (type stripping is on by default there; the flag is harmless and keeps
older 22.x working). Nothing else is needed — no bundler, no compiler, no install.

## Use it

```ts
import { coverage, toCoverageResponse } from './cov-v1.ts';

// The caller owns these four steps FIRST:
//   1. validate the repo id and the company reference
//   2. resolve a domain through the published domain index (POST only)
//   3. fetch the entitlement record and VERIFY ITS SIGNATURE against the JWKS
//   4. fetch the repo record (absent => 404 repo_not_registered) and waiver artifact
const result = coverage(companyRecord, repoRecord, waiverList, new Date().toISOString());
const body = toCoverageResponse(result, { asOf, apiBaseUrl, entitlementJwsSha256 });
```

The function answers with one of exactly eight values and a `basis` block naming what
produced it. It never throws for a coverage-relevant fact: an organisation with no record
is `no`, not an error. It throws only when the caller skipped something the caller owns.

## The eight answers

`yes-via-pass` · `yes-via-project` · `yes-via-portfolio` · `yes-via-waiver` ·
`yes-via-donation` · `no` · `lapsed-in-grace` · `no-entitlement-required-under-threshold`

Frozen in FS-00 §6.3, semantics owned by URS COM-009, step order in FS-10 §4.3.

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
- **A domain matches only when it is verified.** Otherwise a waiver could be claimed by
  anyone willing to assert somebody else's domain — see the anti-spoof vector.
- **Ties are broken deterministically** (latest period end, then id). Two deployments
  handed the same artifacts must name the same entitlement in the basis.

## Phase

There is no coverage route at v0: the v0 coverage proof is the published entitlement JWS
plus the verify page (FS-00 §6.10 as amended 2026-09-01). This module ships anyway,
because the semantics a v0 buyer is promised must be readable before the endpoint that
automates them exists. The computed endpoint activates at P-M3 with no schema change.

## The mirror rule

FS10-020: the edge Worker's `edge/src/coverage/cov-v1.ts` and this file are mirrored
verbatim, and CI fails if the deployed bundle's module hash differs from the copy here.
The running deployment publishes its own module digest at `GET /v1/meta`, so anyone can
check that the code answering their query is the code published here.

A change in behaviour creates `cov-v2` **alongside** this file. `cov-v1` is never
mutated: every answer ever given by a deployment reporting `algoVersion: "cov-v1"` stays
reproducible from this exact source.

# `spec` — the Purpose Source Network contract set

**Pre-launch.** This repository is part of the Purpose Source Network build; nothing here is a public commitment yet.

This is the answer to the first question a serious reviewer asks: **"is any of this
parseable?"**

Every public fact the network publishes has a JSON Schema here. Every public read
endpoint has an OpenAPI description here. The function that decides whether an
organisation is covered for a repository is published here as working, tested source —
not described, published — so the model can be audited instead of taken on trust.

There is no API key, no account, and no rate plan to negotiate. An OSPO, an SCA vendor or
a procurement reviewer can consume all of it the way they consume a static file.

## What is in here

| Directory | Contents |
|---|---|
| `schemas/` | 19 JSON Schemas (draft 2020-12), one per published artifact class. Each is self-contained: one download validates on its own. |
| `openapi/` | `edge-public.v1.yaml` — every public read route, with realistic examples per response and a phase marker per operation. |
| `coverage/` | `cov-v1.ts`, the published coverage function, with `vectors.json` (frozen test vectors) and its test suite. Zero dependencies. |
| `examples/` | One valid instance per schema. These are the fixtures the other repositories build against. |
| `scripts/` | The CI gates. Each one refuses to pass on an empty input set. |
| `spec.config.json` | The organisation and domain names, in one place. Every `$id`, server URL and printed host derives from it, and the gates name any file that disagrees. |

## Run it

```sh
npm ci
npm test
```

That runs, in order: schemas compile and are addressed correctly; every example validates
against its schema; the coverage vectors use valid artifacts and still cover all eight
answers; the coverage module is dependency-free and clock-free (and its SHA-256 is
printed); the copy law holds; the published module typechecks under `erasableSyntaxOnly`;
the frozen vector suite passes; the OpenAPI lints; and every example inside the API
description validates too.

Individual gates:

```sh
npm run check:schemas           # compile, $id, self-containment, provenance, changelog section
npm run check:examples          # one example per schema, each valid
npm run check:vectors           # vector inputs are valid artifacts; all eight answers covered
npm run check:module            # coverage module: no imports, no clock, no I/O; prints its digest
npm run check:copy              # claim rules and leak guards over published copy
npm run check:types             # tsc --noEmit with erasableSyntaxOnly
npm run test:coverage           # the frozen vector suite
npm run lint:openapi            # Redocly, recommended ruleset
npm run check:openapi-examples  # every example in the API description, conformantly validated
```

Three Redocly rules are switched off in `redocly.yaml`, each with its reasoning written
down — and two of them are **replaced, not waived**: `check:openapi-examples`
re-implements the example check with a conformant JSON Schema 2020-12 validator, because
Redocly's own validator mis-scopes `unevaluatedProperties` inside `if`/`then` branches and
fails every conditionally-constrained artifact we publish. The reproduction is in the
script header.

Node 22.18+ or 24+. The coverage module runs under Node's own TypeScript type stripping —
there is no build step and no bundler, because a published reference implementation that
needs a toolchain is not really published.

## The contract index

| Schema | Artifact | Live from |
|---|---|---|
| `purpose-yml.v1.json` | `PURPOSE.yml` at a repository root — **optional** | first public version |
| `registry-v0-record.v1.json` | `repos/{node_id}.yml` in the curated registry repository | first public version only |
| `registry-index.v1.json` | `/registry/index/{shard}.json` and `/registry/export.json` | first public version |
| `registry-index-meta.v1.json` | `/registry/index/meta.json` | first public version |
| `repo-record.v1.json` | `/registry/repo/{node_id}.json` | first public version |
| `waiver.v1.json` | `/waivers/{node_id}.json`, `/waivers/all.json` | first public version (honest empty state) |
| `entitlement-record.v1.json` | decoded payload of `/entitlements/{co_ulid}.jws` | first public version |
| `certificate.v1.json` | the certificate JWS payload profile | first public version |
| `certificate-record.v1.json` | `/certs/{cert_id}.json` | first public version |
| `ct-segment.v1.json` | `/ct/{n}.json`, `/ct/latest.json` | first public version |
| `ct-checkpoint.v1.json` | payload published at `/ct/checkpoint-latest.json` | first public version |
| `ledger-row.v1.json` | one ledger row | first public version |
| `ledger-export.v1.json` | `/ledger/{YYYY}-{MM}.json` (+ CSV twin) | first public version |
| `ledger-chain.v1.json` | `/ledger/chain.json` | first public version |
| `cost-support.v1.json` | one calendar month of the published cost-support table | P-M3 producer, v0 hand-maintained |
| `recipient-list.v1.json` | one published version of the Recipient List (the statutes' annex) | P-M3 producer, v0 hand-maintained |
| `badge.v1.json` | `/badge/{node_id}.json` (shields.io endpoint) | first public version |
| `stats.v1.json` | `/stats.json` | first public version |
| `change-event.v1.json` | one item of `/v1/changes` | later, demand-gated |

Each schema carries an `x-psn` block naming its artifact path, its milestone, the spec
clauses it implements, and its changelog section. CI fails if any of that is missing —
a contract cannot ship here without provenance.

The `cost-support.v1` and `recipient-list.v1` rows are the money contracts of 2026-09-07. Both describe artifacts the frozen
artifact catalogue does not yet name — that deferral is deliberate — so each says so in its
`x-psn.artifactPath` rather than claiming a URL: at v0 the cost-support table is
hand-maintained and rendered on the transparency page, and the Recipient List is the published
annex to the statutes. Neither adds a route: they are published files, and the schema is the
contract whether the producer is a job or a person.

## The coverage function

`coverage/cov-v1.ts` answers with exactly one of eight values, plus a `basis` block naming
what produced the answer:

`yes-via-pass` · `yes-via-project` · `yes-via-portfolio` · `yes-via-waiver` ·
`yes-via-donation` · `no` · `lapsed-in-grace` · `no-entitlement-required-under-threshold`

It is a pure function over three published inputs and an explicit `now`. No I/O, no clock
read, no dependencies. Two calls with the same arguments return the same result forever,
which is what makes the vector file a real test rather than a snapshot.

The deployed worker publishes its own module digest at `GET /v1/meta`. Compare it with the
digest `npm run check:module` prints, and you have verified that the code that answered
your query is the code published here. That check is not a favour we do you — it is the
point of publishing at all.

See [`coverage/README.md`](coverage/README.md) for the behaviours worth knowing before
reading the code (why waivers are evaluated early and answered late; why grace is
arithmetic and never a status; why a domain must be verified to match).

## What this repository is NOT

- **Not the licence.** The licence text lives in its own repository and is the only
  authority on legal terms. Nothing here grants, restricts or interprets anything.
- **Not the platform.** No server, no worker, no site. Only contracts and one reference
  function.
- **Not authoritative over adoption.** Adoption is one committed `LICENSE` file in a
  project's own repository. `PURPOSE.yml` is optional overrides; its `license` and
  `licensor` blocks are informational mirrors that decide nothing.
- **Not a description of open source.** <!-- copy-lint-allow: mention --> The
  predecessor movement may be mentioned as what it is — the parent achievement this
  builds on — and is never used as a self-description here or anywhere else. The gate in
  `scripts/check-copy.mjs` makes every deliberate mention a marked, reviewable decision.
- **Not a promise about anything unbuilt.** Several schemas describe artifacts that a
  later milestone produces. Each says so in its `x-psn.phase`, and the API description
  marks each operation. A published schema is a commitment to a shape, not a claim that
  the thing exists yet.
- **Not a live mirror.** These are committed files. When an artifact and a schema
  disagree, that is a bug — please open an issue rather than working around it.

## How the pieces fit

```
project repository                     this repository                     public surface
──────────────────                     ───────────────                     ──────────────
LICENSE (the truth)  ─────────┐
PURPOSE.yml (optional) ───────┤
                              │        registry-v0-record.v1  ◄── validates the curated
curated registry record  ─────┼──────► purpose-yml.v1              registry's pull requests
                              │
                              ├──────► repo-record.v1        ─┐
operator signing script  ─────┼──────► certificate.v1         │
                              ├──────► certificate-record.v1  ├──►  artifacts published as
                              ├──────► ct-segment.v1          │     files, served by the
                              ├──────► ct-checkpoint.v1       │     public read API
committed ledger table   ─────┼──────► ledger-row.v1          │     (openapi/edge-public.v1)
                              ├──────► ledger-export.v1       │
                              ├──────► ledger-chain.v1        │
fees account + invoices  ─────┼──────► cost-support.v1        │
the statutes' annex      ─────┼──────► recipient-list.v1      │
                              ├──────► entitlement-record.v1  │
                              ├──────► waiver.v1              │
                              ├──────► badge.v1               │
                              ├──────► registry-index(+meta)  │
                              └──────► stats.v1              ─┘
                                              │
                                              ▼
                                   coverage/cov-v1.ts  ── the pure function over
                                                          entitlement + repo + waivers
```

## Versioning

Additive-only inside a version; a breaking change is a **new file** beside the old one,
which keeps being served unchanged for as long as anything published under it exists. The
same rule governs the coverage function: `cov-v2` is created alongside `cov-v1`, never in
place of it. Full policy and per-schema history in [`CHANGELOG.md`](CHANGELOG.md).

## Things a human still has to decide

The changelog's "Open questions" section is the live list, and its "Settled" section keeps
what has been answered. The load-bearing open ones:

1. **Counter zero-state** — an illustrative artifact shows `0` where the build sheet says
   `null`. The schema enforces `null`, on the honesty rule. Confirm or overturn.
2. **The manifest's `display` section** — published here as explicitly cosmetic, but the
   registry chapter's permitted-key list does not yet include it.
3. **Organisation and domain names** — everything derives from `spec.config.json` and is
   subject to final clearance.
4. **Package publication** — the npm package is marked private; whether the contract set
   is also published to a registry is undecided.

Settled since: the **entitlement-record shape**. The payload is ratified as the company
wrapper carrying the frozen entitlement object (FS-00 §6.2 amendment note of 2026-09-07) —
which is what `entitlement-record.v1.json` has published all along, so nothing here changed.

## Licence

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

Contributors keep their copyright — no copyright assignment, ever.

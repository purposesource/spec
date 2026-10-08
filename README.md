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
| `schemas/` | 35 JSON Schemas (draft 2020-12): one per published artifact class, and `contributor-page-settings.v1` for a person's private page settings, which are never published. Each is self-contained: one download validates on its own — which is why a shared enum is copied into each schema that needs it and `check:menu` asserts the copies are identical. |
| `openapi/` | `edge-public.v1.yaml` — every public read route, with realistic examples per response and a phase marker per operation. |
| `coverage/` | `cov-v2.ts`, the published coverage function in force, with `cov-v2.vectors.json` and its test suite; `cov-v1.ts`, the first version, frozen beside it with `vectors.json`. Zero dependencies. |
| `examples/` | One valid instance per schema. These are the fixtures the other repositories build against — and in four cases, `category-menu.v1.example.json`, `claim-kit.v1.example.json`, `claim-kit.v2.example.json` and `link-platforms.v1.example.json`, the example IS the published document, byte for byte. Beside them, five golden files the implementations run: `link-rules.v1.golden.json` (the contributor page's link cases, hostile ones included), `contributor-page-contrast.v1.golden.json` (the WCAG matrix of the page's colour presets), `contributor-page-preview.v1.golden.json` (worked preview-hash vectors), `contributor-page-alias.v1.golden.json` (worked login-address MACs under a published test key) and `contributor-page-build.v1.golden.json` (the builder's vectors for keeping a hidden login off the repository list). |
| `kits/` | The claim-language kits — `kit-{version}.json`, the wording a certificate holder may publish and the framing that is excluded (FS08-070). Versioned documents, not pages: a certificate pins the kit that was in force when it was issued. Each is published at `/kits/v{n}` and validated by `check:kits`. |
| `scripts/` | The CI gates. Each one refuses to pass on an empty input set. |
| `spec.config.json` | The organisation and domain names, in one place. Every `$id`, server URL and printed host derives from it, and the gates name any file that disagrees. |

## Run it

```sh
npm ci
npm test
```

That runs, in order: schemas compile and are addressed correctly; every example validates
against its schema; every claim-language kit validates, is addressed at the permalink its
own name implies and carries no figure; the category menu is a single list whose every copy
is identical; the Recipient List examples keep the List's order, their dates and notices, and
agree with their index and with the cost-support example, and the two List contracts refuse what
they must; every example allocation key hashes to the approved text it carries, is the key its
weights give over the List version it names, and the key index agrees with it; every published
designation makes 100 and derives its slug list, every contributors' summary keeps the floor of
5 and the published rounding, every monthly summary's totals make 100 per designation, and the
two designation contracts refuse what would name a person or breach the floor; the contributor
page's link table keeps its rules and gives every golden link answer; the page contracts meet the
contrast matrix, recompute their preview hashes, carry no points, money or GitHub id, and refuse
what the design rules out; the coverage
vectors use valid artifacts and still cover all eight answers; the coverage module is
dependency-free and clock-free (and its SHA-256 is printed); the copy law holds; the published
module typechecks under `erasableSyntaxOnly`; the frozen vector suite passes; the OpenAPI lints;
and every example inside the API description validates too.

Individual gates:

```sh
npm run check:schemas           # compile, $id, self-containment, provenance, changelog section,
                                #   one published state for a registered repository (D82)
npm run check:examples          # one example per schema, each valid
npm run check:kits              # every claim-language kit: valid, correctly addressed, no figure
npm run check:menu              # the category menu is one list; every copy of it is identical
npm run check:recipient-lists   # the List examples: order, dates, notices, index agreement, refusals
npm run check:allocation-keys   # example keys hash to their approved text and derive from their
                                #   weights over the List; the key index agrees
npm run check:designations      # designations make 100 and derive their slug list; the contributors'
                                #   summary keeps the floor of 5 and the rounding; monthly totals; refusals
npm run check:links             # the contributor page's link table keeps its rules; every golden
                                #   link case gets its recorded answer from the table's steps
npm run check:contributor-page  # contrast matrix, preview-hash and alias-MAC vectors, the builder's
                                #   hidden-login vectors, no points/money/GitHub id, the settings
                                #   defaults, and the refusals the design rules
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
| `category-menu.v1.json` | `examples/category-menu.v1.example.json` — the seven published categories, vendored by the curated registry repository | first public version |
| `purpose-yml.v1.json` | `PURPOSE.yml` at a repository root — **optional** | first public version |
| `registry-v0-record.v1.json` | `registry/{owner}--{name}.yml` in the curated registry repository | first public version only |
| `registry-index.v1.json` | `/registry/index/{shard}.json` and `/registry/export.json` | first public version |
| `registry-index-meta.v1.json` | `/registry/index/meta.json` | first public version |
| `repo-record.v1.json` | `/registry/repo/{node_id}.json` | first public version |
| `designations-summary.v1.json` | `/designations/{YYYY-MM}.json` — the designations in force for one month, in summary over all repositories: the projects' totals, and the contributors' from 5 designators, each with its count of designations (ops decisions D117 §6 and D121) | P-M3 producer |
| `waiver.v1.json` | `/waivers/{node_id}.json`, `/waivers/all.json` | first public version (honest empty state) |
| `entitlement-record.v1.json` | decoded payload of `/entitlements/{co_ulid}.jws` | first public version |
| `covered-organisations.v1.json` | `/entitlements/covered-organisations.json` — one line per organisation holding an Entitlement term, named only where it asked to be (ops decision D44) | first public version |
| `certificate.v1.json` | the certificate JWS payload profile | first public version |
| `certificate-record.v1.json` | `/certs/{cert_id}.json` | first public version |
| `certificate-policy.v1.json` | `/certs/policy/latest.json` | first public version |
| `claim-kit.v1.json` | `kits/kit-{version}.json` here, published at `/kits/{version}.json` — the example is the published document | first public version |
| `claim-kit.v2.json` | `kits/kit-{version}.json` from kit-2 on (ops decision D44), published at `/kits/{version}.json` — the example is the published document; kit-1 stays a `claim-kit.v1` document | first public version |
| `ct-segment.v1.json` | `/ct/{n}.json`, `/ct/latest.json` | first public version |
| `ct-checkpoint.v1.json` | payload published at `/ct/checkpoint-latest.json` | first public version |
| `ledger-row.v1.json` | one ledger row | first public version |
| `ledger-export.v1.json` | `/ledger/{YYYY}-{MM}.json` (+ CSV twin) | first public version |
| `ledger-chain.v1.json` | `/ledger/chain.json` | first public version |
| `cost-support.v1.json` | one calendar month of the published cost-support table | P-M3 producer, v0 hand-maintained |
| `recipient-list.v1.json` | `/recipient-list/{version}.json` — one released version of the Recipient List (kept by the board, outside the statutes), each entry pending or active, written once | P-M3 producer |
| `recipient-lists.v1.json` | `/recipient-list/index.json` — every released List version, newest first, with its state (released, recorded, late or void), its proven publication and its notice, and every immediate removal with its published ground | P-M3 producer |
| `allocation-key.v1.json` | `/allocation-keys/{YYYY-MM}.json` — the board's allocation key for one month, released by two steward approvals before the month and written once, with the exact text they approved | P-M3 producer |
| `allocation-keys.v1.json` | `/allocation-keys/index.json` — every released key, newest first, with its state (released, recorded, late or void) and its proven publication date | P-M3 producer |
| `sponsorship-schedule.v1.json` | `/sponsors/schedule/{version}.json` — the published sponsorship tiers and terms, versioned, never edited once a sponsor has paid under a version (ops decision D44) | P-M2, `draft` until the board adopts it |
| `sponsorship.v1.json` | `/sponsors.json` — the sponsor register: every settled sponsorship by name, tier, period, amount and use (ops decision D44) | P-M3 producer, v0 hand-maintained |
| `badge.v1.json` | `/badge/{node_id}.json` (shields.io endpoint) | first public version |
| `stats.v1.json` | `/stats.json` | first public version |
| `publish-log.v1.json` | `/meta/publish-log.json` | first public version |
| `change-event.v1.json` | one item of `/v1/changes` | later, demand-gated |
| `contributor-page-settings.v1.json` | never published: a person's private page settings, held by the api as a draft and frozen as versions; its schema is here because the api, the editor and the builder build against it | P-M3 (never published) |
| `contributor-page.v1.json` | `/p/{pid}.json`, unlisted — the public document of one published contributor page, which the edge renders as HTML at `/p/{pid}`, `/u/{login}` or `/u/{login}/{pid}` (ops decision D116) | P-M3 producer |
| `contributor-page-alias.v1.json` | `/u/k/{addressMac}.json`, unlisted — from a login address to a page, keyed by a keyed hash and never by the login | P-M3 producer |
| `link-platforms.v1.json` | `examples/link-platforms.v1.example.json` — the pinned link table every contributor page link is checked against and rebuilt from; the example is the table, vendored by the platform and the edge | with the contributor page |

Each schema carries an `x-psn` block naming its artifact path, its milestone, the spec
clauses it implements, and its changelog section. CI fails if any of that is missing —
a contract cannot ship here without provenance.

The `cost-support.v1` and `recipient-list.v1` rows are the money contracts of 2026-09-07. Both described artifacts the frozen
artifact catalogue did not yet name — that deferral was deliberate — so each said so in its
`x-psn.artifactPath` rather than claiming a URL. The cost-support table still does: at v0 it is
hand-maintained and rendered on the transparency page, a published file whose schema is the
contract whether the producer is a job or a person.

The `recipient-list.v1` and `recipient-lists.v1` rows (FS-00 §6.2's dated note of 2026-10-01)
publish the Recipient List the way the allocation key is published: each released version is
written once at `/recipient-list/{version}.json`, and its publication is the public notice of what
it announces; the date of that publication is proven afterwards from the publish log and stated in
the index, which also lists every organisation removed at once under statutes Art. 7(6), with its
ground. Both stay `authoritative: false`: the board's published List is the instrument.

The `sponsorship-schedule.v1` and `sponsorship.v1` rows (ops decision D44) follow the same
pattern. Sponsorship is invoiced and paid by bank transfer, never through the checkout, so the
schedule is a versioned document the website serves, `draft` until the board adopts it, and the
register is hand-maintained at v0 from the general-account statement and the invoices. Every
sponsor is named: undisclosed support is prohibited by the statutes.

The `allocation-key.v1` and `allocation-keys.v1` rows (2026-09-28) publish the board's allocation
key before the month it governs (statutes Art. 8(4)). The key document carries the exact
canonical text two stewards approved, as a string, and its SHA-256 — the hash both approvals
recorded — so anyone can recompute that hash from the published text with one SHA-256 and read
the key back out of the same text. It is written once, at the release; the date it was
published is proven afterwards from the publish log and stated in the index, which is also where
a key that came too late, or was voided, keeps its line.

The designation members and the `designations-summary.v1` row (2026-10-08; ops decisions D117 §6
and D121 item 1) publish designations as the statutes say they are published: recorded, and
published in summary (Art. 8(4)), contributors' from the first day (Calculation Rules Nr. 26). A
repository's record carries the project's own designation, set by its administrators, with no
floor, and its contributors' designations only as a count and mean shares, and only from 5
designators; below that they count only in the registry-wide monthly totals, which carry the
contributors' half only when no fewer than 5 people stand behind what the repository summaries
do not already show. Nothing published names a person. Contributors' designations are advisory
and route money only after the fairness review (D27).

The four contributor page rows (2026-10-06; ops decision D116) describe a person's own public page,
which they build in private, preview and publish when ready, and hide whenever they like. The
public document carries no points, ranks, money or GitHub id, and every link on it is rebuilt from
one pinned table (`link-platforms.v1`): a person pastes an address loosely, and the page shows only
an `https` address on a host the table fixes. Only the page document and the alias are published;
the settings are the person's private draft, and their schema is published so the codebases that
handle them agree on it.

## The coverage function

`coverage/cov-v2.ts` answers with exactly one of eight values, plus a `basis` block naming
what produced the answer:

`yes-via-pass` · `yes-via-project` · `yes-via-portfolio` · `yes-via-waiver` ·
`yes-via-donation` · `no` · `lapsed-in-grace` · `no-entitlement-required-under-threshold`

`yes-via-donation` is retired: it is never returned. It answered for a Donation Entitlement,
the credential of the direct donation route, and that route was dropped before it opened (ops
decisions D91 item 3 and D93 item 1, 2026-10-01). No Donation Entitlement is issued, so no
published entitlement record carries the `donation` term the function's donation step looks for.
The value stays in the frozen set of eight (FS-00 §6.3), which `/v1/meta` lists in full, and both
modules keep the step, because their bytes are pinned.

`cov-v2` is a pure function over three published inputs and an explicit `now`. No I/O, no clock
read, no dependencies. Two calls with the same arguments return the same result forever,
which is what makes the vector file a real test rather than a snapshot.

`cov-v2` (2026-09-30) is `cov-v1` with three changes, each an ops decision: a Pass covers
any work under the licence, registered or not, so a Pass holder asking about a repository
with no registry record is answered `yes-via-pass` rather than `repo_not_registered` (D48
item 5, D82 item 10); a registered repository answers the same whether or not its admins
claimed it (D82 item 1); and an answer reports one public state, `registered`, for a record
that says `registered` or the older `verified` (D82's dated note (d)). `cov-v1.ts` stays
beside it unchanged, its digest pinned, so every answer it gave stays reproducible.

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
the certificate policy   ─────┼──────► certificate-policy.v1  │     files, served by the
                              ├──────► ct-segment.v1          │     public read API
                              ├──────► ct-checkpoint.v1       │     (openapi/edge-public.v1)
committed ledger table   ─────┼──────► ledger-row.v1          │
                              ├──────► ledger-export.v1       │
                              ├──────► ledger-chain.v1        │
fees account + invoices  ─────┼──────► cost-support.v1        │
the board's list         ─────┼──────► recipient-list.v1      │
                              ├──────► entitlement-record.v1  │
                              ├──────► waiver.v1              │
                              ├──────► badge.v1               │
                              ├──────► registry-index(+meta)  │
                              └──────► stats.v1              ─┘
                                              │
                                              ▼
                                   coverage/cov-v2.ts  ── the pure function over
                                                          entitlement + repo + waivers
                                                          (cov-v1.ts frozen beside it)
```

`category-menu.v1` sits underneath all of it: the seven public-benefit categories, written
down once here, copied into every schema that accepts a category slug (self-containment
forbids a cross-file `$ref`) and vendored byte-identically by the curated registry
repository. `check:menu` is what makes "once" mechanical rather than aspirational.

## Versioning

Additive-only inside a version; a breaking change is a **new file** beside the old one,
which keeps being served unchanged for as long as anything published under it exists. The
same rule governs the coverage function: `cov-v2` is created alongside `cov-v1`, never in
place of it. Full policy and per-schema history in [`CHANGELOG.md`](CHANGELOG.md).

The scripts check that a schema compiles, that every example validates and that the frozen
vectors still hold; whether a change is additive in *meaning* is a human's read. Since
2026-09-11 [`.github/CODEOWNERS`](.github/CODEOWNERS) names the organisation team
`@purposesource/stewards` on `schemas/`, `openapi/`, `coverage/` and `CHANGELOG.md`, so a
pull request touching a contract asks a steward for that read. That file records its own
limits, measured the same day: the team holds no repository access yet and `main` carries no
required-review rule, so the review is requested and not yet required — two operator acts,
in that order.

## Things a human still has to decide

The changelog's "Open questions" section is the live list, and its "Settled" section keeps
what has been answered. The load-bearing open ones:

1. **Counter zero-state** — an illustrative artifact shows `0` where the build sheet says
   `null`. The schema enforces `null`, on the honesty rule. Confirm or overturn.
2. **The manifest's `display` section** — published here as explicitly cosmetic, but the
   registry chapter's permitted-key list does not yet include it.
3. **Organisation and domain names** — everything derives from `spec.config.json` and is
   subject to final clearance. *(Corrected 2026-09-08: the two names themselves are no
   longer pending — the GitHub organisation `purposesource` exists and
   `purposesource.org` is registered, and `spec.config.json` already carries both.
   What is still undecided is the steward organisation's legal name, which this
   repository never prints — see [`NOTICE`](NOTICE) — and the final licence identifier
   (URS §21 OPEN-20), whose working form is `PurposeSource-1.0`. The single
   substitution point is unchanged, and so is the property that makes it worth having:
   settling either one is one edit plus a test run.)*
4. **Package publication** — the npm package is marked private; whether the contract set
   is also published to a registry is undecided.

Settled since: the **entitlement-record shape**. The payload is ratified as the company
wrapper carrying the frozen entitlement object (FS-00 §6.2 amendment note of 2026-09-07) —
which is what `entitlement-record.v1.json` has published all along, so nothing here changed.

## Licence

Apache-2.0. See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).

Contributors keep their copyright — no copyright assignment, ever.

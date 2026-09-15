# Changelog

**Pre-launch.** This repository is part of the Purpose Source Network build; nothing here is a public commitment yet.

Every published contract carries its own section below. Each schema's `x-psn.changelog`
field points at its section, and CI fails if a schema exists without one — so a contract
cannot ship without a written history.

## Versioning policy

1. **Additive-only inside a version.** A `v1` schema may gain an optional property or an
   enum value that widens what is accepted. It may never remove a property, tighten a
   type, or change what an existing value means.
2. **A breaking change is a new file.** `repo-record.v2.json` lands beside
   `repo-record.v1.json`; the old file keeps being served, unchanged, for as long as
   anything published under it still exists. The same rule governs the coverage function:
   `cov-v2` is created alongside `cov-v1`, never in place of it.
3. **`x-psn.specVersion` is the file's own semantic version.** Patch for a wording fix in
   a description; minor for an additive property; a major bump means you should have
   created a new file instead — the gate does not stop you, but review will.
4. **Nothing here is retroactive.** An artifact already published stays valid under the
   schema version it was published against. That is the entire reason the version is in
   the filename.
5. **Before a contract's first publication, it may change in place.** Rules 1 and 2 protect
   consumers, and a contract nothing has ever been published under has none. So until a
   file's first published artifact exists, it may lose a property, tighten a type, or close
   an open pattern to an enum — with a **minor** bump and a section entry that labels the
   change `pre-release` and says what moved and why. From first publication the new-file
   rule binds absolutely, and rule 4 makes that boundary permanent: whatever was published
   stays valid under the version it was published against, so the freedom above can never
   reach back and invalidate it. This clause is written down because the history below
   already relies on it twice — `ledger-row.v1`'s 2026-09-05 rename of a row type, and
   `registry-v0-record.v1` 1.1.0 — and a rule a repository quietly departs from is worse
   than a narrower rule it keeps.

## 0.1.0 — unreleased

Initial scaffold of the contract set. Twenty-three schemas, the public read API description,
and the published reference implementation of the coverage function with its frozen test
vectors. Two of them are the money contracts of 2026-09-07 — `cost-support.v1.json`
and `recipient-list.v1.json` — which close the planned-but-unbuilt entry below; the
twenty-first is `certificate-policy.v1.json`, the published certificate policy of
2026-09-07; and the twenty-second is `claim-kit.v1.json` (2026-09-08), the contract for the
claim-language kit the checkout delivers at purchase and every corporate certificate embeds;
and the twenty-third is `publish-log.v1.json` (2026-09-12), the publish batch records the
artifact plane has carried since the first build and the plane's own validation gate had to
list as unschematised for want of a contract.

Ops decision D44 (2026-09-15) adds to the set, each addition with its own section below:
`claim-kit.v2.json`, the second shape of the claim-language kit, beside `claim-kit.v1.json`
rather than in place of it; `covered-organisations.v1.json`, the one public list of
organisations holding an Entitlement term, named only where they asked to be; and
`sponsorship-schedule.v1.json` and `sponsorship.v1.json`, the published sponsorship schedule and
the sponsor register — twenty-seven schemas in all.

### Contracts published beyond the initially-scoped ten

Seven schemas were added because another repository's acceptance test names a schema
published *here* and would otherwise have nothing to validate against:

| Schema | Needed by |
|---|---|
| `certificate-record.v1.json` | the verify page and the verify route (VS-25); the artifact-validation gate (VS-04) |
| `certificate-policy.v1.json` | the published certificate policy the site and the claim-language kit both read (VS-30) |
| `ct-segment.v1.json` | the committed transparency log and its append-only CI guard (VS-27, VS-28) |
| `ct-checkpoint.v1.json` | the monthly signed checkpoint (VS-28) |
| `ledger-export.v1.json` | the published monthly ledger export (VS-04, VS-37) |
| `registry-index.v1.json` + `registry-index-meta.v1.json` | the published registry index and the browse surface (VS-04, VS-17); the badge route's delist guard (VS-24) |
| `registry-v0-record.v1.json` | the curated registry repository's validation CI, which validates "against the JSON Schema published in spec" (VS-03, FS02-061) |
| `category-menu.v1.json` | the one publication of the seven public-benefit categories, vendored by the curated registry repository and read by every allocation surface (VS-03, VS-05; ops decision D33 item 1, 2026-09-07) |

### Open questions a human must settle

A question that gets answered moves to *Settled* below, with its date and the instrument
that settled it; nothing here is deleted, and no number is ever reassigned — a settled
question leaves its number behind as a one-line pointer, so a citation of
"open question 4" still means the question it meant when it was written.

1. **Entitlement-record shape.** *Settled 2026-09-07 — the full entry, with the instrument
   that settled it, is Settled 1 below.* The number is kept rather than freed, so the six
   below keep the numbers they are cited under (the `badge.v1.json` and `stats.v1.json`
   sections cite 3 and 2).
2. **Counter zero-state.** The illustrative artifact in FS-10 §10 shows the numeric
   counter fields as `0` while `state` is `pre-launch`; VS-19 states them as `null`, and
   the honesty rule forbids rendering a zero money figure as either an achievement or an
   embarrassment. `stats.v1.json` enforces `null`. If the FS-10 example is meant
   literally, this schema is what must change, and it must change here first.
3. **Badge artifact and `generatedAt`.** FS-00 §6.2 requires every artifact to carry
   `schemaVersion` and `generatedAt`. The badge body must remain a valid shields.io
   endpoint response, so it carries shields' own `schemaVersion: 1` and deliberately no
   `generatedAt`; freshness travels in `ETag` and `Last-Modified`. Recorded as a decision,
   not an oversight.
4. **`PURPOSE.yml` `display` section.** FS-02 §6 enumerates the permitted manifest keys
   and does not include a display block, while the assignment for this repository names
   display metadata as part of the manifest contract. It is published here as an
   explicitly cosmetic, non-authoritative section. FS-02 should either adopt it or say no.
5. **Ambiguous artifact paths.** Four literal artifact names overlap a templated path
   (`meta.json` vs `{shard}.json`, `all.json` vs `{nodeId}.json`, `latest.json` and
   `checkpoint-latest.json` vs `{segment}.json`). Harmless for a static file store, and
   the linter rule is switched off with that reasoning written down in `redocly.yaml`. If
   these ever become real routes, the ambiguity becomes real too.
6. **Organisation and domain names.** Every name in this repository derives from
   `spec.config.json` and is subject to final clearance. Changing it is one edit plus a
   test run; the gates name every file that still disagrees. *(Corrected 2026-09-08 — the
   organisation and domain names are settled facts and no longer what this question is
   about: the GitHub organisation `purposesource` exists and `purposesource.org` is
   registered, and `spec.config.json` carries both. The sentence above stays as written
   because the mechanism it describes is unchanged and still load-bearing for the two
   names that ARE open: the steward organisation's legal name, which this repository
   never prints — `NOTICE` records it as pending rather than substituting it — and the
   final licence identifier, `licenseTokenId`, whose working form `PurposeSource-1.0`
   the schema descriptions already mark as provisional (URS §21 OPEN-20). Registered is
   not the same as resolving: the `$id` and server hosts derived from these names are
   not served yet, which is a deployment fact and no part of this question.)*
7. **npm publication.** The package is marked private. Whether the contract set is also
   published to a package registry (and under what name) is undecided.

### Settled

Questions that were open above and have since been answered in the record. They stay here
with what settled them, because a contract's history is part of the contract. *(2026-09-08:
the list now also carries a question the record settled that was never numbered above — entry 2,
which the artifact-validation gates raised rather than this file. An entry's number is its
position in THIS list and nothing else; entry 1 happens to also be the open question of that
number and says so, entry 2 has no counterpart, and open question 2 — the counter zero-state —
is still open.)*

1. **Entitlement-record shape** — settled 2026-09-07; open question 1 of the list above,
   whose number stays there as a pointer to this entry. The `/entitlements/{co_ulid}.jws`
   payload is ratified as the company record: `schemaVersion`, `generatedAt`, `coId`,
   `name?`, `domains[]`, `verification`, `entitlements[]`, `thresholdRegistration?` — each
   `entitlements[]` item being the frozen entitlement object verbatim and closed to
   additions. The instrument is a dated FS-00 §6.2 amendment note beside the frozen row it
   reconciles, and it gives the reason: FS-10 §4.2 is the only text that specifies
   `domains[]`, `verification` and the domain-index lookup, and a lone entitlement object
   has nowhere to carry them — one organisation, one record, one URL, however many terms
   it holds. Nothing in this repository changed: `entitlement-record.v1.json` already
   published exactly that shape, no property moved, no version was bumped, and every
   example and vector still validates. *(As first recorded: "This repository implements
   FS-10 §4.2 and leaves the frozen object untouched inside the array. Needs ratifying
   either way.")*

2. **Which side is authoritative — the emitted artifact plane or the published schema?** —
   settled 2026-09-07 by the recorded ruling **Q b0443041**; the instrument is a dated FS-00
   §6.2 amendment note of 2026-09-08, written beside the artifact catalog it governs: the
   published profile governs the artifact shapes, and `index-build` conforms. The question was
   not raised here — the two artifact-validation gates that measure an emitted plane against
   these files found nine artifact classes whose emitted bytes were a different contract from
   the schema, and recorded every signature rather than choosing a side.
   **What it settles.** The schemas in this repository ARE the shape of every catalogued
   artifact. A builder emitting a member no schema admits, or omitting one a schema requires,
   has a defect in the builder; the schema does not move to meet it. Where the divergence
   exposes a defect in a contract published HERE, that contract is fixed here first and the
   plane follows — under this file's own versioning policy, additively inside `v1` (§1), or in
   place with a `pre-release` entry while nothing has been published under the file (§5).
   Never the other way round.
   **What it does not settle.** Paths and cadence. Which artifacts exist, at which URLs, and
   how often each is regenerated is FS-00 §6.2's to say; `$id` and `x-psn.artifactPath` record
   that catalog, they do not define it, and no URL moves because of this. Nor does it settle
   whether an artifact that has no schema here should have one — a schema lands when the rule
   it encodes is decided, never before.
   The first changes it authorises are the optional `source` member and the widened
   `githubNodeId` of 2026-09-08, written per file below.

### Planned — not built

**CLOSED 2026-09-07.** The one entry this section held is built: `cost-support.v1.json` is
published with its own schema, example and changelog section below, and the Recipient List it
depended on is published beside it as `recipient-list.v1.json`. No other contract is recorded
here as planned-but-unbuilt. The next contracts arrive with the P-M3 platform, and a schema
lands here when the rule it encodes is decided — never before.

The entry as first recorded, kept as history:

> - **`cost-support.v1.json`** (P-M3; recorded 2026-09-05). The data shape of the movement's
>   monthly cost-support table, as decided in the ops record (decision D29,
>   `COST-SUPPORT-MODEL-2026-09-05.md` §3): per calendar month — Purpose Fees received net of
>   the rail's processing fee; direct costs itemised with their invoice references; cost
>   support by named supporter, the sum never exceeding the direct costs; charged to fees =
>   max(0, direct costs − support), with the running year total against the published cap;
>   passed on directly to the listed recipients, one line per recipient with date and receipt
>   reference *(amended 2026-09-06, D33; as first recorded: "passed on to the named
>   intermediary, with date and receipt reference")*; every line carrying an evidence link.
>   Since D34 item 5 (2026-09-06) the table carries four outgoing lines — charged to fees, the
>   reserve retention, the steward hardship pay, and the transfers — each capped, each
>   published. Supporters are rows, never schema constants — the shape must be identical
>   whether the supporter list has zero rows or many. Nothing is published here yet: no
>   schema file, no example, no changelog section of its own. It lands as an additive new
>   file when P-M3 builds the transparency table.

## category-menu.v1.json

### 1.0.0 — unreleased (2026-09-07; ops decision D33 item 1)

- Initial publication. The seven public-benefit categories of the statutes' Art. 7 —
  health, education, poverty relief, humanitarian aid, environment, animal welfare,
  research — as the one place the vocabulary is written down. `examples/category-menu.v1.example.json`
  IS the menu, not an illustration of one; the curated registry repository vendors it
  byte-identically and checks the bytes against the published copy on every run.
- Exactly seven rows: the count is constitutional, not a configuration bound. `provisional`
  stays true until the Recipient List — the named organisations inside each category — is
  adopted and published as the versioned annex to the statutes. The category NAMES are
  published now; the recipients are a separate contract and deliberately not part of this
  file.
- `category_id` is the ledger's `cat-{slug}` spelling of the same category. JSON Schema
  cannot express that derivation, so `check:menu` asserts it, together with the equality
  of every in-schema copy of the slug enum. The copies exist because a published schema
  here must validate on its own download, so no schema carries an external `$ref`; the
  gate is the other half of that trade.
- It replaces a six-slug menu (`climate`, `health`, `education`, `water-sanitation`,
  `food-security`, `digital-access`) that predated the decision and survived in the
  curated registry's configuration and in four examples. Nothing had been published under
  it.

### 1.0.1 — unreleased (2026-09-15; ops decisions D43 and D44)

- Wording. The Recipient List is no longer "the versioned annex to the statutes", adopted "at the
  founding assembly": since D43 item 1 it is a versioned board list outside the statutes
  (statutes Art. 7(1) and Art. 22(7)), adopted by the board at its constituting meeting. The
  schema description, `provisional`'s description and the example's note say so, and
  `provisional` still stays true until the board has adopted and published a version of the
  list. Descriptions follow ops decisions D43 items 1 and 4 (annexes out of the statutes; one
  clock per payout); no member, type, vector or answer changes.
- `examples/category-menu.v1.example.json` IS the menu, so its bytes changed, and the curated
  registry repository's vendored copy (`config/category-funds.json`) takes the same bytes in the
  same wave. The slugs, ids, order and `provisional` value are unchanged.

## purpose-yml.v1.json

### 1.0.0 — unreleased

- Initial publication. The optional manifest: informational licence and licensor mirrors,
  cosmetic display metadata, successor designation, category-fund defaults, and the
  attribution override section with its published bounds.
- Non-attribution fields reject field by field; the attribution section fails closed as a
  whole. Both rules are stated in the schema description, because a validator alone cannot
  express the difference.
- The sum bound on `manual_splits` micro-shares (≤ 200000 in total) is not expressible in
  JSON Schema and is enforced by the platform parser. Said out loud rather than left as a
  surprise.

### 1.0.1 — unreleased (2026-09-07)

- Wording only. `allocation.defaults` and `$defs.categorySlug` name the published menu
  (`category-menu.v1.json`, ops decision D33 item 1) and the illustrative slugs are two of
  the seven categories that exist; one of them used to be a slug the menu no longer
  contains. `categorySlug` stays a PATTERN rather than the closed enum, and now says why:
  this file is untrusted repository content whose unknown values are rejected field by
  field against the menu at parse time, so pinning the enum here would republish the
  manifest contract on every menu change.
- Wording. `allocation.defaults` says why `maxItems` stays 8 while the menu holds seven and
  the sibling record contract caps at 7: untrusted input validated by shape must be refused
  by NAME at parse time, with the offending slug quoted, not by an array bound that fails the
  whole field with a length error. The bound is a decision, and it now reads as one.

### 1.1.0 — unreleased (2026-09-08)

- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

## registry-v0-record.v1.json

### 1.0.0 — unreleased

- Initial publication. One curated YAML record per registered repository, for the
  pull-request-curated registry that exists only through the first public version.
- No `waivers` field, permanently: a waiver can only be granted by a claimed project
  admin, so it can never arrive by pull request.

### 1.1.0 — unreleased (2026-09-07)

This file becomes the ONE record contract. The curated registry repository used to
validate its pull requests against a second schema of its own, addressed in a different
URL family; it now holds a byte-identical vendored copy of this file and its CI fails on
any byte difference. Everything below is that schema's field set folded in — so a record
that passes one validator passes the other by construction, rather than by two authors
remembering the same rule.

- Additive. `example` (`const: true`, a seeded demonstration record that is excluded from
  every published artifact), `state_note` (the public reason CLASS on a `quit`/`delisted`
  tombstone, WEB-075), `weight_class_approval_ref` (the steward-approval reference a
  `major` class needs, FS02-071), `contacts` (`admin_logins` required; the patterns make an
  e-mail address structurally unrepresentable — this is a public data class and a GitHub
  login is the only person-identifying value permitted, D15), `curation` (`source`,
  `recorded_at`, optional `review_ref` — how the record reached the registry, FS-02 §4),
  and `license.version` / `license.published` (the per-version publication date is the
  four-year Apache-2.0 conversion anchor, D9).
- Pre-release rename, on the same footing as the 2026-09-05 `ledger-row` rename:
  `allocation_defaults` becomes **`impact_category_defaults`**, the name the data already
  validates under. FS-02 §7's `allocation_defaults` is the chapter's earlier spelling.
- Its slugs are now a closed enum — the seven categories of the statutes' Art. 7
  (`$defs.categorySlug`, ops decision D33 item 1) — replacing an open `^[a-z][a-z0-9-]{1,31}$`
  pattern that accepted any slug, including one no menu contains. `maxItems` drops from 8 to
  7: a record cannot pick more categories than exist. The enum is a copy of
  `category-menu.v1.json#/$defs/slug` because schemas here carry no external `$ref`;
  `check:menu` asserts every copy is identical.
- Pre-release tightening. `inbound_family` and `contacts` join `required`, and
  `license.required` gains `version` and `published`. A record without an inbound-licence
  family cannot be put through the FS-09 adoption gate, and one without a curation contact
  or a conversion-clock anchor is not reviewable — the registry has always been validated
  this way, and this file said otherwise.
- Pre-release tightening. `node_id` and `canonical_of` narrow to the two GitHub repository
  node_id forms that exist (`R_…` and the legacy base64 of `010:Repository<n>`) instead of
  any opaque token; `name` and `default_branch` gain the patterns that keep a filename
  usable. This is the FS02-095 one-node_id-one-registration key, so a user or organisation
  id must not pass.
- Wording. The artifact path is `registry/{owner}--{name}.yml`, which is what the curated
  registry actually uses: an opaque `R_kgDO…` filename makes a curation pull request
  unreviewable at a glance, while `node_id` stays the key in every artifact and every
  reference. FS-02 §7's `repos/{node_id}.yml` is recorded as the chapter's earlier form.
  The description also states the D15 public-data rule and the two forbidden-key blocks
  (waivers; money, entitlements, shares, manifest, private flags) now travel with the file.

### 1.2.0 — unreleased (2026-09-15; ops decision D42)

- Additive. Optional `owner_node_id` — the repository owner's GitHub node_id in the current
  global-id form (`O_…` organisation, `U_…` user; `$defs.githubOwnerNodeId`). It is the key a
  Portfolio Entitlement is bought against and matched on: index-build publishes it as
  `repo-record.v1` `owner.orgId` and `registry-index.v1` `ownerOrgId`, and cov-v1 compares a
  portfolio term's `scope.org` with it. Until now no record could carry one, so `owner.orgId`
  was never published and a Portfolio term answered `no` at the edge for every repository.
  `owner` stays a display cache and never a key, and its description now names the member that
  is. Optional, so every record that validated still validates; a record without it can be
  covered by a Project or the Pass, and no Portfolio can be bought for its owner.
- The legacy base64 owner forms are deliberately not admitted; GitHub returns the current form
  for any owner when asked with the `X-Github-Next-Global-ID: 1` header. `registry-index.v1`
  `ownerOrgId` carries the same pattern. `repo-record.v1` `owner.orgId` and
  `entitlement-record.v1` `scope.org` keep their broader released patterns (which would also
  admit a login), so producers write only the `O_…`/`U_…` form. A repository node_id does not
  pass (`R_` is neither `O_` nor `U_`), which keeps this key apart from the FS02-095
  registration key.
- The curated registry repository re-vendors this file byte for byte in the same change set,
  and its validator refuses one login under two `owner_node_id` values, one `owner_node_id`
  under two logins, and an owner whose records disagree about having one.

## registry-index.v1.json

### 1.0.0 — unreleased

- Initial publication. One shard document; the same shape serves the bulk export with
  `shard: "export"`, so enumerating the registry needs no second contract.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

### 1.3.0 — unreleased (2026-09-15; ops decision D42)

- Additive. Optional `$defs.entry.ownerOrgId` — the owner node_id the curated record carries as
  `owner_node_id`, the same value `repo-record.v1` publishes as `owner.orgId`. It is on the entry
  because a Portfolio picker, or a scanner resolving which repositories a Portfolio covers, reads
  the index rather than one record per repository. `owner` stays a display-cache login. Absent
  when the registry records none.
- Additive. `$defs.githubOwnerNodeId` (`^[OU]_[A-Za-z0-9_-]{6,118}$`), which `ownerOrgId`
  references. The file's broad `githubNodeId` pattern would also admit a login, and the member
  is new, so the narrower pattern constrains nothing that already validated.

## registry-index-meta.v1.json

### 1.0.0 — unreleased

- Initial publication. Shard list, registry-wide totals, and the delisted set the badge
  route uses to override a stale cached badge.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.1.1 — unreleased (2026-09-08)

- Wording only, and a patch under versioning policy §3 — nothing this file validates
  changes. `delisted` said it held node ids "in state `delisted` or `quit`"; it now says
  every listed repository whose state is `suspended`, `quit` or `delisted`. All three
  states render the neutral badge (WEB-085), and the badge route's guard reads this set to
  override a stale cached artifact (FS10-032) — so under the narrower reading a suspended
  repository kept a cached badge asserting registration, which is the exact failure the
  guard exists to prevent. The member keeps its name: it is the state a reader recognises,
  and renaming a published member is not what a wording fix may do.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

## repo-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The per-repository record, including the fixed Apache-2.0
  conversion date, manifest status with published rejection records, the waiver pointer
  and badge data.
- The `stats` block is optional and absent in the first version: no attribution or charity
  figure exists before the first disbursed ledger row.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.2.0 — unreleased (2026-09-08)

`pre-release` under versioning policy §5, three times over — a member name moves,
`maxItems` falls from 8 to 7, and an open pattern closes to an enum; not one of those is
additive. Nothing has ever been published under this file, and the two members below are
exactly what both builders already emit, so the change removes a divergence rather than
creating one.

- Additive. `stateNote` (≤200): the public reason CLASS for a `suspended`, `quit` or
  `delisted` state — the neutral published category a tombstone page prints (WEB-075).
  A class, never a narrative: no account of events, no allegation, no person's name and no
  third party's, because a registry tombstone is read for years. Absent when the state has
  no published reason, which is not the same as a reason nobody may see. Both planes emit
  the member today and no schema admitted it.
- `allocationDefaults` is RENAMED `impactCategoryDefaults`, and its items become a closed
  copy of the seven-slug menu (`$defs.categorySlug`, byte-identical to
  `category-menu.v1.json#/$defs/slug` and held so by `check:menu`) with `maxItems: 7`.
  Three defects in one member: the name was the only one in this contract set for the
  thing — `registry-v0-record.v1` 1.1.0 validates `impact_category_defaults` and the
  curated registry records carry it, so a builder had to translate a name for no reason;
  the items were `^[a-z][a-z0-9-]{1,31}$`, an open pattern admitting a slug no allocation
  surface can render, where the menu is a CLOSED set of seven (D33 item 1); and `maxItems`
  was 8, one more than the menu has, so the bound asserted nothing. The enum sits under a
  `$defs` name mentioning "category" deliberately: `check:menu` discovers copies by that
  rule (`scripts/check-menu.mjs` §3), so an enum inlined at the property would have been
  invisible to the gate and free to drift from the published menu. *(Superseded, kept as
  history: `allocationDefaults`, an eight-item array over an open slug pattern.)*

### 1.3.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

### 1.3.1 — unreleased (2026-09-15; ops decision D42)

- Wording. `owner.orgId` is described as the owner node_id of either account type (`O_…` or
  `U_…`), taken from the curated record's new `owner_node_id`, and says what its absence means:
  no Portfolio term matches the repository. No constraint moved.

## waiver.v1.json

### 1.0.0 — unreleased

- Initial publication. Envelope plus waiver entries; `coolingEndsAt` is documented as a
  vesting input that the coverage answer ignores.
- FS-10 §4.2 shows the waiver registry as a bare array. Published here as the standard
  artifact envelope with a `waivers[]` member, because FS-00 §6.2 requires every artifact
  to carry `schemaVersion` and `generatedAt` and a bare array cannot.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

## entitlement-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The decoded JWS payload: company wrapper, and the frozen
  entitlement object closed to additions inside `entitlements[]`.
- Vesting semantics recorded in the field descriptions: vested iff a version's publication
  date is on or before a window's term end, with `from` as provenance only.
- The company wrapper is **ratified** (2026-09-07; FS-00 §6.2 amendment note — see *Settled*
  above). Nothing in the file changed but its reconciliation note and the `x-psn.fsRefs`
  citation of the ratifying note: no property was added, removed or moved. 1.0.0 is amended
  in place because it is **unreleased** — nothing has been published against it; on a released
  version, policy 3 above makes a description fix a patch bump. There is one shape here, and
  there always was.

### 1.1.0 — unreleased (2026-09-08)

- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.1.1 — unreleased (2026-09-15; ops decision D42)

- Wording. `$defs.entitlement.lane` no longer says only `project` is purchasable: since D42 the
  buyer chooses Project, Portfolio or the Pass at checkout, and enabling a lane on the production
  rail still waits on the provider's written pre-clearance (COM-018, D18).
- Wording, correcting a latent ambiguity. `$defs.scope` described a Project's `repos[]` as "min 1,
  cap 50 declared repositories, COM-018". That conflated the PAID COVERAGE with the usage
  declaration — a tool writing the declaration into the scope would grant coverage for up to
  fifty repositories at a one-repository price, and cov-v1 would answer accordingly — and COM-018
  is the separate payment-account requirement, not a bound. The description now says the scope is
  coverage, that a Project bought under D42 names exactly one repository, and that a Pass buyer's
  named repositories never appear here; it cites D16, COM-020, ENG-029 and D42. The array bounds
  are unchanged, so every record that validated still validates.
- The same correction where it is not a schema. `coverage/vectors.json` VEC-02 and VEC-25 repeated
  the conflation ("matches a declared repository node_id", "the declaration is the scope"), and
  VEC-02 still called Project the only purchasable lane: both descriptions and both `fsRef`
  citations (`COM-018` → `D42`) are corrected, and no input, id or answer moved. `coverage/cov-v1.ts`
  carries the same stale wording in the doc comment of `Scope.repos` ("Declared repository
  node_ids … min 1, cap 50 — COM-018"). It is NOT edited: the module is mirrored byte for byte
  into the edge worker and its digest is published, so a comment edit would change both. The
  comment is superseded by this entry and kept as history until a `cov-v2` exists.
- `examples/entitlement-record.v1.example.json`: the first term's Project scope names one
  repository (`R_kgDOAbc123`), so the example shows the shape a D42 Project writes.

### 1.1.2 — unreleased (2026-09-15; ops decision D44)

- Wording. `name` said that directory naming "defaults to unnamed" and that a browsable supporter
  directory lists opted-in payers. It now says what D44 item 5 decided: the member is present
  only when the payer asked to be listed (att-3 step 7, or a later recorded request); the
  covered-organisations list (`covered-organisations.v1`) names only such payers and shows every
  other payer as "Unlisted organisation"; and an unlisted payer's record still verifies at its own
  URL (VS-33). The member stays optional.
- Wording. `domains` adds that a verified domain resolves to its record whether or not the
  organisation is named (TRN-033; D44 item 5(f)). The domain index stays as it is: it is how
  coverage by domain is answered.
- No member, type, vector or answer changes.

## covered-organisations.v1.json

### 1.0.0 — unreleased (2026-09-15; ops decision D44)

- Initial publication. `/entitlements/covered-organisations.json`, beside the entitlement records
  and the domain index it is built from, rendered on the website at `/registry/organisations`:
  ONE LINE PER ORGANISATION that has a signed entitlement record with at least one term, ordered
  by `coId`, carrying the legal name the payer asked to be listed under or the fixed words
  `Unlisted organisation`, and every term with its `entId`, lane, scope, published status, dates
  and the certificate that attests it. It resolves URS OPEN-34 toward a complete list with names
  optional; the list publishes on the apex only after the counsel and comms sign-off OPEN-34
  names.
- NOTHING ELSE FITS ON A LINE. There is no member for an amount, a revenue band, a domain, a
  contact or a declaration, and every object is closed, so an unlisted line cannot leak one by
  accident. `listed` is never a default (WEB-130): `false` pins `name` to `Unlisted organisation`,
  and `true` forbids those words, so the two states cannot be confused in either direction.
- UNLISTED IS NOT ANONYMOUS, and the description says so: the ledger rows keyed by the same
  company id publish their amounts, an amount against the public schedule shows the band, and a
  verified domain resolves to the same id through the domain index (TRN-033: coverage is
  answerable regardless of naming).
- COMPLETENESS, CHECKABLE BY ANYONE. `completeness` publishes the counts a reader recomputes from
  other published artifacts, and the builder refuses a list whose counts disagree: the lines plus
  the entitlement records that carry no term equal the entitlement records; the lines holding a
  Project, Portfolio or Pass term are exactly the company ids on published `pool-in` rows; and
  every `pool-in` row's term is on the list, and every such term has its row. A refunded term
  keeps its line with status `void`, a charged-back term keeps it with `suspended`, and a
  donate-direct term has no `pool-in` row, which is why the second identity counts fee-lane lines
  only. `companiesCovered` is copied from `stats.json` beside `companiesCoveredRule`, because the
  real plane and the sample plane derive that counter differently, and only on the real plane
  does it equal the records.
- `certId` is the payment certificate attesting the term that is not superseded, or null. It is
  found through the `entId` a certificate record carries from `certificate-record.v1` 1.3.0.
- The example is the sample plane's list: six lines (two unlisted, one term suspended, one
  donate-direct term), eight entitlement records, two of them without a term, and five payer ids
  on `pool-in` rows.

## certificate.v1.json

### 1.0.0 — unreleased

- Initial publication. The certificate JWS payload profile, with the type/variant table
  enforced structurally.
- Funding truth enforced by the schema: an amount cannot appear without its currency and
  its kind, and a status certificate cannot carry an amount at all.
- Materiality enforced by the schema: the below-floor flag and a monetary figure are
  mutually exclusive.

### 1.1.0 — unreleased (2026-09-08)

- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.2.0 — unreleased (2026-09-10), **pre-release** change under versioning policy 5

- `claimKitVersion` and `claims.kitVersion` tighten from `^kit-[0-9]+\.[0-9]+$` to
  `^kit-[0-9]+$`. **This contract is the stale side of a disagreement about one string, and it
  is the side that moves.** The kit naming grammar is already decided — the P-M2 checkout plan
  of 2026-09-07, item 9: "the kit's identifier is `kit-1` (the `{family}-{n}` grammar shared
  with `att-1` and `ent-terms-1`) … FS-08's `kit-1.0` example is the older form". Every
  surface that publishes the string already carries `kit-1`: `claim-kit.v1.json` pins
  `^kit-[0-9]+$` on the document's own `kitVersion` and says it "is never reused and never
  renamed"; `kits/kit-1.json` and its vendored copy declare `kit-1`; and on the site the kit
  page, its raw artifact, the checkout attestation the buyer ticks and the entitlement terms
  all name `kit-1`. Only this file still demanded a dotted form, and because it is the file
  the signer validates a payload against **before** signing, no certificate could carry the
  version the buyer acknowledges: the signer refused every payload the site's own documents
  describe. Found by a dry run that had to substitute `kit-1.0` to get past it.
- Tightening rather than widening, deliberately: admitting both forms would publish two
  grammars for one identifier and leave a consumer to decide whether `kit-1` and `kit-1.0`
  are the same kit. There is one grammar.
- Permitted in place by policy 5 because **no certificate has ever been issued**, so this
  contract has no published artifact and no consumer to protect. `claims.kitVersion` moves in
  the same step as `claimKitVersion`: the embedded claim block's version and the payload's pin
  are the same string, and a file that tightened one and not the other would still refuse a
  payload built from its own example.
- `examples/certificate.v1.example.json` moves with it (`kit-1.0` → `kit-1`, both fields).
  FS-08 §8's two `kit-1.0` examples are the FS owner's one-line dated note, recorded
  separately; this entry does not touch the record.

### 1.3.0 — unreleased (2026-09-15; ops decision D44)

- Additive. The sponsor certificate, as the variant `sponsor` under the `supporter` type (D44
  item 6(d)): `variant` gains `sponsor` (after `donation`), `scope.kind` gains `none`,
  `amountKind` gains `sponsorship-paid`, and the supporter row of the type/variant table gains
  `sponsor`. Two new rules: a `sponsor` certificate has `typ: supporter`, `scope: {"kind":
  "none"}` with no `repos` or `org`, and no `band`, and an amount, where one is stated, is
  labelled `sponsorship-paid`; and scope kind `none` or the `sponsorship-paid` label implies the
  `sponsor` variant. The certificate attests a settled sponsorship — its tier, period and
  published use order — and covers nothing.
- A variant and not a type, because the type enum is frozen (FS08-010). `topup` is not reused:
  a top-up was a multiplier on a Purpose Fee that enters the fees account (COM-064), and
  sponsorship never enters that account (statutes Art. 6a(1), 6b).
- Not issuable yet: the sponsor certificate waits for the tax adviser's answer (LEG-094), and
  its claim wording comes in a later kit version, because kit-2 carries no sponsor variant.
- Wording (ops decision D44 item 7). `typ`, `variant` and the `topup` rule now say that `topup`
  is reserved: the voluntary multipliers were withdrawn before any sale, so no top-up
  certificate is ever issued. No enum value is removed.
- Every payload valid under 1.2.0 still validates and means the same: the new rules constrain
  only the new values. The existing example validates unchanged. The new
  `examples/certificate.v1.sponsorship.example.json` validates, and so does the same payload
  with a stated `sponsorship-paid` amount; the schema refuses a sponsor certificate with a band,
  with coverage, or with a `fee-paid` or `donation` amount, the variant under `license-status`,
  and scope `none` on an entitlement certificate.
- `check:examples` now validates further examples of one schema, named
  `{schema key}.{state}.example.json` beside the main one, and refuses an example file that
  belongs to no schema.

## certificate-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The public verify record. Field names and shapes are
  byte-authoritative — passthrough consumers render them verbatim.
- `ct: null` is modelled explicitly, because signed-but-unlogged must be representable:
  that state is what a rogue issuance looks like, and a verifier has to be able to see it.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

### 1.3.0 — unreleased (2026-09-15; ops decision D44) — pre-release

- **A pre-release change under versioning policy 5, not an additive one.** What moved: `jws`
  leaves the unconditional `required` list and is required on every record except a status-only
  one; `disclosure` (`full` | `status-only`), `entId` and `jwsSha256` are added; a record with
  `disclosure: "status-only"` must carry `jwsSha256` and may not carry `sub`, `band` or `jws`;
  `variant` gains `sponsor`; `scope.kind` gains `none`; and a `sponsor` record is never
  status-only.
- Why. The public record republished the subject's display name and the full signed token for
  every certificate, including the certificate of a corporate payer that never asked to be
  named, which FS08-061 and CERT-060 make private by default (D44 item 5(e)). A status-only
  record publishes the status and proves itself by the SHA-256 the transparency log already
  carries, so a holder that shows its own signed certificate can prove this record is its
  record. An absent `disclosure` reads as `full`; a consumer switches on the member and never
  infers it from a missing field.
- Why policy 5 and not a new file. A reader that expects `jws` on every record breaks, which
  rule 1 does not allow inside v1. Rule 5 allows it before first publication, and every
  condition holds: no certificate record has been published on the apex and none exists outside
  the sample plane, whose records are fixtures; every record valid under 1.2.0 still validates
  and means the same; and the record already knew an absent `sub`, the tombstone after an
  erasure request (CERT-045).
- `entId` is the Entitlement term a payment certificate attests (the payload's
  `factRefs.entId`). It is already public on the ledger rows and in the signed entitlement
  record; carrying it here lets the covered-organisations list (`covered-organisations.v1`) name
  each term's certificate without decoding a token.
- The `sponsor` values mirror `certificate.v1.json` 1.3.0. A sponsor's record is never
  status-only, because undisclosed support is prohibited (statutes Art. 6b(3)).
- Wording (ops decision D44 item 7). `typ` gains a description: `topup` is reserved — the
  voluntary multipliers were withdrawn before any sale — so no top-up certificate is ever
  issued. No enum value is removed.
- The readers that assumed `jws` or `sub` on every record move in the same wave: the website's
  verify island and verify page, the edge verify route's record type, and the platform's plane
  reader and trust renderer.
- New example `examples/certificate-record.v1.status-only.example.json`; its `jwsSha256` is a
  placeholder. The existing example validates unchanged.

## certificate-policy.v1.json

### 1.0.0 — unreleased

- Initial publication. The one published enumeration of every certificate class, its
  variants, and the exact claims each permits and prohibits — the artifact form of the
  published-policy obligation (COM-084, FS08-011).
- `classes[]` is the **issuable** set at the phase named in `phase`, and a class that
  cannot be issued is in `notIssuable[]` instead. There is deliberately no "unavailable"
  flag inside `classes[]`: a reader who reads only that array must not be misled about what
  can be issued.
- The frozen `typ` tokens are carried as tokens, with the human name beside them in `name`.
  The prose name of a class and its machine token differ on purpose — the token is frozen
  by the architecture chapter and is never renamed to match a page.
- `notIssuable[].typ` is nullable, and the null case is the load-bearing one: a class with
  no token in the frozen enum cannot be issued by construction, which is a stronger
  guarantee than a policy sentence about it.
- `claimKitVersion` is nullable because no kit document is published yet. Null is a fact,
  not a gap: a payload cannot pin a version that does not exist.

### 1.1.0 — unreleased (2026-09-15; ops decision D44)

- Additive. `$defs.certClass.kitVariant` gains `sponsor`; `$defs.variant.variant` gains
  `sponsor`, the sponsor certificate under the supporter class (`supporter.sponsor`, mirroring
  `certificate.v1.json` 1.3.0); and a variant may carry its own optional `kitVariant` where a kit
  variant other than its class's governs its claims — absent means the class's. A policy lists
  `supporter.sponsor` as not issuable until the tax adviser has answered (LEG-094), and the kit
  variant it names is carried by the later kit that publishes the sponsor certificate's words,
  not by kit-2.
- Wording (ops decision D44 item 7). `$defs.typ` says that `topup` is reserved and never issued:
  the voluntary multipliers were withdrawn before any sale. No enum value is removed.
- The existing example validates unchanged.
- Example wording (2026-09-16; ops decision D44 item 7). The example's `topup` entry still said
  the top-up lane was a later phase; it now says the type is reserved and never issued because
  the multipliers were withdrawn before any sale, as the policy the website publishes says. No
  schema change.

## claim-kit.v1.json

### 1.0.0 — unreleased (2026-09-08)

- Initial publication. The claim-language kit: the exact wording an organisation may use to
  describe a certificate publicly, the framing that is contractually excluded, and the
  binding statement printed on the certificate face (CERT-050…053, FS08-070). The document
  itself is `kits/kit-1.json`, published at `/kits/v1`; this is the contract `check:kits`
  validates it against.
- THE PERMITTED WORDING IS A PATTERN with braced placeholders, never a filled-in claim, and
  the filled-in form is refused the only way a document-wide rule can be: no currency figure
  may appear anywhere in a kit (`check:kits`). A figure here would be a number about one
  organisation's purchase, sitting in a document the renderer embeds into every certificate.
- The exclusive-verification sentence is pinned by a `pattern` on every permitted pattern
  (CERT-027), and `check:kits` asserts the same sentence against `spec.config.json` — so the
  literal in the schema and the configured host cannot drift apart.
- The three prohibitions FS-08 §8 names are REQUIRED MEMBERS of every variant's list, as
  three `contains` clauses. The prohibition list is the half of a kit a later edit is most
  likely to shorten, and those three are the framings that were examined and rejected.
- Exactly two variants, and the set is closed: `supporter` for the payment class and
  `statusOnly` for the licence-status class — the same two classes
  `certificate-policy.v1.json` distinguishes with its `classes[].kitVariant` tokens
  `supporter` and `status-only`. The keys here are camelCase, like every other key in this
  contract, so a consumer joining the two files maps the policy's `status-only` onto
  `statusOnly` rather than indexing the object with the token. `statusOnly` permits
  coverage-status wording exclusively: an organisation covered by a waiver funded nothing, so
  supporter or impact phrasing on its certificate would be false rather than merely vague
  (CERT-052, MKT-034). *(Corrected the same cycle: as first written, this entry and the
  schema's own `variants` description called the two keys the same tokens the policy uses,
  which is true of `supporter` and false of `statusOnly` — and it read as integration guidance
  in a public repository. The keys did not change; the sentence now states the mapping.)*
- NO DONATION-LANE VARIANT, and the description says so rather than leaving the absence to be
  read as an oversight: the donate-direct lane is not operable at this phase, so a kit for it
  would govern claims nobody can make. Adding one later is additive.
- `appliesTo` names the classes a variant governs, and what a variant does NOT cover is stated
  in its own `permittedNotes` rather than left to a reader to notice. Which classes can be
  issued at all is the certificate policy's answer and not this schema's: a class that policy
  records as issuable which no kit variant covers is a gap for the next kit version to close,
  never a licence to invent wording. `license-status.under-threshold` is that case today — its
  recording surface does not exist, so no such certificate has been issued, and the pattern it
  would need is a question for the plan's owner (PS-272). *(Corrected the same cycle: the
  description first justified every absence as a class "the certificate policy records as not
  issuable", which the policy example refutes for exactly that variant.)*
- `binding` is a `const`, not a length rule. FS-08 §8's sentence is what makes the kit
  contractual, and a paraphrase on one certificate with the original on another would leave
  two different bindings in the field.
- `optionalClauses` is required and may be empty. An empty array states that a variant permits
  nothing beyond its pattern, where an absent key would leave a reader deciding whether
  silence meant permission.
- `publishedAt` is required and nullable: null until the document is first published at its
  permalink on the apex, after which the text is immutable and a change is a new kit at a new
  URL (D32, FS01-121). `translations` is empty for a related reason — a rendering nobody has
  approved would be a builder's own translation of a legal constraint, so German and French
  ship at P-M3, each marked as an approved rendering, with English controlling (CERT-056).
- No `generatedAt`. The document is authored rather than generated and holds no counters, no
  subject data and no batch timestamp, so there is nothing for one to date. Recorded here as a
  decision for the same reason `badge.v1.json`'s absence is (open question 3).
- The example IS a published kit, byte for byte, and `check:kits` refuses one that has drifted
  from every document in `kits/`. Kit wording is claim language; a drifted example is the file
  somebody copies into a press release. Same precedent as `category-menu.v1.example.json`.

## claim-kit.v2.json

### 1.0.0 — unreleased (2026-09-15; ops decision D44)

- Initial publication. The second shape of the claim-language kit, as a NEW FILE beside
  `claim-kit.v1.json` under versioning policy 2: v1 requires every variant's `prohibited` list
  to contain "we give back", allows exactly one `permittedPattern` per variant, closes the
  variant set and has no member for templates, a badge or rules with their reasons, while D44
  permits a give-something-back line tied to the pledge, several lines, share templates, named
  rules and a coverage badge. `claim-kit.v1.json` and `kits/kit-1.json` are unchanged, and kit-1
  stays a v1 document: this schema refuses `kitVersion: "kit-1"`.
- THE MONEY LINE IS THE PLEDGE OR NOTHING. `pledge.text` is the only place a v2 kit says where a
  Purpose Fee goes, and a line reaches it only through the `{pledge}` placeholder. `check:kits`
  asserts that the text appears exactly once in the file; its byte-equality with the canonical
  pledge of statutes Art. 5(5) is held by the publishing repository's tests, because JSON Schema
  cannot hold it and this repository does not carry the pledge.
- EVERY CLAIM ENDS WITH THE ONE VERIFICATION SENTENCE (CERT-027): every line whose `use` is
  `base`, `line` or `gated`, and every template (`$defs.claimText`). A `clause` is words added
  inside a line and carries none. `check:kits` asserts the same sentence against
  `spec.config.json`, as it does for v1.
- THE SUPPORTER RULES ARE NAMED BY ID, and the ten ids D44 fixes are required as `contains`
  clauses, so a later edit cannot quietly drop one. The FS-08 §8 reviewer phrases "we support
  charity" and "any unquantified social-impact framing" stay required members of the supporter's
  `prohibited` list; "we give back" leaves that list, which is the point of D44, and stays
  required on `statusOnly`, whose lines may carry no `{amount}`, `{band}`, `{pledge}`, `{tier}` or
  `{figure}`, no "give something back" and no "Purpose Fee", and which has no templates.
- A BADGE IS A COVERAGE BADGE. Its text is pinned to `Purpose Source · {lane} Entitlement ·
  {status}` on the supporter variant and `Purpose Source · waiver · {status}` on the status-only
  one, and the supporter badge requires the EU consumer notice.
- A GATED LINE IS CLOSED IN THE DOCUMENT. Its gate names the fact the holder checks on the public
  record (`figure-issued-after-disbursed-row`) and its `state` is the `const` `closed`: a
  published kit never opens a gate by editing itself.
- `supporter` and `statusOnly` are required; `sponsor` is OPTIONAL. kit-2 carries no sponsor
  variant, because the sponsor certificate's wording waits for the tax adviser's answer
  (LEG-094). The schema already fixes what a sponsor variant may never carry — `{pledge}`,
  `{lane}`, `{band}`, `{categories}`, `{figure}`, "give something back", "Purpose Fee:", a
  template or a badge — so the later kit that publishes those words needs no schema change.
  *(Corrected before publication, the same day: the design draft of this file's description
  still said that exactly three variants exist; it now says two are required and the third is
  optional.)*
- `appliesTo` keeps v1's type grammar, `topup` and `x2|x5|x10` included, and adds the `sponsor`
  variant token. The grammar names tokens and grants nothing: the `topup` type is reserved and
  never issued since D44 item 7 withdrew the multipliers before any sale
  (`certificate.v1.json` 1.3.0).
- No figure of any kind appears in a kit, no `generatedAt`, and `publishedAt` is null until first
  publication at the permalink on the apex, immutable from then on (D32) — the v1 rules, kept.
- The first document is `kits/kit-2.json`, published at `/kits/v2`: SHA-256
  `c60a723677d5c5508192a79ec2cd4a5bd815ef61b7a201f43e0d5f65eb4925cb` over its raw bytes (11,622
  bytes, LF). `examples/claim-kit.v2.example.json` IS that document, byte for byte.
- `check:kits` now validates each kit against the shape its `schemaVersion` names (1 is
  `claim-kit.v1`, 2 is `claim-kit.v2`, anything else is refused), runs the ending rule over v1
  patterns and over v2 lines and templates, adds the pledge-once rule and the `verify` member for
  v2, and pairs each example with its own kit byte for byte. Each new rule has a self-test case
  that must fail.

## ct-segment.v1.json

### 1.0.0 — unreleased

- Initial publication. Append-only log segments, hash-chained. Entries carry no personal
  data, which is what lets the log be immutable forever.
- `ref` is required and nullable rather than optional: in an audit, a missing key and an
  explicit null must not be distinguishable.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.

### 1.2.0 — unreleased (2026-09-08)

- Additive. `$defs.entry.typ` gains `entitlement-record` and `ct-checkpoint`, and its
  description becomes "JWS family" instead of "certificate type". The log records three
  signed families, not one: FS08-113 and VS-27 have the v0 operator script CT-append the
  entitlement record published at its own URL and the log's own checkpoint alongside the
  certificates, so a conforming producer had no value to write for two of the three things
  it appends — the emitted `ct/0.json` of both planes carries `typ: "entitlement-record"`
  today and no schema admitted it. Pure widening: the five frozen certificate types of
  FS-00 §6.4 keep their meaning and remain the first five values. What does NOT change is
  the entry's content rule — hash, family, kind, reference and timestamp and nothing else,
  which is what keeps the log immutable through an erasure request (CERT-031, CERT-045):
  a family is not personal data.

### 1.2.1 — unreleased (2026-09-10)

- Wording, and the value it fixes was already required. `$defs.entry.h` has said since its
  first publication that a `revoke`/`status` entry's hash is "SHA-256 of the
  revocation/status entry payload", while `ref` is "the ORIGINAL entry's hash" — two
  members, two documents. What the file never wrote down is what that payload IS, and a
  producer reading the silence as "reuse the revoked token's hash" emits `h === ref`,
  which logs one object twice and fails the log's own distinct-hash rule. So the
  description now spells it: the payload is the entry's own members other than `seq` and
  `h`, in RFC 8785 (JCS) canonical JSON —
  `{"kind":"revoke","ref":"<the original entry's h>","ts":"<RFC 3339>","typ":"<family>"}`
  — and `h` is the lowercase-hex SHA-256 of its UTF-8 bytes.
- `seq` is excluded deliberately: the log assigns it at append time, so hashing it would
  make an entry's identity depend on where it landed, and would make every revocation
  trivially distinct — emptying the one rule that catches the same revocation logged
  twice. Two revocations of one token at different instants still differ, in `ts`.
- Not a new signed family. A signed revocation object is P-M3 work; at v0 the entry's own
  canonical bytes are what exists, and minting a second signing path on the one artifact
  that can never be corrected is not a description change. Additive by construction:
  nothing already valid becomes invalid, because no published log holds a revocation.
- `ct-segment.v1.example.json`'s revocation entry now carries the hash this rule computes,
  so the example demonstrates the sentence instead of contradicting it.

### 1.3.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

## ct-checkpoint.v1.json

### 1.0.0 — unreleased

- Initial publication. The signed head commitment that makes retroactive tampering
  provable.

## ledger-row.v1.json

### 1.0.0 — unreleased

- Initial publication. The full row type enumeration, the captured foreign-exchange
  fields, the hold status, and the global hash-chain fields.
- Zero-amount rows (annotation, month note, month lock) are constrained to zero by the
  schema, so a correction can never be smuggled in as a narrative row.
- 2026-09-05 — pre-release rename, together with `ledger-export.v1.json` (ops decision
  D31 item 6, `COST-SUPPORT-MODEL-2026-09-05.md` §14): row type `levy` becomes
  `charged-to-fees`; the row-level `levyBps` is dropped, because no percentage levy
  exists; `holdStatus` `held-M+1` becomes `open-M+1`, described as the allocation-window
  state of intake data — the money itself is swept within 30 days of the rail payout.

### 1.1.0 — unreleased (2026-09-06; ops decisions D33 and D34)

- Additive. Two row types join the enum: `reserve-retention` (the operations reserve's
  retention, at most a published share of the month's fees until the reserve holds its
  target — D34 item 4) and `hardship-pay` (the steward hardship pay to the one essential
  operating role, only under the published rule, two caps of which the lower governs — D34
  item 3). Each is its own row even at zero, with its rule in `note`; the schema constrains
  both to non-positive amounts and requires the note.
- Additive. `recipientId` (`^rcp_[0-9abcdefghjkmnpqrstvwxyz]{26}$`): the listed recipient
  a `disburse` row transferred to. What is passed on goes directly, from the fees account,
  to the organisations on the published Recipient List — no intermediary, no pooled fund,
  no earmark (D33 items 1 and 4). `categoryFundId` is described as the basket of listed
  recipients in that category.
- Wording. `holdStatus` keeps both tokens — a published value is never renamed under the
  additive-only policy — and its description now states the rule the pending token names:
  lock before sweep (D33 item 4), the allocation computed at the lock no later than twenty
  days after the month's last rail payout, each recipient's share transferred on or before
  the thirtieth day. The intermediary and the earmark instruction leave every description;
  the file description names the four outgoing lines (D34 item 5).

### 1.2.0 — unreleased (2026-09-07; ops decisions D27, D29 §2 and D34 — the money contracts settled)

- `routingMode` takes the canonical enum of the record: `project_default | shadow |
  contributor_active` (URS MIL-014(e), GOV-038, ENG-032; FS-07 FS07-027 and FS-04 use exactly
  these three names, per ops decision D27 as amended at the fifth collision). It carried
  `shadow | live`, a pair no builder could satisfy against the record — and since the URS wins
  on WHAT, the URS enum governs what a published value means. `live` had no counterpart in any
  chapter: the three-tier hierarchy has a mode in which the contributor tier is not computed at
  all (`project_default`) and a mode in which it routes money (`contributor_active`), and a
  two-value field could express neither. *(Superseded, kept as history: `shadow | live`.)*
- `sponsor-ops-in` is REMOVED from the row-type enum. Sponsorship is not a ledger revenue
  class: a sponsor is a supporter (URS GOV-008 as noted by ops decision D29) which settles a
  listed direct invoice IN PLACE OF the fees account, by name and amount, published for the
  period — support never enters the fees account (D29 §2, invariant I4), an account that
  receives every Purpose Fee payout and nothing else and carries exactly the four outgoing lines
  of D34 item 5. Cost support is published in `cost-support.v1`, never as a ledger row.
  *(Superseded, kept as history: the row type `sponsor-ops-in`.)*
- Both are recorded as PRE-RELEASE changes. The additive-only policy governs a PUBLISHED
  version, and nothing in this repository has been released: no producer ever emitted
  `sponsor-ops-in` (the P-M2 intake subset never contained it and no allocation row exists
  before P-M3) and no artifact was ever published carrying `routingMode: "live"`. Had either
  value been published, the policy's answer would have been a new file beside this one rather
  than an edit — that is the rule, and this is the window in which it does not bite.
- Wording. `categoryFundId` now NAMES the file that enumerates the seven-category menu
  (`recipient-list.v1`, `$defs.categorySlug`). It said only "one of the seven published
  categories", which leaves an integrator asking which seven with nowhere to look; since no
  schema here may `$ref` another, a named pointer is the only form the self-containment rule
  allows. Nothing the schema validates changes.

### 1.2.1 — unreleased (2026-09-07, later)

- Wording only, `pre-release`. The category menu is now PUBLISHED in its own contract
  (`category-menu.v1.json`, added the same day), so this file's pointer names that
  publication instead of `recipient-list.v1`, which had declared itself the one
  enumerating file while no such contract existed. Nothing about the vocabulary changed —
  the same seven categories of the statutes' Art. 7 — and no constraint moved. `check:menu`
  now holds every copy of the enum identical to the published one, which is what a
  cross-file `$ref` would have done had self-containment allowed one.

### 1.3.0 — unreleased (2026-09-08)

- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.4.0 — unreleased (2026-09-08)

Every change in this section is `pre-release` under versioning policy §5: nothing has ever
been published under this file. No committed ledger month holds a row (FS07-100 — the v0
table is empty), so nothing already emitted becomes invalid, and from the first published
row the new-file rule binds absolutely.

- `fxRate` becomes a DECIMAL STRING — `{"type": "string", "pattern":
  "^[0-9]+\\.[0-9]{1,8}$"}` — where it was `{"type": "number", "exclusiveMinimum": 0}`
  (Q 774fe1d3, supervisor ruling of 2026-09-07). FS-07 §5 stores the rate as
  `numeric(18,8)`, and this member sits INSIDE the body `rowHash` is taken over (FS07-040,
  RFC 8785): a binary float has no single canonical spelling across languages, so two
  conforming implementations could hash the same row to different values, which is the one
  thing a hash chain may not permit. The pattern is the serialisation rule made mechanical
  — unsigned integer part, point, one to eight fractional digits, trailing zeros as
  recorded. `dependentRequired` is unchanged (`fxRate` still requires `fxSource` and
  `fxDate`), and the example moves to `"fxRate": "0.9"`. *(Superseded, kept as history: a
  JSON number.)*
- The retype does NOT carry `exclusiveMinimum: 0` across, and the pattern admits `"0.0"`
  where the old type refused `0`. Recorded as a decision rather than left to read as an
  oversight: the form Q 774fe1d3 fixed is `^[0-9]+\.[0-9]{1,8}$` verbatim, and narrowing a
  ruled-on pattern is not this change's to do. A captured rate of zero is not a meaningful
  rate, so closing the hole is worth doing — the file is pre-release, so policy §5 still
  permits it — but it needs an instrument that says so, and it is filed rather than taken
  here. Nothing enforced moves meanwhile: the v0 guard has applied this exact pattern since
  2026-09-07, so the zero string has been accepted on the producing side all along.
- Additive. `externalKey` (≤120): the upstream event's own key, which is what makes a row
  idempotent under at-least-once delivery — money-moving handlers are keyed by the rail's
  event id against a processed-events store and a duplicate delivery is a no-op rather than
  a second row (ENG-065, ENG-066). Unique across the ledger. Not personal data: an opaque
  provider reference, never a name, an address or a payment instrument (ENG-083).
- Additive. `lane` (`pass | project | portfolio | donation`) — the same closed set
  `ledger-export.v1`'s export row already published and this file did not carry, so the
  export named a member of the row that the row's own contract did not admit. The COM-009
  enumeration order is the order `cov-v1` evaluates; at P-M2 only `project` is purchasable
  (VS-14).
- Additive. `holdStatus` gains `not-applicable`, a third state for the zero-amount
  narrative rows (`annotation`, `month-note`, `month-lock`). Those rows carry no allocable
  money, so `open-M+1` and `released` both assert something untrue about them, and leaving
  the member off made a row outside the allocation window indistinguishable from one whose
  state nobody recorded. Widening: neither published token changes meaning.

### 1.5.0 — unreleased (2026-09-15; ops decision D42)

- Additive. Optional `scope` — the paid coverage of the term the row's money arrived for, in the
  shape `entitlement-record.v1` publishes (`$defs.scope`, copied because schemas here carry no
  cross-file `$ref`). Under D42 the published allocation rule attributes each payer's passed-on
  share by lane and scope — a Project to its repository, a Portfolio equally across its owner's
  active repositories, the Pass by the equal split with 1% per named repository — and a Portfolio
  or Pass row has no single `repoNodeId`, so without this member the rule could not be
  re-derived from the public ledger. It is never the usage declaration: the repositories a Pass
  buyer names are private and no published member carries them. Optional: rows written before
  the member existed carry `repoNodeId` alone, allocation rows carry none, and every row that
  validated still validates.
- Wording. `lane` no longer says only `project` is purchasable (D42).

### 1.5.1 — unreleased (2026-09-15; ops decisions D43 and D44)

- Wording (D43 items 1 and 4). `holdStatus` states one clock per payout: a month's allocation is
  locked no later than the twentieth day after the credit of the month's earliest rail payout,
  and each listed recipient's share is transferred no later than the thirtieth day after that
  credit, because every payout has its own deadlines. `recipientId` calls the Recipient List a
  versioned board list outside the statutes, no longer an annex to them. Descriptions follow ops
  decisions D43 items 1 and 4 (annexes out of the statutes; one clock per payout); no member,
  type, vector or answer changes.
- Wording (D44 item 5(a); the operator's default adopted 2026-09-15, which the operator may
  overturn). `payerName` is the literal `unnamed` on every row written from 2026-09-15: a payer
  that asked to be listed is named on the covered-organisations list (`covered-organisations.v1`),
  and the transparency pages show that name beside its rows by joining the list on `coId` at
  build time. No name enters the hash chain, and a change of choice, or an erasure request,
  reaches every page. A row written earlier may carry an opted-in name and keeps it; the member's
  type and bounds are unchanged.
- Wording (D44 item 7). `type` says that `topup-multiplier-in` is reserved: the voluntary
  multipliers were withdrawn before any sale, so no ledger writes it. The value stays in the
  enum, because a published enum value is never removed.

## ledger-export.v1.json

### 1.0.0 — unreleased

- Initial publication. The monthly published export. The allocation policy and totals
  blocks are optional and absent in the first version, because no allocation runs yet.
- The shadow-routing label is a required member of its own section, so no consumer can
  strip it while keeping the numbers.
- 2026-09-05 — pre-release rename (ops decision D31 item 6, `COST-SUPPORT-MODEL-2026-09-05.md`
  §14; the ledger's M+1 hold is a hold of allocation data, never of money — the fees
  account is swept to the named intermediary within 30 days of each rail payout and the
  earmark instruction follows at month lock). There is no percentage levy: `policy.levyBps`
  is dropped; `policy.capBps` stays and is the ANNUAL cap on charged-to-fees;
  `totals.levy` becomes `totals.chargedToFees`; row type `levy` becomes `charged-to-fees`
  (one row per direct invoice nobody supported); `holdStatus` `held-M+1` becomes
  `open-M+1`; the `methodologyUrl` description names the annual cap and the M+1
  allocation window in place of a levy cap and a hold. The website's sample ledger and
  registry-v0 carry the same names — registry-v0's `ledger-month.v1` renamed its
  `hold_status` value `held` to `open-M+1` in its own commit later the same day (its real
  ledger held no row, so no committed row changed and the fixture chain was rehashed) —
  so the three agree on every name they share. *(Corrected the same day: as first written
  this line claimed agreement before registry-v0's rename had landed.)*

### 1.1.0 — unreleased (2026-09-06; ops decisions D33 and D34)

- Additive, mirroring `ledger-row.v1` 1.1.0: the row enum gains `reserve-retention` and
  `hardship-pay`; export rows gain `recipientId`.
- Additive. `totals` gains `reserveRetention` and `hardshipPay` (positive sums of the two
  D34 lines; zero is a published state), and `disbursed` is described as the sum of the
  per-recipient transfers (D33 item 1). `policy` gains the published caps as optional
  fields — `reserveRetentionBpsMax`, `reserveTargetMinor`, `hardshipCeilingMinor`,
  `hardshipBpsTrailing12` — every one an annex value proposed until the founding assembly
  confirms it, and every one able only to fall.
- Wording. `capBps` names the transfer charges on the outbound transfers as a direct-cost
  class (D33 item 5); `methodologyUrl` and `holdStatus` describe the lock-before-sweep rule
  in place of the M+1 window and the earmark instruction; the example's month note says the
  same. The website's sample ledger and registry-v0 take the same names in their own
  commits of the same day.

### 1.2.0 — unreleased (2026-09-07; ops decisions D27 and D34)

- Mirroring `ledger-row.v1` 1.2.0: `policy.routingMode` takes the canonical enum
  `project_default | shadow | contributor_active`, and `sponsor-ops-in` leaves the export row
  enum. Both pre-release, on the reasoning recorded in that section.
- Additive. `policy.hardshipEpisodeMonths` — ops decision D34 item 3(e): an episode of the
  steward hardship rule lasts at most twelve months and is renewed only by a members' vote. The
  rule was decided on 2026-09-06 and no field carried it, so a published policy block could
  state the month's two hardship caps and stay silent about the limit that ends the episode.
  The constitutional ceiling of twelve is the schema maximum; the published figure is an annex
  value [OPERATOR: confirm at the founding assembly] and, like every cap in the block, can only
  fall.
- Field names, reconciled once and recorded here so the FS-07 re-spec has one place to read the
  answer from. The FS-07 amendment banner of 2026-09-06 names the policy constants
  `reserve_pct_bps`, `reserve_target_minor`, `hardship_ceiling_minor`,
  `hardship_pct_trailing12_bps` and `hardship_episode_months`, and the export totals
  `reserveMinor` and `hardshipMinor`. The published contract keeps its own names —
  `policy.reserveRetentionBpsMax`, `policy.reserveTargetMinor`, `policy.hardshipCeilingMinor`,
  `policy.hardshipBpsTrailing12`, `policy.hardshipEpisodeMonths`, `totals.reserveRetention` and
  `totals.hardshipPay` — because those are the names a consumer validates against, and a
  chapter describing the schema is not the schema. The re-spec states the contract as published;
  the banner's forms are the record's own prose and stay as they are.
- Wording. The export row's `categoryFundId` gains a description — it carried none at all — with
  the same pointer to the file that enumerates the seven-category menu. Nothing it validates
  changes.

### 1.2.1 — unreleased (2026-09-07, later)

- Wording only, `pre-release`. The category menu is now PUBLISHED in its own contract
  (`category-menu.v1.json`, added the same day), so this file's pointer names that
  publication instead of `recipient-list.v1`, which had declared itself the one
  enumerating file while no such contract existed. Nothing about the vocabulary changed —
  the same seven categories of the statutes' Art. 7 — and no constraint moved. `check:menu`
  now holds every copy of the enum identical to the published one, which is what a
  cross-file `$ref` would have done had self-containment allowed one.

### 1.3.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

### 1.4.0 — unreleased (2026-09-08)

Mirroring `ledger-row.v1` 1.4.0, and `pre-release` under versioning policy §5 on the same
reasoning: no month export has ever been published with a row in it.

- `$defs.exportRow.fxRate` becomes the same decimal string, and the example moves to
  `"fxRate": "0.9"` (Q 774fe1d3). The `exclusiveMinimum: 0` note in the `ledger-row.v1`
  1.4.0 section governs this member identically. *(Superseded, kept as history: a JSON
  number.)*
- `$defs.exportRow.holdStatus` gains `not-applicable`, as on the row.
- **`$defs.exportRow` becomes a SUPERSET of the hashed row.** It was a lossy projection:
  measured 2026-09-08 it lacked `month`, `emittingJob`, `createdAt`, `externalKey`,
  `batchId`, `commonsBps` and `routingMode`, so a row hashed over `ledger-row.v1`'s member
  set (FS07-040) could not be recomputed from the export — and the published methodology
  promises a reader can re-walk the chain from genesis. Conforming the builders to a lossy
  projection would have made that promise false, so the projection is what moved: all seven
  members are added, each definition copied from `ledger-row.v1` with its CONSTRAINTS
  UNCHANGED (self-containment forbids a `$ref` across files, so a copy is the only form
  available). Two of the seven — `externalKey` and `routingMode` — carry a description
  abridged to this file's house style, which already shortens or omits most of the
  descriptions it shares with the row, and which leaves `routingMode`'s full semantics,
  including its own pre-release correction note, on the published row field where they
  belong once. `date` stays as the row's UTC date. A complete hashed row now validates as
  an export row unchanged.
  ONE MEMBER IS EXPORT-ONLY, and the `rows` description now says so where a reader meets it:
  `date` is not a `ledger-row.v1` key, so it was never inside the hashed body, and
  recomputing FS07-040 over an export row means dropping `date` as well as `prevHash` and
  `rowHash`. `date` gains the description it never had, saying exactly that; every other
  member of `$defs.exportRow` is a hashed row member. Both worked examples — this file's
  and the API description's, JSON and CSV — now carry the complete row, so the one row all
  three share with `ledger-row.v1`'s own example has a byte-identical hash body in every
  place it is published. The CSV twin took three columns to get there — `fxSource`, `fxDate`
  and `prevHash`, in `$defs.exportRow` order — without which the flat rendering of a row
  published an unpaired `fxRate` that `ledger-row.v1`'s `dependentRequired` refuses, and
  left a reader without the one hash the FS07-040 recompute starts from; the CSV operation
  promises content identical to its JSON twin by construction, and FS07-052 has the CSV
  carry the same rows flat. The audit source of record is still the committed month files;
  the export becomes a second place the same check can run.
- `$defs.exportRow.repo` is RENAMED `repoNodeId` (policy §5). FS-07 §5.1 rules that every
  field name in that chapter is a `ledger-row.v1` property key verbatim, and this was the
  one export member that was not — one member under two names across the two files, which
  is also what stopped `rowHash` recomputing. FS-07 §6.2's illustrative block takes the one
  token with a dated note. `shadow.rows[].repo` does NOT move: `repo` is that object's own
  published member name (`shadow.rows[].required` is `["repo", "fund", "amountMinor"]`) and
  renaming it would put the chapter at odds with the contract. *(Superseded, kept as
  history: the export row member `repo`.)*
- The `rows` description now states the superset property and what it buys, so a reader
  does not have to diff two files to learn that a hashed row validates here.

### 1.5.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

### 1.6.0 — unreleased (2026-09-15; ops decision D42)

- Additive, mirroring `ledger-row.v1` 1.5.0: `$defs.exportRow.scope` with its `$defs.scope` copy,
  placed after `repoNodeId` in the property order — the order that IS the CSV twin's header. The
  CSV cell carries the RFC 8785 canonical JSON of the object, quoted per RFC 4180, so the flat
  twin states the same scope the JSON row does. The worked example here and the API
  description's JSON and CSV examples carry `scope` on their one intake row, which keeps that row
  byte-identical in its hash body with `ledger-row.v1`'s own example.

### 1.6.1 — unreleased (2026-09-15; ops decisions D43 and D44)

- Wording (D43 items 1 and 4), mirroring `ledger-row.v1` 1.5.1. `holdStatus` and the methodology
  description state one clock per payout — locked no later than the twentieth day after a
  payout's credit, transferred no later than the thirtieth, a joint month lock meeting the
  deadlines of the month's earliest payout. `reserveRetentionBpsMax` and `reserveTargetMinor` are
  figures in the statutes' own text (Art. 6g(1)–(2)), no longer annex values awaiting the founding
  assembly, and the retention applies to the Purpose Fees of each payout. The example's month
  note follows; its hashes are illustrative, as before. Descriptions follow ops decisions D43
  items 1 and 4 (annexes out of the statutes; one clock per payout); no member, type, vector or
  answer changes.
- Wording (D44 item 5(a)). `payerName` is the literal `unnamed` on every row written from
  2026-09-15; a listed payer's name is joined from `covered-organisations.v1` at render time and
  never written into a row.
- Wording (D44 item 7). `type` gains a description: the same enum as `ledger-row.v1`'s `type`,
  whose description governs, and `topup-multiplier-in` is reserved and never written because the
  voluntary multipliers were withdrawn before any sale. No enum value is removed, and the CSV
  twin's header is unchanged.

## ledger-chain.v1.json

### 1.0.0 — unreleased

- Initial publication. Global chain head plus per-month digests. The genesis hash is a
  constant in the schema, not a convention in a comment.
- 2026-09-05 (movement decision D29 §6.1, §8): the description's reconciliation triad
  "append-only ledger, audited accounts, partner receipts" becomes "append-only ledger,
  the monthly table's evidence links (rail payout statement, invoices, supporter payments,
  bank lines), intermediary receipts" — the proof is publication to the invoice, not an
  auditor's signature, and the description now mirrors the ops record's VIS-01 as
  amended. Wording only; nothing the schema validates changes, so the version stands.
- 2026-09-06 (ops decision D33 items 1 and 2f): the reconciliation triad's last member
  becomes "the listed recipients' receipts" and the honest limit becomes "the bank legs to
  the recipients" — there is no intermediary. Wording only; the version stands.
- 2026-09-06, later the same day (ops decision D33 item 1): the same honest limit in the
  API description of `GET /v1/ledger/chain.json` (`openapi/edge-public.v1.yaml`,
  `getLedgerChain`) was missed in the pass above and now reads "the bank legs to the
  listed recipients", with the transfer-per-recipient pointer *(superseded: "the bank and
  intermediary legs")*. Wording only, in the API description; no schema and no version
  changes.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

## cost-support.v1.json

### 1.0.0 — unreleased (2026-09-07; ops decisions D29 §3, D33 and D34)

- Initial publication, closing the planned-but-unbuilt entry above. ONE DOCUMENT PER CALENDAR
  MONTH: Purpose Fees received net of the rail's processing fee; the direct costs itemised to
  the invoice, each with its eligible class and, where one settled it, its named supporter;
  cost support by supporter; charged to fees as max(0, C − S) with the financial year's running
  total against the annual cap; the reserve retention with its note; the steward hardship pay
  with its source declaration; and what was passed on — one row per listed recipient (D33
  item 1), never one row per category fund.
- SUPPORTERS ARE ROWS, never schema constants, and an empty month is the same document with
  empty arrays, zero amounts and its notes. That invariance is the contract, not a convenience:
  when a supporter stops, its row goes to zero and falls off, and no heading, no rule text and
  no published claim changes (D29 §3, invariant I8).
- The identities a reader checks are stated in the schema description, because JSON Schema
  cannot express a sum across items: charged to fees is max(0, C − S); S ≤ C; passed on is
  F − charged − reserve retention − hardship pay; and the transfers sum to passed on. The two
  totals are written rather than derived, so the arithmetic can be checked against the file it
  is published in — the same treatment `purpose-yml.v1` gives its micro-share bound.
- `capBps` is `["integer","null"]` and REQUIRED. Null until the cap number is set with counsel
  and written into the constitution: the number is an open row of the record (URS §21 OPEN-05
  owns it; proposed default 15%, i.e. 1500 bps, an annex value [OPERATOR: confirm at the
  founding assembly]), and nothing renders a figure nobody has approved. Required-and-nullable
  rather than optional, on the `ct-segment.v1` reasoning: in an audit a missing key and an
  explicit null must not be distinguishable.
- `transfers[].status` is `scheduled | transferred`, and `date`, `receiptRef` and a NON-EMPTY
  `evidence` array are required only once it is `transferred`. The lock-before-sweep rule (D33
  item 4) leaves a real published state between the lock, no later than the twentieth day after
  the month's last rail payout, and the sweep on or before the thirtieth: the share is computed
  and the money has not moved. The distinction is in the contract so that a scheduled share can
  never be rendered as a transfer. The `minItems: 1` matters as much as the required key — the
  field's own description says a transfer nobody can check is not a published transfer, and this
  is the one line of the table where the money actually left the account, so the branch enforces
  what the sentence promises and matches the `minItems: 1` the invoice and supporter lines carry.
- `transfers` says which population it covers, because "one row per listed recipient" alone did
  not: for every category the month's allocation gave an amount to, there is one row per ACTIVE
  listed recipient of that category, in the shares the list's `shareRule` produces; a category
  the allocation gave nothing to has no rows at all. The example shows it — three categories
  received, and both listed recipients of each have a row, with largest remainder giving the odd
  minor unit to the one that comes first in the published list order.
- `$defs.directCostClass` enumerates the seven eligible classes of D29 §2.1, `transfer-charges`
  among them (D33 item 5). The *kind* rule is constitutional; the list itself is board-amendable
  with publication, so the enum may gain a class additively.
- Every line carries `evidence[]`, and an evidence link is `{kind, ref}` with an OPTIONAL `url`.
  Not every piece of evidence is a public URL — a statement line is a line — and a reference a
  reader can ask for by name is better than a link that pretends the document is online.
- Two things this contract deliberately does not have. NO ROUTE: the artifact is a published
  file that the transparency page renders, so `openapi/edge-public.v1.yaml` gains nothing and
  was not touched. NO CATALOGUED PATH: FS-00 §6.2 catalogues no artifact for this table (that
  deferral is deliberate), so `x-psn.artifactPath` says so and names the hand-maintained v0
  home instead of inventing a URL the record has not fixed.
- For the P-M3 producer: the names in THIS contract govern. The v0 table is hand-maintained in
  the website repository as one file with a `periods[]` member and carries earlier field names
  (`feesNetMinor`, `yearToDateChargedPct`, `capPct`, `passedOn`); it is a v0 rendering source,
  not a published contract, and it aligns when the producer is built.

### 1.0.1 — unreleased (2026-09-07, later)

- Wording only, `pre-release`. The category menu is now PUBLISHED in its own contract
  (`category-menu.v1.json`, added the same day), so this file's pointer names that
  publication instead of `recipient-list.v1`, which had declared itself the one
  enumerating file while no such contract existed. Nothing about the vocabulary changed —
  the same seven categories of the statutes' Art. 7 — and no constraint moved. `check:menu`
  now holds every copy of the enum identical to the published one, which is what a
  cross-file `$ref` would have done had self-containment allowed one.

### 1.1.0 — unreleased (2026-09-15; ops decisions D43 and D44)

- Additive (D44). `$defs.supporter.sponsorshipId`: when a supporter line was paid from a
  sponsorship, the id of that sponsorship in the published sponsor register (`sponsorship.v1`,
  `/sponsors.json`), and the supporter `name` is then the sponsor's name exactly as the register
  prints it. `reserve.movements[].sponsorshipId`: on an `unrestricted-income` movement paid from a
  sponsorship's unused balance when its period ends. A reader can follow a named supporter line
  or a reserve movement back to the invoice it came from. Both are optional; the existing example
  validates unchanged, and so does the same table with a supporter line carrying the member.
- Wording (D43 items 1, 4 and 7), descriptions only. Every cap is a figure in the statutes' own
  text (Art. 6(3), Art. 6g(1)–(2)), no longer an annex value awaiting the founding assembly; the
  eligible cost classes are those of the Cost Class Rules, the board rulebook under statutes
  Art. 22(7), no longer a statutes annex; the reserve target is CHF 27,000 in the statutes' own
  text, and the struck derivation from the essential operating role is recorded as struck; pay to
  a board member needs the prior minuted approval of at least two other board members with no
  interest of their own in any pay (Art. 6f(3)); and the transfers follow one clock per payout —
  the allocation is locked no later than the twentieth day after the credit of the month's
  earliest rail payout, and each share is transferred no later than the thirtieth day after that
  credit. The example's reserve note follows. Descriptions follow ops decisions D43 items 1 and 4
  (annexes out of the statutes; one clock per payout); no member, type, vector or answer changes
  by this wording.

## recipient-list.v1.json

### 1.0.0 — unreleased (2026-09-07; ops decision D33)

- Initial publication. Until now the Recipient List had no data home in any repository, while
  two published contracts already pointed at it: `ledger-row.v1.recipientId` and the transfers
  of `cost-support.v1` both resolve against a list nothing described. One document per published
  version: `version`, `status`, `effectiveFrom`, `noticeGivenAt`, the seven categories, the
  recipients with their Recipient Standard evidence, and the share rule.
- THE LEGAL INSTRUMENT IS THE ANNEX, NOT THIS FILE. The list is the published, versioned annex
  to the statutes, adopted by the members; this artifact is its machine-readable form, so
  `x-psn.authoritative` is FALSE — as it is for `purpose-yml.v1` and `registry-v0-record.v1`,
  the other two contracts something else governs. Where the two disagree the annex governs.
- Part of the Recipient Standard (D33 item 2) is ENFORCED rather than described:
  `standard.accountsYears` has minimum 3 (item 2(a)), `standard.bankTransferOnly` and
  `standard.independenceDeclared` are `const: true` (items 2(e) and 2(d)), `standard.screening`
  needs at least four records so all four lists appear (item 2(c)), and `website` plus `address`
  are required (item 2(g)). The rest travel as required references, because a validator can
  prove that evidence was recorded and only a human can prove that it is true. The Standard's
  minimum is constitutional and may only be tightened, so these floors can only rise.
- `noticeGivenAt` is required and nullable. A version that adds or removes a recipient gives
  thirty days' public notice before its `effectiveFrom` month; the two cases with no notice
  period — the first adopted list, which nothing preceded, and a removal for cause, which takes
  effect at once — are an explicit null rather than an absent key (D33 item 3).
- The ten-to-fifteen range of D33 item 1 is STATED, NOT ENFORCED. A removal for cause takes
  effect at once and can leave a version briefly outside the range, and a contract that cannot
  express the true published state is worse than none.
- `status` (`draft | adopted`) is in the artifact because the honesty rule needs it there: no
  page can tell an adopted list from a proposal by looking at the recipients, and no transfer is
  ever made against a draft. `recipients[].sample` marks a fixture entry by entry, and a
  production list carries none.
- `shareRule` is published as PROPOSED, not decided [OPERATOR: confirm]: equal shares per listed
  recipient of a category, apportioned by largest remainder (FS-07 FS07-030) with ties broken by
  the order of the published list — which is what the sample dataset already assumes. An
  undecided question is an open row of the record (URS §21), never a resolution invented in a
  schema, so the proposal ships with its status in the data. Note what the rule is NOT: it does
  not touch how much each CATEGORY receives (the allocation rule of FS-07 does) and it does not
  touch the annual cap on direct costs (URS §21 OPEN-05 owns that).
- THE CATEGORY MENU IS ENUMERATED HERE, ONCE: `$defs.categorySlug` is the closed seven-value
  enum of the movement's published categories (statutes Art. 7; D33 item 1). No schema in this
  repository may `$ref` another — each must validate on its own after a single download — so
  the other fields carrying the vocabulary constrain it by pattern and NAME this file, rather
  than repeating the enum and forking it at the next amendment. Those pointers exist on
  `ledger-row.v1.categoryFundId`, on `ledger-export.v1`'s export-row `categoryFundId` (which had
  no description at all and now carries the same one) and on
  `cost-support.v1.transfers[].category`. `purpose-yml.v1`'s own `categorySlug` does NOT carry
  one: it predates this menu, still describes "5–8 funds" and offers `climate` as its example,
  which is not one of the seven. That alignment and the curated registry's pre-D33 fund set both
  belong to the category-menu work, are deliberately not made here, and are named in the record's
  own list of what is still to align — the claim in the schema is scoped to the three fields that
  really carry the pointer, so nobody is told a pointer is there when it is not.
- `categories` holds EXACTLY ONE ENTRY PER SLUG, and that is enforced rather than asserted: seven
  items, plus one `contains` clause per slug. `uniqueItems` was the first attempt and does not do
  this job — on an array of objects it compares whole objects, so seven entries all slugged
  `health` with distinct names passed it, and a published version could have claimed seven
  categories while six of the movement's seven were silently absent. The bijection is checked
  against the repo's own validator, along with the six-, eight- and duplicate-slug cases.
- The example is the SAMPLE list and nothing else: fourteen fictional organisations, two per
  category, every entry `sample: true` and named so, mirroring the sample dataset the pre-launch
  site renders so the two fixtures agree entry for entry. No real organisation is named in this
  repository before the founding assembly adopts the first list.
- The example is `adopted`, not `draft`, and deliberately so. The `cost-support.v1` example cites
  this version for a month in which money moved, and no transfer is ever made against a draft —
  two fixtures that resolve against each other id for id may not jointly depict a state both
  contracts forbid. Its chronology is coherent on purpose: screened 2026-11-15, adopted
  2026-11-19 with its minute reference, published 2026-11-20, effective from 2027-01, and
  `noticeGivenAt` null because it is the first adopted version and nothing preceded it.
- Country is ISO 3166-1 alpha-2, a code rather than a name, because the two facts that hang on
  it are jurisdictional: whether the organisation may lawfully receive funds from a Swiss
  association under its own law (item 2(b)), and which sanctions regimes its screening must
  clear. The sample dataset carries country NAMES; the machine contract carries the code, and
  the rendering surface prints the name from it.

### 1.0.1 — unreleased (2026-09-07, later)

- Wording only, `pre-release`. `$defs.categorySlug` no longer claims to be the one file in
  the contract set that enumerates the menu: the menu is PUBLISHED in `category-menu.v1.json`
  (`$defs.slug`, with its example as the menu itself), added the same day, and the enum here
  is a copy of it. The values are unchanged and nothing about the vocabulary moved. The note
  that `purpose-yml.v1` had not been aligned is gone because it has been — and the reason its
  `categorySlug` stays a PATTERN is stated instead: a manifest is untrusted repository content
  whose unknown slugs are rejected field by field at parse time. Self-containment still forbids
  a cross-file `$ref`; `check:menu` asserts every copy is identical to the publication, which
  is the guarantee the `$ref` would have given.

### 1.0.2 — unreleased (2026-09-15; ops decision D42)

- Wording only, `pre-release`. `shareRule`'s description no longer names "payer declarations,
  the commons slice" as the FS-07 allocation rule it does not touch: D42 retired the commons
  slice and the directed slice, and a buyer's passed-on share is now attributed by the lane and
  scope paid for. The rule this contract does govern — equal shares per listed recipient within
  a category, still PROPOSED and awaiting the operator — is unchanged, and so is every value.

### 1.1.0 — unreleased (2026-09-15; founding change spec C2)

- Widening. The Recipient Standard of D33 item 2 gives way to the floor of statutes Art. 7(2),
  which a newly founded charity can pass, with the details of the checks in the Recipient Rules
  that the board changes with publication. `standard.accountsYears` leaves `standard.required`
  and its `minimum` falls from 3 to 0, and `website` and `address` leave the recipient's
  `required`. Every property stays and nothing else moved, so every document that validated
  still validates; a version may now also list a recipient with no years of accounts, no
  published address and no website.
- Wording. Every description that stated the old rules now states the new ones: the floor is
  statutes Art. 7(2) and may only be tightened; the details are in the Recipient Rules, which the
  board changes with publication; the list is kept by the board outside the statutes and is not a
  statutes annex, the founding list being adopted by the board at its constituting meeting with
  its first publication counting as the thirty days' public notice (so `noticeGivenAt` stays null
  for it); and "ten to fifteen" is the board's non-binding "usually about ten to fifteen".
  `standardUrl` keeps its name and points at the published Recipient Rules. Where a member stays
  for a D33 limb that is no longer a requirement — years of accounts, a published address and
  website, the annual use-of-funds statement, no contributor or repository owner among the
  officers — its description says so. A removal for cause no longer names "failure to report".
- Minor bump, 1.0.2 to 1.1.0 (versioning policy §3): a widening that §1 allows inside `v1`, and
  not `pre-release`, because nothing is tightened. The 1.0.0 entry's "THE LEGAL INSTRUMENT IS THE
  ANNEX" and "these floors can only rise" are superseded by this entry and kept above as history.
- Wording, same day (ops decision D43; founding change spec C11). `shareRule` is DECIDED (ops
  decision D40 item 7), so its description no longer calls the equal split a proposal. The split
  now applies to the REST of a category's amount: an active listed recipient named with an amount
  in an advisory designation by a repository's administrators or contributors, or in the board's
  allocation key for shares nobody designated or left to the Association, receives that amount
  first (statutes Art. 8(1), (2) and (4)); the key is published before the month it applies to.
  No constraint moved: the `status` enum keeps both values, so a document carrying `proposed`
  still validates.

## sponsorship-schedule.v1.json

### 1.0.0 — unreleased (2026-09-15; ops decision D44)

- Initial publication. `/sponsors/schedule/{version}.json`: the tiers and terms of sponsorship of
  the Association. Sponsorship is invoiced and paid by bank transfer into the general account; it
  is never a Purpose Fee, never sold at checkout or through the payment provider, and buys no
  coverage, no licence credential and no influence (statutes Art. 3(6)(5), 6b, 6d and 6g; GOV-008,
  COM-070).
- VERSIONED, NEVER EDITED IN PLACE once a sponsor has paid under a version (the D32 reliance
  rule): new tiers are a new version at a new permalink, and each sponsor record names the version
  it paid under.
- `status` is `draft` until the board adopts its sponsoring policy and the tax adviser has
  answered on the VAT and direct-tax character (LEG-094, OPEN-41), and no invoice is issued under
  a draft; `adoptedAt` is null until then.
- A tier is one fixed amount for one period, the same for everyone; at most five tiers, with
  neutral names that never rank generosity. No other amount is invoiced.
- `useOrder` is a `const`: cost support, then the operations reserve, then general costs. Each
  month of the period, the unused balance settles that month's running-cost invoices of the
  Purpose Source activity that nobody else supported, by name and amount and never above the
  month's direct costs; when the period ends, what is left moves to the reserve until it holds its
  target, and the rest stays for the Association's general costs (D44 item 6(b)).
- Eight rule ids are required — `invoice-only`, `general-account`, `use-order`, `named`,
  `no-influence`, `no-coverage`, `not-at-checkout` and `screening` — so a later version cannot
  quietly drop one. The words of each rule are the published document's.
- The example is a `draft` with three illustrative tiers; the board adopts the real amounts, and
  the example's rule texts stand in for the words the published schedule takes.

## sponsorship.v1.json

### 1.0.0 — unreleased (2026-09-15; ops decision D44)

- Initial publication. `/sponsors.json`, hand-maintained at v0 on the website from the
  general-account statement and the invoices: ONE ROW PER SETTLED SPONSORSHIP, published once the
  payment has settled and never before, by name, tier, period, amount and use.
- NO ROW IS ANONYMOUS. `name` is required and may not be a placeholder — `unnamed`, `anonymous`,
  `Anonymous sponsor`, `Unlisted organisation`, `undisclosed` and their capitalised forms —
  because undisclosed support is prohibited (statutes Art. 6b(3)); a sponsor that will not be
  named is not invoiced. That is the opposite of `covered-organisations.v1`, where a Purpose Fee
  payer is named only on request, and the difference is the statutes'.
- `screenedOn` records the sanctions screening, dated before the invoice was issued (Financial
  Regulation §9(2) as amended for sponsors).
- THE ARITHMETIC A READER CHECKS is stated in the description, because JSON Schema cannot sum
  across items: the uses plus `balanceMinor` equal `amountMinor`; every `cost-support` use falls in
  a month of the period and appears, under the same name and `sponsorshipId`, in that month's
  cost-support table, never above that month's direct costs; an `operations-reserve` use is dated
  after the period ends and appears as an `unrestricted-income` reserve movement with the same
  `sponsorshipId`; and a `general-costs` use is what remained. A `cost-support` use must name its
  `month` and the invoices it settled.
- Rows are ordered by `settledOn`, then `spnId`, never by tier or amount. `certId` names the
  sponsor certificate (`supporter.sponsor`, `certificate.v1` 1.3.0), or is null.
- The example is a fixture: one sponsor two months into its period.

## change-event.v1.json

### 1.0.0 — unreleased

- Initial publication. The complete event catalogue. The payload is deliberately open to
  additive public fields and closed to anything personal.
- Published now although the feed itself is demand-gated to a later milestone: an
  integrator building against this contract set should be able to see the shape it will
  eventually receive.

### 1.1.0 — unreleased (2026-09-08)

- Additive. `$defs.githubNodeId` widens to
  `^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$`, and gains the description
  that says why: the second alternative is the legacy repository node_id form that
  `registry-v0-record.v1` 1.1.0 already accepts, whose `=` padding the first alternative cannot
  express — so a record the curated registry accepts is publishable in this artifact. Pure
  widening; every value that validated still validates. Eleven files define this `$def` and all
  eleven move in one step, `registry-v0-record.v1` being the twelfth that already published the
  two-form pattern and therefore the model. It is NOT closed to that file's narrower first
  alternative (`R_[A-Za-z0-9_-]{6,118}`): that would tighten eleven files, which is a different
  instrument from this one.

## badge.v1.json

### 1.0.0 — unreleased

- Initial publication. The shields.io endpoint body, with the neutral and unknown forms
  documented as canonical values rather than left to a renderer's discretion.
- See open question 3 above regarding `generatedAt`.

## stats.v1.json

### 1.0.0 — unreleased

- Initial publication. The three-state counter machine, with the pre-launch null rule
  enforced structurally so a build cannot ship a pre-launch page carrying numbers.
- See open question 2 above.

### 1.1.0 — unreleased (2026-09-08)

- Additive. Optional `source` — `registry-v0` | `sample` | `fixture` — the envelope's plane
  label. `sample` and `fixture` declare a NON-PRODUCTION plane: a page rendering such an
  artifact is labelled sample, and a production deployment refuses to serve it (FS-10 §2 v0
  note; the edge route answers `sandbox_artifact_on_prod`). `registry-v0` is the P-M2
  production source of record. Optional, so nothing already valid becomes invalid, and the
  enum widens additively when the P-M3 producer takes a value of its own. Authority:
  **Settled 2** above.
- Where the two exceptions are written down. `badge.v1` and `certificate-policy.v1`
  deliberately do NOT gain `source`: shields.io owns the badge body, so a member of ours would
  break the endpoint contract, and the certificate policy is a rule that is byte-identical on
  every plane, so a plane label on it would assert nothing. Both borrow the declaration on
  `/registry/index/meta.json`, which is how the production guard already reads them. No signed
  payload takes the member either (`certificate.v1`, `entitlement-record.v1`,
  `ct-checkpoint.v1`) — the label is a property of the build, not of what was attested.

### 1.2.0 — unreleased (2026-09-12)

- Additive. `source` admits a fourth value, `platform` — the P-M3 producer of record, the
  platform database rendered by the index-build job. The enum only widens and the member
  stays optional, so nothing that validated stops validating and `registry-v0`, `sample`
  and `fixture` keep exactly the meanings they had. This is the widening the member's own
  description reserved ("the enum widens additively when the P-M3 producer takes a value
  of its own"), and that description now says so and says what a reader may conclude from
  the value: the P-M3 producer writes `platform` in production and `fixture` in every
  other environment, so a synthetic plane is still declared as one and the production
  guard still refuses it. No second value was added — `dev` was considered and rejected
  for exactly that reason. Authority: **Settled 2** above, and ops decision D35 of
  2026-09-10, which authorises the P-M3 build.

## publish-log.v1.json

### 1.0.0 — unreleased (2026-09-12)

- Initial publication. `/meta/publish-log.json` — the publish batch records of FS10-011
  step (5), a path the FS-00 §6.2 amendment note of 2026-09-01 added to the catalogue —
  has been served since the first build with no published contract, so the gate that
  validates the artifact plane had to list it by name as unschematised and say why. This
  closes that: the artifact now has the same standing as every other path of the plane.
- TWO PRODUCERS, ONE CONTRACT, and that is the reason the shape is described the way it
  is. The P-M2 builder publishes the whole plane on every run and records one batch for
  it; the P-M3 producer appends a batch only for a run that wrote at least one path, so an
  hourly rebuild over unchanged data does not grow the document. `publishedAt` and `edge`
  are the second producer's additions and are optional, and the first producer's
  `sources`, `phase` and `sourceDigestInputs` are optional for the same reason — neither
  producer is made to carry the other's members, and both validate here.
- The required set is FS10-011's own: the envelope's `schemaVersion` and `generatedAt`,
  `batches`, and per batch the three that clause names — `batchId`, `generatedAt`,
  `paths`. A batch is the record of a publication, so `paths` carries at least one entry;
  a run that wrote nothing appends no batch rather than an empty one.
- ORDER IS POSITION, NOT IDENTIFIER, and `batchId`'s description says so outright rather
  than leaving a reader to infer it. `batches` is oldest first; the identifier is typed for
  its SHAPE alone — `evt_` and 26 lowercase Crockford characters — and no keyword can relate
  two identifiers, so a log whose identifiers do not sort into build order validates here
  exactly as one whose identifiers do. A consumer taking the newest batch by comparing them
  would therefore sometimes take the wrong one. The guarantee a reader may rely on is the
  one the document can carry: position, and the instants beside it.
- `sourceDigest` is typed as an opaque lowercase 64-hex string and its description says
  what it is opaque ABOUT. Each producer defines its own preimage over its own kind of
  input — the bytes of files read on one side, the canonical form of rows read on the
  other — so the value answers "did MY inputs change?" against the previous value of the
  same producer, and two producers' digests of one plane are never compared. Writing that
  into the contract is the point of the member being typed at all.
- ETags are typed AS SERVED, quotes included: `"` plus 32 lowercase hex characters plus
  `"`. The quotes are part of the value because they are part of HTTP's entity-tag syntax,
  and a producer that recorded the bare digest would publish a value that never matches
  the `If-None-Match` a client sends — a mismatch nothing would report.
- The `edge` block states all three handshake steps whenever it is present. It exists so a
  reader of the log never has to guess whether a step ran, and a block that named only the
  steps that ran would leave exactly that guess: `done`, `skipped` and `not-configured`
  are three different facts, and the third is a stated posture rather than a failure.
- Both the objects of counts — `sourceDigestInputs` per label and `sources` per kind — are
  open in their keys and integers in their values. Counts only, never paths: this artifact
  is published, and a path list would describe the producer's directory layout to every
  reader.
- AMENDED 2026-09-14, before release: the `paths` and `etags` path patterns admit `+` and
  `=`. Most of this plane's paths are built from a `node_id` — `/registry/repo/{node_id}.json`,
  `/badge/{node_id}.json`, `/waivers/{node_id}.json` — and GitHub's legacy node_id form is
  standard base64, whose alphabet carries both. `repo-record.v1` widened its own
  `githubNodeId` for exactly this on 2026-09-08 and said so in the member's description;
  this schema was written after that and repeated the omission, so a real plane carrying one
  legacy-keyed repository emitted artifact paths that its own publish log could not state.
  Found the day the website's artifact-schema gate began validating this file — which is
  what that gate is for, and why the entry is recorded here rather than baselined there. A
  widening of a pattern admits strictly more (policy rule 1) and the version is unreleased,
  so no number moves.

### 1.1.0 — unreleased (2026-09-15; ops decision D44)

- Additive. `$defs.batch.unlistedPaths`, an integer of at least zero: how many paths the batch
  wrote and deliberately does not list in `paths` or `etags` — the verify records of
  individual-subject certificates, which FS08-061 excludes from every index and CERT-060 makes
  private by default, and which this log, an index of every path written, listed until now. A
  count only, never an identifier; absent on a batch written before the member existed, and read
  as zero. `paths` states the exception in its description.
- Only those paths. Entitlement-record paths and corporate certificate paths stay listed. Hiding
  them would protect nothing, because the covered-organisations list (`covered-organisations.v1`)
  publishes both ids on every line and every ledger row carries `coId` and `entId`; and it would
  break something, because a plane fetch reads exactly the listed paths, so a fetched plane would
  lose its entitlement records and corporate certificate records and the pages built from them.
  Declaring every record id "not a secret" was the rejected alternative: it contradicts FS08-061
  and CERT-060 for people.
- The existing example validates unchanged, and so does the same log whose batch carries
  `unlistedPaths: 2`.

## openapi/edge-public.v1.yaml

The API description's own section. It is not a schema file, so the per-schema rules above
address it only by analogy: `info.version` versions the API SURFACE — routes, status codes,
caching classes, error codes — while the component schemas under it describe response
bodies. Nothing is published under it yet, so policy 5 governs; the levels below still say
which kind of change each entry was.

### 1.0.1 — unreleased (2026-09-08)

- Additive, and a correction rather than a new capability: the two components below now
  describe bodies that are ALREADY served that way. No route, status code, cache class or
  error code moved, which is why this is a patch and not the minor bump rule 3 asks of an
  additive property on a schema file. Authority: **Settled 2** above — the artifact-plane
  authority question settled by the recorded ruling **Q b0443041**, whose instrument is the
  dated FS-00 §6.2 amendment note; the placement of the `Jwks` part in this entry rather
  than in the envelope entry above it is the recorded ruling **Q 3bf2f667**.
- `Jwks` gains optional `schemaVersion` (`const: 1`) and `generatedAt` (`date-time`). These
  are the FS-00 §6.2 envelope, and the published key set has carried them from the first
  build — the component was `additionalProperties: false` with `required: [keys]`, so it
  REJECTED the very document it documents, and a consumer who validated against it would
  have refused the real `/jwks.json` and been right to. `required` stays `[keys]` alone:
  the same body is also minted by the edge Worker from its own bundle when storage holds
  nothing, and a key set is worth serving with fewer envelope members than not at all.
  `generatedAt` is never guessed — a deployment with no build instant to state omits it.
- `Jwks` gains optional `source` (the envelope enum, identical to the schema files' member)
  and optional `sandbox` (`boolean`). `sandbox` is `true` on `/sandbox/jwks.json` and
  nowhere else: FS08-103 requires sandbox material to be marked in every response body, and
  until now that marker had no home in the contract. It is ABSENT rather than `false` on
  the production set — which document a key set is decides that, and a flag asserting it
  could be copied onto a set that is not this one.
- `DomainIndex` gains optional `source`, the same enum. The published index has carried the
  label since the plane began declaring it.
- The `oneActiveKey` example gains `schemaVersion: 1` and a `generatedAt` so the envelope is
  visible where a reader looks first; the two keys and their windows are unchanged. The
  sandbox operation, which had no example at all, gains one that shows `sandbox: true` — the
  marker its own description promises. Both are validated by the examples gate.
- The `kid` pattern is untouched: `^psn-(dev|prod|sandbox)-[0-9]{4}-[0-9]+$` stands, and the
  fixture key set was renamed to match it rather than the pattern widened to admit a retired
  environment token.

### 1.0.2 — unreleased (2026-09-12)

- Additive, and a patch for the same reason 1.0.1 was one: no route, status code, cache
  class or error code moved. Two of the three changes below describe bodies that are
  ALREADY served that way, and the third types two members a recorded decision has already
  assigned to this route.
- `Jwks.source` and `DomainIndex.source` admit `platform`, the P-M3 producer of record —
  the same widening the nine schema files take in this release, in the same words, so the
  envelope member means one thing across both halves of the contract set.
- `Meta` gains seven OPTIONAL members and loses nothing. Five of them the deployment has
  been publishing all along while this component, `additionalProperties: false` at every
  level, rejected them: `env`, `api`, `rateLimits`, `verifyAt` and `contracts.errorCodes`.
  A consumer validating a real `/v1/meta` body against the published contract refused it,
  and was right to — the contract was wrong about the body, not the body about the
  contract. The other two, `publishedAt` and `stale`, are put on this same route by a
  recorded decision of 2026-09-12 and are typed before they are served: the shapes are
  already specified, and a closed object would otherwise be amended twice for one
  decision. `required` is untouched, so every body that validated still validates, and the
  component's published example is unchanged and still passes the examples gate.
- `env` is a plain string and not an enum of the three deployments that exist today. It is
  a published health key — the production availability check specified for this route
  asserts `edgeVersion` present and `env` equal to `prod`, at its highest paging class — and
  naming a fourth deployment is a configuration act that should not need an amendment
  here. `api` IS an enum: `proxied`, `disabled` and `unconfigured` are the contract's own
  three states, and `unconfigured` exists so that a defect is reported rather than hidden
  behind a word that sounds like it works.
- `rateLimits` is closed at its own level and open in its `classes` map, which is where a
  limit class legitimately arrives. Each class states `limit`, `periodSeconds` and
  `routes`, the three members the published table emits — not `binding`, which names an
  internal resource and is not published. `enforced` is typed because it is the honest
  half of the table: a deployment with the limiter switched off publishes the figures and
  says it is not applying them.
- `coverage` is untouched, and `coverage.available` was deliberately NOT added. Which
  phase-gated routes are switched on is what `routes` already carries, in the map shape
  this component has always defined and its own example already shows.

### 1.0.3 — unreleased (2026-09-15; ops decision D42)

- Wording and examples only; no route, status code, cache class or error code moved. The coverage
  example `yesViaProject` is summarised as "Covered by a Project term whose scope names this
  repository" (it said "that declared this repository", the conflation `entitlement-record.v1`
  1.1.1 corrects). The ledger month JSON and CSV examples carry the new `scope` member of
  `ledger-row.v1` 1.5.0 and `ledger-export.v1` 1.6.0; the CSV header gains the `scope` column
  after `repoNodeId`.

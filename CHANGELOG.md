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

## 0.1.0 — unreleased

Initial scaffold of the contract set. Seventeen schemas, the public read API description,
and the published reference implementation of the coverage function with its frozen test
vectors.

### Contracts published beyond the initially-scoped ten

Six schemas were added because another repository's acceptance test names a schema
published *here* and would otherwise have nothing to validate against:

| Schema | Needed by |
|---|---|
| `certificate-record.v1.json` | the verify page and the verify route (VS-25); the artifact-validation gate (VS-04) |
| `ct-segment.v1.json` | the committed transparency log and its append-only CI guard (VS-27, VS-28) |
| `ct-checkpoint.v1.json` | the monthly signed checkpoint (VS-28) |
| `ledger-export.v1.json` | the published monthly ledger export (VS-04, VS-37) |
| `registry-index.v1.json` + `registry-index-meta.v1.json` | the published registry index and the browse surface (VS-04, VS-17); the badge route's delist guard (VS-24) |
| `registry-v0-record.v1.json` | the curated registry repository's validation CI, which validates "against the JSON Schema published in spec" (VS-03, FS02-061) |

### Open questions a human must settle

1. **Entitlement-record shape.** The FS-00 §6.2 amendment note states the
   `/entitlements/{co_ulid}.jws` payload as a single entitlement object; FS-10 §4.2 — the
   consumer contract, and the only text that specifies `domains[]`, `verification` and
   domain resolution — states it as a company record carrying `entitlements[]` of exactly
   that object. This repository implements FS-10 §4.2 and leaves the frozen object
   untouched inside the array. Needs ratifying either way.
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
   test run; the gates name every file that still disagrees.
7. **npm publication.** The package is marked private. Whether the contract set is also
   published to a package registry (and under what name) is undecided.

### Planned — not built

- **`cost-support.v1.json`** (P-M3; recorded 2026-09-05). The data shape of the movement's
  monthly cost-support table, as decided in the ops record (decision D29,
  `COST-SUPPORT-MODEL-2026-09-05.md` §3): per calendar month — Purpose Fees received net of
  the rail's processing fee; direct costs itemised with their invoice references; cost
  support by named supporter, the sum never exceeding the direct costs; charged to fees =
  max(0, direct costs − support), with the running year total against the published cap;
  passed on to the named intermediary, with date and receipt reference; every line carrying
  an evidence link. Supporters are rows, never schema constants — the shape must be
  identical whether the supporter list has zero rows or many. Nothing is published here yet:
  no schema file, no example, no changelog section of its own. It lands as an additive new
  file when P-M3 builds the transparency table.

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

## registry-v0-record.v1.json

### 1.0.0 — unreleased

- Initial publication. One curated YAML record per registered repository, for the
  pull-request-curated registry that exists only through the first public version.
- No `waivers` field, permanently: a waiver can only be granted by a claimed project
  admin, so it can never arrive by pull request.

## registry-index.v1.json

### 1.0.0 — unreleased

- Initial publication. One shard document; the same shape serves the bulk export with
  `shard: "export"`, so enumerating the registry needs no second contract.

## registry-index-meta.v1.json

### 1.0.0 — unreleased

- Initial publication. Shard list, registry-wide totals, and the delisted set the badge
  route uses to override a stale cached badge.

## repo-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The per-repository record, including the fixed Apache-2.0
  conversion date, manifest status with published rejection records, the waiver pointer
  and badge data.
- The `stats` block is optional and absent in the first version: no attribution or charity
  figure exists before the first disbursed ledger row.

## waiver.v1.json

### 1.0.0 — unreleased

- Initial publication. Envelope plus waiver entries; `coolingEndsAt` is documented as a
  vesting input that the coverage answer ignores.
- FS-10 §4.2 shows the waiver registry as a bare array. Published here as the standard
  artifact envelope with a `waivers[]` member, because FS-00 §6.2 requires every artifact
  to carry `schemaVersion` and `generatedAt` and a bare array cannot.

## entitlement-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The decoded JWS payload: company wrapper, and the frozen
  entitlement object closed to additions inside `entitlements[]`.
- Vesting semantics recorded in the field descriptions: vested iff a version's publication
  date is on or before a window's term end, with `from` as provenance only.
- See open question 1 above.

## certificate.v1.json

### 1.0.0 — unreleased

- Initial publication. The certificate JWS payload profile, with the type/variant table
  enforced structurally.
- Funding truth enforced by the schema: an amount cannot appear without its currency and
  its kind, and a status certificate cannot carry an amount at all.
- Materiality enforced by the schema: the below-floor flag and a monetary figure are
  mutually exclusive.

## certificate-record.v1.json

### 1.0.0 — unreleased

- Initial publication. The public verify record. Field names and shapes are
  byte-authoritative — passthrough consumers render them verbatim.
- `ct: null` is modelled explicitly, because signed-but-unlogged must be representable:
  that state is what a rogue issuance looks like, and a verifier has to be able to see it.

## ct-segment.v1.json

### 1.0.0 — unreleased

- Initial publication. Append-only log segments, hash-chained. Entries carry no personal
  data, which is what lets the log be immutable forever.
- `ref` is required and nullable rather than optional: in an audit, a missing key and an
  explicit null must not be distinguishable.

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

## ledger-export.v1.json

### 1.0.0 — unreleased

- Initial publication. The monthly published export. The allocation policy and totals
  blocks are optional and absent in the first version, because no allocation runs yet.
- The shadow-routing label is a required member of its own section, so no consumer can
  strip it while keeping the numbers.

## ledger-chain.v1.json

### 1.0.0 — unreleased

- Initial publication. Global chain head plus per-month digests. The genesis hash is a
  constant in the schema, not a convention in a comment.

## change-event.v1.json

### 1.0.0 — unreleased

- Initial publication. The complete event catalogue. The payload is deliberately open to
  additive public fields and closed to anything personal.
- Published now although the feed itself is demand-gated to a later milestone: an
  integrator building against this contract set should be able to see the shape it will
  eventually receive.

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

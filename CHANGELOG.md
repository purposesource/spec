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
   test run; the gates name every file that still disagrees.
7. **npm publication.** The package is marked private. Whether the contract set is also
   published to a package registry (and under what name) is undecided.

### Settled

Questions that were open above and have since been answered in the record. They stay here
with what settled them, because a contract's history is part of the contract.

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

### Planned — not built

- **`cost-support.v1.json`** (P-M3; recorded 2026-09-05). The data shape of the movement's
  monthly cost-support table, as decided in the ops record (decision D29,
  `COST-SUPPORT-MODEL-2026-09-05.md` §3): per calendar month — Purpose Fees received net of
  the rail's processing fee; direct costs itemised with their invoice references; cost
  support by named supporter, the sum never exceeding the direct costs; charged to fees =
  max(0, direct costs − support), with the running year total against the published cap;
  passed on directly to the listed recipients, one line per recipient with date and receipt
  reference *(amended 2026-09-06, D33; as first recorded: "passed on to the named
  intermediary, with date and receipt reference")*; every line carrying an evidence link.
  Since D34 item 5 (2026-09-06) the table carries four outgoing lines — charged to fees, the
  reserve retention, the steward hardship pay, and the transfers — each capped, each
  published. Supporters are rows, never schema constants — the shape must be identical
  whether the supporter list has zero rows or many. Nothing is published here yet: no
  schema file, no example, no changelog section of its own. It lands as an additive new
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
- The company wrapper is **ratified** (2026-09-07; FS-00 §6.2 amendment note — see *Settled*
  above). Nothing in the file changed but its reconciliation note and the `x-psn.fsRefs`
  citation of the ratifying note: no property was added, removed or moved. 1.0.0 is amended
  in place because it is **unreleased** — nothing has been published against it; on a released
  version, policy 3 above makes a description fix a patch bump. There is one shape here, and
  there always was.

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

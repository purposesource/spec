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

Initial scaffold of the contract set. Nineteen schemas, the public read API description,
and the published reference implementation of the coverage function with its frozen test
vectors. Two of the nineteen are the money contracts of 2026-09-07 — `cost-support.v1.json`
and `recipient-list.v1.json` — which close the planned-but-unbuilt entry below.

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

#!/usr/bin/env node
/**
 * Gate: the contributor page's contracts say what the design and the operator ruled, beyond what
 * JSON Schema can say on its own (ops decision D116 and its dated notes of 2026-10-06; design
 * PROFILE-PAGE-2026-10-06).
 *
 *   contrast   `examples/contributor-page-contrast.v1.golden.json`, the theme table (slice P25): every
 *              figure is the WCAG 2.2 ratio of its colours, recomputed here; every text pair reaches
 *              4.5 on the ground and on the surface and every focus ring 3; the button text on each
 *              accent is whichever of white and black contrasts more; the rows are the eight presets
 *              of the two schemas, `purpose` in both modes, and a print row for each (design §4.3,
 *              §4.8). Beside it: `guard-ends`, every row's ink reaches the guard's 4.6 on its ground
 *              and its surface, so the accent guard always ends at k = 64 at the latest; `status`,
 *              the fixed chip tokens reach 4.5 in every mode and name a tone for every certificate
 *              status and repository listing the page schema has; `covers`, the eight gradients are
 *              the schemas' cover presets.
 *   accent     `examples/contributor-page-accent.v1.golden.json`: the gate's own reference of the
 *              accent guard (the settings schema's `theme.accent`) recomputes every case, k, stored
 *              colour and button text, for every ground; each expected accent is a valid
 *              `contributor-page.v1` `theme`; the cases cover each preset's own accent, white,
 *              black, the grounds, greys, primaries and pairs one channel step apart whose k
 *              differs; the seeded cases are exactly the generator's; no case is decided within
 *              1e-9 of 4.6, so .NET and V8 cannot split one; the file names the theme table's
 *              SHA-256. `--print-accent-golden` prints the file recomputed from its own
 *              hand-picked cases and generator, for when the theme table moves.
 *   ground     `examples/contributor-page-ground.v1.golden.json` (1.1.0; ops decision D149 item 2):
 *              the gate's own reference of the ground guard (the settings schema's `theme.ground`)
 *              recomputes every case's k and row, and the file's rule is held to the theme table
 *              (purpose's inks, the guard's 4.6, the ring's 3); the cases cover white, black, the
 *              primaries, every preset's ground, greys, both modes kept and moved, and neighbour pairs
 *              whose k or mode flips; the seeded cases are the generator's; no case is decided within
 *              1e-9 of a threshold; the guard runs over a 16-step grid of every channel and each row
 *              meets the renderer's figures. Every palette row is its preset's own row with only the
 *              ground changed, its ratios recompute and reach 4.6 (text) and 3 (ring and logo), its ids
 *              are the schemas' `$defs.groundId`; and every document theme (a preset, a ground and an
 *              accent) is the builder's, a valid `contributor-page.v1` `theme`, a palette id of
 *              another preset refused. `--print-ground-golden` prints the file recomputed.
 *   preview    `examples/contributor-page-preview.v1.golden.json`: each vector's document is a
 *              valid `contributor-page.v1`, its preimage is the document reduced exactly as that
 *              schema's description defines, its text is the RFC 8785 form of the preimage, and
 *              `previewSha256` is the SHA-256 of that text's UTF-8 bytes (design §3.6). The vectors
 *              between them reduce a GitHub picture, keep an upload, drop a card's files, drop an
 *              organisation's picture (1.5.0) and carry non-ASCII text. Every string of a preimage is well-formed Unicode: a lone
 *              surrogate is refused, never serialised (I-JSON, as RFC 8785 assumes).
 *   alias      `examples/contributor-page-alias.v1.golden.json`: each vector's message, HMAC-SHA256
 *              under the published test key, and addressMac (the first 26 characters of the
 *              digest's lower-case unpadded base32) recompute, and the vectors include a login in
 *              mixed case that gives the same MAC as its lower-case form (design §7.2).
 *   build      `examples/contributor-page-build.v1.golden.json`: on a page without the login, no
 *              repository under the person's own account is listed or counted, and one selected
 *              by hand is refused (contributor-page.v1 `repositoriesSection`; settings check (j)).
 *              The gate's own reading of that one builder rule answers every vector, and each
 *              expected section is a valid `repositoriesSection`.
 *   about      `examples/contributor-page-about.v1.example.json`, our versioned words for the page's about
 *              block (1.2.0; ops decision D163): its versions run 1 to `current` with no gap, and each
 *              entry's `sha256` recomputes and equals the digest this gate records for that version
 *              (ABOUT_FROZEN), so a published text never changes and new words are a new version; the
 *              frame and the invites hold their one placeholder, the two invites differ by " too"
 *              alone, each plural noun has two forms, each text keeps within its length, and a `lint`
 *              marker goes with exactly the paragraphs that name the predecessor (D25). Beside it,
 *              `examples/contributor-page-about.v1.golden.json`: the proof sentence and the invite
 *              composed from a document's sections (the eleven combinations, singular forms, revoked
 *              and superseded certificates left out, the fallback, the invite withheld where
 *              certificates are not issued, whose planes it names with the sample following
 *              production) and whole blocks per variant, recomputed by the gate's
 *              own reading of the rule from the texts the file names by hash. And the build golden's
 *              `about` vectors: what the builder writes for the settings' about block (nothing with
 *              the tick off; Short for own words that do not exist or that the rules now refuse). And from
 *              1.3.0 (ops decision D165) the build golden's `cards` vectors: the builder writes the three
 *              members resolved, each the settings' choice or its default, on every document, and between
 *              them the vectors give every value of every member, none, some and all three chosen.
 *   adopter    1.4.0 (ops decision D168 item 3): `since` and `until` on an adopter item are years and
 *              optional; on every page example and preview vector `until` stands only beside `since` and
 *              never before it (the order a schema cannot hold), and some vector carries both. The build
 *              golden's `adopter` vectors are answered by the gate's own reading of the builder's rule: a
 *              registered repository listed with `since` where it is known; one that left (not registered,
 *              with the recorded quit's year) listed only with both years in order; every other one dropped;
 *              the person's hide, an evidence no link can be rebuilt from and the first fact per repository
 *              kept; `until` written on a left item alone; and between them the vectors give each case.
 *   organisations
 *              1.5.0 (ops decision D165 item 3, the organisation's picture): on every page example and preview vector, a
 *              repository group's or an adopter item's `picture` stands only where `autoUpdated` names
 *              `organisation-pictures` (so only while the cards' icon is the owner's), never on the document's own login,
 *              and one login carries one `h16` on the whole page (the rules a schema cannot hold); some vector names a
 *              copy on a group and on an item, so its hash proves step (4) of the preview hash drops them. The build
 *              golden's `organisations` vectors are answered by the gate's own reading of the builder's judgment: a login
 *              is an organisation's only while the icon is `owner`, it is not the person's own, and every repository the
 *              page shows under it has GitHub's stored answer, each an `Organization`, one owner, under that login; and
 *              between them the vectors give a copy named and one not drawn, the icon off, an answer missing, two owners,
 *              a login that moved, the person's own login, both sections at once, a folded case and a person's
 *              repository, whose owner's id no expected entry ever names.
 *   months     1.6.0 (a certificate's period by its months; the orchestrator's answer of 2026-10-21T20:26Z): on every page
 *              example and preview vector every certificate item carries `months`, as the one builder writes it on every
 *              item, two `YYYY-MM` months with `from` no later than `to` and each in the year `years` names on its side (the
 *              order and the years, which a schema cannot hold); and some vector carries a period that is not one whole
 *              calendar year, so its hash pins the months the years cannot say.
 *   cards      1.3.0 (ops decision D165): `cards` is optional in both schemas and so is each member; the
 *              settings' `default` is its members' defaults, which are D165 item 3's (the owner's icon, an
 *              own repository by its name, another owner's as owner/name), and the document's members
 *              default alike; every page example and preview vector carries the member with its three
 *              members, as the builder writes it from 1.3.0; and a settings example stores it as the api
 *              does, each member left out at its default and the member itself when nothing is left.
 *   never      no member of the three page schemas is named for points, shares, bands, ranks,
 *              percentiles, scores, months, amounts or a person's GitHub id, and no published page
 *              example or vector carries a currency figure, a person's GitHub node id (the current
 *              `U_` form or the legacy base64 "04:User" form) or a GitHub picture address (design
 *              §8.7; the plan's correction 11; design correction 5). One member alone is admitted by
 *              its place, a certificate item's `months` (1.6.0): that certificate's own validity period,
 *              which its public record states, never a month of the monthly credit records (design §8.1).
 *   defaults   the `defaults` settings example is the schema's `default` for every required member,
 *              so the document a new person starts from is the one the schema describes (status-only by
 *              default, the GitHub picture; design §2.4 and the D116 dated note of ~11:50Z), and it
 *              leaves every optional member out (1.1.0: the api writes one only when it differs from
 *              its default, so a document stored before it keeps its bytes and its hash), but for the
 *              ones the schema lists in `x-psn.alwaysWritten` (1.2.0: `about`), which it carries at their
 *              default, `about.version` being the texts' `current`.
 *   agree      the closed lists the settings and the public document share are the same lists (1.1.0:
 *              the links' two places, the display parts and the palette ids among them; 1.3.0: the cards'
 *              icons and their two name forms).
 *   facts      in the page examples (1.1.0's further two among them), every link is its table template with its handle, and the
 *              summary's counts are the rows the page shows (design §8.1: a count never reveals a
 *              hidden row).
 *   refusals   the schemas refuse what the design rules out, proved on copies of the examples: a
 *              `subId` or a `points` member, search off the login address, an address or adopter
 *              section without the login, a certificate whose display does not match the page, a
 *              page with no vouched section, a duplicate section, a raw picture URL, a link that is
 *              not an https address, a link handle outside its platform's characters, a Matrix id
 *              shaped like a path, a person's node id where a repository's belongs, a
 *              `generatedAt` finer than its day, two links for one platform, a Mastodon link with
 *              no instance, an upper-case or short colour, a bio with four line breaks, a name with
 *              a bidi override, and an alias carrying a login; and from 1.1.0 (ops decision D149) a
 *              link or a GitHub line that shows nothing, a display with a part too few or too many, a
 *              website display with a handle, the GitHub line's parts on a page without the login, a
 *              third place for the links, a background that is neither a palette id nor a lower-case
 *              colour, a ground without an accent, a night row off `purpose` or under an own colour, a
 *              `purpose` swatch without its night row or its accent's night colour, and an own colour
 *              whose accent keeps one; and from 1.2.0 (ops decision D163) own words of 601 code points or
 *              six line breaks or a bidi override, an about block without its version or at version 0, a
 *              fifth variant, a member of the document's about block the settings own (the tick) or our
 *              words in it, and own words in the document under another variant or own without them; and
 *              from 1.3.0 (ops decision D165) a fourth icon, a name form of its own, an unknown member of
 *              `cards` or another shape for it, in either schema, and the viewer's list toggle stored in
 *              the document.
 *   admits     what 1.1.0 adds is admitted, proved on copies of the examples: icon-only links beside
 *              the name, the GitHub line's parts, the website's display, a palette swatch and an own
 *              colour in the settings, and a `purpose` pair, an own colour and a swatch of another
 *              preset in the document; and what 1.2.0 adds: own words not yet written, own words kept
 *              under another variant or with the tick off, 600 code points and five line breaks, and in
 *              the document our Medium text, a later version, and no about block at all; and what 1.3.0
 *              adds: no `cards` at all, one member alone and the defaults stated, in either schema; and what
 *              1.4.0 adds: no year on any adopter item, `since` alone, and a left item within one year. And
 *              1.4.0's refusals: `until` without `since`, a year before 2026, a month or an instant for a
 *              year, and a marker of a leave of its own. And 1.5.0's: an organisation's picture as an address,
 *              with a member of its own, as a bare string or with a malformed `h16`, and `organisation-pictures`
 *              kept current under the GitHub mark; and what it admits: `organisation-pictures` with no copy named
 *              yet, and a copy on an adopter item alone. And 1.6.0's: a certificate's months with a day, a thirteenth
 *              month, a month before 2026, a number for a month, `from` alone, a member of their own, the period as
 *              words, and months on a project's row or in the summary; and what it admits: a certificate item without
 *              `months` (built before 1.6.0), and a period across two years.
 *   goldens    every `examples/*.golden.json` is one a gate checks.
 *
 * Every rule is proved able to fail before the examples are trusted to pass.
 *
 * Run: node scripts/check-contributor-page.mjs
 */
import { createHash, createHmac } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { EXAMPLE_DIR, config, createValidatorWithAllSchemas, readJson, fail } from './lib/spec.mjs';
import { rebuild, parseWebsite } from './lib/link-rules.mjs';

const cfg = config();
const { ajv, schemas } = createValidatorWithAllSchemas();
const schemaJson = (file) => schemas.find((s) => s.file === file)?.json;
const validator = (file) => ajv.getSchema(`${cfg.schemaBaseUrl}/${file}`);
const example = (name) => readJson(join(EXAMPLE_DIR, name));

const PAGE = 'contributor-page.v1.json';
const SETTINGS = 'contributor-page-settings.v1.json';
const ALIAS = 'contributor-page-alias.v1.json';
const PAGE_EXAMPLES = ['contributor-page.v1.example.json', 'contributor-page.v1.anonymous.example.json'];
const GOLDENS = [
  'link-rules.v1.golden.json',
  'contributor-page-contrast.v1.golden.json',
  'contributor-page-accent.v1.golden.json',
  'contributor-page-preview.v1.golden.json',
  'contributor-page-alias.v1.golden.json',
  'contributor-page-build.v1.golden.json',
  'contributor-page-ground.v1.golden.json',
  'contributor-page-about.v1.golden.json'
];

const table = example('link-platforms.v1.example.json');
const THEME_FILE = 'contributor-page-contrast.v1.golden.json';
const ACCENT_FILE = 'contributor-page-accent.v1.golden.json';
const real = {
  contrast: example(THEME_FILE),
  themeSha256: createHash('sha256').update(readFileSync(join(EXAMPLE_DIR, THEME_FILE))).digest('hex'),
  accent: example(ACCENT_FILE),
  preview: example('contributor-page-preview.v1.golden.json'),
  aliasGolden: example('contributor-page-alias.v1.golden.json'),
  build: example('contributor-page-build.v1.golden.json'),
  ground: example('contributor-page-ground.v1.golden.json'),
  page: example('contributor-page.v1.example.json'),
  anonymous: example('contributor-page.v1.anonymous.example.json'),
  // 1.1.0's further examples (ops decision D149): the links beside the name with icon-only links and a purpose pair; an own colour.
  header: example('contributor-page.v1.header.example.json'),
  ownGround: example('contributor-page.v1.own-ground.example.json'),
  // 1.2.0's further examples (ops decision D163): our Medium text on the commonest launch page; the person's own words.
  aboutPage: example('contributor-page.v1.about.example.json'),
  aboutOwnPage: example('contributor-page.v1.about-own.example.json'),
  aboutSettings: example('contributor-page-settings.v1.about-own.example.json'),
  aboutTexts: example('contributor-page-about.v1.example.json'),
  aboutTextsSha256: createHash('sha256').update(readFileSync(join(EXAMPLE_DIR, 'contributor-page-about.v1.example.json'))).digest('hex'),
  aboutGolden: example('contributor-page-about.v1.golden.json'),
  // 1.3.0's further examples (ops decision D165): the GitHub mark on every card and every repository named alone.
  cardsPage: example('contributor-page.v1.cards.example.json'),
  cardsSettings: example('contributor-page-settings.v1.cards.example.json'),
  // 1.4.0's further example (ops decision D168 item 3): the licence adopter's years, a repository that left among them.
  adopterYearsPage: example('contributor-page.v1.adopter-years.example.json'),
  // 1.5.0's further example (ops decision D165 item 3): an organisation's picture on its group and its adopter item.
  organisationPage: example('contributor-page.v1.organisation-pictures.example.json'),
  settingsExamples: Object.fromEntries(
    readdirSync(EXAMPLE_DIR)
      .filter((name) => name.startsWith('contributor-page-settings.v1.') && name.endsWith('.example.json'))
      .sort()
      .map((name) => [name, example(name)])
  ),
  settings: example('contributor-page-settings.v1.example.json'),
  defaults: example('contributor-page-settings.v1.defaults.example.json'),
  alias: example('contributor-page-alias.v1.example.json'),
  schemas: { page: schemaJson(PAGE), settings: schemaJson(SETTINGS), alias: schemaJson(ALIAS), about: schemaJson('contributor-page-about.v1.json') }
};

/* ------------------------------------------------------------------------- contrast */

const linear = (c) => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * linear((n >> 16) & 255) + 0.7152 * linear((n >> 8) & 255) + 0.0722 * linear(n & 255);
};
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const twoDecimals = (x) => Math.round(x * 100) / 100;
const HEX = /^#[0-9a-f]{6}$/;

/** Whichever of white and black contrasts more with a colour (white on a tie). */
const buttonText = (hex) => (ratio('#ffffff', hex) >= ratio('#000000', hex) ? '#ffffff' : '#000000');
const ROW_COLOURS = ['ground', 'surface', 'ink', 'muted', 'accent', 'onAccent', 'focus', 'rule'];
const TONE_KEYS = ['text', 'background', 'border'];

function contrastProblems(golden, settingsSchema, pageSchema) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/contributor-page-contrast.v1.golden.json: ${message}`]);
  const presets = settingsSchema.$defs.preset.enum;
  const pagePresets = pageSchema.properties.theme.properties.preset.enum;
  if (presets.join(',') !== pagePresets.join(',')) add('contrast', 'the two schemas list different presets');
  const rows = golden.rows ?? [];
  if (rows.length === 0) add('contrast', 'no rows — this gate would pass vacuously');
  if (golden.minimums?.text !== 4.5 || golden.minimums?.focus !== 3) add('contrast', 'the minimums are 4.5 for text (WCAG 2.2 AA) and 3 for a focus ring');
  if (golden.minimums?.guard !== 4.6) add('guard-ends', 'the guard minimum is 4.6: the renderer requires 4.5, and the 0.1 between them absorbs float differences (design §4.3)');
  const modes = new Map();
  for (const row of rows) {
    const where = `${row.preset}/${row.mode}`;
    modes.set(row.preset, [...(modes.get(row.preset) ?? []), row.mode]);
    const malformed = ROW_COLOURS.filter((key) => !HEX.test(row[key] ?? ''));
    if (malformed.length > 0) {
      add('contrast', `${where}: ${malformed.join(', ')} not #rrggbb`);
      continue;
    }
    const ring = golden.focusRings?.[row.mode === 'print' ? 'light' : row.mode];
    if (row.focus !== ring) add('contrast', `${where}: the focus ring is not the ${row.mode === 'print' ? 'light (print)' : row.mode} ring of focusRings`);
    if (row.onAccent !== buttonText(row.accent)) add('contrast', `${where}: the button text must be ${buttonText(row.accent)}, whichever of white and black contrasts more with the accent`);
    if (row.mode === 'print' && (row.ground !== '#ffffff' || row.surface !== '#ffffff')) add('print', `${where}: print is one column on white (design §4.8), so its ground and surface are #ffffff`);
    const onGround = {
      ink: ratio(row.ink, row.ground),
      muted: ratio(row.muted, row.ground),
      accent: ratio(row.accent, row.ground),
      onAccent: ratio(row.onAccent, row.accent),
      focus: ratio(row.focus, row.ground)
    };
    const onSurface = {
      ink: ratio(row.ink, row.surface),
      muted: ratio(row.muted, row.surface),
      accent: ratio(row.accent, row.surface),
      focus: ratio(row.focus, row.surface)
    };
    for (const [member, rule, computed] of [['ratios', 'contrast', onGround], ['surfaceRatios', 'surface', onSurface]]) {
      if (Object.keys(row[member] ?? {}).sort().join(',') !== Object.keys(computed).sort().join(',')) add(rule, `${where}: ${member} must name exactly ${Object.keys(computed).join(', ')}`);
      for (const [pair, value] of Object.entries(computed)) {
        if (row[member]?.[pair] !== twoDecimals(value)) add(rule, `${where}: ${member}.${pair} is recorded as ${row[member]?.[pair]}, WCAG 2.2 gives ${twoDecimals(value)}`);
        const minimum = pair === 'focus' ? golden.minimums.focus : golden.minimums.text;
        if (value < minimum) add(rule, `${where}: ${pair} at ${twoDecimals(value)}:1 on the ${member === 'ratios' ? 'ground' : 'surface'} is below ${minimum}:1`);
      }
    }
    const inkWorst = Math.min(onGround.ink, onSurface.ink);
    if (inkWorst < golden.minimums.guard) {
      add('guard-ends', `${where}: the ink reaches only ${twoDecimals(inkWorst)}:1 on the ground or the surface; the accent guard ends at the ink (k = 64), so the ink must reach ${golden.minimums.guard}`);
    }
  }
  for (const preset of presets) {
    const seen = (modes.get(preset) ?? []).sort();
    const screen = seen.filter((m) => m !== 'print').join(',');
    if (preset === 'purpose' ? screen !== 'dark,light' : !['light', 'dark'].includes(screen)) {
      add('contrast', `${preset} has rows for [${seen}]; \`purpose\` follows the visitor and needs both modes, every other preset one`);
    } else if (seen.filter((m) => m === 'print').length !== 1) {
      add('print', `${preset} has rows for [${seen}]; every preset has exactly one print row (design §4.8)`);
    }
  }
  for (const preset of modes.keys()) if (!presets.includes(preset)) add('contrast', `${preset} is not a preset of the schemas`);
  found.push(...statusProblems(golden.status, pageSchema, golden.minimums.text));
  found.push(...coverProblems(golden.covers, settingsSchema, pageSchema));
  return found;
}

/** The fixed status tokens: per mode, each tone's text on its background; a tone for every status the page can carry. */
function statusProblems(status, pageSchema, minimum) {
  const found = [];
  const add = (message) => found.push(['status', `examples/contributor-page-contrast.v1.golden.json: status: ${message}`]);
  const tones = status?.tones ?? {};
  if (Object.keys(tones).sort().join(',') !== 'dark,light,print') add('tones are needed for exactly the modes light, dark and print');
  const names = Object.keys(tones.light ?? {});
  if (names.length === 0) add('no tones — this gate would pass vacuously');
  for (const [mode, set] of Object.entries(tones)) {
    if (Object.keys(set).join(',') !== names.join(',')) add(`${mode} names the tones [${Object.keys(set)}], light names [${names}]`);
    for (const [tone, token] of Object.entries(set)) {
      const where = `${mode}/${tone}`;
      if (Object.keys(token).join(',') !== TONE_KEYS.join(',') || TONE_KEYS.some((key) => !HEX.test(token[key] ?? ''))) {
        add(`${where}: a tone is exactly {text, background, border}, each #rrggbb`);
        continue;
      }
      const value = ratio(token.text, token.background);
      if (status.ratios?.[mode]?.[tone] !== twoDecimals(value)) add(`${where}: recorded as ${status.ratios?.[mode]?.[tone]}, WCAG 2.2 gives ${twoDecimals(value)}`);
      if (value < minimum) add(`${where}: the chip's text at ${twoDecimals(value)}:1 on its background is below ${minimum}:1`);
      if (mode === 'print' && token.background !== '#ffffff') add(`${where}: a printer may drop backgrounds, so a print chip is drawn on white`);
    }
  }
  const items = pageSchema.$defs.certificatesSection.properties.items.items.properties;
  const listing = pageSchema.$defs.repositoriesSection.properties.groups.items.properties.repos.items.properties.listing;
  for (const [kind, values] of [['certificate', items.status.enum], ['listing', listing.enum]]) {
    const show = status?.show?.[kind] ?? {};
    if (Object.keys(show).join(',') !== values.join(',')) add(`show.${kind} names [${Object.keys(show)}]; contributor-page.v1 can carry [${values}], in that order`);
    for (const [value, tone] of Object.entries(show)) if (tone !== null && !names.includes(tone)) add(`show.${kind}.${value} names the tone ${tone}, which is not one of [${names}]`);
  }
  if (Object.keys(status?.show ?? {}).join(',') !== 'certificate,listing') add('show names exactly certificate and listing');
  return found;
}

function coverProblems(covers, settingsSchema, pageSchema) {
  const found = [];
  const add = (message) => found.push(['covers', `examples/contributor-page-contrast.v1.golden.json: covers: ${message}`]);
  const names = Object.keys(covers?.presets ?? {});
  if (names.join(',') !== settingsSchema.$defs.coverPreset.enum.join(',') || names.join(',') !== pageSchema.properties.cover.properties.preset.enum.join(',')) {
    add(`the presets are [${names}]; the schemas' cover presets are [${settingsSchema.$defs.coverPreset.enum}], in that order`);
  }
  if (!pageSchema.properties.cover.properties.angle.enum.includes(covers?.angle)) add(`the angle ${covers?.angle} is not one of the schema's [${pageSchema.properties.cover.properties.angle.enum}]`);
  for (const [name, gradient] of Object.entries(covers?.presets ?? {})) {
    if (Object.keys(gradient).join(',') !== 'from,to' || !HEX.test(gradient.from ?? '') || !HEX.test(gradient.to ?? '')) add(`${name} is exactly {from, to}, each #rrggbb`);
  }
  return found;
}

/* ----------------------------------------------------------------------- accent guard */

const GUARD_STEPS = 64;
const KNIFE_EDGE = 1e-9;
const channels = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toHex = (rgb) => `#${rgb.map((c) => c.toString(16).padStart(2, '0')).join('')}`;

/** The raw colour mixed toward the ink by k/64, each channel floor((raw × (64 − k) + ink × k + 32) / 64): rounded half up. */
function mix(raw, ink, k) {
  const a = channels(raw);
  const b = channels(ink);
  return toHex(a.map((c, i) => Math.floor((c * (GUARD_STEPS - k) + b[i] * k + 32) / GUARD_STEPS)));
}

/** The rows a preset's accent is adjusted for, under the keys contributor-page.v1 `theme.accent` stores them by. */
function guardRows(theme, preset) {
  const rows = theme.rows.filter((r) => r.preset === preset);
  const own = preset === 'purpose' ? rows.find((r) => r.mode === 'light') : rows.find((r) => r.mode !== 'print');
  return {
    light: own,
    ...(preset === 'purpose' ? { dark: rows.find((r) => r.mode === 'dark') } : {}),
    print: rows.find((r) => r.mode === 'print')
  };
}

/**
 * The accent guard as contributor-page-settings.v1 `theme.accent` defines it (design §4.3 and its
 * P25 reading): the gate's own reference, not the api's C#. For one ground: the first k whose mix
 * toward that row's ink reaches the guard minimum against both the row's ground and its surface,
 * with the decisive figures at k and at k − 1.
 */
function guard(raw, row, minimum) {
  const worst = (colour) => Math.min(ratio(colour, row.ground), ratio(colour, row.surface));
  for (let k = 0; k <= GUARD_STEPS; k++) {
    const colour = mix(raw, row.ink, k);
    const at = worst(colour);
    if (at >= minimum) return { k, colour, at, before: k > 0 ? worst(mix(raw, row.ink, k - 1)) : null };
  }
  return null;
}

/** One case as the golden file records it, recomputed. */
function accentCase(theme, preset, raw) {
  const rows = guardRows(theme, preset);
  const accent = { raw };
  const k = {};
  const onAccent = {};
  const margins = [];
  for (const [ground, row] of Object.entries(rows)) {
    const answer = row ? guard(raw, row, theme.minimums.guard) : null;
    if (!answer) return null;
    accent[ground] = answer.colour;
    k[ground] = answer.k;
    onAccent[ground] = buttonText(answer.colour);
    margins.push(answer.at - theme.minimums.guard);
    if (answer.before !== null) margins.push(theme.minimums.guard - answer.before);
  }
  return { accent, k, onAccent, margin: Math.min(...margins) };
}

/** xorshift32 (Marsaglia 2003: shifts 13, 17, 5) over an unsigned 32-bit state. */
function seededRaws(generator, presets) {
  let x = generator.seed >>> 0;
  const next = () => {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    return x;
  };
  const out = [];
  for (let i = 0; i < generator.count; i++) {
    const a = next();
    const b = next();
    out.push({ id: `AS-${String(i + 1).padStart(3, '0')}`, preset: presets[a % presets.length], raw: `#${(b & 0xffffff).toString(16).padStart(6, '0')}` });
  }
  return out;
}

const SEEDED = /^AS-\d{3}$/;
const PRIMARIES = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff'];
const isGrey = (hex) => new Set(channels(hex)).size === 1 && hex !== '#000000' && hex !== '#ffffff';
const validateTheme = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/properties/theme`);

function accentProblems(golden, theme, themeSha256, presets) {
  const found = [];
  const add = (message) => found.push(['accent', `examples/contributor-page-accent.v1.golden.json: ${message}`]);
  if (golden.themeSha256 !== themeSha256) add(`themeSha256 is ${golden.themeSha256}; the theme table these cases were computed against hashes to ${themeSha256}`);
  const cases = golden.cases ?? [];
  if (cases.length === 0) add('no cases — this gate would pass vacuously');
  const ids = new Set();
  for (const c of cases) {
    if (ids.has(c.id)) add(`${c.id} appears twice`);
    ids.add(c.id);
    if (!presets.includes(c.preset) || !HEX.test(c.raw ?? '')) {
      add(`${c.id}: a case names one of the presets and a raw #rrggbb in lower case`);
      continue;
    }
    const got = accentCase(theme, c.preset, c.raw);
    if (!got) {
      add(`${c.id}: the guard did not end for ${c.preset} ${c.raw}`);
      continue;
    }
    for (const member of ['accent', 'k', 'onAccent']) {
      if (JSON.stringify(sortDeep(c[member])) !== JSON.stringify(sortDeep(got[member]))) add(`${c.id}: ${member} is ${JSON.stringify(c[member])}, the guard gives ${JSON.stringify(got[member])}`);
    }
    if (got.margin < KNIFE_EDGE) add(`${c.id}: decided within ${KNIFE_EDGE} of ${theme.minimums.guard}, where two float implementations could answer differently; choose another colour`);
    if (!validateTheme({ preset: c.preset, accent: c.accent })) add(`${c.id}: the stored accent is not a valid contributor-page.v1 theme (${ajv.errorsText(validateTheme.errors)})`);
  }
  // The seeded cases are exactly the generator's.
  const generator = golden.generator ?? {};
  if (generator.algorithm !== 'xorshift32' || !Number.isInteger(generator.seed) || generator.seed <= 0 || generator.seed > 0xffffffff || !Number.isInteger(generator.count)) {
    add('generator is {algorithm: "xorshift32", seed: a positive 32-bit integer, count}');
  } else {
    const expected = seededRaws(generator, presets);
    const seeded = cases.filter((c) => SEEDED.test(c.id));
    if (generator.count < 120) add(`the generator gives ${generator.count} cases; at least 120 are required`);
    if (JSON.stringify(seeded.map((c) => [c.id, c.preset, c.raw])) !== JSON.stringify(expected.map((c) => [c.id, c.preset, c.raw]))) {
      add(`the seeded cases are not the ${generator.count} the generator gives from seed ${generator.seed}`);
    }
  }
  // What the hand-picked cases must cover.
  const has = (preset, raw, test = () => true) => cases.some((c) => c.preset === preset && c.raw === raw && test(c));
  for (const preset of presets) {
    const rows = guardRows(theme, preset);
    if (!rows.light || !rows.print || (preset === 'purpose' && !rows.dark)) {
      add(`the theme table lacks a row the guard reads for ${preset}`);
      continue;
    }
    if (!has(preset, rows.light.accent, (c) => c.k.light === 0)) add(`no case gives ${preset} its own accent ${rows.light.accent} at k = 0`);
    if (rows.dark && !has(preset, rows.dark.accent, (c) => c.k.dark === 0)) add(`no case gives ${preset} its own dark accent ${rows.dark.accent} at k = 0`);
    if (!has(preset, rows.print.accent, (c) => c.k.print === 0)) add(`no case gives ${preset} its own print accent ${rows.print.accent} at k = 0`);
    for (const [what, raw] of [['white', '#ffffff'], ['black', '#000000'], ['its own ground', rows.light.ground]]) if (!has(preset, raw)) add(`no case gives ${preset} ${what} (${raw})`);
    if (!cases.some((c) => c.preset === preset && isGrey(c.raw))) add(`no case gives ${preset} a mid grey`);
    for (const raw of PRIMARIES) if (!has(preset, raw)) add(`no case gives ${preset} the primary ${raw}`);
  }
  for (const ground of ['light', 'dark', 'print']) if (!cases.some((c) => c.k[ground] > 0)) add(`no case adjusts the ${ground} ground (k > 0)`);
  const flips = new Set();
  for (const a of cases) {
    for (const b of cases) {
      if (a.preset !== b.preset || a.id >= b.id) continue;
      const da = channels(a.raw);
      const db = channels(b.raw);
      if (da.reduce((n, c, i) => n + Math.abs(c - db[i]), 0) !== 1) continue;
      for (const ground of Object.keys(a.k)) if (a.k[ground] !== b.k[ground]) flips.add(`${a.preset}/${ground}/${Math.min(a.k[ground], b.k[ground]) === 0 ? 'edge' : 'middle'}`);
    }
  }
  if (flips.size < 6) add(`only ${flips.size} kinds of neighbour pairs whose k differs ([${[...flips]}]); the guard's threshold needs at least 6, at k = 0 and further along, on all three grounds`);
  for (const ground of ['light', 'dark', 'print']) if (![...flips].some((f) => f.split('/')[1] === ground)) add(`no neighbour pair flips k on the ${ground} ground`);
  return found;
}

/** The golden file, recomputed from its own hand-picked cases and its generator (`--print-accent-golden`). */
function accentGoldenText(golden, theme, themeSha256, presets) {
  const hand = (golden.cases ?? []).filter((c) => !SEEDED.test(c.id)).map((c) => ({ id: c.id, preset: c.preset, raw: c.raw, ...(c.note ? { note: c.note } : {}) }));
  const seeded = seededRaws(golden.generator, presets);
  const cases = [...hand, ...seeded].map((c) => {
    const got = accentCase(theme, c.preset, c.raw);
    return { ...c, accent: got.accent, k: got.k, onAccent: got.onAccent };
  });
  const head = { ...golden, themeSha256 };
  delete head.cases;
  const text = JSON.stringify(head, null, 2);
  return `${text.slice(0, -2)},\n  "cases": [\n${cases.map((c) => `    ${JSON.stringify(c)}`).join(',\n')}\n  ]\n}\n`;
}

/* ----------------------------------------------------------------------- ground guard */

const GROUND_FILE = 'contributor-page-ground.v1.golden.json';
const SEEDED_GROUND = /^GS-\d{3}$/;
const ROW_KEYS = ['mode', 'ground', 'surface', 'ink', 'muted', 'rule', 'focus'];
const MARK = { light: '#000000', dark: '#ffffff' };

/**
 * The ground guard as contributor-page-settings.v1 `theme.ground` defines it (design CPAGE-REFINEMENTS-2026-10-15 §5.4):
 * the gate's own reference, not the api's C#. Answers the row, the k, and the smallest distance from a threshold that
 * decided it (the choice of k, the side on a tie, the muted step, the focus ring), so a case no two implementations
 * could split is recognisable.
 */
function groundGuard(raw, spec, rings) {
  const margins = [];
  for (let k = 0; k <= spec.steps; k++) {
    const light = mix(raw, '#ffffff', k);
    const dark = mix(raw, '#000000', k);
    const onLight = ratio(light, spec.inks.light);
    const onDark = ratio(dark, spec.inks.dark);
    margins.push(Math.abs(onLight - spec.target), Math.abs(onDark - spec.target));
    if (onLight < spec.target && onDark < spec.target) continue;
    let mode;
    if (onLight >= spec.target && onDark >= spec.target) {
      mode = onLight >= onDark ? 'light' : 'dark';
      margins.push(Math.abs(onLight - onDark));
    } else {
      mode = onLight >= spec.target ? 'light' : 'dark';
    }
    const ground = mode === 'light' ? light : dark;
    const surface = mix(ground, '#ffffff', spec.surfaceSteps[mode]);
    const ink = spec.inks[mode];
    const worst = (colour) => Math.min(ratio(colour, ground), ratio(colour, surface));
    let muted = ink;
    for (let m = 0; m <= spec.mutedSteps; m++) {
      const candidate = mix(ink, ground, m);
      const at = worst(candidate);
      margins.push(Math.abs(at - spec.muted));
      if (at >= spec.muted) muted = candidate;
    }
    const ring = rings[mode];
    const ringAt = worst(ring);
    margins.push(Math.abs(ringAt - spec.focus));
    const focus = ringAt >= spec.focus ? ring : ink;
    const rule = mix(ground, ink, spec.ruleSteps);
    return { k, row: { mode, ground, surface, ink, muted, rule, focus }, margin: Math.min(...margins) };
  }
  return null;
}

const gridMemo = new Map();

/** The guard over every colour of a 16-step grid of each channel (4,096 colours), memoised per rule: the self-tests rerun it. */
function gridProblems(spec, rings, minimums) {
  const key = JSON.stringify([spec, rings, minimums]);
  if (gridMemo.has(key)) return gridMemo.get(key);
  const found = [];
  for (let r = 0; r < 256; r += 17) {
    for (let g = 0; g < 256; g += 17) {
      for (let b = 0; b < 256; b += 17) {
        const raw = toHex([r, g, b]);
        const got = groundGuard(raw, spec, rings);
        if (!got) {
          found.push(`the guard does not end for ${raw}`);
          continue;
        }
        const worst = (colour) => Math.min(ratio(colour, got.row.ground), ratio(colour, got.row.surface));
        if (worst(got.row.ink) < minimums.text || worst(got.row.muted) < minimums.text || worst(got.row.focus) < minimums.focus) found.push(`the guard's row for ${raw} fails the renderer's check`);
      }
    }
  }
  gridMemo.set(key, found);
  return found;
}

/** A palette swatch's row: the preset's own row of that mode, with only the ground (and the surface and rule it gives) changed. */
function paletteRow(own, ground, spec) {
  return {
    mode: own.mode,
    ground,
    surface: mix(ground, '#ffffff', spec.surfaceSteps[own.mode]),
    ink: own.ink,
    muted: own.muted,
    rule: mix(ground, own.ink, spec.ruleSteps),
    focus: own.focus
  };
}

/** The ratios a palette row is held to: text, the preset's own accent and the focus ring against its ground and its surface, and the logo's colour. */
function rowRatios(row, accent) {
  const worst = (colour) => twoDecimals(Math.min(ratio(colour, row.ground), ratio(colour, row.surface)));
  return { ink: worst(row.ink), muted: worst(row.muted), accent: worst(accent), focus: worst(row.focus), mark: worst(MARK[row.mode]) };
}

/** The theme table's rows of one preset: its own row of each mode, and its print row. */
function presetRows(theme, preset) {
  const rows = theme.rows.filter((r) => r.preset === preset);
  return { light: rows.find((r) => r.mode === 'light'), dark: rows.find((r) => r.mode === 'dark'), print: rows.find((r) => r.mode === 'print'), own: rows.find((r) => r.mode !== 'print' && (preset !== 'purpose' || r.mode === 'light')) };
}

/**
 * The public document's `theme` for a preset, a ground (null, a palette id or `#rrggbb`) and an accent (null or
 * `#rrggbb`), as contributor-page.v1 `theme` and `theme.accent` define it: the gate's own reading of the builder. With
 * no ground it is the accent guard's answer of 1.0.0. With a ground, the accent is always present, adjusted against the
 * ground's rows and the print row, from the person's accent, or from the preset's own accent for each row (on `purpose`
 * its row of the same mode, otherwise its one row, and the print row's for print), `raw` being the light row's.
 */
function themeFor(themeTable, golden, preset, ground, accent) {
  const rows = presetRows(themeTable, preset);
  const minimum = themeTable.minimums.guard;
  if (!rows.own || !rows.print || (preset === 'purpose' && (!rows.light || !rows.dark))) return null;
  if (ground === null) {
    if (accent === null) return { theme: { preset }, k: {} };
    const got = accentCase(themeTable, preset, accent);
    return got ? { theme: { preset, accent: got.accent }, k: got.k } : null;
  }
  let groundRows;
  if (HEX.test(ground)) {
    const answer = groundGuard(ground, golden.guard, themeTable.focusRings);
    if (!answer) return null;
    groundRows = { light: answer.row };
  } else {
    const swatch = (golden.palettes?.[preset] ?? []).find((s) => s.id === ground);
    if (!swatch) return { refused: 'not_in_palette' };
    groundRows = { light: swatch.light, ...(swatch.dark ? { dark: swatch.dark } : {}) };
  }
  const startFrom = (key, row) => {
    if (accent !== null) return accent;
    if (key === 'print') return rows.print.accent;
    if (preset === 'purpose') return rows[row.mode].accent;
    return rows.own.accent;
  };
  const grounds = { light: groundRows.light, ...(groundRows.dark ? { dark: groundRows.dark } : {}), print: rows.print };
  const stored = {};
  const k = {};
  for (const [key, row] of Object.entries(grounds)) {
    const answer = guard(startFrom(key, row), row, minimum);
    if (!answer) return null;
    stored[key] = answer.colour;
    k[key] = answer.k;
  }
  const raw = startFrom('light', groundRows.light);
  return {
    theme: { preset, accent: { raw, ...stored }, ground: { raw: ground, ...groundRows } },
    k
  };
}

/** xorshift32 draws as the accent golden's generator, one per case: raw = the draw mod 2^24. */
function seededGrounds(generator) {
  let x = generator.seed >>> 0;
  const out = [];
  for (let i = 0; i < generator.count; i++) {
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    x >>>= 0;
    out.push({ id: `GS-${String(i + 1).padStart(3, '0')}`, raw: `#${(x & 0xffffff).toString(16).padStart(6, '0')}` });
  }
  return out;
}

const validateGroundRow = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/$defs/groundRow`);

function groundProblems(golden, themeTable, themeSha256, settingsSchema, pageSchema) {
  const found = [];
  const add = (message) => found.push(['ground', `examples/${GROUND_FILE}: ${message}`]);
  if (golden.themeSha256 !== themeSha256) add(`themeSha256 is ${golden.themeSha256}; the theme table hashes to ${themeSha256}`);
  const spec = golden.guard ?? {};
  const purpose = presetRows(themeTable, 'purpose');
  const expectedSpec = {
    steps: 64,
    target: 7,
    inks: { light: purpose.light?.ink, dark: purpose.dark?.ink },
    surfaceSteps: { light: 32, dark: 4 },
    mutedSteps: 40,
    muted: themeTable.minimums.guard,
    ruleSteps: 10,
    focus: themeTable.minimums.focus
  };
  if (JSON.stringify(sortDeep(spec)) !== JSON.stringify(sortDeep(expectedSpec))) {
    add(`guard is ${JSON.stringify(spec)}; the schema's rule over this theme table is ${JSON.stringify(expectedSpec)} (the inks are purpose's, the muted figure the guard minimum, the focus figure the table's)`);
    return found;
  }

  // The guard's cases.
  const cases = golden.cases ?? [];
  if (cases.length === 0) add('no cases — this gate would pass vacuously');
  const ids = new Set();
  for (const c of cases) {
    if (ids.has(c.id)) add(`${c.id} appears twice`);
    ids.add(c.id);
    if (!HEX.test(c.raw ?? '')) {
      add(`${c.id}: raw is #rrggbb in lower case`);
      continue;
    }
    const got = groundGuard(c.raw, spec, themeTable.focusRings);
    if (!got) {
      add(`${c.id}: the guard did not end for ${c.raw}`);
      continue;
    }
    if (c.k !== got.k) add(`${c.id}: k is ${c.k}, the guard gives ${got.k}`);
    if (JSON.stringify(c.row) !== JSON.stringify(got.row)) add(`${c.id}: row is ${JSON.stringify(c.row)}, the guard gives ${JSON.stringify(got.row)}`);
    if (got.margin < KNIFE_EDGE) add(`${c.id}: decided within ${KNIFE_EDGE} of a threshold, where two float implementations could answer differently; choose another colour`);
    if (!validateGroundRow(c.row)) add(`${c.id}: the row is not a valid contributor-page.v1 groundRow (${ajv.errorsText(validateGroundRow.errors)})`);
    for (const [what, colour, minimum] of [['ink', c.row?.ink, themeTable.minimums.text], ['muted', c.row?.muted, themeTable.minimums.text], ['focus', c.row?.focus, themeTable.minimums.focus]]) {
      if (HEX.test(colour ?? '') && Math.min(ratio(colour, c.row.ground), ratio(colour, c.row.surface)) < minimum) add(`${c.id}: the row's ${what} is below the renderer's ${minimum} on its ground or surface`);
    }
  }
  const generator = golden.generator ?? {};
  if (generator.algorithm !== 'xorshift32' || !Number.isInteger(generator.seed) || generator.seed <= 0 || generator.seed > 0xffffffff || !Number.isInteger(generator.count) || generator.count < 120) {
    add('generator is {algorithm: "xorshift32", seed: a positive 32-bit integer, count: at least 120}');
  } else {
    const expected = seededGrounds(generator);
    const seeded = cases.filter((c) => SEEDED_GROUND.test(c.id));
    if (JSON.stringify(seeded.map((c) => [c.id, c.raw])) !== JSON.stringify(expected.map((c) => [c.id, c.raw]))) add(`the seeded cases are not the ${generator.count} the generator gives from seed ${generator.seed}`);
  }
  const has = (raw) => cases.some((c) => c.raw === raw);
  for (const raw of ['#ffffff', '#000000', ...PRIMARIES]) if (!has(raw)) add(`no case gives ${raw}`);
  for (const row of themeTable.rows.filter((r) => r.mode !== 'print')) if (!has(row.ground)) add(`no case gives the ground of ${row.preset}/${row.mode} (${row.ground})`);
  if (!cases.some((c) => isGrey(c.raw) && c.k > 0)) add('no case moves a grey');
  for (const mode of ['light', 'dark']) {
    if (!cases.some((c) => c.row?.mode === mode && c.k === 0)) add(`no ${mode} case stays as picked (k = 0)`);
    if (!cases.some((c) => c.row?.mode === mode && c.k > 0)) add(`no ${mode} case is moved (k > 0)`);
  }
  const flips = new Set();
  for (const a of cases) {
    for (const b of cases) {
      if (a.id >= b.id || !HEX.test(a.raw ?? '') || !HEX.test(b.raw ?? '')) continue;
      const da = channels(a.raw);
      const db = channels(b.raw);
      if (da.reduce((n, c, i) => n + Math.abs(c - db[i]), 0) !== 1) continue;
      if (a.row?.mode !== b.row?.mode) flips.add('mode');
      else if (a.k !== b.k) flips.add(Math.min(a.k, b.k) === 0 ? 'edge' : 'middle');
    }
  }
  for (const kind of ['edge', 'middle', 'mode']) if (!flips.has(kind)) add(`no neighbour pair (one channel one step apart) flips ${kind === 'mode' ? 'the mode' : kind === 'edge' ? 'k at the threshold (0 against 1)' : 'k further along'}`);

  // Every colour on a coarse grid: the guard ends, and its row meets the renderer's figures.
  for (const message of gridProblems(spec, themeTable.focusRings, themeTable.minimums)) add(message);

  // The palettes.
  const presets = settingsSchema.$defs.preset.enum;
  const palettes = golden.palettes ?? {};
  if (Object.keys(palettes).join(',') !== presets.join(',')) add(`palettes names [${Object.keys(palettes)}]; every preset has one, in the schemas' order [${presets}]`);
  const allIds = new Set();
  for (const [preset, swatches] of Object.entries(palettes)) {
    const rows = presetRows(themeTable, preset);
    if (!rows.own || !rows.print || (preset === 'purpose' && (!rows.light || !rows.dark))) {
      add(`${preset}: the theme table lacks a row its palette is derived from`);
      continue;
    }
    if (!Array.isArray(swatches) || swatches.length !== 5) add(`${preset}: a palette has five swatches beside the preset's own background`);
    const seen = new Set();
    for (const s of swatches ?? []) {
      const where = `${preset}/${s.id}`;
      if (seen.has(s.id)) add(`${where} appears twice`);
      seen.add(s.id);
      allIds.add(s.id);
      if (typeof s.label !== 'string' || s.label.length === 0) add(`${where}: no label`);
      const own = preset === 'purpose' ? { light: rows.light, dark: rows.dark } : { light: rows.own };
      if (preset === 'purpose' ? !s.dark : 'dark' in s) add(`${where}: ${preset === 'purpose' ? "purpose's swatches are day and night pairs" : 'only purpose has night rows'}`);
      const expectedRatios = {};
      for (const key of preset === 'purpose' ? ['light', 'dark'] : ['light']) {
        const row = s[key];
        if (!row || !HEX.test(row.ground ?? '')) {
          add(`${where}: ${key} has no ground`);
          continue;
        }
        const expected = paletteRow(own[key], row.ground, spec);
        if (JSON.stringify(row) !== JSON.stringify(expected)) add(`${where}: ${key} is ${JSON.stringify(row)}, the palette's rule gives ${JSON.stringify(expected)}`);
        if (!validateGroundRow(row)) add(`${where}: ${key} is not a valid contributor-page.v1 groundRow`);
        const got = rowRatios(expected, own[key].accent);
        expectedRatios[key] = got;
        if (got.ink < spec.muted || got.muted < spec.muted || got.accent < spec.muted || got.focus < spec.focus || got.mark < spec.focus) add(`${where}: ${key} misses a figure (${JSON.stringify(got)}); a swatch never needs adjusting`);
        if (row.ground === own[key].ground) add(`${where}: ${key} is the preset's own background, which is the "Own" choice (null), not a swatch`);
      }
      if (JSON.stringify(s.ratios) !== JSON.stringify(expectedRatios)) add(`${where}: ratios are ${JSON.stringify(s.ratios)}, WCAG 2.2 gives ${JSON.stringify(expectedRatios)}`);
    }
  }
  const schemaIds = settingsSchema.$defs.groundId?.enum ?? [];
  if ([...allIds].sort().join(',') !== [...schemaIds].join(',')) add(`the palettes' ids [${[...allIds].sort()}] are not the schemas' $defs.groundId [${schemaIds}] (each once, alphabetical)`);
  if ((pageSchema.$defs.groundId?.enum ?? []).join(',') !== schemaIds.join(',')) add('the two schemas list different palette ids');

  // The document's theme for a preset, a ground and an accent: what the one builder writes.
  const themeCases = golden.themeCases ?? [];
  if (themeCases.length === 0) add('no themeCases — the builder\'s accent against a ground would be unpinned');
  for (const t of themeCases) {
    const got = themeFor(themeTable, golden, t.preset, t.ground, t.accent);
    if (!got || got.refused) {
      add(`${t.id}: ${got?.refused ?? 'no answer'} for ${t.preset} ${t.ground} ${t.accent}`);
      continue;
    }
    if (JSON.stringify(sortDeep(t.theme)) !== JSON.stringify(sortDeep(got.theme))) add(`${t.id}: theme is ${JSON.stringify(t.theme)}, the builder's rule gives ${JSON.stringify(got.theme)}`);
    if (JSON.stringify(sortDeep(t.k)) !== JSON.stringify(sortDeep(got.k))) add(`${t.id}: k is ${JSON.stringify(t.k)}, the guards give ${JSON.stringify(got.k)}`);
    if (!validateTheme(t.theme)) add(`${t.id}: the theme is not a valid contributor-page.v1 theme (${ajv.errorsText(validateTheme.errors)})`);
  }
  const covered = (test) => themeCases.some(test);
  if (!covered((t) => t.preset === 'purpose' && t.theme?.ground?.dark)) add('no themeCase draws a purpose pair');
  if (!covered((t) => t.preset === 'purpose' && HEX.test(t.ground ?? ''))) add('no themeCase gives purpose an own colour');
  if (!covered((t) => t.preset !== 'purpose' && HEX.test(t.ground ?? '') && t.theme?.ground?.light?.mode !== presetRows(themeTable, t.preset).own?.mode)) add('no themeCase gives a preset an own colour of the other mode');
  if (!covered((t) => t.accent !== null && t.ground !== null)) add('no themeCase carries a person\'s accent with a ground');
  if (!covered((t) => Object.values(t.k ?? {}).some((k) => k > 0) && t.ground !== null)) add('no themeCase adjusts an accent against a ground');
  if (themeFor(themeTable, golden, 'mocha', 'lilac', null)?.refused !== 'not_in_palette') add('a palette id of another preset is not refused as not_in_palette');
  return found;
}

/** The ground golden recomputed from its own hand-picked cases, palette grounds and theme cases (`--print-ground-golden`). */
function groundGoldenText(golden, themeTable, themeSha256) {
  const spec = golden.guard;
  const hand = (golden.cases ?? []).filter((c) => !SEEDED_GROUND.test(c.id)).map((c) => ({ id: c.id, raw: c.raw, ...(c.note ? { note: c.note } : {}) }));
  const cases = [...hand, ...seededGrounds(golden.generator)].map((c) => {
    const got = groundGuard(c.raw, spec, themeTable.focusRings);
    return { ...c, k: got.k, row: got.row };
  });
  const palettes = {};
  for (const [preset, swatches] of Object.entries(golden.palettes)) {
    const rows = presetRows(themeTable, preset);
    const own = preset === 'purpose' ? { light: rows.light, dark: rows.dark } : { light: rows.own };
    palettes[preset] = swatches.map((s) => {
      const out = { id: s.id, label: s.label };
      const ratios = {};
      for (const key of Object.keys(own)) {
        out[key] = paletteRow(own[key], s[key].ground, spec);
        ratios[key] = rowRatios(out[key], own[key].accent);
      }
      return { ...out, ratios };
    });
  }
  const withPalettes = { ...golden, palettes };
  const themeCases = (golden.themeCases ?? []).map((t) => {
    const got = themeFor(themeTable, withPalettes, t.preset, t.ground, t.accent);
    return { id: t.id, preset: t.preset, ground: t.ground, accent: t.accent, ...(t.note ? { note: t.note } : {}), theme: got.theme, k: got.k };
  });
  const head = { ...golden, themeSha256 };
  delete head.cases;
  delete head.palettes;
  delete head.themeCases;
  const lines = JSON.stringify(head, null, 2).slice(0, -2);
  const paletteText = Object.entries(palettes)
    .map(([preset, swatches]) => `    ${JSON.stringify(preset)}: [\n${swatches.map((s) => `      ${JSON.stringify(s)}`).join(',\n')}\n    ]`)
    .join(',\n');
  return (
    `${lines},\n  "cases": [\n${cases.map((c) => `    ${JSON.stringify(c)}`).join(',\n')}\n  ],\n` +
    `  "palettes": {\n${paletteText}\n  },\n` +
    `  "themeCases": [\n${themeCases.map((t) => `    ${JSON.stringify(t)}`).join(',\n')}\n  ]\n}\n`
  );
}

/* -------------------------------------------------------------------------- preview */

/**
 * RFC 8785 for integers, strings, booleans, null, arrays and objects; anything else is refused,
 * and so is a string that is not well-formed Unicode: JSON.stringify writes a lone surrogate as a
 * `\u` escape, a UTF-8 encoder as U+FFFD and System.Text.Json not at all, so no two
 * implementations would agree on its digest (I-JSON, RFC 7493, which RFC 8785 assumes).
 */
function canonical(value) {
  if (typeof value === 'string' && !value.isWellFormed()) throw new Error(`the string ${JSON.stringify(value)} holds a lone surrogate, which has no canonical form`);
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error(`a non-integer number ${value} has no place in this document`);
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  return `{${Object.keys(value).sort().map((key) => `${canonical(key)}:${canonical(value[key])}`).join(',')}}`;
}

/** The preimage, exactly as contributor-page.v1's description defines it. */
function preimage(document) {
  const out = structuredClone(document);
  delete out.generatedAt;
  delete out.versionId;
  if (out.card) delete out.card.h16;
  if (out.picture?.kind === 'github') out.picture = { kind: 'github' };
  // 1.5.0, step (4): an organisation's picture on a repository group or an adopter item.
  for (const section of out.sections ?? []) {
    if (section.id === 'repositories') for (const group of section.groups ?? []) delete group.picture;
    if (section.id === 'adopter') for (const item of section.items ?? []) delete item.picture;
  }
  return out;
}

const validatePage = validator(PAGE);

function previewProblems(golden) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/contributor-page-preview.v1.golden.json: ${message}`]);
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('preview', 'no vectors — this gate would pass vacuously');
  const exercised = { githubReduced: false, uploadKept: false, cardDropped: false, groupPictureDropped: false, itemPictureDropped: false, nonAscii: false };
  for (const v of vectors) {
    if (!validatePage(v.document)) add('preview', `${v.id}: the document is not a valid contributor-page.v1 (${ajv.errorsText(validatePage.errors)})`);
    for (const text of [...strings(v.document), ...keysOf(v.document)].filter((s) => !s.isWellFormed())) {
      found.push(['unicode', `examples/contributor-page-preview.v1.golden.json: ${v.id}: ${JSON.stringify(text)} is not well-formed Unicode; a preimage holds none (I-JSON)`]);
    }
    const pre = preimage(v.document);
    if (JSON.stringify(sortDeep(pre)) !== JSON.stringify(sortDeep(v.preimage))) add('preview', `${v.id}: the preimage is not the document reduced as the schema defines it`);
    let text;
    try {
      text = canonical(pre);
    } catch (error) {
      add('preview', `${v.id}: ${error.message}`);
      continue;
    }
    if (text !== v.canonical) add('preview', `${v.id}: \`canonical\` is not the RFC 8785 form of the preimage`);
    const digest = createHash('sha256').update(Buffer.from(text, 'utf8')).digest('hex');
    if (digest !== v.previewSha256) add('preview', `${v.id}: previewSha256 is ${v.previewSha256}, the preimage's text hashes to ${digest}`);
    if (v.document.picture?.kind === 'github' && Object.keys(v.document.picture).length > 1) exercised.githubReduced = true;
    if (v.document.picture?.kind === 'upload' || v.document.cover?.kind === 'upload') exercised.uploadKept = true;
    if (v.document.card?.h16) exercised.cardDropped = true;
    const sectionOfVector = (id) => (v.document.sections ?? []).find((x) => x.id === id);
    if ((sectionOfVector('repositories')?.groups ?? []).some((g) => 'picture' in g)) exercised.groupPictureDropped = true;
    if ((sectionOfVector('adopter')?.items ?? []).some((i) => 'picture' in i)) exercised.itemPictureDropped = true;
    if (/[^\u0000-\u007f]/.test(text)) exercised.nonAscii = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) add('preview', `no vector exercises ${what}`);
  return found;
}

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, sortDeep(value[key])]));
  return value;
}

/** Every member name of a document, at any depth. */
function keysOf(node, out = []) {
  if (Array.isArray(node)) for (const item of node) keysOf(item, out);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      out.push(key);
      keysOf(value, out);
    }
  }
  return out;
}

/* ---------------------------------------------------------------------------- alias */

/** RFC 4648 base32, lower case, no padding. */
function base32(bytes) {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz234567';
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of bytes) {
    value = ((value << 8) | byte) & 0xffff;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}

/** The alias's addressMac, exactly as contributor-page-alias.v1's description defines it. */
function addressMac(keyHex, login) {
  const message = `u-login:${login.toLowerCase()}`;
  const digest = createHmac('sha256', Buffer.from(keyHex, 'hex')).update(Buffer.from(message, 'utf8')).digest();
  return { message, hex: digest.toString('hex'), mac: base32(digest).slice(0, 26) };
}

function aliasProblems(golden, aliasExample, namedPage) {
  const found = [];
  const add = (message) => found.push(['alias', `examples/contributor-page-alias.v1.golden.json: ${message}`]);
  if (!/^[0-9a-f]{64}$/.test(golden.keyHex ?? '')) {
    add('keyHex is not 32 bytes in lower-case hex, the shape of PSN_PAGE_ALIAS_KEY');
    return found;
  }
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('no vectors — this gate would pass vacuously');
  const byLower = new Map();
  for (const v of vectors) {
    const got = addressMac(golden.keyHex, v.login);
    if (v.message !== got.message) add(`${v.id}: the message is ${JSON.stringify(v.message)}, the definition gives ${JSON.stringify(got.message)}`);
    if (v.hmacSha256Hex !== got.hex) add(`${v.id}: hmacSha256Hex is ${v.hmacSha256Hex}, HMAC-SHA256 under keyHex gives ${got.hex}`);
    if (v.addressMac !== got.mac) add(`${v.id}: addressMac is ${v.addressMac}, the definition gives ${got.mac}`);
    if (v.path !== `u/k/${got.mac}.json`) add(`${v.id}: the path is ${v.path}, the alias lives at u/k/${got.mac}.json`);
    byLower.set(v.login.toLowerCase(), [...(byLower.get(v.login.toLowerCase()) ?? []), v.login]);
  }
  if (![...byLower.values()].some((logins) => logins.length > 1 && logins.some((l) => l !== l.toLowerCase()))) {
    add('no vector gives a mixed-case login beside its lower-case form, so the lower-casing is not pinned');
  }
  if (namedPage.address === 'login' && !vectors.some((v) => v.login === namedPage.login)) {
    add(`no vector names the login of examples/contributor-page.v1.example.json (${namedPage.login}), whose page the alias example points to`);
  }
  if (aliasExample.pid !== namedPage.pid) add(`examples/contributor-page-alias.v1.example.json points to ${aliasExample.pid}, the named page is ${namedPage.pid}`);
  return found;
}

/* ---------------------------------------------------------------------------- build */

const validateRepositoriesSection = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/$defs/repositoriesSection`);
const SHOWS_LOGIN = 'page.repository_shows_login';

/**
 * The gate's own reading of the one builder rule `contributor-page.v1` `repositoriesSection`
 * states and settings check (j) refuses: not the builder, which is C# in the platform.
 */
function buildRepositories(input) {
  const own = (r) => r.owner.toLowerCase() === input.login.toLowerCase();
  const choice = input.repositories;
  if (choice.mode === 'selected' && !input.showLogin && input.credited.some((r) => choice.selected.includes(r.nodeId) && own(r))) {
    return { refused: SHOWS_LOGIN };
  }
  let rows = choice.mode === 'all' ? input.credited.filter((r) => !choice.hidden.includes(r.nodeId)) : input.credited.filter((r) => choice.selected.includes(r.nodeId));
  const leftOut = input.showLogin ? [] : rows.filter(own).map((r) => ({ nodeId: r.nodeId, code: SHOWS_LOGIN }));
  if (!input.showLogin) rows = rows.filter((r) => !own(r));
  const byName = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
  const owners = [...new Set(rows.map((r) => r.owner))].sort(byName);
  const groups = owners.map((owner) => ({
    owner,
    repos: rows
      .filter((r) => r.owner === owner)
      .sort((a, b) => byName(a.name, b.name))
      .map((r) => ({ nodeId: r.nodeId, name: r.name, ...(choice.years ? { years: { from: r.from, to: r.to } } : {}), listing: r.listing }))
  }));
  return { repositories: groups.length > 0 ? { id: 'repositories', groups } : null, counts: { projects: rows.length, organisations: groups.length }, leftOut };
}

function buildProblems(golden) {
  const found = [];
  const add = (message) => found.push(['build', `examples/contributor-page-build.v1.golden.json: ${message}`]);
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('no vectors — this gate would pass vacuously');
  const exercised = { leftOutHidden: false, listedShown: false, refusedSelected: false, caseFolded: false, nothingLeft: false };
  for (const v of vectors) {
    const got = buildRepositories(v.input);
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(v.expect))) add(`${v.id}: expects ${JSON.stringify(v.expect)}, the rule gives ${JSON.stringify(got)}`);
    if (v.expect.repositories && !validateRepositoriesSection(v.expect.repositories)) add(`${v.id}: the expected section is not a valid repositoriesSection (${ajv.errorsText(validateRepositoriesSection.errors)})`);
    const ownRows = (v.expect.repositories?.groups ?? []).filter((g) => g.owner.toLowerCase() === v.input.login.toLowerCase());
    if (!v.input.showLogin && ownRows.length > 0) add(`${v.id}: a page without the login lists a group under the person's own login ${v.input.login}`);
    if (!v.input.showLogin && (v.expect.leftOut ?? []).length > 0) exercised.leftOutHidden = true;
    if (v.input.showLogin && ownRows.length > 0) exercised.listedShown = true;
    if (v.expect.refused === SHOWS_LOGIN) exercised.refusedSelected = true;
    if ((v.expect.leftOut ?? []).some((x) => v.input.credited.find((r) => r.nodeId === x.nodeId)?.owner !== v.input.login)) exercised.caseFolded = true;
    if (v.expect.repositories === null) exercised.nothingLeft = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) add(`no vector exercises ${what}`);
  found.push(...buildAboutProblems(golden.about ?? []).map((message) => ['build', `examples/contributor-page-build.v1.golden.json: ${message}`]));
  found.push(...buildCardsProblems(golden.cards ?? []).map((message) => ['build', `examples/contributor-page-build.v1.golden.json: ${message}`]));
  found.push(...buildAdopterProblems(golden.adopter ?? []).map((message) => ['adopter', `examples/contributor-page-build.v1.golden.json: ${message}`]));
  found.push(...buildOrganisationsProblems(golden.organisations ?? []).map((message) => ['organisations', `examples/contributor-page-build.v1.golden.json: ${message}`]));
  return found;
}

const validateAdopterSection = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/$defs/adopterSection`);
const YEAR_MIN = 2026;
const YEAR_MAX = 9999;

/**
 * The gate's own reading of the builder's licence adopter rule (1.4.0; contributor-page.v1 `adopterSection`), not the builder:
 * the facts in observed order, less the person's hides and any whose evidence no link can be rebuilt from; the first fact of
 * each repository is its item; a registered repository is listed, with `since` where its year is known; one that left (not
 * registered, the recorded quit's year passed as `until`) is listed only with both years and `since` no later than `until`;
 * every other repository drops out; at most 200 items.
 */
function buildAdopter(input) {
  const year = (y) => (Number.isInteger(y) && y >= YEAR_MIN && y <= YEAR_MAX ? y : null);
  const rebuilt = (f) => (f.kind === 'merged-pr' ? Number.isInteger(f.number) && f.number >= 1 : f.kind === 'direct-commit' && /^[0-9a-f]{40}$/.test(f.oid ?? ''));
  const first = new Map();
  for (const f of input.facts) if (!input.hidden.includes(f.nodeId) && rebuilt(f) && !first.has(f.nodeId)) first.set(f.nodeId, f);
  const items = [];
  for (const f of first.values()) {
    const since = year(f.since);
    const until = year(f.until);
    const left = !f.registered && since !== null && until !== null && since <= until;
    if (!f.registered && !left) continue;
    const item = { nodeId: f.nodeId, fullName: f.fullName, evidence: f.kind === 'merged-pr' ? { kind: f.kind, number: f.number } : { kind: f.kind, oid: f.oid } };
    if (since !== null) item.since = since;
    if (left) item.until = until;
    items.push(item);
    if (items.length === 200) break;
  }
  return items.length > 0 ? { id: 'adopter', items } : null;
}

function buildAdopterProblems(vectors) {
  const found = [];
  if (vectors.length === 0) found.push('no adopter vector — the adopter rule would pass vacuously');
  const exercised = {
    sinceWritten: false, noYear: false, leftBoth: false, leftOneYear: false, notLeftDropped: false, undatedLeaveDropped: false,
    quitBeforeEvidenceDropped: false, restoredSinceOnly: false, hiddenDropped: false, unrebuiltDropped: false, firstFactKept: false, nothingLeft: false
  };
  for (const v of vectors) {
    const got = buildAdopter(v.input);
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(v.expect.adopter))) found.push(`${v.id}: expects ${JSON.stringify(v.expect.adopter)}, the rule gives ${JSON.stringify(got)}`);
    if (v.expect.adopter && !validateAdopterSection(v.expect.adopter)) found.push(`${v.id}: the expected section is not a valid adopterSection (${ajv.errorsText(validateAdopterSection.errors)})`);
    // `until` on a left item alone: an expected item carries it exactly when the repository is not registered.
    const facts = v.input.facts;
    for (const item of v.expect.adopter?.items ?? []) {
      const fact = facts.find((f) => f.nodeId === item.nodeId);
      if (!fact) found.push(`${v.id}: ${item.nodeId} is listed with no fact behind it`);
      else if ('until' in item === fact.registered) found.push(`${v.id}: ${item.nodeId} is ${fact.registered ? 'registered and carries until' : 'not registered and carries no until'}; only a left item carries one, and a left item is listed with it`);
      if ('until' in item && !(item.since <= item.until)) found.push(`${v.id}: ${item.nodeId} carries until ${item.until} without a since no later than it`);
    }
    const listed = new Set((v.expect.adopter?.items ?? []).map((i) => i.nodeId));
    for (const f of facts) {
      const item = v.expect.adopter?.items.find((i) => i.nodeId === f.nodeId);
      if (item && f.registered && Number.isInteger(f.since)) exercised.sinceWritten = true;
      if (item && f.registered && f.since === null) exercised.noYear = true;
      if (item && !f.registered && item.since !== item.until) exercised.leftBoth = true;
      if (item && !f.registered && item.since === item.until) exercised.leftOneYear = true;
      if (!listed.has(f.nodeId) && !f.registered && f.until === null) exercised.notLeftDropped = true;
      if (!listed.has(f.nodeId) && !f.registered && f.until !== null && f.since === null) exercised.undatedLeaveDropped = true;
      if (!listed.has(f.nodeId) && !f.registered && f.since !== null && f.until !== null && f.since > f.until) exercised.quitBeforeEvidenceDropped = true;
      if (item && f.registered && f.until !== null && !('until' in item)) exercised.restoredSinceOnly = true;
      if (!listed.has(f.nodeId) && v.input.hidden.includes(f.nodeId)) exercised.hiddenDropped = true;
      if (f.kind === 'merged-pr' && f.number === null && !listed.has(f.nodeId)) exercised.unrebuiltDropped = true;
    }
    if (facts.some((f, i) => facts.findIndex((g) => g.nodeId === f.nodeId) !== i && listed.has(f.nodeId))) exercised.firstFactKept = true;
    if (v.expect.adopter === null) exercised.nothingLeft = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) found.push(`no adopter vector exercises ${what}`);
  return found;
}

/**
 * 1.4.0 (ops decision D168 item 3): on every page document, an adopter item's `until` stands only beside a `since` no later
 * than it (`dependentRequired` holds the first; no schema can hold the order), each a year of the schema's range; and at
 * least one preview vector carries a left item, so its hash pins the two members.
 */
function adopterYearsProblems(documents, vectors) {
  const found = [];
  const add = (message) => found.push(['adopter', message]);
  for (const [where, doc] of documents) {
    const section = (doc.sections ?? []).find((s) => s.id === 'adopter');
    for (const item of section?.items ?? []) {
      for (const member of ['since', 'until']) {
        if (member in item && !(Number.isInteger(item[member]) && item[member] >= YEAR_MIN && item[member] <= YEAR_MAX)) add(`${where}: ${item.fullName} carries ${member} ${JSON.stringify(item[member])}, which is no year`);
      }
      if ('until' in item && !('since' in item)) add(`${where}: ${item.fullName} carries until without since; a left item is listed only with both years`);
      if ('until' in item && 'since' in item && item.until < item.since) add(`${where}: ${item.fullName} left in ${item.until}, before its evidence of ${item.since}`);
    }
  }
  if (!vectors.some((v) => (v.document.sections ?? []).some((s) => s.id === 'adopter' && s.items.some((i) => 'until' in i)))) add('no preview vector carries a left adopter item, so no hash pins since and until');
  return found;
}

/* --------------------------------------------------------------------------- months */

const CERTIFICATE_MONTH = /^([0-9]{4})-(?:0[1-9]|1[0-2])$/;

/**
 * 1.6.0 (a certificate's period by its months; the orchestrator's answer of 2026-10-21T20:26Z): on every page document, every
 * certificate item carries `months`, as the one builder writes it on every item from 1.6.0 (the documents are the builder's):
 * two `YYYY-MM` months, `from` no later than `to`, each in the year `years` names on its side (the order and the years, which a
 * schema cannot hold). And some preview vector carries a period that is not one whole calendar year, so a hash pins the months
 * the years cannot say.
 */
function monthsProblems(documents, vectors) {
  const found = [];
  const add = (message) => found.push(['months', message]);
  for (const [where, doc] of documents) {
    for (const item of (doc.sections ?? []).find((s) => s.id === 'certificates')?.items ?? []) {
      if (!('months' in item)) {
        add(`${where}: ${item.cid} carries no months; the one builder writes them on every certificate item from 1.6.0`);
        continue;
      }
      const from = CERTIFICATE_MONTH.exec(item.months?.from ?? '');
      const to = CERTIFICATE_MONTH.exec(item.months?.to ?? '');
      if (!from || !to) {
        add(`${where}: ${item.cid} carries months ${JSON.stringify(item.months)}, which are not two YYYY-MM months`);
        continue;
      }
      if (item.months.from > item.months.to) add(`${where}: ${item.cid}'s period runs from ${item.months.from} back to ${item.months.to}`);
      if (Number(from[1]) !== item.years?.from || Number(to[1]) !== item.years?.to) {
        add(`${where}: ${item.cid}'s months ${item.months.from} to ${item.months.to} are not in its years ${item.years?.from} to ${item.years?.to}`);
      }
    }
  }
  const oneWholeYear = (m) => m.from.slice(0, 4) === m.to.slice(0, 4) && m.from.endsWith('-01') && m.to.endsWith('-12');
  const months = (i) => typeof i.months?.from === 'string' && typeof i.months?.to === 'string';
  const pinned = vectors.some((v) => ((v.document.sections ?? []).find((s) => s.id === 'certificates')?.items ?? []).some((i) => months(i) && !oneWholeYear(i.months)));
  if (!pinned) add('no preview vector carries a period that is not one whole calendar year, so no hash pins the months the years cannot say');
  return found;
}

/* ---------------------------------------------------------------------- organisations */

const byLoginOrder = (a, b) => {
  const [x, y] = [a.toLowerCase(), b.toLowerCase()];
  return x < y ? -1 : x > y ? 1 : 0;
};

/**
 * The gate's own reading of the builder's judgment of an organisation's picture (1.5.0; contributor-page.v1
 * `$defs.organisationPicture`), not the builder: only while the cards' icon is `owner`; per login, compared without regard to
 * case, over every repository the page shows under it in both sections; never the person's own login; judged only when every
 * one of those repositories has a stored answer, each an `Organization` under that login, all one owner. Each entry keeps the
 * page's first spelling of the login and names the copy the render job holds for that owner, or null.
 */
function buildOrganisations(input) {
  if (input.icon !== 'owner') return [];
  const own = typeof input.login === 'string' ? input.login.toLowerCase() : null;
  const logins = new Map();
  for (const shown of input.shown) {
    const key = shown.owner.toLowerCase();
    if (!logins.has(key)) logins.set(key, { login: shown.owner, rows: [] });
    logins.get(key).rows.push(shown);
  }
  const out = [];
  for (const [key, { login, rows }] of logins) {
    if (key === own) continue;
    const answers = rows.map((r) => input.answers[r.nodeId]);
    if (answers.some((a) => !a || a.ownerType !== 'Organization' || typeof a.ownerLogin !== 'string' || a.ownerLogin.toLowerCase() !== key)) continue;
    const owners = new Set(answers.map((a) => a.ownerNodeId));
    if (owners.size !== 1) continue;
    const [ownerNodeId] = owners;
    out.push({ login, ownerNodeId, h16: input.drawn[ownerNodeId] ?? null });
  }
  return out.sort((a, b) => byLoginOrder(a.login, b.login));
}

function buildOrganisationsProblems(vectors) {
  const found = [];
  if (vectors.length === 0) found.push('no organisations vector — the organisation picture rule would pass vacuously');
  const exercised = {
    named: false, notDrawn: false, iconOff: false, unanswered: false, twoOwners: false, loginMoved: false, ownLogin: false,
    bothSections: false, caseFolded: false, personNever: false
  };
  for (const v of vectors) {
    const got = buildOrganisations(v.input);
    if (JSON.stringify(got) !== JSON.stringify(v.expect.organisations)) found.push(`${v.id}: expects ${JSON.stringify(v.expect.organisations)}, the rule gives ${JSON.stringify(got)}`);
    for (const entry of v.expect.organisations ?? []) {
      if (PERSON_NODE_ID.test(entry.ownerNodeId)) found.push(`${v.id}: ${entry.login} is judged an organisation's under a person's node id ${entry.ownerNodeId}; a person's picture is never named`);
      if (entry.h16 !== null && !/^[0-9a-f]{16}$/.test(entry.h16)) found.push(`${v.id}: ${entry.login}'s copy is named ${JSON.stringify(entry.h16)}, which is no h16`);
    }
    const judged = new Set((v.expect.organisations ?? []).map((e) => e.login.toLowerCase()));
    const answers = Object.values(v.input.answers);
    if ((v.expect.organisations ?? []).some((e) => e.h16 !== null)) exercised.named = true;
    if ((v.expect.organisations ?? []).some((e) => e.h16 === null)) exercised.notDrawn = true;
    if (v.input.icon !== 'owner' && answers.some((a) => a.ownerType === 'Organization')) exercised.iconOff = true;
    if (v.input.shown.some((r) => !(r.nodeId in v.input.answers) && !judged.has(r.owner.toLowerCase()))) exercised.unanswered = true;
    const logins = new Set(v.input.shown.map((r) => r.owner.toLowerCase()));
    for (const key of logins) {
      const rows = v.input.shown.filter((r) => r.owner.toLowerCase() === key).map((r) => v.input.answers[r.nodeId]).filter(Boolean);
      if (new Set(rows.map((a) => a.ownerNodeId)).size > 1 && !judged.has(key)) exercised.twoOwners = true;
      if (rows.some((a) => a.ownerType === 'Organization' && a.ownerLogin.toLowerCase() !== key) && !judged.has(key)) exercised.loginMoved = true;
      if (key === v.input.login.toLowerCase() && rows.some((a) => a.ownerType === 'Organization')) exercised.ownLogin = true;
      if (rows.some((a) => a.ownerType === 'User') && !judged.has(key)) exercised.personNever = true;
    }
    if (v.input.shown.some((r, i) => v.input.shown.findIndex((x) => x.nodeId === r.nodeId) !== i) && judged.size > 0) exercised.bothSections = true;
    if ((v.expect.organisations ?? []).some((e) => e.login !== e.login.toLowerCase())) exercised.caseFolded = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) found.push(`no organisations vector exercises ${what}`);
  return found;
}

/**
 * 1.5.0 (ops decision D165 item 3): on every page document, an organisation's picture stands only where `autoUpdated` names
 * `organisation-pictures` (which the schema holds to the owner's icon), never on the document's own login, and with one `h16`
 * for one login across the projects' groups and the adopter's items; and some vector names a copy on a group and on an item.
 */
function organisationsProblems(documents, vectors) {
  const found = [];
  const add = (message) => found.push(['organisations', message]);
  for (const [where, doc] of documents) {
    const pictures = [];
    for (const group of (doc.sections ?? []).find((s) => s.id === 'repositories')?.groups ?? []) {
      if ('picture' in group) pictures.push([group.owner, group.picture]);
    }
    for (const item of (doc.sections ?? []).find((s) => s.id === 'adopter')?.items ?? []) {
      if ('picture' in item) pictures.push([item.fullName.split('/')[0], item.picture]);
    }
    if (pictures.length > 0 && !(doc.autoUpdated ?? []).includes('organisation-pictures')) add(`${where}: an organisation's picture is named, and autoUpdated does not name organisation-pictures`);
    const h16s = new Map();
    for (const [login, picture] of pictures) {
      if (typeof doc.login === 'string' && login.toLowerCase() === doc.login.toLowerCase()) add(`${where}: ${login}, the page owner's own login, carries an organisation's picture; an own repository keeps the page's own`);
      const key = login.toLowerCase();
      if (h16s.has(key) && h16s.get(key) !== picture?.h16) add(`${where}: ${login} carries two copies, ${h16s.get(key)} and ${picture?.h16}; one login is one organisation on the page`);
      h16s.set(key, picture?.h16);
    }
  }
  if (!vectors.some((v) => ((v.document.sections ?? []).find((s) => s.id === 'repositories')?.groups ?? []).some((g) => 'picture' in g))) add('no preview vector names an organisation\'s copy on a group, so no hash proves step (4) drops it');
  return found;
}

const validatePageCards = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/properties/cards`);
const validateSettingsCards = ajv.getSchema(`${cfg.schemaBaseUrl}/${SETTINGS}#/properties/cards`);

/**
 * The gate's own reading of the builder's cards rule (1.3.0; contributor-page.v1 `cards`), not the builder: every member the
 * settings schema names, the settings' choice where there is one, else that member's default in the settings schema.
 */
function buildCards(input, settingsSchema) {
  const members = settingsSchema.properties.cards?.properties ?? {};
  return Object.fromEntries(Object.entries(members).map(([name, member]) => [name, input.cards?.[name] ?? member.default]));
}

function buildCardsProblems(vectors) {
  const found = [];
  if (vectors.length === 0) found.push('no cards vector — the cards rule would pass vacuously');
  const settingsSchema = schemaJson(SETTINGS);
  const members = settingsSchema.properties.cards?.properties ?? {};
  const exercised = { none: false, some: false, all: false };
  for (const [name, member] of Object.entries(members)) for (const value of member.enum ?? []) exercised[`${name} ${value}`] = false;
  for (const v of vectors) {
    const got = buildCards(v.input, settingsSchema);
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(v.expect.cards))) found.push(`${v.id}: expects ${JSON.stringify(v.expect.cards)}, the rule gives ${JSON.stringify(got)}`);
    if (v.input.cards !== null && !validateSettingsCards(v.input.cards)) found.push(`${v.id}: the input is not a valid settings cards member (${ajv.errorsText(validateSettingsCards.errors)})`);
    if (!validatePageCards(v.expect.cards)) found.push(`${v.id}: the expected member is not a valid document cards member (${ajv.errorsText(validatePageCards.errors)})`);
    const chosen = Object.keys(v.input.cards ?? {}).length;
    if (chosen === 0) exercised.none = true;
    else if (chosen < Object.keys(members).length) exercised.some = true;
    else exercised.all = true;
    for (const [name, value] of Object.entries(v.input.cards ?? {})) exercised[`${name} ${value}`] = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) found.push(`no cards vector exercises ${what}`);
  return found;
}

/* ---------------------------------------------------------------------------- cards */

/** D165 item 3's defaults (the orchestrator's): the owner's icon, an own repository by its name, another owner's as owner/name. */
const CARDS_DEFAULTS = { icon: 'owner', ownNames: 'name', otherNames: 'owner/name' };

/**
 * 1.3.0 (ops decision D165): `cards` is optional in both schemas, every member optional, the defaults D165's in both; the one
 * builder writes all three members on every document from 1.3.0, so every page example and preview vector (each the
 * builder's) carries them; and a settings example stores the member as the api does, each member left out at its default.
 */
function cardsProblems(state) {
  const found = [];
  const add = (message) => found.push(['cards', message]);
  const s = state.schemas.settings;
  const p = state.schemas.page;
  const sc = s.properties.cards;
  const pc = p.properties.cards;
  if (!sc || !pc) {
    add('a schema has no `cards` member');
    return found;
  }
  const members = Object.keys(sc.properties ?? {});
  const defaults = Object.fromEntries(members.map((m) => [m, sc.properties[m].default]));
  if (JSON.stringify(sortDeep(defaults)) !== JSON.stringify(sortDeep(CARDS_DEFAULTS))) add(`the settings' cards defaults are ${JSON.stringify(defaults)}, D165 item 3's are ${JSON.stringify(CARDS_DEFAULTS)}`);
  if (JSON.stringify(sortDeep(sc.default ?? null)) !== JSON.stringify(sortDeep(defaults))) add(`the settings' cards default is ${JSON.stringify(sc.default)}, its members' defaults are ${JSON.stringify(defaults)}`);
  if (Object.keys(pc.properties ?? {}).join(',') !== members.join(',')) add(`the document's cards members are [${Object.keys(pc.properties ?? {})}], the settings' [${members}]`);
  for (const m of members) if (pc.properties?.[m]?.default !== defaults[m]) add(`the document's cards.${m} defaults to ${pc.properties?.[m]?.default}, the settings' to ${defaults[m]}`);
  if ((sc.required ?? []).length > 0 || (pc.required ?? []).length > 0) add('a cards member is required; every one is optional, absent meaning its default');
  if ((s.required ?? []).includes('cards') || (p.required ?? []).includes('cards')) add('cards is required; it is optional, so a document from before 1.3.0 stays valid');
  if ((s['x-psn']?.alwaysWritten ?? []).includes('cards')) add('cards is always written; the api leaves it out at its default');
  const documents = [
    ['examples/contributor-page.v1.example.json', state.page],
    ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
    ['examples/contributor-page.v1.header.example.json', state.header],
    ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
    ['examples/contributor-page.v1.about.example.json', state.aboutPage],
    ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
    ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
    ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
    ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage],
    ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document])
  ];
  for (const [where, doc] of documents) {
    const keys = Object.keys(doc.cards ?? {});
    if ([...keys].sort().join(',') !== [...members].sort().join(',')) add(`${where}: cards is ${JSON.stringify(doc.cards)}; the builder writes all of ${members.join(', ')} on every document`);
    const order = Object.keys(doc);
    if ('cards' in doc && order.indexOf('cards') + 1 !== order.indexOf('sections')) add(`${where}: cards is not written right before sections, where the builder writes it`);
  }
  if (!state.preview.vectors.some((v) => Object.entries(v.document.cards ?? {}).some(([m, value]) => value !== defaults[m]))) add('no preview vector carries a cards choice other than the defaults');
  for (const [name, settings] of Object.entries(state.settingsExamples)) {
    if (!('cards' in settings)) continue;
    const stored = settings.cards ?? {};
    if (Object.keys(stored).length === 0) add(`examples/${name}: an empty cards is stored; the api leaves the member out`);
    for (const [m, value] of Object.entries(stored)) if (value === defaults[m]) add(`examples/${name}: cards.${m} is stored at its default; the api leaves it out`);
  }
  return found;
}

const validatePageAbout = ajv.getSchema(`${cfg.schemaBaseUrl}/${PAGE}#/properties/about`);
const validateSettingsAbout = ajv.getSchema(`${cfg.schemaBaseUrl}/${SETTINGS}#/properties/about`);

/**
 * The gate's own reading of the builder's about rule (1.2.0; contributor-page.v1 `about`), not the builder: nothing while
 * the tick is off; the person's words while the text rules accept them (`textRules`, the rules' answer the vector states);
 * Short in place of own words that do not exist or that the rules refuse; the settings' version, never another.
 */
function buildAbout(input) {
  const about = input.about;
  if (!about.on) return null;
  if (about.variant !== 'own') return { variant: about.variant, version: about.version };
  if (about.ownText !== null && input.textRules === 'accepted') return { variant: 'own', version: about.version, text: about.ownText };
  return { variant: 'short', version: about.version };
}

function buildAboutProblems(vectors) {
  const found = [];
  if (vectors.length === 0) found.push('no about vector — the about rule would pass vacuously');
  const exercised = { tickOff: false, ownEmpty: false, ownRefused: false, ownShown: false, ownKept: false };
  for (const v of vectors) {
    const got = buildAbout(v.input);
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(v.expect.about))) found.push(`${v.id}: expects ${JSON.stringify(v.expect.about)}, the rule gives ${JSON.stringify(got)}`);
    if (!validateSettingsAbout(v.input.about)) found.push(`${v.id}: the input is not a valid settings about block (${ajv.errorsText(validateSettingsAbout.errors)})`);
    if (v.expect.about && !validatePageAbout(v.expect.about)) found.push(`${v.id}: the expected member is not a valid document about block (${ajv.errorsText(validatePageAbout.errors)})`);
    if ((v.input.about.ownText === null) !== (v.input.textRules === null)) found.push(`${v.id}: textRules answers own words, and is null exactly where there are none`);
    const a = v.input.about;
    if (!a.on) exercised.tickOff = true;
    if (a.on && a.variant === 'own' && a.ownText === null) exercised.ownEmpty = true;
    if (a.on && a.variant === 'own' && v.input.textRules === 'refused') exercised.ownRefused = true;
    if (v.expect.about?.text) exercised.ownShown = true;
    if (a.on && a.variant !== 'own' && a.ownText !== null) exercised.ownKept = true;
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) found.push(`no about vector exercises ${what}`);
  return found;
}

/* ---------------------------------------------------------------------------- about */

const ABOUT_FILE = 'contributor-page-about.v1.example.json';
const ABOUT_GOLDEN = 'contributor-page-about.v1.golden.json';
/**
 * The digest of every published version of our words (1.2.0; ops decision D163), each the SHA-256 of the RFC 8785 text of the
 * entry without its `sha256`. A published version's words never change: new words are a new version, and a new line here,
 * never an edit of one, so a published page keeps the words it was published with.
 */
const ABOUT_FROZEN = { 1: 'aba6a333bc05cd1f09667423567cc804bb3dc5ffa0827f7f620519360f79b01f' };
const OUR_VARIANTS = ['short', 'medium', 'long'];
/** Each text's reach in code points, heading and paragraphs together: Short a few sentences, Medium a paragraph, Long a short read. */
const ABOUT_LIMITS = { short: 400, medium: 700, long: 1600 };
const PREDECESSOR = /open[\s-]source/i;
const entryDigest = (entry) => {
  const { sha256: _, ...rest } = entry;
  return createHash('sha256').update(Buffer.from(canonical(rest), 'utf8')).digest('hex');
};
const occurrences = (text, part) => text.split(part).length - 1;

function aboutTextsProblems(texts) {
  const found = [];
  const add = (message) => found.push(['about', `examples/${ABOUT_FILE}: ${message}`]);
  const versions = texts.versions ?? [];
  versions.forEach((entry, i) => {
    if (entry.version !== i + 1) add(`version ${entry.version} stands at place ${i + 1}: versions run 1, 2, ... without a gap`);
  });
  if (versions.length === 0 || texts.current !== versions.at(-1).version) add(`current is ${texts.current}, the last version is ${versions.at(-1)?.version}`);
  for (const [version, digest] of Object.entries(ABOUT_FROZEN)) {
    const entry = versions.find((v) => v.version === Number(version));
    if (!entry) add(`version ${version} was published and is gone: the versions are append-only`);
    else if (entryDigest(entry) !== digest) add(`version ${version}'s words changed (it hashes to ${entryDigest(entry)}, published as ${digest}): new words are a new version`);
  }
  for (const entry of versions) {
    const where = `version ${entry.version}`;
    if (entry.sha256 !== entryDigest(entry)) add(`${where}: sha256 is ${entry.sha256}, the entry hashes to ${entryDigest(entry)}`);
    if (!(entry.version in ABOUT_FROZEN)) add(`${where} has no recorded digest (ABOUT_FROZEN): record it as it is published`);
    for (const name of OUR_VARIANTS) {
      const variant = entry[name];
      const length = [...[variant.heading, ...variant.paragraphs].join(' ')].length;
      if (length > ABOUT_LIMITS[name]) add(`${where} ${name}: ${length} code points, beyond its ${ABOUT_LIMITS[name]}`);
      if (variant.paragraphs.some((p) => PREDECESSOR.test(p)) !== 'lint' in variant) add(`${where} ${name}: a lint marker goes with a paragraph that names the predecessor, and only there`);
    }
    if (occurrences(entry.proof.frame, '{list}') !== 1) add(`${where}: the proof frame holds {list} once`);
    for (const form of ['withCertificates', 'withoutCertificates']) {
      if (occurrences(entry.invite[form], '{link}') !== 1) add(`${where}: the invite ${form} holds {link} once`);
    }
    if (entry.invite.withCertificates !== entry.invite.withoutCertificates.replace(/\.$/, ' too.')) add(`${where}: the two invites differ by more than " too"`);
    for (const noun of ['certificates', 'repositories', 'adopter']) {
      if (entry.proof.nouns[noun].one === entry.proof.nouns[noun].other) add(`${where}: the ${noun} noun has one form for one and another for any other count`);
    }
  }
  return found;
}

/** The gate's own reading of the proof sentence and the invite (schemas/contributor-page-about.v1.json): not the renderer's. */
function aboutClosing(entry, input) {
  const section = (id) => input.sections.find((s) => s.id === id);
  const certificates = (section('certificates')?.items ?? []).filter((item) => ['valid', 'expired'].includes(item.status)).length;
  const repositories = section('repositories');
  const rows = repositories ? repositories.groups.reduce((n, g) => n + g.repos.length, 0) : 0;
  const counted = !repositories && section('summary')?.projects !== undefined;
  const adopted = section('adopter')?.items.length ?? 0;
  const form = (noun, n) => (n === 1 ? noun.one : noun.other);
  const parts = [];
  if (certificates > 0) parts.push(['C', form(entry.proof.nouns.certificates, certificates)]);
  if (rows > 0) parts.push(['P', form(entry.proof.nouns.repositories, rows)]);
  else if (counted) parts.push(['Q', entry.proof.nouns.summary]);
  if (adopted > 0) parts.push(['A', form(entry.proof.nouns.adopter, adopted)]);
  const words = parts.map(([, noun]) => noun);
  const list = words.length < 3 ? words.join(entry.proof.and) : `${words.slice(0, -1).join(entry.proof.comma)}${entry.proof.and}${words.at(-1)}`;
  const proof = words.length > 0 ? entry.proof.frame.replace('{list}', list) : null;
  const invite = input.certificatesIssued
    ? (certificates > 0 ? entry.invite.withCertificates : entry.invite.withoutCertificates).replace('{link}', entry.invite.link.words)
    : null;
  const link = invite
    ? { words: entry.invite.link.words, path: entry.invite.link.path, inSentence: true }
    : { words: entry.learnMore.words, path: entry.learnMore.path, inSentence: false };
  return { expect: { proof, invite, link }, combination: parts.map(([key]) => key).join('+'), singular: [certificates, rows, adopted].includes(1) };
}

function aboutBlock(entry, input) {
  if (input.variant === 'own') {
    return { heading: entry.own.heading, paragraphs: [input.text, entry.own.line], link: { words: entry.learnMore.words, path: entry.learnMore.path, inSentence: false } };
  }
  const variant = entry[input.variant];
  const end = aboutClosing(entry, input).expect;
  const tail = [end.proof, end.invite].filter(Boolean).join(' ');
  const paragraphs = [...variant.paragraphs];
  if (tail && variant.closing === 'same-paragraph') paragraphs[paragraphs.length - 1] = `${paragraphs.at(-1)} ${tail}`;
  else if (tail) paragraphs.push(tail);
  return { heading: variant.heading, paragraphs, link: end.link };
}

function aboutGoldenProblems(golden, texts, textsSha256, pageSchema) {
  const found = [];
  const add = (message) => found.push(['about', `examples/${ABOUT_GOLDEN}: ${message}`]);
  if (golden.textsSha256 !== textsSha256) add(`textsSha256 is ${golden.textsSha256}; the texts' bytes hash to ${textsSha256}: recompute the vectors with the texts`);
  // Each plane a document names, and whether certificates are issued there; the sample is drawn on production too, so it follows it.
  const planes = golden.certificatesIssued ?? {};
  const sources = pageSchema.properties.source.enum;
  if (Object.keys(planes).sort().join(',') !== [...sources].sort().join(',')) add(`certificatesIssued names ${Object.keys(planes).join(', ') || 'no plane'}; contributor-page.v1 source is ${sources.join(', ')}`);
  for (const [plane, issued] of Object.entries(planes)) if (typeof issued !== 'boolean') add(`certificatesIssued.${plane} is true or false`);
  if (planes.sample !== planes.platform) add("certificatesIssued.sample follows platform: every site build draws the samples, production's included");
  const entry = (texts.versions ?? []).find((v) => v.version === golden.version);
  if (!entry) {
    add(`version ${golden.version} is not one of the texts'`);
    return found;
  }
  const combinations = new Set();
  const exercised = { singular: false, withheld: false, fallback: false, leftOutStatuses: false, ownBlock: false };
  for (const v of golden.sentences ?? []) {
    const got = aboutClosing(entry, v.input);
    if (JSON.stringify(sortDeep(got.expect)) !== JSON.stringify(sortDeep(v.expect))) add(`${v.id}: expects ${JSON.stringify(v.expect)}, the rule gives ${JSON.stringify(got.expect)}`);
    if (got.combination) combinations.add(got.combination);
    if (got.singular) exercised.singular = true;
    if (!v.input.certificatesIssued) exercised.withheld = true;
    if (!got.combination && v.input.certificatesIssued) exercised.fallback = true;
    if (v.input.sections.some((s) => s.id === 'certificates' && s.items.some((i) => ['revoked', 'superseded'].includes(i.status)))) exercised.leftOutStatuses = true;
  }
  for (const v of golden.blocks ?? []) {
    const got = aboutBlock(entry, v.input);
    // `lint` carries this repository's copy-lint marker on the paragraphs' line, and goes with them exactly where they name the predecessor.
    const { lint, ...expect } = v.expect;
    if (JSON.stringify(sortDeep(got)) !== JSON.stringify(sortDeep(expect))) add(`${v.id}: expects ${JSON.stringify(expect)}, the rule gives ${JSON.stringify(got)}`);
    if ((lint !== undefined) !== (expect.paragraphs ?? []).some((p) => PREDECESSOR.test(p))) add(`${v.id}: a lint marker goes with paragraphs that name the predecessor, and only there`);
    if (v.input.variant === 'own') exercised.ownBlock = true;
  }
  for (const combination of ['C', 'P', 'Q', 'A', 'C+P', 'C+Q', 'C+A', 'P+A', 'Q+A', 'C+P+A', 'C+Q+A']) {
    if (!combinations.has(combination)) add(`no sentence vector composes ${combination}`);
  }
  for (const variant of [...OUR_VARIANTS, 'own']) {
    if (!(golden.blocks ?? []).some((v) => v.input.variant === variant)) add(`no block vector draws ${variant}`);
  }
  for (const [what, done] of Object.entries(exercised)) if (!done) add(`no vector exercises ${what}`);
  return found;
}

/* ---------------------------------------------------------------------------- never */

const BANNED_MEMBER = /^(points?|microshares?|shares?|bands?|ranks?|ranking|percentiles?|scores?|months?|amounts?|.*minor|impact.*|subid|sub|githubid|usernodeid|avatarurl.*)$/i;
const CURRENCY = /\b(?:CHF|EUR|USD|GBP)\b|[$€£]\s?[0-9]|[0-9]\s?(?:CHF|EUR|USD|GBP)\b/;
/** A user's GitHub node id: the current `U_…` form, or the legacy base64 of "04:User…". */
const PERSON_NODE_ID = /^(?:U_[A-Za-z0-9_-]+|MDQ6VXNlcj[A-Za-z0-9+/=]*)$/;
const PICTURE_SOURCE = /githubusercontent\.com/i;

/**
 * 1.6.0 (a certificate's period by its months; the orchestrator's answer of 2026-10-21T20:26Z): the one member a page schema
 * may name for months, by its place: a certificate item's `months`, that certificate's own validity period as its public record
 * states it, never a month of the monthly credit records (design §8.1). Its own members are still read, and a member named
 * for months anywhere else, in any of the three schemas, is refused as before.
 */
const ADMITTED_MEMBER = { page: '$defs/certificatesSection/properties/items/items/properties/months' };

/** Every member a schema names, with its place: `[path, name]`. */
function memberNames(node, path = [], out = []) {
  if (Array.isArray(node)) node.forEach((item, i) => memberNames(item, [...path, i], out));
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'properties' || key === 'patternProperties') && value && typeof value === 'object') {
        for (const name of Object.keys(value)) out.push([[...path, key, name].join('/'), name]);
      }
      memberNames(value, [...path, key], out);
    }
  }
  return out;
}
function strings(node, out = []) {
  if (typeof node === 'string') out.push(node);
  else if (Array.isArray(node)) for (const item of node) strings(item, out);
  else if (node && typeof node === 'object') for (const value of Object.values(node)) strings(value, out);
  return out;
}

function neverProblems(schemaSet, documents) {
  const found = [];
  for (const [name, schema] of Object.entries(schemaSet)) {
    for (const [path, member] of memberNames(schema).filter(([path, m]) => BANNED_MEMBER.test(m) && path !== ADMITTED_MEMBER[name])) {
      found.push(['never', `the ${name} schema has a member named ${member} (${path}): no page carries points, shares, ranks, months, amounts or a person's GitHub id (design §8.7)`]);
    }
  }
  for (const [where, document] of documents) {
    for (const text of strings(document)) {
      if (CURRENCY.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} reads as a money figure; nothing on a page carries one (design §8.4)`]);
      if (PERSON_NODE_ID.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} is a person's GitHub node id, which no page carries (the plan's correction 11)`]);
      if (PICTURE_SOURCE.test(text)) found.push(['never', `${where}: ${JSON.stringify(text)} names GitHub's picture host, which names the person's numeric id (design correction 5)`]);
    }
  }
  return found;
}

/* ------------------------------------------------------------------ defaults, agree */

/**
 * The defaults example is the document a new person starts from, AS THE API STORES IT: every required member at the
 * schema's default, and every optional member (1.1.0's `linksPlacement`, `theme.ground`, `identity.loginShow`) LEFT OUT,
 * because the api writes an optional member only when it differs from its default, so a document stored before the
 * member existed keeps its bytes and its hash.
 */
function defaultsProblems(defaults, settingsSchema, aboutCurrent) {
  const found = [];
  const add = (message) => found.push(['defaults', `examples/contributor-page-settings.v1.defaults.example.json: ${message}`]);
  const required = settingsSchema.required ?? [];
  const always = settingsSchema['x-psn']?.alwaysWritten ?? [];
  // 1.2.0: what the api stamps rather than defaults (`about.version`, the texts' current).
  const stamped = { about: { version: aboutCurrent } };
  for (const [member, schema] of Object.entries(settingsSchema.properties)) {
    if (member === 'schemaVersion') continue;
    if (always.includes(member)) {
      // Optional (a document stored before it stays valid) but never left out at its default: the api always writes it.
      const expected = { ...collectDefault(schema), ...(stamped[member] ?? {}) };
      if (!(member in defaults)) add(`${member} is always written (x-psn.alwaysWritten), but the example leaves it out`);
      else if (JSON.stringify(sortDeep(defaults[member])) !== JSON.stringify(sortDeep(expected))) add(`${member} is ${JSON.stringify(defaults[member])}, its default as the api writes it is ${JSON.stringify(expected)}`);
      continue;
    }
    if (!required.includes(member)) {
      if (member in defaults) add(`${member} is optional and left out at its default, but the example carries ${JSON.stringify(defaults[member])}`);
      if (schema.default === undefined) add(`${member} is optional and names no default, so its absence means nothing`);
      continue;
    }
    const expected = JSON.parse(JSON.stringify(collectDefault(schema)));
    if (JSON.stringify(sortDeep(defaults[member])) !== JSON.stringify(sortDeep(expected))) {
      add(`${member} is ${JSON.stringify(defaults[member])}, the schema's default is ${JSON.stringify(expected)}`);
    }
  }
  return found;
}
/**
 * A member's default: its own, or for an object without one, the object of its REQUIRED members' defaults (an optional
 * member is left out at its default, as the api stores it).
 */
function collectDefault(schema) {
  if (schema.default !== undefined) return schema.default;
  if (schema.properties) {
    const required = schema.required ?? [];
    return Object.fromEntries(
      Object.entries(schema.properties)
        .filter(([key, member]) => required.includes(key) && (member.default !== undefined || member.properties))
        .map(([key, member]) => [key, collectDefault(member)]),
    );
  }
  return undefined;
}

function agreeProblems(settingsSchema, pageSchema) {
  const found = [];
  const s = settingsSchema;
  const p = pageSchema;
  const pairs = [
    ['layout', s.properties.layout.enum, p.properties.layout.enum],
    ['preset', s.$defs.preset.enum, p.properties.theme.properties.preset.enum],
    ['picture kind', s.$defs.picture.properties.kind.enum, p.properties.picture.properties.kind.enum],
    ['cover kind', s.$defs.cover.properties.kind.enum, p.properties.cover.properties.kind.enum],
    ['cover preset', s.$defs.coverPreset.enum, p.properties.cover.properties.preset.enum],
    ['address', s.properties.address.enum, p.properties.address.enum],
    ['section id', s.$defs.sectionId.enum, ['summarySection', 'certificatesSection', 'repositoriesSection', 'adopterSection', 'linksSection', 'sponsorsSection'].map((d) => p.$defs[d].properties.id.const)],
    ['card element', Object.keys(s.properties.card.properties), Object.keys(p.properties.card.properties).filter((k) => k !== 'h16')],
    ['links placement', s.properties.linksPlacement?.enum, p.properties.linksPlacement?.enum],
    ['link display part', s.$defs.show?.required, p.$defs.show?.required],
    ['website display part', s.$defs.websiteShow?.required, p.$defs.websiteShow?.required],
    ['palette id', s.$defs.groundId?.enum, p.$defs.groundId?.enum],
    ['about variant', s.properties.about?.properties.variant.enum, p.properties.about?.properties.variant.enum],
    ['card icon', s.properties.cards?.properties.icon.enum, p.properties.cards?.properties.icon.enum],
    ['own name form', s.properties.cards?.properties.ownNames.enum, p.properties.cards?.properties.ownNames.enum],
    ['other name form', s.properties.cards?.properties.otherNames.enum, p.properties.cards?.properties.otherNames.enum],
    ['name forms of own and other', s.properties.cards?.properties.ownNames.enum, s.properties.cards?.properties.otherNames.enum]
  ];
  for (const [what, a, b] of pairs) {
    if ((a ?? []).join(',') !== (b ?? []).join(',')) found.push(['agree', `the ${what} lists differ: settings [${a}], page [${b}]`]);
  }
  // 1.2.0: the variants are our three texts and the person's own, each of which every version of the texts carries.
  const variants = s.properties.about?.properties.variant.enum ?? [];
  if (variants.join(',') !== [...OUR_VARIANTS, 'own'].join(',')) found.push(['agree', `the about variants are [${variants}], the texts carry [${[...OUR_VARIANTS, 'own']}]`]);
  return found;
}

/* ---------------------------------------------------------------------------- facts */

function factsProblems(pages) {
  const found = [];
  for (const [where, doc] of pages) {
    const section = (id) => doc.sections.find((x) => x.id === id);
    for (const [kind, items] of [['links', section('links')?.items ?? []], ['sponsors', section('sponsors')?.items ?? []]]) {
      for (const item of items) {
        const platform = table.platforms.find((x) => x.id === item.platform);
        const form = platform?.forms.find((f) => f.id === (item.form ?? platform.forms[0].id));
        const built = form ? rebuild(table, platform, form, item.handle, item.instance) : { refused: 'platform_unknown' };
        if (built.url !== item.url) found.push(['facts', `${where}: the ${kind} item ${item.platform} ${item.handle} has url ${item.url}, its template gives ${built.url ?? built.refused}`]);
      }
    }
    const website = section('links')?.website;
    if (website && parseWebsite(table, website.url).url !== website.url) found.push(['facts', `${where}: the website ${website.url} is not what the website steps make of it`]);
    const summary = section('summary');
    const repositories = section('repositories');
    const certificates = section('certificates');
    if (summary && repositories) {
      const rows = repositories.groups.reduce((n, g) => n + g.repos.length, 0);
      if (summary.projects !== undefined && summary.projects !== rows) found.push(['facts', `${where}: the summary counts ${summary.projects} projects beside ${rows} listed rows`]);
      if (summary.organisations !== undefined && summary.organisations !== repositories.groups.length) found.push(['facts', `${where}: the summary counts ${summary.organisations} organisations beside ${repositories.groups.length} groups`]);
    }
    if (summary?.certificates !== undefined && certificates && summary.certificates !== certificates.items.length) {
      found.push(['facts', `${where}: the summary counts ${summary.certificates} certificates beside ${certificates.items.length} listed`]);
    }
  }
  return found;
}

/* ------------------------------------------------------------------------- refusals */

const validateSettings = validator(SETTINGS);
const validateAlias = validator(ALIAS);
const sectionOf = (doc, id) => doc.sections.find((x) => x.id === id);
const REFUSALS = [
  ['page', 'a subId member', (d) => { d.subId = 'U_kgDOexample01'; }],
  ['page', 'a points member', (d) => { sectionOf(d, 'summary').points = 1200; }],
  ['page', 'search off the login address', (d) => { d.address = 'mixed'; }],
  ['page', 'the login address without the login', (d) => { delete d.login; d.search = false; d.sections = d.sections.filter((x) => !['adopter', 'certificates'].includes(x.id)); d.card.login = false; d.card.adopter = false; d.autoUpdated = d.autoUpdated.filter((x) => x !== 'login'); }],
  ['anonymous', 'an adopter section without the login', (d) => { d.sections.push({ id: 'adopter', items: [{ nodeId: 'R_kgDOSMPL0001', fullName: 'example-org/ledger-tools', evidence: { kind: 'merged-pr', number: 42 } }] }); }],
  ['anonymous', 'a full certificate on a page without the login', (d) => { sectionOf(d, 'certificates').items[0].disclosure = 'full'; }],
  ['page', 'a status-only certificate on a page with the login', (d) => { const item = sectionOf(d, 'certificates').items[0]; item.disclosure = 'status-only'; delete item.repos; }],
  ['anonymous', 'no vouched section', (d) => { d.sections = d.sections.filter((x) => x.id === 'links'); d.card.summary = false; }],
  ['page', 'a section twice', (d) => { d.sections.push(structuredClone(sectionOf(d, 'links'))); }],
  ['page', 'a raw picture URL', (d) => { d.picture = { kind: 'upload', h16: '6616e65bafbcf60a', url: 'https://avatars.githubusercontent.com/u/1?v=4' }; }],
  ['page', 'a link that is not an https address', (d) => { sectionOf(d, 'links').items[0].url = 'javascript:alert(1)'; }],
  ['page', 'a link handle with a bidi override', (d) => { sectionOf(d, 'links').items[0].handle = 'alex\u202eelpmaxe'; }],
  ['page', 'a link handle with a slash', (d) => { sectionOf(d, 'links').items[0].handle = 'alex-example/../evil'; }],
  ['page', 'a Matrix id shaped like a path', (d) => { const m = sectionOf(d, 'links').items.find((l) => l.platform === 'matrix'); m.handle = '../..:matrix.org'; m.url = 'https://matrix.to/#/@../..:matrix.org'; }],
  ['page', "a person's node id as a repository's", (d) => { sectionOf(d, 'repositories').groups[0].repos[0].nodeId = 'U_kgDOexample01'; }],
  ['page', "a person's legacy node id as a certificate's repository", (d) => { sectionOf(d, 'certificates').items[0].repos[0].nodeId = 'MDQ6VXNlcjEyMzQ1Njc='; }],
  ['page', 'a generatedAt finer than its day', (d) => { d.generatedAt = '2027-03-01T03:47:12Z'; }],
  ['page', 'a month in the years', (d) => { sectionOf(d, 'repositories').groups[0].repos[0].years = { from: '2026-03', to: 2027 }; }],
  ['page', 'a claim status', (d) => { sectionOf(d, 'repositories').groups[0].repos[0].listing = 'verified'; }],
  ['page', 'an accent dark ground off the purpose preset', (d) => { d.theme.preset = 'mocha'; }],
  ['settings', 'search off the login address', (d) => { d.address = 'mixed'; }],
  ['settings', 'the login address without showLogin', (d) => { d.identity.showLogin = false; d.search = false; d.address = 'login'; d.sections.find((x) => x.id === 'adopter').on = false; }],
  ['settings', 'the adopter section without showLogin', (d) => { d.identity.showLogin = false; d.search = false; d.address = 'anonymous'; }],
  ['settings', 'a section missing', (d) => { d.sections.pop(); }],
  ['settings', 'a section twice', (d) => { d.sections[5] = { id: 'summary', on: false }; }],
  ['settings', 'a raw picture URL', (d) => { d.picture = { kind: 'upload', file: 'https://example.org/me.png' }; }],
  ['settings', 'an SVG upload named by path', (d) => { d.cover = { kind: 'upload', file: 'uploads/cover.svg' }; }],
  ['settings', 'two links for one platform', (d) => { d.links.push({ platform: 'linkedin', handle: 'alex-example-2' }); }],
  ['settings', 'a Mastodon link with no instance', (d) => { delete d.links.find((l) => l.platform === 'mastodon').instance; }],
  ['settings', 'a Matrix id shaped like a path', (d) => { d.links.find((l) => l.platform === 'matrix').handle = 'a/../b:matrix.org'; }],
  ['settings', "a person's node id among the hidden repositories", (d) => { d.repositories.hidden = ['U_kgDOexample01']; }],
  ['settings', 'a stored link carrying a URL', (d) => { d.links[0].url = 'https://www.linkedin.com/in/alex-example'; }],
  ['settings', 'an upper-case colour', (d) => { d.theme.accent = '#3A7BD5'; }],
  ['settings', 'a bio with four line breaks', (d) => { d.identity.bio = 'a\nb\nc\nd\ne'; }],
  ['settings', 'a name with a bidi override', (d) => { d.identity.displayName = 'Alex \u202eelpmaxE'; }],
  ['settings', 'a website with a query', (d) => { d.website = { url: 'https://alex.dev/?ref=x' }; }],
  ['settings', 'an amount switch', (d) => { d.summary.amounts = false; }],
  ['alias', 'an alias carrying a login', (d) => { d.login = 'example-contributor'; }],
  // 1.1.0 (ops decision D149; design CPAGE-REFINEMENTS-2026-10-15 §1.2, §3, §5.6).
  ['settings', 'a link that shows nothing', (d) => { d.links[0].show = { icon: false, label: false, handle: false }; }],
  ['settings', 'a link display missing a part', (d) => { d.links[0].show = { icon: true, label: true }; }],
  ['settings', 'a link display with a fourth part', (d) => { d.links[0].show = { icon: true, label: true, handle: true, url: true }; }],
  ['settings', 'a GitHub line that shows nothing', (d) => { d.identity.loginShow = { icon: false, label: false, handle: false }; }],
  ['settings', 'a website display with a handle', (d) => { d.website = { url: 'https://alex.dev/', show: { icon: true, label: true, handle: false } }; }],
  ['settings', 'a sponsorship button with a display', (d) => { d.sponsors[0].show = { icon: true, label: true, handle: true }; }],
  ['settings', 'links placed outside the two places', (d) => { d.linksPlacement = 'footer'; }],
  ['settings', 'a background that is neither a palette id nor a colour', (d) => { d.theme.ground = 'Lilac'; }],
  ['settings', 'an upper-case background colour', (d) => { d.theme.ground = '#3366CC'; }],
  ['page', 'a link that shows nothing', (d) => { sectionOf(d, 'links').items[0].show = { icon: false, label: false, handle: false }; }],
  ['page', 'a website display with a handle', (d) => { sectionOf(d, 'links').website.show = { icon: false, label: true, handle: true }; }],
  ['anonymous', "the GitHub line's parts without the login", (d) => { d.loginShow = { icon: true, label: false, handle: false }; }],
  ['page', 'links placed outside the two places', (d) => { d.linksPlacement = 'footer'; }],
  ['page', 'a ground without an accent', (d) => { d.theme = { preset: 'mocha', ground: { raw: 'cream', light: ROW.cream } }; }],
  ['page', 'a night row off purpose', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'cream', light: ROW.cream, dark: ROW.lilacNight } }; }],
  ['page', 'a night row under an own colour', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purpose, ground: { raw: '#f0ecf6', light: ROW.lilac, dark: ROW.lilacNight } }; }],
  ['page', 'a purpose swatch without its night row', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purposeDay, ground: { raw: 'lilac', light: ROW.lilac } }; }],
  ['page', 'a purpose pair whose accent has no night colour', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purposeDay, ground: { raw: 'lilac', light: ROW.lilac, dark: ROW.lilacNight } }; }],
  ['page', 'an own colour on purpose whose accent keeps a night colour', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purpose, ground: { raw: '#3366cc', light: ROW.ownDark } }; }],
  ['page', 'a pair whose day row is dark', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purpose, ground: { raw: 'lilac', light: ROW.lilacNight, dark: ROW.lilacNight } }; }],
  ['page', 'a ground row carrying an accent', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'cream', light: { ...ROW.cream, accent: '#7a4a2a' } } }; }],
  ['page', 'a ground row of an upper-case colour', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'cream', light: { ...ROW.cream, ground: '#FBF6EC' } } }; }],
  ['page', 'a ground named by a colour name', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'Cream', light: ROW.cream } }; }],
  // 1.2.0 (ops decision D163; design D163-ABOUT-TEXTS-2026-10-16).
  ['aboutSettings', 'own words of 601 code points', (d) => { d.about.ownText = 'é'.repeat(601); }],
  ['aboutSettings', 'own words with six line breaks', (d) => { d.about.ownText = 'a\nb\nc\nd\ne\nf\ng'; }],
  ['aboutSettings', 'own words with a bidi override', (d) => { d.about.ownText = 'I chose \u202eecruoS esopruP'; }],
  ['aboutSettings', 'empty own words', (d) => { d.about.ownText = ''; }],
  ['aboutSettings', 'an about block without its version', (d) => { delete d.about.version; }],
  ['aboutSettings', 'an about block at version 0', (d) => { d.about.version = 0; }],
  ['aboutSettings', 'a fifth variant', (d) => { d.about.variant = 'custom'; }],
  ['aboutSettings', 'an about block with a heading of its own', (d) => { d.about.heading = 'Why I am here'; }],
  ['aboutSettings', 'an about block without the tick', (d) => { delete d.about.on; }],
  ['aboutOwnPage', 'own words under another variant', (d) => { d.about.variant = 'short'; }],
  ['aboutOwnPage', 'own without its words', (d) => { delete d.about.text; }],
  ['aboutOwnPage', 'an about block at version 0', (d) => { d.about.version = 0; }],
  ['aboutOwnPage', 'the tick in the document', (d) => { d.about.on = true; }],
  ['aboutOwnPage', 'our words in the document', (d) => { d.about = { variant: 'short', version: 1, paragraphs: ['Open source already helps people.'] }; }], // copy-lint-allow: mention
  ['aboutOwnPage', 'own words of 601 code points', (d) => { d.about.text = 'é'.repeat(601); }],
  ['aboutOwnPage', 'own words with six line breaks', (d) => { d.about.text = 'a\nb\nc\nd\ne\nf\ng'; }],
  // 1.3.0 (ops decision D165).
  ['cardsSettings', 'a fourth card icon', (d) => { d.cards.icon = 'organisation'; }],
  ['cardsSettings', 'a name form of its own', (d) => { d.cards.ownNames = 'login/name'; }],
  ['cardsSettings', 'an upper-case name form', (d) => { d.cards.otherNames = 'Owner/Name'; }],
  ['cardsSettings', 'an unknown member of cards', (d) => { d.cards.size = 'large'; }],
  ['cardsSettings', 'cards as a list', (d) => { d.cards = ['github']; }],
  ['cardsSettings', 'cards as null', (d) => { d.cards = null; }],
  ['cardsPage', 'a fourth card icon', (d) => { d.cards.icon = 'avatar'; }],
  ['cardsPage', 'a name form of its own', (d) => { d.cards.otherNames = 'org/name'; }],
  ['cardsPage', "the viewer's list toggle stored in the document", (d) => { d.cards.view = 'list'; }],
  ['cardsPage', 'cards as a string', (d) => { d.cards = 'github'; }],
  // 1.4.0 (ops decision D168 item 3).
  ['adopterYearsPage', 'a left year without its since', (d) => { delete leftItem(d).since; }],
  ['adopterYearsPage', 'a since before 2026', (d) => { sectionOf(d, 'adopter').items[0].since = 2025; }],
  ['adopterYearsPage', 'a month for a year', (d) => { sectionOf(d, 'adopter').items[0].since = '2026-03'; }],
  ['adopterYearsPage', 'an instant for a year', (d) => { leftItem(d).until = '2027-02-10T09:00:00Z'; }],
  ['adopterYearsPage', 'a year that is not a whole number', (d) => { leftItem(d).until = 2027.5; }],
  ['adopterYearsPage', 'a marker of a leave of its own', (d) => { leftItem(d).left = true; }],
  // 1.5.0 (ops decision D165 item 3).
  ['organisationPage', "an organisation's picture as an address", (d) => { orgGroup(d).picture = { h16: '9b2e4c6a8d0f1e3a', url: 'https://avatars.githubusercontent.com/u/1?v=4' }; }],
  ['organisationPage', "an organisation's picture as a bare string", (d) => { orgGroup(d).picture = '9b2e4c6a8d0f1e3a'; }],
  ['organisationPage', "an organisation's picture with an upper-case h16", (d) => { sectionOf(d, 'adopter').items[0].picture = { h16: '9B2E4C6A8D0F1E3A' }; }],
  ['organisationPage', "an organisation's picture with no h16", (d) => { orgGroup(d).picture = {}; }],
  ['organisationPage', "an organisation's picture naming its owner's node id", (d) => { orgGroup(d).picture.ownerNodeId = 'O_kgDOSMPL0101'; }],
  ['organisationPage', 'organisation-pictures kept current under the GitHub mark', (d) => { d.cards.icon = 'github'; }],
  // 1.6.0 (a certificate's period by its months; the orchestrator's answer of 2026-10-21T20:26Z).
  ['page', "a day in a certificate's months", (d) => { certificateOf(d).months = { from: '2026-01-15', to: '2026-12' }; }],
  ['page', 'a thirteenth month', (d) => { certificateOf(d).months = { from: '2026-01', to: '2026-13' }; }],
  ['page', 'a month before 2026', (d) => { certificateOf(d).months = { from: '2025-12', to: '2026-12' }; }],
  ['page', 'a number for a month', (d) => { certificateOf(d).months = { from: '2026-01', to: 202612 }; }],
  ['page', "a certificate's months without their end", (d) => { certificateOf(d).months = { from: '2026-01' }; }],
  ['page', "a member of their own in a certificate's months", (d) => { certificateOf(d).months = { from: '2026-01', to: '2026-12', kind: 'year' }; }],
  ['page', 'the period as words', (d) => { certificateOf(d).months = 'January–December 2026'; }],
  ['page', "months on a project's row", (d) => { sectionOf(d, 'repositories').groups[0].repos[0].months = { from: '2026-01', to: '2027-12' }; }],
  ['page', 'months in the summary', (d) => { sectionOf(d, 'summary').months = { from: '2026-01', to: '2027-02' }; }]
];

/** The named example's certificate item (1.6.0's cases). */
const certificateOf = (d) => sectionOf(d, 'certificates').items[0];

/** The organisation-pictures example's group that names an organisation's copy. */
const orgGroup = (d) => sectionOf(d, 'repositories').groups.find((g) => 'picture' in g);

/** The adopter-years example's item that left (it carries `until`). */
const leftItem = (d) => sectionOf(d, 'adopter').items.find((i) => 'until' in i);

/** Rows and accents for the 1.1.0 cases: real rows (two palette swatches, and the ground guard's row for #3366cc). */
const ROW = {
  cream: { mode: 'light', ground: '#fbf6ec', surface: '#fdfbf6', ink: '#2a1d14', muted: '#5e4a3c', rule: '#dad4ca', focus: '#0f4f8a' },
  lilac: { mode: 'light', ground: '#f0ecf6', surface: '#f8f6fb', ink: '#14170f', muted: '#4d5347', rule: '#cecbd2', focus: '#0f4f8a' },
  lilacNight: { mode: 'dark', ground: '#17131d', surface: '#26222b', ink: '#ece8dc', muted: '#b4b3a5', rule: '#38343b', focus: '#8ec2f0' },
  ownDark: { mode: 'dark', ground: '#24488f', surface: '#325396', ink: '#ece8dc', muted: '#cacdcf', rule: '#43619b', focus: '#8ec2f0' }
};
const ACCENT = {
  mocha: { raw: '#7a4a2a', light: '#7a4a2a', print: '#7a4a2a' },
  purpose: { raw: '#1d5c3c', light: '#1d5c3c', dark: '#8fcaa6', print: '#1d5c3c' },
  purposeDay: { raw: '#1d5c3c', light: '#1d5c3c', print: '#1d5c3c' }
};

/**
 * What 1.1.0 must ADMIT, proved on copies of the examples, so a schema that refused every new member would not pass this
 * gate unnoticed until the examples that carry them arrive: each change below must still validate.
 */
const ADMITS = [
  ['settings', 'every link icon-only, the GitHub line without its word, the website without its globe, the links beside the name', (d) => {
    for (const link of d.links) link.show = { icon: true, label: false, handle: false };
    d.identity.loginShow = { icon: true, label: false, handle: true };
    d.website.show = { icon: false, label: false };
    d.linksPlacement = 'header';
  }],
  ['settings', 'a palette swatch', (d) => { d.theme.ground = 'lilac'; }],
  ['settings', 'an own background colour', (d) => { d.theme.ground = '#3366cc'; }],
  ['settings', 'the background stated at its default', (d) => { d.theme.ground = null; d.linksPlacement = 'section'; }],
  ['page', 'a purpose pair with its night accent', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purpose, ground: { raw: 'lilac', light: ROW.lilac, dark: ROW.lilacNight } }; }],
  ['page', 'an own colour on purpose, one dark row, no night accent', (d) => { d.theme = { preset: 'purpose', accent: ACCENT.purposeDay, ground: { raw: '#3366cc', light: ROW.ownDark } }; }],
  ['page', 'a mocha swatch', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'cream', light: ROW.cream } }; }],
  ['page', 'icon-only links beside the name, and the GitHub line as a logo', (d) => {
    for (const item of sectionOf(d, 'links').items) item.show = { icon: true, label: false, handle: false };
    sectionOf(d, 'links').website.show = { icon: true, label: false };
    d.linksPlacement = 'header';
    d.loginShow = { icon: true, label: false, handle: false };
  }],
  // 1.2.0 (ops decision D163).
  ['aboutSettings', 'own words not yet written', (d) => { d.about.ownText = null; }],
  ['aboutSettings', 'own words kept under Short', (d) => { d.about.variant = 'short'; }],
  ['aboutSettings', 'the tick off, the choice and the words kept', (d) => { d.about.on = false; }],
  ['aboutSettings', 'own words of 600 code points with five line breaks', (d) => { d.about.ownText = `${'é'.repeat(594)}\n\n\n\n\nx`; }],
  ['aboutOwnPage', 'our Medium text', (d) => { d.about = { variant: 'medium', version: 1 }; }],
  ['aboutOwnPage', 'a later version of our words', (d) => { d.about = { variant: 'long', version: 2 }; }],
  ['aboutOwnPage', 'no about block', (d) => { delete d.about; }],
  // 1.3.0 (ops decision D165).
  ['cardsSettings', 'no cards at all (stored before 1.3.0, or every choice at its default)', (d) => { delete d.cards; }],
  ['cardsSettings', 'one card choice alone', (d) => { d.cards = { ownNames: 'owner/name' }; }],
  ['cardsSettings', 'the card defaults stated', (d) => { d.cards = { icon: 'owner', ownNames: 'name', otherNames: 'owner/name' }; }],
  ['cardsPage', 'no cards at all (a document built before 1.3.0)', (d) => { delete d.cards; }],
  ['cardsPage', 'one card member alone', (d) => { d.cards = { icon: 'none' }; }],
  ['cardsPage', 'every card value other than the defaults', (d) => { d.cards = { icon: 'none', ownNames: 'owner/name', otherNames: 'name' }; }],
  // 1.4.0 (ops decision D168 item 3).
  ['adopterYearsPage', 'no year on any adopter item (a document built before 1.4.0)', (d) => { for (const i of sectionOf(d, 'adopter').items) { delete i.since; delete i.until; } d.sections[0].items = d.sections[0].items.filter((i) => i.nodeId !== 'R_kgDOSMPL0005'); }],
  ['adopterYearsPage', 'since alone on every item', (d) => { for (const i of sectionOf(d, 'adopter').items) { i.since = 2026; delete i.until; } }],
  ['adopterYearsPage', 'a left item within one year', (d) => { const i = leftItem(d); i.since = 2027; i.until = 2027; }],
  // 1.5.0 (ops decision D165 item 3).
  ['organisationPage', 'organisation-pictures with no copy named yet', (d) => { delete orgGroup(d).picture; for (const i of sectionOf(d, 'adopter').items) delete i.picture; }],
  ['organisationPage', "an organisation's copy on an adopter item alone", (d) => { delete orgGroup(d).picture; }],
  ['organisationPage', 'organisation-pictures with no cards member (the owner\'s icon by default)', (d) => { delete d.cards; }],
  // 1.6.0 (a certificate's period by its months).
  ['page', 'a certificate item without months (a document built before 1.6.0)', (d) => { delete certificateOf(d).months; }],
  ['page', 'a period across two years', (d) => { const c = certificateOf(d); c.years = { from: 2026, to: 2027 }; c.months = { from: '2026-11', to: '2027-01' }; }]
];

const CONTRACT = {
  page: 'contributor-page.v1',
  anonymous: 'contributor-page.v1',
  aboutOwnPage: 'contributor-page.v1',
  settings: 'contributor-page-settings.v1',
  aboutSettings: 'contributor-page-settings.v1',
  cardsPage: 'contributor-page.v1',
  cardsSettings: 'contributor-page-settings.v1',
  adopterYearsPage: 'contributor-page.v1',
  organisationPage: 'contributor-page.v1',
  alias: 'contributor-page-alias.v1'
};

function refusalProblems(docs, refusals) {
  const found = [];
  const validators = {
    page: validatePage, anonymous: validatePage, aboutOwnPage: validatePage, cardsPage: validatePage, adopterYearsPage: validatePage,
    organisationPage: validatePage, settings: validateSettings, aboutSettings: validateSettings, cardsSettings: validateSettings, alias: validateAlias
  };
  for (const [base, what, breakIt] of refusals) {
    const copy = structuredClone(docs[base]);
    breakIt(copy);
    if (validators[base](copy)) found.push(['refusals', `${CONTRACT[base]} admits ${what}`]);
  }
  return found;
}

function admitsProblems(docs, admits) {
  const found = [];
  const validators = {
    page: validatePage, anonymous: validatePage, aboutOwnPage: validatePage, cardsPage: validatePage, adopterYearsPage: validatePage,
    organisationPage: validatePage, settings: validateSettings, aboutSettings: validateSettings, cardsSettings: validateSettings
  };
  for (const [base, what, change] of admits) {
    const copy = structuredClone(docs[base]);
    change(copy);
    if (!validators[base](copy)) found.push(['admits', `${CONTRACT[base]} refuses ${what} (${ajv.errorsText(validators[base].errors)})`]);
  }
  return found;
}

/* -------------------------------------------------------------------------- goldens */

function goldenFilesProblems(names) {
  const found = [];
  for (const name of names.filter((n) => !GOLDENS.includes(n))) found.push(['goldens', `examples/${name} is a golden file no gate checks`]);
  for (const name of GOLDENS.filter((n) => !names.includes(n))) found.push(['goldens', `examples/${name} is missing`]);
  return found;
}

/* ------------------------------------------------------------------------------ run */

function allProblems(state) {
  return [
    ...contrastProblems(state.contrast, state.schemas.settings, state.schemas.page),
    ...accentProblems(state.accent, state.contrast, state.themeSha256, state.schemas.settings.$defs.preset.enum),
    ...previewProblems(state.preview),
    ...aliasProblems(state.aliasGolden, state.alias, state.page),
    ...buildProblems(state.build),
    ...groundProblems(state.ground, state.contrast, state.themeSha256, state.schemas.settings, state.schemas.page),
    ...aboutTextsProblems(state.aboutTexts),
    ...aboutGoldenProblems(state.aboutGolden, state.aboutTexts, state.aboutTextsSha256, state.schemas.page),
    ...neverProblems(state.schemas, [
      ...PAGE_EXAMPLES.map((name, i) => [`examples/${name}`, i === 0 ? state.page : state.anonymous]),
      ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document]),
      ['examples/contributor-page-alias.v1.example.json', state.alias],
      ['examples/contributor-page.v1.header.example.json', state.header],
      ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
      ['examples/contributor-page.v1.about.example.json', state.aboutPage],
      ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
      ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
      ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
      ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage],
      [`examples/${ABOUT_FILE}`, state.aboutTexts],
      [`examples/${ABOUT_GOLDEN}`, state.aboutGolden]
    ]),
    ...defaultsProblems(state.defaults, state.schemas.settings, state.aboutTexts.current),
    ...agreeProblems(state.schemas.settings, state.schemas.page),
    ...factsProblems([
      ['examples/contributor-page.v1.example.json', state.page],
      ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
      ['examples/contributor-page.v1.header.example.json', state.header],
      ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
      ['examples/contributor-page.v1.about.example.json', state.aboutPage],
      ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
      ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
      ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
      ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage]
    ]),
    ...cardsProblems(state),
    ...adopterYearsProblems(
      [
        ['examples/contributor-page.v1.example.json', state.page],
        ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
        ['examples/contributor-page.v1.header.example.json', state.header],
        ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
        ['examples/contributor-page.v1.about.example.json', state.aboutPage],
        ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
        ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
        ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
        ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage],
        ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document])
      ],
      state.preview.vectors
    ),
    ...organisationsProblems(
      [
        ['examples/contributor-page.v1.example.json', state.page],
        ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
        ['examples/contributor-page.v1.header.example.json', state.header],
        ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
        ['examples/contributor-page.v1.about.example.json', state.aboutPage],
        ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
        ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
        ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
        ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage],
        ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document])
      ],
      state.preview.vectors
    ),
    ...monthsProblems(
      [
        ['examples/contributor-page.v1.example.json', state.page],
        ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
        ['examples/contributor-page.v1.header.example.json', state.header],
        ['examples/contributor-page.v1.own-ground.example.json', state.ownGround],
        ['examples/contributor-page.v1.about.example.json', state.aboutPage],
        ['examples/contributor-page.v1.about-own.example.json', state.aboutOwnPage],
        ['examples/contributor-page.v1.cards.example.json', state.cardsPage],
        ['examples/contributor-page.v1.adopter-years.example.json', state.adopterYearsPage],
        ['examples/contributor-page.v1.organisation-pictures.example.json', state.organisationPage],
        ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document])
      ],
      state.preview.vectors
    ),
    ...refusalProblems(state, state.refusals ?? REFUSALS),
    ...admitsProblems(state, state.admits ?? ADMITS),
    ...goldenFilesProblems(state.goldenFiles)
  ];
}

const SELF_TEST = [
  ['contrast', (s) => { s.contrast.rows[3].ratios.accent = 6.0; }],
  ['contrast', (s) => { s.contrast.rows[2].muted = '#b0a090'; }],
  ['contrast', (s) => { s.contrast.rows = s.contrast.rows.filter((r) => r.preset !== 'signal'); }],
  ['surface', (s) => { s.contrast.rows[6].surface = '#3a4a66'; }],
  ['surface', (s) => { s.contrast.rows[4].surfaceRatios.muted = 9.99; }],
  ['print', (s) => { s.contrast.rows = s.contrast.rows.filter((r) => !(r.preset === 'gold' && r.mode === 'print')); }],
  ['print', (s) => { const row = s.contrast.rows.find((r) => r.preset === 'mint' && r.mode === 'print'); row.ground = '#eef7f2'; }],
  ['guard-ends', (s) => { const row = s.contrast.rows.find((r) => r.preset === 'midnight' && r.mode === 'print'); row.ink = '#767676'; }],
  ['guard-ends', (s) => { s.contrast.minimums.guard = 4.5; }],
  ['status', (s) => { delete s.contrast.status.show.certificate.superseded; }],
  ['status', (s) => { s.contrast.status.tones.dark.bad.background = '#7a4a4a'; }],
  ['status', (s) => { s.contrast.status.ratios.light.ok = 9.5; }],
  ['status', (s) => { s.contrast.status.tones.print.neutral.background = '#eef1f4'; }],
  ['covers', (s) => { delete s.contrast.covers.presets.dusk; }],
  ['covers', (s) => { s.contrast.covers.angle = 45; }],
  ['accent', (s) => { s.accent.cases[0].k.light = 1; }],
  ['accent', (s) => { const c = s.accent.cases.find((x) => x.k.print > 0); c.accent.print = c.raw; }],
  ['accent', (s) => { const c = s.accent.cases.find((x) => x.onAccent.light === '#000000'); c.onAccent.light = '#ffffff'; }],
  ['accent', (s) => { s.accent.themeSha256 = '0'.repeat(64); }],
  ['accent', (s) => { const c = s.accent.cases.find((x) => SEEDED.test(x.id)); c.raw = c.raw === '#000001' ? '#000002' : '#000001'; }],
  ['accent', (s) => { s.accent.cases = s.accent.cases.filter((x) => !SEEDED.test(x.id)); }],
  ['accent', (s) => { s.accent.cases = s.accent.cases.filter((x) => !(x.note ?? '').startsWith('neighbour')); }],
  ['accent', (s) => { s.accent.cases = s.accent.cases.filter((x) => !(x.preset === 'gold' && x.raw === '#7a5a17')); }],
  ['accent', (s) => { s.contrast.rows.find((r) => r.preset === 'purpose' && r.mode === 'dark').ink = '#ffffff'; }],
  ['preview', (s) => { s.preview.vectors[0].previewSha256 = '0'.repeat(64); }],
  ['preview', (s) => { s.preview.vectors[1].preimage.picture = { kind: 'github', letters: 'S' }; }],
  ['preview', (s) => { s.preview.vectors = s.preview.vectors.filter((v) => v.id !== 'PV-3'); }],
  ['unicode', (s) => { const v = s.preview.vectors[1]; v.document.identity.displayName = 'Sam \ud800'; v.preimage.identity.displayName = 'Sam \ud800'; }],
  ['alias', (s) => { s.aliasGolden.vectors[0].addressMac = s.aliasGolden.vectors[2].addressMac; }],
  ['alias', (s) => { s.aliasGolden.vectors[3].hmacSha256Hex = '0'.repeat(64); }],
  ['alias', (s) => { s.aliasGolden.vectors = s.aliasGolden.vectors.filter((v) => v.id !== 'AV-2'); }],
  ['build', (s) => { const v = s.build.vectors[0]; v.expect.repositories.groups.push({ owner: 'sam-codes', repos: [{ nodeId: 'R_kgDOSMPL0021', name: 'dotfiles', years: { from: 2026, to: 2026 }, listing: 'registered' }] }); }],
  ['build', (s) => { s.build.vectors[0].expect.counts.projects = 3; }],
  ['build', (s) => { s.build.vectors = s.build.vectors.filter((v) => v.id !== 'BV-3'); }],
  ['ground', (s) => { s.ground.themeSha256 = '0'.repeat(64); }],
  ['ground', (s) => { s.ground.guard.target = 4.5; }],
  ['ground', (s) => { s.contrast.rows.find((r) => r.preset === 'purpose' && r.mode === 'dark').ink = '#ffffff'; }],
  ['ground', (s) => { s.ground.cases[0].k += 1; }],
  ['ground', (s) => { const c = s.ground.cases.find((x) => x.k > 0); c.row.muted = c.row.ink === '#14170f' ? '#4d5347' : '#b4b3a5'; }],
  ['ground', (s) => { const c = s.ground.cases.find((x) => SEEDED_GROUND.test(x.id)); c.raw = c.raw === '#000001' ? '#000002' : '#000001'; }],
  ['ground', (s) => { s.ground.cases = s.ground.cases.filter((x) => !(x.note ?? '').startsWith('neighbour')); }],
  ['ground', (s) => { s.ground.palettes.mocha[1].light.surface = '#ffffff'; }],
  ['ground', (s) => { s.ground.palettes.purpose[4].ratios.dark.ink = 9.99; }],
  ['ground', (s) => { delete s.ground.palettes.purpose[0].dark; }],
  ['ground', (s) => { s.ground.palettes.signal.pop(); }],
  ['ground', (s) => { s.ground.palettes.mint[0].light.ground = '#eef7f2'; }],
  ['ground', (s) => { const t = s.ground.themeCases.find((x) => x.theme.ground?.dark); t.theme.accent.dark = t.theme.accent.light; }],
  ['ground', (s) => { s.ground.themeCases = s.ground.themeCases.filter((x) => !(x.preset === 'purpose' && /^#/.test(x.ground ?? ''))); }],
  ['build', (s) => { const v = s.build.about.find((x) => x.input.textRules === 'refused'); v.expect.about = { variant: 'own', version: 1, text: v.input.about.ownText }; }],
  ['build', (s) => { s.build.about = s.build.about.filter((v) => v.input.about.on); }],
  ['build', (s) => { const v = s.build.cards.find((x) => x.input.cards === null); v.expect.cards.icon = 'github'; }],
  ['build', (s) => { s.build.cards = s.build.cards.filter((v) => v.input.cards?.icon !== 'none'); }],
  ['build', (s) => { s.build.cards = s.build.cards.filter((v) => v.input.cards !== null && Object.keys(v.input.cards).length !== 0); }],
  ['cards', (s) => { delete s.anonymous.cards; }],
  ['cards', (s) => { delete s.preview.vectors[2].document.cards.otherNames; }],
  ['cards', (s) => { const { cards, ...rest } = s.aboutPage; s.aboutPage = { ...rest, cards }; }],
  ['cards', (s) => { s.schemas.settings.properties.cards.properties.ownNames.default = 'owner/name'; }],
  ['cards', (s) => { s.schemas.page.properties.cards.properties.icon.default = 'github'; }],
  ['cards', (s) => { s.schemas.page.required = [...s.schemas.page.required, 'cards']; }],
  ['cards', (s) => { s.settingsExamples['contributor-page-settings.v1.cards.example.json'].cards.ownNames = 'name'; }],
  ['cards', (s) => { for (const v of s.preview.vectors) v.document.cards = { ...CARDS_DEFAULTS }; }],
  ['adopter', (s) => { leftItem(s.adopterYearsPage).since = 2028; }],
  ['adopter', (s) => { delete leftItem(s.preview.vectors.find((v) => v.id === 'PV-7').document).since; }],
  ['adopter', (s) => { for (const v of s.preview.vectors) for (const x of v.document.sections) if (x.id === 'adopter') for (const i of x.items) delete i.until; }],
  ['adopter', (s) => { s.build.adopter.find((v) => v.id === 'BY-8').expect.adopter.items[0].until = 2027; }],
  ['adopter', (s) => { delete s.build.adopter.find((v) => v.id === 'BY-3').expect.adopter.items[0].until; }],
  ['adopter', (s) => { s.build.adopter.find((v) => v.id === 'BY-9').expect.adopter.items[0].since = 2026; }],
  ['adopter', (s) => { s.build.adopter.find((v) => v.id === 'BY-7').expect.adopter = { id: 'adopter', items: [{ nodeId: 'R_kgDOSMPL0067', fullName: 'example-org/comeback', evidence: { kind: 'merged-pr', number: 58 }, since: 2028, until: 2027 }] }; }],
  ['adopter', (s) => { s.build.adopter = s.build.adopter.filter((v) => v.id !== 'BY-6'); }],
  ['adopter', (s) => { s.build.adopter = s.build.adopter.filter((v) => v.id !== 'BY-4'); }],
  ['adopter', (s) => { s.build.adopter = []; }],
  ['preview', (s) => { const v = s.preview.vectors.find((x) => x.id === 'PV-8'); v.preimage = structuredClone(v.document); delete v.preimage.generatedAt; delete v.preimage.versionId; v.preimage.picture = { kind: 'github' }; }],
  ['organisations', (s) => { s.build.organisations.find((v) => v.id === 'BO-1').expect.organisations.push({ login: 'sam-codes', ownerNodeId: 'U_kgDOSMPL0113', h16: '2d4f6a8c0e1b3d5f' }); }],
  ['organisations', (s) => { s.build.organisations.find((v) => v.id === 'BO-4').expect.organisations = [{ login: 'example-org', ownerNodeId: 'O_kgDOSMPL0101', h16: '9b2e4c6a8d0f1e3a' }]; }],
  ['organisations', (s) => { s.build.organisations.find((v) => v.id === 'BO-7').expect.organisations = [{ login: 'example-contributor', ownerNodeId: 'O_kgDOSMPL0101', h16: '9b2e4c6a8d0f1e3a' }]; }],
  ['organisations', (s) => { s.build.organisations = s.build.organisations.filter((v) => v.id !== 'BO-6'); }],
  ['organisations', (s) => { s.build.organisations = []; }],
  ['organisations', (s) => { s.organisationPage.autoUpdated = s.organisationPage.autoUpdated.filter((x) => x !== 'organisation-pictures'); }],
  ['organisations', (s) => { sectionOf(s.organisationPage, 'repositories').groups[0].picture = { h16: '9b2e4c6a8d0f1e3a' }; }],
  ['organisations', (s) => { sectionOf(s.organisationPage, 'adopter').items[0].picture = { h16: '0000000000000000' }; }],
  ['organisations', (s) => { for (const v of s.preview.vectors) for (const x of v.document.sections) if (x.id === 'repositories') for (const g of x.groups) delete g.picture; }],
  ['about', (s) => { s.aboutTexts.versions[0].short.paragraphs[0] += ' It is lovely.'; }],
  ['about', (s) => { s.aboutTexts.current = 2; }],
  ['about', (s) => { const v = s.aboutTexts.versions[0]; v.invite.withCertificates = v.invite.withoutCertificates; }],
  ['about', (s) => { delete s.aboutTexts.versions[0].medium.lint; }],
  ['about', (s) => { s.aboutGolden.textsSha256 = '0'.repeat(64); }],
  ['about', (s) => { s.aboutGolden.sentences[4].expect.proof = s.aboutGolden.sentences[5].expect.proof; }],
  ['about', (s) => { s.aboutGolden.sentences = s.aboutGolden.sentences.filter((v) => v.input.certificatesIssued); }],
  ['about', (s) => { s.aboutGolden.sentences = s.aboutGolden.sentences.filter((v) => v.id !== 'AV-10'); }],
  ['about', (s) => { s.aboutGolden.blocks[2].expect.paragraphs.pop(); }],
  ['about', (s) => { delete s.aboutGolden.certificatesIssued.sample; }],
  ['about', (s) => { s.aboutGolden.certificatesIssued.sample = true; }],
  ['never', (s) => { s.schemas.page.$defs.summarySection.properties.rank = { type: 'integer' }; }],
  ['never', (s) => { s.anonymous.identity.bio = 'Paid CHF 120 to get here'; }],
  ['never', (s) => { s.anonymous.identity.bio = 'MDQ6VXNlcjEyMzQ1Njc='; }],
  ['never', (s) => { s.schemas.page.$defs.summarySection.properties.months = { type: 'object' }; }],
  ['never', (s) => { s.schemas.settings.properties.months = { type: 'object' }; }],
  ['never', (s) => { s.schemas.page.$defs.certificatesSection.properties.items.items.properties.months.properties.points = { type: 'integer' }; }],
  ['never', (s) => { s.schemas.page.$defs.certificatesSection.properties.items.items.properties.month = { type: 'string' }; }],
  ['months', (s) => { delete certificateOf(s.page).months; }],
  ['months', (s) => { certificateOf(s.anonymous).months.from = '2026-10'; }],
  ['months', (s) => { certificateOf(s.page).months.to = '2027-01'; }],
  ['months', (s) => { certificateOf(s.cardsPage).months = { from: '2027-01' }; }],
  ['months', (s) => { for (const v of s.preview.vectors) for (const x of v.document.sections) if (x.id === 'certificates') for (const i of x.items) i.months = { from: `${i.years.from}-01`, to: `${i.years.to}-12` }; }],
  ['admits', (s) => { s.admits = [['page', "a day in a certificate's months", (d) => { certificateOf(d).months = { from: '2026-01-15', to: '2026-12' }; }]]; }],
  ['refusals', (s) => { s.refusals = [['page', 'a period across two years', (d) => { const c = certificateOf(d); c.years = { from: 2026, to: 2027 }; c.months = { from: '2026-11', to: '2027-01' }; }]]; }],
  ['defaults', (s) => { s.defaults.address = 'login'; }],
  ['defaults', (s) => { s.defaults.linksPlacement = 'section'; }],
  ['defaults', (s) => { delete s.defaults.about; }],
  ['defaults', (s) => { s.defaults.about.version = 2; }],
  ['agree', (s) => { s.schemas.page.properties.about.properties.variant.enum = ['short', 'medium', 'long']; }],
  ['agree', (s) => { s.schemas.page.properties.cards.properties.icon.enum = ['owner', 'github']; }],
  ['agree', (s) => { s.schemas.settings.properties.cards.properties.otherNames.enum = ['owner/name', 'name']; }],
  ['defaults', (s) => { s.defaults.cards = { icon: 'github' }; }],
  ['admits', (s) => { s.admits = [['cardsSettings', 'the GitHub picture as an icon', (d) => { d.cards.icon = 'avatar'; }]]; }],
  ['admits', (s) => { s.admits = [['adopterYearsPage', 'a left year without its since', (d) => { delete leftItem(d).since; }]]; }],
  ['refusals', (s) => { s.refusals = [['adopterYearsPage', 'the adopter-years page unchanged', () => {}]]; }],
  ['refusals', (s) => { s.refusals = [['cardsPage', 'the cards page unchanged', () => {}]]; }],
  ['refusals', (s) => { s.refusals = [['organisationPage', 'the organisation-pictures page unchanged', () => {}]]; }],
  ['admits', (s) => { s.admits = [['organisationPage', "an organisation's picture as an address", (d) => { orgGroup(d).picture.url = 'https://avatars.githubusercontent.com/u/1?v=4'; }]]; }],
  ['admits', (s) => { s.admits = [['aboutSettings', 'own words of 601 code points', (d) => { d.about.ownText = 'a'.repeat(601); }]]; }],
  ['agree', (s) => { s.schemas.page.properties.layout.enum = ['paper', 'profile']; }],
  ['agree', (s) => { s.schemas.page.$defs.groundId.enum = s.schemas.page.$defs.groundId.enum.slice(1); }],
  ['admits', (s) => { s.admits = [['settings', 'a background named by a colour name', (d) => { d.theme.ground = 'Cream'; }]]; }],
  ['facts', (s) => { sectionOf(s.page, 'links').items[0].url = 'https://www.linkedin.com/in/someone-else'; }],
  ['facts', (s) => { sectionOf(s.page, 'summary').projects = 4; }],
  ['facts', (s) => { sectionOf(s.header, 'links').items[1].url = 'https://mastodon.social/@alex'; }],
  ['refusals', (s) => { s.refusals = [['page', 'an unchanged page', () => {}]]; }],
  ['goldens', (s) => { s.goldenFiles = [...s.goldenFiles, 'unchecked.v1.golden.json']; }]
];

function selfTest() {
  const problems = [];
  for (const [rule, breakIt] of SELF_TEST) {
    const state = baseState();
    breakIt(state);
    if (!allProblems(state).some(([fired]) => fired === rule)) problems.push(`self-test: breaking a copy for rule "${rule}" was not caught`);
  }
  return problems;
}

function baseState() {
  const goldenFiles = readdirSync(EXAMPLE_DIR).filter((name) => name.endsWith('.golden.json')).sort();
  return { ...structuredClone(real), goldenFiles };
}

if (process.argv.includes('--print-ground-golden')) {
  process.stdout.write(groundGoldenText(real.ground, real.contrast, real.themeSha256));
  process.exit(0);
}

if (process.argv.includes('--print-accent-golden')) {
  process.stdout.write(accentGoldenText(real.accent, real.contrast, real.themeSha256, real.schemas.settings.$defs.preset.enum));
  process.exit(0);
}

const selfTestProblems = selfTest();
if (selfTestProblems.length > 0) fail(selfTestProblems, '');

const state = baseState();
const problems = allProblems(state).map(([, message]) => message);
fail(
  problems,
  `the contributor page contracts hold: ${state.contrast.rows.length} theme rows meet WCAG 2.2 AA on their grounds and surfaces as recorded, ` +
    `the status chips and covers match the schemas, ${state.accent.cases.length} accent guard cases recompute, ` +
    `${state.ground.cases.length} ground guard cases, ${Object.values(state.ground.palettes).reduce((n, p) => n + p.reduce((m, s) => m + (s.dark ? 2 : 1), 0), 0)} palette rows and ${state.ground.themeCases.length} document themes recompute, ` +
    `${state.preview.vectors.length} preview vectors recompute, ${state.aliasGolden.vectors.length} alias MAC vectors recompute, ` +
    `${state.build.vectors.length} builder vectors keep a hidden login off the repository list, ${state.build.about.length} write the about block, ` +
    `${state.build.cards.length} write the cards' choices resolved, ${state.build.adopter.length} list the licence adopter's repositories with their years, ` +
    `${state.build.organisations.length} judge whose organisation picture a page may name, ` +
    `${state.aboutTexts.versions.length} version(s) of our about texts hold their recorded digests, ${state.aboutGolden.sentences.length} about sentences and ${state.aboutGolden.blocks.length} blocks recompute, ` +
    'every certificate item names its period by its months, in order and in its years, ' +
    'no page member or example carries points, money or a GitHub id, ' +
    `the defaults are the schema's, ${REFUSALS.length} refusals and ${ADMITS.length} admissions hold, and every rule was proved able to fail`,
);

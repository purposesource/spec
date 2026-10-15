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
 *              between them reduce a GitHub picture, keep an upload, drop a card's files, and
 *              carry non-ASCII text. Every string of a preimage is well-formed Unicode: a lone
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
 *   never      no member of the three page schemas is named for points, shares, bands, ranks,
 *              percentiles, scores, months, amounts or a person's GitHub id, and no published page
 *              example or vector carries a currency figure, a person's GitHub node id (the current
 *              `U_` form or the legacy base64 "04:User" form) or a GitHub picture address (design
 *              §8.7; the plan's correction 11; design correction 5).
 *   defaults   the `defaults` settings example is the schema's `default` for every required member,
 *              so the document a new person starts from is the one the schema describes (status-only by
 *              default, the GitHub picture; design §2.4 and the D116 dated note of ~11:50Z), and it
 *              leaves every optional member out (1.1.0: the api writes one only when it differs from
 *              its default, so a document stored before it keeps its bytes and its hash).
 *   agree      the closed lists the settings and the public document share are the same lists (1.1.0:
 *              the links' two places, the display parts and the palette ids among them).
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
 *              whose accent keeps one.
 *   admits     what 1.1.0 adds is admitted, proved on copies of the examples: icon-only links beside
 *              the name, the GitHub line's parts, the website's display, a palette swatch and an own
 *              colour in the settings, and a `purpose` pair, an own colour and a swatch of another
 *              preset in the document.
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
  'contributor-page-ground.v1.golden.json'
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
  settings: example('contributor-page-settings.v1.example.json'),
  defaults: example('contributor-page-settings.v1.defaults.example.json'),
  alias: example('contributor-page-alias.v1.example.json'),
  schemas: { page: schemaJson(PAGE), settings: schemaJson(SETTINGS), alias: schemaJson(ALIAS) }
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
  return out;
}

const validatePage = validator(PAGE);

function previewProblems(golden) {
  const found = [];
  const add = (rule, message) => found.push([rule, `examples/contributor-page-preview.v1.golden.json: ${message}`]);
  const vectors = golden.vectors ?? [];
  if (vectors.length === 0) add('preview', 'no vectors — this gate would pass vacuously');
  const exercised = { githubReduced: false, uploadKept: false, cardDropped: false, nonAscii: false };
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
  return found;
}

/* ---------------------------------------------------------------------------- never */

const BANNED_MEMBER = /^(points?|microshares?|shares?|bands?|ranks?|ranking|percentiles?|scores?|months?|amounts?|.*minor|impact.*|subid|sub|githubid|usernodeid|avatarurl.*)$/i;
const CURRENCY = /\b(?:CHF|EUR|USD|GBP)\b|[$€£]\s?[0-9]|[0-9]\s?(?:CHF|EUR|USD|GBP)\b/;
/** A user's GitHub node id: the current `U_…` form, or the legacy base64 of "04:User…". */
const PERSON_NODE_ID = /^(?:U_[A-Za-z0-9_-]+|MDQ6VXNlcj[A-Za-z0-9+/=]*)$/;
const PICTURE_SOURCE = /githubusercontent\.com/i;

function memberNames(node, out = []) {
  if (Array.isArray(node)) for (const item of node) memberNames(item, out);
  else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'properties' || key === 'patternProperties') && value && typeof value === 'object') out.push(...Object.keys(value));
      memberNames(value, out);
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
    for (const member of memberNames(schema).filter((m) => BANNED_MEMBER.test(m))) {
      found.push(['never', `the ${name} schema has a member named ${member}: no page carries points, shares, ranks, months, amounts or a person's GitHub id (design §8.7)`]);
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
function defaultsProblems(defaults, settingsSchema) {
  const found = [];
  const add = (message) => found.push(['defaults', `examples/contributor-page-settings.v1.defaults.example.json: ${message}`]);
  const required = settingsSchema.required ?? [];
  for (const [member, schema] of Object.entries(settingsSchema.properties)) {
    if (member === 'schemaVersion') continue;
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
    ['palette id', s.$defs.groundId?.enum, p.$defs.groundId?.enum]
  ];
  for (const [what, a, b] of pairs) {
    if ((a ?? []).join(',') !== (b ?? []).join(',')) found.push(['agree', `the ${what} lists differ: settings [${a}], page [${b}]`]);
  }
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
  ['page', 'a ground named by a colour name', (d) => { d.theme = { preset: 'mocha', accent: ACCENT.mocha, ground: { raw: 'Cream', light: ROW.cream } }; }]
];

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
  }]
];

const CONTRACT = { page: 'contributor-page.v1', anonymous: 'contributor-page.v1', settings: 'contributor-page-settings.v1', alias: 'contributor-page-alias.v1' };

function refusalProblems(docs, refusals) {
  const found = [];
  const validators = { page: validatePage, anonymous: validatePage, settings: validateSettings, alias: validateAlias };
  for (const [base, what, breakIt] of refusals) {
    const copy = structuredClone(docs[base]);
    breakIt(copy);
    if (validators[base](copy)) found.push(['refusals', `${CONTRACT[base]} admits ${what}`]);
  }
  return found;
}

function admitsProblems(docs, admits) {
  const found = [];
  const validators = { page: validatePage, anonymous: validatePage, settings: validateSettings };
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
    ...neverProblems(state.schemas, [
      ...PAGE_EXAMPLES.map((name, i) => [`examples/${name}`, i === 0 ? state.page : state.anonymous]),
      ...state.preview.vectors.map((v) => [`examples/contributor-page-preview.v1.golden.json ${v.id}`, v.document]),
      ['examples/contributor-page-alias.v1.example.json', state.alias],
      ['examples/contributor-page.v1.header.example.json', state.header],
      ['examples/contributor-page.v1.own-ground.example.json', state.ownGround]
    ]),
    ...defaultsProblems(state.defaults, state.schemas.settings),
    ...agreeProblems(state.schemas.settings, state.schemas.page),
    ...factsProblems([
      ['examples/contributor-page.v1.example.json', state.page],
      ['examples/contributor-page.v1.anonymous.example.json', state.anonymous],
      ['examples/contributor-page.v1.header.example.json', state.header],
      ['examples/contributor-page.v1.own-ground.example.json', state.ownGround]
    ]),
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
  ['never', (s) => { s.schemas.page.$defs.summarySection.properties.rank = { type: 'integer' }; }],
  ['never', (s) => { s.anonymous.identity.bio = 'Paid CHF 120 to get here'; }],
  ['never', (s) => { s.anonymous.identity.bio = 'MDQ6VXNlcjEyMzQ1Njc='; }],
  ['defaults', (s) => { s.defaults.address = 'login'; }],
  ['defaults', (s) => { s.defaults.linksPlacement = 'section'; }],
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
    `${state.build.vectors.length} builder vectors keep a hidden login off the repository list, no page member or example carries points, money or a GitHub id, ` +
    `the defaults are the schema's, ${REFUSALS.length} refusals and ${ADMITS.length} admissions hold, and every rule was proved able to fail`,
);

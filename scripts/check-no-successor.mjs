#!/usr/bin/env node
/**
 * Gate: no new successor version of anything public, until the launch (ops decision D136).
 *
 * THE RULE IS D136 ITEM 1 (2026-10-12): until the operator says the network is public, nothing
 * public gets a second version. A change to a contract, a document, a kit, the coverage function
 * or an address lands in place inside its v1, with a pre-release minor and a dated note
 * (versioning policy rule 5 in CHANGELOG.md), and a second version made earlier folds back into
 * its v1. The fold of 2026-10-12 did that for the claim kit, its schema, the coverage function,
 * the certificate template and the retired addresses. This gate keeps the next one from arriving
 * one convenient commit at a time: a later number is the obvious name for a changed thing, and
 * every one the fold found had been made in good faith.
 *
 * WHAT IT MATCHES: PUBLIC NAMES, BY SHAPE. Each rule is a way a successor was actually named
 * before the fold (N is 2 to 99, never the start of a longer number such as a year):
 *
 *   address        `/vN` as a path segment: /kits/vN, /legal/{doc}/vN.json, /schedule/vN/
 *   contract       `.vN` after a name: a schema or contract id or file (claim-kit.vN.json)
 *   document-id    the documents that count their own versions: kit-N, att-N, cov-vN,
 *                  ent-terms-N, adoption-pr/N
 *   named-version  a document word, then vN: "Statutes vN", "template vN", "privacy-vN"
 *   version-field  a version member set to N: schemaVersion, templateVersion, policyVersion, …
 *
 * It reads every tracked text file (`git ls-files`; never node_modules, a build output, a
 * lockfile, a binary or a font) and checks the NAME of every tracked file, binaries included,
 * because a new file is the most direct way a successor arrives.
 *
 * WHAT IT DOES NOT MATCH, deliberately: a bare `vN` token. Across the two publishing repositories
 * that pattern finds about three hundred lines, and nearly all of them are another party's
 * version (`actions/checkout@v4`, V8 the engine), an internal label (an ops design document's
 * "plan v2") or a test's data. An allowlist that long is one nobody reads, and an allowlist nobody
 * reads hides the next real hit. Prose is covered where it names a document (named-version).
 *
 * THE ALLOWLIST is scripts/no-successor-allowlist.json: one entry per accepted hit, each with the
 * path (or `*` for another party's name wherever it appears), the text the hit sits inside, and a
 * one-line reason. An entry covers a hit only when the hit lies INSIDE an occurrence of its text
 * on that line, so an entry for a third-party address cannot hide a successor written beside it.
 * An entry without `text` covers a whole file, name included, and needs the stronger reason. An
 * entry that covers nothing fails the gate and names itself: the list shrinks with the content.
 *
 * THE SWITCH is `public` in the same file. It stays false until the operator says the network is
 * public; then it becomes true, and this gate passes without reading anything. One place in each
 * repository: the website carries the same gate, with the same core and its own allowlist.
 *
 * Two files are not scanned: this one and the allowlist, which necessarily contain the shapes
 * they exist to find.
 *
 * ANTI-INERTIA. Before it reads the repository it plants every shape, the near misses that must
 * stay clean, a binary and a skipped directory, an allowlisted hit, a successor written beside an
 * allowlisted one and a stale entry in a throwaway directory, and asserts the whole result. After
 * the scan it checks that the file list reached this repository's own landmarks, so an empty
 * `git ls-files` cannot pass.
 *
 * Run: node scripts/check-no-successor.mjs [--root <dir>]
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

import { ROOT, fail } from './lib/spec.mjs';

/* ==== SHARED CORE — byte-identical in the spec and website repositories. Keep it so. ==== */

const SELF = 'scripts/check-no-successor.mjs';
const ALLOWLIST = 'scripts/no-successor-allowlist.json';

/** 2 to 99, and not the start of a longer number: kit-2 and kit-12 match, kit-2026 does not. */
const N = '(?:[2-9]|[1-9][0-9])(?![0-9])';

/** The words that name a public document (no "plan" and no "design": those are ops labels). */
const DOCUMENT_WORDS =
  'statutes|constitution|terms|kit|template|schedule|policy|notice|edition|licen[cs]e|' +
  'attestations?|privacy|imprint|refunds?|schema|contract|badge|card|certificate|coverage|' +
  'page|list|version';

/** The members that carry a version of something published. */
const VERSION_FIELDS = 'schema|template|schedule|policy|terms|kit|claimKit|attKit|algo|coverage';

const RULES = [
  {
    id: 'address',
    re: new RegExp(`/v${N}(?![A-Za-z_])`, 'g'),
    what: 'a version segment in an address (/kits/vN, /legal/{doc}/vN.json)',
  },
  {
    id: 'contract',
    re: new RegExp(`(?<=[a-z0-9])\\.v${N}(?![A-Za-z_])`, 'g'),
    what: 'a contract or schema id or file name ({name}.vN, {name}.vN.json)',
  },
  {
    id: 'document-id',
    re: new RegExp(`\\b(?:kit-v?|att-|cov-v|ent-terms-|adoption-pr/)${N}`, 'g'),
    what: 'a document counter (kit-N, att-N, cov-vN, ent-terms-N, adoption-pr/N)',
  },
  {
    id: 'named-version',
    re: new RegExp(`\\b(?:${DOCUMENT_WORDS})[ -]v${N}(?![A-Za-z_])`, 'gi'),
    what: 'a document named with a later version ("Statutes vN", "template vN")',
  },
  {
    id: 'version-field',
    re: new RegExp(`\\b(?:${VERSION_FIELDS})Version["']?\\s*[:=]\\s*["']?v?${N}(?![A-Za-z_])`, 'g'),
    what: 'a version member set to a later version (schemaVersion: N, templateVersion: "vN")',
  },
];

/** Never read and never named: dependencies, build outputs, lockfiles. */
const SKIP_SEGMENTS = new Set(['node_modules', 'dist', 'build', 'dist-checkout']);
const LOCKFILES = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
]);
/** Named but never read: binaries and fonts. A NUL byte marks any other binary. */
const BINARY = /\.(?:png|jpe?g|gif|webp|avif|ico|pdf|zip|gz|tgz|br|wasm|woff2?|ttf|otf|eot)$/i;

const skipped = (path) => {
  const segments = path.split('/');
  return segments.some((s) => SKIP_SEGMENTS.has(s)) || LOCKFILES.has(segments[segments.length - 1]);
};

/** Every hit in one text (a line, or "/" + a file's path); overlapping matches count once. */
function hitsIn(text) {
  const hits = [];
  for (const rule of RULES) {
    for (const m of text.matchAll(rule.re)) {
      const start = m.index;
      const end = start + m[0].length;
      if (hits.some((h) => start < h.end && h.start < end)) continue;
      hits.push({ rule: rule.id, start, end, token: m[0] });
    }
  }
  return hits.sort((a, b) => a.start - b.start);
}

/** True when the hit lies inside one occurrence of `text` in `line`. */
function inside(line, text, hit) {
  for (let at = line.indexOf(text); at !== -1; at = line.indexOf(text, at + 1)) {
    if (at <= hit.start && hit.end <= at + text.length) return true;
  }
  return false;
}

/** The allowlist's own problems: an entry that cannot be read the way it is meant is refused. */
function allowlistProblems(doc, tracked) {
  const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const oneLine = (v) => typeof v === 'string' && v.trim() !== '' && !/[\r\n]/.test(v);
  if (!isObject(doc)) return [`${ALLOWLIST} is not a JSON object`];
  const problems = [];
  if (typeof doc.public !== 'boolean') problems.push(`${ALLOWLIST}: "public" must be a boolean`);
  if (!Array.isArray(doc.allow)) return [...problems, `${ALLOWLIST}: "allow" must be a list`];
  const seen = new Set();
  doc.allow.forEach((entry, i) => {
    const say = (what) => problems.push(`${ALLOWLIST} allow[${i}]${what}`);
    if (!isObject(entry)) {
      say(' is not an object');
      return;
    }
    const extra = Object.keys(entry).filter((k) => !['path', 'text', 'reason'].includes(k));
    if (extra.length > 0) say(` has unknown member(s) ${extra.join(', ')} (path, text, reason)`);
    if (!oneLine(entry.path)) {
      say(': "path" must be a tracked file\'s path, or *');
    } else if (entry.path !== '*' && !tracked.has(entry.path)) {
      say(`: ${entry.path} is not a tracked file`);
    }
    if (!oneLine(entry.reason)) {
      say(': "reason" must be one line saying why this is not a public successor');
    }
    if (entry.text !== undefined && !oneLine(entry.text)) say(': "text" must be one line');
    if (entry.path === '*' && entry.text === undefined) {
      say(': an entry for every file needs a "text"');
    }
    const key = `${entry.path}\u0000${entry.text ?? ''}`;
    if (seen.has(key)) say(' repeats an earlier entry');
    seen.add(key);
  });
  return problems;
}

/**
 * Reads `files` (paths relative to `root`, as git lists them) and returns the hits no entry
 * covers, the entries that covered nothing, and how much was looked at.
 */
function scan(root, files, allow) {
  const used = new Set();
  const covered = (path, line, hit) => {
    const i = allow.findIndex(
      (e) =>
        (e.path === '*' || e.path === path) && (e.text === undefined || inside(line, e.text, hit)),
    );
    if (i === -1) return false;
    used.add(i);
    return true;
  };
  const findings = [];
  let named = 0;
  let read = 0;
  let allowed = 0;
  const judge = (path, where, line) => {
    for (const hit of hitsIn(line)) {
      if (covered(path, line, hit)) allowed += 1;
      else findings.push({ path, where, rule: hit.rule, token: hit.token, line: line.trim() });
    }
  };
  for (const path of files) {
    if (skipped(path)) continue;
    named += 1;
    judge(path, 'name', `/${path}`);
    if (path === SELF || path === ALLOWLIST || BINARY.test(path)) continue;
    let bytes;
    try {
      bytes = readFileSync(join(root, path));
    } catch {
      continue; // listed by git but deleted in the work tree: there is nothing to publish
    }
    if (bytes.includes(0)) continue;
    read += 1;
    bytes
      .toString('utf8')
      .split(/\r?\n/)
      .forEach((line, i) => judge(path, i + 1, line));
  }
  const stale = allow.filter((_, i) => !used.has(i));
  return { findings, stale, named, read, allowed };
}

/** The tracked files, as git lists them. Throws when `root` is not a git work tree. */
function trackedFiles(root) {
  const listing = execFileSync('git', ['-C', root, 'ls-files', '-z'], {
    encoding: 'utf8',
    maxBuffer: 1 << 28,
  });
  return listing.split('\0').filter(Boolean);
}

/** A finding: where, which rule, the token, and (for a line) the line itself. */
function describe(f) {
  const rule = RULES.find((r) => r.id === f.rule);
  const where = f.where === 'name' ? `${f.path} (file name)` : `${f.path}:${f.where}`;
  const head = `${where}  ${f.rule} «${f.token}»: ${rule.what}`;
  if (f.where === 'name') return head;
  return `${head}\n      ${f.line.length <= 160 ? f.line : `${f.line.slice(0, 157)}…`}`;
}

const HOW_TO =
  'Until the operator says the network is public, nothing public gets a later version (ops ' +
  'decision D136 item 1, 2026-10-12): change the thing in place under its v1, with a dated ' +
  'change note (a contract also takes a pre-release minor). If a hit is not a public successor ' +
  "name (another party's version, a negative test, a dated history note), add an entry with " +
  `a one-line reason to ${ALLOWLIST}. The rule switches off in one place: "public": true in ` +
  "that file, on the operator's word that the network is public.";

/**
 * ANTI-INERTIA. A gate that cannot fail is worse than no gate, so before reading the repository
 * this plants every shape, the near misses that must stay clean, a binary, a skipped directory
 * and a lockfile, an allowlisted hit, a successor written beside an allowlisted one and a stale
 * entry, and asserts the WHOLE result. Returns null, or the sentence to print.
 */
function selfTest() {
  const dir = mkdtempSync(join(tmpdir(), 'psn-no-successor-'));
  try {
    const plant = (rel, body) => {
      mkdirSync(dirname(join(dir, rel)), { recursive: true });
      writeFileSync(join(dir, rel), body);
    };
    const files = {
      'kits/kit-2.json': '{ "permalink": "/kits/v2" }\n',
      'schemas/claim-kit.v3.json': '{}\n',
      'press/kit-5.pdf': Buffer.from([0x25, 0x50, 0x44, 0x46, 0x00, 0x6b, 0x69, 0x74]),
      'node_modules/x/kit-2.json': '"kit-2"\n',
      'package-lock.json': '"att-2"\n',
      [SELF]: 'kit-2\n',
      [ALLOWLIST]: '"kit-2"\n',
      'notes.md': [
        'Statutes v2 replace the first text.',
        'The answer names cov-v2; the card is att-4.',
        'Stamped adoption-pr/8 under ent-terms-2.',
        "render({ templateVersion: 'v2' })",
        '"schemaVersion": 3,',
        'Clean: kit-1 /kits/v1 claim-kit.v1.json cov-v1 att-1 ent-terms-1 adoption-pr/1 v1.3',
        'Clean: press-kit-2026-10-01 toolkit-2 actions/checkout@v4 V8 plan v2 /v1/x/v1.3.json',
        'Clean: schemaVersion: 1',
        'Allowed: https://cdn.example/sdk/v2/sdk.js',
        'Not hidden: https://cdn.example/sdk/v2/sdk.js beside kit-3',
      ].join('\n'),
    };
    for (const [rel, body] of Object.entries(files)) plant(rel, body);
    const allow = [
      { path: 'notes.md', text: 'cdn.example/sdk/v2/', reason: 'another party' },
      { path: 'notes.md', text: 'nowhere/v9', reason: 'stale on purpose' },
    ];
    const result = scan(dir, Object.keys(files), allow);
    const got = [
      ...result.findings.map((f) => `${f.rule} ${f.path}@${f.where} ${f.token}`).sort(),
      ...result.stale.map((e) => `stale ${e.text}`),
    ].join(' | ');
    const want = [
      ...[
        'address kits/kit-2.json@1 /v2',
        'contract schemas/claim-kit.v3.json@name .v3',
        'document-id kits/kit-2.json@name kit-2',
        'document-id press/kit-5.pdf@name kit-5',
        'named-version notes.md@1 Statutes v2',
        'document-id notes.md@2 cov-v2',
        'document-id notes.md@2 att-4',
        'document-id notes.md@3 adoption-pr/8',
        'document-id notes.md@3 ent-terms-2',
        "version-field notes.md@4 templateVersion: 'v2",
        'version-field notes.md@5 schemaVersion": 3',
        'document-id notes.md@10 kit-3',
      ].sort(),
      'stale nowhere/v9',
    ].join(' | ');
    return got === want
      ? null
      : `SELF-TEST FAILED — the matcher found [${got}] but must find [${want}]. Fix the rules ` +
          'before trusting this gate: it is inert until this passes.';
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** `--root <dir>` — scan a different work tree. Used by this gate's tests; never by CI. */
function rootArgument(argv, onError) {
  const i = argv.indexOf('--root');
  if (i === -1) return null;
  if (argv[i + 1] === undefined) onError('--root needs a directory.');
  return resolve(argv[i + 1]);
}

/** The landmarks a scan of this repository must have reached, or it read the wrong tree. */
function missingLandmarks(files, landmarks) {
  return landmarks.filter((l) => !files.some((f) => f === l || f.startsWith(`${l}/`)));
}

/* ==== END SHARED CORE ==== */

/* --------------------------------------------------------------------- this repository */

const problems = [];
const abort = (message) => {
  problems.push(message);
  fail(problems, '');
};

const root = rootArgument(process.argv.slice(2), abort) ?? ROOT;

let doc;
try {
  doc = JSON.parse(readFileSync(join(root, ALLOWLIST), 'utf8'));
} catch (error) {
  abort(
    `${ALLOWLIST} cannot be read as JSON (${error.message}); the gate has no allowlist and ` +
      'no switch',
  );
}

if (doc?.public === true) {
  console.log(
    `no-successor switched off: ${ALLOWLIST} says "public": true, so D136's rule against a later ` +
      'version no longer binds. Nothing was scanned.',
  );
  process.exit(0);
}

const selfTestFailure = selfTest();
if (selfTestFailure) abort(selfTestFailure);

let files;
try {
  files = trackedFiles(root);
} catch (error) {
  abort(
    `git ls-files failed in ${root} (${error.message.split('\n')[0]}); this gate reads the ` +
      'tracked files and will not pass without them',
  );
}

problems.push(...allowlistProblems(doc, new Set(files)));
if (problems.length > 0) fail(problems, '');

const allow = doc.allow;
const { findings, stale, named, read, allowed } = scan(root, files, allow);

for (const f of findings) problems.push(describe(f));
for (const e of stale) {
  const text = e.text === undefined ? '' : ` "${e.text}"`;
  problems.push(`${ALLOWLIST}: the entry for ${e.path}${text} covers nothing any more; delete it`);
}

if (root === ROOT) {
  const missing = missingLandmarks(files, ['package.json', 'schemas', 'openapi', 'coverage']);
  if (missing.length > 0) {
    problems.push(
      `the file list never reached ${missing.join(', ')}: this is not a scan of this repository, ` +
        'and the gate would pass vacuously',
    );
  }
}

if (findings.length > 0) console.error(`${HOW_TO}\n`);

fail(
  problems,
  `no-successor clean: ${read} file(s) read, ${named} name(s) checked, ${allowed} hit(s) ` +
    `covered by ${allow.length} allowlist entr${allow.length === 1 ? 'y' : 'ies'}; ` +
    'no new successor name (D136)',
);

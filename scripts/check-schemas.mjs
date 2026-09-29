#!/usr/bin/env node
/**
 * Gate: every published schema compiles, is addressed correctly, and carries provenance.
 *
 * This is the gate that makes the repository's promise ("machine-readable contracts you
 * can actually consume") mechanically true rather than aspirational. It asserts:
 *
 *   1. the file parses and compiles under JSON Schema draft 2020-12;
 *   2. `$id` is the published URL for that exact filename, derived from spec.config.json
 *      — so renaming the org or the domain is one edit plus a test run, not a hunt;
 *   3. NO EXTERNAL `$ref`. Each schema is self-contained. An OSPO that fetches one file
 *      must be able to validate with that one file — a cross-file reference would turn a
 *      single download into a dependency graph, and a broken link into a broken gate;
 *   4. `title`, a substantive `description`, and an `x-psn` provenance block naming the
 *      spec version, the artifact path, the phase and the FS clauses it implements;
 *   5. a matching section in CHANGELOG.md (VS-05's acceptance test: "schema files carry
 *      versions and changelogs");
 *   6. ONE PUBLISHED STATE FOR A REGISTERED REPOSITORY (ops decision D82 and its dated note of
 *      2026-09-29). Every public repository-state enum admits `registered` and none admits the
 *      internal `detected`, which would tell a reader that nobody has claimed the repository;
 *      and every public claimed/unclaimed count is marked `deprecated`. `change-event.v1` has
 *      carried `detected` since 1.0.0 and a v1 enum never narrows, so it is held to admitting
 *      `registered` only; `registry-v0-record.v1` is the curated SOURCE record, whose enum is
 *      the internal FS-02 §3 one on purpose, and is not a published artifact state.
 *
 * Run: node scripts/check-schemas.mjs
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, DIALECT, config, createAjv, listSchemas, changelogAnchor, readYamlFile, fail } from './lib/spec.mjs';

const cfg = config();
const schemas = listSchemas();
const changelog = readFileSync(join(ROOT, 'CHANGELOG.md'), 'utf8');
const problems = [];

if (schemas.length === 0) problems.push('schemas/ is empty — this gate would pass vacuously');

const semver = /^[0-9]+\.[0-9]+\.[0-9]+$/;
const seenIds = new Set();

/** Walk every node and collect $ref values, so a nested reference cannot hide. */
function collectRefs(node, out = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectRefs(item, out);
  } else if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if (key === '$ref' && typeof value === 'string') out.push(value);
      else collectRefs(value, out);
    }
  }
  return out;
}

for (const { file, json } of schemas) {
  const where = `schemas/${file}`;

  if (json.$schema !== DIALECT) {
    problems.push(`${where}: $schema must be ${DIALECT} (found ${JSON.stringify(json.$schema)})`);
  }

  const expectedId = `${cfg.schemaBaseUrl}/${file}`;
  if (json.$id !== expectedId) {
    problems.push(`${where}: $id must be ${expectedId} (found ${JSON.stringify(json.$id)})`);
  }
  if (seenIds.has(json.$id)) problems.push(`${where}: duplicate $id ${json.$id}`);
  seenIds.add(json.$id);

  if (typeof json.title !== 'string' || json.title.length < 5) {
    problems.push(`${where}: needs a title`);
  }
  if (typeof json.description !== 'string' || json.description.length < 120) {
    problems.push(
      `${where}: needs a description that says what the artifact IS and what rule governs it ` +
        `(at least 120 characters — a consumer reads this instead of the FS)`,
    );
  }

  const provenance = json['x-psn'];
  if (!provenance || typeof provenance !== 'object') {
    problems.push(`${where}: missing the x-psn provenance block`);
  } else {
    if (!semver.test(String(provenance.specVersion ?? ''))) {
      problems.push(`${where}: x-psn.specVersion must be a semantic version (found ${JSON.stringify(provenance.specVersion)})`);
    }
    if (typeof provenance.phase !== 'string' || provenance.phase.length === 0) {
      problems.push(`${where}: x-psn.phase must say which milestone this artifact is live from`);
    }
    if (!Array.isArray(provenance.fsRefs) || provenance.fsRefs.length === 0) {
      problems.push(`${where}: x-psn.fsRefs must cite at least one spec clause`);
    }
    const expectedChangelog = `CHANGELOG.md#${changelogAnchor(file)}`;
    if (provenance.changelog !== expectedChangelog) {
      problems.push(`${where}: x-psn.changelog must be ${expectedChangelog} (found ${JSON.stringify(provenance.changelog)})`);
    }
  }

  for (const ref of collectRefs(json)) {
    if (!ref.startsWith('#/')) {
      problems.push(
        `${where}: external $ref ${JSON.stringify(ref)} — schemas must be self-contained so one ` +
          `downloaded file validates on its own. Inline the definition into $defs.`,
      );
    }
  }

  if (!changelog.includes(`## ${file}`)) {
    problems.push(`${where}: CHANGELOG.md has no "## ${file}" section (VS-05: schemas carry versions and changelogs)`);
  }
}

// 6. One published state for a registered repository (D82). A pointer that no longer resolves
// is a problem too: the gate must not pass because the member it guards moved.
const byFile = new Map(schemas.map(({ file, json }) => [file, json]));
const at = (node, path) => path.reduce((value, key) => (value == null ? undefined : value[key]), node);
const openapi = readYamlFile(join(ROOT, 'openapi', 'edge-public.v1.yaml'));
const stateEnums = [
  ['schemas/registry-index.v1.json', at(byFile.get('registry-index.v1.json'), ['$defs', 'entry', 'properties', 'state', 'enum']), true],
  ['schemas/repo-record.v1.json', at(byFile.get('repo-record.v1.json'), ['$defs', 'repoState', 'enum']), true],
  ['schemas/change-event.v1.json', at(byFile.get('change-event.v1.json'), ['properties', 'payload', 'properties', 'state', 'enum']), false],
  [
    'openapi/edge-public.v1.yaml CoverageBasis.repo.repoState',
    at(openapi, ['components', 'schemas', 'CoverageBasis', 'properties', 'repo', 'properties', 'repoState', 'enum']),
    true,
  ],
];
for (const [where, values, closedToDetected] of stateEnums) {
  if (!Array.isArray(values)) {
    problems.push(`${where}: the repository-state enum this gate guards (D82) did not resolve`);
    continue;
  }
  if (!values.includes('registered')) {
    problems.push(`${where}: must admit \`registered\`, the one state a registered repository publishes from ops decision D82 on`);
  }
  if (closedToDetected && values.includes('detected')) {
    problems.push(`${where}: must not admit the internal state \`detected\` — it would publish that nobody has claimed the repository (D82 item 3)`);
  }
}
const unclaimedCounts = [
  ['schemas/stats.v1.json detectedUnclaimed', at(byFile.get('stats.v1.json'), ['properties', 'detectedUnclaimed'])],
  ['schemas/registry-index-meta.v1.json totals.verified', at(byFile.get('registry-index-meta.v1.json'), ['properties', 'totals', 'properties', 'verified'])],
  ['schemas/registry-index-meta.v1.json totals.detected', at(byFile.get('registry-index-meta.v1.json'), ['properties', 'totals', 'properties', 'detected'])],
];
for (const [where, member] of unclaimedCounts) {
  if (!member || member.deprecated !== true) {
    problems.push(`${where}: a public claimed/unclaimed count must be marked \`deprecated\` and not published (D82's dated note (c) of 2026-09-29)`);
  }
}

// Compile everything in one instance: this catches a bad keyword, an unresolvable local
// $ref, and a duplicate $id in a single pass.
try {
  const ajv = createAjv();
  for (const { file, json } of schemas) {
    try {
      ajv.compile(json);
    } catch (error) {
      problems.push(`schemas/${file}: does not compile — ${error.message}`);
    }
  }
} catch (error) {
  problems.push(`validator setup failed: ${error.message}`);
}

fail(problems, `${schemas.length} schemas compile, are addressed at ${cfg.schemaBaseUrl}/, are self-contained, and carry provenance + changelog sections`);

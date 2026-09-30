#!/usr/bin/env node
/**
 * Gate: every coverage test vector's INPUTS are valid published artifacts.
 *
 * The vector suites in coverage/cov-v1.test.ts and coverage/cov-v2.test.ts prove the
 * functions compute the right answer. They cannot prove the inputs are shaped like real
 * artifacts — and a vector built on an impossible record would prove a function correct on
 * data it will never see. So this gate validates, for every vector of both files:
 *
 *   · the repo fixture against repo-record.v1.json
 *   · the company record against entitlement-record.v1.json
 *   · the waiver document against waiver.v1.json
 *
 * It also asserts each suite still names all eight answers, so nobody can quietly delete
 * the awkward ones (the anti-spoof case, the grace boundaries, the waived organisation
 * with no account).
 *
 * cov-v2 (ops decisions D48 item 5 and D82) adds one input shape and one outcome: a vector
 * whose `repo` is null asks about a repository with NO published record, named by
 * `repoNodeId`, and such a vector may expect `repo_not_registered` instead of an answer.
 * Only such a vector may, and the node id it names must not be any fixture's — otherwise
 * "no record" would be a record after all.
 *
 * Run: node scripts/check-vectors.mjs
 */
import { join } from 'node:path';

import { ROOT, createValidatorWithAllSchemas, readJson, config, fail } from './lib/spec.mjs';

const cfg = config();
const { ajv } = createValidatorWithAllSchemas();
const problems = [];

const validators = {
  repo: ajv.getSchema(`${cfg.schemaBaseUrl}/repo-record.v1.json`),
  company: ajv.getSchema(`${cfg.schemaBaseUrl}/entitlement-record.v1.json`),
  waivers: ajv.getSchema(`${cfg.schemaBaseUrl}/waiver.v1.json`),
};
for (const [name, validator] of Object.entries(validators)) {
  if (!validator) problems.push(`could not resolve the ${name} schema by $id`);
}

function check(kind, label, instance) {
  const validate = validators[kind];
  if (!validate || instance === null || instance === undefined) return;
  if (!validate(instance)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`${label}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }
}

const EIGHT = [
  'yes-via-pass',
  'yes-via-project',
  'yes-via-portfolio',
  'yes-via-waiver',
  'yes-via-donation',
  'no',
  'lapsed-in-grace',
  'no-entitlement-required-under-threshold',
];
/** The repository node id grammar of repo-record.v1's `nodeId`, as the edge reads it. */
const NODE_ID = /^([A-Za-z0-9_-]{4,128}|MDEwOlJlcG9zaXRvcnk[A-Za-z0-9+/=]{1,96})$/;

const FILES = [
  { name: 'vectors.json', algoVersion: 'cov-v1', unregistered: false },
  { name: 'cov-v2.vectors.json', algoVersion: 'cov-v2', unregistered: true },
];
const loaded = Object.fromEntries(FILES.map(({ name }) => [name, readJson(join(ROOT, 'coverage', name))]));
const summary = [];

for (const { name, algoVersion, unregistered } of FILES) {
  const vectorFile = loaded[name];

  // The shared fixtures, once each.
  for (const [fixture, repo] of Object.entries(vectorFile.repos ?? {})) {
    check('repo', `${name} repos.${fixture}`, repo);
  }
  if (vectorFile.emptyWaivers) check('waivers', `${name} emptyWaivers`, vectorFile.emptyWaivers);
  const fixtureIds = new Set(Object.values(vectorFile.repos ?? {}).map((repo) => repo.nodeId));

  const answers = new Set();
  let refusals = 0;
  for (const vector of vectorFile.vectors ?? []) {
    const label = `${name} ${vector.id}`;
    if (!vector.id) problems.push(`${name}: a vector has no id`);

    const noRecord = vector.repo === null;
    if (noRecord) {
      if (!unregistered) problems.push(`${label}: names no repository record, which ${algoVersion} cannot take`);
      if (typeof vector.repoNodeId !== 'string' || !NODE_ID.test(vector.repoNodeId)) {
        problems.push(`${label}: a vector with no record must name the repository asked about in \`repoNodeId\``);
      } else if (fixtureIds.has(vector.repoNodeId)) {
        problems.push(`${label}: repoNodeId ${vector.repoNodeId} is a fixture's — "no published record" would be false`);
      }
    } else if (!vectorFile.repos?.[vector.repo]) {
      problems.push(`${label}: names an unknown repo fixture ${JSON.stringify(vector.repo)}`);
    }
    if (vector.company !== null) check('company', `${label} company`, vector.company);

    if (typeof vector.waivers === 'string') {
      if (!vectorFile[vector.waivers]) problems.push(`${label}: names an unknown waiver document ${JSON.stringify(vector.waivers)}`);
    } else {
      check('waivers', `${label} waivers`, vector.waivers);
    }

    if (!Number.isFinite(Date.parse(vector.now ?? ''))) {
      problems.push(`${label}: \`now\` is not a parsable instant`);
    }

    const expect = vector.expect;
    if (expect && expect.error !== undefined) {
      if (expect.error !== 'repo_not_registered') {
        problems.push(`${label}: expects the error ${JSON.stringify(expect.error)}; the only outcome that is not an answer is repo_not_registered`);
      } else if (!noRecord) {
        problems.push(`${label}: expects repo_not_registered about a repository that HAS a published record (D82 item 10)`);
      } else {
        refusals += 1;
      }
    } else if (!expect || typeof expect.answer !== 'string') {
      problems.push(`${label}: has no expected answer`);
    } else {
      if (!EIGHT.includes(expect.answer)) {
        problems.push(`${label}: expects ${JSON.stringify(expect.answer)}, which is not one of the eight frozen answers`);
      }
      if (expect.basis?.algoVersion !== algoVersion) {
        problems.push(`${label}: expects basis.algoVersion ${JSON.stringify(expect.basis?.algoVersion)}, not ${algoVersion}`);
      }
      answers.add(expect.answer);
    }

    if (vector.carriedFrom !== undefined) {
      const source = loaded['vectors.json'].vectors.find((old) => old.id === vector.carriedFrom);
      if (name === 'vectors.json' || !source) {
        problems.push(`${label}: carriedFrom ${JSON.stringify(vector.carriedFrom)} names no cov-v1 vector`);
      }
    }
  }

  const missing = EIGHT.filter((answer) => !answers.has(answer));
  if (missing.length > 0) {
    problems.push(`${name}: the vector suite no longer covers: ${missing.join(', ')} (FS10-120(b) requires all eight)`);
  }
  if (vectorFile.algoVersion !== algoVersion) {
    problems.push(`${name} targets ${JSON.stringify(vectorFile.algoVersion)}; it is the ${algoVersion} suite`);
  }
  summary.push(
    `${name}: ${(vectorFile.vectors ?? []).length} vectors` + (unregistered ? ` (${refusals} expect repo_not_registered)` : ''),
  );
}

fail(problems, `coverage vectors use valid published artifacts and cover all eight answers — ${summary.join('; ')}`);

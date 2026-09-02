#!/usr/bin/env node
/**
 * Gate: every coverage test vector's INPUTS are valid published artifacts.
 *
 * The vector suite in coverage/cov-v1.test.ts proves the function computes the right
 * answer. It cannot prove the inputs are shaped like real artifacts — and a vector built
 * on an impossible record would prove the function correct on data it will never see.
 * So this gate validates, for every vector:
 *
 *   · the repo fixture against repo-record.v1.json
 *   · the company record against entitlement-record.v1.json
 *   · the waiver document against waiver.v1.json
 *
 * It also asserts the suite still names all eight answers, so nobody can quietly delete
 * the awkward ones (the anti-spoof case, the grace boundaries, the waived organisation
 * with no account).
 *
 * Run: node scripts/check-vectors.mjs
 */
import { join } from 'node:path';

import { ROOT, createValidatorWithAllSchemas, readJson, config, fail } from './lib/spec.mjs';

const cfg = config();
const { ajv } = createValidatorWithAllSchemas();
const vectorFile = readJson(join(ROOT, 'coverage', 'vectors.json'));
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

// The shared fixtures, once each.
for (const [name, repo] of Object.entries(vectorFile.repos ?? {})) {
  check('repo', `vectors.json repos.${name}`, repo);
}
if (vectorFile.emptyWaivers) check('waivers', 'vectors.json emptyWaivers', vectorFile.emptyWaivers);

const answers = new Set();
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

for (const vector of vectorFile.vectors ?? []) {
  const label = `vectors.json ${vector.id}`;
  if (!vector.id) problems.push('a vector has no id');
  if (!vectorFile.repos?.[vector.repo]) problems.push(`${label}: names an unknown repo fixture ${JSON.stringify(vector.repo)}`);
  if (vector.company !== null) check('company', `${label} company`, vector.company);

  if (typeof vector.waivers === 'string') {
    if (!vectorFile[vector.waivers]) problems.push(`${label}: names an unknown waiver document ${JSON.stringify(vector.waivers)}`);
  } else {
    check('waivers', `${label} waivers`, vector.waivers);
  }

  if (!Number.isFinite(Date.parse(vector.now ?? ''))) {
    problems.push(`${label}: \`now\` is not a parsable instant`);
  }
  if (!vector.expect || typeof vector.expect.answer !== 'string') {
    problems.push(`${label}: has no expected answer`);
  } else {
    if (!EIGHT.includes(vector.expect.answer)) {
      problems.push(`${label}: expects ${JSON.stringify(vector.expect.answer)}, which is not one of the eight frozen answers`);
    }
    answers.add(vector.expect.answer);
  }
}

const missing = EIGHT.filter((answer) => !answers.has(answer));
if (missing.length > 0) {
  problems.push(`the vector suite no longer covers: ${missing.join(', ')} (FS10-120(b) requires all eight)`);
}

if (vectorFile.algoVersion !== 'cov-v1') {
  problems.push(`vectors.json targets ${JSON.stringify(vectorFile.algoVersion)}; this repository publishes cov-v1`);
}

fail(
  problems,
  `${(vectorFile.vectors ?? []).length} coverage vectors use valid published artifacts and cover all eight answers`,
);

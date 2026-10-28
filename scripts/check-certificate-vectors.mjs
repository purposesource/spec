#!/usr/bin/env node
/**
 * Gate: the vectors of `postWaiverCertificateCoverage` (coverage/waiver-certificate-vectors.json)
 * are real artifacts, real certificates and answers the API description admits.
 *
 * The route answers from a company's own waiver certificate (ops decision D65 item 5; PS-1913;
 * `openapi/edge-public.v1.yaml` 1.20.0). The edge's tests drive every vector through the route;
 * what they cannot prove is that the vectors themselves describe things that can exist. So this
 * gate checks, for the whole file:
 *
 *   · every key set against jwks.v1.json, every repository record against repo-record.v1.json,
 *     every waiver document against waiver.v1.json and every log segment against ct-segment.v1.json;
 *   · every certificate: its protected header, and its payload against certificate.v1.json; and its
 *     ES256 signature against the public half of psn-dev-2026-1 the key sets carry, which must
 *     verify exactly for the certificates marked `signed: true`;
 *   · every expected answer against the WaiverCertificateCoverageResponse component (with `asOf`
 *     the vector's `now`), every expected `jwsSha256` against the SHA-256 of the certificate the
 *     vector presents, and every expected error code against the ErrorEnvelope enum and the
 *     status the route documents for it;
 *   · that no expected answer carries the certificate's subject, by name or by id: the route names
 *     no company;
 *   · that the suite still drives both answers, both serialisations and every refusal the route
 *     documents, so nobody can quietly delete the awkward ones.
 *
 * Run: node scripts/check-certificate-vectors.mjs
 */
import { createHash, createPublicKey, verify } from 'node:crypto';
import { join } from 'node:path';

import { ROOT, config, createValidatorWithAllSchemas, readJson, readYamlFile, fail } from './lib/spec.mjs';

const cfg = config();
const { ajv } = createValidatorWithAllSchemas();
for (const keyword of ['example', 'xml', 'externalDocs', 'discriminator', 'deprecated']) {
  try {
    ajv.addKeyword({ keyword });
  } catch {
    // Already known to this dialect.
  }
}
const problems = [];

const FILE = 'waiver-certificate-vectors.json';
const ROUTE = '/v1/coverage/waiver-certificate';
const vectorFile = readJson(join(ROOT, 'coverage', FILE));
const doc = readYamlFile(join(ROOT, 'openapi', 'edge-public.v1.yaml'));

/* ------------------------------------------------------------------- the published contracts */

const schema = (name) => {
  const validate = ajv.getSchema(`${cfg.schemaBaseUrl}/${name}`);
  if (!validate) problems.push(`could not resolve ${name} by $id`);
  return validate;
};
const validators = {
  keySet: schema('jwks.v1.json'),
  repo: schema('repo-record.v1.json'),
  waivers: schema('waiver.v1.json'),
  segment: schema('ct-segment.v1.json'),
  certificate: schema('certificate.v1.json'),
};

function check(kind, label, instance) {
  const validate = validators[kind];
  if (!validate) return;
  if (!validate(instance)) {
    for (const error of validate.errors ?? []) {
      const at = error.instancePath === '' ? '(root)' : error.instancePath;
      problems.push(`${label}: ${at} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }
}

const CONTAINER_ID = 'urn:purposesource:openapi:certificate-vectors';
function rewriteRefs(node) {
  if (Array.isArray(node)) return node.map(rewriteRefs);
  if (node && typeof node === 'object') {
    return Object.fromEntries(
      Object.entries(node).map(([key, value]) => {
        if (key === '$ref' && typeof value === 'string' && value.startsWith('#/components/schemas/')) {
          return [key, `${CONTAINER_ID}#/$defs/${value.slice('#/components/schemas/'.length)}`];
        }
        if (key === '$ref' && typeof value === 'string' && value.startsWith('../schemas/')) {
          return [key, `${cfg.schemaBaseUrl}/${value.slice('../schemas/'.length)}`];
        }
        return [key, rewriteRefs(value)];
      }),
    );
  }
  return node;
}
ajv.addSchema({ $id: CONTAINER_ID, $defs: rewriteRefs(doc?.components?.schemas ?? {}) });
const validateAnswer = ajv.getSchema(`${CONTAINER_ID}#/$defs/WaiverCertificateCoverageResponse`);
if (!validateAnswer) problems.push('edge-public.v1 has no WaiverCertificateCoverageResponse component');

const operation = doc?.paths?.[ROUTE]?.post;
if (!operation) problems.push(`edge-public.v1 describes no POST ${ROUTE}`);
const documentedStatuses = new Set(Object.keys(operation?.responses ?? {}));
const errorCodes = new Set(doc?.components?.schemas?.ErrorEnvelope?.properties?.error?.properties?.code?.enum ?? []);

/** The status each refusal answers with: the edge's own table (workers/edge/src/lib/http.ts). */
const STATUS_FOR = {
  malformed_certificate: 400,
  payload_too_large: 413,
  certificate_invalid: 422,
  certificate_unverifiable: 409,
  cert_not_in_ct_log: 409,
  repo_not_registered: 404,
};

if (vectorFile.route !== `POST ${ROUTE}`) problems.push(`${FILE}: route is ${JSON.stringify(vectorFile.route)}`);
if (vectorFile.specVersion !== doc?.info?.version) {
  problems.push(`${FILE}: specVersion ${vectorFile.specVersion} is not edge-public.v1's ${doc?.info?.version}`);
}
const maxLength = operation?.requestBody?.content?.['application/jose']?.schema?.maxLength;
if (vectorFile.maxBodyBytes !== maxLength) {
  problems.push(`${FILE}: maxBodyBytes ${vectorFile.maxBodyBytes} is not the request body's maxLength ${maxLength}`);
}

/* ----------------------------------------------------------------------------- the fixtures */

for (const [name, keySet] of Object.entries(vectorFile.keySets ?? {})) check('keySet', `${FILE} keySets.${name}`, keySet);
for (const [name, repo] of Object.entries(vectorFile.repos ?? {})) check('repo', `${FILE} repos.${name}`, repo);

/** The fixture key's public half, the same point in every key set that carries its kid. */
const SIGNING_KID = 'psn-dev-2026-1';
const points = new Set();
for (const keySet of Object.values(vectorFile.keySets ?? {})) {
  for (const key of keySet.keys ?? []) if (key.kid === SIGNING_KID) points.add(`${key.x}.${key.y}`);
}
if (points.size !== 1) problems.push(`${FILE}: the key sets carry ${points.size} points for ${SIGNING_KID}, not one`);
const [x, y] = [...points][0]?.split('.') ?? [];
const publicKey = x && y ? createPublicKey({ key: { kty: 'EC', crv: 'P-256', x, y }, format: 'jwk' }) : null;

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('hex');
const decode = (segment) => JSON.parse(Buffer.from(segment, 'base64url').toString('utf8'));

const subjects = new Set();
for (const [name, certificate] of Object.entries(vectorFile.certificates ?? {})) {
  const label = `${FILE} certificates.${name}`;
  const segments = String(certificate.jws).split('.');
  if (segments.length !== 3) {
    problems.push(`${label}: not a compact JWS of three segments`);
    continue;
  }
  let header;
  let payload;
  try {
    header = decode(segments[0]);
    payload = decode(segments[1]);
  } catch {
    problems.push(`${label}: header or payload is not base64url JSON`);
    continue;
  }
  check('certificate', `${label} payload`, payload);
  if (typeof payload.sub === 'string') subjects.add(payload.sub);
  if (typeof payload.subId === 'string') subjects.add(payload.subId);
  if (header.kid !== SIGNING_KID) problems.push(`${label}: signed under ${header.kid}, not ${SIGNING_KID}`);
  const verifies =
    publicKey !== null &&
    header.alg === 'ES256' &&
    verify('sha256', Buffer.from(`${segments[0]}.${segments[1]}`, 'ascii'), { key: publicKey, dsaEncoding: 'ieee-p1363' }, Buffer.from(segments[2], 'base64url'));
  if (verifies !== certificate.signed) {
    problems.push(`${label}: marked signed: ${certificate.signed}, and its signature ${verifies ? 'verifies' : 'does not verify'} under ${SIGNING_KID}`);
  }
  if (certificate.signed && header.typ !== 'application/psn-cert+jws') {
    problems.push(`${label}: header typ ${JSON.stringify(header.typ)} is not the certificate profile's`);
  }
}

/* ------------------------------------------------------------------------------ the vectors */

const answers = new Set();
const codes = new Set();
const forms = new Set();
const ids = new Set();
for (const vector of vectorFile.vectors ?? []) {
  const label = `${FILE} ${vector.id}`;
  if (!/^WC-\d{2}-[a-z0-9-]+$/.test(vector.id ?? '')) problems.push(`${label}: id is not WC-nn-words`);
  if (ids.has(vector.id)) problems.push(`${label}: id repeated`);
  ids.add(vector.id);
  if (!Number.isFinite(Date.parse(vector.now ?? ''))) problems.push(`${label}: now is not an instant`);
  if (!vectorFile.keySets?.[vector.keySet]) problems.push(`${label}: names an unknown key set ${vector.keySet}`);

  const plane = vector.plane ?? {};
  if (plane.repo !== null && !vectorFile.repos?.[plane.repo]) problems.push(`${label}: names an unknown repo ${plane.repo}`);
  if (plane.waivers !== null) check('waivers', `${label} plane.waivers`, plane.waivers);
  for (const [segment, document] of Object.entries(plane.ct ?? {})) {
    check('segment', `${label} plane.ct.${segment}`, document);
    if (String(document.segment) !== segment) problems.push(`${label}: ct.${segment} says it is segment ${document.segment}`);
  }

  const request = vector.request ?? {};
  let presented = null;
  if (request.body === undefined) {
    const certificate = vectorFile.certificates?.[request.certificate];
    if (!certificate) {
      problems.push(`${label}: names an unknown certificate ${request.certificate}`);
    } else {
      presented = certificate.jws;
      forms.add(request.form);
      if (request.padTo !== undefined && request.padTo < presented.length) {
        problems.push(`${label}: padTo ${request.padTo} is shorter than the certificate`);
      }
    }
  }

  const expect = vector.expect ?? {};
  if (expect.code !== undefined) {
    codes.add(expect.code);
    if (!errorCodes.has(expect.code)) problems.push(`${label}: code ${expect.code} is not in the ErrorEnvelope enum`);
    if (STATUS_FOR[expect.code] !== expect.status) {
      problems.push(`${label}: ${expect.code} answers ${STATUS_FOR[expect.code]}, not ${expect.status}`);
    }
    if (!documentedStatuses.has(String(expect.status))) problems.push(`${label}: status ${expect.status} is not documented on the route`);
    continue;
  }
  if (expect.status !== 200 || !expect.body) {
    problems.push(`${label}: expects neither a code nor a 200 body`);
    continue;
  }
  answers.add(expect.body.answer);
  if (validateAnswer && !validateAnswer({ ...expect.body, asOf: vector.now })) {
    for (const error of validateAnswer.errors ?? []) {
      problems.push(`${label}: expected body ${error.instancePath || '(root)'} ${error.message} ${JSON.stringify(error.params)}`);
    }
  }
  if (presented !== null && expect.body.basis?.certificate?.jwsSha256 !== sha256(presented)) {
    problems.push(`${label}: basis.certificate.jwsSha256 is not the SHA-256 of the certificate presented`);
  }
  const text = JSON.stringify(expect.body);
  for (const subject of subjects) {
    if (text.includes(subject)) problems.push(`${label}: the expected answer carries ${JSON.stringify(subject)}, a certificate's subject`);
  }
  if ((expect.body.answer === 'no') !== (typeof expect.body.basis?.note === 'string')) {
    problems.push(`${label}: a note is on every no and on nothing else`);
  }
  if ((expect.body.answer === 'yes-via-waiver') !== (expect.body.proof !== undefined)) {
    problems.push(`${label}: a proof is on every yes-via-waiver and on nothing else`);
  }
}

for (const answer of ['yes-via-waiver', 'no']) if (!answers.has(answer)) problems.push(`${FILE}: no vector answers ${answer}`);
for (const form of ['compact', 'flattened']) if (!forms.has(form)) problems.push(`${FILE}: no vector presents the ${form} form`);
for (const code of Object.keys(STATUS_FOR)) if (!codes.has(code)) problems.push(`${FILE}: no vector expects ${code}`);

fail(
  problems,
  `${(vectorFile.vectors ?? []).length} waiver-certificate vectors use valid artifacts and certificates and answer as edge-public.v1 ${doc?.info?.version} describes`,
);

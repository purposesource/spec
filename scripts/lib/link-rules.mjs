// The gate's own reading of the published link table (`examples/link-platforms.v1.example.json`).
//
// This is NOT the link pipeline the platform runs. The api and index-build run it in C#, the edge
// runs it again in JavaScript at render, and both are built in their own repositories against the
// table and the shared golden file (`examples/link-rules.v1.golden.json`). This module exists so
// that THIS repository can prove, on every run, that the golden file and the table agree: each
// golden case is run through the steps the table's schema describes, using nothing but the table,
// and the answer must be the one the golden file records. A table edit that changes an answer
// therefore fails here first, with the case named, before any implementation copies the table.
//
// It follows `link-platforms.v1.json`'s description step by step and adds nothing to it. Where
// the description leaves a choice to the implementations (the steward blocklist, TR39 skeletons of
// non-ASCII hosts, the display of IDN hosts), this module does not decide it, and no golden case
// depends on it.

const ASCII_TRIM = /^[\t\n\r ]+|[\t\n\r ]+$/g;
const WHITE_SPACE = /\p{White_Space}/u;
const CONTROL = /[\p{Cc}\p{Cf}\p{Co}\p{Cs}\p{Cn}\p{Zl}\p{Zp}]/u;
const SCHEME_PREFIX = /^([A-Za-z][A-Za-z0-9+.-]*):/;
const DOT_SEGMENT = /(^|\/)\.{1,2}(\/|$)|%2e/i;
const LDH_LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const DOTTED_QUAD = /^[0-9]+(?:\.[0-9]+){3}$/;

const refuse = (code) => ({ refused: code });

/** Compile a table regex exactly as an ECMAScript implementation does: the `u` flag, nothing else. */
const rx = (source) => new RegExp(source, 'u');

/** Step 1 of both pipelines. Returns the cleaned text, or a refusal. */
export function cleanUp(table, input, { stripAt }) {
  if (typeof input !== 'string') return refuse('empty');
  let text = input.replace(ASCII_TRIM, '');
  if ([...text].length > table.pipeline.inputMaxLength) return refuse('too_long');
  if (WHITE_SPACE.test(text)) return refuse('whitespace');
  if (CONTROL.test(text)) return refuse('control_character');
  text = text.normalize('NFC');
  if (stripAt && text.startsWith('@')) text = text.slice(1);
  if (text.length === 0) return refuse('empty');
  return { text };
}

/** Step 2 of both pipelines: a scheme on the refused list, whatever follows it. */
function refusedScheme(table, text) {
  const match = SCHEME_PREFIX.exec(text);
  return match !== null && table.pipeline.refusedSchemes.includes(match[1].toLowerCase());
}

/** The raw authority of a URL-form text that carries `://`: what lies between it and the first `/`, `?` or `#`. */
function rawAuthority(withScheme) {
  const rest = withScheme.slice(withScheme.indexOf('://') + 3);
  const end = rest.search(/[/?#]/);
  return end === -1 ? rest : rest.slice(0, end);
}

/** The raw path of a URL-form text that carries `://`, before any `?` or `#`. */
function rawPath(withScheme) {
  const rest = withScheme.slice(withScheme.indexOf('://') + 3);
  const start = rest.search(/[/?#]/);
  if (start === -1 || rest[start] !== '/') return '';
  const tail = rest.slice(start);
  const end = tail.search(/[?#]/);
  return end === -1 ? tail : tail.slice(0, end);
}

function hostsOf(table, platform) {
  return platform.hostsFrom === 'mastodonInstances' ? table.mastodonInstances : platform.hosts ?? [];
}

/** Whether a platform-level host rule admits `host` (exact list, or an anchored pattern with no capture). */
function platformAdmits(table, platform, host) {
  if (hostsOf(table, platform).includes(host)) return true;
  return (platform.hostPatterns ?? []).some((pattern) => rx(pattern).test(host));
}

/** Whether a match rule's host condition admits `host`; returns the captured handle when the rule's host pattern captures one. */
function ruleHost(table, platform, rule, host) {
  if (rule.hosts) return rule.hosts.includes(host) ? { ok: true } : { ok: false };
  if (rule.hostPattern) {
    const m = rx(rule.hostPattern).exec(host);
    return m ? { ok: true, h: m.groups?.h } : { ok: false };
  }
  return { ok: platformAdmits(table, platform, host) };
}

function anyRuleHostPatternAdmits(platform, host) {
  return platform.forms.some((form) => (form.match ?? []).some((rule) => rule.hostPattern && rx(rule.hostPattern).test(host)));
}

/** Whether the text is a URL for this platform (step 3's test). */
function looksLikeUrl(table, platform, text) {
  if (text.includes('://')) return true;
  const slash = text.indexOf('/');
  if (slash <= 0) return false;
  const head = text.slice(0, slash).toLowerCase();
  return platformAdmits(table, platform, head) || anyRuleHostPatternAdmits(platform, head);
}

function orcidChecksumOk(id) {
  const digits = id.replace(/-/g, '');
  let total = 0;
  for (const ch of digits.slice(0, 15)) total = (total + Number(ch)) * 2;
  const result = (12 - (total % 11)) % 11;
  const check = result === 10 ? 'X' : String(result);
  return digits[15] === check;
}

function lastLabel(handle) {
  const host = handle.includes(':') ? handle.slice(handle.lastIndexOf(':') + 1) : handle;
  return host.slice(host.lastIndexOf('.') + 1);
}

/** Step 5: the handle against one form. Returns null when the grammar does not admit it. */
function judgeHandle(table, platform, form, raw) {
  let h = raw;
  if (form.fold === 'lower') h = h.toLowerCase();
  if (form.fold === 'upper') h = h.toUpperCase();
  if (!rx(form.handle).test(h)) return null;
  if ((platform.reserved ?? []).includes(h.toLowerCase())) return refuse('handle_reserved');
  for (const check of platform.checks ?? []) {
    if (check === 'orcid-checksum' && !orcidChecksumOk(h)) return refuse('checksum');
    if (check === 'refused-tld' && table.refusedTlds.includes(lastLabel(h))) return refuse('tld_refused');
  }
  return { h };
}

/** Step 6: rebuild the URL from the form's template, and assert the strict output rule. */
export function rebuild(table, platform, form, handle, instance) {
  if (form.output.includes('{instance}') !== (instance !== undefined)) return refuse('instance_required');
  const url = form.output.replace('{h}', handle).replace('{instance}', instance ?? '');
  if (url.length > table.pipeline.outputMaxLength) return refuse('too_long');
  if (!rx(table.pipeline.outputPattern).test(url)) return refuse('handle_invalid');
  const templateHost = form.output.slice('https://'.length, form.output.indexOf('/', 'https://'.length));
  const host = url.slice('https://'.length, url.indexOf('/', 'https://'.length));
  if (templateHost === '{instance}' ? host !== instance : host !== templateHost) return refuse('handle_invalid');
  return { url };
}

function accept(table, platform, form, h, instance) {
  const built = rebuild(table, platform, form, h, instance);
  if (built.refused) return built;
  const out = { form: form.id, handle: h, url: built.url };
  if (instance !== undefined) out.instance = instance;
  return out;
}

function parseUrlForm(table, platform, text) {
  if (!rx(table.pipeline.urlCharacters).test(text)) return refuse('character_not_allowed');
  let withScheme = text;
  if (text.includes('://')) {
    const scheme = text.slice(0, text.indexOf('://'));
    if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(scheme)) return refuse('not_a_url');
    if (!['http', 'https'].includes(scheme.toLowerCase())) return refuse('scheme_not_allowed');
  } else {
    withScheme = `https://${text}`;
  }
  if (rawAuthority(withScheme).includes('@')) return refuse('userinfo');
  if (rawAuthority(withScheme).includes('%')) return refuse('character_not_allowed');
  if (DOT_SEGMENT.test(rawPath(withScheme))) return refuse('path_invalid');
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return refuse('not_a_url');
  }
  if (url.username !== '' || url.password !== '') return refuse('userinfo');
  if (url.port !== '' && url.port !== '443') return refuse('port');
  const host = url.hostname;
  if (!platformAdmits(table, platform, host) && !anyRuleHostPatternAdmits(platform, host)) {
    return refuse(platform.hostsFrom === 'mastodonInstances' ? 'instance_not_allowed' : 'host_not_allowed');
  }
  for (const refused of platform.refusedPaths ?? []) {
    if (refused.hosts && !refused.hosts.includes(host)) continue;
    if (rx(refused.pattern).test(url.pathname)) return refuse(refused.code);
  }
  if (platform.query === 'refuse' && url.search !== '') return refuse('query_not_allowed');

  let matchedAny = false;
  for (const form of platform.forms) {
    for (const rule of form.match ?? []) {
      const hostOk = ruleHost(table, platform, rule, host);
      if (!hostOk.ok) continue;
      const pathMatch = rx(rule.path).exec(url.pathname);
      if (!pathMatch) continue;
      let h = hostOk.h ?? pathMatch.groups?.h;
      if (rule.query) h = url.searchParams.get(rule.query) ?? undefined;
      if (rule.fragment) {
        const fragmentMatch = rx(rule.fragment).exec(url.hash.replace(/^#/, ''));
        h = fragmentMatch ? fragmentMatch.groups?.h : undefined;
      }
      if (h === undefined || h === null || h === '') continue;
      matchedAny = true;
      const judged = judgeHandle(table, platform, form, h);
      if (judged === null) continue;
      if (judged.refused) return judged;
      const instance = platform.hostsFrom === 'mastodonInstances' ? host : undefined;
      return accept(table, platform, form, judged.h, instance);
    }
  }
  return refuse(matchedAny ? 'handle_invalid' : 'path_not_recognised');
}

function parseBareForm(table, platform, text) {
  let candidate = text;
  let instance;
  if (platform.forms.some((form) => form.bareInstance)) {
    const at = candidate.indexOf('@');
    if (at === -1) return refuse('instance_required');
    instance = candidate.slice(at + 1).toLowerCase();
    candidate = candidate.slice(0, at);
    if (!table.mastodonInstances.includes(instance)) return refuse('instance_not_allowed');
  }
  for (const form of platform.forms) {
    if (!form.bare) continue;
    let h = candidate;
    if (form.bareSuffix && !h.includes('.') && !h.includes(':')) h = `${h}${form.bareSuffix}`;
    const judged = judgeHandle(table, platform, form, h);
    if (judged === null) continue;
    if (judged.refused) return judged;
    return accept(table, platform, form, judged.h, instance);
  }
  return refuse('handle_invalid');
}

/** One social or sponsorship link: `{platform}` chosen from the menu, `input` pasted. */
export function parseLink(table, platformId, input) {
  const platform = table.platforms.find((p) => p.id === platformId);
  if (!platform) return refuse('platform_unknown');
  if (platform.typed === false) return refuse('platform_not_typed');
  const cleaned = cleanUp(table, input, { stripAt: true });
  if (cleaned.refused) return cleaned;
  const { text } = cleaned;
  if (refusedScheme(table, text)) return refuse('scheme_not_allowed');
  return looksLikeUrl(table, platform, text) ? parseUrlForm(table, platform, text) : parseBareForm(table, platform, text);
}

/** The ASCII reading of the §6.2 fold for a host: lower case, the digit folds, letters only. */
function asciiSkeleton(table, host) {
  return [...host.toLowerCase()].map((ch) => table.text.digitFolds[ch] ?? ch).join('').replace(/[^a-z]/g, '');
}

/** The one personal website. */
export function parseWebsite(table, input) {
  const rules = table.website;
  const cleaned = cleanUp(table, input, { stripAt: false });
  if (cleaned.refused) return cleaned;
  const { text } = cleaned;
  if (refusedScheme(table, text)) return refuse('scheme_not_allowed');
  if (!rx(table.pipeline.urlCharacters).test(text)) return refuse('character_not_allowed');
  let withScheme = text;
  if (text.includes('://')) {
    const scheme = text.slice(0, text.indexOf('://'));
    if (!/^[A-Za-z][A-Za-z0-9+.-]*$/.test(scheme)) return refuse('not_a_url');
    if (scheme.toLowerCase() === 'http') return refuse('http_not_allowed');
    if (scheme.toLowerCase() !== 'https') return refuse('scheme_not_allowed');
  } else {
    if (!/^[A-Za-z0-9]/.test(text)) return refuse('not_a_url');
    withScheme = `https://${text}`;
  }
  if (rawAuthority(withScheme).includes('@')) return refuse('userinfo');
  if (rawAuthority(withScheme).includes('%')) return refuse('character_not_allowed');
  if (/[?#]/.test(withScheme)) return refuse('query_or_fragment');
  const path = rawPath(withScheme);
  if (DOT_SEGMENT.test(path)) return refuse('path_invalid');
  if (rules.refusedPathSequences.some((sequence) => path.toLowerCase().includes(sequence))) return refuse('path_invalid');
  let url;
  try {
    url = new URL(withScheme);
  } catch {
    return refuse('not_a_url');
  }
  if (url.port !== '' && url.port !== '443') return refuse('port');
  const host = url.hostname;
  if (host.startsWith('[') || DOTTED_QUAD.test(host)) return refuse('ip_address');
  const labels = host.split('.');
  if (labels.length < 2 || host.length > 253 || !labels.every((label) => LDH_LABEL.test(label)) || !TLD.test(labels.at(-1))) {
    return refuse('host_invalid');
  }
  if (table.refusedTlds.includes(labels.at(-1))) return refuse('tld_refused');
  if (rules.ownDomains.some((own) => host === own || host.endsWith(`.${own}`))) return refuse('own_domain');
  if (asciiSkeleton(table, host).includes(table.text.skeletonTerm)) return refuse('own_domain');
  if (rules.redirectors.some((r) => host === r || host.endsWith(`.${r}`))) return refuse('redirector');
  if (url.pathname.length > rules.pathMaxLength) return refuse('path_invalid');
  const out = `https://${host}${url.pathname}`;
  if (out.length > rules.maxLength) return refuse('too_long');
  return { url: out };
}

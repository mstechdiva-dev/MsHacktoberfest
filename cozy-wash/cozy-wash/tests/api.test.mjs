import { test } from 'node:test';
import assert from 'node:assert/strict';
import { handleRecap, MAX_BODY } from '../api/recap.js';
import { getStatus } from '../api/_lib/status.js';
import { sign, playedToday } from '../api/_lib/cookie.js';
import { nextMidnightUTC } from '../api/_lib/reopen.js';

const NOW = new Date('2026-10-09T15:00:00Z');
const env = { OPENROUTER_API_KEY: 'test-key', COZY_COOKIE_SECRET: 'secret' };
const body = {
  loads: [{ bin: 'white', itemIds: ['gen:tee:white:solid:cotton', 'red-sock'], settings: { cycle: 'normal', water: 'hot', detergent: 1, softener: 0, bleach: 0, rescue: 0 }, facts: ['bleed'], score: 80, rewashes: 0 }],
  summary: { trapIdsCaught: ['sleepy-cat'], pocketsChecked: 1, socksPaired: 1, folded: 6 },
};
const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json' } });

/** A fake fetch that answers /key and /chat/completions. */
function fakeFetch({ chatStatus = 200, chatError = { error: 'nope' }, hang = false, content = '{"headline":"Pink socks happen. Nice save on the cat.","lines":[]}', key = { used: 10, limit: 1000, remaining: 990 } } = {}) {
  const calls = [];
  const fn = async (url, init = {}) => {
    calls.push({ url, init });
    if (url.endsWith('/key')) return json(200, { data: { free_model_daily_requests: key, limit_remaining: null } });
    if (url.endsWith('/chat/completions')) {
      if (hang) return new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
      if (chatStatus !== 200) return json(chatStatus, chatError);
      return json(200, { choices: [{ message: { content } }] });
    }
    return json(404, {});
  };
  fn.calls = calls;
  return fn;
}

const call = (over = {}) => handleRecap({ method: 'POST', rawBody: JSON.stringify(body), env, fetchImpl: fakeFetch(), now: NOW, ...over });

test('a good request gets the model note and a signed cookie', async () => {
  const f = fakeFetch();
  const out = await call({ fetchImpl: f });
  assert.equal(out.code, 200);
  assert.equal(out.body.source, 'model');
  assert.match(out.body.headline, /cat/);
  assert.match(out.cookie, /^cw_day=2026-10-09\.[0-9a-f]{64}; .*HttpOnly; Secure; SameSite=Lax/);
  assert.match(out.cookie, /Expires=Sat, 10 Oct 2026 00:00:00 GMT/, 'expires at the next midnight UTC');
  assert.deepEqual(out.body.lines, []);
  const sent = JSON.parse(f.calls[0].init.body);
  assert.deepEqual(sent.models, ['openai/gpt-oss-20b:free', 'openai/gpt-oss-120b:free']);
  assert.equal(sent.response_format.json_schema.name, 'attendant_note');
  assert.equal(sent.provider.require_parameters, true);
  const facts = JSON.parse(sent.messages[1].content);
  assert.deepEqual(facts.loads[0].items, ['White tee', 'Red sock']);
  assert.equal(facts.loads[0].water, 'hot');
  assert.deepEqual(facts.summary.trapsCaught, ['Sleepy cat']);
  assert.match(sent.messages[0].content, /ONE short, simple sentence/);
  assert.match(sent.messages[0].content, /Leave `lines` empty/);
});

test('the server never trusts names from the browser', async () => {
  const bad = { ...body, loads: [{ ...body.loads[0], itemIds: ['<script>'] }] };
  const out = await call({ rawBody: JSON.stringify(bad) });
  assert.equal(out.code, 400);
});

test('unknown ids are turned away', async () => {
  for (const itemIds of [['nope'], ['gen:xx:yy:zz:ww'], ['gen:tee:white:solid:silk-plaid']]) {
    const out = await call({ rawBody: JSON.stringify({ ...body, loads: [{ ...body.loads[0], itemIds }] }) });
    assert.equal(out.code, 400, itemIds[0]);
    assert.deepEqual(out.body, { error: 'bad_request' });
  }
  const trap = await call({ rawBody: JSON.stringify({ ...body, summary: { ...body.summary, trapIdsCaught: ['no-such-trap'] } }) });
  assert.equal(trap.code, 400);
  const season = await call({ rawBody: JSON.stringify({ ...body, loads: [{ ...body.loads[0], itemIds: ['gen:sweater:pumpkin:leaves:wool'] }] }) });
  assert.equal(season.code, 200, 'season colors and patterns count as real');
});

test('wrong method, bad JSON, too big, over the limits', async () => {
  assert.equal((await call({ method: 'GET' })).code, 405);
  const badJson = await call({ rawBody: '{nope' });
  assert.equal(badJson.code, 400);
  assert.deepEqual(badJson.body, { error: 'bad_request' });
  const big = await call({ rawBody: 'x'.repeat(MAX_BODY + 1) });
  assert.equal(big.code, 400);
  assert.deepEqual(big.body, { error: 'bad_request' });
  const one = body.loads[0];
  const over = (load) => call({ rawBody: JSON.stringify({ ...body, loads: [{ ...one, ...load }] }) });
  assert.equal((await call({ rawBody: JSON.stringify({ ...body, loads: Array.from({ length: 7 }, () => one) }) })).code, 400, '7 loads');
  assert.equal((await over({ itemIds: Array.from({ length: 21 }, () => 'red-sock') })).code, 400, '21 ids');
  assert.equal((await over({ itemIds: Array.from({ length: 20 }, () => 'red-sock') })).code, 200, '20 ids is fine');
  assert.equal((await over({ facts: Array.from({ length: 13 }, () => 'clean') })).code, 400, '13 facts');
  assert.equal((await over({ facts: Array.from({ length: 12 }, () => 'clean') })).code, 200, '12 facts is fine');
});

test('already played today gets a house note, no model call', async () => {
  const f = fakeFetch();
  const out = await call({ fetchImpl: f, cookieHeader: `other=1; cw_day=${sign('2026-10-09', 'secret')}` });
  assert.equal(out.body.source, 'fallback');
  assert.equal(out.body.reason, 'already_played');
  assert.equal(f.calls.length, 0);
});

test('a forged cookie does not count', () => {
  assert.equal(playedToday('cw_day=2026-10-09.deadbeef', 'secret', '2026-10-09'), false);
  assert.equal(playedToday(`cw_day=${sign('2026-10-08', 'secret')}`, 'secret', '2026-10-09'), false);
  assert.equal(playedToday(`cw_day=${sign('2026-10-09', 'secret')}`, 'secret', '2026-10-09'), true);
});

test('busy (429 with allowance left) falls back politely', async () => {
  const out = await call({ fetchImpl: fakeFetch({ chatStatus: 429 }) });
  assert.equal(out.body.source, 'fallback');
  assert.equal(out.body.busy, true);
});

test('daily cap (429 with nothing left) and key limit (402) close the shop', async () => {
  const capped = await call({ fetchImpl: fakeFetch({ chatStatus: 429, key: { used: 1000, limit: 1000, remaining: 0 } }) });
  assert.equal(capped.body.status, 'closed');
  assert.equal(capped.body.reopensAt, nextMidnightUTC(NOW));
  const keyed = await call({ fetchImpl: fakeFetch({ chatStatus: 402, chatError: { error: { metadata: { limit_source: 'openrouter_key_limit' } } } }) });
  assert.equal(keyed.body.status, 'closed');
  assert.equal(keyed.body.reopensAt, nextMidnightUTC(NOW));
});

test('a 402 for some other reason is not the daily cap', async () => {
  const out = await call({ fetchImpl: fakeFetch({ chatStatus: 402 }) });
  assert.equal(out.body.status, 'ok');
  assert.equal(out.body.busy, true);
});

test('a slow model and a 5xx fall back with the busy flag', async () => {
  const slow = await call({ fetchImpl: fakeFetch({ hang: true }), env, now: NOW });
  assert.equal(slow.body.source, 'fallback');
  assert.equal(slow.body.busy, true);
}, { timeout: 15000 });

test('a 5xx falls back with the busy flag', async () => {
  const out = await call({ fetchImpl: fakeFetch({ chatStatus: 503 }) });
  assert.equal(out.body.source, 'fallback');
  assert.equal(out.body.busy, true);
});

test('every answer carries a note, from the model or the house', async () => {
  const model = await call();
  assert.ok(model.body.headline);
  for (const out of [await call({ env: {} }), await call({ fetchImpl: fakeFetch({ chatStatus: 500 }) }), await call({ env: { ...env, COZY_MAINTENANCE: '1' } })]) {
    assert.ok(out.body.headline && out.body.headline.length > 3, JSON.stringify(out.body));
    assert.deepEqual(out.body.lines, []);
  }
});

test('a model reply that breaks the schema falls back', async () => {
  for (const content of ['not json', '{"headline":"<b>hi</b>","lines":[]}', '{"headline":"ok there","lines":["extra"]}']) {
    const out = await call({ fetchImpl: fakeFetch({ content }) });
    assert.equal(out.body.source, 'fallback', content);
  }
});

test('a headline that runs long is trimmed to 80 characters', async () => {
  const long = 'Nice save on the cat, and the whites came out lovely even after that pink scare this afternoon.';
  const out = await call({ fetchImpl: fakeFetch({ content: JSON.stringify({ headline: long, lines: [] }) }) });
  assert.equal(out.body.source, 'model');
  assert.ok(out.body.headline.length <= 80);
  assert.ok(long.startsWith(out.body.headline));
});

test('maintenance and no key', async () => {
  const m = await call({ env: { ...env, COZY_MAINTENANCE: '1' } });
  assert.equal(m.body.status, 'closed');
  const k = await call({ env: {} });
  assert.equal(k.body.source, 'fallback');
});

test('status reads the free daily allowance', async () => {
  const open = await getStatus({ env, fetchImpl: fakeFetch(), now: NOW });
  assert.deepEqual(open, { open: true, reason: 'open', reopensAt: '2026-10-10T00:00:00.000Z', gamesToday: 10 });
  const closed = await getStatus({ env, fetchImpl: fakeFetch({ key: { used: 1000, limit: 1000, remaining: 0 } }), now: NOW });
  assert.equal(closed.open, false);
  assert.equal(closed.reason, 'daily_cap');
  const maint = await getStatus({ env: { ...env, COZY_MAINTENANCE: '1' }, fetchImpl: fakeFetch(), now: NOW });
  assert.equal(maint.reason, 'maintenance');
  const down = await getStatus({ env, fetchImpl: async () => { throw new Error('down'); }, now: NOW });
  assert.equal(down.open, true, 'stay open if OpenRouter cannot be reached');
});

test('vercel.json ships every folder the API reads', async () => {
  const { readFileSync } = await import('node:fs');
  const glob = JSON.parse(readFileSync('vercel.json', 'utf8')).functions['api/*.js'].includeFiles;
  const shipped = glob.match(/\{(.*)\}/)[1].split(',');
  const src = readFileSync('api/_lib/data.js', 'utf8');
  const read = new Set([...src.matchAll(/[`'"]([a-z]+)\/[^`'"]*\.json[`'"]/g)].map((m) => m[1]));
  assert.ok(read.size >= 8, 'found the folders data.js reads');
  for (const dir of read) assert.ok(shipped.includes(dir), `${dir}/ is read by the API but not in includeFiles`);
});

/** A tiny stand-in for Vercel's req and res. */
function fakeRes() {
  const res = { headers: {}, setHeader(k, v) { this.headers[k.toLowerCase()] = v; }, status(c) { this.code = c; return this; }, send(b) { this.out = b; return this; } };
  return res;
}

test('the handlers set their headers', async () => {
  const status = (await import('../api/status.js')).default;
  const res = fakeRes();
  await status({}, res);
  assert.equal(res.code, 200);
  assert.match(res.headers['cache-control'], /s-maxage=30/);
  const recap = (await import('../api/recap.js')).default;
  const r2 = fakeRes();
  await recap({ method: 'POST', headers: {}, body: JSON.stringify({ nope: true }) }, r2);
  assert.equal(r2.code, 400);
  assert.equal(r2.headers['cache-control'], 'no-store');
  assert.deepEqual(JSON.parse(r2.out), { error: 'bad_request' });
});

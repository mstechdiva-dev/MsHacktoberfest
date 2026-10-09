// POST /api/recap: the attendant's note for today's receipt.
// The browser sends ids and facts; the server rebuilds names, checks everything and asks the model.
import { RecapRequest, AttendantNote } from './_lib/schema.js';
import { buildMessages, knownId } from './_lib/prompt.js';
import { chat, keyStatus } from './_lib/openrouter.js';
import { playedToday, setCookie } from './_lib/cookie.js';
import { nextMidnightUTC, utcDate } from './_lib/reopen.js';
import { loadData } from './_lib/data.js';
import { fallbackNote } from '../src/engine/receipt.js';

export const MAX_BODY = 8 * 1024;

const fallback = (extra = {}) => ({ status: 'ok', source: 'fallback', ...extra });

/**
 * The whole recap, without Vercel's req/res, so tests can call it.
 * @returns {Promise<{code:number, body:object, cookie?:string}>}
 */
export async function handleRecap({ method, rawBody, cookieHeader = '', env = process.env, fetchImpl = fetch, now = new Date() }) {
  const bad = () => ({ code: 400, body: { error: 'bad_request' } });
  if (method !== 'POST') return { code: 405, body: { error: 'POST only' } };
  if (typeof rawBody !== 'string' || Buffer.byteLength(rawBody) > MAX_BODY) return bad();
  let json;
  try { json = JSON.parse(rawBody); } catch { return bad(); }
  const parsed = RecapRequest.safeParse(json);
  if (!parsed.success) return bad();
  const req = parsed.data;

  // The data files back every id check and the model's facts. If they can't be read, play on with a house note.
  let loaded;
  try { loaded = loadData(); } catch { return { code: 200, body: fallback({ busy: true }) }; }
  const { raw, data } = loaded;
  const house = (extra = {}) => fallback({
    headline: fallbackNote({ loads: req.loads, trapsCaught: req.summary.trapIdsCaught.map((id) => ({ id })) }, raw.templates),
    lines: [],
    ...extra,
  });
  const ids = [...req.loads.flatMap((l) => l.itemIds), ...req.summary.trapIdsCaught];
  if (!ids.every((id) => knownId(data, id))) return bad();

  if (env.COZY_MAINTENANCE === '1') return { code: 200, body: house({ status: 'closed', reason: 'maintenance' }) };
  const today = utcDate(now);
  const secret = env.COZY_COOKIE_SECRET;
  if (playedToday(cookieHeader, secret, today)) return { code: 200, body: house({ reason: 'already_played' }) };
  if (!env.OPENROUTER_API_KEY) return { code: 200, body: house({ reason: 'no_key' }) };

  const reopensAt = nextMidnightUTC(now);
  const closed = () => ({ code: 200, body: house({ status: 'closed', reason: 'daily_cap', reopensAt }) });
  const result = await chat(env.OPENROUTER_API_KEY, buildMessages(req, data), raw.model, { fetchImpl });
  if (!result.ok) {
    if (result.status === 402 && result.limitSource === 'openrouter_key_limit') return closed();
    if (result.status === 402 || result.status === 429) {
      const k = await keyStatus(env.OPENROUTER_API_KEY, { fetchImpl });
      if (k && (k.remaining === 0 || k.keyLimitReached)) return closed();
    }
    return { code: 200, body: house({ busy: true }) };
  }
  let note;
  try { note = AttendantNote.parse(JSON.parse(result.content)); } catch { return { code: 200, body: house({ busy: true }) }; }
  return {
    code: 200,
    body: { status: 'ok', source: 'model', headline: note.headline, lines: note.lines },
    cookie: secret ? setCookie(today, secret, reopensAt) : undefined,
  };
}

async function readBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) return JSON.stringify(req.body);
  if (Buffer.isBuffer(req.body)) return req.body.toString('utf8');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > MAX_BODY) return 'x'.repeat(MAX_BODY + 1);
    chunks.push(c);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  const len = Number(req.headers['content-length'] || 0);
  const rawBody = len > MAX_BODY ? 'x'.repeat(MAX_BODY + 1) : await readBody(req);
  const out = await handleRecap({ method: req.method, rawBody, cookieHeader: req.headers.cookie || '' });
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json');
  if (out.cookie) res.setHeader('Set-Cookie', out.cookie);
  res.status(out.code).send(JSON.stringify(out.body));
}

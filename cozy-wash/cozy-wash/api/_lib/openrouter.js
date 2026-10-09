// Small OpenRouter client: the key's free daily allowance, and one chat call with a JSON schema.
import { ATTENDANT_JSON_SCHEMA } from './schema.js';

const BASE = 'https://openrouter.ai/api/v1';

async function withTimeout(fetchImpl, url, init, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetchImpl(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

const headers = (key) => ({
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
  'HTTP-Referer': 'https://cozywash.app',
  'X-Title': 'Cozy Wash',
});

/**
 * Read the key's limits. Returns null if it can't be read.
 * @returns {Promise<{used:number|null, limit:number|null, remaining:number|null, keyLimitReached:boolean}|null>}
 */
export async function keyStatus(key, { fetchImpl = fetch, timeoutMs = 2500 } = {}) {
  try {
    const res = await withTimeout(fetchImpl, `${BASE}/key`, { headers: headers(key) }, timeoutMs);
    if (!res.ok) return null;
    const body = await res.json();
    const d = body.data || body;
    const free = d.free_model_daily_requests || {};
    const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);
    return {
      used: num(free.used),
      limit: num(free.limit),
      remaining: num(free.remaining),
      keyLimitReached: num(d.limit_remaining) !== null && d.limit_remaining <= 0,
    };
  } catch {
    return null;
  }
}

/**
 * Ask for the note. Returns {ok:true, content} or {ok:false, status}.
 */
export async function chat(key, messages, model, { fetchImpl = fetch } = {}) {
  try {
    const res = await withTimeout(fetchImpl, `${BASE}/chat/completions`, {
      method: 'POST',
      headers: headers(key),
      body: JSON.stringify({
        models: model.models,
        messages,
        max_tokens: model.maxTokens,
        temperature: model.temperature,
        response_format: { type: 'json_schema', json_schema: ATTENDANT_JSON_SCHEMA },
        provider: { require_parameters: true },
      }),
    }, model.timeoutMs || 8000);
    if (!res.ok) {
      let limitSource = null;
      try { limitSource = ((await res.json()).error || {}).metadata.limit_source || null; } catch { /* no readable error body */ }
      return { ok: false, status: res.status, limitSource };
    }
    const body = await res.json();
    const content = body && body.choices && body.choices[0] && body.choices[0].message && body.choices[0].message.content;
    if (typeof content !== 'string') return { ok: false, status: 502 };
    return { ok: true, content };
  } catch {
    return { ok: false, status: 504 };
  }
}

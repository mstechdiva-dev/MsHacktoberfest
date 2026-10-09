// Talks to /api/status and /api/recap, with practice and offline fallbacks (PLAN sections 3, 11, 12).
import { mockStatus } from './mock.js';

const isLocal = () => ['localhost', '127.0.0.1', '[::1]', ''].includes(location.hostname);

async function withTimeout(promise, ms) {
  let t;
  const timeout = new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), ms); });
  try { return await Promise.race([promise, timeout]); } finally { clearTimeout(t); }
}

/**
 * @returns {Promise<{mode:'live'|'practice'|'offline', open:boolean, reason:string, reopensAt:string|null, gamesToday:number|null}>}
 */
export async function getStatus(timeoutMs = 3000) {
  const override = new URLSearchParams(location.search).get('sign');
  if (override) return mockStatus(override);
  try {
    const res = await withTimeout(fetch('api/status', { cache: 'no-store' }), timeoutMs);
    if (res.status === 404) return { mode: 'practice', open: true, reason: 'open', reopensAt: null, gamesToday: null };
    if (!res.ok) throw new Error(`status ${res.status}`);
    const body = await res.json();
    return { mode: 'live', open: Boolean(body.open), reason: body.reason || 'open', reopensAt: body.reopensAt || null, gamesToday: body.gamesToday ?? null };
  } catch {
    if (isLocal()) return { mode: 'practice', open: true, reason: 'open', reopensAt: null, gamesToday: null };
    return { mode: 'offline', open: true, reason: 'offline', reopensAt: null, gamesToday: null };
  }
}

/**
 * Ask for the attendant's note. Always resolves; never throws.
 * @returns {Promise<{status:string, source:'model'|'fallback', headline?:string, busy?:boolean, reopensAt?:string}>}
 */
export async function recap(payload, mode, timeoutMs = 10000) {
  if (mode === 'practice') return { status: 'ok', source: 'fallback' };
  try {
    const res = await withTimeout(fetch('api/recap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    }), timeoutMs);
    if (!res.ok) return { status: 'ok', source: 'fallback', busy: true };
    return await res.json();
  } catch {
    return { status: 'ok', source: 'fallback', busy: true };
  }
}

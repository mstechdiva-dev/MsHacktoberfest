// Shared status logic for /api/status and /api/recap.
import { keyStatus } from './openrouter.js';
import { nextMidnightUTC } from './reopen.js';

/** @returns {Promise<{open:boolean, reason:'open'|'daily_cap'|'maintenance', reopensAt:string|null, gamesToday:number|null}>} */
export async function getStatus({ env = process.env, fetchImpl = fetch, now = new Date() } = {}) {
  if (env.COZY_MAINTENANCE === '1') return { open: false, reason: 'maintenance', reopensAt: null, gamesToday: null };
  const reopensAt = nextMidnightUTC(now);
  if (!env.OPENROUTER_API_KEY) return { open: true, reason: 'open', reopensAt, gamesToday: null };
  const k = await keyStatus(env.OPENROUTER_API_KEY, { fetchImpl });
  if (!k) return { open: true, reason: 'open', reopensAt, gamesToday: null };
  const closed = k.keyLimitReached || k.remaining === 0;
  return { open: !closed, reason: closed ? 'daily_cap' : 'open', reopensAt, gamesToday: k.used };
}

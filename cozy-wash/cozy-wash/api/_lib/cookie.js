// The once-a-day cookie: cw_day=<UTC date>.<HMAC>. Signed so it can't be made up by hand.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const COOKIE = 'cw_day';

export function sign(date, secret) {
  return `${date}.${createHmac('sha256', secret).update(date).digest('hex')}`;
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of String(header).split(';')) {
    const i = part.indexOf('=');
    if (i < 1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

/** True when the cookie header holds a valid cookie for this date. */
export function playedToday(cookieHeader, secret, date) {
  if (!secret) return false;
  const value = parseCookies(cookieHeader)[COOKIE];
  if (!value) return false;
  const expected = sign(date, secret);
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** @param {string} expiresAt ISO time of the next midnight UTC */
export function setCookie(date, secret, expiresAt) {
  const expires = expiresAt ? `; Expires=${new Date(expiresAt).toUTCString()}` : '; Max-Age=86400';
  return `${COOKIE}=${encodeURIComponent(sign(date, secret))}; Path=/${expires}; HttpOnly; Secure; SameSite=Lax`;
}

// When the free daily allowance resets: the next midnight UTC.
export function nextMidnightUTC(now = new Date()) {
  const d = new Date(now);
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export const utcDate = (now = new Date()) => new Date(now).toISOString().slice(0, 10);

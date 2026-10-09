// Fake statuses for ?sign= testing overrides (PLAN section 12).

function nextMidnightUTC() {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d.toISOString();
}

export function mockStatus(sign) {
  const base = { mode: 'live', open: true, reason: 'open', reopensAt: nextMidnightUTC(), gamesToday: 37, override: sign };
  switch (sign) {
    case 'closed': return { ...base, open: false, reason: 'daily_cap', gamesToday: 50 };
    case 'maintenance': return { ...base, open: false, reason: 'maintenance', reopensAt: null };
    case 'offline': return { ...base, mode: 'offline', reason: 'offline' };
    case 'practice': return { ...base, mode: 'practice' };
    case 'busy': return { ...base, busy: true };
    case 'done': return { ...base, done: true };
    case 'reopened': return { ...base, reopened: true };
    default: return base;
  }
}

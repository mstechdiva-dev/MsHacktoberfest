// Turns whatever is in settings.json (or the settings panel) into safe numbers.
// A bad or missing value falls back to the default; the app never breaks on a typo.

const RULES = {
  enterPercent: { min: 10, max: 99 },
  leavePercent: { min: 5, max: 98 },
  reminderMinutes: { min: 1, max: 120 },
  snoozeMinutes: { min: 1, max: 240 },
  autoOnHours: { min: 1, max: 72 },
  pollSeconds: { min: 1, max: 60 },
};

export function resolveSettings(raw, defaults) {
  const input = raw && typeof raw === "object" ? raw : {};
  const out = {};
  const problems = [];

  for (const [key, rule] of Object.entries(RULES)) {
    const v = input[key];
    if (typeof v === "number" && Number.isFinite(v) && v >= rule.min && v <= rule.max) {
      out[key] = v;
    } else {
      out[key] = defaults[key];
      if (v !== undefined) problems.push(`${key} must be a number from ${rule.min} to ${rule.max}; using ${defaults[key]}.`);
    }
  }

  // leavePercent has to sit below enterPercent or the figure would flicker.
  if (out.leavePercent >= out.enterPercent) {
    problems.push("leavePercent must be lower than enterPercent; using the defaults for both.");
    out.enterPercent = defaults.enterPercent;
    out.leavePercent = defaults.leavePercent;
  }

  out.skin = typeof input.skin === "string" && input.skin.trim() ? input.skin.trim() : defaults.skin;
  return { settings: out, problems };
}

// The tray icon's menu, as plain data so it can be tested without Electron.
// Quit is always there, and Turn off and Snooze work at any moment, so the app can never trap you.
const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

const PHASE_LABEL = { calm: "Watching", opening: "The door is opening", nagging: "He is here", leaving: "He is leaving" };

function buildTrayTemplate(status, actions, options = {}) {
  const now = options.now ?? Date.now();
  const s = status || {};
  const snooze = s.snoozeMinutes || 15;
  const offHours = s.autoOnHours || 8;
  const paused = typeof s.pausedUntil === "number" && now < s.pausedUntil;
  const state = paused ? `${s.pausedKind === "off" ? "Off" : "Snoozed"} until ${clock(s.pausedUntil)}` : PHASE_LABEL[s.phase] || PHASE_LABEL.calm;

  return [
    { label: "Memory Monster", enabled: false },
    { label: state, enabled: false },
    { type: "separator" },
    { label: `Snooze ${snooze} minutes`, click: actions.snooze },
    paused ? { label: "Turn back on", click: actions.backOn } : { label: `Turn off (${offHours} hours)`, click: actions.off },
    { label: "Test the figure", click: actions.test },
    { type: "separator" },
    { label: "Look Studio...", click: actions.openLooks },
    { label: "Settings...", click: actions.openSettings },
    { label: "Start with Windows", type: "checkbox", checked: !!options.openAtLogin, click: actions.toggleLogin },
    { type: "separator" },
    { label: "Quit Memory Monster", click: actions.quit },
  ];
}

module.exports = { buildTrayTemplate };

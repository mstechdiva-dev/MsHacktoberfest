const test = require("node:test");
const assert = require("node:assert/strict");
const { buildTrayTemplate } = require("../lib/trayMenu.cjs");

const noop = () => {};
const actions = { snooze: noop, off: noop, backOn: noop, test: noop, openLooks: noop, openSettings: noop, toggleLogin: noop, quit: noop };
const labels = (t) => t.filter((i) => i.label).map((i) => i.label);

test("quit, snooze and turn off are always in the menu", () => {
  for (const status of [{ phase: "calm" }, { phase: "nagging" }, { phase: "leaving" }, undefined]) {
    const l = labels(buildTrayTemplate(status, actions, { now: 0 }));
    assert.ok(l.includes("Quit Memory Monster"));
    assert.ok(l.some((x) => x.startsWith("Snooze")));
    assert.ok(l.some((x) => x.startsWith("Turn off")));
  }
});

test("the menu uses the person's own snooze and off lengths", () => {
  const l = labels(buildTrayTemplate({ phase: "calm", snoozeMinutes: 30, autoOnHours: 4 }, actions, { now: 0 }));
  assert.ok(l.includes("Snooze 30 minutes"));
  assert.ok(l.includes("Turn off (4 hours)"));
});

test("while snoozed or off it says until when, and offers Turn back on", () => {
  const t = buildTrayTemplate({ phase: "calm", pausedUntil: 1000 * 60 * 60, pausedKind: "off" }, actions, { now: 0 });
  const l = labels(t);
  assert.ok(l.some((x) => x.startsWith("Off until")));
  assert.ok(l.includes("Turn back on"));
  assert.ok(!l.some((x) => x.startsWith("Turn off")));
  const snoozed = labels(buildTrayTemplate({ phase: "calm", pausedUntil: 1000 * 60, pausedKind: "snooze" }, actions, { now: 0 }));
  assert.ok(snoozed.some((x) => x.startsWith("Snoozed until")));
});

test("once the time has passed the menu is back to normal", () => {
  const l = labels(buildTrayTemplate({ phase: "calm", pausedUntil: 100, pausedKind: "off" }, actions, { now: 5000 }));
  assert.ok(!l.includes("Turn back on"));
  assert.ok(l.includes("Watching"));
});

test("the status line follows what he is doing", () => {
  assert.ok(labels(buildTrayTemplate({ phase: "nagging" }, actions, { now: 0 })).includes("He is here"));
  assert.ok(labels(buildTrayTemplate({ phase: "opening" }, actions, { now: 0 })).includes("The door is opening"));
});

test("every clickable item is wired to an action, and start-with-Windows is a checkbox", () => {
  const t = buildTrayTemplate({ phase: "calm" }, actions, { now: 0, openAtLogin: true });
  for (const item of t.filter((i) => i.label && i.enabled !== false)) assert.equal(typeof item.click, "function", item.label);
  const login = t.find((i) => i.label === "Start with Windows");
  assert.equal(login.type, "checkbox");
  assert.equal(login.checked, true);
});

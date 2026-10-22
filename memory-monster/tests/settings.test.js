import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { resolveSettings } from "../lib/settings.js";

const defaults = JSON.parse(fs.readFileSync(new URL("../settings.json", import.meta.url), "utf8"));

test("the shipped defaults pass their own rules", () => {
  const { settings, problems } = resolveSettings(defaults, defaults);
  assert.deepEqual(problems, []);
  assert.equal(settings.enterPercent, 80);
  assert.equal(settings.leavePercent, 75);
  assert.equal(settings.reminderMinutes, 5);
  assert.equal(settings.snoozeMinutes, 15);
  assert.equal(settings.autoOnHours, 8);
});

test("a bad value falls back to the default and says so", () => {
  const { settings, problems } = resolveSettings({ ...defaults, reminderMinutes: "soon", snoozeMinutes: -3 }, defaults);
  assert.equal(settings.reminderMinutes, 5);
  assert.equal(settings.snoozeMinutes, 15);
  assert.equal(problems.length, 2);
});

test("leave at or above enter resets both so he cannot flicker", () => {
  const { settings, problems } = resolveSettings({ ...defaults, enterPercent: 70, leavePercent: 80 }, defaults);
  assert.equal(settings.enterPercent, 80);
  assert.equal(settings.leavePercent, 75);
  assert.equal(problems.length, 1);
});

test("garbage input does not throw", () => {
  assert.equal(resolveSettings(null, defaults).settings.skin, defaults.skin);
  assert.equal(resolveSettings("nope", defaults).settings.enterPercent, 80);
});

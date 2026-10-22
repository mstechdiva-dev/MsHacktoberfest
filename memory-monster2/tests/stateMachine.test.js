import test from "node:test";
import assert from "node:assert/strict";
import { initialState, step, pause, clearPause } from "../lib/stateMachine.js";

const S = { enterPercent: 80, leavePercent: 75, reminderMinutes: 5 };
const MIN = 60000;

// Feeds a list of [percent, now] readings through the machine and returns every phase and event.
function run(readings, start = initialState()) {
  let state = start;
  const phases = [];
  const events = [];
  for (const [percent, now] of readings) {
    const r = step(state, { percent, now }, S);
    state = r.state;
    phases.push(state.phase);
    events.push(...r.events);
  }
  return { state, phases, events };
}

test("stays calm below 80", () => {
  const { phases, events } = run([[79.9, 1000], [50, 2000]]);
  assert.deepEqual(phases, ["calm", "calm"]);
  assert.deepEqual(events, []);
});

test("arrives at 80 and settles into nagging after the door opens", () => {
  const { phases, events } = run([[80, 1000], [82, 2000], [82, 5000]]);
  assert.deepEqual(phases, ["opening", "opening", "nagging"]);
  assert.deepEqual(events, ["arrive"]);
});

test("hovering between 75 and 80 does not flip him", () => {
  const readings = [[85, 1000], [85, 5000], [77, 6000], [79, 7000], [76, 8000], [77, 9000]];
  const { phases, events } = run(readings);
  assert.equal(phases.at(-1), "nagging");
  assert.deepEqual(events, ["arrive"]);
});

test("leaves only below 75, then returns to calm", () => {
  const { phases, events } = run([[85, 1000], [85, 5000], [74.9, 6000], [60, 10000]]);
  assert.deepEqual(phases, ["opening", "nagging", "leaving", "calm"]);
  assert.deepEqual(events, ["arrive", "leave"]);
});

test("reminds every 5 minutes while memory stays high", () => {
  const readings = [[85, 0], [85, 4000], [85, 4 * MIN], [85, 5 * MIN + 1], [85, 9 * MIN], [85, 10 * MIN + 2]];
  const { events } = run(readings);
  assert.deepEqual(events, ["arrive", "reminder", "reminder"]);
});

test("no reading never moves him", () => {
  const { phases } = run([[85, 1000], [85, 5000], [null, 6000], [NaN, 7000]]);
  assert.equal(phases.at(-1), "nagging");
});

test("snooze sends him away and keeps him away until it ends", () => {
  let r = run([[85, 1000], [85, 5000]]);
  r.state = pause(r.state, 6000, 15 * MIN, "snooze");
  r = run([[90, 7000], [90, 11000], [90, 12000]], r.state);
  assert.deepEqual(r.phases, ["leaving", "calm", "calm"]);
  r = run([[90, 6000 + 15 * MIN + 1]], r.state);
  assert.equal(r.phases[0], "opening");
});

test("turn off holds for 8 hours, then he is back", () => {
  const off = pause(initialState(), 0, 8 * 3600000, "off");
  assert.equal(run([[95, 7 * 3600000]], off).phases[0], "calm");
  assert.equal(run([[95, 8 * 3600000 + 1]], off).phases[0], "opening");
});

test("turning back on lets him arrive straight away", () => {
  const off = pause(initialState(), 0, 8 * 3600000, "off");
  assert.equal(run([[95, 1000]], clearPause(off)).phases[0], "opening");
});

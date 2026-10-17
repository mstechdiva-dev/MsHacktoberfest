const test = require("node:test");
const assert = require("node:assert/strict");
const { overlayOptions } = require("../lib/overlayWindow.cjs");

const display = { bounds: { x: 0, y: 0, width: 2560, height: 1440 } };
const o = overlayOptions(display, "/path/preload.js");

test("the overlay covers the whole screen it is given", () => {
  assert.deepEqual([o.x, o.y, o.width, o.height], [0, 0, 2560, 1440]);
  const second = overlayOptions({ bounds: { x: 1920, y: 0, width: 1920, height: 1080 } }, "p");
  assert.deepEqual([second.x, second.width], [1920, 1920]);
});

test("it is see-through, frameless and always on top, and it never takes focus or a taskbar slot", () => {
  assert.equal(o.transparent, true);
  assert.equal(o.frame, false);
  assert.equal(o.alwaysOnTop, true);
  assert.equal(o.focusable, false);
  assert.equal(o.skipTaskbar, true);
  assert.equal(o.show, false);
});

test("the page is sandboxed and only gets the small API from the preload", () => {
  const w = o.webPreferences;
  assert.equal(w.contextIsolation, true);
  assert.equal(w.nodeIntegration, false);
  assert.equal(w.sandbox, true);
  assert.equal(w.preload, "/path/preload.js");
  assert.equal(w.backgroundThrottling, false);
});

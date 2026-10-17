// Memory Monster for Windows. A see-through window covers your screen. When memory runs high the
// door opens and he steps out; the mouse goes straight through everything except the card.
// Everything runs on this computer: no account, no network, nothing leaves the machine.
const { app, BrowserWindow, Tray, Menu, ipcMain, screen, nativeImage, dialog, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { startStaticServer } = require("./lib/staticServer.cjs");
const { overlayOptions } = require("./lib/overlayWindow.cjs");
const { buildTrayTemplate } = require("./lib/trayMenu.cjs");
const { CH, PHASES } = require("./lib/channels.cjs");

const PORT = 47310; // a fixed port keeps the address, and so the saved choices, the same every run
const POLL_MS = 3000;
const SMOKE = process.env.MM_SMOKE || "";

// The reading code is shared with the helper: in the installed app it is copied next to the app.
const programs = require(app.isPackaged ? path.join(process.resourcesPath, "helper-lib.cjs") : path.join(__dirname, "..", "helper", "lib.cjs"));

if (process.platform === "linux") app.commandLine.appendSwitch("enable-transparent-visuals");
if (SMOKE) app.commandLine.appendSwitch("disable-gpu");
if (process.platform === "win32") app.setAppUserModelId("com.xyzagents.memorymonster");

let overlay = null;
let tray = null;
let origin = "";
let status = { phase: "calm" };
let pollTimer = null;
const extraWindows = new Map();

const asset = (name) => path.join(__dirname, "assets", name);
const send = (channel, payload) => {
  if (overlay && !overlay.isDestroyed()) overlay.webContents.send(channel, payload);
};

function placeOverlay() {
  if (!overlay || overlay.isDestroyed()) return;
  overlay.setBounds(screen.getPrimaryDisplay().bounds);
}

function createOverlay() {
  overlay = new BrowserWindow(overlayOptions(screen.getPrimaryDisplay(), path.join(__dirname, "preload.js")));
  overlay.setAlwaysOnTop(true, "screen-saver");
  overlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // The mouse passes through everything; the page tells us when it is over the card.
  overlay.setIgnoreMouseEvents(true, { forward: true });
  overlay.loadURL(`${origin}/overlay`);
  screen.on("display-metrics-changed", placeOverlay);
  overlay.on("closed", () => {
    overlay = null;
  });
}

// A normal window for the settings and the Look Studio. They share the overlay's saved choices.
function openWindow(route) {
  const existing = extraWindows.get(route);
  if (existing && !existing.isDestroyed()) {
    existing.show();
    existing.focus();
    return;
  }
  const win = new BrowserWindow({
    width: 1100,
    height: 820,
    title: "Memory Monster",
    autoHideMenuBar: true,
    backgroundColor: "#0b1120",
    icon: asset("icon.png"),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true },
  });
  win.loadURL(`${origin}${route}`);
  // Links to other sites open in the browser, never inside this app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (e, url) => {
    if (!url.startsWith(origin)) {
      e.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });
  win.on("closed", () => extraWindows.delete(route));
  extraWindows.set(route, win);
}

const actions = {
  snooze: () => send(CH.command, { type: "snooze" }),
  off: () => send(CH.command, { type: "off" }),
  backOn: () => send(CH.command, { type: "back-on" }),
  test: () => send(CH.command, { type: "test" }),
  openLooks: () => openWindow("/looks"),
  openSettings: () => openWindow("/app"),
  toggleLogin: (item) => {
    app.setLoginItemSettings({ openAtLogin: item.checked });
    updateTray();
  },
  quit: () => app.quit(),
};

function updateTray() {
  if (!tray) return;
  const menu = Menu.buildFromTemplate(buildTrayTemplate(status, actions, { openAtLogin: app.getLoginItemSettings().openAtLogin }));
  tray.setContextMenu(menu);
}

function createTray() {
  try {
    const img = fs.existsSync(asset("tray.png")) ? nativeImage.createFromPath(asset("tray.png")) : nativeImage.createEmpty();
    tray = new Tray(img);
    tray.setToolTip("Memory Monster");
    tray.on("click", () => tray.popUpContextMenu());
    updateTray();
    // The "until" times in the menu are clock times, so keep them fresh.
    setInterval(updateTray, 30000).unref();
  } catch (e) {
    console.error("[memory-monster] no tray icon:", e.message);
  }
}

// One reading every few seconds, sent to the overlay. Real numbers from this computer.
function startPolling() {
  let busy = false;
  const poll = async () => {
    if (busy) return;
    busy = true;
    try {
      const reading = await programs.readNow();
      if (process.env.MM_DEBUG) console.log("[memory-monster] reading", reading.percent + "%", reading.top.map((t) => t.name).join(", "));
      send(CH.reading, reading);
    } catch (e) {
      console.error("[memory-monster] could not read memory:", e.message);
    } finally {
      busy = false;
    }
  };
  poll();
  pollTimer = setInterval(poll, POLL_MS);
}

// Messages from the overlay page. Only the overlay is listened to, and every value is checked.
function wireMessages() {
  const fromOverlay = (e) => overlay && !overlay.isDestroyed() && e.sender === overlay.webContents;

  ipcMain.handle(CH.close, async (e, name) => {
    if (!fromOverlay(e) || typeof name !== "string" || name.length === 0 || name.length > 100) return { ok: false, error: "Not allowed." };
    return programs.closeProgramByName(name);
  });

  ipcMain.on(CH.phase, (e, phase) => {
    if (!fromOverlay(e) || !PHASES.includes(phase)) return;
    if (phase === "calm") overlay.hide();
    else if (!overlay.isVisible()) {
      overlay.showInactive();
      overlay.setAlwaysOnTop(true, "screen-saver");
    }
  });

  ipcMain.on(CH.interactive, (e, on) => {
    if (!fromOverlay(e) || typeof on !== "boolean") return;
    overlay.setIgnoreMouseEvents(!on, { forward: true });
  });

  ipcMain.on(CH.status, (e, s) => {
    if (!fromOverlay(e) || !s || typeof s !== "object") return;
    status = {
      phase: PHASES.includes(s.phase) ? s.phase : "calm",
      pausedUntil: Number.isFinite(s.pausedUntil) ? s.pausedUntil : 0,
      pausedKind: s.pausedKind === "off" ? "off" : s.pausedKind === "snooze" ? "snooze" : "",
      snoozeMinutes: Number.isFinite(s.snoozeMinutes) ? s.snoozeMinutes : 15,
      autoOnHours: Number.isFinite(s.autoOnHours) ? s.autoOnHours : 8,
    };
    updateTray();
  });
}

async function start() {
  const siteDir = path.join(__dirname, "site");
  if (!fs.existsSync(path.join(siteDir, "overlay.html"))) {
    dialog.showErrorBox("Memory Monster", "The site files are missing. Run `npm run build:site` in the desktop folder first.");
    app.quit();
    return;
  }
  const server = await startStaticServer({ root: siteDir, port: PORT });
  origin = server.origin;
  wireMessages();
  createOverlay();
  if (SMOKE === "1") {
    // Self-check with a pretend reading (see lib/smoke.cjs).
    require("./lib/smoke.cjs").run({ overlay, send, app });
  } else {
    createTray();
    startPolling();
    if (SMOKE === "close") require("./lib/smoke.cjs").runClose({ overlay, app });
  }
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => openWindow("/app"));
  // Closing the settings window must not quit the app: he keeps watching from the tray.
  app.on("window-all-closed", () => {});
  app.on("before-quit", () => {
    if (pollTimer) clearInterval(pollTimer);
  });
  app.whenReady().then(start);
}

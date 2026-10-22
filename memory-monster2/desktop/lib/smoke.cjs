// A self-check you can run on any computer: `MM_SMOKE=1 MM_SMOKE_OUT=shot.png npx electron .`
// It sends a pretend 90% reading, waits for the door to open, saves a picture of the overlay,
// prints what the window is doing as JSON, and quits.
const fs = require("fs");

function run({ overlay, send, app }) {
  const out = process.env.MM_SMOKE_OUT || "smoke.png";
  const log = {};
  overlay.webContents.once("did-finish-load", () => {
    setTimeout(() => send("mm:reading", { percent: 90, top: [{ name: "python3", mb: 2048, pids: [1] }, { name: "chrome", mb: 800, pids: [2] }] }), 1500);
    setTimeout(async () => {
      log.visible = overlay.isVisible();
      log.alwaysOnTop = overlay.isAlwaysOnTop();
      log.focusable = overlay.isFocusable();
      log.bounds = overlay.getBounds();
      log.hasBridge = await overlay.webContents.executeJavaScript("Boolean(window.memoryMonster && window.memoryMonster.desktop)");
      log.phase = await overlay.webContents.executeJavaScript("document.querySelector('.stage') ? document.querySelector('.stage').dataset.phase : null");
      log.cardShown = await overlay.webContents.executeJavaScript("Boolean(document.querySelector('.card.show'))");
      const image = await overlay.webContents.capturePage();
      fs.writeFileSync(out, image.toPNG());
      console.log("SMOKE " + JSON.stringify(log));
      app.exit(0);
    }, 9500);
  });
}

// The whole chain with real readings: lower the arrival number, wait for the card to list a real
// program (MM_SMOKE_NAME), press Close it, confirm, and see whether the program really closed.
// Run with the program already running and MM_SMOKE_PID set to its process id.
function runClose({ overlay, app }) {
  const name = process.env.MM_SMOKE_NAME || "python3";
  const pid = Number(process.env.MM_SMOKE_PID);
  const log = { name, pid };
  const js = (code) => overlay.webContents.executeJavaScript(code);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const alive = () => {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  };
  overlay.webContents.once("did-finish-load", async () => {
    try {
      await js(`localStorage.setItem("mm-settings", JSON.stringify({ enterPercent: 10, leavePercent: 6 })); window.dispatchEvent(new StorageEvent("storage", { key: "mm-settings" }));`);
      for (let i = 0; i < 30 && !(await js(`Boolean([...document.querySelectorAll(".card.show li")].find((li) => li.textContent.includes(${JSON.stringify(name)})))`)); i++) await wait(1000);
      log.cardListedIt = await js(`Boolean([...document.querySelectorAll(".card.show li")].find((li) => li.textContent.includes(${JSON.stringify(name)})))`);
      log.aliveBefore = alive();
      await js(`[...document.querySelectorAll(".card.show li")].find((li) => li.textContent.includes(${JSON.stringify(name)})).querySelector("button.closeit").click()`);
      await wait(500);
      log.askedFirst = await js(`document.querySelector(".card.show").textContent.includes("Anything you have not saved")`);
      log.aliveAfterFirstClick = alive();
      await js(`[...document.querySelectorAll(".card.show button")].find((b) => b.textContent.includes("Yes, close it")).click()`);
      await wait(2500);
      log.aliveAfterConfirm = alive();
      log.note = await js(`(document.querySelector(".card .tiny:last-child") || {}).textContent || ""`);
      await wait(7000);
      log.phaseAtEnd = await js(`document.querySelector(".stage") ? document.querySelector(".stage").dataset.phase : null`);
    } catch (e) {
      log.error = String(e);
    }
    console.log("SMOKE-CLOSE " + JSON.stringify(log));
    app.exit(0);
  });
}

module.exports = { run, runClose };

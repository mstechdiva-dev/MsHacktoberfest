// The desktop app (see desktop/) puts a small API on window.memoryMonster before the page loads.
// In a normal browser it does not exist, and everything here returns null.
//
// The API (all of it is described in desktop/preload.js):
//   desktop: true
//   onReading(cb)        cb({ percent, top }) every few seconds, real readings from this computer
//   onCommand(cb)        cb({ type }) from the tray menu: "snooze" | "off" | "back-on" | "test"
//   closeProgram(name)   asks one listed program to close; resolves { ok, closed, total } or { ok:false, error }
//   setPhase(phase)      "calm" | "opening" | "nagging" | "leaving", so the window can show and hide
//   setInteractive(bool) true while the mouse is over the card, so only the card takes clicks
//   setStatus(status)    { phase, pausedUntil, pausedKind }, so the tray menu can show the right labels

export const BRIDGE_API = ["onReading", "onCommand", "closeProgram", "setPhase", "setInteractive", "setStatus"];

export function getBridge() {
  if (typeof window === "undefined") return null;
  const b = window.memoryMonster;
  return b && b.desktop ? b : null;
}

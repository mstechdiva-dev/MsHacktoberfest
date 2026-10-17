// Runs inside the overlay page and gives it the few things it is allowed to ask for.
// Nothing else from the desktop app reaches the page. (Channel names repeat lib/channels.cjs,
// because a sandboxed preload cannot load other files; a test keeps them in step.)
const { contextBridge, ipcRenderer } = require("electron");

const CH = {
  reading: "mm:reading",
  command: "mm:command",
  close: "mm:close",
  phase: "mm:phase",
  interactive: "mm:interactive",
  status: "mm:status",
};

// Subscribes to a channel and hands back a function that unsubscribes.
function subscribe(channel, cb) {
  const handler = (_event, payload) => cb(payload);
  ipcRenderer.on(channel, handler);
  return () => ipcRenderer.removeListener(channel, handler);
}

contextBridge.exposeInMainWorld("memoryMonster", {
  desktop: true,
  onReading: (cb) => subscribe(CH.reading, cb),
  onCommand: (cb) => subscribe(CH.command, cb),
  closeProgram: (name) => ipcRenderer.invoke(CH.close, String(name)),
  setPhase: (phase) => ipcRenderer.send(CH.phase, String(phase)),
  setInteractive: (on) => ipcRenderer.send(CH.interactive, !!on),
  setStatus: (status) => ipcRenderer.send(CH.status, status),
});

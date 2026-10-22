// The names of the messages between the overlay page and the desktop app.
// preload.js repeats these (a sandboxed preload cannot load other files); a test keeps the two in step.
const CH = {
  reading: "mm:reading",
  command: "mm:command",
  close: "mm:close",
  phase: "mm:phase",
  interactive: "mm:interactive",
  status: "mm:status",
};

const PHASES = ["calm", "opening", "nagging", "leaving"];

module.exports = { CH, PHASES };

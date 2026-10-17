"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { initialState, step, pause, clearPause } from "../lib/stateMachine.js";
import { resolveSettings } from "../lib/settings.js";
import { pickSkin } from "../lib/skins.js";
import { applyLook } from "../lib/looks.js";
import { SAMPLE_TOP } from "../lib/memorySources.js";
import { getBridge } from "../lib/desktopBridge.js";
import { loadJson, saveJson } from "../lib/storage.js";
import Stage from "./Stage";
import AlertCard from "./AlertCard";

const TEST_MS = 16000;
const TEST_PERCENT = 85;

// The screen overlay. It has no controls of its own: the tray menu sends commands, the settings
// and Look Studio windows share this page's saved choices, and only the card takes clicks.
export default function OverlayApp({ defaults, skins }) {
  const [bridge, setBridge] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [look, setLook] = useState({});
  const [reading, setReading] = useState({ percent: null, top: null });
  const [machine, setMachine] = useState(initialState());
  const [displayPhase, setDisplayPhase] = useState("calm");
  const [testUntil, setTestUntil] = useState(0);
  const [message, setMessage] = useState("");
  const [pulse, setPulse] = useState(0);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState("");

  const { settings } = useMemo(() => resolveSettings({ ...defaults, ...overrides }, defaults), [defaults, overrides]);
  const picked = useMemo(() => pickSkin(skins, settings.skin), [skins, settings.skin]);
  const { skin } = useMemo(() => applyLook(picked.skin, look), [picked.skin, look]);

  const live = useRef({});
  live.current = { settings, skin, reading, testUntil, bridge };
  const machineRef = useRef(machine);
  machineRef.current = machine;

  // Saved choices come from the same place as the app and the Look Studio, so a change made in
  // either window shows up here at once (the storage event fires in every other window).
  useEffect(() => {
    const b = getBridge();
    setBridge(b);
    const reload = () => {
      setOverrides(loadJson("mm-settings", {}));
      setLook(loadJson("mm-look", {}));
      const p = loadJson("mm-pause", {});
      const next = { ...machineRef.current, pausedUntil: p.pausedUntil || 0, pausedKind: p.pausedKind || "" };
      machineRef.current = next;
      setMachine(next);
    };
    reload();
    const onStorage = (e) => { if (!e.key || e.key.startsWith("mm-")) reload(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const applyMachine = (m) => {
    machineRef.current = m;
    setMachine(m);
    saveJson("mm-pause", { pausedUntil: m.pausedUntil, pausedKind: m.pausedKind });
  };

  // Readings and tray commands arrive from the desktop app.
  useEffect(() => {
    if (!bridge) return undefined;
    const offReading = bridge.onReading((r) => setReading({ percent: r.percent, top: r.top }));
    const offCommand = bridge.onCommand((c) => {
      const s = live.current.settings;
      if (c.type === "snooze") applyMachine(pause(machineRef.current, Date.now(), s.snoozeMinutes * 60000, "snooze"));
      if (c.type === "off") applyMachine(pause(machineRef.current, Date.now(), s.autoOnHours * 3600000, "off"));
      if (c.type === "back-on") applyMachine(clearPause(machineRef.current));
      if (c.type === "test") {
        applyMachine(clearPause(machineRef.current));
        setTestUntil(Date.now() + TEST_MS);
      }
    });
    return () => {
      if (typeof offReading === "function") offReading();
      if (typeof offCommand === "function") offCommand();
    };
  }, [bridge]);

  // One tick a second, the same machine the app uses.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      const c = live.current;
      const percent = t < c.testUntil ? TEST_PERCENT : c.reading.percent;
      const { state, events } = step(machineRef.current, { percent, now: t }, c.settings);
      const prev = machineRef.current;
      if (state.phase !== prev.phase || state.lastReminderAt !== prev.lastReminderAt) {
        machineRef.current = state;
        setMachine(state);
      }
      for (const e of events) {
        if (e === "arrive") setMessage(c.skin.words.arrive);
        if (e === "reminder") {
          setMessage(c.skin.words.reminder);
          setPulse((n) => n + 1);
        }
        if (e === "leave") setMessage(c.skin.words.leave);
      }
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Tell the window what is happening. It is shown a moment before the door starts to open,
  // so the opening is not missed, and hidden again when he has gone.
  useEffect(() => {
    if (!bridge) return undefined;
    bridge.setPhase(machine.phase);
    bridge.setStatus({ phase: machine.phase, pausedUntil: machine.pausedUntil, pausedKind: machine.pausedKind, snoozeMinutes: live.current.settings.snoozeMinutes, autoOnHours: live.current.settings.autoOnHours });
    if (machine.phase === "opening") {
      const id = setTimeout(() => setDisplayPhase("opening"), 300);
      return () => clearTimeout(id);
    }
    setDisplayPhase(machine.phase);
    return undefined;
  }, [bridge, machine.phase, machine.pausedUntil, machine.pausedKind, settings.snoozeMinutes, settings.autoOnHours]);

  // Only the card takes clicks. Everywhere else the mouse goes straight through to your desktop.
  useEffect(() => {
    if (!bridge) return undefined;
    let over = false;
    const onMove = (e) => {
      const now = !!(e.target && e.target.closest && e.target.closest(".card.show"));
      if (now !== over) {
        over = now;
        bridge.setInteractive(now);
      }
    };
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, [bridge]);

  const onConfirm = async (name) => {
    setAsking("");
    const r = await bridge.closeProgram(name);
    setNote(r.ok ? `Asked ${name} to close (${r.closed} of ${r.total}).` : r.error || `${name} did not close.`);
  };

  if (!bridge) {
    return (
      <main className="overlay-note">
        <h1>Memory Monster overlay</h1>
        <p>This page is what the desktop app draws over your screen. It only works inside the desktop app.</p>
        <p><a className="linkbtn" href="/app">Open the web app instead</a></p>
      </main>
    );
  }

  const testing = Date.now() < testUntil;
  const show = displayPhase === "opening" || displayPhase === "nagging";
  return (
    <Stage phase={displayPhase} skin={skin} overlay>
      <AlertCard show={show} message={message} top={testing ? SAMPLE_TOP : reading.top} sample={testing} canClose note={note} pulse={pulse % 2 === 1} asking={asking} onAsk={setAsking} onConfirm={onConfirm} onCancel={() => setAsking("")} />
    </Stage>
  );
}

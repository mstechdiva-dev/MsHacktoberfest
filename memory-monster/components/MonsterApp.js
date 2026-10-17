"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { initialState, step, pause, clearPause } from "../lib/stateMachine.js";
import { resolveSettings } from "../lib/settings.js";
import { pickSkin } from "../lib/skins.js";
import { applyLook } from "../lib/looks.js";
import { readTab, fetchHelper, closeProgram, SAMPLE_TOP } from "../lib/memorySources.js";
import { loadJson, saveJson } from "../lib/storage.js";
import Stage from "./Stage";
import AlertCard from "./AlertCard";
import SettingsPanel from "./SettingsPanel";

const TEST_MS = 16000; // "Test the figure" holds a pretend 85% for this long, then lets him leave
const TEST_PERCENT = 85;
const PHASE_LABEL = { calm: "Calm", opening: "Door opening", nagging: "He is here", leaving: "Leaving" };

const clock = (t) => new Date(t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

export default function MonsterApp({ defaults, skins }) {
  const [overrides, setOverrides] = useState({});
  const [look, setLook] = useState({});
  const [source, setSource] = useState("demo");
  const [helper, setHelper] = useState({ url: "http://127.0.0.1:47200", token: "" });
  const [demoPercent, setDemoPercent] = useState(40);
  const [helperReading, setHelperReading] = useState({ percent: null, top: null, error: "" });
  const [machine, setMachine] = useState(initialState());
  const [testUntil, setTestUntil] = useState(0);
  const [message, setMessage] = useState("");
  const [pulse, setPulse] = useState(0);
  const [note, setNote] = useState("");
  const [asking, setAsking] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [now, setNow] = useState(0);
  const [notify, setNotify] = useState(false);
  const [canPip, setCanPip] = useState(false);
  const [pip, setPip] = useState(null);

  const raw = useMemo(() => ({ ...defaults, ...overrides }), [defaults, overrides]);
  const { settings, problems: settingProblems } = useMemo(() => resolveSettings(raw, defaults), [raw, defaults]);
  const picked = useMemo(() => pickSkin(skins, settings.skin), [skins, settings.skin]);
  // The Look Studio choices sit on top of the chosen skin.
  const { skin, problems: lookProblems } = useMemo(() => applyLook(picked.skin, look), [picked.skin, look]);
  const skinProblems = [...picked.problems, ...lookProblems];

  // Remembered choices come back after the first render so the server and browser markup match.
  useEffect(() => {
    setOverrides(loadJson("mm-settings", {}));
    setLook(loadJson("mm-look", {}));
    setSource(loadJson("mm-source", "demo"));
    setHelper((h) => ({ ...h, ...loadJson("mm-helper", {}) }));
    setMachine((m) => ({ ...m, ...loadJson("mm-pause", {}) }));
    setNotify(loadJson("mm-notify", false) === true);
    setCanPip(typeof window !== "undefined" && "documentPictureInPicture" in window);
    setNow(Date.now());
  }, []);

  const live = useRef({});
  live.current = { settings, skin, source, demoPercent, helperReading, testUntil, notify };
  const machineRef = useRef(machine);
  machineRef.current = machine;

  // One tick a second: pick the current reading, advance the machine, show any events.
  useEffect(() => {
    const id = setInterval(() => {
      const t = Date.now();
      const c = live.current;
      let percent = null;
      if (t < c.testUntil) percent = TEST_PERCENT;
      else if (c.source === "demo") percent = c.demoPercent;
      else if (c.source === "tab") percent = readTab().percent;
      else percent = c.helperReading.percent;

      const { state, events } = step(machineRef.current, { percent, now: t }, c.settings);
      if (state !== machineRef.current && (state.phase !== machineRef.current.phase || state.lastReminderAt !== machineRef.current.lastReminderAt)) {
        machineRef.current = state;
        setMachine(state);
      }
      for (const e of events) {
        if (e === "arrive") {
          setMessage(c.skin.words.arrive);
          // A hidden tab cannot show him, so say so with a notification (only if the person turned it on).
          if (c.notify && document.hidden && typeof Notification !== "undefined" && Notification.permission === "granted") {
            try { new Notification("Memory Monster", { body: c.skin.words.arrive }); } catch { /* notifications blocked */ }
          }
        }
        if (e === "reminder") {
          setMessage(c.skin.words.reminder);
          setPulse((n) => n + 1);
        }
        if (e === "leave") setMessage(c.skin.words.leave);
      }
      setNow(t);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Ask the helper for a fresh reading every few seconds while it is the chosen source.
  useEffect(() => {
    if (source !== "helper" || !helper.token) return undefined;
    let stop = false;
    const poll = async () => {
      const r = await fetchHelper(helper.url, helper.token);
      if (!stop) setHelperReading(r);
    };
    poll();
    const id = setInterval(poll, settings.pollSeconds * 1000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [source, helper.url, helper.token, settings.pollSeconds]);

  const savePause = (m) => saveJson("mm-pause", { pausedUntil: m.pausedUntil, pausedKind: m.pausedKind });
  const applyMachine = (m) => {
    machineRef.current = m;
    setMachine(m);
    savePause(m);
  };

  const onSnooze = () => applyMachine(pause(machineRef.current, Date.now(), settings.snoozeMinutes * 60000, "snooze"));
  const onOff = () => applyMachine(pause(machineRef.current, Date.now(), settings.autoOnHours * 3600000, "off"));
  const onBackOn = () => applyMachine(clearPause(machineRef.current));
  const onTest = () => {
    applyMachine(clearPause(machineRef.current));
    setTestUntil(Date.now() + TEST_MS);
  };
  const onFullscreen = () => document.documentElement.requestFullscreen?.();

  // Turning notifications on asks the browser for permission; it stays off if the answer is no.
  const changeNotify = async (on) => {
    if (on && typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const answer = await Notification.requestPermission();
      if (answer !== "granted") {
        setNote("Notifications are blocked for this site. Allow them in your browser's site settings, then try again.");
        return;
      }
    }
    setNotify(on);
    saveJson("mm-notify", on);
  };

  // A small always-on-top window that holds the scene (Chrome and Edge only).
  const popOut = async () => {
    try {
      const win = await window.documentPictureInPicture.requestWindow({ width: 480, height: 420 });
      for (const sheet of [...document.styleSheets]) {
        try {
          const st = win.document.createElement("style");
          st.textContent = [...sheet.cssRules].map((r) => r.cssText).join("\n");
          win.document.head.appendChild(st);
        } catch {
          if (sheet.href) {
            const l = win.document.createElement("link");
            l.rel = "stylesheet";
            l.href = sheet.href;
            win.document.head.appendChild(l);
          }
        }
      }
      win.document.body.className = "pip";
      win.addEventListener("pagehide", () => setPip(null));
      setPip(win);
    } catch {
      setNote("This browser would not open the pop-out window.");
    }
  };

  const changeSetting = (key, value) => {
    const next = { ...overrides, [key]: value };
    setOverrides(next);
    saveJson("mm-settings", next);
  };
  const changeSource = (s) => {
    setSource(s);
    saveJson("mm-source", s);
    setHelperReading({ percent: null, top: null, error: "" });
  };
  const changeHelper = (h) => {
    setHelper(h);
    saveJson("mm-helper", h);
  };

  // Closing is two clicks: "Close it" asks inside the card, and only "Yes, close it" sends the request.
  const onConfirm = useCallback(
    async (name) => {
      setAsking("");
      const r = await closeProgram(helper.url, helper.token, name);
      setNote(r.ok ? `Asked ${name} to close (${r.closed} of ${r.total}).` : r.error || `${name} did not close.`);
    },
    [helper.url, helper.token]
  );

  const testing = now < testUntil;
  const percent = testing ? TEST_PERCENT : source === "demo" ? demoPercent : source === "tab" ? readTab().percent : helperReading.percent;
  const top = testing ? SAMPLE_TOP : source === "helper" ? helperReading.top : null;
  const paused = now < machine.pausedUntil;
  const showCard = machine.phase === "opening" || machine.phase === "nagging";
  const sourceError = source === "tab" ? readTab().error : source === "helper" ? (helper.token ? helperReading.error : "Open Settings and paste the helper address and code.") : "";

  let status = PHASE_LABEL[machine.phase];
  if (paused) status = `${machine.pausedKind === "off" ? "Off" : "Snoozed"} until ${clock(machine.pausedUntil)}`;

  return (
    <main>
      <Stage phase={machine.phase} skin={skin}>
        <AlertCard show={showCard} message={message} top={top} sample={testing} canClose={source === "helper"} note={note} pulse={pulse % 2 === 1} asking={asking} onAsk={setAsking} onConfirm={onConfirm} onCancel={() => setAsking("")} />
      </Stage>

      <section className="controls" aria-label="Controls">
        <div className="row">
          <div className="meter">{typeof percent === "number" ? `${Math.round(percent)}%` : "--"}</div>
          {source === "demo" ? (
            <input type="range" min="0" max="100" value={demoPercent} onChange={(e) => setDemoPercent(Number(e.target.value))} aria-label="Demo memory percent" />
          ) : (
            <span className="state">{source === "tab" ? "This tab only" : "Whole computer"}</span>
          )}
          <span className="state">
            <b>{status}</b> · in at {settings.enterPercent}%, out below {settings.leavePercent}%
          </span>
        </div>
        {sourceError ? <p className="tiny">{sourceError}</p> : null}
        <div className="btns">
          <button type="button" onClick={onTest}>Test the figure</button>
          <button type="button" onClick={onSnooze}>Snooze {settings.snoozeMinutes} min</button>
          {paused ? <button type="button" onClick={onBackOn}>Turn back on</button> : <button type="button" onClick={onOff}>Turn off ({settings.autoOnHours} h)</button>}
          <button type="button" onClick={onFullscreen}>Full screen</button>
          {canPip ? <button type="button" onClick={popOut}>Pop out</button> : null}
          <a className="linkbtn" href="/looks">Look Studio</a>
          <button type="button" onClick={() => setPanelOpen(true)}>Settings</button>
        </div>
        {skinProblems.length > 0 ? <p className="tiny">Skin note: {skinProblems[0]}</p> : null}
      </section>

      {pip
        ? createPortal(
            <Stage phase={machine.phase} skin={skin} contained>
              <AlertCard show={showCard} message={message} top={top} sample={testing} canClose={source === "helper"} note={note} pulse={pulse % 2 === 1} asking={asking} onAsk={setAsking} onConfirm={onConfirm} onCancel={() => setAsking("")} />
            </Stage>,
            pip.document.body
          )
        : null}

      <SettingsPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        values={raw}
        defaults={defaults}
        skins={skins}
        problems={settingProblems}
        source={source}
        onSource={changeSource}
        helper={helper}
        onHelper={changeHelper}
        onChange={changeSetting}
        notify={notify}
        onNotify={changeNotify}
        onReset={() => {
          setOverrides({});
          saveJson("mm-settings", {});
        }}
      />
    </main>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { pickSkin } from "../lib/skins.js";
import { applyLook, skinToJson } from "../lib/looks.js";
import { FACES, OUTFITS, DOORS, OPENS, ENTRANCES, EYE_COLORS } from "../lib/skinOptions.js";
import { loadJson, saveJson } from "../lib/storage.js";
import Stage from "./Stage";
import { Thumb } from "./Figure";

// Pick a look from thumbnails. Choices are saved in this browser and the main page uses them.
export default function LookStudio({ defaults, skins }) {
  const [look, setLook] = useState({});
  const [skinId, setSkinId] = useState(defaults.skin);
  const [phase, setPhase] = useState("nagging");
  const [copied, setCopied] = useState("");

  useEffect(() => {
    setLook(loadJson("mm-look", {}));
    const s = loadJson("mm-settings", {});
    if (typeof s.skin === "string") setSkinId(s.skin);
  }, []);

  const base = useMemo(() => pickSkin(skins, skinId).skin, [skins, skinId]);
  const { skin, problems } = useMemo(() => applyLook(base, look), [base, look]);

  const change = (section, field, value) => {
    const next = { ...look, [section]: { ...(look[section] || {}), [field]: value } };
    setLook(next);
    saveJson("mm-look", next);
  };
  const clear = (section, field) => {
    const sec = { ...(look[section] || {}) };
    delete sec[field];
    const next = { ...look, [section]: sec };
    setLook(next);
    saveJson("mm-look", next);
  };
  const reset = () => {
    setLook({});
    saveJson("mm-look", {});
  };

  // Plays the entrance again: he goes away, then the door opens and he steps out.
  const replay = () => {
    setPhase("calm");
    setTimeout(() => setPhase("opening"), 700);
  };

  const copy = async () => {
    const text = skinToJson(skin);
    try {
      await navigator.clipboard.writeText(text);
      setCopied("Copied. Paste it into a new skin.json.");
    } catch {
      setCopied("Your browser would not copy. Select the text below and copy it yourself.");
    }
  };

  // One row of thumbnails. preview builds the skin to draw for each option so it shows on the current look.
  const grid = (title, options, section, field, current, kind) => (
    <section className="pick" aria-label={title}>
      <h3>{title}</h3>
      <div className="thumbs">
        {options.map((o) => {
          const { skin: s } = applyLook(skin, { [section]: { [field]: o.id } });
          return (
            <button key={o.id} type="button" className={`thumbbtn${current === o.id ? " on" : ""}`} aria-pressed={current === o.id} onClick={() => change(section, field, o.id)}>
              <Thumb skin={s} kind={kind} />
              <span>{o.label}</span>
            </button>
          );
        })}
      </div>
    </section>
  );

  const colorInput = (label, section, field, value, optional) => (
    <label className="colorfield">
      <span>{label}</span>
      <input type="color" value={value || "#000000"} onChange={(e) => change(section, field, e.target.value)} />
      {optional && look[section]?.[field] ? (
        <button type="button" className="mini" onClick={() => clear(section, field)}>Use the default</button>
      ) : null}
    </label>
  );

  return (
    <main className="studio">
      <header className="studio-head">
        <div>
          <h1>Look Studio</h1>
          <p className="tiny">Pick a face, an outfit and a door. The picture updates as you go, and Memory Monster uses your choices the next time you open it.</p>
        </div>
        <a className="linkbtn" href="/app">Back to Memory Monster</a>
      </header>

      <Stage phase={phase} skin={skin} contained />
      <div className="btns">
        <button type="button" onClick={replay}>Play the entrance</button>
        <button type="button" onClick={reset}>Back to the skin&apos;s own look</button>
        <button type="button" onClick={copy}>Copy as skin.json</button>
      </div>
      {copied ? <p className="tiny">{copied}</p> : null}
      {problems.length > 0 ? <p className="tiny">Note: {problems[0]}</p> : null}

      <label className="field">
        <span>Start from this skin</span>
        <select value={skinId} onChange={(e) => setSkinId(e.target.value)}>
          {skins.map((s) => (
            <option key={s.id} value={s.id}>{s.id}</option>
          ))}
        </select>
      </label>

      {grid("Face", FACES, "face", "style", skin.face.style, "head")}
      {grid("Outfit", OUTFITS, "outfit", "style", skin.outfit.style, "body")}
      {grid("Door", DOORS, "door", "style", skin.door.style, "door")}
      {grid("How the door opens", OPENS, "door", "opens", skin.door.opens, "door")}

      <section className="pick" aria-label="How he arrives">
        <h3>How he arrives</h3>
        <div className="chips">
          {ENTRANCES.map((o) => (
            <button key={o.id} type="button" className={`chip${skin.entrance.style === o.id ? " on" : ""}`} aria-pressed={skin.entrance.style === o.id} onClick={() => { change("entrance", "style", o.id); }}>
              {o.label}
            </button>
          ))}
        </div>
        <p className="tiny">Press &quot;Play the entrance&quot; to watch it.</p>
      </section>

      <section className="pick" aria-label="Eye color">
        <h3>Eye color</h3>
        <div className="chips">
          {EYE_COLORS.map((c) => (
            <button key={c.id} type="button" className={`swatch${skin.eyes.color === c.id ? " on" : ""}`} style={{ background: c.id }} title={c.label} aria-label={c.label} aria-pressed={skin.eyes.color === c.id} onClick={() => change("eyes", "color", c.id)} />
          ))}
          {colorInput("Your own", "eyes", "color", skin.eyes.color)}
        </div>
      </section>

      <section className="pick" aria-label="Colors">
        <h3>Colors</h3>
        <div className="chips">
          {colorInput("Hood or hat", "outfit", "hood", skin.outfit.hood)}
          {colorInput("Coat", "outfit", "coat", skin.outfit.coat)}
          {colorInput("Trim (belt, hat band, jeans)", "outfit", "accent", skin.outfit.accent, true)}
          {colorInput("Face or skin", "face", "color", skin.face.color, true)}
          {colorInput("Hair (redhead)", "face", "hair", skin.face.hair, true)}
          {colorInput("Light behind the door", "door", "glow", skin.door.glow)}
        </div>
      </section>

      <section className="pick" aria-label="skin.json">
        <h3>The skin.json for this look</h3>
        <pre className="json">{skinToJson(skin)}</pre>
      </section>
    </main>
  );
}

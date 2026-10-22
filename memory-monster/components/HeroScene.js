"use client";

import { useEffect, useState } from "react";
import Stage from "./Stage";
import { ENTRANCES } from "../lib/skinOptions.js";

// A looping demo of the real scene: the door opens, he steps out, he leaves, and the next look
// takes its turn. The memory number here is not real; the app has the real one.
export default function HeroScene({ looks }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState("nagging");

  useEffect(() => {
    // Someone who asked their computer for less motion gets one still look.
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;
    let alive = true;
    const timers = [];
    const at = (ms, fn) => timers.push(setTimeout(() => alive && fn(), ms));
    const cycle = () => {
      setPhase("calm");
      at(1200, () => setPhase("opening"));
      at(5200, () => setPhase("nagging"));
      at(9000, () => setPhase("leaving"));
      at(12200, () => { setI((n) => (n + 1) % looks.length); cycle(); });
    };
    cycle();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [looks.length]);

  const cur = looks[i];
  const entrance = ENTRANCES.find((e) => e.id === cur.skin.entrance.style);
  return (
    <figure className="hero-scene">
      <Stage phase={phase} skin={cur.skin} contained />
      <figcaption>
        <b>{cur.skin.name}</b> · {entrance ? entrance.label.toLowerCase() : ""}
        <span className="tiny"> A demo of the sequence. The app uses your real memory.</span>
      </figcaption>
    </figure>
  );
}

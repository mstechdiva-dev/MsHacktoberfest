"use client";

import { Door, Figure, skinVars } from "./Figure";

// The scene: dimmed room, door, and the figure. All of the look comes from the skin via CSS
// variables and data attributes, so a skin never needs code changes.
// contained: the Look Studio uses it to fit the scene in a box instead of the whole page.
// overlay: the desktop app draws the scene over the screen, with a see-through background.
export default function Stage({ phase, skin, contained, overlay, children }) {
  const active = phase === "opening" || phase === "nagging";
  return (
    <div className={`stage${active ? " active" : ""}${contained ? " contained" : ""}${overlay ? " overlay" : ""}`} style={skinVars(skin)} data-phase={phase}>
      {contained || overlay ? null : <div className="calm-note">All quiet. He only comes when memory runs high.</div>}
      <div className="dim" />
      <div className="fog" />
      <Door skin={skin} />
      <Figure skin={skin} />
      {children}
    </div>
  );
}

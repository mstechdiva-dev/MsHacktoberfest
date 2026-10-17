// The door and the figure, drawn from a skin. Used by the main scene and by every thumbnail,
// so a thumbnail always shows exactly what the real scene will show.

// Colors that a skin may leave out are only set when present; the stylesheet has its own
// fallback for each face and outfit.
export function skinVars(skin) {
  const vars = {
    "--eye": skin.eyes.color,
    "--eye-scale": skin.eyes.size,
    "--eye-glow": skin.eyes.glow,
    "--eye-pulse": `${skin.eyes.pulseSeconds}s`,
    "--hood": skin.outfit.hood,
    "--coat": skin.outfit.coat,
    "--door-glow": skin.door.glow,
    "--dark": skin.mood.darkness,
    "--tint": skin.mood.tint,
  };
  if (skin.face.color) vars["--face"] = skin.face.color;
  if (skin.face.hair) vars["--hair"] = skin.face.hair;
  if (skin.outfit.accent) vars["--accent"] = skin.outfit.accent;
  return vars;
}

export function Door({ skin }) {
  return (
    <div className="door-wrap" data-door={skin.door.style} data-opens={skin.door.opens}>
      <div className="frame">
        <div className="void" />
        <div className="leaf" />
      </div>
    </div>
  );
}

export function Figure({ skin }) {
  const outfit = skin.outfit.style;
  const hat = outfit === "trench" || outfit === "tophat";
  return (
    <div className="figure" data-entrance={skin.entrance.style} data-outfit={outfit} data-face={skin.face.style}>
      <div className="fbody">
        {outfit === "hoodie" ? <div className="legs" /> : null}
        <div className="coat" />
        <div className="sleeve l" />
        <div className="sleeve r" />
        <div className="hood">
          {skin.face.style === "redhead" ? <div className="hair" /> : null}
          <div className="face" data-face={skin.face.style} />
          {hat ? (
            <div className="hat">
              <i className="crown" />
              <i className="brim" />
            </div>
          ) : null}
        </div>
        <div className={`reye l${skin.eyes.flicker ? " flick" : ""}`} />
        <div className={`reye r${skin.eyes.flicker ? " flick" : ""}`} />
      </div>
    </div>
  );
}

// A small, still picture of one look. kind "head" crops to the face; "body" shows all of him;
// "door" shows the door part way open.
export function Thumb({ skin, kind }) {
  return (
    <div className={`thumb ${kind}`} style={skinVars(skin)}>
      <div className="thumb-inner">
        {kind === "door" ? <Door skin={skin} /> : <Figure skin={skin} />}
      </div>
    </div>
  );
}

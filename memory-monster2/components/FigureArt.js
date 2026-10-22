import { useId } from "react";

// The figure's body, hood and hats, drawn as shapes in a 110 by 225 box. The face and the eyes
// are separate (see Figure.js) so every face fits every outfit. Colors come from the skin through
// CSS variables, so a skin never touches this file.

const fill = (v, fallback) => ({ fill: fallback ? `var(${v}, ${fallback})` : `var(${v})` });
const DARK = "#07070a";

// Long ragged hem, used by the robe and the cloak.
const RAGGED = "L9 222 L16 213 L23 224 L31 215 L38 225 L46 214 L53 224 L61 215 L69 225 L77 214 L85 224 L92 213 L99 222";

function Hand() {
  return <path d="M7 187 C5 195 4 203 6 211 L8 207 L9 214 L11 207 L13 212 L14 200 C15 195 17 191 18 187 Z" style={{ fill: DARK }} />;
}

// One sleeve hanging from the shoulder, ending in a thin hand. The right one is this, mirrored.
function Sleeve({ shade }) {
  const d = "M27 94 C17 104 9 130 9 166 C9 174 7 181 7 187 L18 187 C19 170 21 142 33 106 Z";
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M27 94 C17 104 9 130 9 166 L11.5 166 C11.5 132 19 106 28 97 Z" fill="#fff" opacity=".1" />
      <Hand />
    </g>
  );
}
const Mirror = ({ children }) => <g transform="translate(110 0) scale(-1 1)">{children}</g>;

function Robe({ shade }) {
  const d = `M26 92 C24 130 14 175 4 214 ${RAGGED} L106 214 C96 175 88 130 84 92 Z`;
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M40 110 C38 150 32 190 28 218 L34 216 C40 190 44 150 46 112 Z" fill="#000" opacity=".3" />
      <path d="M66 108 C70 150 76 190 80 218 L74 217 C68 190 62 150 60 110 Z" fill="#000" opacity=".32" />
      <path d="M52 100 L58 100 L60 220 L50 220 Z" fill="#000" opacity=".22" />
      <path d="M26 92 C24 130 14 175 4 214 L7 214 C16 175 27 130 28.5 94 Z" fill="#fff" opacity=".12" />
      <path className="fringe" d={`M4 212 ${RAGGED} L106 212 L106 218 L4 218 Z`} style={fill("--coat")} opacity=".9" />
    </g>
  );
}

function Cloak({ shade }) {
  const d = "M26 92 C18 130 6 178 0 214 L6 222 L14 213 L22 224 L30 215 L38 225 L46 214 L53 224 L61 215 L69 225 L77 214 L85 224 L93 213 L101 222 L110 214 C104 178 92 130 84 92 Z";
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M0 214 C20 205 40 203 55 203 C70 203 90 205 110 214 L110 220 C90 211 70 209 55 209 C40 209 20 211 0 220 Z" style={fill("--accent", "#7f1d1d")} opacity=".9" />
      <path d="M38 104 C34 150 22 190 10 214 L18 212 C30 186 42 150 46 106 Z" fill="#000" opacity=".25" />
      <path d="M72 104 C76 150 88 190 100 214 L92 212 C80 186 68 150 64 106 Z" fill="#000" opacity=".25" />
      <circle cx="55" cy="101" r="4.6" style={fill("--accent", "#7f1d1d")} />
      <circle cx="53.6" cy="99.6" r="1.4" fill="#fff" opacity=".5" />
    </g>
  );
}

function Trench({ shade }) {
  const d = "M24 92 C18 122 12 172 7 218 L103 218 C98 172 92 122 86 92 Z";
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M44 90 L55 132 L34 100 Z" fill="#000" opacity=".3" />
      <path d="M66 90 L55 132 L76 100 Z" fill="#000" opacity=".3" />
      <path d="M38 92 L28 74 L47 88 Z" style={fill("--coat")} />
      <path d="M72 92 L82 74 L63 88 Z" style={fill("--coat")} />
      <path d="M38 92 L28 74 L30 74 L41 90 Z M72 92 L82 74 L80 74 L69 90 Z" fill="#fff" opacity=".12" />
      <path d="M55 132 L55 218" stroke="#000" strokeOpacity=".35" strokeWidth="1.5" />
      <circle cx="51" cy="152" r="1.8" fill="#000" opacity=".5" />
      <circle cx="51" cy="176" r="1.8" fill="#000" opacity=".5" />
      <path d="M15 150 L95 150 L96 160 L14 160 Z" style={fill("--accent", "#3b2a1a")} />
      <rect x="51" y="148.5" width="8" height="13" rx="1.5" fill="#000" opacity=".4" />
      <path d="M8 214 C30 210 80 210 102 214 L103 218 L7 218 Z" fill="#000" opacity=".3" />
    </g>
  );
}

function Tails({ shade }) {
  const d = "M28 92 C22 130 14 180 10 222 L40 222 L55 160 L70 222 L100 222 C96 180 88 130 82 92 Z";
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M44 94 L55 136 L66 94 Z" fill="#d6d6de" opacity=".92" />
      <path d="M44 94 L55 136 L66 94 L62 92 L55 112 L48 92 Z" fill="#000" opacity=".15" />
      <path d="M50 96 L55 98 L60 96 L61 103 L55 100 L49 103 Z" style={fill("--accent", "#7f1d1d")} />
      <circle cx="55" cy="98.5" r="2" style={fill("--accent", "#7f1d1d")} />
      <path d="M28 92 C22 130 14 180 10 222 L13 222 C17 180 25 132 30 94 Z" fill="#fff" opacity=".1" />
    </g>
  );
}

function Hoodie({ shade }) {
  const d = "M26 92 C21 110 19 130 19 152 L91 152 C91 130 89 110 84 92 Z";
  return (
    <g>
      <path d="M24 150 L54 150 L52 220 L26 220 Z M56 150 L86 150 L84 220 L58 220 Z" style={fill("--accent", "#1e3a8a")} />
      <path d="M24 150 L54 150 L52 220 L26 220 Z M56 150 L86 150 L84 220 L58 220 Z" fill={`url(#${shade})`} />
      <path d="M26 220 L52 220 L53 225 L24 225 Z M58 220 L84 220 L86 225 L57 225 Z" fill={DARK} />
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M33 128 L77 128 L83 150 L27 150 Z" fill="#000" opacity=".28" />
      <path d="M47 100 L47 124 M63 100 L63 124" stroke="#d4d4d8" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19 150 L91 150 L91 156 L19 156 Z" fill="#000" opacity=".3" />
    </g>
  );
}

function HoodieSleeve({ shade }) {
  const d = "M27 94 C17 104 11 124 11 148 L11 158 L22 158 C22 140 24 124 33 106 Z";
  return (
    <g>
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M11 154 L22 154 L22 160 L11 160 Z" fill="#000" opacity=".35" />
      <path d="M11 160 C10 168 10 176 12 184 L14 180 L16 187 L18 180 L21 184 L22 170 L22 160 Z" fill={DARK} />
    </g>
  );
}

// The Shadow Form coat: broad rounded shoulders, pinstripes, a big collar, a red tie, a belt with
// a red buckle, buttons, hands at the sides and boots. Almost everything is black on purpose.
function ShadowCoat({ shade, uid }) {
  const d = "M12 122 C12 100 26 90 40 90 L70 90 C84 90 98 100 98 122 L103 216 L7 216 Z";
  const sheen = `sheen${uid}`;
  const stripe = `stripe${uid}`;
  return (
    <g>
      <defs>
        <linearGradient id={sheen} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5a2410" stopOpacity=".35" />
          <stop offset="1" stopColor="#000" stopOpacity=".75" />
        </linearGradient>
        <pattern id={stripe} width="3.4" height="8" patternUnits="userSpaceOnUse">
          <rect width=".6" height="8" fill="#000" opacity=".45" />
        </pattern>
      </defs>
      <rect x="30" y="212" width="19" height="13" rx="5" fill="#000" />
      <rect x="61" y="212" width="19" height="13" rx="5" fill="#000" />
      <path d={d} style={fill("--coat")} />
      <path d={d} fill={`url(#${sheen})`} />
      <path d={d} fill={`url(#${stripe})`} />
      <path d={d} fill={`url(#${shade})`} />
      <path d="M12 122 C12 100 26 90 40 90" stroke="#ff6a3c" strokeOpacity=".16" strokeWidth="1.4" fill="none" />
      <path d="M33 90 L52 93 L50 112 L28 104 Z M77 90 L58 93 L60 112 L82 104 Z" fill="#000" />
      <path d="M44 93 L55 142 L49 150 L38 112 Z M66 93 L55 142 L61 150 L72 112 Z" fill="#000" opacity=".9" />
      <path d="M52 96 L58 96 L60 134 L55 143 L50 134 Z" style={fill("--accent", "#6a1818")} />
      <path d="M55 100 L55 216" stroke="#000" strokeOpacity=".8" strokeWidth="1.3" />
      <circle cx="63" cy="152" r="1.7" fill="#2a0c0c" />
      <circle cx="63" cy="166" r="1.7" fill="#2a0c0c" />
      <circle cx="63" cy="188" r="1.7" fill="#2a0c0c" />
      <circle cx="63" cy="202" r="1.7" fill="#2a0c0c" />
      <path d="M8 172 L102 172 L103 180 L7 180 Z" fill="#050202" />
      <rect x="51" y="171" width="8" height="10" rx="1.5" style={fill("--accent", "#8a1818")} />
      <rect x="54" y="173" width="2.4" height="6" fill="#000" />
      <path d="M16 196 L22 216 L12 216 Z M55 200 L60 216 L50 216 Z M94 196 L98 216 L88 216 Z" fill="#000" opacity=".55" />
      <rect x="1" y="178" width="10" height="17" rx="5" fill="#0b0604" />
      <rect x="99" y="178" width="10" height="17" rx="5" fill="#0b0604" />
    </g>
  );
}

// The hood and the cape over the shoulders, with a deep opening where the face sits.
function HoodBack({ open }) {
  const d = "M55 2 C70 3 86 16 90 40 C92 56 91 70 96 84 C99 92 104 98 106 104 C90 100 78 102 55 104 C32 102 20 100 4 104 C6 98 11 92 14 84 C19 70 18 56 20 40 C24 16 40 3 55 2 Z";
  return (
    <g>
      <path d={d} style={fill("--hood")} />
      <path d="M30 60 C28 80 30 92 24 100 M80 60 C82 80 80 92 86 100 M42 20 C36 40 34 56 36 70 M68 20 C74 40 76 56 74 70" stroke="#000" strokeOpacity=".3" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      <path d="M55 3 C40 4 26 16 22 40" stroke="#fff" strokeOpacity=".16" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <ellipse cx="55" cy="55" rx="34" ry="39" fill={`url(#${open})`} />
    </g>
  );
}

// In front of the face: the lip of the hood.
function HoodLip() {
  return (
    <g>
      <ellipse cx="55" cy="55" rx="31.5" ry="36.5" fill="none" style={{ stroke: "var(--hood)" }} strokeWidth="7" />
      <ellipse cx="55" cy="55" rx="28" ry="33" fill="none" stroke="#000" strokeOpacity=".4" strokeWidth="2.2" />
    </g>
  );
}

function Fedora() {
  return (
    <g>
      <ellipse cx="55" cy="31" rx="27" ry="5.5" fill="#000" opacity=".5" />
      <path d="M32 27 C31 12 37 4 55 4 C73 4 79 12 78 27 Z" style={fill("--hood")} />
      <path d="M44 7 C50 11 60 11 66 7 L66 9 C60 14 50 14 44 9 Z" fill="#000" opacity=".3" />
      <path d="M32 21 L78 21 L78 27 L32 27 Z" style={fill("--accent", "#2a1a0f")} />
      <ellipse cx="55" cy="27" rx="44" ry="7" style={fill("--hood")} />
      <path d="M11 27 C20 33 40 35 55 35 C70 35 90 33 99 27 C90 30 70 31 55 31 C40 31 20 30 11 27 Z" fill="#000" opacity=".35" />
      <path d="M32 27 C31 12 37 4 55 4" stroke="#fff" strokeOpacity=".16" strokeWidth="1.4" fill="none" />
    </g>
  );
}

function TopHat() {
  return (
    <g>
      <ellipse cx="55" cy="33" rx="26" ry="5" fill="#000" opacity=".5" />
      <path d="M36 28 L37 4 C45 2 65 2 73 4 L74 28 Z" style={fill("--hood")} />
      <path d="M37 21 L73 21 L74 28 L36 28 Z" style={fill("--accent", "#7f1d1d")} />
      <ellipse cx="55" cy="4" rx="18" ry="2.6" fill="#fff" opacity=".1" />
      <ellipse cx="55" cy="28" rx="31" ry="5.2" style={fill("--hood")} />
      <path d="M38 6 L38 26" stroke="#fff" strokeOpacity=".14" strokeWidth="1.6" />
    </g>
  );
}

// Everything behind the face.
export function BackArt({ outfit }) {
  const uid = useId().replace(/:/g, "");
  const shade = `shade${uid}`;
  const open = `open${uid}`;
  const hooded = outfit === "hood" || outfit === "cloak" || outfit === "hoodie";
  const Body = { cloak: Cloak, trench: Trench, tophat: Tails, hoodie: Hoodie, shadow: ShadowCoat }[outfit] || Robe;
  return (
    <svg className="art back" viewBox="0 0 110 225" aria-hidden="true">
      <defs>
        <linearGradient id={shade} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".55" />
        </linearGradient>
        <radialGradient id={open} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#000" stopOpacity="1" />
          <stop offset=".78" stopColor="#000" stopOpacity="1" />
          <stop offset="1" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <Body shade={shade} uid={uid} />
      {outfit === "cloak" || outfit === "shadow" ? null : outfit === "hoodie" ? (
        <>
          <HoodieSleeve shade={shade} />
          <Mirror><HoodieSleeve shade={shade} /></Mirror>
        </>
      ) : (
        <>
          <Sleeve shade={shade} />
          <Mirror><Sleeve shade={shade} /></Mirror>
        </>
      )}
      {!hooded ? <path d="M46 82 L64 82 L67 98 L43 98 Z" fill="#000" opacity=".85" /> : null}
      {hooded ? <HoodBack open={open} /> : null}
    </svg>
  );
}

// Everything in front of the face: the lip of the hood, or the hat.
export function FrontArt({ outfit }) {
  return (
    <svg className="art front" viewBox="0 0 110 225" aria-hidden="true">
      {outfit === "trench" || outfit === "shadow" ? <Fedora /> : outfit === "tophat" ? <TopHat /> : <HoodLip />}
    </svg>
  );
}

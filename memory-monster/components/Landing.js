import HeroScene from "./HeroScene";
import { Thumb } from "./Figure";
import { applyLook } from "../lib/looks.js";
import { FACES, OUTFITS, DOORS, OPENS, ENTRANCES, EYE_COLORS } from "../lib/skinOptions.js";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"];
const label = (list, id) => (list.find((o) => o.id === id) || { label: id }).label;

// One row of small pictures, each drawn by the same code as the real scene.
function Row({ title, options, section, field, base, kind }) {
  return (
    <div className="lrow">
      <h3>{title}</h3>
      <div className="lthumbs">
        {options.map((o) => (
          <div className="lthumb" key={o.id}>
            <Thumb skin={applyLook(base, { [section]: { [field]: o.id } }).skin} kind={kind} />
            <span>{o.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Landing({ defaults, looks, hasVideo }) {
  const base = (looks.find((l) => l.id === defaults.skin) || looks[0]).skin;
  const examples = looks.filter((l) => l.id !== defaults.skin && l.source === "built-in");
  const builtIn = looks.filter((l) => l.source === "built-in");
  const heroLooks = [...builtIn.filter((l) => l.id === defaults.skin), ...builtIn.filter((l) => l.id !== defaults.skin)];

  return (
    <main className="landing">
      <header className="lnav">
        <span className="brand">Memory Monster</span>
        <nav aria-label="Pages">
          <a href="/looks">Look Studio</a>
          <a className="cta small" href="/app">Open the app</a>
        </nav>
      </header>

      <section className="hero">
        <div className="hero-text">
          <h1>When your memory fills up, he makes sure you notice.</h1>
          <p>A door opens. A dark figure steps out. A card tells you what to close. When memory drops, he goes home.</p>
          <div className="hero-btns">
            <a className="cta" href="/app">Open Memory Monster</a>
            <a className="linkbtn" href="/looks">Try the Look Studio</a>
          </div>
        </div>
        <HeroScene looks={heroLooks} />
      </section>

      <section className="lsec" aria-labelledby="what">
        <h2 id="what">What it does</h2>
        <div className="steps">
          <div className="step"><span className="num">1</span><h3>Under {defaults.enterPercent}%, nothing happens.</h3><p>He stays out of your way.</p></div>
          <div className="step"><span className="num">2</span><h3>At {defaults.enterPercent}% or more, the door opens.</h3><p>The room darkens and he steps out. A card lists the programs using the most memory, and repeats every {defaults.reminderMinutes} minutes while memory stays high.</p></div>
          <div className="step"><span className="num">3</span><h3>Under {defaults.leavePercent}%, he goes home.</h3><p>The gap between {defaults.enterPercent} and {defaults.leavePercent} is on purpose, so he does not flicker in and out.</p></div>
        </div>
      </section>

      <section className="lsec" aria-labelledby="real">
        <h2 id="real">Real numbers, not guesses</h2>
        <p className="lead">A web page cannot see your whole computer. So a small helper program on your computer shares the real memory use and the biggest programs with the page.</p>
        <ul className="plain">
          <li>The helper only listens on your own computer, and needs a code that only your browser knows.</li>
          <li>Asking a program to close always takes two clicks, and it asks politely, so a program with unsaved work can still ask you to save.</li>
          <li>No helper? Use the demo slider, or this browser tab&apos;s own memory (Chrome and Edge).</li>
        </ul>
      </section>

      <section className="lsec" aria-labelledby="desktop">
        <h2 id="desktop">On your desktop</h2>
        <p className="lead">A web page lives inside its browser window. The Windows desktop app goes further: the screen darkens, the door opens in the corner, and he steps out over whatever you were doing. The mouse goes straight through to your work, and only the card takes clicks. It reads your memory itself, so it needs no helper and no account.</p>
        <p className="lead">It is in the <code>desktop/</code> folder, and its README explains how to run it and build the installer.</p>
      </section>

      <section className="lsec" aria-labelledby="yours">
        <h2 id="yours">Make him yours</h2>
        <p className="lead">Every choice is a picture of the real figure, so you see it before you pick it.</p>
        <Row title="Face" options={FACES} section="face" field="style" base={base} kind="head" />
        <Row title="Outfit" options={OUTFITS} section="outfit" field="style" base={base} kind="body" />
        <Row title="Door" options={DOORS} section="door" field="style" base={base} kind="door" />
        <div className="lrow">
          <h3>How the door opens, how he arrives, eye color</h3>
          <div className="chips">
            {OPENS.map((o) => <span className="pill" key={o.id}>{o.label}</span>)}
            {ENTRANCES.map((o) => <span className="pill" key={o.id}>{o.label}</span>)}
            {EYE_COLORS.map((c) => <span className="dot" key={c.id} title={c.label} style={{ background: c.id }} />)}
          </div>
        </div>
        <a className="cta" href="/looks">Open the Look Studio</a>
      </section>

      <section className="lsec" aria-labelledby="examples">
        <h2 id="examples">Finished looks</h2>
        <p className="lead">{WORDS[examples.length] || examples.length} more ship with it. Each one is a single small file.</p>
        <div className="cards">
          {examples.map((l) => (
            <article className="lcard" key={l.id}>
              <div className="lcard-art"><Thumb skin={l.skin} kind="body" /><Thumb skin={l.skin} kind="door" /></div>
              <h3>{l.skin.name}</h3>
              <p>{label(FACES, l.skin.face.style)}, {label(OUTFITS, l.skin.outfit.style).toLowerCase()}, {label(DOORS, l.skin.door.style).toLowerCase()}. {label(ENTRANCES, l.skin.entrance.style)}.</p>
              <p className="quote">&ldquo;{l.skin.words.arrive}&rdquo;</p>
            </article>
          ))}
        </div>
      </section>

      {hasVideo ? (
        <section className="lsec" aria-labelledby="video">
          <h2 id="video">See it in under two minutes</h2>
          <video className="lvideo" src="/memory-monster-short.mp4" controls preload="metadata" playsInline>
            Your browser can&apos;t play this video. It shows a real system monitor next to Memory Monster as memory fills up, then four custom entrances.
          </video>
        </section>
      ) : null}

      <section className="lsec" aria-labelledby="own">
        <h2 id="own">Two ways to make your own</h2>
        <div className="two">
          <div>
            <h3>Pick from pictures</h3>
            <p>Open the Look Studio, choose a face, an outfit, a door and an entrance, then press Copy as skin.json.</p>
          </div>
          <div>
            <h3>Edit one small file</h3>
            <pre className="json">{`cp -r skins/_template skins/my-figure
# change skins/my-figure/skin.json
npm run check-skins`}</pre>
            <p>The check names the exact field if something is wrong. Share yours in <code>community-skins/</code> with a pull request.</p>
          </div>
        </div>
      </section>

      <section className="lsec" aria-labelledby="deploy">
        <h2 id="deploy">Put it on Vercel</h2>
        <ol className="plain">
          <li>Put the project in a GitHub repo.</li>
          <li>In Vercel, add a new project, pick the repo, and deploy. The defaults work.</li>
          <li>Open the address Vercel gives you. There is nothing else to set.</li>
        </ol>
      </section>

      <footer className="lfoot">
        <p>Memory Monster. Idea and design by Cheryl. IP owned 100% by XYZ Agents LLC. Open source under the MIT license.</p>
        <p><a href="/app">Open the app</a> · <a href="/looks">Look Studio</a></p>
      </footer>
    </main>
  );
}

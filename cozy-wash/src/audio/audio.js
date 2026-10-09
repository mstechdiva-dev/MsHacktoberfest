// Sound player (PLAN section 18). Plays a file when the manifest names one,
// otherwise the synthesized stand-in. Sound starts off until the player turns it on.
import { playSynth } from './synth.js';

/** The sounds each screen can play. Files for the current screen and the next one are loaded, nothing else. */
export const SCREEN_SOUNDS = {
  cover: ['ui-click'],
  sort: ['ui-click', 'tile-flip', 'bin-drop', 'saved-it', 'pocket-rustle', 'sock-match', 'unlock', 'cat-meow'],
  load: ['ui-click', 'sign-flip', 'door-open', 'door-close', 'drum-drop', 'bin-drop', 'saved-it', 'cat-meow', 'pour-liquid', 'pour-powder', 'dial-click', 'coin-grab', 'coin-drop', 'coin-clink-1', 'coin-clink-2', 'coin-clink-3', 'coin-start', 'phone-pickup', 'tap-hover', 'tap-beep', 'tap-decline'],
  wash: ['wash-fill', 'wash-tumble', 'wash-drain', 'wash-spin', 'wash-end', 'bubble-pop', 'ui-click', 'trap-clank', 'sneaker-thump', 'suds-overflow', 'tissue-poof', 'cat-meow'],
  result: ['result-good', 'result-bad', 'ui-click'],
  dry: ['door-open', 'door-close', 'drum-drop', 'rack-hang', 'sheet-pull', 'dryer-start', 'dryer-tumble', 'dryer-end', 'static-zap', 'ui-click'],
  fold: ['fold-flap-1', 'fold-flap-2', 'sock-roll', 'fur-smooth', 'basket-drop', 'sneaker-thump', 'result-good', 'ui-click'],
  receipt: ['receipt-print', 'unlock', 'ui-click'],
  goodbye: ['unlock', 'ui-click'],
  closed: ['wash-fill', 'wash-tumble', 'wash-drain', 'wash-spin', 'wash-end', 'bubble-pop', 'sign-flip', 'unlock', 'ui-click'],
};
const NEXT_SCREEN = { cover: 'sort', sort: 'load', load: 'wash', wash: 'result', result: 'dry', dry: 'fold', fold: 'receipt' };

/**
 * Cut the silence off the front and back of a one-shot, so a recording can be any length and still
 * plays as just the sound. Loops are left alone: their ends have to meet. Returns the buffer unchanged
 * if there is no silence to cut or the decoder gave us something we can't read.
 */
export function trimSilence(ctx, buf, { threshold = 0.01, pad = 0.03 } = {}) {
  if (!buf || typeof buf.getChannelData !== 'function' || typeof ctx.createBuffer !== 'function') return buf;
  const n = buf.length;
  const chans = Array.from({ length: buf.numberOfChannels || 1 }, (_, c) => buf.getChannelData(c));
  const loud = (i) => chans.some((d) => Math.abs(d[i]) > threshold);
  let first = 0;
  while (first < n && !loud(first)) first++;
  if (first === n) return buf; // all quiet: leave it, a silent file is the maker's problem
  let last = n - 1;
  while (last > first && !loud(last)) last--;
  const padN = Math.round(pad * buf.sampleRate);
  const from = Math.max(0, first - Math.min(padN, 220));
  const to = Math.min(n, last + 1 + padN);
  if (from === 0 && to === n) return buf;
  const out = ctx.createBuffer(chans.length, to - from, buf.sampleRate);
  chans.forEach((d, c) => out.getChannelData(c).set(d.subarray(from, to)));
  return out;
}

export function createAudio({ manifest, settings, caption }) {
  let ctx = null;
  let out = null;
  const buffers = {};
  const files = {}; // one decode per file, because several sounds can share a recording
  const loops = {};
  const active = {}; // which loop is current for each sound, so a late-loading file only replaces its own stand-in
  const base = `sounds/${manifest.pack || 'default'}/`;

  function ensure() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.gain.value = settings.volume ?? 0.8;
    out.connect(ctx.destination);
    return ctx;
  }

  async function load(id) {
    const entry = manifest.sounds[id];
    if (!entry || !entry.file || buffers[id] !== undefined) return buffers[id];
    buffers[id] = null;
    if (!files[entry.file]) {
      files[entry.file] = (async () => {
        try {
          const res = await fetch(base + entry.file);
          if (!res.ok) return null;
          return await ensure().decodeAudioData(await res.arrayBuffer());
        } catch { return null; }
      })();
    }
    const decoded = await files[entry.file];
    const isLoop = 'loopStart' in entry || 'loopEnd' in entry;
    buffers[id] = isLoop || !decoded ? decoded : trimSilence(ctx, decoded);
    return buffers[id];
  }

  /** @param {{volume?:number}} [opts] volume 0 to 1 scales this one sound (for soft plays) */
  function play(id, opts = {}) {
    const entry = manifest.sounds[id];
    if (settings.captions && entry && caption) caption(entry.caption);
    if (!settings.sound) return;
    const c = ensure();
    if (!c) return;
    if (c.state === 'suspended') c.resume();
    let dest = out;
    if (opts.volume != null) { dest = c.createGain(); dest.gain.value = opts.volume; dest.connect(out); }
    const buf = buffers[id];
    if (buf) {
      const src = c.createBufferSource();
      src.buffer = buf;
      const g = c.createGain();
      g.gain.value = (entry && entry.volume) ?? 0.8;
      src.connect(g).connect(dest);
      src.start();
      // The game decides how long a sound plays: past maxSeconds it fades out and stops, whatever the file's length.
      const cap = entry && entry.maxSeconds;
      if (cap > 0 && buf.duration > cap) {
        const t = c.currentTime;
        const fade = Math.min(0.08, cap / 4);
        g.gain.setValueAtTime(g.gain.value, t + cap - fade);
        g.gain.linearRampToValueAtTime(0, t + cap);
        src.stop(t + cap);
      }
      return;
    }
    if (entry && entry.file && buffers[id] === undefined) load(id);
    if (!entry || entry.core !== false) playSynth(c, dest, id);
  }

  /** A looping recording, played through Web Audio so it repeats without a gap. */
  function startFileLoop(c, id, entry, buf) {
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // loopEnd left out (or null) means "to the end of the file", so a recording can't be cut short by a stale number.
    const start = typeof entry.loopStart === 'number' && entry.loopStart >= 0 && entry.loopStart < buf.duration ? entry.loopStart : 0;
    const end = typeof entry.loopEnd === 'number' && entry.loopEnd > start && entry.loopEnd <= buf.duration ? entry.loopEnd : buf.duration;
    src.loopStart = start;
    src.loopEnd = end;
    const g = c.createGain();
    g.gain.value = typeof entry.volume === 'number' ? entry.volume : 0.8;
    src.connect(g).connect(out);
    src.start();
    return () => { try { src.stop(); } catch { /* already stopped */ } };
  }

  /** Start a looping sound. Returns a stop function. */
  function loop(id, everyMs = 1900) {
    stopLoop(id);
    const entry = manifest.sounds[id];
    if (!settings.sound) return () => {};
    const c = ensure();
    if (!c) return () => {};
    const token = {};
    active[id] = token;
    if (buffers[id]) {
      loops[id] = startFileLoop(c, id, entry, buffers[id]);
    } else {
      playSynth(c, out, id);
      const t = setInterval(() => settings.sound && playSynth(c, out, id), everyMs);
      loops[id] = () => clearInterval(t);
      // The file isn't ready yet: play the stand-in, and switch over the moment it is.
      if (entry && entry.file) {
        load(id).then((buf) => {
          if (!buf || active[id] !== token || !settings.sound) return;
          loops[id]();
          loops[id] = startFileLoop(c, id, entry, buf);
        });
      }
    }
    return () => stopLoop(id);
  }

  function stopLoop(id) {
    delete active[id];
    if (loops[id]) { loops[id](); delete loops[id]; }
  }

  function stopAll() {
    Object.keys(loops).forEach(stopLoop);
  }

  function setVolume(v) {
    settings.volume = v;
    if (out) out.gain.value = v;
  }

  /** Load the files this screen and the next one can play. Called on every screen change. */
  let screen = null;
  function preload(name) {
    screen = name;
    if (!settings.sound) return;
    const ids = new Set([...(SCREEN_SOUNDS[name] || []), ...(SCREEN_SOUNDS[NEXT_SCREEN[name]] || [])]);
    ids.forEach((id) => manifest.sounds[id] && manifest.sounds[id].file && load(id));
  }

  function enable(on) {
    settings.sound = on;
    if (on) {
      const c = ensure();
      if (c && c.state === 'suspended') c.resume();
      preload(screen);
    } else stopAll();
  }

  return { play, loop, stopLoop, stopAll, setVolume, enable, preload };
}

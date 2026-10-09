import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createAudio, SCREEN_SOUNDS } from '../src/audio/audio.js';

const manifestFile = JSON.parse(readFileSync('sounds/default/manifest.json', 'utf8'));
const clone = (o) => JSON.parse(JSON.stringify(o));

/** A pretend browser audio system that records what the player asks of it. */
function fakeBrowser({ durations = {}, slow = false } = {}) {
  const log = { sources: [], fetches: [], decodes: 0 };
  const release = [];
  class Node { connect(n) { return n; } }
  const param = () => ({ value: 1, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  class Gain extends Node { constructor() { super(); this.gain = param(); } }
  class Source extends Node {
    constructor() { super(); this.loop = false; this.loopStart = 0; this.loopEnd = 0; this.started = false; this.stopped = false; log.sources.push(this); }
    connect(n) { this.gainNode = n; return n; }
    start() { this.started = true; }
    stop() { this.stopped = true; }
  }
  class Ctx {
    constructor() { this.state = 'running'; this.destination = new Node(); }
    createGain() { return new Gain(); }
    createBufferSource() { return new Source(); }
    createOscillator() { const o = new Node(); o.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, linearRampToValueAtTime() {} }; o.start = () => {}; o.stop = () => {}; o.type = ''; return o; }
    createBiquadFilter() { const f = new Node(); f.frequency = { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {} }; f.Q = { value: 0 }; return f; }
    createBuffer(ch, len, rate) { return { getChannelData: () => new Float32Array(len), duration: len / rate, length: len }; }
    get currentTime() { return 0; }
    resume() {}
    async decodeAudioData(bytes) { log.decodes++; return { duration: Number(new TextDecoder().decode(bytes)) || 9 }; }
  }
  globalThis.window = { AudioContext: Ctx };
  globalThis.fetch = async (url) => {
    log.fetches.push(url);
    const name = url.split('/').pop();
    const body = new TextEncoder().encode(String(durations[name] ?? 9));
    if (slow) await new Promise((r) => release.push(r));
    return { ok: true, arrayBuffer: async () => body.buffer };
  };
  return { log, release: () => release.splice(0).forEach((r) => r()) };
}

const make = (manifest, settings = { sound: true, volume: 0.8, captions: false }) => createAudio({ manifest, settings, caption: () => {} });
const withFiles = (files) => { const m = clone(manifestFile); for (const e of Object.values(m.sounds)) e.file = null; for (const [id, f] of Object.entries(files)) m.sounds[id].file = f; return m; };
const settle = () => new Promise((r) => setTimeout(r, 10));

test('a looping recording repeats to the end of the file, at its own volume', async () => {
  const b = fakeBrowser({ durations: { 'wash-tumble.mp3': 9.4 } });
  const a = make(withFiles({ 'wash-tumble': 'wash-tumble.mp3' }));
  a.preload('wash'); await settle();
  a.loop('wash-tumble');
  const src = b.log.sources.at(-1);
  assert.equal(src.loop, true, 'it loops');
  assert.equal(src.loopStart, 0.05, 'it skips the mp3 gap at the start');
  assert.equal(src.loopEnd, 9.4, 'and loops to the real end of the file, not a stale 6 seconds');
  assert.ok(src.started);
  assert.equal(src.gainNode.gain.value, 0.7, 'the manifest volume (0.7 for the tumbles) is used');
});

test('loop points that do not fit the file fall back to something safe', async () => {
  const b = fakeBrowser({ durations: { 'x.mp3': 4 } });
  const m = withFiles({ 'dryer-tumble': 'x.mp3' });
  m.sounds['dryer-tumble'].loopStart = 7; // past the end of a 4 second file
  m.sounds['dryer-tumble'].loopEnd = 6;
  const a = make(m); a.preload('dry'); await settle(); a.loop('dryer-tumble');
  const src = b.log.sources.at(-1);
  assert.equal(src.loopStart, 0);
  assert.equal(src.loopEnd, 4);
  m.sounds['dryer-tumble'].loopStart = 1; m.sounds['dryer-tumble'].loopEnd = 3; // a part of the recording, on purpose
  const a2 = make(m); a2.preload('dry'); await settle(); a2.loop('dryer-tumble');
  assert.equal(b.log.sources.at(-1).loopStart, 1);
  assert.equal(b.log.sources.at(-1).loopEnd, 3);
});

test('a loop that starts before its file is ready switches over when it arrives', async () => {
  const b = fakeBrowser({ slow: true, durations: { 'wash-tumble.mp3': 8 } });
  const a = make(withFiles({ 'wash-tumble': 'wash-tumble.mp3' }));
  const stop = a.loop('wash-tumble'); // no preload: the stand-in plays first
  assert.equal(b.log.sources.filter((s) => s.loop).length, 0, 'no recording yet');
  b.release(); await settle();
  const looped = b.log.sources.filter((s) => s.loop);
  assert.equal(looped.length, 1, 'the recording takes over');
  assert.equal(looped[0].loopEnd, 8);
  stop();
  assert.ok(looped[0].stopped, 'and stopping stops the recording');
});

test('stopping a loop before its file arrives means the file never starts', async () => {
  const b = fakeBrowser({ slow: true });
  const a = make(withFiles({ 'wash-tumble': 'wash-tumble.mp3' }));
  a.loop('wash-tumble');
  a.stopLoop('wash-tumble');
  b.release(); await settle();
  assert.equal(b.log.sources.filter((s) => s.loop).length, 0);
});

test('sounds that share a file fetch and decode it once', async () => {
  const b = fakeBrowser();
  const a = make(withFiles({ 'ui-click': 'click.mp3', 'dial-click': 'click.mp3', 'tile-flip': 'click.mp3' }));
  a.preload('sort'); a.preload('load'); await settle();
  assert.equal(b.log.fetches.filter((u) => u.endsWith('click.mp3')).length, 1, 'one fetch');
  assert.equal(b.log.decodes, 1, 'one decode');
  a.play('ui-click'); a.play('dial-click');
  assert.equal(b.log.sources.filter((s) => s.started).length, 2, 'both play from the same recording');
});

test('files load by screen: this one and the next, not everything at once', async () => {
  const files = Object.fromEntries(Object.keys(manifestFile.sounds).map((id) => [id, `${id}.mp3`]));
  const b = fakeBrowser();
  const a = make(withFiles(files));
  a.preload('cover'); await settle();
  const got = () => new Set(b.log.fetches.map((u) => u.split('/').pop().replace('.mp3', '')));
  assert.deepEqual([...got()].sort(), [...new Set([...SCREEN_SOUNDS.cover, ...SCREEN_SOUNDS.sort])].sort());
  assert.ok(!got().has('wash-tumble') && !got().has('receipt-print'), 'later screens wait');
  a.preload('wash'); await settle();
  assert.ok(got().has('wash-tumble') && got().has('result-good') && got().has('dry-end') === false);
  assert.ok(got().size < Object.keys(files).length, 'never the whole pack at once');
});

test('nothing loads while sound is off, and turning it on loads the current screen', async () => {
  const b = fakeBrowser();
  const settings = { sound: false, volume: 0.8, captions: false };
  const a = make(withFiles({ 'ui-click': 'click.mp3' }), settings);
  a.preload('cover'); await settle();
  assert.equal(b.log.fetches.length, 0);
  a.enable(true); await settle();
  assert.equal(b.log.fetches.length, 1, 'now it loads what the cover needs');
});

test('every sound named in a screen list is a real sound', () => {
  for (const [screen, ids] of Object.entries(SCREEN_SOUNDS)) for (const id of ids) assert.ok(manifestFile.sounds[id], `${screen}: ${id}`);
});

test('the manifest\'s loops repeat to the end of the file', () => {
  for (const [id, s] of Object.entries(manifestFile.sounds)) if (s.loop) { assert.equal(s.loopEnd, null, id); assert.equal(s.loopStart, 0.05, id); }
});

test('a one-shot recording has its silent front and back cut off, a loop does not', async () => {
  const { trimSilence } = await import('../src/audio/audio.js');
  const rate = 1000;
  const make = (len, loudFrom, loudTo) => {
    const d = new Float32Array(len);
    for (let i = loudFrom; i < loudTo; i++) d[i] = 0.5;
    return { length: len, sampleRate: rate, numberOfChannels: 1, duration: len / rate, getChannelData: () => d };
  };
  const ctx = { createBuffer: (ch, len, r) => { const d = new Float32Array(len); return { length: len, sampleRate: r, duration: len / r, getChannelData: () => d }; } };
  const cut = trimSilence(ctx, make(3000, 400, 900));
  assert.ok(cut.length < 700, `expected about 500 samples plus a little padding, got ${cut.length}`);
  assert.ok(cut.length >= 500, 'the sound itself is kept');
  const tight = make(500, 0, 500);
  assert.equal(trimSilence(ctx, tight), tight, 'nothing to cut means the same buffer back');
  const odd = { duration: 3 };
  assert.equal(trimSilence(ctx, odd), odd, 'a buffer we can not read is passed through');
});

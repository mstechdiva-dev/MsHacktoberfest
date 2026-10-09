// Settings panel: sound, volume, captions, room tone, reduced motion.

export function initSettings({ save, persist, audio }) {
  const dlg = document.getElementById('settings');
  const btn = document.getElementById('settings-btn');
  const soundBtn = document.getElementById('sound-btn');
  const s = save.settings;

  const syncSoundBtn = () => {
    soundBtn.setAttribute('aria-pressed', String(s.sound));
    soundBtn.querySelector('.sound-text').textContent = s.sound ? 'Sound on' : 'Tap to turn sound on';
  };
  const setRoomTone = () => {
    if (s.sound && s.roomTone) audio.loop('room-tone', 5800); else audio.stopLoop('room-tone');
  };

  soundBtn.addEventListener('click', () => {
    audio.enable(!s.sound);
    syncSoundBtn();
    sync();
    persist();
    if (s.sound) audio.play('ui-click');
    setRoomTone();
  });

  const f = dlg.querySelector('form');
  const sync = () => {
    f.sound.checked = s.sound;
    f.volume.value = s.volume;
    f.captions.checked = s.captions;
    f.roomTone.checked = s.roomTone;
    f.reducedMotion.checked = Boolean(s.reducedMotion);
    document.documentElement.classList.toggle('reduce-motion', Boolean(s.reducedMotion));
  };
  btn.addEventListener('click', () => { sync(); dlg.showModal(); });
  f.addEventListener('change', () => {
    if (f.sound.checked !== s.sound) audio.enable(f.sound.checked);
    audio.setVolume(Number(f.volume.value));
    s.captions = f.captions.checked;
    s.roomTone = f.roomTone.checked;
    s.reducedMotion = f.reducedMotion.checked ? true : null;
    document.documentElement.classList.toggle('reduce-motion', Boolean(s.reducedMotion));
    syncSoundBtn();
    setRoomTone();
    persist();
  });
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  sync();
  syncSoundBtn();
}

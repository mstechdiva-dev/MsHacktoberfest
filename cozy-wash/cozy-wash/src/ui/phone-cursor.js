// Tap to pay (PLAN section 9).
// Mouse/trackpad: the pointer becomes a phone over the pay area; click and hold over the green symbol.
// Touch: drag the phone from the counter onto the symbol and hold.
// Keyboard: Enter on the phone picks it up, Enter again holds it on the reader.
import { phone } from './props.js';

export function setupTapToPay({ area, reader, phoneEl, holdMs, glitchChance, play, onPaid, reduced }) {
  const fine = typeof matchMedia === 'function' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  let floater = null;
  let holdTimer = null;
  let glitched = false;
  let paid = false;
  let hoverSounded = false;
  const onWinUp = () => cancelHold(false);

  const overReader = (x, y) => {
    const r = reader.getBoundingClientRect();
    return x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
  };
  const highlight = (on) => {
    reader.classList.toggle('lit', on);
    if (on && !hoverSounded) { play('tap-hover'); hoverSounded = true; }
    if (!on) hoverSounded = false;
  };
  const cancelHold = (silent) => {
    if (holdTimer) {
      clearTimeout(holdTimer);
      holdTimer = null;
      reader.classList.remove('holding');
      if (!silent) play('tap-decline');
    }
  };
  const startHold = () => {
    if (paid || holdTimer) return;
    reader.classList.add('holding');
    holdTimer = setTimeout(() => {
      holdTimer = null;
      reader.classList.remove('holding');
      if (!glitched && Math.random() < glitchChance) {
        glitched = true;
        reader.classList.add('glitch');
        play('tap-decline');
        reader.querySelector('.reader-label').textContent = 'TRY AGAIN';
        setTimeout(() => { reader.classList.remove('glitch'); reader.querySelector('.reader-label').textContent = 'TAP TO PAY'; }, 1200);
        return;
      }
      paid = true;
      reader.classList.add('paid');
      reader.querySelector('.reader-label').textContent = 'PAID ✓';
      if (floater) floater.innerHTML = phone(true);
      phoneEl.innerHTML = phone(true);
      play('tap-beep');
      setTimeout(() => { cleanup(); onPaid(); }, 650);
    }, holdMs);
  };

  function cleanup() {
    cancelHold(true);
    if (floater) { floater.remove(); floater = null; }
    area.classList.remove('phone-mode');
    window.removeEventListener('pointerup', onWinUp);
    window.removeEventListener('pointercancel', onWinUp);
  }

  // Mouse and trackpad: phone follows the pointer over the pay area.
  if (fine) {
    phoneEl.hidden = true;
    area.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch' || paid) return;
      area.classList.add('phone-mode');
      floater = document.createElement('div');
      floater.className = 'phone-floater';
      floater.innerHTML = phone(false);
      document.body.appendChild(floater);
      play('phone-pickup');
    });
    let lastX = 0;
    area.addEventListener('pointermove', (e) => {
      if (!floater) return;
      const tilt = reduced ? 0 : Math.max(-12, Math.min(12, (e.clientX - lastX) * 1.5));
      lastX = e.clientX;
      floater.style.transform = `translate(${e.clientX - 22}px, ${e.clientY - 38}px) rotate(${tilt}deg)`;
      const on = overReader(e.clientX, e.clientY);
      highlight(on);
      if (!on) cancelHold(false);
    });
    area.addEventListener('pointerleave', () => { cancelHold(true); highlight(false); if (floater) { floater.remove(); floater = null; } area.classList.remove('phone-mode'); });
  }

  // Pressing and holding the symbol works for every kind of pointer.
  reader.addEventListener('pointerdown', (e) => { e.preventDefault(); highlight(true); startHold(); });
  reader.addEventListener('pointerleave', () => { if (!floater) highlight(false); });
  window.addEventListener('pointerup', onWinUp);
  window.addEventListener('pointercancel', onWinUp);
  if (reduced) area.classList.add('no-tilt');

  // Touch: drag the phone onto the reader.
  phoneEl.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch' && fine) return;
    e.preventDefault();
    phoneEl.setPointerCapture(e.pointerId);
    phoneEl.classList.add('lifted');
    play('phone-pickup');
    const r = phoneEl.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    const move = (ev) => {
      phoneEl.style.position = 'fixed';
      phoneEl.style.left = `${ev.clientX - dx}px`;
      phoneEl.style.top = `${ev.clientY - dy}px`;
      const on = overReader(ev.clientX, ev.clientY);
      highlight(on);
      if (on) startHold(); else cancelHold(false);
    };
    const up = () => {
      phoneEl.removeEventListener('pointermove', move);
      phoneEl.removeEventListener('pointerup', up);
      if (!paid) {
        cancelHold(false);
        highlight(false);
        phoneEl.classList.remove('lifted');
        phoneEl.style.position = '';
        phoneEl.style.left = '';
        phoneEl.style.top = '';
      }
    };
    phoneEl.addEventListener('pointermove', move);
    phoneEl.addEventListener('pointerup', up);
  });

  // Keyboard
  let picked = false;
  phoneEl.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (!picked) { picked = true; phoneEl.classList.add('lifted'); play('phone-pickup'); phoneEl.setAttribute('aria-label', 'Phone picked up. Press Enter to hold it on the reader.'); return; }
    highlight(true);
    startHold();
  });
  reader.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); highlight(true); startHold(); } });

  return { cleanup };
}

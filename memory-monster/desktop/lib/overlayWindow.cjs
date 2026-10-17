// How the overlay window is made: see-through, no frame, always on top, never takes focus,
// and not in the taskbar. It covers the whole primary screen but the mouse goes straight through it
// (main.js turns that off only while the mouse is over the card).
function overlayOptions(display, preloadPath) {
  const b = display.bounds;
  return {
    x: b.x,
    y: b.y,
    width: b.width,
    height: b.height,
    transparent: true,
    frame: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    focusable: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: "#00000000",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      // The tick that moves the door must keep running while the window is hidden.
      backgroundThrottling: false,
    },
  };
}

module.exports = { overlayOptions };

# Memory Monster for Windows

The desktop version. A see-through window covers your screen. When memory runs high the screen darkens, the door opens in the corner, and he steps out. A card lists the programs using the most memory. When memory drops, he goes home.

Unlike the website, this one really draws over your desktop, on top of other programs, and the mouse goes straight through it to whatever you were doing. Only the card takes clicks.

It needs no Vercel, no helper, no account and no internet. It reads your memory itself, on your computer, and nothing leaves it.

## Run it

You need Node.js 20 or newer.

1. Open the `desktop` folder in a terminal.
2. `npm install` (once)
3. `npm run dev`

That builds the site as plain files, starts the app, and puts a small icon in your system tray (bottom-right, near the clock; click the little arrow if it's hidden). Nothing appears on screen until memory crosses the line, which is 80% by default. Use **Test the figure** from the tray menu to see it now.

## The tray menu

Right-click the tray icon (or left-click it).

| Choice | What it does |
| --- | --- |
| Snooze 15 minutes | Sends him away and holds him back. |
| Turn off (8 hours) | Stops watching. It turns itself back on after 8 hours. While off, this becomes **Turn back on**. |
| Test the figure | Plays the whole sequence once with a pretend 85% and sample programs (labelled as samples on the card). |
| Look Studio... | Opens the Look Studio in a window. Your choices apply to the overlay at once. |
| Settings... | Opens the app window: the arrival and leaving numbers, reminder and snooze times, and which figure. |
| Start with Windows | Starts Memory Monster when you sign in. |
| Quit Memory Monster | Closes it completely. |

Snooze, Turn off and Quit work at any moment, even while he is on screen, so the app can never trap you.

## The card

The card lists the programs using the most memory. **Close it** asks inside the card first. Only **Yes, close it** sends the request, and it asks the program politely (no force close), so a program with unsaved work can still ask you to save. System programs are never listed.

## Make the installer

On Windows, in the `desktop` folder:

```
npm run dist
```

That builds the site, then makes `dist/Memory Monster Setup 0.1.0.exe`. The installer is not code-signed, so Windows may show a SmartScreen warning the first time.

## Check it works on your computer

```
set MM_DEBUG=1
npm start
```

With `MM_DEBUG=1` the app prints each memory reading, so you can see it is seeing the same percent as Task Manager.

There is also a self-check that runs without a screen: `MM_SMOKE=1 MM_SMOKE_OUT=check.png npm start` sends a pretend 90% reading, saves a picture of the overlay, prints what the window is doing, and quits.

## How it fits together

- `main.js` makes the overlay window and the tray, reads memory every 3 seconds, and passes readings to the overlay.
- `preload.js` gives the overlay page the few things it is allowed to ask for. The page is sandboxed and gets no access to Node.
- `lib/overlayWindow.cjs` makes the window see-through, always on top, and never focused.
- `lib/trayMenu.cjs` builds the tray menu as plain data.
- `lib/staticServer.cjs` serves the site to the app's own windows, on this computer only.
- The overlay page itself is `app/overlay/page.js` in the main project. It is the same figure, skins and Look Studio as the website.
- Memory and program reading is `helper/lib.cjs`, shared with the helper, so there is one copy.

## What it does not do yet

- It draws over the primary screen only.
- A program running in true exclusive full screen (some games) can draw over the overlay. He may not be visible there.
- It was built and tested here on Linux, with a virtual screen. The window behavior, the tray, the real memory reading and closing a program were all checked there. It has **not** been run on Windows yet, so the Windows tray icon, the click-through over real windows, Start with Windows and the installer are untested.

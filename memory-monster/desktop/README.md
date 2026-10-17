# Memory Monster for Windows

The desktop version. When memory runs high, the screen darkens, a door opens in the corner, and a dark figure steps out over whatever you were doing. A card lists the programs using the most memory. When memory drops, he goes home.

Unlike the website, this one really draws over your desktop, on top of other programs, and the mouse goes straight through it to your work. Only the card takes clicks.

It needs no Vercel, no helper, no account and no internet. It reads your memory itself, on your computer, and nothing leaves it.

## Before you start

You need **Node.js** (the LTS version) from https://nodejs.org. That is the only thing to install by hand. To check it is there, open a terminal and run `node -v`; it should print a version number starting with 20 or higher.

## Start it (the easy way)

1. Open this `desktop` folder in File Explorer.
2. Double-click **`run-memory-monster.bat`**.
3. Wait. The first run installs what it needs and builds the site, which takes a few minutes and prints a lot of text. Later runs start in seconds.
4. Look for his small icon in the **system tray**, bottom-right near the clock. If you do not see it, click the little arrow (^) to show hidden icons. You can drag the icon out of that list to keep it visible.
5. Right-click the icon and choose **Test the figure**. The screen darkens, the door opens, and he steps out for about 16 seconds.

That is all. From here he watches in the background. Nothing appears on screen until memory crosses the line, which is 80% by default.

## Start it (with a terminal)

Open a terminal in this `desktop` folder, then:

```
npm install
npm run dev
```

`npm run dev` builds the site and starts the app. After the first time, `npm start` starts it without rebuilding. Run `npm run build:site` again whenever you change the website code, so the app picks the change up.

## The tray menu

Right-click (or left-click) the tray icon.

| Choice | What it does |
| --- | --- |
| Snooze 15 minutes | Sends him away and holds him back. |
| Turn off (8 hours) | Stops watching. It turns itself back on after 8 hours. While off, this becomes **Turn back on**. |
| Test the figure | Plays the whole sequence once with a pretend 85% and sample programs (labelled as samples on the card). |
| Look Studio... | Opens the Look Studio in a window. Pick his face, outfit, door and eyes. Your choices apply to the overlay at once. |
| Settings... | Opens the app window: the arrival and leaving numbers, the reminder and snooze times, and which figure. |
| Start with Windows | Starts Memory Monster when you sign in. |
| Quit Memory Monster | Closes it completely. |

Snooze, Turn off and Quit work at any moment, even while he is on screen, so the app can never trap you.

## The card

The card in the top-left lists the programs using the most memory. **Close it** asks inside the card first. Only **Yes, close it** sends the request, and it asks the program politely (no force close), so a program with unsaved work can still ask you to save. System programs are never listed. Anything you have not saved in a program can still be lost, so save first.

## Make him arrive sooner (to see it for real)

The arrival number is 80% by default. To see him arrive from your real memory without opening dozens of programs:

1. Right-click the tray icon, then **Settings...**.
2. Set **He leaves below** to a lower number first (for example 25), then **He arrives at** (for example 30). The lowest allowed is 10 for arrival and 5 for leaving, and leaving has to be lower than arrival.
3. Close the window. When your real memory use is at or above the arrival number, he comes out.

Put the numbers back to the defaults (80 and 75), or use **Back to the defaults** in that window, when you are done.

## Make the installer

Double-click **`make-installer.bat`**, or in a terminal in this folder run `npm run dist`. It builds the site, then makes **`dist\Memory Monster Setup 0.1.0.exe`**. Double-click that to install him like any other program.

The installer is not code-signed, so Windows may show a "Windows protected your PC" (SmartScreen) message the first time. Choose **More info**, then **Run anyway**.

## If something goes wrong

| What you see | What to do |
| --- | --- |
| "Node.js is not installed" | Install it from https://nodejs.org (LTS), then double-click the file again. |
| The install or build stops with red errors | Check your internet connection and run it again. The first run downloads the packages it needs. |
| I cannot find the tray icon | Click the little arrow (^) near the clock. Drag his icon out to keep it visible. |
| Nothing ever appears | He only comes out when memory reaches the arrival number. Right-click the icon and choose **Test the figure** to check it works, or lower the number (see above). |
| "The site files are missing" | Run `npm run build:site` in this folder, then start it again. |
| The window opens but is blank | The site has to be built first. Run `npm run build:site`. |
| Nothing happens when I double-click the .bat file | Right-click it, choose **Open**, and read the message. If you downloaded a ZIP, make sure you unzipped it first. |
| The installer build says "cannot create symbolic link" | Turn on **Developer Mode** (Windows Settings, Privacy and security, For developers), or run the terminal as administrator, then try again. |
| I want to see what it is reading | In PowerShell run `$env:MM_DEBUG=1; npm start`. In Command Prompt run `set MM_DEBUG=1` and then `npm start`. It prints each memory reading, so you can compare the percent to Task Manager. |
| How do I stop it? | Right-click the tray icon, then **Quit Memory Monster**. |
| How do I uninstall it? | If you used the installer, remove it from Windows Settings, Apps. If you ran it from the folder, Quit it and delete the folder. |

## How it fits together

- `main.js` makes the overlay window and the tray, reads memory every 3 seconds, and passes readings to the overlay.
- `preload.js` gives the overlay page the few things it is allowed to ask for. The page is sandboxed and gets no access to Node.
- `lib/overlayWindow.cjs` makes the window see-through, always on top, and never focused.
- `lib/trayMenu.cjs` builds the tray menu as plain data.
- `lib/staticServer.cjs` serves the site to the app's own windows, on this computer only.
- The overlay page itself is `app/overlay/page.js` in the main project. It is the same figure, skins and Look Studio as the website.
- Memory and program reading is `helper/lib.cjs`, shared with the helper, so there is one copy.
- `npm test` here runs the desktop tests (19 of them). A self-check that needs no screen: `MM_SMOKE=1 MM_SMOKE_OUT=check.png npm start`.

## What it does not do yet

- It draws over the primary screen only.
- A program running in true exclusive full screen (some games) can draw over the overlay, so he may not be visible there.
- It was built and tested on Linux with a virtual screen. The window behavior, the tray, the real memory reading and closing a program were all checked there. It has **not** been run on Windows yet, so the Windows tray icon, the click-through over real windows, Start with Windows, the .bat files and the installer are untested. If something does not behave, please open an issue and say what you see.

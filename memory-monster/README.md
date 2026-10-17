# Memory Monster

*A door opens and a dark figure steps out when your computer's memory gets too full.*

Idea and design by Cheryl. Owned 100% by XYZ Agents LLC. Open source under the license in `LICENSE`.

![Memory Monster: when your memory fills up, he makes sure you notice](docs/social-card.png)

## The pages

| Address | What it is |
| --- | --- |
| `/` | The landing page: a looping demo, how it works, everything you can change as pictures, the finished looks, and the short video |
| `/app` | Memory Monster itself |
| `/looks` | The Look Studio |

The landing page shows the short video only when `public/memory-monster-short.mp4` is in the project. Without it, the video section is left out.

## What it does

Memory Monster watches how much memory is in use.

1. **Under 80%:** nothing happens. The page sits quiet.
2. **At 80% or more:** the room darkens, a door fades in with a red glow and swings open, and a hooded figure steps out. His face is a black void with two red eyes.
3. **While it stays high:** a card in the top-left corner lists the programs using the most memory and asks you to close them. It repeats every 5 minutes.
4. **Under 75%:** he steps back through the door, the door closes, and the room brightens.

The gap between 80 and 75 is on purpose. Without it he would pop in and out every time your memory hovers around one number.

## How it runs

Memory Monster is a website. You deploy it to Vercel and open it in a browser. There is no server code and no database: the whole site is static files.

A website can't see how full your computer is, so the page gets its number from one of three places. You pick in Settings:

| Source | What it reads | Good for |
| --- | --- | --- |
| Demo slider | A slider on the page | Seeing the door and figure without filling anything |
| This browser tab only | The tab's own memory use (Chrome and Edge only) | A quick look. It does **not** measure your computer. |
| The helper | Real memory use for the whole computer, and the biggest programs | The real thing |

The helper is a small program that runs on your own computer. See `helper/README.md`. It listens only on `127.0.0.1`, so nothing outside your computer can reach it, and it needs a code that only your browser knows.

A website also can't draw over your desktop. Open the page in its own window, or press **Full screen**, and leave it on a second monitor or a spare corner of the screen. Without the helper, the figure reacts to the slider or to the tab; with the helper he reacts to your real memory.

## Put it on Vercel

1. Put this folder in a GitHub repo.
2. In Vercel, choose **Add New Project**, pick the repo, and deploy. The defaults work: Vercel detects Next.js on its own.
3. Open the address Vercel gives you. That is the landing page; press **Open the app** to use Memory Monster.

That is the whole deploy. There are no environment variables to set.

### If this folder lives inside a bigger repo

A repo can be imported into Vercel more than once, so another project in the same repo keeps running untouched. Do the same steps, with these changes:

1. After you pick the repo, find **Root Directory**, press **Edit**, and choose the `memory-monster` folder. Give the project its own name.
2. In the new project's settings, add an **Ignored Build Step** so it skips builds when nothing in `memory-monster/` changed. Without it, every push to the repo rebuilds every project connected to it.
3. To deploy before a branch is merged, set the project's **Production Branch** to that branch.

This folder imports nothing from outside itself, so the Root Directory setting is all it needs.

## Try it without filling your memory

Press **Test the figure**. It plays the whole sequence once with a pretend 85% and a short list of sample programs (labelled as samples on the card), then lets him leave.

## The buttons

| Button | What it does |
| --- | --- |
| Test the figure | Plays the sequence once. |
| Snooze 15 min | Sends him away and holds him back for 15 minutes. |
| Turn off (8 h) | Stops watching. It turns itself back on after 8 hours so you don't forget it is off. |
| Full screen | Fills the screen with the scene. |
| Look Studio | Pick his face, outfit, door and eyes from thumbnails. |
| Settings | Source, figure, and the numbers below. |

Snooze and Turn off work at any time, even while he is on screen.

## The alert card

With the helper connected, each program on the card has a **Close it** button. Memory Monster **always asks you to confirm** before closing anything, and it asks the program politely, so a program with unsaved work can still ask you to save. Anything unsaved can still be lost, so save first. Without the helper the card can't see your programs and says so.

## Settings

The defaults live in `settings.json`. Change one, deploy again, and everyone gets the new default. You can also change them for yourself in the Settings panel; those choices stay in your browser only. A value that is missing or doesn't make sense is ignored and the default is used.

| Setting | Default | What it means |
| --- | --- | --- |
| `enterPercent` | 80 | He arrives at this memory percent or higher. |
| `leavePercent` | 75 | He leaves once memory drops below this. Keep it lower than `enterPercent`. |
| `reminderMinutes` | 5 | How often the reminder repeats while memory stays high. |
| `snoozeMinutes` | 15 | How long Snooze lasts. |
| `autoOnHours` | 8 | How long Turn off lasts before it turns itself back on. |
| `pollSeconds` | 3 | How often the page asks the helper for a new reading. |
| `skin` | `hooded-figure` | Which figure and door to use. |

## Change how he looks

Press **Look Studio** to choose from pictures: seven faces (including a redhead, a green alien and a face in shadow), six outfits (hood, cloak, trench coat, top hat, hoodie, shadow trench coat), five doors (including one ajar with a crack of light) and four ways to arrive. Every choice is a thumbnail of the real figure, so you see it before you pick it, and **Copy as skin.json** saves a look you like as a skin.

Shadow Form is the default look, and five more ship with it so you can see what a custom look is: `hooded-figure`, `green-visitor`, `detective`, `ghost` and `night-shift`. Pick one in Settings.

The figure, the door and what he says all live in a skin folder, so you can also change them by editing a file, without touching the app code. See `MAKE-YOUR-OWN-FIGURE.md`.

## Privacy

- The site has no accounts, no analytics and no server of its own.
- Your settings, source choice and helper code are saved in your browser only.
- The memory reading and program names go from the helper on your computer to the page in your browser. They are not sent anywhere else.

## Why the helper is Windows-first

Windows gives a clear "percent of memory in use" reading, and the 80 and 75 rules are built on it. The helper is written for that. Its memory reading runs on any system with Node, but macOS keeps memory filled on purpose, so a high percent is normal there and the rules would need to be different. A Mac or Linux version would be its own game, not a port. CONTRIBUTING.md says how to start one.

## Run it on your own computer for development

You need Node.js 20 or newer.

- `npm install` then `npm run dev` opens it at http://localhost:3000
- `npm test` runs the tests

## Videos

- `public/memory-monster-short.mp4` (1 minute 49 seconds) is the short video on the landing page: a real system monitor beside Memory Monster as memory fills up, then four custom entrances.
- `docs/memory-monster-walkthrough.mp4` (4 minutes 27 seconds) is the long version, including editing a skin in a terminal, checking it, building it and seeing it.

## Credits and ownership

Memory Monster is Cheryl's idea and design. This is IP owned 100% by XYZ Agents LLC. Anything derived from this project names XYZ Agents LLC as its owner.

## License

MIT, with the copyright held by XYZ Agents LLC. See `LICENSE`.

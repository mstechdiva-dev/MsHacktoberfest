# Contributing to Memory Monster

Thank you for helping. There are three easy ways in, and the first two don't need any app code.

## 1. Share a skin

1. Make your skin using MAKE-YOUR-OWN-FIGURE.md.
2. Put the folder in `community-skins/` with a clear name.
3. Add a short `README.md` inside your skin folder with your name or handle and one line about who he is.
4. Open a pull request.

**Skin checklist**
- `npm run check-skins` says your skin is OK, and **Test the figure** plays the whole sequence.
- It does not use anyone's brand, character, logo or likeness.
- Nothing in the words is hateful, harassing or aimed at a person.
- You are happy for it to be shared under the project license.

## 2. Report a bug or an idea

Open an issue. Say what you did, what you expected and what happened. For a bug, include your browser and which memory source you picked.

## 3. Change the app

The rules everyone keeps:
- The 80 in and 75 out gap stays, so he doesn't flicker.
- Nothing is ever closed without a confirm click, and the helper only asks politely (no force close).
- Snooze and Turn off always work, even while he is on screen.
- No accounts, no analytics, no server of our own.
- Real readings only. The only made-up numbers are the ones labelled as sample data during **Test the figure**.
- The helper stays on `127.0.0.1`, keeps the code check, and keeps its list of protected system programs.

Adding a new face, outfit, door or entrance takes three things: add it to the list in `lib/skinOptions.js`, give it its look (a style rule in `app/globals.css` for a face, door or entrance, or a drawing in `components/FigureArt.js` for an outfit), and look at its thumbnail in the Look Studio. `npm test` fails if a look is in the list without a style rule or drawing.

Keep each pull request to one change and say how you tested it. Run `npm test` before you open it.

## A Mac or Linux version

Those would each be their own game, not a port, because those systems keep and reclaim memory differently. If you want to start one, open an issue first so we can talk about the design.

## Ownership

Memory Monster is Cheryl's idea and design, and it is IP owned 100% by XYZ Agents LLC. By contributing you agree your contribution is shared under the project license.

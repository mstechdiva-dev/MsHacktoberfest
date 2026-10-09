# Add sounds

Out of the box every core sound is made in code (`src/audio/synth.js`), so files are optional. When a file exists, it plays instead.

1. Put files in `sounds/default/` (or a new folder for a whole pack).
2. Point the sound at it in `sounds/default/manifest.json`:

   ```json
   "wash-tumble": { "file": "wash-tumble.mp3", "loop": true, "loopStart": 0.05, "loopEnd": null, "volume": 0.7, "caption": "Drum tumbling", "core": true }
   ```

3. List the file in `sounds/CREDITS.md` with where it came from and its license.

**Rules**
- CC0 or made by you. Never CC-BY-NC.
- `.mp3`, mono, 44.1 kHz. One-shots under 2 seconds and 60 KB. Loops 4 to 10 seconds and under 200 KB.
- Trim loops so the end meets the start with no click. The game repeats the whole file after skipping `loopStart` (0.05 s, the little gap an mp3 starts with). `loopEnd: null` means the end of the file; set a number only to repeat part of it.
- Good sources: [Kenney](https://kenney.nl) (CC0) and [Freesound](https://freesound.org) with the CC0 filter.

`npm run check` fails if a file in the manifest is missing.

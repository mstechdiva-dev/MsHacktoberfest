# Make your own figure

The dark figure is a skin. A skin is one folder with a `skin.json` file in it. Change the folder and you change how he looks, how the door opens and what he says. You never touch the app code, and you can't break the app: if a skin has a problem, Memory Monster uses the default figure and shows a short note about it.

If you can edit a text file, you can make a skin.

## The fast way: the Look Studio

Open the site and press **Look Studio** (or go to `/looks`). Every choice has a small picture of the real figure and the real door, so you see what you get before you pick it.

- **Face:** black void, skull, pale mask, glowing grin, redhead, green alien, shadow face
- **Outfit:** hood and long coat, cloak, trench coat and hat, top hat and tails, hoodie and jeans, shadow trench coat
- **Door:** wooden, metal, stage curtain, portal, door ajar (a closed door with a crack of light). And whether it swings or slides open.
- **How he arrives:** walks out, rises up, slides in, drops down. Press **Play the entrance** to watch it.
- **Eye color:** six swatches, or pick your own.
- **Colors:** hood or hat, coat, trim (belt, hat band, jeans), face or skin, hair, and the light behind the door.

Your choices are saved in your browser and Memory Monster uses them the next time you open it. **Back to the skin's own look** clears them.

To keep a look or share it, press **Copy as skin.json**. Make a new folder in `skins/` (or `community-skins/` to share it), paste the text into a file called `skin.json`, and deploy. The text at the bottom of the studio page is the same file.

## The 60-second change without the studio: eye color

1. Open the `skins` folder.
2. Copy the `hooded-figure` folder and rename the copy, for example `blue-eyes`.
3. Open `blue-eyes/skin.json` in Notepad.
4. Find `"eyes"` and change the `"color"` value, for example `"#38bdf8"` for ice blue.
5. Save the file.
6. Deploy again (push the change to GitHub and Vercel does the rest).
7. Open Settings, choose `blue-eyes` under **Figure**, and press **Test the figure**.

To try a skin before you deploy, run the site on your own computer (see the README) and the new folder shows up in the Figure list.

## What you can change

Every field is optional. Leave one out and the default is used.

| Section | Field | Values |
| --- | --- | --- |
| `eyes` | `color` | A color like `#ff2a2a` |
| | `size` | 0.3 to 3 (1 is normal) |
| | `glow` | 0 to 2 (1 is normal) |
| | `pulseSeconds` | 0.2 to 10, how fast the glow pulses |
| | `flicker` | `true` or `false` |
| `outfit` | `style` | `hood`, `cloak`, `trench`, `tophat`, `hoodie`, `shadow` |
| | `hood` | The color of the hood, or of the hat in the trench and top hat outfits |
| | `coat` | The color of the coat |
| | `accent` | Optional trim color: the cloak hem, the trench belt and hat band, the top hat band, the jeans |
| `face` | `style` | `void`, `skull`, `mask`, `grin`, `redhead`, `alien`, `shadow` |
| | `color` | Optional skin color for the skull, mask, redhead and alien faces (the alien is green, the redhead is peach, unless you set one) |
| | `hair` | Optional hair color for the redhead (a red-orange unless you set one) |
| `door` | `style` | `wood`, `metal`, `curtain`, `portal`, `ajar` |
| | `glow` | A color for the light behind the door |
| | `opens` | `swing` or `slide` |
| `mood` | `darkness` | 0 to 0.95, how dark the room gets |
| | `tint` | A color for the tint of the dark |
| `entrance` | `style` | `walk-out`, `rise`, `slide`, `drop` |
| `words` | `arrive`, `reminder`, `leave` | What he says. Up to 160 characters each. |

Colors are written as `#` followed by 3 or 6 letters or numbers, like `#38bdf8` or `#fff`.

Want a red-haired figure with green eyes? Set `"face": { "style": "redhead" }` and `"eyes": { "color": "#4ade80" }`. A blond one? Add `"hair": "#facc15"`.

## An example

```json
{
  "name": "Ice Blue Eyes",
  "author": "your name",
  "eyes": { "color": "#38bdf8", "size": 1, "glow": 0.8, "pulseSeconds": 1.2, "flicker": true },
  "outfit": { "style": "trench", "hood": "#1f2937", "coat": "#0b1220", "accent": "#38bdf8" },
  "face": { "style": "redhead", "hair": "#c2410c" },
  "door": { "style": "metal", "glow": "#38bdf8", "opens": "slide" },
  "mood": { "darkness": 0.7, "tint": "#0b1b3a" },
  "entrance": { "style": "rise" },
  "words": {
    "arrive": "Your memory is getting crowded.",
    "reminder": "Still crowded. Close a few things and I will go.",
    "leave": "Thank you. Back I go."
  }
}
```

## Get an AI assistant to make one with you

Copy `skins/_template`, rename the folder, then paste this into any AI assistant along with the contents of the template's `skin.json`:

> Here is the skin.json for a page where a character comes out of a door to tell me my computer's memory is too full. Change it so the character is [describe your character: what they wear, eye color, how they enter, how they talk]. Keep the same field names and only use the allowed values for face, door style, door opens and entrance. Give me the finished skin.json.

Put the folder it gives you in `skins/`, deploy, pick it in Settings, and press **Test the figure**.

## Finished examples

Look in `skins/`. `shadow-form` is the default look: a black fedora, a face lost in shadow with only the eyes lit, a pinstripe trench coat with a red tie and belt buckle, and a door ajar with a crack of red light. The others are `hooded-figure` (the original), `green-visitor` (alien, top hat, portal, drops in), `detective` (trench coat, redhead, metal door that slides, slides in), `ghost` (pale mask, cloak, curtain, rises up) and `night-shift` (hoodie, glowing grin). Copy one as a starting point instead of the template.

## Ideas to start from

- A polite butler who apologizes for the interruption
- A robot with one blinking light (small, steady eyes, `metal` door)
- A ghost (pale `mask` face, `rise` entrance)
- A visitor from far away (`alien` face, `portal` door, `drop` entrance)
- A detective (`trench` outfit, `redhead` face, a very patient voice in `words`)
- A tired office worker (`tophat` swapped for the `hoodie`, `slide` entrance, a long sigh in `words`)

## Check it before you build

Run `npm run check-skins` in the project folder. It reads every skin in `skins/` and `community-skins/` and prints OK, or the exact field that is wrong:

```
Checking skins...
  hooded-figure      OK
  green-alien        1 problem
      face.style is not valid, so the default is used.
```

Fix the line it names, run it again, and when every skin says OK, run `npm run build`. `npm test` runs the same check, so a skin pull request with a typo fails before anyone looks at it.

## If something looks wrong

- The folder name is what you choose in Settings. It has to match the folder, spelled the same.
- Run `npm run check-skins` first. It names the field.
- A missing comma or quote in `skin.json` is the usual cause. A free online JSON checker points at the exact line.
- If Memory Monster shows the default figure with a "Skin note" under the buttons, that note says which field to look at.
- Start again from a fresh copy of `_template` if you get stuck.

## Share it

Skins you want to share go in `community-skins/` by pull request. CONTRIBUTING.md has the steps and the checklist.

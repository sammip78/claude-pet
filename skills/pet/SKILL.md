---
name: pet
description: Make your own pixel pet from a photo. It sits above the prompt in Claude Code and reacts while Claude works. Use when someone runs /pet or asks to create or change their pet or avatar.
argument-hint: "[photo of you]"
---

# /pet

Draw the person as a small pixel character from their photo and save it. Their pet replaces the default one straight away, in this chat and every new one.

`/pet quiet` and `/pet talk` never reach this skill. The mod answers them.

## Get the photo

Use the path in `$ARGUMENTS`, or an image attached to the message. With neither, ask for a photo and stop. Only draw the person asking, or someone who has agreed to it.

You also need their first name and what they want to wear. Ask once for whatever you can't work out. Default to the clothes in the photo.

## Draw it

If the face is small in the photo, crop a copy around it first so you can see the hairline and features. Colours from a dim or snowy photo look dull, so judge skin and hair by eye.

Work in a new temp folder. Start from the default pet in `../../hooks/sam.ts`, relative to this skill's base directory, and write it out as `avatar.json`. Change what differs for this person. Don't draw from scratch, because the moods and the blink rely on this layout.

- `name` is their first name, up to 40 characters.
- `outfit` is a short phrase for screen readers, like `a blue hoodie`, up to 60 characters.
- `palette` maps single letters to `#RRGGBB` colours. `sam.ts` says what each letter is. `S` stays the skin colour. You can add letters and drop ones you no longer use.
- `body` is 38 rows of 24 characters. `.` is see-through and every other character is a palette letter.
- `faces` holds the rows each mood swaps in, by row number. A mood can swap extra rows if a look needs it.

| Rows | What is there |
|---|---|
| 0–8 | Hair and hairline. Keep row 8 as skin from column 6 to 18, because `happy` and `oops` raise the eyebrows onto it |
| 9 | Eyebrows |
| 10–12 | Ears at columns 4 and 20 |
| 11–12 | Eyes at columns 8–9 and 15–16 |
| 13–15 | Nose |
| 16 | Shadow above the mouth, shown in every mood |
| 17–18 | Mouth |
| 19–20 | Chin |
| 21–31 | Neck, collar and shirt |
| 27–32 | Arms at columns 3–4 and 20–21: cuff on 27, forearm on 28–29, wrist on 30, hand on 31–32 |
| 32–34 | Shorts |
| 35–37 | Legs, socks and shoes |

Change the palette first: skin, hair, then clothes. The shades around the skin are tuned to the default pet, so move `s`, `u`, `M` and `D` along with `S`, and check that `B`, `E` and `w` still stand out against the new skin. Then change the shapes that make them recognisable:

- Hair outline in rows 0–8. Long hair can run down the sides, outside the face, as far as it really goes, over the shoulders if it needs to.
- For a bald head, empty row 0 and narrow rows 1–3 so the top is round, then add a lighter shine colour.
- A moustache on rows 15–16. A full beard can run from row 14 to row 21 and sit a little wider than the jaw.
- Glasses with frames along rows 10 and 13 from column 6 to 11 and from column 13 to 18, sides at columns 6, 11, 13 and 18 on rows 11–12, and a bridge on row 11 at column 12. Use a darker tone on the frame corners for round lenses. Keep columns 7–10 and 14–17 clear on rows 11–12, because the moods draw their eyes there.
- Clothes in rows 21–36. Trousers run on through rows 35–36, and long sleeves cover the forearm on rows 28–29.
- Replace the shirt number unless they asked for one. Take off the wristband and watch on row 30 unless they wear them. Keep anything out of shot plain.

The eyes stay at rows 11–12, columns 8–9 and 15–16, because the blink paints over them.

A row in `faces` replaces the whole body row, and each mood only redraws its own feature. So copy every other change on that row into the mood's row: hair, glasses, ears, beard, jaw and clothes.

| Mood | Rows it swaps | What it redraws |
|---|---|---|
| `working` | 11, 12, 17, 18, 25–30 | Eyes, mouth, and a laptop over the shirt |
| `happy` | 8, 9, 11, 12, 17, 18 | Eyebrows, eyes and mouth |
| `oops` | 5–9, 11, 12, 17, 18 | Sweat drop at columns 20–22, painted over any hair there, then eyebrows, eyes and mouth |

## Check it

```bash
python3 <base directory>/preview.py avatar.json preview.png
```

Read `preview.png` and compare it with the photo. It shows the four moods side by side on the dark strip, and it leaves out two things the app adds:

- On desktop, a light outline around the character, and a thought bubble beside the head during `working`. The bubble starts at column 21 on rows 0–16, so hair past column 20 sits behind it.
- A terminal draws no outline and only shows rows 0–23. Dark hair needs a few lighter `h` pixels there to keep its shape, and the head matters most.

Keep fixing until a friend would recognise them. Stop after three rounds and say what's still off.

## Save it

Call `mcp__pet__save_avatar` with `{ "avatar": <the JSON> }`, loading it with ToolSearch if it isn't in your tools. A refusal says what to fix.

Delete the temp folder. Then tell them to look above the prompt, ask what they'd change, and mention that `/pet quiet` turns the comments off.

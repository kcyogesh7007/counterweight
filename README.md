# Counterweight

A daily logic puzzle for phones: hang every weight on the mobile so that every bar balances.

A bar balances when **(total weight under the left arm) × (left notches) = (total weight under the right arm) × (right notches)**. Each puzzle uses the weights 1–7 once each, and has exactly one solution.

**One puzzle a day.** Everyone gets the same puzzle on the same day, numbered from **#1 (Mon 23 Nov 2026)**. A new one appears at your local midnight. Puzzles get harder through the week: Monday is the easiest and Sunday the hardest. Once you've solved today's, you see your time, your re-hangs and a countdown to tomorrow.

**Playing:** tap a weight and then tap a hook, or drag a weight onto a hook. To take a weight down, tap it or drag it off the mobile. Dropping a weight onto a full hook sends the old weight back to the tray. Each weight taken down counts as one "re-hang".

Built with React, Vite and TypeScript. There's no backend. The only things saved are whether you finished the tutorial and your result for each day, and they're stored in your own browser.

## Run it

```bash
npm install      # first time only: downloads the libraries
npm run dev      # starts the game, open the address it prints (http://localhost:5173)
```

**Testing the phone layout without a phone:**
1. Open the game in Chrome.
2. Press **F12**, then **Ctrl+Shift+M**.
3. Pick a phone from the list, or set the width to 360.

## Commands

| Command               | What it does                                                    |
| --------------------- | --------------------------------------------------------------- |
| `npm run dev`         | Runs the game locally. It updates as you save files.            |
| `npm test`            | Runs the automatic tests (maths, tapping rules, timer, dates)   |
| `npm run verify`      | Checks every puzzle file (see below)                            |
| `npm run build-daily` | Rebuilds the year of daily puzzles (see below)                  |
| `npm run generate`    | Prints new puzzle candidates, for exploring                     |
| `npm run build`       | Type-checks the code and builds the final website into `dist/`  |
| `npm run preview`     | Serves the built `dist/` folder, to try the final version       |
| `npm run lint`        | Looks for common code mistakes                                  |

## How the code is organised

```
src/
├─ data/                    the puzzles, as plain JSON you can read
│  ├─ tutorial.json         the 2 "How to play" puzzles, with their instruction texts
│  ├─ puzzles.json          the 3 hand-picked puzzles that became Days #1–3
│  └─ daily.json            one puzzle per day, for a year (made by build-daily)
├─ game/                    the rules, with no React and no drawing (easy to test)
│  ├─ types.ts              what a Bar, Hook and Puzzle look like
│  ├─ balance.ts            total weight, torque, balanced?, solved?, tilt angle
│  ├─ moves.ts              what each tap/drag does, re-hangs, the timer
│  ├─ daily.ts              today's puzzle number, countdown to midnight
│  ├─ layout.ts             sizes for drawing; checks puzzles fit a 360px phone
│  └─ puzzles.ts            loads the JSON files
├─ hooks/
│  ├─ useGame.ts            connects the rules to React (state + the 1-second clock)
│  └─ useDrag.ts            finger/mouse dragging (a short press is still a tap)
├─ components/              what you see
│  ├─ MobileView.tsx        draws the mobile in SVG; bars tilt with CSS transitions
│  ├─ WeightTray.tsx        the row of weights
│  ├─ GameScreen.tsx        one puzzle: mobile + tray + win card
│  ├─ WinScreen.tsx         the "Balanced!" card
│  └─ NextPuzzleCountdown.tsx  "Next puzzle in 7:42:09"
├─ storage.ts               remembers tutorial-done and each day's result (safely)
├─ styles/global.css        colours, spacing, dark mode (all as named tokens)
└─ App.tsx                  picks the screen: tutorial step or today's puzzle
scripts/
├─ lib/generator.ts         puzzle-making building blocks and difficulty scores
├─ build-daily.ts           builds src/data/daily.json
├─ generate-puzzles.ts      prints candidates
└─ verify-puzzles.ts        the puzzle checker
```

## The daily puzzles

`src/data/daily.json` holds **365 puzzles**: Day #1 (23 Nov 2026) to Day #365. After that the list starts again from the top. To make it, run:

```bash
npm run build-daily   # rebuilds src/data/daily.json (always the same result)
npm run verify        # checks every puzzle, then play it with npm run dev
```

How `build-daily` works:

1. **Days #1–3** are the hand-picked Puzzles 1–3 from `puzzles.json`.
2. **It generates about 870 different puzzles.** Mirror images count as the same puzzle, and every puzzle's hooks must fit 44px apart on a 360px phone.
3. **It sorts them from easiest to hardest:**
   - first by **footholds**, two-hook bars that can only hold one pair (e.g. 5 : 1 can only be 1 and 5): more footholds is easier;
   - then by **solver steps**: fewer is easier.
4. **It splits them into 7 groups.** Mondays take puzzles from the easiest group, and Sundays from the hardest.

**Changing a day that hasn't happened yet** is fine: rebuild or edit `daily.json`, then run `npm run verify`. **Don't change past days**, or players' saved results won't match the puzzle they solved.

`npm run verify` checks every puzzle in every file:

- the data is valid: unique names, arms of 1–6 notches, one hook per weight;
- the stored solution balances;
- a brute-force search finds **exactly one** solution;
- the hooks are at least **44px apart** on a 360px phone;
- no two puzzles in a file are the same.

**Why 7 weights?** With weights 1…N and arms of at most 6 notches, no mobile with 8 or more weights can balance. A hook holding 7, for example, needs an arm 7 notches long unless the thing beside it weighs a multiple of 7. More weights also wouldn't fit 44px apart on a phone. So harder puzzles come from deeper shapes and fewer easy starting points, not from more weights.

## Accessibility

- Everything works with a keyboard: **Tab** to move, **Enter** or **Space** to pick and hang.
- Screen readers hear each hook ("Hook c1, holding 3") and a text description of every bar ("Bar B, 3 notches left, 4 notches right: right side lower").
- Text and weight colours meet WCAG AA contrast in light and dark mode.
- Turning on "Reduce motion" on your device stops the bars swinging.
- Tap targets are at least 44px.

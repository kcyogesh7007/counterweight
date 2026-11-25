# Counterweight

A daily logic puzzle for phones: hang every weight on the mobile so that every bar balances.

**Play it: https://kcyogesh7007.github.io/counterweight/**

A bar balances when **(total weight under the left arm) × (left notches) = (total weight under the right arm) × (right notches)**. Each puzzle uses the weights 1–7 once each, and has exactly one solution.

**One puzzle a day.** Everyone gets the same puzzle on the same day, numbered from **#1 (Mon 23 Nov 2026)**. A new one appears at your local midnight. Puzzles get harder through the week: Monday is the easiest and Sunday the hardest. Once you've solved today's, you see your time, your re-hangs and a countdown to tomorrow.

**Playing:** tap a weight and then tap a hook, or drag a weight onto a hook. To take a weight down, tap it or drag it off the mobile. Dropping a weight onto a full hook sends the old weight back to the tray. Each weight taken down counts as one "re-hang".

Built with React, Vite and TypeScript. There's no backend. The only things saved are whether you finished the tutorial, your result for each day, and today's half-finished puzzle (so a reload carries on where you left off, timer included). They're stored in your own browser.

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
| `npm run build-levels`| Rebuilds the 60 levels (see below)                              |
| `npm run generate`    | Prints new puzzle candidates, for exploring                     |
| `npm run build`       | Type-checks the code and builds the final website into `dist/`  |
| `npm run preview`     | Serves the built `dist/` folder, to try the final version       |
| `npm run lint`        | Looks for common code mistakes                                  |

## Publishing an update

The game is hosted free on **GitHub Pages**. Every push to the `main` branch publishes automatically:

```bash
git add -A
git commit -m "Describe what you changed"
git push
```

GitHub then runs the tests and the puzzle checker, builds the game and publishes it. It takes about a minute. You can watch it under the repository's **Actions** tab. If a test or the checker fails, **nothing is published** and the live game stays as it was. The steps are in `.github/workflows/deploy.yml`.

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
│  ├─ generator.ts          makes puzzles (used by Practice and the build scripts)
│  ├─ levels.ts             stars and unlocking for Levels
│  ├─ practice.ts           Practice puzzles by difficulty and seed
│  ├─ streaks.ts            current and best streak
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
├─ build-daily.ts           builds src/data/daily.json
├─ generate-puzzles.ts      prints candidates
└─ verify-puzzles.ts        the puzzle checker
```

## How to play (tutorial)

The game always opens on the home screen. How to play opens from the **?**
button (and, until it has been seen once, a "New here? How to play" link on
home), and it ends back on home. It starts with three picture cards
(`src/components/TutorialIntro.tsx`): make every bar level, further out pulls
harder (weight × notches), and a bar carries everything below it. Then come
three small practice puzzles (`src/data/tutorial.json`). During those, a live
**balance meter** (`src/components/BalanceMeter.tsx`) shows each bar's sum, and
the weights pulse until the first tap.

## Installable app (PWA) and offline play

The game is a PWA ("progressive web app"), set up in `vite.config.ts` with
`vite-plugin-pwa`:

- **Manifest:** the app's name ("Counterweight: Balance Puzzle", shown as
  "Counterweight" under the icon), icons and colours. Phones can add it to
  the home screen and open it full-screen like a normal app.
- **Service worker:** keeps a copy of every file the game needs, so it also
  works with no internet. After a new version is published, players get it
  the next time they open the game.
- **Icons** are in `public/`. `icon.svg` is the source; the PNGs
  (192, 512, maskable 512, Apple 180, favicon 32) are drawn from it. The
  mobile in the icon really balances: the heavy ball hangs close in.

This only runs in the built game (`npm run build`), not with `npm run dev`.

## Sound

Little sound effects (pick, hang, remove, hint, reset, win) are made by the
browser itself with the Web Audio API: there are no sound files. See
`src/sound.ts`. The speaker button on the home screen turns sound on or off,
and the choice is remembered in this browser (`counterweight:sound`).

## Hints

Every puzzle (except the tutorial) has **one hint**, from the lightbulb button in the tray. The hint picks the most useful nudge (see `src/game/hints.ts`):

1. a weight on the wrong hook: that hook glows, and a gold number shows where it belongs ("the 3 is on the wrong hook. Move it to the gold 3.");
2. otherwise, an untouched bar that only one pair of weights fits: the bar glows, both weights are shown in gold, with the sum that proves it ("3 × 4 = 4 × 3, so the 3 and the 4 go here.");
3. otherwise, one correct weight is shown in gold on an empty hook ("put the 7 on the gold 7.").

The hint stays while any of its gold numbers are still waiting, and goes away once they're hung (or a different weight is put there). A used hint is remembered (even after a reload), shown on the win card as "1 hint used", and in Levels it caps that solve at ★★.

## Levels

`src/data/levels.json` holds **60 levels**, made by `npm run build-levels` (fixed seed, always the same result):

| Levels | Weights | Group |
| --- | --- | --- |
| 1–5 | 3 | First steps |
| 6–12 | 4 | Warming up |
| 13–25 | 5 | Getting serious |
| 26–40 | 6 | Tricky |
| 41–60 | 7 | Fiendish |

Within each group, puzzles go from easier to harder. No level repeats a daily or tutorial puzzle. Solving a level opens the next one. Stars: **0 re-hangs ★★★, 1–2 ★★, 3 or more ★**. Your best stars are kept, and you can replay a level to improve them. Levels never affect the daily streak.

## Practice

Endless puzzles made on the phone, on the spot, by the same generator the build scripts use (`src/game/generator.ts`):

| Difficulty | Puzzles |
| --- | --- |
| Easy | 4–5 weights |
| Medium | 6 weights |
| Hard | 7 weights, at most one easy starting point |

Each puzzle comes from a random **seed** number: the same seed always makes the same puzzle, in every browser, so a reload keeps your puzzle. Every practice puzzle has exactly one solution and fits a 360px phone (checked by `src/game/practice.test.ts`). The game counts how many you've solved at each difficulty. Practice never affects the daily streak.

## Past puzzles

Every earlier daily puzzle is listed (newest first) with its difficulty and whether you solved it. You can play any of them. A puzzle solved on a later day is saved as **"solved late"** and **never changes your streak**: only daily puzzles solved on their own day count. Half-finished past puzzles aren't saved, so they can't overwrite today's progress.

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

**Replacing one day's puzzle** (e.g. one that turned out too hard): put it in `src/data/daily-overrides.json` (`{"2": { weights, root, solution }}`), then run `npm run build-daily` and `npm run verify`. Overrides are applied last, so no other day (and no level) changes. Day #2 was replaced this way on 24 Nov 2026 with a gentler puzzle.

**Changing a day that hasn't happened yet** is fine: rebuild or edit `daily.json`, then run `npm run verify`. **Don't change past days**, or players' saved results won't match the puzzle they solved.

`npm run verify` checks every puzzle in every file:

- the data is valid: unique names, arms of 1–6 notches, one hook per weight;
- the stored solution balances;
- a brute-force search finds **exactly one** solution;
- the hooks are at least **44px apart** on a 360px phone;
- no two puzzles in a file are the same.

**Why 7 weights?** With weights 1…N and arms of at most 6 notches, no mobile with 8 or more weights can balance. A hook holding 7, for example, needs an arm 7 notches long unless the thing beside it weighs a multiple of 7. More weights also wouldn't fit 44px apart on a phone. So harder puzzles come from deeper shapes and fewer easy starting points, not from more weights.

## Visitor counting (privacy-friendly)

The game can count visits and a few anonymous game events with [GoatCounter](https://www.goatcounter.com): no cookies, no IP addresses, nothing personal. It is **switched off until you set your code** in `src/analytics.ts`:

1. Sign up (free) at goatcounter.com and choose a code, e.g. `counterweight`.
2. Set `GOATCOUNTER_CODE = 'counterweight'` in `src/analytics.ts`, then publish.
3. See your stats at `https://counterweight.goatcounter.com`.

Counted events: `tutorial-finished`, `daily-solved`, `past-puzzle-solved`, `level-solved`, `practice-solved`, `hint-used`. Nothing is counted on localhost, and a short privacy note appears on the home screen while counting is on.

## Accessibility

- Everything works with a keyboard: **Tab** to move, **Enter** or **Space** to pick and hang.
- Screen readers hear each hook ("Hook c1, holding 3") and a text description of every bar ("Bar B, 3 notches left, 4 notches right: right side lower").
- Text and weight colours meet WCAG AA contrast in light and dark mode.
- Turning on "Reduce motion" on your device stops the bars swinging.
- Tap targets are at least 44px.

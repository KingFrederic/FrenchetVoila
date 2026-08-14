# Colors with Frederic — a FrenchetVoila lesson

An interactive, one-page **French colors mini-lesson for a 5-year-old** with no French
background. Your teacher **Frederic** (shown with his own photo) guides the child through
four color words using flip-to-reveal **flash cards** and a listen-and-find **game**.

Brought to you by **FrenchetVoila** — *French made fun.*

Because the child has no French, **every instruction is in English** — spoken and
shown. The *only* French is the four color words themselves, which are always
pronounced in French. That's the one new thing to learn; everything else is clear.

> **Rouge · Bleu · Jaune · Vert** — 🍓 🐳 ☀️ 🐸

![Welcome](assets/shot-1-welcome.png)

---

## The flash-card idea (the core mechanic)

Each card starts by showing **only the French color word**. The color is *hidden*.
The child reads (or is read) the word, guesses the color, and **taps to reveal** it —
turning a flash card into a tiny predict-then-check game. Tap again to flip it back.

| Word showing (front) | Tap → color revealed (back) |
|---|---|
| "Jaune", "Vert" as plain text | the real color fills the card + a picture (☀️/🐸) + an English label, and Frederic says the word in French |

![Flash cards](assets/shot-2-cards.png)

---

## The four screens

1. **Hello** — Frederic greets the child (in English) and sets the scene.
2. **The Colors** — the four flip-to-reveal flash cards.
3. **The Game** — Frederic gives an English direction and names a color in French
   ("Find… Rouge!"); the child taps the matching square. Right = confetti + "Yes!";
   a miss = a gentle shake + "Try again!" (never a fail).
4. **Great job!** — a celebration screen with the score and confetti, then replay.

| The game | The celebration |
|---|---|
| ![Game](assets/shot-3-game.png) | ![Finish](assets/shot-4-finish.png) |

---

## Run it

It's plain HTML/CSS/JS with **zero runtime dependencies** — the fastest way is to
just open the file:

```bash
# Option A — double-click index.html, or:
open index.html          # macOS
xdg-open index.html      # Linux
```

Or serve it with the tiny bundled server (nice for sharing on a tablet over Wi-Fi):

```bash
npm start                # → http://localhost:4173
PORT=8080 npm start      # pick a port
```

**Audio note:** the voice uses the browser's built-in speech synthesis — English for
the directions, French for the color words. It sounds best in Chrome/Edge/Safari with
a French voice installed; if none is available the lesson still works fully (and still
plays happy/try-again sound effects). Use the 🔊 button, top-left, to mute.

---

## Teaching it live

The website *is* a 5-minute lesson you can teach. The full minute-by-minute script,
pronunciation guide, and teaching tips are in **[docs/LESSON_PLAN.md](docs/LESSON_PLAN.md)**.

---

## Project layout

```
index.html            The one page (structure + the four screens)
css/styles.css        The bright, bouncy, big-target look; responsive + reduced-motion
js/colors.js          Single source of truth for the 4 colors (browser + Node)
js/app.js             Frederic's little state machine: cards, game, audio, confetti
server.js             Dependency-free static server (also used by the tests)
vercel.json           Hosting config: serve as a plain static site (no build)
docs/LESSON_PLAN.md   The teacher's 5-minute script
tests/                Playwright tests (data + full end-to-end journeys)
assets/               Frederic's photo (frederic-avatar.jpg) + screenshots
```

---

## Tests

The lesson is covered end-to-end with [Playwright](https://playwright.dev/): the data
module is unit-tested in Node, and the full child journey (flip cards, reveal colors,
play the game, celebrate, replay) is driven in a real browser — on both a desktop and a
phone viewport.

```bash
npm test                 # run everything (38 tests: chromium + mobile)
npm run test:headed      # watch it play in a visible browser
npm run test:report      # open the last HTML report
```

What's verified, among other things:

- cards show the **word first** and **reveal the color only on click** (the core mechanic);
- the picture-word is **English** while the **color word stays French**;
- clicking a card **speaks the French** color word;
- a **correct** tap celebrates and advances; a **wrong** tap is gentle, doesn't score, and lets you retry;
- playing through all four rounds ends on the celebration with **4 / 4**;
- the **sound toggle** truly silences speech;
- everything is **keyboard-operable** and works at a phone size.

> In CI-like environments Playwright uses the pre-installed Chromium automatically;
> locally, run `npx playwright install chromium` once.

---

## Accessibility & kindness by design

- Big tap targets, high-contrast colors chosen to be distinct for young eyes.
- Everything is **spoken and shown** (not color-alone), with `aria-label`s throughout.
- Full **keyboard** support (Tab/Enter/Space, arrow keys between cards) and visible focus rings.
- Respects **`prefers-reduced-motion`** — animations and confetti calm down automatically.
- **No failure states.** Wrong answers are nudges, not buzzers.

---

## License

MIT — teach freely. 🌈

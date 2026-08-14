// End-to-end tests: drive the whole lesson in a real browser the way a child
// (and a screen reader) would, and check what they'd see and hear.
const { test, expect } = require('@playwright/test');

// Silence real speech so the CI box doesn't try to talk, but keep a log of
// what *would* have been said so we can assert the French is spoken.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__spoken = [];
    const fakeSynth = {
      getVoices: () => [],
      speak: (u) => { window.__spoken.push(u && u.text); },
      cancel: () => {},
      onvoiceschanged: null
    };
    try { Object.defineProperty(window, 'speechSynthesis', { value: fakeSynth, configurable: true }); }
    catch (e) { window.speechSynthesis = fakeSynth; }
    window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  });
  await page.goto('/');
  await page.waitForSelector('html[data-ready="true"]');
});

test.describe('Welcome screen', () => {
  test('opens on the welcome step with a start button', async ({ page }) => {
    await expect(page.locator('.screen[data-step="welcome"]')).toHaveClass(/is-active/);
    await expect(page.locator('#start-btn')).toBeVisible();
    await expect(page.locator('#welcome-title')).toContainText('Les Couleurs');
  });

  test('the four flash cards are built and hidden as colours to begin', async ({ page }) => {
    const cards = page.locator('.card');
    await expect(cards).toHaveCount(4);
    // Front shows the French word; none are flipped yet.
    await expect(page.locator('.card[data-color="rouge"] .card-front .card-word')).toHaveText('Rouge');
    await expect(page.locator('.card.is-flipped')).toHaveCount(0);
  });
});

test.describe('Flash cards', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#start-btn');
    await expect(page.locator('.screen[data-step="cards"]')).toHaveClass(/is-active/);
  });

  test('a card shows the WORD first and REVEALS the colour only when clicked', async ({ page }) => {
    const card = page.locator('.card[data-color="bleu"]');
    // Before the click the word is shown and the card is not flipped.
    await expect(card).not.toHaveClass(/is-flipped/);
    await expect(card).toHaveAttribute('aria-pressed', 'false');

    await card.click();

    // After the click it flips to reveal the colour + picture.
    await expect(card).toHaveClass(/is-flipped/);
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    const back = card.locator('.card-back');
    await expect(back).toHaveCSS('background-color', 'rgb(46, 134, 255)'); // #2E86FF
    await expect(back.locator('.card-thing')).toHaveText('une baleine');
  });

  test('clicking a card speaks the French colour name', async ({ page }) => {
    await page.click('.card[data-color="vert"]');
    const spoken = await page.evaluate(() => window.__spoken.join(' | '));
    expect(spoken).toContain('Vert');
  });

  test('clicking again flips the card back', async ({ page }) => {
    const card = page.locator('.card[data-color="jaune"]');
    await card.click();
    await expect(card).toHaveClass(/is-flipped/);
    await card.click();
    await expect(card).not.toHaveClass(/is-flipped/);
  });

  test('revealing all four unlocks a celebratory "next" state', async ({ page }) => {
    for (const id of ['rouge', 'bleu', 'jaune', 'vert']) {
      await page.click(`.card[data-color="${id}"]`);
    }
    await expect(page.locator('#to-game')).toHaveClass(/is-ready/);
    await expect(page.locator('#leo-bubble')).toContainText('Bravo');
  });

  test('cards are keyboard operable (Enter flips)', async ({ page }) => {
    const card = page.locator('.card[data-color="rouge"]');
    await card.focus();
    await page.keyboard.press('Enter');
    await expect(card).toHaveClass(/is-flipped/);
  });
});

test.describe('The game', () => {
  test.beforeEach(async ({ page }) => {
    await page.click('#start-btn');
    await page.click('#to-game');
    await expect(page.locator('.screen[data-step="game"]')).toHaveClass(/is-active/);
  });

  test('shows four colour swatches and asks for a colour', async ({ page }) => {
    await expect(page.locator('.swatch')).toHaveCount(4);
    await expect(page.locator('#game-prompt')).toContainText('Trouve');
  });

  test('a correct tap is celebrated and advances the game', async ({ page }) => {
    const target = await page.evaluate(() => window.app.game.target.id);
    await page.click(`.swatch[data-color="${target}"]`);
    await expect(page.locator(`.swatch[data-color="${target}"]`)).toHaveClass(/is-right/);
    // Score ticks up.
    await expect.poll(() => page.evaluate(() => window.app.game.correct)).toBeGreaterThan(0);
  });

  test('a wrong tap is gentle: it shakes, does not score, and lets you retry', async ({ page }) => {
    const target = await page.evaluate(() => window.app.game.target.id);
    const wrong = await page.evaluate((t) => {
      return window.LESSON.colors.map((c) => c.id).find((id) => id !== t);
    }, target);

    await page.click(`.swatch[data-color="${wrong}"]`);
    await expect(page.locator(`.swatch[data-color="${wrong}"]`)).toHaveClass(/is-wrong/);
    expect(await page.evaluate(() => window.app.game.correct)).toBe(0);
    expect(await page.evaluate(() => window.app.game.index)).toBe(0); // still same question

    // The right answer still works afterwards.
    await page.click(`.swatch[data-color="${target}"]`);
    await expect.poll(() => page.evaluate(() => window.app.game.correct)).toBe(1);
  });

  test('answering every question ends on the celebration with a perfect score', async ({ page }) => {
    // Play through by always tapping the current target.
    for (let round = 0; round < 4; round++) {
      const target = await page.evaluate(() => window.app.game.target && window.app.game.target.id);
      if (!target) break;
      await page.click(`.swatch[data-color="${target}"]`);
      // wait for the next question or the finish screen
      await page.waitForTimeout(1300);
    }
    await expect(page.locator('.screen[data-step="finish"]')).toHaveClass(/is-active/);
    await expect(page.locator('#final-score')).toHaveText('4 / 4');
  });
});

test.describe('Sound toggle', () => {
  test('mutes and unmutes, updating its label', async ({ page }) => {
    const toggle = page.locator('#sound-toggle');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveText('🔇');

    // While muted, clicking a card should not enqueue speech.
    await page.click('#start-btn');
    const before = await page.evaluate(() => window.__spoken.length);
    await page.click('.card[data-color="rouge"]');
    const after = await page.evaluate(() => window.__spoken.length);
    expect(after).toBe(before);
  });
});

test.describe('Full journey + replay', () => {
  test('welcome → cards → game → finish → home again', async ({ page }) => {
    await page.click('#start-btn');
    await expect(page.locator('.screen[data-step="cards"]')).toHaveClass(/is-active/);

    await page.click('#to-game');
    await expect(page.locator('.screen[data-step="game"]')).toHaveClass(/is-active/);

    for (let round = 0; round < 4; round++) {
      const target = await page.evaluate(() => window.app.game.target && window.app.game.target.id);
      if (!target) break;
      await page.click(`.swatch[data-color="${target}"]`);
      await page.waitForTimeout(1300);
    }
    await expect(page.locator('.screen[data-step="finish"]')).toHaveClass(/is-active/);

    // "Recommencer" returns home and resets the flash cards.
    await page.click('#replay-btn');
    await expect(page.locator('.screen[data-step="welcome"]')).toHaveClass(/is-active/);
    await expect(page.locator('.card.is-flipped')).toHaveCount(0);
  });
});

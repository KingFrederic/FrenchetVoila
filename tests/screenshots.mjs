// One-off visual capture script (not part of the test suite).
// Usage: node tests/screenshots.mjs
import { chromium } from '@playwright/test';
import { spawn } from 'child_process';
import { setTimeout as wait } from 'timers/promises';

const server = spawn('node', ['server.js'], { stdio: 'ignore' });
await wait(800);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
await page.goto('http://localhost:4173/');
await page.waitForSelector('html[data-ready="true"]');

const shot = (name) => page.screenshot({ path: `assets/shot-${name}.png` });

await wait(400); await shot('1-welcome');

await page.click('#start-btn');
await wait(400);
await page.click('.card[data-color="rouge"]');
await page.click('.card[data-color="bleu"]');
await wait(700); await shot('2-cards');

await page.click('#to-game');
await wait(600); await shot('3-game');

for (let i = 0; i < 4; i++) {
  const target = await page.evaluate(() => window.app.game.target && window.app.game.target.id);
  if (!target) break;
  await page.click(`.swatch[data-color="${target}"]`);
  await wait(1300);
}
await wait(500); await shot('4-finish');

await browser.close();
server.kill();
console.log('✓ screenshots written to assets/');

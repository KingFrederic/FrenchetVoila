// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright configuration.
 *
 * The tests run against the tiny static server (server.js). We point
 * Chromium at the pre-installed browser in this environment via
 * PLAYWRIGHT_BROWSERS_PATH; locally, `npx playwright install chromium`
 * fills the same role.
 */
// Use the browser that ships with this environment when it's present, so the
// suite runs without a `playwright install` download step. Locally this env
// var is unset and Playwright falls back to its own managed browser.
const fs = require('fs');
const PRESET_CHROMIUM = '/opt/pw-browsers/chromium';
const chromiumExecutable = fs.existsSync(PRESET_CHROMIUM) ? PRESET_CHROMIUM : undefined;

module.exports = defineConfig({
  testDir: './tests',
  timeout: 30 * 1000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // The lesson leans on speech synthesis + Web Audio; grant it up front.
    launchOptions: {
      args: ['--autoplay-policy=no-user-gesture-required']
    }
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: chromiumExecutable,
          args: ['--autoplay-policy=no-user-gesture-required']
        }
      }
    },
    {
      // Prove the big-target layout works on a phone-sized screen too.
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        launchOptions: {
          executablePath: chromiumExecutable,
          args: ['--autoplay-policy=no-user-gesture-required']
        }
      }
    }
  ],

  webServer: {
    command: 'node server.js',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 20 * 1000
  }
});

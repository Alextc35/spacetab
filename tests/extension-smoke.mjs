import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const executablePath = process.env.SPACETAB_BROWSER_PATH;
if (!executablePath) {
  throw new Error('SPACETAB_BROWSER_PATH is required for the unpacked-extension smoke test.');
}

const extensionPath = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
const context = await chromium.launchPersistentContext('', {
  executablePath,
  headless: false,
  args: [
    `--disable-extensions-except=${extensionPath}`,
    `--load-extension=${extensionPath}`,
    '--no-first-run'
  ]
});

try {
  const page = await context.newPage();
  await page.goto('chrome://newtab/');
  await page.waitForLoadState('domcontentloaded');

  assert.match(page.url(), /^chrome-extension:\/\/.+\/newtab\.html$/);
  await page.locator('#workspace-toolbar').waitFor({ state: 'visible' });
  await page.locator('#bookmark-container').waitFor({ state: 'visible' });
  assert.equal((await page.locator('.bookmark').count()) >= 2, true);
} finally {
  await context.close();
}

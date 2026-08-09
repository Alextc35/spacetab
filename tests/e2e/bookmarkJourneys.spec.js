import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser-harness.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

test('creates, edits and persists a bookmark after reload', async ({ page }) => {
  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('OpenAI');
  await page.locator('#bookmark-modal-form-url').fill('openai.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('link', { name: /OpenAI/ })).toHaveAttribute('href', 'https://openai.com');
  await page.reload();
  await expect(page.getByRole('link', { name: /OpenAI/ })).toBeVisible();

  await page.getByRole('button', { name: '✎' }).click();
  await page.getByRole('button', { name: 'Edit bookmark' }).last().click();
  await page.locator('#bookmark-modal-form-name').fill('OpenAI Docs');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: /OpenAI Docs/ })).toBeVisible();
});

test('creates a workspace and finds bookmarks across workspaces', async ({ page }) => {
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Work');
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue(/.+/);

  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('Work dashboard');
  await page.locator('#bookmark-modal-form-url').fill('work.example');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByRole('button', { name: 'Search bookmarks' }).click();
  await page.getByPlaceholder('Name or URL').fill('Work dashboard');
  await expect(page.getByRole('option', { name: /Work dashboard/ })).toContainText('Work');
});

test('saves a named appearance preset', async ({ page }) => {
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await page.getByRole('textbox', { name: 'Preset name' }).fill('Dark');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toContainText('Dark');
});

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser-harness.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

test('reveals the bottom workspace dock on hover and keyboard focus', async ({ page }) => {
  const toolbar = page.getByRole('navigation', { name: 'Workspace controls' });
  const viewportHeight = page.viewportSize().height;

  await expect(toolbar).toHaveCSS('bottom', '0px');
  await expect.poll(async () => (await toolbar.boundingBox()).y)
    .toBeGreaterThan(viewportHeight - 20);

  await toolbar.hover();
  await expect.poll(async () => (await toolbar.boundingBox()).y)
    .toBeLessThan(viewportHeight - 40);

  await page.mouse.move(0, 0);
  await page.getByRole('combobox', { name: 'Workspace' }).focus();
  await expect.poll(async () => (await toolbar.boundingBox()).y)
    .toBeLessThan(viewportHeight - 40);
});

test('reveals the left action dock on hover and keyboard focus', async ({ page }) => {
  const menu = page.locator('#floating-menu');
  const viewportHeight = page.viewportSize().height;

  await expect.poll(async () => (await menu.boundingBox()).x).toBeLessThan(-40);

  await page.mouse.move(5, viewportHeight / 2);
  await expect.poll(async () => (await menu.boundingBox()).x).toBeGreaterThanOrEqual(0);
  await page.getByRole('button', { name: '➕' }).hover();
  await expect(page.getByRole('button', { name: '➕' }))
    .toHaveCSS('background-color', 'rgba(22, 163, 74, 0.82)');

  await page.mouse.move(page.viewportSize().width / 2, viewportHeight / 2);
  await page.getByRole('button', { name: '✎' }).focus();
  await expect.poll(async () => (await menu.boundingBox()).x).toBeGreaterThanOrEqual(0);
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
  await page.getByRole('navigation', { name: 'Workspace controls' }).hover();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Work');
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue(/.+/);

  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('Work dashboard');
  await page.locator('#bookmark-modal-form-url').fill('work.example');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByRole('navigation', { name: 'Workspace controls' }).hover();
  await page.getByRole('button', { name: 'Search bookmarks' }).click();
  await page.getByPlaceholder('Name or URL').fill('Work dashboard');
  await expect(page.getByRole('option', { name: /Work dashboard/ })).toContainText('Work');
});

test('warns before deleting a workspace and removes its bookmarks', async ({ page }) => {
  const workspaceDock = page.getByRole('navigation', { name: 'Workspace controls' });

  await workspaceDock.hover();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Temporary');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('Temporary bookmark');
  await page.locator('#bookmark-modal-form-url').fill('temporary.example');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await workspaceDock.hover();
  await page.getByRole('button', { name: 'Delete workspace' }).click();
  await expect(page.getByRole('heading', { name: /Delete “Temporary”/ }))
    .toContainText('move them to Main or another workspace first');
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('link', { name: /Temporary bookmark/ })).toBeVisible();

  await workspaceDock.hover();
  await page.getByRole('button', { name: 'Delete workspace' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue('');
  await expect(page.getByRole('link', { name: /Temporary bookmark/ })).toHaveCount(0);
});

test('saves a named appearance preset', async ({ page }) => {
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
  await page.getByRole('textbox', { name: 'Preset name' }).fill('Dark');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toContainText('Dark');
});

test('persists the synchronized storage choice', async ({ page }) => {
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await page.getByRole('radio', { name: /Synchronized/ }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await expect(page.getByRole('radio', { name: /Synchronized/ })).toBeChecked();
});

test('duplicates and selects bookmarks in edit mode', async ({ page }) => {
  await page.getByRole('button', { name: '✎' }).click();
  const firstBookmark = page.locator('.bookmark').first();
  const editBox = await firstBookmark.getByRole('button', { name: 'Edit bookmark' }).boundingBox();
  const deleteBox = await firstBookmark.getByRole('button', { name: 'Delete bookmark' }).boundingBox();
  const selectBox = await firstBookmark.getByRole('button', { name: 'Select bookmark' }).boundingBox();
  const duplicateBox = await firstBookmark.getByRole('button', { name: 'Duplicate bookmark' }).boundingBox();
  const bookmarkBox = await firstBookmark.boundingBox();
  const actionPanelBox = await firstBookmark.locator('.bookmark-actions').boundingBox();

  expect(Math.abs(editBox.y - deleteBox.y)).toBeLessThan(2);
  expect(Math.abs(selectBox.y - duplicateBox.y)).toBeLessThan(2);
  expect(selectBox.y).toBeGreaterThan(editBox.y);
  expect(Math.abs(
    actionPanelBox.x + actionPanelBox.width / 2 - (bookmarkBox.x + bookmarkBox.width / 2)
  )).toBeLessThan(2);

  await page.getByRole('button', { name: 'Duplicate bookmark' }).first().click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY \(copy\)/ })).toBeVisible();

  await page.getByRole('button', { name: 'Select bookmark' }).last().click();
  const bulkActions = page.getByRole('toolbar', { name: 'Selected bookmark actions' });
  const workspaceDock = page.getByRole('navigation', { name: 'Workspace controls' });
  await expect(bulkActions).toBeVisible();
  await expect(page.getByText('1 selected')).toBeVisible();

  await workspaceDock.hover();
  await expect.poll(async () => {
    const bulkBox = await bulkActions.boundingBox();
    const dockBox = await workspaceDock.boundingBox();
    return dockBox.y - (bulkBox.y + bulkBox.height);
  }).toBeGreaterThanOrEqual(0);
});

test('duplicates several selected bookmarks without overlaps', async ({ page }) => {
  await page.getByRole('button', { name: '✎' }).click();
  const bookmarks = page.locator('#bookmark-container > .bookmark');

  await bookmarks.nth(0).getByRole('button', { name: 'Select bookmark' }).click();
  await bookmarks.nth(1).getByRole('button', { name: 'Select bookmark' }).click();
  await expect(page.getByText('2 selected')).toBeVisible();

  await page.getByRole('button', { name: 'Duplicate selection' }).click();

  await expect(bookmarks).toHaveCount(4);
  await expect(page.getByRole('link', { name: /DEVELOPED BY \(copy\)/ })).toBeVisible();
  await expect(page.getByRole('toolbar', { name: 'Selected bookmark actions' })).toBeHidden();

  const boxes = await bookmarks.evaluateAll(elements => elements.map(element => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  }));
  for (let index = 0; index < boxes.length; index += 1) {
    for (let comparison = index + 1; comparison < boxes.length; comparison += 1) {
      const first = boxes[index];
      const second = boxes[comparison];
      const separated = first.right <= second.left || second.right <= first.left
        || first.bottom <= second.top || second.bottom <= first.top;
      expect(separated).toBe(true);
    }
  }
});

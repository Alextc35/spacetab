import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser-harness.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

async function revealSideDock(page) {
  const menu = page.locator('#floating-menu');
  await page.mouse.move(5, page.viewportSize().height / 2);
  await expect.poll(async () => (await menu.boundingBox()).x).toBeGreaterThanOrEqual(0);
}

async function enableEditMode(page) {
  await revealSideDock(page);
  await page.getByRole('button', { name: '✎' }).click();
}

async function openBookmarkActions(bookmark) {
  await bookmark.getByRole('button', { name: 'Show bookmark actions' }).hover();
  await expect(bookmark.locator('.bookmark-actions')).toBeVisible();
}

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

test('keeps long bookmark titles centered and truncated inside their card', async ({ page }) => {
  const bookmark = page.locator('#bookmark-container > .bookmark').first();
  const title = bookmark.locator('.bookmark-title');
  const bookmarkBox = await bookmark.boundingBox();
  const titleBox = await title.boundingBox();

  await expect(title).toHaveCSS('text-align', 'center');
  await expect(title).toHaveCSS('text-overflow', 'ellipsis');
  expect(await title.evaluate(element => element.scrollWidth > element.clientWidth)).toBe(true);
  expect(titleBox.x).toBeGreaterThanOrEqual(bookmarkBox.x);
  expect(titleBox.x + titleBox.width).toBeLessThanOrEqual(bookmarkBox.x + bookmarkBox.width);
});

test('previews and pins bookmark actions from the top-left trigger', async ({ page }) => {
  await enableEditMode(page);
  const bookmark = page.locator('#bookmark-container > .bookmark').first();
  const toggle = bookmark.getByRole('button', { name: 'Show bookmark actions' });
  const actions = bookmark.locator('.bookmark-actions');

  await expect(toggle).toBeVisible();
  await expect(actions).toBeHidden();

  await toggle.hover();
  await expect(actions).toBeVisible();
  await actions.getByRole('button', { name: 'Edit bookmark' }).hover();
  await expect(actions).toBeVisible();

  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
  await expect(actions).toBeHidden();

  await toggle.click();
  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
  await expect(actions).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');

  await page.keyboard.press('Escape');
  await expect(actions).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
});

test('creates, edits and persists a bookmark after reload', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('OpenAI');
  await page.locator('#bookmark-modal-form-url').fill('openai.com');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await expect(page.getByRole('link', { name: /OpenAI/ })).toHaveAttribute('href', 'https://openai.com');
  await page.reload();
  await expect(page.getByRole('link', { name: /OpenAI/ })).toBeVisible();

  await enableEditMode(page);
  const newBookmark = page.locator('#bookmark-container > .bookmark').last();
  await openBookmarkActions(newBookmark);
  await newBookmark.getByRole('button', { name: 'Edit bookmark' }).click();
  await page.locator('#bookmark-modal-form-name').fill('OpenAI Docs');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: /OpenAI Docs/ })).toBeVisible();
});

test('keeps bookmark editor actions inside the modal on content-heavy tabs', async ({ page }) => {
  await page.setViewportSize({ width: 822, height: 525 });
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();

  const modal = page.locator('#edit-bookmark-modal .modal-card');
  await modal.getByRole('tab', { name: 'Style' }).click();

  const cardBox = await modal.boundingBox();
  const actionsBox = await modal.locator('.modal-actions').boundingBox();

  expect(actionsBox.y + actionsBox.height).toBeLessThanOrEqual(cardBox.y + cardBox.height);
  expect(actionsBox.x).toBeGreaterThanOrEqual(cardBox.x);
  expect(actionsBox.x + actionsBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width);
});

test('creates a workspace and finds bookmarks across workspaces', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Workspace controls' }).hover();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Work');
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(page.getByRole('combobox', { name: 'Workspace' })).toHaveValue(/.+/);

  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('Work dashboard');
  await page.locator('#bookmark-modal-form-url').fill('work.example');
  await page.getByRole('button', { name: 'Add', exact: true }).click();

  await page.getByRole('navigation', { name: 'Workspace controls' }).hover();
  await page.getByRole('button', { name: 'Search bookmarks' }).click();
  await page.getByPlaceholder('Name or URL').fill('Work dashboard');
  await expect(page.getByRole('option', { name: /Work dashboard/ })).toContainText('Work');
});

test('cycles workspaces with Alt plus arrow keys and animates the grid', async ({ page }) => {
  await page.getByRole('navigation', { name: 'Workspace controls' }).hover();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Work');
  await page.getByRole('button', { name: 'Accept' }).click();

  const workspace = page.getByRole('combobox', { name: 'Workspace' });
  const workId = await workspace.inputValue();
  await page.keyboard.press('Alt+ArrowUp');
  await expect(workspace).toHaveValue('');
  await expect(page.locator('#bookmark-container')).not.toHaveClass(/is-switching-workspace/);

  await page.keyboard.press('Alt+ArrowDown');
  await expect(workspace).toHaveValue(workId);
  await expect(page.locator('#bookmark-container')).not.toHaveClass(/is-switching-workspace/);
});

test('warns before deleting a workspace and removes its bookmarks', async ({ page }) => {
  const workspaceDock = page.getByRole('navigation', { name: 'Workspace controls' });

  await workspaceDock.hover();
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await page.getByPlaceholder('Work, leisure…').fill('Temporary');
  await page.getByRole('button', { name: 'Accept' }).click();

  await revealSideDock(page);
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
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
  await page.getByRole('textbox', { name: 'Preset name' }).fill('Dark');
  await page.getByRole('button', { name: 'Save preset' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(page.getByRole('combobox', { name: 'Saved presets' })).toContainText('Dark');
});

test('configures the default bookmark through the shared preset editor', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();

  await expect(page.locator('#settings-bookmark-form-host')).toHaveCount(0);
  await page.getByRole('button', { name: 'Configure default bookmark' }).click();

  const editor = page.locator('#edit-bookmark-modal');
  await expect(editor.getByRole('heading', { name: 'Default bookmark appearance' })).toBeVisible();
  await expect(editor.getByRole('tab', { name: 'General' })).toHaveCount(0);
  await expect(editor.getByRole('tab', { name: 'Style' })).toHaveAttribute('aria-selected', 'true');
  await expect(editor.locator('.bookmark-title')).toHaveText('Default bookmark');

  await editor.getByRole('checkbox', { name: 'No background' }).uncheck();
  await editor.locator('#bookmark-modal-form-backgroundColor').fill('#123456');
  await editor.getByRole('button', { name: 'Apply' }).click();

  await expect(editor).toBeHidden();
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Configure default bookmark' }).click();
  await expect(editor.locator('#bookmark-modal-form-backgroundColor')).toHaveValue('#123456');
  await editor.getByRole('button', { name: 'Cancel' }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await page.getByRole('button', { name: 'Configure default bookmark' }).click();
  await expect(editor.locator('#bookmark-modal-form-backgroundColor')).toHaveValue('#123456');
});

test('persists the synchronized storage choice', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await page.getByRole('radio', { name: /Synced/ }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await expect(page.getByRole('radio', { name: /Synced/ })).toBeChecked();
});

test('duplicates, selects and clears selection when edit mode closes', async ({ page }) => {
  await enableEditMode(page);
  const firstBookmark = page.locator('#bookmark-container > .bookmark').first();
  await openBookmarkActions(firstBookmark);
  const editBox = await firstBookmark.getByRole('button', { name: 'Edit bookmark' }).boundingBox();
  const deleteBox = await firstBookmark.getByRole('button', { name: 'Delete bookmark' }).boundingBox();
  const selectBox = await firstBookmark.getByRole('button', { name: 'Select bookmark' }).boundingBox();
  const duplicateBox = await firstBookmark.getByRole('button', { name: 'Duplicate bookmark' }).boundingBox();
  const toggleBox = await firstBookmark.getByRole(
    'button',
    { name: 'Show bookmark actions' }
  ).boundingBox();
  const actionPanelBox = await firstBookmark.locator('.bookmark-actions').boundingBox();

  expect(Math.abs(editBox.y - deleteBox.y)).toBeLessThan(2);
  expect(Math.abs(selectBox.y - duplicateBox.y)).toBeLessThan(2);
  expect(selectBox.y).toBeGreaterThan(editBox.y);
  expect(actionPanelBox.x).toBeGreaterThanOrEqual(toggleBox.x + toggleBox.width - 2);

  await firstBookmark.getByRole('button', { name: 'Duplicate bookmark' }).click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY \(copy\)/ })).toBeVisible();

  const duplicatedBookmark = page.locator('#bookmark-container > .bookmark').last();
  await openBookmarkActions(duplicatedBookmark);
  await duplicatedBookmark.getByRole('button', { name: 'Select bookmark' }).click();
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

  await revealSideDock(page);
  await page.getByRole('button', { name: '🔒' }).click();
  await expect(bulkActions).toBeHidden();
  await expect(page.locator('.bookmark.is-selected')).toHaveCount(0);
});

test('toggles multiple bookmark selections with middle click without opening tabs', async ({ page }) => {
  await enableEditMode(page);
  const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
  const bulkActions = page.getByRole('toolbar', { name: 'Selected bookmark actions' });

  await bookmarks.nth(0).click({ button: 'middle' });
  await bookmarks.nth(1).click({ button: 'middle' });

  await expect(page.locator('.bookmark.is-selected')).toHaveCount(2);
  await expect(bulkActions).toBeVisible();
  await expect(page.getByText('2 selected')).toBeVisible();
  await expect.poll(() => page.context().pages().length).toBe(1);

  await bookmarks.nth(0).click({ button: 'middle' });

  await expect(page.locator('.bookmark.is-selected')).toHaveCount(1);
  await expect(page.getByText('1 selected')).toBeVisible();
});

test('duplicates several selected bookmarks without overlaps', async ({ page }) => {
  await enableEditMode(page);
  const bookmarks = page.locator('#bookmark-container > .bookmark');

  await openBookmarkActions(bookmarks.nth(0));
  await bookmarks.nth(0).getByRole('button', { name: 'Select bookmark' }).click();
  await openBookmarkActions(bookmarks.nth(1));
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

test('creates a folder, accepts a dragged bookmark and persists its contents', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Reading');
  await page.getByRole('button', { name: 'Accept' }).click();

  const folder = page.locator('.bookmark-folder', { hasText: 'Reading' });
  await expect(folder).toBeVisible();
  await expect(folder).toContainText('0 saved');

  await enableEditMode(page);
  const bookmark = page.locator('.bookmark[data-bookmark-id]').first();
  const bookmarkBox = await bookmark.boundingBox();
  const folderBox = await folder.boundingBox();

  await page.mouse.move(
    bookmarkBox.x + bookmarkBox.width / 2,
    bookmarkBox.y + bookmarkBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    folderBox.x + folderBox.width / 2,
    folderBox.y + folderBox.height / 2,
    { steps: 8 }
  );
  await expect(folder).toHaveClass(/is-drop-target/);
  await page.mouse.up();

  await expect(page.locator('.bookmark[data-bookmark-id]')).toHaveCount(1);
  await expect(page.locator('.bookmark-folder')).toContainText('1 saved');

  await revealSideDock(page);
  await page.getByRole('button', { name: '🔒' }).click();
  await page.reload();

  const persistedFolder = page.locator('.bookmark-folder', { hasText: 'Reading' });
  await expect(persistedFolder).toContainText('1 saved');
  await persistedFolder.getByRole('button', { name: /Open Reading/ }).click();
  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();

  await page.getByRole('button', { name: /Move DEVELOPED BY out of the folder/ }).click();
  await expect(page.getByText('0 bookmarks in this folder')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

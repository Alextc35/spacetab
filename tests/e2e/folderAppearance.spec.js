import { expect, test } from '@playwright/test';

const folderId = 'appearance-folder';
const folderCard = page => page.locator(`#bookmark-container [data-folder-id="${folderId}"]`);
const previewCard = page => page.locator('.folder-editor-preview-card');
const saveButton = page => page.locator('#edit-folder-modal-save');

async function start(page, layouts = [{ id: folderId, gx: 0, gy: 0, w: 2, h: 2 }]) {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.route('**/*', route => {
    if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
    if (route.request().resourceType() === 'image') {
      return route.fulfill({ contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><rect width="32" height="32" fill="#34b399"/></svg>' });
    }
    return route.abort();
  });
  await page.goto('/tests/browser-harness.html');
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
  await page.evaluate(async folderLayouts => {
    const { DEFAULT_BOOKMARK, DEFAULT_FOLDER_STYLE } = await import('/src/js/core/defaults.js');
    const { getState, setState } = await import('/src/js/core/store.js');
    const folders = folderLayouts.map(layout => ({ ...DEFAULT_FOLDER_STYLE,
      name: 'Reading', groupId: null, createdAt: 1, updatedAt: 1, ...layout }));
    const bookmarks = folders.flatMap(folder => Array.from({ length: 3 }, (_, index) => ({
      ...DEFAULT_BOOKMARK, id: `${folder.id}-${index}`, name: `Saved page ${index + 1}`,
      url: `https://example.test/page-${index}`, folderId: folder.id, gx: index, gy: 0
    })));
    await setState({ data: { folders, bookmarks,
      settings: { ...getState().data.settings, interfaceTheme: 'dark', language: 'en' } } });
  }, layouts);
  await page.reload();
  await expect(page.locator('#bookmark-container .bookmark-folder')).toHaveCount(layouts.length);
}

async function openEditor(page) {
  await folderCard(page).locator('.folder-open').click();
  await page.locator('#folder-modal-customize').click();
  await expect(page.locator('#edit-folder-modal')).toBeVisible();
  await expect(saveButton(page)).toBeHidden();
}

async function tab(page, name) {
  await page.locator('#edit-folder-modal').getByRole('tab', { name, exact: true }).click();
}

async function saveAndClose(page) {
  await saveButton(page).click();
  await expect(page.locator('#edit-folder-modal')).toBeHidden();
  await page.locator('#folder-modal-close').click();
}

async function savedFolder(page) {
  return page.evaluate(async id => (
    (await import('/src/js/core/store.js')).getState().data.folders.find(folder => folder.id === id)
  ), folderId);
}

async function expectBorder(card) {
  await expect(card).toHaveCSS('border-top-style', 'solid');
  expect(await card.evaluate(element => parseFloat(getComputedStyle(element).borderTopWidth)))
    .toBeGreaterThan(0);
  await expect(card).not.toHaveCSS('border-top-color', 'rgba(0, 0, 0, 0)');
}

test('previews, persists and resets the exterior color without making an unchanged editor dirty', async ({ page }) => {
  await start(page);
  const originalBackground = await folderCard(page).evaluate(element => getComputedStyle(element).backgroundImage);
  await openEditor(page);
  await tab(page, 'Style');
  const color = page.locator('#folder-editor-outer-color');
  const reset = page.locator('#folder-editor-outer-color-reset');

  await color.fill('#2468ac');
  await expect(previewCard(page)).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await expect(previewCard(page)).toHaveCSS('background-image', 'none');
  await expectBorder(previewCard(page));
  await reset.click();
  await expect(saveButton(page)).toBeHidden();
  await color.fill('#2468ac');
  await saveAndClose(page);

  await expect(folderCard(page)).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await expect(folderCard(page)).toHaveCSS('background-image', 'none');
  await expectBorder(folderCard(page));
  await page.reload();
  await expect(folderCard(page)).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await openEditor(page);
  await tab(page, 'Style');
  await expect(color).toHaveValue('#2468ac');
  await expect(saveButton(page)).toBeHidden();
  await reset.click();
  await saveAndClose(page);
  await page.reload();
  await expect(folderCard(page)).toHaveCSS('background-image', originalBackground);
  expect((await savedFolder(page)).outerBackgroundColor).toBeNull();
  await openEditor(page);
  await tab(page, 'Style');
  await expect(saveButton(page)).toBeHidden();
});

test('hides previews and keeps the folder name and saved count independently configurable', async ({ page }) => {
  await start(page);
  await openEditor(page);
  await expect(previewCard(page).locator('.folder-previews .bookmark-favicon')).toHaveCount(3);
  await tab(page, 'Style');
  await page.locator('#folder-editor-show-previews').uncheck();
  await expect(previewCard(page).locator('.folder-previews')).toBeHidden();
  await expect(previewCard(page).locator('.folder-visual')).toBeVisible();
  await tab(page, 'Text');
  await page.locator('#folder-editor-show-name').uncheck();
  await expect(previewCard(page).locator('.folder-title')).toBeHidden();
  await expect(previewCard(page).locator('.folder-count')).toBeVisible();
  await saveAndClose(page);
  await page.reload();

  await expect(folderCard(page).locator('.folder-previews')).toBeHidden();
  await expect(folderCard(page).locator('.folder-visual')).toBeVisible();
  await expect(folderCard(page).locator('.folder-title')).toBeHidden();
  await expect(folderCard(page).locator('.folder-count')).toHaveText('3 saved');
  await expect(folderCard(page).locator('.folder-count')).toBeVisible();
  await openEditor(page);
  await tab(page, 'Style');
  await expect(page.locator('#folder-editor-show-previews')).not.toBeChecked();
  await expect(page.locator('#folder-editor-show-previews')).toBeEnabled();
  await tab(page, 'Text');
  await expect(page.locator('#folder-editor-show-name')).not.toBeChecked();
  await expect(page.locator('#folder-editor-show-count')).toBeChecked();
  await page.locator('#folder-editor-show-name').check();
  await page.locator('#folder-editor-show-count').uncheck();
  await expect(previewCard(page).locator('.folder-title')).toBeVisible();
  await expect(previewCard(page).locator('.folder-count')).toBeHidden();
  await saveAndClose(page);
  await page.reload();
  await expect(folderCard(page).locator('.folder-title')).toBeVisible();
  await expect(folderCard(page).locator('.folder-count')).toBeHidden();
  await openEditor(page);
  await tab(page, 'Text');
  await expect(page.locator('#folder-editor-show-name')).toBeChecked();
  await expect(page.locator('#folder-editor-show-count')).not.toBeChecked();
});

test('hiding the glyph also hides previews while an empty bordered card still opens its folder', async ({ page }) => {
  await start(page);
  await openEditor(page);
  await tab(page, 'Style');
  const showFolder = page.locator('#folder-editor-show-folder');
  const showPreviews = page.locator('#folder-editor-show-previews');
  await expect(showPreviews).toBeChecked();
  await showFolder.uncheck();
  await expect(showPreviews).not.toBeChecked();
  await expect(showPreviews).toBeDisabled();
  await expect(previewCard(page).locator('.folder-visual')).toBeHidden();
  await expect(previewCard(page).locator('.folder-previews')).toBeHidden();
  await tab(page, 'Text');
  await page.locator('#folder-editor-show-name').uncheck();
  await page.locator('#folder-editor-show-count').uncheck();
  await expectBorder(previewCard(page));
  await saveAndClose(page);
  await page.reload();

  await expect(folderCard(page)).toBeVisible();
  await expectBorder(folderCard(page));
  for (const selector of ['.folder-visual', '.folder-previews', '.folder-title', '.folder-count']) {
    await expect(folderCard(page).locator(selector)).toBeHidden();
  }
  expect(await savedFolder(page)).toMatchObject({
    name: 'Reading', showFolder: false, showPreviews: false, showName: false, showCount: false
  });
  await folderCard(page).getByRole('button', { name: /Open Reading/ }).click();
  await expect(page.locator('#folder-modal')).toBeVisible();
  await expect(page.locator('#folder-modal-items [data-bookmark-id]')).toHaveCount(3);
  await page.locator('#folder-modal-customize').click();
  await expect(saveButton(page)).toBeHidden();
  await tab(page, 'Style');
  await expect(showFolder).not.toBeChecked();
  await expect(showPreviews).not.toBeChecked();
  await expect(showPreviews).toBeDisabled();
  await showFolder.check();
  await expect(showPreviews).toBeEnabled();
  await showPreviews.check();
  await expect(previewCard(page).locator('.folder-visual')).toBeVisible();
  await expect(previewCard(page).locator('.folder-previews')).toBeVisible();
});

test('transparent rear tabs end at the folder face at small, normal and large sizes', async ({ page }) => {
  await start(page, [
    { id: 'small-folder', gx: 0, gy: 0, w: 1, h: 1, noBackground: true },
    { id: folderId, gx: 1, gy: 0, w: 2, h: 2, noBackground: true },
    { id: 'large-folder', gx: 3, gy: 0, w: 4, h: 3, noBackground: true }
  ]);
  const assertTabBounds = async visual => {
    await expect(visual).toBeVisible();
    const tabBounds = await visual.locator('.folder-tab').boundingBox();
    const bodyBounds = await visual.locator('.folder-body').boundingBox();
    expect(tabBounds.height).toBeGreaterThan(0);
    expect(tabBounds.y + tabBounds.height).toBeLessThanOrEqual(bodyBounds.y + 1);
    expect(tabBounds.x).toBeGreaterThanOrEqual(bodyBounds.x);
    expect(tabBounds.x + tabBounds.width).toBeLessThanOrEqual(bodyBounds.x + bodyBounds.width);
  };
  for (const visual of await page.locator('#bookmark-container .folder-visual').all()) {
    await assertTabBounds(visual);
  }
  await folderCard(page).locator('.folder-open').click();
  await assertTabBounds(page.locator('#folder-modal-customize .folder-visual'));
  await page.locator('#folder-modal-customize').click();
  await assertTabBounds(previewCard(page).locator('.folder-visual'));
});

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

async function expectThemeActionsInsideInputs(page) {
  for (const button of await page.locator('#settings-bg-theme .input-action:visible').all()) {
    await expect(button).toHaveCSS('position', 'absolute');
    const bounds = await button.evaluate(element => {
      const action = element.getBoundingClientRect();
      const field = element.parentElement.querySelector('input').getBoundingClientRect();
      return { top: action.top - field.top, bottom: field.bottom - action.bottom,
        left: action.left - field.left, right: field.right - action.right };
    });
    for (const distance of Object.values(bounds)) expect(distance).toBeGreaterThanOrEqual(-1);
  }
}

async function enableFolderEditMode(page) {
  const toggle = page.locator('#folder-modal-edit-toggle');
  if (await toggle.getAttribute('aria-pressed') === 'false') {
    await toggle.click();
  }
}

async function setBookmarkDragMode(page, mode) {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  const input = page.locator(`input[name="bookmark-drag-mode"][value="${mode}"]`);
  if (await input.isChecked()) {
    await page.keyboard.press('Escape');
    await expect(page.locator('#settings-modal')).toBeHidden();
    return;
  }
  await input.check();
  await page.locator('#settings-modal-save').click();
  await expect(page.locator('#settings-modal')).toBeHidden();
}

async function createBookmark(page, name, url) {
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill(name);
  await page.locator('#bookmark-modal-form-url').fill(url);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('.bookmark[data-bookmark-id]').last()).toContainText(name);
}

async function moveGridItemByCells(page, bookmark, deltaX, deltaY) {
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const start = await bookmark.boundingBox();
  const pointer = {
    x: start.x + start.width * .75,
    y: start.y + start.height / 2
  };

  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await expect(bookmark).not.toHaveClass(/is-dragging/);
  const distance = Math.hypot(deltaX, deltaY);
  await page.mouse.move(
    pointer.x + deltaX / distance * 6,
    pointer.y + deltaY / distance * 6
  );
  await expect(bookmark).toHaveClass(/is-dragging/);
  await page.mouse.move(
    pointer.x + deltaX * gridBox.width / 12,
    pointer.y + deltaY * gridBox.height / 6,
    { steps: 10 }
  );
  await page.mouse.up();
  await expect.poll(async () => (await bookmark.boundingBox()).x)
    .toBeCloseTo(start.x + deltaX * gridBox.width / 12, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).y)
    .toBeCloseTo(start.y + deltaY * gridBox.height / 6, 0);
}

test('keeps a locally uploaded theme image out of synchronized storage', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await page.getByRole('radio', { name: /Synced/ }).check();
  await page.locator('#settings-modal-save').click();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🖼️ Theme' }).click();

  const fileInput = page.locator('#settings-theme-bg-upload-input');
  const fallbackUrl = 'https://images.test/fallback.gif';
  await page.route(fallbackUrl, route => route.fulfill({
    contentType: 'image/gif',
    body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  }));
  const imageUrl = page.locator('#settings-theme-bg-image');
  const imageReference = page.locator('#settings-theme-bg-local');
  await expect(imageReference).toBeHidden();
  await page.locator('#settings-theme-bg-default').uncheck();
  await imageUrl.fill(fallbackUrl);
  await page.locator('#settings-theme-toggle-bg-image').click();
  await fileInput.setInputFiles({
    name: 'theme.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1SQAAAABJRU5ErkJggg==',
      'base64'
    )
  });

  await expect(imageReference).toHaveValue('theme.png');
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await expect(page.locator('#settings-theme-bg-preview')).toHaveCSS('background-image', /data:image\/webp/);
  await expect(page.locator('#settings-modal .local-image-notice')).toBeVisible();
  await page.locator('#settings-modal-save').click();

  await expect.poll(() => page.evaluate(() => {
    const local = JSON.parse(sessionStorage.getItem('spacetab-test-local') || '{}');
    const sync = JSON.parse(sessionStorage.getItem('spacetab-test-sync') || '{}');
    const serialized = sync['spacetabSyncChunk:0'];
    return {
      localAssetCount: Object.keys(local).filter(key => key.startsWith('spacetabLocalImage:')).length,
      localSelection: local.spacetabLocalImageSelections?.theme,
      containsLocalSelection: serialized.includes('backgroundImageLocal') || serialized.includes('spacetab-local-image:'),
      syncedUrl: JSON.parse(serialized).settings.theme.backgroundImageUrl,
      containsImageBytes: serialized.includes('data:image/'),
      containsFilename: serialized.includes('theme.png')
    };
  })).toEqual({
    localAssetCount: 1,
    localSelection: expect.stringMatching(/^spacetab-local-image:/),
    containsLocalSelection: false,
    syncedUrl: fallbackUrl,
    containsImageBytes: false,
    containsFilename: false
  });

  await page.reload();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--image-bg-body')
  ))).toContain('data:image/webp');

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🖼️ Theme' }).click();
  await expect(imageReference).toHaveValue('theme.png');
  await expect(imageUrl).toHaveValue(fallbackUrl);

  // Simulate a second device with synchronized settings but no local image files.
  await page.evaluate(() => {
    const local = JSON.parse(sessionStorage.getItem('spacetab-test-local'));
    for (const key of Object.keys(local)) {
      if (key.startsWith('spacetabLocalImage:')) delete local[key];
    }
    sessionStorage.setItem('spacetab-test-local', JSON.stringify(local));
  });
  await page.reload();
  await expect.poll(() => page.evaluate(() => (
    document.documentElement.style.getPropertyValue('--image-bg-body')
  ))).toContain(fallbackUrl);
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🖼️ Theme' }).click();
  await expect(page.locator('#settings-theme-bg-preview')).toHaveCSS('background-image', `url("${fallbackUrl}")`);
  await expect(imageReference).toBeHidden();
});

test('switches to the default wallpaper without losing the custom URL or local image', async ({ page }, testInfo) => {
  const root = page.locator('html');
  const modal = page.locator('#settings-modal');
  const imageUrl = page.locator('#settings-theme-bg-image');
  const localImage = page.locator('#settings-theme-bg-local');
  const useDefault = page.locator('#settings-theme-bg-default');
  const preview = page.locator('#settings-theme-bg-preview');
  const save = page.locator('#settings-modal-save');
  const fallbackUrl = 'https://images.test/fallback.gif';
  await page.route(fallbackUrl, route => route.fulfill({
    contentType: 'image/gif',
    body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
  }));
  const openTheme = async () => {
    await revealSideDock(page);
    await page.getByRole('button', { name: '⚙️' }).click();
    await page.getByRole('button', { name: '🖼️ Theme' }).click();
  };
  await expect(root).toHaveClass(/is-default-bg/);
  const defaultWallpaper = await page.locator('body').evaluate(element => (
    getComputedStyle(element).backgroundImage
  ));

  await openTheme();
  await useDefault.uncheck();
  await imageUrl.fill(fallbackUrl);
  await page.locator('#settings-theme-toggle-bg-image').click();
  await page.locator('#settings-theme-bg-upload-input').setInputFiles({
    name: 'saved-wallpaper.png', mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1SQAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await expect(localImage).toHaveValue('saved-wallpaper.png');
  await save.click();
  await expect(page.locator('body')).toHaveCSS('background-image', /data:image\/webp/);

  await openTheme();
  await expect(useDefault).toBeEnabled();
  await useDefault.check();
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await expect(localImage).toHaveValue('saved-wallpaper.png');
  await expect(imageUrl).toBeDisabled();
  await expect(localImage).toBeDisabled();
  await expect(preview).toHaveCSS('background-image', defaultWallpaper);
  await expectThemeActionsInsideInputs(page);
  await modal.locator('.modal-card').screenshot({ path: testInfo.outputPath('default-theme.png') });
  await save.click();
  await expect(root).toHaveClass(/is-default-bg/);
  await expect(page.locator('body')).toHaveCSS('background-image', defaultWallpaper);

  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-image', defaultWallpaper);
  await openTheme();
  await expect(useDefault).toBeChecked();
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await expect(localImage).toHaveValue('saved-wallpaper.png');
  await expect(save).toBeHidden();
  await useDefault.uncheck();
  await expect(imageUrl).toHaveJSProperty('readOnly', true);
  await expect(preview).toHaveCSS('background-image', /data:image\/webp/);
  await save.click();
  await expect(modal).toBeHidden();
  await expect(root).not.toHaveClass(/is-default-bg/);
  await expect(page.locator('body')).toHaveCSS('background-image', /data:image\/webp/);

  // The same switch must work when only the synchronized URL is available.
  await page.evaluate(() => {
    const local = JSON.parse(sessionStorage.getItem('spacetab-test-local'));
    for (const key of Object.keys(local)) {
      if (key.startsWith('spacetabLocalImage:')) delete local[key];
    }
    sessionStorage.setItem('spacetab-test-local', JSON.stringify(local));
  });
  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-image', `url("${fallbackUrl}")`);
  await openTheme();
  await useDefault.check();
  await save.click();
  await expect(page.locator('body')).toHaveCSS('background-image', defaultWallpaper);
  await openTheme();
  await useDefault.uncheck();
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await save.click();
  await expect(page.locator('body')).toHaveCSS('background-image', `url("${fallbackUrl}")`);
});

test('shows a solid color picker and preserves images while switching background modes', async ({ page }, testInfo) => {
  const modal = page.locator('#settings-modal');
  const imageUrl = page.locator('#settings-theme-bg-image');
  const localImage = page.locator('#settings-theme-bg-local');
  const useDefault = page.locator('#settings-theme-bg-default');
  const useSolid = page.locator('#settings-theme-bg-solid');
  const color = page.locator('#settings-theme-bg-color');
  const preview = page.locator('#settings-theme-bg-preview');
  const save = page.locator('#settings-modal-save');
  const fallbackUrl = 'https://images.test/solid-fallback.gif';
  await page.route(fallbackUrl, route => route.abort());
  const openTheme = async () => {
    await revealSideDock(page);
    await page.getByRole('button', { name: '⚙️' }).click();
    await page.getByRole('button', { name: '🖼️ Theme' }).click();
  };

  await openTheme();
  await expect(color).toBeHidden();
  await useDefault.uncheck();
  await imageUrl.fill(fallbackUrl);
  await page.locator('#settings-theme-bg-upload-input').setInputFiles({
    name: 'preserved.png', mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1SQAAAABJRU5ErkJggg==',
      'base64'
    )
  });
  await expect(localImage).toHaveValue('preserved.png');
  await useDefault.check();
  await useSolid.check();
  await expect(useDefault).not.toBeChecked();
  await expect(color).toBeVisible();
  await expect(color).toBeEnabled();
  await color.fill('#2468ac');
  await expect(preview).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await expect(preview).toHaveCSS('background-image', 'none');
  await expect(imageUrl).toBeDisabled();
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await expect(localImage).toHaveValue('preserved.png');
  await expectThemeActionsInsideInputs(page);
  await modal.locator('.modal-card').screenshot({ path: testInfo.outputPath('solid-color-theme.png') });
  await save.click();
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await expect(page.locator('body')).toHaveCSS('background-image', 'none');

  await page.reload();
  await expect(page.locator('body')).toHaveCSS('background-image', 'none');
  await expect(page.locator('body')).toHaveCSS('background-color', 'rgb(36, 104, 172)');
  await openTheme();
  await expect(useSolid).toBeChecked();
  await expect(color).toHaveValue('#2468ac');
  await expect(localImage).toHaveValue('preserved.png');
  await expect(save).toBeHidden();
  await useDefault.check();
  await expect(useSolid).not.toBeChecked();
  await expect(color).toBeHidden();
  await expect(preview).toHaveClass(/is-default-bg/);
  await useDefault.uncheck();
  await expect(preview).toHaveCSS('background-image', /data:image\/webp/);
  await expect(imageUrl).toHaveValue(fallbackUrl);
  await save.click();
  await expect(page.locator('body')).toHaveCSS('background-image', /data:image\/webp/);
});

test('hides local image sync notices in This Device Only mode', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🖼️ Theme' }).click();

  await expect(page.locator('#settings-modal .local-image-notice')).toBeHidden();

  await page.locator('#settings-modal-cancel').click();
  await expect(page.locator('#settings-modal')).toBeHidden();
  await enableEditMode(page);

  const bookmark = page.locator('.bookmark[data-bookmark-id]').first();
  await bookmark.getByRole('button', { name: 'Edit bookmark' }).click();
  await expect(page.locator('#edit-bookmark-modal .local-image-notice')).toBeHidden();
});

test('treats a local image as one removable value without copying or changing its URL fallback', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🖼️ Theme' }).click();

  const imageUrl = page.locator('#settings-theme-bg-image');
  await page.locator('#settings-theme-bg-default').uncheck();
  await imageUrl.fill('https://images.test/fallback.png');
  await page.locator('#settings-theme-bg-upload-input').setInputFiles({
    name: 'theme.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1SQAAAABJRU5ErkJggg==',
      'base64'
    )
  });

  const imageReference = page.locator('#settings-theme-bg-local');
  await expect(imageReference).toHaveValue('theme.png');
  await imageReference.click({ position: { x: 4, y: 8 } });
  await expect.poll(() => imageReference.evaluate(input => [
    input.selectionStart,
    input.selectionEnd
  ])).toEqual([0, 'theme.png'.length]);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => imageReference.evaluate(input => [
    input.selectionStart,
    input.selectionEnd
  ])).toEqual([0, 'theme.png'.length]);
  await expect(page.locator('#settings-modal .local-image-field .input-copy')).toHaveCount(0);
  for (const type of ['copy', 'cut', 'paste']) {
    expect(await imageReference.evaluate((input, eventType) => (
      input.dispatchEvent(new ClipboardEvent(eventType, { bubbles: true, cancelable: true }))
    ), type)).toBe(false);
  }
  await page.keyboard.type('replacement');
  await expect(imageReference).toHaveValue('theme.png');
  await page.keyboard.press('Backspace');

  await expect(imageReference).toHaveValue('');
  await expect(imageReference).toBeHidden();
  await expect(imageUrl).toHaveValue('https://images.test/fallback.png');
  await expect.poll(() => imageReference.evaluate(input => (
    input.dataset.localImageReference ?? null
  ))).toBeNull();
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

test('selects on a short click and exposes only the direct edit control', async ({ page }) => {
  await enableEditMode(page);
  const bookmark = page.locator('#bookmark-container > .bookmark').first();
  const controls = bookmark.getByRole('group', { name: 'Bookmark controls' });
  const edit = bookmark.getByRole('button', { name: 'Edit bookmark' });

  await expect(controls).toBeVisible();
  await expect(controls.getByRole('button')).toHaveCount(1);
  await expect(bookmark.locator('.bookmark-select-toggle')).toHaveCount(0);
  await expect(edit).toBeVisible();
  await expect(bookmark.locator('.bookmark-action-menu, .bookmark-actions')).toHaveCount(0);

  const editBox = await edit.boundingBox();
  const bookmarkBox = await bookmark.boundingBox();
  expect(editBox.x - bookmarkBox.x).toBeGreaterThanOrEqual(20);
  expect(editBox.y - bookmarkBox.y).toBeGreaterThanOrEqual(7);

  await bookmark.click();
  await expect(bookmark).toHaveClass(/is-selected/);

  await bookmark.click();
  await expect(bookmark).not.toHaveClass(/is-selected/);

  await page.mouse.move(
    bookmarkBox.x + bookmarkBox.width / 2,
    bookmarkBox.y + bookmarkBox.height / 2
  );
  await page.mouse.down();
  await page.waitForTimeout(220);
  await expect(bookmark).toHaveClass(/is-dragging/);
  await page.mouse.up();
  await expect(bookmark).not.toHaveClass(/is-selected/);

  await edit.click();
  const editor = page.locator('#edit-bookmark-modal');
  await expect(editor).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await page.mouse.move(page.viewportSize().width / 2, page.viewportSize().height / 2);
  await expect(edit).toBeFocused();
  await expect(edit).not.toHaveCSS('background-color', 'rgb(37, 99, 235)');
});

test('navigates the grid with Tab and opens the keyboard-focused bookmark', async ({ page }) => {
  const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
  const first = bookmarks.nth(0);
  const second = bookmarks.nth(1);

  await page.keyboard.press('Tab');
  await expect(first).toHaveClass(/is-keyboard-active/);
  await expect(page.locator('.flash-message').last()).toHaveText('Selection mode enabled');

  await page.keyboard.press('ArrowRight');
  await expect(second).toHaveClass(/is-keyboard-active/);

  await page.keyboard.press('ArrowLeft');
  await expect(first).toHaveClass(/is-keyboard-active/);

  await page.keyboard.press('Tab');
  await expect(page.locator('.bookmark.is-keyboard-active')).toHaveCount(0);
  await expect(page.locator('.flash-message').last()).toHaveText('Selection mode disabled');

  await page.keyboard.press('Tab');
  await expect(first).toHaveClass(/is-keyboard-active/);

  await first.locator('.bookmark-link').evaluate(link => {
    link.setAttribute('href', '#keyboard-opened');
  });
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#keyboard-opened$/);
});

test('marks the keyboard-focused bookmark with S while editing', async ({ page }) => {
  await enableEditMode(page);
  const grid = page.locator('#bookmark-container');
  const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
  const first = bookmarks.nth(0);
  const second = bookmarks.nth(1);

  await expect(grid).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(first).toHaveClass(/is-keyboard-active/);

  await page.keyboard.press('s');
  await expect(first).toHaveClass(/is-selected/);

  await page.keyboard.press('Enter');
  await expect(page.locator('#edit-bookmark-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#edit-bookmark-modal')).toBeHidden();

  await grid.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowRight');
  await expect(second).toHaveClass(/is-keyboard-active/);
  await expect(first).toHaveClass(/is-selected/);
});

test('does not move a selected bookmark until Tab navigation is disabled', async ({ page }) => {
  await enableEditMode(page);
  const grid = page.locator('#bookmark-container');
  const first = page.locator('#bookmark-container > .bookmark[data-bookmark-id]').first();
  const gridBox = await grid.boundingBox();

  await first.click();
  await expect(first).toHaveClass(/is-selected/);
  await grid.focus();
  await page.keyboard.press('Tab');
  await expect(first).toHaveClass(/is-keyboard-active/);

  const start = await first.boundingBox();
  await page.keyboard.press('ArrowDown');
  await page.waitForTimeout(100);
  await expect.poll(async () => (await first.boundingBox()).y)
    .toBeCloseTo(start.y, 0);

  await page.keyboard.press('Tab');
  await expect(page.locator('.bookmark.is-keyboard-active')).toHaveCount(0);
  await page.keyboard.press('ArrowDown');
  await expect.poll(async () => (await first.boundingBox()).y)
    .toBeCloseTo(start.y + gridBox.height / 6, 0);
  await expect(first).toHaveClass(/is-selected/);
});

test('navigates folders and opens them according to the current edit mode', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Keyboard folder');
  await page.getByRole('button', { name: 'Accept' }).click();

  const grid = page.locator('#bookmark-container');
  const folder = page.locator('.bookmark-folder', { hasText: 'Keyboard folder' });
  await grid.focus();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await expect(folder).toHaveClass(/is-keyboard-active/);

  await page.keyboard.press('Enter');
  await expect(page.locator('#folder-modal')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#folder-modal')).toBeHidden();

  await enableEditMode(page);
  await expect(grid).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('ArrowDown');
  await expect(folder).toHaveClass(/is-keyboard-active/);

  await page.keyboard.press('s');
  await expect(folder).toHaveClass(/is-keyboard-selection-blocked/);
  await expect(page.locator('.bookmark.is-selected')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(page.locator('#edit-folder-modal')).toBeVisible();
});

test('prefers the item aligned with the active grid column', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Column folder');
  await page.getByRole('button', { name: 'Accept' }).click();
  await createBookmark(page, 'Directly below', 'below.test');
  await createBookmark(page, 'Left below', 'left-below.test');

  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(entry => entry.name === 'Column folder');
    const below = stored.bookmarks.find(entry => entry.name === 'Directly below');
    const leftBelow = stored.bookmarks.find(entry => entry.name === 'Left below');

    Object.assign(stored.bookmarks[0], { gx: 0, gy: 3 });
    Object.assign(stored.bookmarks[1], { gx: 1, gy: 3 });
    Object.assign(folder, { gx: 5, gy: 0 });
    Object.assign(below, { gx: 5, gy: 1 });
    Object.assign(leftBelow, { gx: 4, gy: 1 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();

  await page.locator('#bookmark-container').focus();
  await page.keyboard.press('Tab');
  await expect(page.locator('.bookmark-folder', { hasText: 'Column folder' }))
    .toHaveClass(/is-keyboard-active/);
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.bookmark', { hasText: 'Directly below' }))
    .toHaveClass(/is-keyboard-active/);
});

test('skips occupied cells to the next free gap with arrow keys in none mode', async ({ page }) => {
  await setBookmarkDragMode(page, 'none');
  await createBookmark(page, 'Arrow blocker', 'arrow-blocker.test');
  await enableEditMode(page);
  const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
  const first = bookmarks.nth(0);
  const selected = bookmarks.nth(1);
  const blocker = bookmarks.nth(2);
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const firstStart = await first.boundingBox();

  await moveGridItemByCells(page, selected, 2, 0);
  await moveGridItemByCells(page, blocker, 2, -1);
  const selectedStart = await selected.boundingBox();

  await selected.click();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await selected.boundingBox()).x)
    .toBeCloseTo(selectedStart.x - gridBox.width / 12 * 2, 0);
  await expect.poll(async () => (await first.boundingBox()).x)
    .toBeCloseTo(firstStart.x, 0);

  const freeGap = await selected.boundingBox();
  await page.keyboard.press('ArrowLeft');
  await expect.poll(async () => (await selected.boundingBox()).x)
    .toBeCloseTo(freeGap.x, 0);

  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => (await selected.boundingBox()).x)
    .toBeCloseTo(selectedStart.x, 0);
  await expect(selected).toHaveClass(/is-selected/);
});

for (const mode of ['relocate', 'cascade']) {
  test(`moves a single selection one occupied cell at a time in ${mode} mode`, async ({ page }) => {
    await setBookmarkDragMode(page, mode);
    await enableEditMode(page);
    const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
    const selected = bookmarks.nth(0);
    const neighbor = bookmarks.nth(1);
    const selectedStart = await selected.boundingBox();
    const neighborStart = await neighbor.boundingBox();

    await selected.click();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await selected.boundingBox()).x)
      .toBeCloseTo(neighborStart.x, 0);
    await expect.poll(async () => (await neighbor.boundingBox()).x)
      .toBeCloseTo(selectedStart.x, 0);
    await expect(selected).toHaveClass(/is-selected/);

    await neighbor.click();
    const selectedBeforeMultiple = await selected.boundingBox();
    const neighborBeforeMultiple = await neighbor.boundingBox();
    await page.keyboard.press('ArrowRight');
    await expect.poll(async () => (await selected.boundingBox()).x)
      .toBeCloseTo(selectedBeforeMultiple.x, 0);
    await expect.poll(async () => (await neighbor.boundingBox()).x)
      .toBeCloseTo(neighborBeforeMultiple.x, 0);
  });
}

test('turns cascades across rows and persists the whole path atomically', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  await setBookmarkDragMode(page, 'cascade');
  await createBookmark(page, 'Chain one', 'chain-one.test');
  await createBookmark(page, 'Chain two', 'chain-two.test');
  await enableEditMode(page);
  const grid = page.locator('#bookmark-container');
  const bookmarks = page.locator('.bookmark[data-bookmark-id]');
  await moveGridItemByCells(page, bookmarks.nth(2), 2, -1);
  await moveGridItemByCells(page, bookmarks.nth(3), 3, -2);
  const displaced = [bookmarks.nth(0), bookmarks.nth(1), bookmarks.nth(2)];
  const dragged = bookmarks.nth(3);
  const gridBox = await grid.boundingBox();
  const starts = await Promise.all([
    ...displaced.map(bookmark => bookmark.boundingBox()),
    dragged.boundingBox()
  ]);
  const draggedStart = starts[3];
  const cellWidth = gridBox.width / 12;
  const cellHeight = gridBox.height / 6;
  const pointerStart = {
    x: draggedStart.x + draggedStart.width / 2,
    y: draggedStart.y + draggedStart.height / 2
  };

  await page.mouse.move(pointerStart.x, pointerStart.y);
  await page.mouse.down();
  await expect(dragged).not.toHaveClass(/is-dragging/);
  await page.mouse.move(pointerStart.x - 6, pointerStart.y);
  await expect(dragged).toHaveClass(/is-dragging/);
  await page.mouse.move(pointerStart.x - cellWidth * 3, pointerStart.y, { steps: 12 });

  expect(pageErrors).toEqual([]);
  await expect(dragged).not.toHaveClass(/is-invalid/);
  for (const bookmark of displaced) await expect(bookmark).toHaveClass(/is-smart-displaced/);
  for (let index = 0; index < displaced.length; index += 1) {
    await expect.poll(async () => (await displaced[index].boundingBox()).x)
      .toBeCloseTo(starts[index + 1].x, 0);
  }
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(starts[0].x, 0);

  await page.mouse.move(
    pointerStart.x - cellWidth * 3,
    pointerStart.y + cellHeight,
    { steps: 10 }
  );

  for (let index = 0; index < displaced.length; index += 1) {
    await expect(displaced[index]).not.toHaveClass(/is-smart-displaced/);
    await expect.poll(async () => (await displaced[index].boundingBox()).x)
      .toBeCloseTo(starts[index].x, 0);
  }
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(starts[0].x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).y)
    .toBeCloseTo(draggedStart.y + cellHeight, 0);

  await page.mouse.move(pointerStart.x - cellWidth * 3, pointerStart.y, { steps: 12 });
  await expect(displaced[0]).toHaveClass(/is-smart-displaced/);
  await expect(displaced[1]).not.toHaveClass(/is-smart-displaced/);
  await expect(displaced[2]).not.toHaveClass(/is-smart-displaced/);
  await expect.poll(async () => (await displaced[0].boundingBox()).y)
    .toBeCloseTo(starts[0].y + cellHeight, 0);
  for (let index = 1; index < displaced.length; index += 1) {
    await expect.poll(async () => (await displaced[index].boundingBox()).x)
      .toBeCloseTo(starts[index].x, 0);
  }

  await page.mouse.move(
    pointerStart.x - cellWidth * 2,
    pointerStart.y,
    { steps: 8 }
  );
  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect(displaced[0]).toHaveClass(/is-smart-displaced/);
  await expect(displaced[1]).toHaveClass(/is-smart-displaced/);
  await expect(displaced[2]).not.toHaveClass(/is-smart-displaced/);
  await expect.poll(async () => (await displaced[1].boundingBox()).x)
    .toBeCloseTo(starts[0].x, 0);

  await page.mouse.move(
    pointerStart.x - cellWidth,
    pointerStart.y,
    { steps: 8 }
  );
  await expect(dragged).not.toHaveClass(/is-invalid/);
  for (const bookmark of displaced) await expect(bookmark).toHaveClass(/is-smart-displaced/);
  await expect.poll(async () => (await displaced[2].boundingBox()).x)
    .toBeCloseTo(starts[1].x, 0);
  await page.mouse.up();

  await expect.poll(async () => (await displaced[0].boundingBox()).y)
    .toBeCloseTo(starts[0].y + cellHeight, 0);
  await expect.poll(async () => (await displaced[1].boundingBox()).x)
    .toBeCloseTo(starts[0].x, 0);
  await expect.poll(async () => (await displaced[2].boundingBox()).x)
    .toBeCloseTo(starts[1].x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(starts[2].x, 0);

  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
  await expect.poll(async () => (await displaced[0].boundingBox()).y)
    .toBeCloseTo(starts[0].y + cellHeight, 0);
  await expect.poll(async () => (await displaced[1].boundingBox()).x)
    .toBeCloseTo(starts[0].x, 0);
  await expect.poll(async () => (await displaced[2].boundingBox()).x)
    .toBeCloseTo(starts[1].x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(starts[2].x, 0);
});

test('defaults to none, warns about sequence, and persists drag modes', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();

  const cascade = page.locator('input[name="bookmark-drag-mode"][value="cascade"]');
  const relocate = page.locator('input[name="bookmark-drag-mode"][value="relocate"]');
  const none = page.locator('input[name="bookmark-drag-mode"][value="none"]');
  expect(await page.locator('input[name="bookmark-drag-mode"]').evaluateAll(
    inputs => inputs.map(input => input.value)
  )).toEqual(['none', 'relocate', 'cascade']);
  await expect(none).toBeChecked();
  await expect(relocate).not.toBeChecked();
  await expect(cascade).not.toBeChecked();
  await expect(page.getByText('Experimental · May contain minor bugs.')).toBeVisible();
  await cascade.check();
  await page.locator('#settings-modal-save').click();
  await expect(page.locator('#settings-modal')).toBeHidden();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await expect(cascade).toBeChecked();
  await relocate.check();
  await page.locator('#settings-modal-save').click();
  await expect(page.locator('#settings-modal')).toBeHidden();

  await createBookmark(page, 'Relocate me', 'relocate.test');
  await enableEditMode(page);
  const bookmarks = page.locator('.bookmark[data-bookmark-id]');
  await moveGridItemByCells(page, bookmarks.nth(2), 2, -1);
  const target = bookmarks.nth(0);
  const middle = bookmarks.nth(1);
  const dragged = bookmarks.nth(2);
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const [targetStart, middleStart, draggedStart] = await Promise.all([
    target.boundingBox(),
    middle.boundingBox(),
    dragged.boundingBox()
  ]);
  const pointerStart = {
    x: draggedStart.x + draggedStart.width / 2,
    y: draggedStart.y + draggedStart.height / 2
  };

  await page.mouse.move(pointerStart.x, pointerStart.y);
  await page.mouse.down();
  await expect(dragged).not.toHaveClass(/is-dragging/);
  await page.mouse.move(pointerStart.x - 6, pointerStart.y);
  await expect(dragged).toHaveClass(/is-dragging/);
  await page.mouse.move(pointerStart.x - gridBox.width / 6, pointerStart.y, { steps: 10 });

  await expect(target).toHaveClass(/is-smart-displaced/);
  await expect(middle).not.toHaveClass(/is-smart-displaced/);
  await expect.poll(async () => (await target.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await expect.poll(async () => (await middle.boundingBox()).x)
    .toBeCloseTo(middleStart.x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(targetStart.x, 0);
  await page.mouse.up();
});

test('none drag mode rejects an occupied cell and restores the source', async ({ page }) => {
  await setBookmarkDragMode(page, 'none');
  await enableEditMode(page);

  const bookmarks = page.locator('.bookmark[data-bookmark-id]');
  const occupied = bookmarks.nth(0);
  const dragged = bookmarks.nth(1);
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const occupiedStart = await occupied.boundingBox();
  const draggedStart = await dragged.boundingBox();
  const pointer = {
    x: draggedStart.x + draggedStart.width / 2,
    y: draggedStart.y + draggedStart.height / 2
  };

  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await page.mouse.move(pointer.x - gridBox.width / 12, pointer.y, { steps: 8 });

  await expect(dragged).toHaveClass(/is-invalid/);
  await expect.poll(async () => (await occupied.boundingBox()).x)
    .toBeCloseTo(occupiedStart.x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await page.mouse.up();

  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await page.reload();
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
});

test('restores the source after a swap and inserts through the released cell', async ({ page }) => {
  await setBookmarkDragMode(page, 'cascade');
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Barrier');
  await page.getByRole('button', { name: 'Accept' }).click();
  await createBookmark(page, 'Dragged', 'dragged.test');
  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const draggedBookmark = stored.bookmarks.find(bookmark => bookmark.name === 'Dragged');
    const barrierFolder = stored.folders.find(folder => folder.name === 'Barrier');

    Object.assign(stored.bookmarks[0], { gx: 2, gy: 1 });
    Object.assign(stored.bookmarks[1], { gx: 3, gy: 1 });
    Object.assign(draggedBookmark, { gx: 6, gy: 1 });
    Object.assign(barrierFolder, { gx: 4, gy: 0, w: 2, h: 2 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();
  await expect(page.getByRole('link', { name: /Dragged/ })).toBeVisible();
  await enableEditMode(page);

  const grid = page.locator('#bookmark-container');
  const bookmarks = page.locator('.bookmark[data-bookmark-id]');
  const first = bookmarks.nth(0);
  const second = bookmarks.nth(1);
  const dragged = bookmarks.nth(2);
  const folder = page.locator('.bookmark-folder', { hasText: 'Barrier' });
  const [gridBox, firstStart, secondStart, draggedStart] = await Promise.all([
    grid.boundingBox(),
    first.boundingBox(),
    second.boundingBox(),
    dragged.boundingBox()
  ]);
  const folderStart = await folder.evaluate(element => ({
    left: element.offsetLeft,
    top: element.offsetTop
  }));
  const pointerStart = {
    x: draggedStart.x + draggedStart.width / 2,
    y: draggedStart.y + draggedStart.height / 2
  };

  await page.mouse.move(pointerStart.x, pointerStart.y);
  await page.mouse.down();
  await page.mouse.move(
    secondStart.x + secondStart.width / 2,
    secondStart.y + secondStart.height / 2,
    { steps: 10 }
  );
  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await second.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await expect.poll(async () => (await first.boundingBox()).x)
    .toBeCloseTo(firstStart.x, 0);

  await page.mouse.move(pointerStart.x, pointerStart.y, { steps: 10 });
  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await expect.poll(async () => (await second.boundingBox()).x)
    .toBeCloseTo(secondStart.x, 0);
  await expect.poll(async () => (await first.boundingBox()).x)
    .toBeCloseTo(firstStart.x, 0);

  await page.mouse.move(
    secondStart.x + secondStart.width / 2,
    secondStart.y + secondStart.height / 2,
    { steps: 10 }
  );
  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await second.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);

  await page.mouse.move(
    firstStart.x + firstStart.width / 2,
    firstStart.y + firstStart.height / 2,
    { steps: 8 }
  );
  await expect(dragged).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await second.boundingBox()).x)
    .toBeCloseTo(draggedStart.x, 0);
  await expect.poll(async () => (await first.boundingBox()).x)
    .toBeCloseTo(secondStart.x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(firstStart.x, 0);

  await page.mouse.move(
    pointerStart.x + gridBox.width / 12,
    pointerStart.y,
    { steps: 12 }
  );
  await expect.poll(async () => (await first.boundingBox()).x)
    .toBeCloseTo(firstStart.x, 0);
  await expect.poll(async () => (await second.boundingBox()).x)
    .toBeCloseTo(secondStart.x, 0);
  await expect.poll(async () => (await dragged.boundingBox()).x)
    .toBeCloseTo(draggedStart.x + gridBox.width / 12, 0);
  await expect.poll(() => folder.evaluate(element => element.offsetLeft))
    .toBe(folderStart.left);
  await expect.poll(() => folder.evaluate(element => element.offsetTop))
    .toBe(folderStart.top);
  await page.mouse.up();
});

test('keeps a wide folder collision-free across consecutive sequence steps', async ({ page }) => {
  await setBookmarkDragMode(page, 'cascade');
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Wide folder');
  await page.getByRole('button', { name: 'Accept' }).click();
  await createBookmark(page, 'Test', 'test.example');
  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Wide folder');
    const testBookmark = stored.bookmarks.find(item => item.name === 'Test');

    stored.bookmarks
      .filter(item => item.id !== testBookmark.id)
      .forEach((item, index) => Object.assign(item, { gx: 6 + index, gy: 3 }));
    Object.assign(folder, { gx: 0, gy: 0, w: 2, h: 2 });
    Object.assign(testBookmark, { gx: 2, gy: 0, w: 1, h: 1 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();
  await enableEditMode(page);

  const folder = page.locator('.bookmark-folder', { hasText: 'Wide folder' });
  const testBookmark = page.locator('.bookmark[data-bookmark-id]', { hasText: 'Test' });
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const cellWidth = gridBox.width / 12;
  const initialFolder = await folder.boundingBox();
  const initialBookmark = await testBookmark.boundingBox();
  const pointer = {
    x: initialFolder.x + initialFolder.width * .75,
    y: initialFolder.y + initialFolder.height / 2
  };

  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await page.mouse.move(pointer.x + cellWidth, pointer.y, { steps: 8 });
  await expect.poll(async () => (await testBookmark.boundingBox()).x)
    .toBeCloseTo(initialFolder.x, 0);

  await page.mouse.move(pointer.x + cellWidth * 2, pointer.y, { steps: 8 });
  const secondStepFolder = await folder.boundingBox();
  const secondStepBookmark = await testBookmark.boundingBox();

  expect(secondStepFolder.x).toBeCloseTo(initialFolder.x + cellWidth * 2, 0);
  expect(secondStepFolder.width).toBeCloseTo(initialFolder.width, 0);
  expect(secondStepBookmark.x).toBeCloseTo(initialFolder.x, 0);
  expect(secondStepBookmark.x + secondStepBookmark.width)
    .toBeLessThanOrEqual(secondStepFolder.x);

  await page.mouse.move(pointer.x + cellWidth * 3, pointer.y, { steps: 8 });
  await expect.poll(async () => (await testBookmark.boundingBox()).x)
    .toBeCloseTo(initialBookmark.x, 0);
  await page.mouse.up();
});

test('keeps a relocated bookmark still while a wide folder continues moving', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Relocating folder');
  await page.getByRole('button', { name: 'Accept' }).click();
  await createBookmark(page, 'Test', 'test.example');
  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Relocating folder');
    const testBookmark = stored.bookmarks.find(item => item.name === 'Test');

    stored.settings.bookmarkDragMode = 'relocate';
    stored.bookmarks
      .filter(item => item.id !== testBookmark.id)
      .forEach((item, index) => Object.assign(item, { gx: 7 + index, gy: 4 }));
    Object.assign(folder, { gx: 0, gy: 0, w: 2, h: 2 });
    Object.assign(testBookmark, { gx: 2, gy: 0, w: 1, h: 1 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();
  await enableEditMode(page);

  const grid = page.locator('#bookmark-container');
  const folder = page.locator('.bookmark-folder', { hasText: 'Relocating folder' });
  const testBookmark = page.locator('.bookmark[data-bookmark-id]', { hasText: 'Test' });
  const gridBox = await grid.boundingBox();
  const folderStart = await folder.boundingBox();
  const bookmarkStart = await testBookmark.boundingBox();
  const cellWidth = gridBox.width / 12;
  const cellHeight = gridBox.height / 6;
  const pointer = {
    x: folderStart.x + folderStart.width * .75,
    y: folderStart.y + folderStart.height / 2
  };

  await page.mouse.move(pointer.x, pointer.y);
  await page.mouse.down();
  await expect(folder).not.toHaveClass(/is-dragging/);
  await page.mouse.move(pointer.x + 6, pointer.y);
  await expect(folder).toHaveClass(/is-dragging/);
  await page.mouse.move(pointer.x + cellWidth, pointer.y, { steps: 8 });
  await expect(folder).not.toHaveClass(/is-invalid/);
  await expect.poll(async () => (await folder.boundingBox()).x)
    .toBeCloseTo(folderStart.x + cellWidth, 0);
  await expect.poll(async () => (await testBookmark.boundingBox()).x)
    .toBeCloseTo(folderStart.x, 0);
  const relocated = await testBookmark.boundingBox();
  expect(relocated.x + relocated.width)
    .toBeLessThanOrEqual((await folder.boundingBox()).x);

  await page.mouse.move(
    pointer.x + cellWidth * 2,
    pointer.y,
    { steps: 8 }
  );
  await expect.poll(async () => (await testBookmark.boundingBox()).x)
    .toBeCloseTo(relocated.x, 0);
  await expect.poll(async () => (await testBookmark.boundingBox()).y)
    .toBeCloseTo(relocated.y, 0);

  await page.mouse.move(
    pointer.x + cellWidth * 2,
    pointer.y + cellHeight,
    { steps: 8 }
  );
  await expect.poll(async () => (await testBookmark.boundingBox()).x)
    .toBeCloseTo(bookmarkStart.x, 0);
  await expect.poll(async () => (await testBookmark.boundingBox()).y)
    .toBeCloseTo(bookmarkStart.y, 0);
  await page.mouse.up();
});

test('resizes one cell on handle click and ignores blocked directions', async ({ page }) => {
  await enableEditMode(page);
  const grid = page.locator('#bookmark-container');
  const bookmark = page.locator('.bookmark[data-bookmark-id]').nth(1);
  const gridBox = await grid.boundingBox();
  const initialBox = await bookmark.boundingBox();
  const cellWidth = gridBox.width / 12;
  const cellHeight = gridBox.height / 6;

  await bookmark.locator('.resizer.bottom-right').click();
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(initialBox.width + cellWidth, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(initialBox.height + cellHeight, 0);

  const grownBox = await bookmark.boundingBox();
  await bookmark.locator('.resizer.left').click();
  await expect.poll(async () => (await bookmark.boundingBox()).x)
    .toBeCloseTo(grownBox.x, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(grownBox.width, 0);

  await page.reload();
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(grownBox.width, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(grownBox.height, 0);
});

test('shrinks width and height one cell with Shift plus resize click', async ({ page }) => {
  await enableEditMode(page);
  const bookmark = page.locator('.bookmark[data-bookmark-id]').nth(1);
  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const cellWidth = gridBox.width / 12;
  const cellHeight = gridBox.height / 6;
  const initialBox = await bookmark.boundingBox();

  await bookmark.locator('.resizer.bottom-right').click();
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(initialBox.width + cellWidth, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(initialBox.height + cellHeight, 0);

  await bookmark.locator('.resizer.right').click({ modifiers: ['Shift'] });
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(initialBox.width, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(initialBox.height + cellHeight, 0);

  await bookmark.locator('.resizer.bottom').click({ modifiers: ['Shift'] });
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(initialBox.width, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(initialBox.height, 0);

  await bookmark.locator('.resizer.top-left').click({ modifiers: ['Shift'] });
  await expect.poll(async () => (await bookmark.boundingBox()).width)
    .toBeCloseTo(initialBox.width, 0);
  await expect.poll(async () => (await bookmark.boundingBox()).height)
    .toBeCloseTo(initialBox.height, 0);
});

test('resizes smoothly from corners, snaps to the grid and rejects collisions', async ({ page }) => {
  await enableEditMode(page);
  const grid = page.locator('#bookmark-container');
  const bookmark = page.locator('.bookmark[data-bookmark-id]').nth(1);
  const indicator = bookmark.locator('.resize-indicator');
  const gridBox = await grid.boundingBox();
  const initialBox = await bookmark.boundingBox();
  const cellWidth = gridBox.width / 12;
  const cellHeight = gridBox.height / 6;

  const cornerHandle = bookmark.locator('.resizer.top-left');
  const cornerDecoration = await cornerHandle.evaluate((handle) => {
    const handleStyle = getComputedStyle(handle);
    const decoration = getComputedStyle(handle, '::before');
    return {
      background: handleStyle.backgroundColor,
      inset: { top: handleStyle.top, left: handleStyle.left },
      size: { width: handleStyle.width, height: handleStyle.height },
      top: decoration.borderTopWidth,
      right: decoration.borderRightWidth,
      bottom: decoration.borderBottomWidth,
      left: decoration.borderLeftWidth
    };
  });
  expect(cornerDecoration).toEqual({
    background: 'rgba(15, 23, 42, 0.88)',
    inset: { top: '-5px', left: '-5px' },
    size: { width: '14px', height: '14px' },
    top: '2px',
    right: '0px',
    bottom: '0px',
    left: '2px'
  });

  const sideDecoration = await bookmark.locator('.resizer.left').evaluate((handle) => {
    const handleStyle = getComputedStyle(handle);
    const decoration = getComputedStyle(handle, '::before');
    return {
      background: handleStyle.backgroundColor,
      size: { width: handleStyle.width, height: handleStyle.height },
      mark: { width: decoration.width, background: decoration.backgroundColor }
    };
  });
  expect(sideDecoration).toEqual({
    background: cornerDecoration.background,
    size: { width: '10px', height: '22px' },
    mark: { width: '2px', background: 'rgb(248, 250, 252)' }
  });

  const neighboringCorner = page.locator('.bookmark[data-bookmark-id]').first()
    .locator('.resizer.top-right');
  const neighboringSide = page.locator('.bookmark[data-bookmark-id]').first()
    .locator('.resizer.right');
  const [leftCornerBox, rightCornerBox, leftSideBox, rightSideBox, editBox] = await Promise.all([
    neighboringCorner.boundingBox(),
    cornerHandle.boundingBox(),
    neighboringSide.boundingBox(),
    bookmark.locator('.resizer.left').boundingBox(),
    bookmark.getByRole('button', { name: 'Edit bookmark' }).boundingBox()
  ]);
  expect(Math.abs(leftCornerBox.x + leftCornerBox.width - rightCornerBox.x)).toBeLessThan(1);
  expect(Math.abs(leftSideBox.x + leftSideBox.width - rightSideBox.x)).toBeLessThan(1);
  expect(rightCornerBox.x + rightCornerBox.width).toBeLessThan(editBox.x);

  const firstBookmark = page.locator('.bookmark[data-bookmark-id]').first();
  const firstInitialBox = await firstBookmark.boundingBox();
  const invalidAfterValidHandle = await firstBookmark
    .locator('.resizer.bottom-right')
    .boundingBox();
  const invalidAfterValidStart = {
    x: invalidAfterValidHandle.x + invalidAfterValidHandle.width / 2,
    y: invalidAfterValidHandle.y + invalidAfterValidHandle.height / 2
  };
  await page.mouse.move(invalidAfterValidStart.x, invalidAfterValidStart.y);
  await page.mouse.down();
  await page.mouse.move(
    invalidAfterValidStart.x,
    invalidAfterValidStart.y + cellHeight * .8,
    { steps: 5 }
  );
  await expect(firstBookmark.locator('.resize-indicator')).toHaveText('1 × 2');
  await expect(firstBookmark).not.toHaveClass(/is-invalid/);
  await page.mouse.move(
    invalidAfterValidStart.x + cellWidth * .8,
    invalidAfterValidStart.y + cellHeight * .8,
    { steps: 5 }
  );
  await expect(firstBookmark).toHaveClass(/is-invalid/);
  await page.mouse.up();

  const firstRevertedBox = await firstBookmark.boundingBox();
  expect(Math.abs(firstRevertedBox.width - firstInitialBox.width)).toBeLessThan(2);
  expect(Math.abs(firstRevertedBox.height - firstInitialBox.height)).toBeLessThan(2);

  const blockedHandleBox = await bookmark.locator('.resizer.bottom-left').boundingBox();
  const blockedStart = {
    x: blockedHandleBox.x + blockedHandleBox.width / 2,
    y: blockedHandleBox.y + blockedHandleBox.height / 2
  };
  await page.mouse.move(blockedStart.x, blockedStart.y);
  await page.mouse.down();
  await page.mouse.move(
    blockedStart.x - cellWidth * .7,
    blockedStart.y + cellHeight * .7,
    { steps: 8 }
  );
  await expect(bookmark).toHaveClass(/is-invalid/);
  await expect(indicator).toHaveText('2 × 2');
  await page.mouse.up();

  await expect(bookmark).not.toHaveClass(/is-invalid/);
  const revertedBox = await bookmark.boundingBox();
  expect(Math.abs(revertedBox.width - initialBox.width)).toBeLessThan(2);
  expect(Math.abs(revertedBox.height - initialBox.height)).toBeLessThan(2);

  const resizeHandleBox = await bookmark.locator('.resizer.bottom-right').boundingBox();
  const resizeStart = {
    x: resizeHandleBox.x + resizeHandleBox.width / 2,
    y: resizeHandleBox.y + resizeHandleBox.height / 2
  };
  await page.mouse.move(resizeStart.x, resizeStart.y);
  await page.mouse.down();
  await page.mouse.move(
    resizeStart.x + cellWidth * .35,
    resizeStart.y + cellHeight * .35,
    { steps: 5 }
  );
  await page.waitForTimeout(50);

  const continuousBox = await bookmark.boundingBox();
  expect(continuousBox.width).toBeGreaterThan(initialBox.width + cellWidth * .25);
  expect(continuousBox.width).toBeLessThan(initialBox.width + cellWidth * .5);
  await expect(indicator).toHaveText('1 × 1');

  await page.mouse.move(
    resizeStart.x + cellWidth * .8,
    resizeStart.y + cellHeight * .8,
    { steps: 7 }
  );
  await expect(indicator).toHaveText('2 × 2');
  await expect(bookmark).not.toHaveClass(/is-invalid/);
  await page.mouse.up();

  const resizedBox = await bookmark.boundingBox();
  expect(resizedBox.width).toBeGreaterThan(initialBox.width + cellWidth * .9);
  expect(resizedBox.height).toBeGreaterThan(initialBox.height + cellHeight * .9);

  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
  const persistedBox = await page.locator('.bookmark[data-bookmark-id]').nth(1).boundingBox();
  expect(Math.abs(persistedBox.width - resizedBox.width)).toBeLessThan(2);
  expect(Math.abs(persistedBox.height - resizedBox.height)).toBeLessThan(2);
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
  await newBookmark.getByRole('button', { name: 'Edit bookmark' }).click();
  await page.locator('#bookmark-modal-form-name').fill('OpenAI Docs');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('link', { name: /OpenAI Docs/ })).toBeVisible();
});

test('expands and collapses compact bookmark creation without losing the draft', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();

  const modal = page.locator('#edit-bookmark-modal');
  const card = modal.locator('.modal-card');
  const tabs = modal.locator('.edit-bookmark-modal-tabs');
  const preview = modal.locator('.edit-bookmark-modal-preview-panel');
  const expand = modal.getByRole('button', { name: '⚙ Advanced options' });

  await expect(modal).toHaveClass(/is-add-compact/);
  await expect(expand).toHaveAttribute('aria-expanded', 'false');
  await expect(tabs).toHaveCSS('opacity', '0');
  await expect(tabs).toHaveCSS('visibility', 'hidden');
  await expect(tabs).toHaveAttribute('aria-hidden', 'true');
  await expect(preview).toHaveCSS('opacity', '0');
  await expect(preview).toHaveCSS('visibility', 'hidden');
  await expect(preview).toHaveAttribute('aria-hidden', 'true');
  await expect(card).toHaveCSS('width', '420px');
  expect(await card.evaluate(element => getComputedStyle(element).transitionProperty))
    .toContain('width');

  await page.locator('#bookmark-modal-form-name').fill('Animated draft');
  await page.locator('#bookmark-modal-form-url').fill('animated.example');
  await expand.click();

  await expect(modal).not.toHaveClass(/is-add-compact/);
  const collapse = modal.getByRole('button', { name: '▴ Compact view' });
  await expect(collapse).toHaveAttribute('aria-expanded', 'true');
  await expect(tabs).toHaveCSS('opacity', '1');
  await expect(tabs).toHaveCSS('visibility', 'visible');
  await expect(tabs).not.toHaveAttribute('aria-hidden');
  await expect(preview).toHaveCSS('opacity', '1');
  await expect(preview).toHaveCSS('visibility', 'visible');
  await expect(preview).not.toHaveAttribute('aria-hidden');
  await expect.poll(async () => (await card.boundingBox()).width)
    .toBeGreaterThan(670);
  await expect(page.locator('#bookmark-modal-form-name')).toBeFocused();
  await expect(page.locator('#bookmark-modal-form-name')).toHaveValue('Animated draft');
  await expect(page.locator('#bookmark-modal-form-url')).toHaveValue('animated.example');

  await collapse.click();
  await expect(modal).toHaveClass(/is-add-compact/);
  await expect(card).toHaveCSS('width', '420px');
  await expect(page.locator('#bookmark-modal-form-name')).toBeFocused();
  await expect(page.locator('#bookmark-modal-form-name')).toHaveValue('Animated draft');
  await expect(page.locator('#bookmark-modal-form-url')).toHaveValue('animated.example');
});

test('closes an untouched bookmark draft without confirmation', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();

  const editor = page.locator('#edit-bookmark-modal');
  const alert = page.locator('#alert-modal');
  await editor.getByRole('button', { name: 'Cancel' }).click();

  await expect(editor).toBeHidden();
  await expect(alert).toBeHidden();

  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();
  await page.locator('#bookmark-modal-form-name').fill('Unsaved draft');
  await editor.getByRole('button', { name: 'Cancel' }).click();

  await expect(alert).toBeVisible();
  await expect(page.locator('#alert-modal-title')).toHaveText('Discard new bookmark?');
  await alert.getByRole('button', { name: 'Accept' }).click();
  await expect(editor).toBeHidden();
});

test('keeps bookmark editor actions inside the modal on content-heavy tabs', async ({ page }) => {
  await page.setViewportSize({ width: 822, height: 525 });
  await revealSideDock(page);
  await page.getByRole('button', { name: '➕' }).click();

  const modal = page.locator('#edit-bookmark-modal .modal-card');
  await page.getByRole('button', { name: '⚙ Advanced options' }).click();
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

  const bookmarkSections = page.locator('#settings-modal-tab-bookmark > section');
  await expect(bookmarkSections.nth(0)).toHaveClass(/default-bookmark-settings/);
  await expect(bookmarkSections.nth(1)).toHaveClass(/bookmark-drag-settings/);
  await expect(page.locator('#settings-bookmark-form-host')).toHaveCount(0);
  await page.getByRole('button', { name: 'Configure default bookmark' }).click();

  const editor = page.locator('#edit-bookmark-modal');
  await expect(editor.getByRole('heading', { name: 'Default bookmark appearance' })).toBeVisible();
  await expect(editor.getByRole('tab', { name: 'General' })).toHaveCount(0);
  await expect(editor.getByRole('tab', { name: 'Style' })).toHaveAttribute('aria-selected', 'true');
  await expect(editor.locator('.bookmark-title')).toHaveText('Default bookmark');
  await expect(editor.locator('.bookmark-favicon'))
    .toHaveAttribute('src', /assets\/icons\/icon-128\.png$/);

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

test('shows storage availability only for the selected mode', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();

  const usage = page.locator('[data-storage-usage-active]');
  const summary = page.locator('#storage-usage-summary');
  await expect(usage).toHaveAttribute('data-storage-usage', 'local');
  await expect(page.locator('#storage-usage-mode')).toHaveText('Local');
  await expect(summary).toContainText('of 10 MB');
  await expect(summary).toContainText('%');
  await expect(page.locator('#storage-usage-available')).toContainText('available');

  await page.getByRole('radio', { name: /Synced/ }).check();
  await expect(usage).toHaveAttribute('data-storage-usage', 'sync');
  await expect(page.locator('#storage-usage-mode')).toHaveText('Synced');
  await expect(summary).toContainText('of 100 KB');
  await expect(summary).toContainText('%');
  await expect(page.locator('#storage-usage-progress')).toHaveAttribute('value', /.+/);
});

test('localizes sync status and confirms synchronized data deletion', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();
  await page.getByRole('radio', { name: /Synced/ }).check();
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();

  const deleteSyncData = page.getByRole('button', { name: 'Delete synced data' });
  await expect(deleteSyncData).toBeEnabled();
  await expect(page.locator('#storage-sync-last-updated'))
    .toContainText('Last synchronized update:');

  await deleteSyncData.click();
  await expect(page.getByRole('heading', {
    name: /Delete all synchronized SpaceTab data/
  })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(deleteSyncData).toBeEnabled();

  await deleteSyncData.click();
  await page.getByRole('button', { name: 'Accept' }).click();

  await expect(page.getByRole('radio', { name: /This device only/ })).toBeChecked();
  await expect(page.locator('#storage-sync-last-updated'))
    .toHaveText('No synchronized SpaceTab data is stored.');
  await expect(deleteSyncData).toBeDisabled();
  await expect.poll(() => page.evaluate(() => (
    Object.keys(JSON.parse(sessionStorage.getItem('spacetab-test-sync') || '{}')).length
  ))).toBe(0);

  await page.getByRole('button', { name: '🌐 Languages' }).click();
  await page.locator('#language-select').selectOption('es');
  await page.getByRole('button', { name: '☁️ Sincronización' }).click();
  await expect(page.locator('#storage-persistence-status'))
    .toHaveText('Los datos están listos.');
  await expect(page.getByText('Data is ready.')).toHaveCount(0);
});

test('shows local bookmarks and locks sync when cloud data needs a newer version', async ({ page }) => {
  const futureSyncData = {
    schemaVersion: 4,
    bookmarks: [{
      id: 'future-bookmark',
      name: 'Future cloud bookmark',
      url: 'https://future.example'
    }],
    folders: [],
    settings: { language: 'en' }
  };
  const localData = {
    spacetabStorageMode: 'sync',
    schemaVersion: 3,
    bookmarks: [{
      id: 'local-bookmark',
      name: 'Available local bookmark',
      url: 'https://local.example'
    }],
    folders: [],
    settings: { language: 'en' }
  };

  await page.evaluate(({ local, synced }) => {
    sessionStorage.setItem('spacetab-test-local', JSON.stringify(local));
    sessionStorage.setItem('spacetab-test-sync', JSON.stringify(synced));
  }, { local: localData, synced: futureSyncData });
  await page.reload();

  await expect(page.getByRole('link', { name: /Available local bookmark/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Future cloud bookmark/ })).toHaveCount(0);
  await expect(page.getByText(/Sync was paused because the cloud data/)).toBeVisible();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();

  await expect(page.getByRole('radio', { name: /This device only/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Synced/ })).toBeDisabled();
  await expect(page.locator('#storage-sync-compatibility-notice')).toContainText(
    'Your synchronized data is safe and has not been modified'
  );
  await expect.poll(() => page.evaluate(() => {
    const synced = JSON.parse(sessionStorage.getItem('spacetab-test-sync') || '{}');
    return `${synced.schemaVersion}:${synced.bookmarks?.[0]?.id}`;
  })).toBe('4:future-bookmark');
});

test('blocks synchronized storage in Brave and explains why', async ({ page }) => {
  await page.goto('/tests/browser-harness.html?browser=brave');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '☁️ Sync' }).click();

  await expect(page.getByRole('radio', { name: /This device only/ })).toBeChecked();
  await expect(page.getByRole('radio', { name: /Synced/ })).toBeDisabled();
  await expect(page.getByText(/Unavailable in Brave/)).toBeVisible();
  await expect(page.locator('#storage-sync-existing-notice')).toBeHidden();
});

test('duplicates from the bulk toolbar and clears selection when edit mode closes', async ({ page }) => {
  await enableEditMode(page);
  const firstBookmark = page.locator('.bookmark[data-bookmark-id]').first();
  const controls = firstBookmark.getByRole('group', { name: 'Bookmark controls' });
  const editBox = await firstBookmark.getByRole('button', { name: 'Edit bookmark' }).boundingBox();
  const bookmarkBox = await firstBookmark.boundingBox();

  await expect(controls).toBeVisible();
  await expect(controls.getByRole('button')).toHaveCount(1);
  await expect(firstBookmark.getByRole('button', { name: 'Duplicate bookmark' })).toHaveCount(0);
  await expect(firstBookmark.getByRole('button', { name: 'Delete bookmark' })).toHaveCount(0);
  expect(editBox.x).toBeGreaterThan(bookmarkBox.x);
  expect(editBox.y).toBeGreaterThan(bookmarkBox.y);

  await firstBookmark.click();
  await page.getByRole('button', { name: 'Duplicate selection' }).click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY \(copy\)/ })).toBeVisible();

  const duplicatedBookmark = page.locator('.bookmark[data-bookmark-id]').last();
  await duplicatedBookmark.click();
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

test('opens the bookmark editor with middle click without opening a tab', async ({ page }) => {
  await enableEditMode(page);
  const bookmark = page.locator('#bookmark-container > .bookmark[data-bookmark-id]').first();
  const bulkActions = page.getByRole('toolbar', { name: 'Selected bookmark actions' });

  await bookmark.click({ button: 'middle' });

  await expect(page.locator('#edit-bookmark-modal')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Edit bookmark' })).toBeVisible();
  await expect(page.locator('#bookmark-modal-form-name')).toHaveValue('DEVELOPED BY');
  await expect(page.locator('.bookmark.is-selected')).toHaveCount(0);
  await expect(bulkActions).toBeHidden();
  await expect.poll(() => page.context().pages().length).toBe(1);
});

test('names a single bookmark before deletion and counts multiple selections', async ({ page }) => {
  await enableEditMode(page);
  const bookmarks = page.locator('#bookmark-container > .bookmark[data-bookmark-id]');
  const deleteSelection = page.getByRole('button', { name: 'Delete', exact: true });

  await bookmarks.nth(0).click();
  await deleteSelection.click();
  await expect(page.getByRole('heading', { name: 'Delete “DEVELOPED BY”?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();

  await bookmarks.nth(1).click();
  await deleteSelection.click();
  await expect(page.getByRole('heading', { name: 'Delete 2 selected bookmarks?' })).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
});

test('duplicates several selected bookmarks without overlaps', async ({ page }) => {
  await enableEditMode(page);
  const bookmarks = page.locator('.bookmark[data-bookmark-id]');

  await bookmarks.nth(0).click();
  await bookmarks.nth(1).click();
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
  await setBookmarkDragMode(page, 'relocate');
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Reading');
  await page.getByRole('button', { name: 'Accept' }).click();

  const folder = page.locator('.bookmark-folder', { hasText: 'Reading' });
  await expect(folder).toBeVisible();
  await expect(folder).toContainText('0 saved');

  await enableEditMode(page);
  await expect(folder.getByRole('group', { name: 'Folder controls' })).toBeVisible();
  await expect(folder.getByRole('button', { name: 'Customize folder' })).toBeVisible();
  await expect(folder.getByRole('button', { name: 'Delete folder' })).toBeVisible();
  await expect(folder.locator('.bookmark-action-menu, .bookmark-actions')).toHaveCount(0);
  await expect(folder.locator('.resizer')).toHaveCount(8);
  const bookmark = page.locator('.bookmark[data-bookmark-id]').first();
  const bookmarkStart = await bookmark.boundingBox();
  const folderStart = await folder.boundingBox();

  await moveGridItemByCells(page, folder, 0, -1);
  await expect.poll(async () => (await bookmark.boundingBox()).y)
    .toBeCloseTo(folderStart.y, 0);
  await expect.poll(async () => (await folder.boundingBox()).y)
    .toBeCloseTo(bookmarkStart.y, 0);

  const bookmarkBox = await bookmark.boundingBox();
  const folderBox = await folder.boundingBox();
  const folderGridPosition = await folder.evaluate(element => ({
    left: element.offsetLeft,
    top: element.offsetTop
  }));

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
  await expect.poll(() => folder.evaluate(element => element.offsetLeft))
    .toBe(folderGridPosition.left);
  await expect.poll(() => folder.evaluate(element => element.offsetTop))
    .toBe(folderGridPosition.top);
  await page.mouse.up();

  await expect(page.locator('.bookmark[data-bookmark-id]')).toHaveCount(1);
  await expect(page.locator('.bookmark-folder')).toContainText('1 saved');
  await expect.poll(() => folder.evaluate(element => element.offsetLeft))
    .toBe(folderGridPosition.left);
  await expect.poll(() => folder.evaluate(element => element.offsetTop))
    .toBe(folderGridPosition.top);

  const gridBox = await page.locator('#bookmark-container').boundingBox();
  const folderBeforeResize = await folder.boundingBox();
  const bottomHandle = await folder.locator('.resizer.bottom').boundingBox();
  const resizeStart = {
    x: bottomHandle.x + bottomHandle.width / 2,
    y: bottomHandle.y + bottomHandle.height / 2
  };
  await page.mouse.move(resizeStart.x, resizeStart.y);
  await page.mouse.down();
  await page.mouse.move(
    resizeStart.x,
    resizeStart.y + gridBox.height / 6 * .8,
    { steps: 8 }
  );
  await expect(folder.locator('.resize-indicator')).toHaveText('1 × 2');
  await page.mouse.up();

  const resizedFolderBox = await folder.boundingBox();
  expect(resizedFolderBox.height)
    .toBeGreaterThan(folderBeforeResize.height + gridBox.height / 6 * .9);

  await revealSideDock(page);
  await page.getByRole('button', { name: '🔒' }).click();
  await page.reload();

  const persistedFolder = page.locator('.bookmark-folder', { hasText: 'Reading' });
  await expect(persistedFolder).toContainText('1 saved');
  const persistedFolderBox = await persistedFolder.boundingBox();
  expect(Math.abs(persistedFolderBox.height - resizedFolderBox.height)).toBeLessThan(2);
  await persistedFolder.getByRole('button', { name: /Open Reading/ }).click();
  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
  const folderGrid = page.getByRole('list', { name: 'Folder bookmarks' });
  await expect(folderGrid).toBeVisible();
  await expect(folderGrid.getByRole('button')).toHaveCount(0);
  await expect(folderGrid.getByRole('link', { name: /DEVELOPED BY/ }))
    .toHaveCSS('cursor', 'pointer');

  await enableFolderEditMode(page);
  await page.getByRole('button', { name: /Move DEVELOPED BY out of the folder/ }).click();
  await expect(page.getByText('0 of 18 spaces used')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

test('customizes a folder from its miniature and persists the appearance', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('PokeMMO');
  await page.getByRole('button', { name: 'Accept' }).click();

  let folder = page.locator('.bookmark-folder', { hasText: 'PokeMMO' });
  await folder.getByRole('button', { name: /Open PokeMMO/ }).click();

  const folderModal = page.locator('#folder-modal');
  const editor = page.locator('#edit-folder-modal');
  const miniature = page.getByRole('button', { name: 'Customize folder' });
  await expect(miniature.locator('.folder-visual')).toBeVisible();
  await miniature.click();

  await expect(editor).toBeVisible();
  await expect(folderModal).toBeVisible();
  await page.locator('#folder-editor-name').fill('Games');
  await page.getByRole('tab', { name: 'Style' }).click();
  const imageInput = page.locator('#folder-editor-image');
  const imageLock = page.getByRole('button', { name: 'Lock or unlock image URL' });
  const imageCopy = page.getByRole('button', { name: 'Copy image URL' });
  const imageClear = page.getByRole('button', { name: 'Clear image URL' });
  await expect(imageLock).toBeHidden();
  await expect(imageCopy).toBeHidden();
  await expect(imageClear).toBeHidden();

  await imageInput.fill('https://images.test/folder.png');
  await expect(imageLock).toBeVisible();
  await expect(imageLock).toHaveText('🔓');
  await expect(imageCopy).toBeVisible();
  await expect(imageClear).toBeVisible();
  await imageLock.click();
  await expect(imageInput).toHaveJSProperty('readOnly', true);
  await expect(imageLock).toHaveText('🔒');
  await expect(imageCopy).toBeVisible();
  await expect(imageClear).toBeHidden();

  await imageLock.click();
  await expect(imageInput).toHaveJSProperty('readOnly', false);
  await expect(imageClear).toBeVisible();
  await imageClear.click();
  await expect(imageInput).toHaveValue('');
  await expect(imageLock).toBeHidden();
  await expect(imageCopy).toBeHidden();
  await expect(imageClear).toBeHidden();

  await imageInput.fill('https://images.test/folder.png');
  await imageLock.click();
  await page.locator('#folder-editor-color').fill('#ef4444');
  await page.getByRole('tab', { name: 'Text' }).click();
  await page.locator('#folder-editor-text-color').fill('#fef3c7');
  await expect(page.locator('.folder-editor-preview-card')).toContainText('Games');
  await page.locator('#edit-folder-modal-save').click();

  await expect(editor).toBeHidden();
  await expect(folderModal).toBeVisible();
  await expect(page.locator('#folder-modal-title')).toHaveText('Games');
  await expect(miniature).toHaveCSS('--folder-color', '#ef4444');
  await page.locator('#folder-modal-close').click();

  folder = page.locator('.bookmark-folder', { hasText: 'Games' });
  await expect(folder).toHaveCSS('--folder-color', '#ef4444');
  await expect(folder).toHaveCSS('--folder-text-color', '#fef3c7');
  await expect(folder.locator('.folder-body'))
    .toHaveCSS('background-color', 'rgb(239, 68, 68)');

  await page.reload();
  folder = page.locator('.bookmark-folder', { hasText: 'Games' });
  await expect(folder).toBeVisible();
  await expect(folder).toHaveCSS('--folder-color', '#ef4444');
  await folder.getByRole('button', { name: /Open Games/ }).click();
  await page.getByRole('button', { name: 'Customize folder' }).click();
  await page.getByRole('tab', { name: 'Style' }).click();
  await expect(page.locator('#folder-editor-image')).toHaveJSProperty('readOnly', true);
  await expect(page.getByRole('button', { name: 'Lock or unlock image URL' }))
    .toHaveText('🔒');
  await expect(page.getByRole('button', { name: 'Clear image URL' })).toBeHidden();

  const noBackground = page.locator('#folder-editor-no-background');
  await expect(noBackground).not.toBeChecked();
  await noBackground.check();
  await expect(page.locator('#folder-editor-color')).toBeDisabled();
  await expect(page.locator('.folder-editor-preview-card .folder-visual'))
    .toHaveClass(/is-folder-transparent/);
  await expect(page.locator('.folder-editor-preview-card .folder-visual'))
    .toHaveClass(/has-folder-bg-image/);
  await page.locator('#edit-folder-modal-save').click();

  await expect(editor).toBeHidden();
  await page.locator('#folder-modal-close').click();
  folder = page.locator('.bookmark-folder', { hasText: 'Games' });
  await expect(folder).toHaveClass(/is-folder-transparent/);
  await expect(folder.locator('.folder-body'))
    .toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');

  await page.reload();
  folder = page.locator('.bookmark-folder', { hasText: 'Games' });
  await expect(folder).toHaveClass(/is-folder-transparent/);
});

test('scales folder previews and keeps cover icons inside their tray', async ({ page }) => {
  await revealSideDock(page);
  for (const name of ['Small previews', 'Large previews', 'Cover previews']) {
    await page.getByRole('button', { name: 'Create folder' }).click();
    await page.getByPlaceholder('Tools, inspiration…').fill(name);
    await page.getByRole('button', { name: 'Accept' }).click();
  }

  await page.evaluate(() => new Promise(resolve => {
    chrome.storage.local.get(null, stored => {
      const layout = {
        'Small previews': { gx: 0, gy: 0, w: 1, h: 1 },
        'Large previews': { gx: 1, gy: 0, w: 4, h: 3 },
        'Cover previews': {
          gx: 5, gy: 0, w: 2, h: 2,
          backgroundImageUrl: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="8" height="8"%3E%3Cpath fill="%230f766e" d="M0 0h8v8H0z"/%3E%3C/svg%3E'
        }
      };
      const folders = stored.folders.map(folder => ({
        ...folder,
        ...layout[folder.name]
      }));
      const bookmarks = folders.flatMap(folder => (
        Array.from({ length: folder.name === 'Cover previews' ? 5 : 3 }, (_, index) => ({
          id: `${folder.id}-bookmark-${index}`,
          name: `${folder.name} ${index + 1}`,
          url: `https://${folder.id}-${index}.internal`,
          folderId: folder.id,
          groupId: null,
          gx: index,
          gy: 0,
          w: 1,
          h: 1
        }))
      ));
      chrome.storage.local.set({ folders, bookmarks }, resolve);
    });
  }));
  await page.reload();

  const smallIcon = page.locator('.bookmark-folder', { hasText: 'Small previews' })
    .locator('.bookmark-favicon').first();
  const largeIcon = page.locator('.bookmark-folder', { hasText: 'Large previews' })
    .locator('.bookmark-favicon').first();
  const [smallBox, largeBox] = await Promise.all([
    smallIcon.boundingBox(),
    largeIcon.boundingBox()
  ]);
  expect(largeBox.width).toBeGreaterThan(smallBox.width * 2);

  const cover = page.locator('.bookmark-folder', { hasText: 'Cover previews' });
  const trayBox = await cover.locator('.folder-previews').boundingBox();
  const itemBoxes = await cover.locator('.folder-previews > *').evaluateAll(elements => (
    elements.map(element => element.getBoundingClientRect().toJSON())
  ));
  expect(itemBoxes).toHaveLength(4);
  for (const item of itemBoxes) {
    expect(item.left).toBeGreaterThanOrEqual(trayBox.x);
    expect(item.right).toBeLessThanOrEqual(trayBox.x + trayBox.width);
    expect(item.top).toBeGreaterThanOrEqual(trayBox.y);
    expect(item.bottom).toBeLessThanOrEqual(trayBox.y + trayBox.height);
  }
});

test('renders a 6 by 3 folder grid and smoothly persists relocation', async ({ page }) => {
  await setBookmarkDragMode(page, 'relocate');
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Visual grid');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Visual grid');
    Object.assign(stored.bookmarks[0], { folderId: folder.id, gx: 0, gy: 0 });
    Object.assign(stored.bookmarks[1], { folderId: folder.id, gx: 1, gy: 0 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();

  await page.locator('.bookmark-folder', { hasText: 'Visual grid' })
    .getByRole('button', { name: /Open Visual grid/ })
    .click();
  const grid = page.getByRole('list', { name: 'Folder bookmarks' });
  const first = grid.locator('[data-bookmark-id]').nth(0);
  const second = grid.locator('[data-bookmark-id]').nth(1);

  await expect(grid.locator('[data-bookmark-id]')).toHaveCount(2);
  expect(await grid.evaluate(element => (
    getComputedStyle(element).gridTemplateColumns.split(' ').length
  ))).toBe(6);
  expect(await grid.evaluate(element => (
    getComputedStyle(element).gridTemplateRows.split(' ').length
  ))).toBe(3);

  const firstCellAlignment = await first.evaluate(element => {
    const gridElement = element.parentElement;
    const gridStyles = getComputedStyle(gridElement);
    const cellWidth = Number.parseFloat(
      gridStyles.gridTemplateColumns.split(' ')[0]
    );
    return {
      cardWidth: Number.parseFloat(getComputedStyle(element).width),
      cellWidth,
    };
  });
  await expect(first).toHaveCSS('justify-self', 'stretch');
  await expect(first).toHaveCSS('align-self', 'stretch');
  await expect(grid.getByRole('button')).toHaveCount(0);
  await expect(first.getByRole('link')).toHaveCSS('cursor', 'pointer');
  await expect(page.locator('#folder-modal-edit-toggle')).toHaveText('Edit');
  expect(Math.abs(
    firstCellAlignment.cardWidth - firstCellAlignment.cellWidth
  )).toBeLessThan(1);

  await page.keyboard.press('Space');
  await expect(page.locator('#folder-modal-edit-toggle')).toHaveText('Finish editing');
  await expect(page.locator('#folder-modal-edit-toggle')).toHaveAttribute(
    'aria-pressed',
    'true'
  );
  await expect(page.getByText('Edit mode enabled')).toBeVisible();
  await expect(grid.getByRole('button')).toHaveCount(6);
  await expect(first.getByRole('link')).toHaveCSS('cursor', 'grab');

  const [editableFirstBox, editableSecondBox] = await Promise.all([
    first.boundingBox(),
    second.boundingBox()
  ]);
  await page.mouse.move(
    editableFirstBox.x + editableFirstBox.width / 2,
    editableFirstBox.y + editableFirstBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    editableSecondBox.x + editableSecondBox.width / 2,
    editableSecondBox.y + editableSecondBox.height / 2,
    { steps: 8 }
  );
  await expect(first).toHaveClass(/is-folder-grid-dragging/);
  await expect(second).toHaveClass(/is-folder-grid-displaced/);
  expect(await first.evaluate(element => (
    Number.parseFloat(element.style.getPropertyValue('--folder-shift-x'))
  ))).toBeGreaterThan(0);
  await expect(first).toHaveCSS(
    'transition-timing-function',
    /cubic-bezier\(0\.22, 1, 0\.36, 1\)/
  );
  await page.mouse.up();

  await expect.poll(() => first.evaluate(element => element.style.gridColumn)).toBe('2');
  await expect.poll(() => second.evaluate(element => element.style.gridColumn)).toBe('1');
  await page.keyboard.press('Space');
  await expect(page.locator('#folder-modal-edit-toggle')).toHaveText('Edit');
  await expect(page.getByText('Edit mode disabled')).toBeVisible();
  await expect(grid.getByRole('button')).toHaveCount(0);
  await expect(first.getByRole('link')).toHaveCSS('cursor', 'pointer');
  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await page.locator('.bookmark-folder', { hasText: 'Visual grid' })
    .getByRole('button', { name: /Open Visual grid/ })
    .click();
  const persisted = page.getByRole('list', { name: 'Folder bookmarks' })
    .locator('[data-bookmark-id]');
  await expect(persisted.nth(0)).toHaveCSS('grid-column-start', '2');
  await expect(persisted.nth(1)).toHaveCSS('grid-column-start', '1');
  await expect(page.getByRole('list', { name: 'Folder bookmarks' })
    .getByRole('button')).toHaveCount(0);
});

test('honors None and Sequence inside a folder', async ({ page }) => {
  await setBookmarkDragMode(page, 'none');
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Drag modes');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Drag modes');
    Object.assign(stored.bookmarks[0], { folderId: folder.id, gx: 0, gy: 0 });
    Object.assign(stored.bookmarks[1], { folderId: folder.id, gx: 1, gy: 0 });
    stored.bookmarks.push({
      ...structuredClone(stored.bookmarks[0]),
      id: 'folder-sequence-third',
      name: 'Third',
      gx: 2,
      gy: 0,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();

  const openFolder = async () => {
    await page.locator('.bookmark-folder', { hasText: 'Drag modes' })
      .getByRole('button', { name: /Open Drag modes/ })
      .click();
  };
  await openFolder();
  await enableFolderEditMode(page);
  let grid = page.getByRole('list', { name: 'Folder bookmarks' });
  let items = grid.locator('[data-bookmark-id]');
  let [firstBox, secondBox] = await Promise.all([
    items.nth(0).boundingBox(),
    items.nth(1).boundingBox()
  ]);

  await page.mouse.move(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    secondBox.x + secondBox.width / 2,
    secondBox.y + secondBox.height / 2,
    { steps: 8 }
  );
  await expect(items.nth(0)).toHaveClass(/is-folder-grid-invalid/);
  await expect(items.nth(0)).toHaveCSS('opacity', '1');
  await expect(items.nth(0)).toHaveCSS('background-color', 'rgba(69, 10, 10, 0.96)');
  await expect(grid.locator('.is-folder-grid-displaced')).toHaveCount(0);
  expect(await items.nth(0).evaluate(element => (
    element.style.getPropertyValue('--folder-shift-x')
  ))).not.toBe('0px');
  const invalidShift = await items.nth(0).evaluate(element => Number.parseFloat(
    element.style.getPropertyValue('--folder-shift-x')
  ));
  const folderCellWidth = await grid.evaluate(element => element.clientWidth / 6);
  expect(invalidShift).toBeCloseTo(folderCellWidth, 1);
  await page.mouse.up();
  await expect(items.nth(0)).toHaveCSS('grid-column-start', '1');
  await expect(items.nth(1)).toHaveCSS('grid-column-start', '2');
  await expect.poll(() => items.nth(0).evaluate(element => (
    element.style.getPropertyValue('--folder-shift-x')
  ))).toBe('');

  await page.getByRole('button', { name: 'Close' }).click();
  await setBookmarkDragMode(page, 'cascade');
  await openFolder();
  await enableFolderEditMode(page);
  grid = page.getByRole('list', { name: 'Folder bookmarks' });
  items = grid.locator('[data-bookmark-id]');
  const thirdBox = await items.nth(2).boundingBox();
  firstBox = await items.nth(0).boundingBox();

  await page.mouse.move(
    firstBox.x + firstBox.width / 2,
    firstBox.y + firstBox.height / 2
  );
  await page.mouse.down();
  await page.mouse.move(
    thirdBox.x + thirdBox.width / 2,
    thirdBox.y + thirdBox.height / 2,
    { steps: 12 }
  );
  await expect(grid.locator('.is-folder-grid-displaced')).toHaveCount(2);
  await page.mouse.up();

  await expect(items.nth(0)).toHaveCSS('grid-column-start', '3');
  await expect(items.nth(1)).toHaveCSS('grid-column-start', '1');
  await expect(items.nth(2)).toHaveCSS('grid-column-start', '2');
});

test('returns to the open folder after escaping, cancelling or saving bookmark edits', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Edit return');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Edit return');
    Object.assign(stored.bookmarks[0], { folderId: folder.id, gx: 0, gy: 0 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();

  await page.locator('.bookmark-folder', { hasText: 'Edit return' })
    .getByRole('button', { name: /Open Edit return/ })
    .click();
  const folderModal = page.locator('#folder-modal');
  const editor = page.locator('#edit-bookmark-modal');

  await enableFolderEditMode(page);
  let edit = folderModal.getByRole('button', { name: 'Edit DEVELOPED BY' });
  await edit.click();
  await expect(folderModal).toBeVisible();
  await expect(editor).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(editor).toBeHidden();
  await expect(folderModal).toBeVisible();
  await expect(edit).toBeFocused();

  await edit.click();
  await page.locator('#bookmark-modal-form-name').fill('Discarded folder edit');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(folderModal).toBeVisible();
  await expect(folderModal).toContainText('DEVELOPED BY');

  edit = folderModal.getByRole('button', { name: 'Edit DEVELOPED BY' });
  await edit.click();
  await page.locator('#bookmark-modal-form-name').fill('Folder edited');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(editor).toBeHidden();
  await expect(folderModal).toBeVisible();
  await expect(folderModal).toContainText('Folder edited');
});

test('deletes a bookmark permanently from an open folder after confirmation', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Delete inside');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.evaluate(() => {
    const storageKey = 'spacetab-test-local';
    const stored = JSON.parse(sessionStorage.getItem(storageKey));
    const folder = stored.folders.find(item => item.name === 'Delete inside');
    Object.assign(stored.bookmarks[0], { folderId: folder.id, gx: 0, gy: 0 });
    sessionStorage.setItem(storageKey, JSON.stringify(stored));
  });
  await page.reload();

  const openFolder = async () => {
    await page.locator('.bookmark-folder', { hasText: 'Delete inside' })
      .getByRole('button', { name: /Open Delete inside/ })
      .click();
  };
  await openFolder();
  const grid = page.getByRole('list', { name: 'Folder bookmarks' });
  await expect(grid.locator('[data-bookmark-id]')).toHaveCount(1);
  await enableFolderEditMode(page);
  await page.getByRole('button', { name: 'Delete DEVELOPED BY' }).click();
  await expect(page.locator('#alert-modal')).toBeVisible();
  await expect(page.locator('#alert-modal-title'))
    .toHaveText('Delete “DEVELOPED BY”?');
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(grid.locator('[data-bookmark-id]')).toHaveCount(0);

  await page.getByRole('button', { name: 'Close' }).click();
  await page.reload();
  await openFolder();
  await expect(page.getByRole('list', { name: 'Folder bookmarks' })
    .locator('[data-bookmark-id]')).toHaveCount(0);
});

test('renames an open folder by double-clicking its title', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('PokeMMO');
  await page.getByRole('button', { name: 'Accept' }).click();

  await page.locator('.bookmark-folder', { hasText: 'PokeMMO' })
    .getByRole('button', { name: /Open PokeMMO/ })
    .click();
  const title = page.locator('#folder-modal-title');
  await expect(title).not.toHaveAttribute('role');
  await expect(title).not.toHaveAttribute('tabindex');
  await title.dblclick();
  await expect(title).toHaveAttribute('contenteditable', 'true');
  await expect(title).toBeFocused();
  const cancelRename = page.getByRole('button', { name: 'Cancel folder rename' });
  await expect(cancelRename).toBeVisible();
  await title.fill('');
  await cancelRename.click();
  await expect(title).toHaveText('PokeMMO');
  await expect(title).not.toHaveAttribute('contenteditable');
  await expect(cancelRename).toBeHidden();

  await title.dblclick();
  await title.fill('Accepted rename');
  await page.getByRole('button', { name: 'Save folder name' }).click();
  await expect(title).toHaveText('Accepted rename');
  await expect(title).not.toHaveAttribute('contenteditable');

  await title.dblclick();
  const requestedName = `Pokémon tools ${'x'.repeat(60)}`;
  const expectedName = requestedName.slice(0, 60);
  await title.fill(requestedName);
  await expect(title).toHaveText(expectedName);
  await title.press('Enter');

  await expect(page.locator('#folder-modal')).toBeVisible();
  await expect(title).not.toHaveAttribute('contenteditable');
  await expect(title).not.toBeFocused();
  await expect(title).toHaveText(expectedName);
});

test('edits and deletes a folder from its direct controls', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Temporary');
  await page.getByRole('button', { name: 'Accept' }).click();

  await enableEditMode(page);
  let folder = page.locator('.bookmark-folder', { hasText: 'Temporary' });
  await folder.getByRole('button', { name: 'Customize folder' }).click();
  await page.locator('#folder-editor-name').fill('Renamed');
  await page.locator('#edit-folder-modal-save').click();

  folder = page.locator('.bookmark-folder', { hasText: 'Renamed' });
  await expect(folder).toBeVisible();
  await folder.getByRole('button', { name: 'Delete folder' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(folder).toHaveCount(0);
});

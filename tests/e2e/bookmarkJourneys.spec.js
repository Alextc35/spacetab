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

async function setBookmarkDragMode(page, mode) {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();
  await page.locator(`input[name="bookmark-drag-mode"][value="${mode}"]`).check();
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
  await page.waitForTimeout(350);
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
    if (mode !== 'relocate') await setBookmarkDragMode(page, mode);
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

test('defaults to relocation, warns about sequence, and persists drag modes', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await page.getByRole('button', { name: '🔖 Bookmarks' }).click();

  const cascade = page.locator('input[name="bookmark-drag-mode"][value="cascade"]');
  const relocate = page.locator('input[name="bookmark-drag-mode"][value="relocate"]');
  const none = page.locator('input[name="bookmark-drag-mode"][value="none"]');
  expect(await page.locator('input[name="bookmark-drag-mode"]').evaluateAll(
    inputs => inputs.map(input => input.value)
  )).toEqual(['none', 'relocate', 'cascade']);
  await expect(relocate).toBeChecked();
  await expect(none).not.toBeChecked();
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
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Reading');
  await page.getByRole('button', { name: 'Accept' }).click();

  const folder = page.locator('.bookmark-folder', { hasText: 'Reading' });
  await expect(folder).toBeVisible();
  await expect(folder).toContainText('0 saved');

  await enableEditMode(page);
  await expect(folder.getByRole('group', { name: 'Folder controls' })).toBeVisible();
  await expect(folder.getByRole('button', { name: 'Rename folder' })).toBeVisible();
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

  await page.getByRole('button', { name: /Move DEVELOPED BY out of the folder/ }).click();
  await expect(page.getByText('0 bookmarks in this folder')).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
});

test('renames and deletes a folder from its direct controls', async ({ page }) => {
  await revealSideDock(page);
  await page.getByRole('button', { name: 'Create folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Temporary');
  await page.getByRole('button', { name: 'Accept' }).click();

  await enableEditMode(page);
  let folder = page.locator('.bookmark-folder', { hasText: 'Temporary' });
  await folder.getByRole('button', { name: 'Rename folder' }).click();
  await page.getByPlaceholder('Tools, inspiration…').fill('Renamed');
  await page.getByRole('button', { name: 'Accept' }).click();

  folder = page.locator('.bookmark-folder', { hasText: 'Renamed' });
  await expect(folder).toBeVisible();
  await folder.getByRole('button', { name: 'Delete folder' }).click();
  await page.getByRole('button', { name: 'Accept' }).click();
  await expect(folder).toHaveCount(0);
});

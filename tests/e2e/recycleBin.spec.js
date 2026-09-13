import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser-harness.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('.recycle-bin')).toBeVisible();
});

async function waitForSaved(page) {
  await expect.poll(() => page.evaluate(async () => {
    const { getState } = await import('/src/js/core/store.js');
    return getState().ui.persistence.status;
  })).toMatch(/^(idle|saved)$/);
}

async function revealSideDock(page) {
  await page.mouse.move(5, page.viewportSize().height / 2);
  await expect(page.locator('#floating-menu')).toBeVisible();
}

async function toggleEditMode(page) {
  await revealSideDock(page);
  await page.locator('#edit-toggle-mode').click();
}

async function dragCenterTo(page, source, target) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(from.x + from.width / 2 - 7, from.y + from.height / 2 - 7);
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
  await page.mouse.up();
}

test('moves, resizes, hides and shows the recycle bin', async ({ page }) => {
  await toggleEditMode(page);
  const bin = page.locator('.recycle-bin');
  const grid = await page.locator('#bookmark-container').boundingBox();
  const before = await bin.boundingBox();

  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
  await page.mouse.down();
  await page.mouse.move(before.x + grid.width / 12 * 3, before.y, { steps: 12 });
  await page.mouse.up();
  await expect.poll(async () => (await bin.boundingBox()).x).toBeGreaterThan(before.x + grid.width / 6);

  const moved = await bin.boundingBox();
  await bin.locator('.resizer.left').click({ position: { x: 2, y: 10 } });
  await expect.poll(async () => (await bin.boundingBox()).width).toBeGreaterThan(moved.width * 1.7);
  await waitForSaved(page);

  await toggleEditMode(page);
  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  const showBin = page.locator('#settings-show-recycle-bin');
  await showBin.uncheck();
  await page.locator('#settings-modal-save').click();
  await expect(bin).toBeHidden();

  const expectedPosition = await page.evaluate(async () => {
    const { DEFAULT_BOOKMARK } = await import('/src/js/core/defaults.js');
    const { findFirstFreeSlot } = await import('/src/js/core/grid.js');
    const { getState, setState } = await import('/src/js/core/store.js');
    const { data } = getState();
    const blocker = {
      ...DEFAULT_BOOKMARK,
      id: 'hidden-bin-blocker',
      name: 'Hidden bin blocker',
      url: 'https://blocker.test',
      gx: data.recycleBin.gx,
      gy: data.recycleBin.gy,
      w: data.recycleBin.w,
      h: data.recycleBin.h
    };
    await setState({ data: { bookmarks: [...data.bookmarks, blocker] } });
    const next = getState().data;
    return findFirstFreeSlot([
      ...next.bookmarks.filter(bookmark => !bookmark.folderId && bookmark.groupId === null),
      ...next.folders.filter(folder => folder.groupId === null)
    ], {
      columns: 12,
      rows: 6,
      w: next.recycleBin.w,
      h: next.recycleBin.h
    });
  });

  await revealSideDock(page);
  await page.getByRole('button', { name: '⚙️' }).click();
  await showBin.check();
  await page.locator('#settings-modal-save').click();
  await expect(page.locator('.recycle-bin')).toBeVisible();
  await expect.poll(() => page.evaluate(async () => {
    const { recycleBin } = (await import('/src/js/core/store.js')).getState().data;
    return { gx: recycleBin.gx, gy: recycleBin.gy };
  })).toEqual(expectedPosition);
});

test('drops a bookmark into the bin and restores the selected item', async ({ page }) => {
  await toggleEditMode(page);
  const bookmark = page.locator('.bookmark[data-bookmark-id]').first();
  const bookmarkId = await bookmark.getAttribute('data-bookmark-id');
  const bin = page.locator('.recycle-bin');
  await dragCenterTo(page, bookmark, bin);
  await expect(page.locator(`.bookmark[data-bookmark-id="${bookmarkId}"]`)).toHaveCount(0);
  await expect(bin.locator('.recycle-bin-caption small')).toHaveText('1 item');
  await waitForSaved(page);

  await toggleEditMode(page);
  await bin.getByRole('button', { name: /Open recycle bin/ }).click();
  const modal = page.locator('#recycle-bin-modal');
  await expect(modal).toBeVisible();
  await expect(modal.locator('.recycle-bin-item')).toHaveCount(1);
  await expect(modal).toContainText('DEVELOPED BY');
  await modal.locator('.recycle-bin-item input').check();
  await modal.getByRole('button', { name: 'Restore selected' }).click();
  await expect(modal.locator('.recycle-bin-item')).toHaveCount(0);
  await expect(page.locator(`.bookmark[data-bookmark-id="${bookmarkId}"]`)).toBeVisible();
});

test('asks before dropping a folder with contents and supports permanent deletion', async ({ page }) => {
  await page.evaluate(async () => {
    const { getState, setState } = await import('/src/js/core/store.js');
    const data = getState().data;
    const folder = {
      id: 'trash-folder', name: 'Archive', gx: 3, gy: 0, w: 1, h: 1,
      groupId: null, createdAt: Date.now(), updatedAt: Date.now()
    };
    await setState({
      data: {
        folders: [...data.folders, folder],
        bookmarks: data.bookmarks.map((bookmark, index) => index === 0
          ? { ...bookmark, folderId: folder.id, gx: 0, gy: 0 }
          : bookmark)
      }
    });
  });

  await toggleEditMode(page);
  const folder = page.locator('.bookmark-folder[data-folder-id="trash-folder"]');
  const bin = page.locator('.recycle-bin');
  await dragCenterTo(page, folder, bin);
  await expect(page.locator('#alert-modal')).toBeVisible();
  await expect(page.locator('#alert-modal-title')).toContainText('Archive');
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(folder).toHaveCount(0);

  await toggleEditMode(page);
  await bin.getByRole('button', { name: /Open recycle bin/ }).click();
  const modal = page.locator('#recycle-bin-modal');
  await expect(modal.locator('.recycle-bin-item')).toContainText('Archive');
  await modal.locator('.recycle-bin-item input').check();
  await modal.getByRole('button', { name: 'Delete selected' }).click();
  await expect(page.locator('#alert-modal')).toBeVisible();
  await page.getByRole('button', { name: 'Accept', exact: true }).click();
  await expect(modal.locator('.recycle-bin-item')).toHaveCount(0);
});

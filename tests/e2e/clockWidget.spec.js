import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser-harness.html');
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await expect(page.locator('#bookmark-container')).toHaveAttribute('tabindex', '-1');
});

async function revealSideDock(page) {
  await page.mouse.move(5, page.viewportSize().height / 2);
  await expect.poll(async () => (await page.locator('#floating-menu').boundingBox())?.x)
    .toBeGreaterThanOrEqual(0);
}

async function waitForSaved(page) {
  await expect.poll(() => page.evaluate(async () => {
    const { getState } = await import('/src/js/core/store.js');
    return getState().ui.persistence.status;
  })).toMatch(/^(idle|saved)$/);
}

test('creates, configures, resizes, persists and removes the bundled clock', async ({ page }) => {
  await revealSideDock(page);
  await page.locator('#add-toggle').click();
  await page.locator('#add-clock').click();

  const modal = page.locator('#clock-widget-modal');
  await expect(modal).toBeVisible();
  await expect(page.locator('#clock-widget-hour-cycle')).toHaveValue('24');
  await expect(page.locator('#clock-widget-show-seconds')).not.toBeChecked();
  await page.locator('#clock-widget-save').click();

  const clock = page.locator('.clock-widget[data-widget-type="clock"]');
  await expect(clock).toBeVisible();
  await expect(clock.locator('.clock-widget-time')).toHaveText(/^\d{2}:\d{2}$/);

  await revealSideDock(page);
  await page.getByRole('button', { name: '✎' }).click();
  await clock.locator('.item-action-button.edit').click();
  await page.locator('#clock-widget-hour-cycle').selectOption('12');
  await page.locator('#clock-widget-show-seconds').check();
  const preview = page.locator('#clock-widget-preview-time');
  const previewBeforeTick = await preview.textContent();
  await expect.poll(() => preview.textContent()).not.toBe(previewBeforeTick);
  await page.locator('#clock-widget-save').click();
  await expect(clock.locator('.clock-widget-time')).toHaveText(/^\d{2}:\d{2}:\d{2}\s?[AP]M$/i);

  await clock.locator('.resizer.right').click();
  await expect.poll(() => page.evaluate(async () => {
    const { getState } = await import('/src/js/core/store.js');
    return getState().data.widgets[0]?.w;
  })).toBe(3);

  await waitForSaved(page);
  await page.reload();
  await expect(clock).toBeVisible();
  await expect(clock.locator('.clock-widget-time')).toHaveText(/^\d{2}:\d{2}:\d{2}\s?[AP]M$/i);
  await expect.poll(() => page.evaluate(async () => {
    const { getState } = await import('/src/js/core/store.js');
    const widget = getState().data.widgets[0];
    return { w: widget?.w, config: widget?.config };
  })).toEqual({
    w: 3,
    config: { hourCycle: '12', showSeconds: true }
  });

  await revealSideDock(page);
  await page.getByRole('button', { name: '✎' }).click();
  await clock.locator('.item-action-button.edit').click();
  await page.locator('#clock-widget-delete').click();
  await page.locator('#alert-modal-accept').click();
  await expect(clock).toHaveCount(0);
  await expect(modal).toBeHidden();
  await expect.poll(() => page.evaluate(() => [...document.body.children]
    .filter(element => element.inert)
    .map(element => element.id || element.tagName))).toEqual([]);

  await page.locator('#history-undo').focus();
  await page.locator('#history-undo').click();
  await expect(clock).toBeVisible();
});

test('renders the clock as an accessible row in compact view', async ({ page }) => {
  await revealSideDock(page);
  await page.locator('#add-toggle').click();
  await page.locator('#add-clock').click();
  await page.locator('#clock-widget-save').click();

  await page.setViewportSize({ width: 600, height: 700 });

  const grid = page.locator('#bookmark-container');
  const clock = grid.locator('.clock-widget-list-item[data-widget-type="clock"]');
  await expect(grid).toHaveClass(/is-list-view/);
  await expect(clock).toBeVisible();
  await expect(clock.locator('.bookmark-list-name')).toHaveText('Clock');
  await expect(clock.locator('time')).toHaveText(/^\d{2}:\d{2}$/);

  await clock.locator('.clock-widget-list-link').click();
  await expect(page.locator('#clock-widget-modal')).toBeVisible();
  await expect(page.locator('#clock-widget-delete')).toBeVisible();
});

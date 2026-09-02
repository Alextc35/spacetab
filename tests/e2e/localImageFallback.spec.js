import { expect, test } from '@playwright/test';

const fallbackUrl = 'https://images.test/fallback.png';
const imageFile = {
  name: 'local-background.png',
  mimeType: 'image/png',
  buffer: Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL1SQAAAABJRU5ErkJggg==',
    'base64'
  )
};

for (const kind of ['bookmark', 'folder']) {
  test(`${kind} preserves its URL through local upload, reload and removal`, async ({ page }) => {
    await page.route(fallbackUrl, route => route.fulfill({
      contentType: 'image/png', body: imageFile.buffer
    }));
    await page.goto('/tests/browser-harness.html');
    await expect(page.getByRole('link', { name: /DEVELOPED BY/ })).toBeVisible();
    await page.evaluate(() => new Promise(resolve => {
      chrome.storage.local.set({
        bookmarks: [{
          id: 'image-bookmark', name: 'Image bookmark', url: '',
          backgroundFavicon: false, gx: 0, gy: 0
        }],
        folders: [{ id: 'image-folder', name: 'Image folder', gx: 1, gy: 0 }]
      }, resolve);
    }));
    await page.reload();

    const isBookmark = kind === 'bookmark';
    const modal = page.locator(isBookmark ? '#edit-bookmark-modal' : '#edit-folder-modal');
    const imageUrl = modal.locator(isBookmark ? '[data-field="backgroundImage"]' : '#folder-editor-image');
    const localInput = modal.locator(isBookmark ? '[data-field="backgroundImageLocal"]' : '#folder-editor-image-local');
    const upload = modal.locator(isBookmark ? '[data-field="bgUploadInput"]' : '#folder-editor-image-upload-input');
    const save = modal.locator(isBookmark ? '#edit-bookmark-modal-save' : '#edit-folder-modal-save');
    const preview = modal.locator(isBookmark ? '.bookmark-preview .bookmark' : '.folder-editor-preview-card');
    const cssProperty = isBookmark ? '--bookmark-bg-image' : '--folder-bg-image';
    const card = page.locator(isBookmark ? '#bookmark-container > [data-bookmark-id="image-bookmark"]' : '#bookmark-container > [data-folder-id="image-folder"]');

    const openEditor = async () => {
      if (isBookmark) {
        const menu = page.locator('#floating-menu');
        await page.mouse.move(5, page.viewportSize().height / 2);
        await expect.poll(async () => (await menu.boundingBox()).x).toBeGreaterThanOrEqual(0);
        await page.getByRole('button', { name: '✎' }).click();
        await card.getByRole('button', { name: 'Edit bookmark' }).click();
      } else {
        await card.getByRole('button', { name: /Open Image folder/ }).click();
        await page.getByRole('button', { name: 'Customize folder' }).click();
      }
      await modal.getByRole('tab', { name: 'Style' }).click();
    };

    await openEditor();
    await expect(localInput).toBeHidden();
    await imageUrl.fill(fallbackUrl);
    await upload.setInputFiles(imageFile);
    await expect(localInput).toHaveValue(imageFile.name);
    await expect(imageUrl).toHaveValue(fallbackUrl);
    await expect(preview).toHaveCSS(cssProperty, /data:image\/webp/);
    await save.click();
    await expect(modal).toBeHidden();
    await page.reload();
    await expect(card).toHaveCSS(cssProperty, /data:image\/webp/);

    await openEditor();
    await expect(localInput).toHaveValue(imageFile.name);
    await expect(imageUrl).toHaveValue(fallbackUrl);
    await modal.getByRole('button', { name: 'Remove local image' }).click();
    await expect(localInput).toBeHidden();
    await expect(imageUrl).toHaveValue(fallbackUrl);
    await expect(preview).toHaveCSS(cssProperty, `url("${fallbackUrl}")`);
    await save.click();
    await page.reload();
    await expect(card).toHaveCSS(cssProperty, `url("${fallbackUrl}")`);
    await openEditor();
    await expect(localInput).toBeHidden();
    await expect(imageUrl).toHaveValue(fallbackUrl);
  });
}

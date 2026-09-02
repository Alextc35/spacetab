import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1'
    ? route.continue() : route.abort());
  await page.goto('/tests/browser-harness.html');
  await expect.poll(() => page.evaluate(() => typeof window.SpaceTabDebug?.report)).toBe('function');
  await expect.poll(() => page.evaluate(() => window.SpaceTabDebug.history().some(record => record.label === 'Carga inicial'))).toBe(true);
});

test('reports startup, actual quotas and persisted create/edit/delete timings', async ({ page }) => {
  const initial = await page.evaluate(() => window.SpaceTabDebug.report());
  expect(initial.summary.version).toBe('0.1.3'); // Browser harness manifest.
  expect(initial.summary.syncEnabled).toBe(false);
  expect(initial.summary.bookmarks).toBe(2);
  expect(initial.storage.map(area => area.mode)).toEqual(['local', 'sync']);
  expect(initial.storage[0].usedBytes).toBeGreaterThan(0);
  expect(initial.startup['Inicio JS → interfaz lista (ms)']).toBeGreaterThan(0);
  expect(initial.startup['Navegación → interfaz lista (ms)'])
    .toBeGreaterThanOrEqual(initial.startup['Inicio JS → interfaz lista (ms)']);

  await page.mouse.move(5, page.viewportSize().height / 2);
  await page.locator('#add-bookmark').click();
  await page.locator('#bookmark-modal-form-name').fill('Debug example');
  await page.locator('#bookmark-modal-form-url').fill('https://debug.internal');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  const bookmark = page.locator('#bookmark-container .bookmark').filter({ hasText: 'Debug example' });
  await expect(bookmark).toBeVisible();
  const created = await page.evaluate(() => window.SpaceTabDebug.history().find(record => record.label === 'Crear favorito'));
  expect(created.status).toBe('ok');
  expect(created.details.persisted).toBe(true);
  expect(created.phases.map(phase => phase.phase)).toEqual([
    'Preparación de datos', 'Espera en cola', 'Escritura en storage', 'Notificar interfaz'
  ]);

  const id = await bookmark.getAttribute('data-bookmark-id');
  await page.evaluate(async id => {
    const { updateBookmarkById, deleteBookmarksByIds } = await import('/src/js/core/bookmark.js');
    updateBookmarkById(id, { name: 'Updated debug example' });
    deleteBookmarksByIds([id]);
  }, id);
  await expect(bookmark).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.SpaceTabDebug.history().filter(record => (
    ['Editar favorito', 'Eliminar favoritos'].includes(record.label) && record.details.persisted
  )).length)).toBe(2);
  const report = await page.evaluate(() => window.SpaceTabDebug.report());
  expect(report.summary.bookmarks).toBe(2);
  const bytes = await page.evaluate(() => new Promise(resolve => chrome.storage.local.getBytesInUse(null, resolve)));
  expect(report.storage[0].usedBytes).toBe(bytes);

  await page.evaluate(async () => {
    const { changeStorageMode } = await import('/src/js/core/store.js');
    await changeStorageMode('sync');
  });
  const synced = await page.evaluate(() => window.SpaceTabDebug.report());
  expect(synced.summary.syncEnabled).toBe(true);
  expect(synced.storage.find(area => area.active).mode).toBe('sync');
  expect(synced.storage[1].usedBytes).toBeGreaterThan(0);
});

test('a failed storage write is reported as an error and later writes still succeed', async ({ page }) => {
  await page.evaluate(async () => {
    const original = chrome.storage.local.set;
    chrome.storage.local.set = (items, callback) => {
      if (items.bookmarks) {
        chrome.storage.local.set = original;
        chrome.runtime.lastError = { message: 'Simulated quota error' };
        callback?.();
        chrome.runtime.lastError = null;
      } else original(items, callback);
    };
    const { addBookmark } = await import('/src/js/core/bookmark.js');
    addBookmark({ name: 'Failure', url: 'https://failure.internal' });
  });
  await expect.poll(() => page.evaluate(() => window.SpaceTabDebug.history().some(record => (
    record.label === 'Crear favorito' && record.status === 'error' && record.details.persisted === false
  )))).toBe(true);
  await page.evaluate(async () => {
    const { addBookmark } = await import('/src/js/core/bookmark.js');
    addBookmark({ name: 'Recovery', url: 'https://recovery.internal' });
  });
  await expect.poll(() => page.evaluate(() => window.SpaceTabDebug.history().some(record => (
    record.label === 'Crear favorito' && record.status === 'ok' && record.details.persisted
  )))).toBe(true);
});

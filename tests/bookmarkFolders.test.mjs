import assert from 'node:assert/strict';
import test from 'node:test';

const storedData = {};
const createArea = () => ({
  QUOTA_BYTES: 102400,
  get(keys, callback) {
    const requested = keys === null ? Object.keys(storedData) : (Array.isArray(keys) ? keys : [keys]);
    callback(Object.fromEntries(
      requested.filter(key => Object.hasOwn(storedData, key)).map(key => [key, storedData[key]])
    ));
  },
  set(items, callback) {
    Object.assign(storedData, structuredClone(items));
    callback?.();
  },
  remove(keys, callback) {
    for (const key of (Array.isArray(keys) ? keys : [keys])) delete storedData[key];
    callback?.();
  }
});

globalThis.chrome = {
  runtime: {
    lastError: null,
    getManifest: () => ({ version: '0.2.0' })
  },
  storage: {
    local: createArea(),
    sync: createArea(),
    onChanged: { addListener() {} }
  }
};

const {
  addBookmarkToFolder,
  createBookmarkFolder,
  deleteBookmarkFolder,
  removeBookmarkFromFolder,
  updateGridItemsByIds
} = await import('../src/js/core/bookmarkFolders.js');
const { getState, hydrateStore, setState } = await import('../src/js/core/store.js');

test('folders reserve a cell and own bookmarks without reserving their old cells', async () => {
  await hydrateStore();
  await setState({
    data: {
      bookmarks: [{
        id: 'bookmark', name: 'Bookmark', groupId: null, folderId: null,
        gx: 0, gy: 0, w: 1, h: 1
      }],
      folders: []
    }
  });

  const folder = createBookmarkFolder('Reading', { columns: 2, rows: 1 });
  assert.deepEqual({ gx: folder.gx, gy: folder.gy }, { gx: 1, gy: 0 });

  assert.equal(addBookmarkToFolder('bookmark', folder.id)?.folderId, folder.id);
  assert.equal(getState().data.bookmarks[0].folderId, folder.id);

  const result = removeBookmarkFromFolder('bookmark', { columns: 2, rows: 1 });
  assert.equal(result.reason, null);
  assert.equal(result.bookmark.folderId, null);
  assert.deepEqual(
    { gx: result.bookmark.gx, gy: result.bookmark.gy },
    { gx: 0, gy: 0 }
  );
});

test('deleting a folder deletes its contained bookmarks atomically', () => {
  const folder = getState().data.folders[0];
  addBookmarkToFolder('bookmark', folder.id);

  const result = deleteBookmarkFolder(folder.id);
  assert.deepEqual(result, { deleted: true, bookmarkCount: 1 });
  assert.deepEqual(getState().data.folders, []);
  assert.deepEqual(getState().data.bookmarks, []);
});

test('updates bookmark and folder rectangles atomically', async () => {
  await setState({
    data: {
      bookmarks: [{
        id: 'grid-bookmark', name: 'Bookmark', groupId: null, folderId: null,
        gx: 0, gy: 0, w: 1, h: 1
      }],
      folders: [{
        id: 'grid-folder', name: 'Folder', groupId: null,
        gx: 1, gy: 0, w: 1, h: 1, createdAt: 1, updatedAt: 1
      }]
    }
  });

  const changed = updateGridItemsByIds(new Map([
    ['grid-bookmark', { gx: 3, gy: 0 }],
    ['grid-folder', { gx: 0, gy: 0, w: 2, h: 2 }]
  ]));

  assert.equal(changed.length, 2);
  assert.deepEqual(
    getState().data.bookmarks.map(({ gx, gy, w, h }) => ({ gx, gy, w, h })),
    [{ gx: 3, gy: 0, w: 1, h: 1 }]
  );
  assert.deepEqual(
    getState().data.folders.map(({ gx, gy, w, h }) => ({ gx, gy, w, h })),
    [{ gx: 0, gy: 0, w: 2, h: 2 }]
  );
});

test('keeps a bookmark inside when the grid has no room to remove it', async () => {
  await setState({
    data: {
      bookmarks: [{
        id: 'contained', name: 'Contained', groupId: null, folderId: 'full',
        gx: 0, gy: 0, w: 1, h: 1
      }],
      folders: [{
        id: 'full', name: 'Full', groupId: null,
        gx: 0, gy: 0, w: 1, h: 1, createdAt: 1, updatedAt: 1
      }]
    }
  });

  const result = removeBookmarkFromFolder('contained', { columns: 1, rows: 1 });
  assert.equal(result.reason, 'no-space');
  assert.equal(getState().data.bookmarks[0].folderId, 'full');
});

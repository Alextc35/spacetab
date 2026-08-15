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
    getManifest: () => ({ version: '0.1.2' })
  },
  storage: {
    local: createArea(),
    sync: createArea(),
    onChanged: { addListener() {} }
  }
};

const {
  deleteBookmarkGroup,
  getAdjacentBookmarkGroupId
} = await import('../src/js/core/bookmarkGroups.js');
const { getState, hydrateStore, setState } = await import('../src/js/core/store.js');

test('deleting a workspace also deletes its bookmarks without moving them to Main', async () => {
  await hydrateStore();
  await setState({
    data: {
      bookmarks: [
        { id: 'main', name: 'Main', groupId: null, gx: 0, gy: 0, w: 1, h: 1 },
        { id: 'temporary', name: 'Temporary', groupId: 'temporary', gx: 0, gy: 0, w: 1, h: 1 }
      ],
      folders: [
        { id: 'main-folder', name: 'Main folder', groupId: null, gx: 1, gy: 0, w: 1, h: 1 },
        { id: 'temporary-folder', name: 'Temporary folder', groupId: 'temporary', gx: 1, gy: 0, w: 1, h: 1 }
      ],
      settings: {
        ...getState().data.settings,
        bookmarkGroups: [{ id: 'temporary', name: 'Temporary' }],
        activeBookmarkGroupId: 'temporary'
      }
    }
  });

  assert.equal(deleteBookmarkGroup('temporary'), true);
  assert.deepEqual(getState().data.bookmarks.map(bookmark => bookmark.id), ['main']);
  assert.deepEqual(getState().data.folders.map(folder => folder.id), ['main-folder']);
  assert.deepEqual(getState().data.settings.bookmarkGroups, []);
  assert.equal(getState().data.settings.activeBookmarkGroupId, null);
});

test('cycles through workspaces in both directions including Main', () => {
  const settings = {
    bookmarkGroups: [
      { id: 'work', name: 'Work' },
      { id: 'play', name: 'Play' }
    ],
    activeBookmarkGroupId: null
  };

  assert.equal(getAdjacentBookmarkGroupId(settings, 1), 'work');
  assert.equal(getAdjacentBookmarkGroupId(settings, -1), 'play');
  assert.equal(getAdjacentBookmarkGroupId({
    ...settings,
    activeBookmarkGroupId: 'work'
  }, -1), null);
  assert.equal(getAdjacentBookmarkGroupId({
    ...settings,
    activeBookmarkGroupId: 'play'
  }, 1), null);
});

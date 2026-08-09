import assert from 'node:assert/strict';
import test from 'node:test';

const localData = {};
const listeners = [];
const createArea = () => ({
  QUOTA_BYTES: 102400,
  get(keys, callback) {
    const requested = keys === null ? Object.keys(localData) : (Array.isArray(keys) ? keys : [keys]);
    callback(Object.fromEntries(
      requested.filter(key => Object.hasOwn(localData, key)).map(key => [key, localData[key]])
    ));
  },
  set(items, callback) {
    Object.assign(localData, structuredClone(items));
    callback?.();
  },
  remove(keys, callback) {
    for (const key of (Array.isArray(keys) ? keys : [keys])) delete localData[key];
    callback?.();
  }
});

globalThis.chrome = {
  runtime: {
    lastError: null,
    getManifest: () => ({ version: '0.1.1' })
  },
  storage: {
    local: createArea(),
    sync: createArea(),
    onChanged: { addListener(listener) { listeners.push(listener); } }
  }
};

const {
  getState,
  hydrateStore,
  redoBookmarks,
  setState,
  undoBookmarks
} = await import('../js/core/store.js');

test('bookmark history supports undo and redo as persisted state changes', async () => {
  await hydrateStore();
  const initialBookmarks = getState().data.bookmarks;
  const replacement = [{ id: 'replacement', name: 'Replacement' }];

  await setState({ data: { bookmarks: replacement } });
  assert.equal(getState().ui.history.canUndo, true);
  assert.deepEqual(getState().data.bookmarks, replacement);

  assert.equal(await undoBookmarks(), true);
  assert.deepEqual(getState().data.bookmarks, initialBookmarks);
  assert.equal(getState().ui.history.canRedo, true);

  assert.equal(await redoBookmarks(), true);
  assert.deepEqual(getState().data.bookmarks, replacement);
});

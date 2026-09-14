import { beforeEach, expect, test, vi } from 'vitest';

import {
  clearBookmarkSelection,
  getSelectedBookmarkIds,
  getSelectedGridItems,
  pruneGridItemSelection,
  pruneBookmarkSelection,
  subscribeToBookmarkSelection,
  toggleGridItemSelection,
  toggleBookmarkSelection
} from '../../src/js/ui/bookmark/selection.js';

beforeEach(() => clearBookmarkSelection());

test('selection toggles, publishes snapshots and prunes deleted bookmarks', () => {
  const listener = vi.fn();
  const unsubscribe = subscribeToBookmarkSelection(listener);

  toggleBookmarkSelection('one');
  toggleBookmarkSelection('two');
  toggleBookmarkSelection('one');
  pruneBookmarkSelection(['one']);

  expect(getSelectedBookmarkIds()).toEqual([]);
  expect(listener).toHaveBeenCalledTimes(5);
  unsubscribe();
});

test('keeps bookmark and folder identities distinct in a mixed selection', () => {
  toggleBookmarkSelection('shared-id');
  toggleGridItemSelection('folder', 'shared-id');
  toggleGridItemSelection('folder', 'other-folder');

  expect(getSelectedGridItems()).toEqual([
    { kind: 'bookmark', id: 'shared-id' },
    { kind: 'folder', id: 'shared-id' },
    { kind: 'folder', id: 'other-folder' }
  ]);

  pruneGridItemSelection({
    bookmarkIds: ['shared-id'],
    folderIds: ['other-folder']
  });
  expect(getSelectedGridItems()).toEqual([
    { kind: 'bookmark', id: 'shared-id' },
    { kind: 'folder', id: 'other-folder' }
  ]);
});

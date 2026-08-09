import { beforeEach, expect, test, vi } from 'vitest';

import {
  clearBookmarkSelection,
  getSelectedBookmarkIds,
  pruneBookmarkSelection,
  subscribeToBookmarkSelection,
  toggleBookmarkSelection
} from '../../js/ui/bookmark/selection.js';

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

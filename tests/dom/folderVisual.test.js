import { beforeEach, describe, expect, test } from 'vitest';

import { createFolderVisual } from '../../src/js/ui/folder/visual.js';

beforeEach(() => {
  document.body.replaceChildren();
});

describe('folder visual', () => {
  test('keeps the default four-icon grid without a remainder badge', () => {
    const visual = createFolderVisual({ backgroundImageUrl: null }, bookmarks(5));

    expect(visual.querySelectorAll('.bookmark-favicon')).toHaveLength(4);
    expect(visual.querySelector('.folder-preview-more')).toBeNull();
  });

  test('uses a compact icon tray over cover images', () => {
    const visual = createFolderVisual({
      noBackground: true,
      backgroundImageUrl: 'https://images.test/animated.gif'
    }, bookmarks(5));

    expect(visual.classList.contains('has-folder-bg-image')).toBe(true);
    expect(visual.classList.contains('is-folder-transparent')).toBe(true);
    expect(visual.querySelectorAll('.bookmark-favicon')).toHaveLength(3);
    expect(visual.querySelector('.folder-preview-more').textContent).toBe('+2');
  });
});

function bookmarks(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `bookmark-${index}`,
    name: `Bookmark ${index}`,
    url: `https://bookmark-${index}.internal`
  }));
}

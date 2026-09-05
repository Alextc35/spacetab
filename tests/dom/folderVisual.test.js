import { beforeEach, describe, expect, test } from 'vitest';

import { applyFolderAppearance, createFolderVisual } from '../../src/js/ui/folder/visual.js';

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

  test.each([{ showPreviews: false }, { showFolder: false }])(
    'does not request bookmark favicons when previews are hidden: %j', visibility => {
      const visual = createFolderVisual({
        ...visibility,
        backgroundImageUrl: 'https://images.test/cover.png'
      }, bookmarks(5));

      expect(visual.querySelectorAll('img')).toHaveLength(0);
      expect(visual.querySelector('.folder-preview-more')).toBeNull();
      expect(visual.classList.contains('is-folder-preview-hidden')).toBe(true);
    }
  );

  test('restores automatic appearance when a customized element is reused', () => {
    const visual = createFolderVisual({
      outerBackgroundColor: '#123456',
      showFolder: false,
      showName: false,
      showCount: false
    });
    expect(visual.style.getPropertyValue('--folder-outer-color')).toBe('#123456');

    applyFolderAppearance(visual, {});

    expect(visual.style.getPropertyValue('--folder-outer-color')).toBe('');
    for (const className of [
      'has-folder-outer-color', 'is-folder-hidden', 'is-folder-preview-hidden',
      'is-folder-name-hidden', 'is-folder-count-hidden'
    ]) expect(visual.classList.contains(className)).toBe(false);
  });
});

function bookmarks(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: `bookmark-${index}`,
    name: `Bookmark ${index}`,
    url: `https://bookmark-${index}.internal`
  }));
}

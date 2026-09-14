import { describe, expect, test } from 'vitest';
import {
  applyRecycleBinAppearance,
  createRecycleBinGlyph
} from '../../src/js/ui/recycleBinAppearance.js';

describe('recycle bin appearance', () => {
  test('applies custom colors and independently hides card elements', () => {
    const card = document.createElement('div');
    card.append(createRecycleBinGlyph());
    applyRecycleBinAppearance(card, {
      backgroundColor: '#6d28d9',
      iconColor: '#f59e0b',
      textColor: '#ffffff',
      showIcon: false,
      showName: false,
      showCount: true
    });

    expect(card.classList.contains('has-recycle-bin-background')).toBe(true);
    expect(card.classList.contains('is-recycle-bin-icon-hidden')).toBe(true);
    expect(card.classList.contains('is-recycle-bin-name-hidden')).toBe(true);
    expect(card.classList.contains('is-recycle-bin-count-hidden')).toBe(false);
    expect(card.style.getPropertyValue('--recycle-bin-background')).toBe('#6d28d9');
    expect(card.style.getPropertyValue('--recycle-bin-icon-color')).toBe('#f59e0b');
    expect(card.style.getPropertyValue('--recycle-bin-text-color')).toBe('#ffffff');
    expect(card.querySelector('.recycle-bin-lid')).not.toBeNull();
    expect(card.querySelector('.recycle-bin-can')).not.toBeNull();
  });
});

import { describe, expect, test } from 'vitest';
import {
  createEditIndicatorSvg,
  createFolderSvg,
  createRecycleBinSvg,
  createSettingsSectionSvg
} from '../../src/js/ui/svgIcons.js';

describe('shared SpaceTab SVG icons', () => {
  test.each([
    'general',
    'sync',
    'theme',
    'bookmark',
    'shortcuts',
    'language',
    'information'
  ])('creates the %s settings icon as theme-aware vector artwork', kind => {
    const svg = createSettingsSectionSvg(kind);

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(svg.dataset.icon).toBe(kind);
    expect(svg.querySelectorAll('.settings-section-path').length).toBeGreaterThan(0);
  });

  test('keeps folder and recycle-bin artwork at their canonical ratios', () => {
    expect(createFolderSvg().getAttribute('viewBox')).toBe('0 0 136 100');
    expect(createRecycleBinSvg().getAttribute('viewBox')).toBe('0 0 92 108');
  });

  test('creates a reusable vector edit affordance for modal artwork', () => {
    const svg = createEditIndicatorSvg();

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(svg.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(svg.querySelector('.edit-indicator-pencil')).not.toBeNull();
    expect(svg.querySelector('.edit-indicator-detail')).not.toBeNull();
  });
});

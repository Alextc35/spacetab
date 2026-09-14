import assert from 'node:assert/strict';
import test from 'node:test';

import { DEFAULT_RECYCLE_BIN_STYLE } from '../src/js/core/defaults.js';
import { normalizeRecycleBinStyle } from '../src/js/core/recycleBinModel.js';

test('normalizes recycle bin colors and independently hidden elements', () => {
  assert.deepEqual(normalizeRecycleBinStyle({
    backgroundColor: '#AA11CC',
    iconColor: '#12AB34',
    textColor: '#F8FAFC',
    showIcon: false,
    showName: false,
    showCount: false
  }), {
    backgroundColor: '#aa11cc',
    iconColor: '#12ab34',
    textColor: '#f8fafc',
    showIcon: false,
    showName: false,
    showCount: false
  });
});

test('invalid recycle bin appearance falls back without hiding content', () => {
  assert.deepEqual(normalizeRecycleBinStyle({
    backgroundColor: 'purple',
    iconColor: null,
    textColor: '#123'
  }), DEFAULT_RECYCLE_BIN_STYLE);
});

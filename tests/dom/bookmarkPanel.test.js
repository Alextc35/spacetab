import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

let createBookmarkEditorPanel;
let createFavicon;
const newTabHtml = readFileSync(join(process.cwd(), 'src/newtab.html'), 'utf8');

beforeAll(async () => {
  globalThis.chrome = createChromeMock();
  globalThis.requestAnimationFrame = callback => callback();

  document.documentElement.innerHTML = newTabHtml
    .replace(/^.*?<html[^>]*>/s, '')
    .replace(/<\/html>.*$/s, '');

  ({ createBookmarkEditorPanel } = await import('../../src/js/ui/bookmark/panel.js'));
  ({ createFavicon } = await import('../../src/js/ui/bookmark/favicon.js'));
});

beforeEach(() => {
  document.getElementById('bookmark-modal-form-host').replaceChildren();
});

describe('BookmarkEditorPanel', () => {
  test('uses one panel contract for create and preset modes', () => {
    const createPanel = createBookmarkEditorPanel({
      host: document.getElementById('bookmark-modal-form-host'),
      mode: 'create',
      value: { name: '', backgroundColor: '#123456' }
    });
    const presetPanel = createBookmarkEditorPanel({
      host: document.createElement('div'),
      mode: 'preset',
      value: { backgroundColor: '#abcdef' },
      previewName: 'Default bookmark',
      previewFaviconUrl: '/assets/icons/icon-128.png'
    });

    expect(createPanel.sections).toEqual(['general', 'style', 'text', 'icon']);
    expect(presetPanel.sections).toEqual(['style', 'text', 'icon']);
    expect(presetPanel.elements.name).toBeNull();
    expect(presetPanel.getValue()).not.toHaveProperty('name');
    expect(presetPanel.getValue().backgroundColor).toBe('#abcdef');
    expect(presetPanel.root.querySelector('.bookmark-title').textContent).toBe('Default bookmark');
    expect(presetPanel.root.querySelector('.bookmark-favicon').getAttribute('src'))
      .toBe('/assets/icons/icon-128.png');

    createPanel.destroy();
    presetPanel.destroy();
  });

  test('each field emits a single change and editors remain isolated', () => {
    const onCreateChange = vi.fn();
    const onPresetChange = vi.fn();
    const createPanel = createBookmarkEditorPanel({
      host: document.getElementById('bookmark-modal-form-host'),
      mode: 'create',
      value: { name: 'One', url: 'one.test' },
      onChange: onCreateChange
    });
    const presetPanel = createBookmarkEditorPanel({
      host: document.createElement('div'),
      mode: 'preset',
      value: {},
      onChange: onPresetChange
    });

    createPanel.elements.url.value = ' two.test ';
    createPanel.elements.url.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onCreateChange).toHaveBeenCalledTimes(1);
    expect(createPanel.getValue().url).toBe('two.test');
    expect(onPresetChange).not.toHaveBeenCalled();

    presetPanel.reset({ backgroundColor: '#334455' });
    expect(createPanel.getValue().url).toBe('two.test');

    createPanel.destroy();
    presetPanel.destroy();
  });

  test('validates fields and removes listeners when destroyed', () => {
    const onChange = vi.fn();
    const panel = createBookmarkEditorPanel({
      host: document.getElementById('bookmark-modal-form-host'),
      mode: 'create',
      value: { name: '', url: 'javascript:alert(1)' },
      onChange
    });

    const result = panel.validate();
    expect(result.isValid).toBe(false);
    expect(panel.elements.name.getAttribute('aria-invalid')).toBe('true');
    expect(panel.elements.url.getAttribute('aria-invalid')).toBe('true');

    const detachedNameInput = panel.elements.name;
    panel.destroy();
    detachedNameInput.value = 'After destroy';
    detachedNameInput.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onChange).not.toHaveBeenCalled();
    expect(document.getElementById('bookmark-modal-form-host').children).toHaveLength(0);
  });

  test('uses an inline initials fallback for bookmarks without a resolvable URL', () => {
    const favicon = createFavicon({ name: 'Example bookmark', url: '' });

    expect(favicon.getAttribute('src')).toMatch(/^data:image\/svg\+xml,/);
    expect(favicon.getAttribute('src')).not.toContain('flaticon.com');
  });
});

function createChromeMock() {
  const listeners = [];
  const createArea = () => ({
    QUOTA_BYTES: 102400,
    get(_keys, callback) { callback({}); },
    set(_items, callback) { callback?.(); },
    remove(_keys, callback) { callback?.(); },
    getBytesInUse(_keys, callback) { callback(0); }
  });

  return {
    runtime: {
      lastError: null,
      getManifest: () => ({ version: '0.1.1' }),
      getURL: path => path
    },
    storage: {
      local: createArea(),
      sync: createArea(),
      onChanged: {
        addListener(listener) { listeners.push(listener); }
      }
    }
  };
}

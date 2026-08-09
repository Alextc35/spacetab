import { createBookmarkEditorPanel } from './panel.js';

export { createBookmarkEditorPanel };

/**
 * Compatibility wrapper for consumers written before the editor panel API.
 * New code should call createBookmarkEditorPanel directly.
 */
export function createBookmarkForm({
  host,
  idPrefix,
  showGeneral = true,
  bookmark = {},
  onChange
}) {
  return createBookmarkEditorPanel({
    host,
    idPrefix,
    mode: showGeneral ? 'edit' : 'preset',
    value: bookmark,
    onChange
  });
}

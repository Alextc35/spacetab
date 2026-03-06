import { createBookmarkElement } from './renderer.js';

export function renderBookmarkPreview(container, bookmark) {
  if (!container) return;

  container.innerHTML = '';

  const previewBookmark = createBookmarkElement(bookmark, {
    isEditing: false,
    isPreview: true
  });

  // quitar grid positioning
  previewBookmark.style.removeProperty('--x');
  previewBookmark.style.removeProperty('--y');
  previewBookmark.style.removeProperty('--w');
  previewBookmark.style.removeProperty('--h');

  container.appendChild(previewBookmark);
}
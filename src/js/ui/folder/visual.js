import { createFavicon } from '../bookmark/favicon.js';
import { resolveBackgroundImage } from '../../core/localImages.js';
import { lightSurfaceTextColor } from '../surfaceContrast.js';

/** Creates the shared folder glyph used by cards, previews and headers. */
export function createFolderVisual(folder, bookmarks = [], { compact = false } = {}) {
  const visual = document.createElement('span');
  visual.className = 'folder-visual';
  visual.classList.toggle('is-compact', compact);
  visual.setAttribute('aria-hidden', 'true');
  applyFolderAppearance(visual, folder);

  const tab = document.createElement('span');
  tab.className = 'folder-tab';
  const body = document.createElement('span');
  body.className = 'folder-body';
  const previews = document.createElement('span');
  previews.className = 'folder-previews';

  if (!compact && folder.showFolder !== false && folder.showPreviews !== false) {
    const hasCover = Boolean(resolveBackgroundImage(folder));
    const previewLimit = hasCover ? 3 : 4;
    for (const bookmark of bookmarks.slice(0, previewLimit)) {
      const image = createFavicon(bookmark);
      image.alt = '';
      previews.append(image);
    }

    if (hasCover && bookmarks.length > previewLimit) {
      const remaining = document.createElement('span');
      remaining.className = 'folder-preview-more';
      remaining.textContent = `+${bookmarks.length - previewLimit}`;
      previews.append(remaining);
    }
  }

  body.append(previews);
  visual.append(tab, body);
  return visual;
}

/** Applies persisted folder colors and optional imagery through CSS variables. */
export function applyFolderAppearance(element, folder = {}) {
  element.style.setProperty('--folder-light-text', lightSurfaceTextColor(folder.textColor));
  element.classList.toggle('is-folder-transparent', folder.noBackground === true);
  element.classList.toggle('is-folder-hidden', folder.showFolder === false);
  element.classList.toggle('is-folder-preview-hidden', folder.showFolder === false || folder.showPreviews === false);
  element.classList.toggle('is-folder-name-hidden', folder.showName === false);
  element.classList.toggle('is-folder-count-hidden', folder.showCount === false);
  const outerColor = folder.outerBackgroundColor;
  element.classList.toggle('has-folder-outer-color', Boolean(outerColor));
  if (outerColor) element.style.setProperty('--folder-outer-color', outerColor);
  else element.style.removeProperty('--folder-outer-color');
  element.style.setProperty(
    '--folder-color',
    folder.backgroundColor || '#38bdf8'
  );
  element.style.setProperty(
    '--folder-text-color',
    folder.textColor || '#f8fafc'
  );

  const backgroundImage = resolveBackgroundImage(folder) ?? '';
  element.classList.toggle('has-folder-bg-image', Boolean(backgroundImage));
  if (backgroundImage) {
    element.style.setProperty('--folder-bg-image', `url("${backgroundImage}")`);
  } else {
    element.style.removeProperty('--folder-bg-image');
  }
}

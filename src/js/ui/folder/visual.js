import { createFavicon } from '../bookmark/favicon.js';

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

  if (!compact) {
    for (const bookmark of bookmarks.slice(0, 4)) {
      const image = createFavicon(bookmark);
      image.alt = '';
      previews.append(image);
    }
  }

  body.append(previews);
  visual.append(tab, body);
  return visual;
}

/** Applies persisted folder colors and optional imagery through CSS variables. */
export function applyFolderAppearance(element, folder = {}) {
  element.style.setProperty(
    '--folder-color',
    folder.backgroundColor || '#38bdf8'
  );
  element.style.setProperty(
    '--folder-text-color',
    folder.textColor || '#f8fafc'
  );

  const backgroundImage = typeof folder.backgroundImageUrl === 'string'
    ? folder.backgroundImageUrl.trim()
    : '';
  element.classList.toggle('has-folder-bg-image', Boolean(backgroundImage));
  if (backgroundImage) {
    element.style.setProperty('--folder-bg-image', `url("${backgroundImage}")`);
  } else {
    element.style.removeProperty('--folder-bg-image');
  }
}

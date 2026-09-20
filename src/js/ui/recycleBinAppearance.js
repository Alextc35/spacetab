import { resolveBackgroundImage } from '../core/localImages.js';
import { createRecycleBinSvg } from './svgIcons.js';

/** Applies persisted recycle bin colors and element visibility. */
export function applyRecycleBinAppearance(element, recycleBin = {}) {
  const noBackground = recycleBin.noBackground === true;
  const backgroundColor = recycleBin.backgroundColor || null;
  const backgroundImage = resolveBackgroundImage(recycleBin);
  const textColor = recycleBin.textColor || null;

  element.classList.toggle('has-recycle-bin-background', Boolean(backgroundColor));
  element.classList.toggle('is-recycle-bin-transparent', noBackground);
  element.classList.toggle('has-recycle-bin-bg-image', Boolean(backgroundImage));
  element.classList.toggle('is-recycle-bin-icon-hidden', recycleBin.showIcon === false);
  element.classList.toggle('is-recycle-bin-name-hidden', recycleBin.showName === false);
  element.classList.toggle('is-recycle-bin-count-hidden', recycleBin.showCount === false);

  if (backgroundColor) {
    element.style.setProperty('--recycle-bin-background', backgroundColor);
  } else {
    element.style.removeProperty('--recycle-bin-background');
  }
  if (backgroundImage) {
    element.style.setProperty('--recycle-bin-bg-image', `url("${backgroundImage}")`);
  } else {
    element.style.removeProperty('--recycle-bin-bg-image');
  }
  element.style.setProperty('--recycle-bin-icon-color', recycleBin.iconColor || '#475569');
  if (textColor) {
    element.style.setProperty('--recycle-bin-text-color', textColor);
  } else {
    element.style.removeProperty('--recycle-bin-text-color');
  }
}

/** Creates the shared recycle bin glyph used by the card and its editor preview. */
export function createRecycleBinGlyph() {
  const glyph = document.createElement('span');
  glyph.className = 'recycle-bin-glyph';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.append(createRecycleBinSvg());
  return glyph;
}

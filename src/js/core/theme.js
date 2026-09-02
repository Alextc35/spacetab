import '../types/types.js'; // typedefs
import { VERSION } from './config.js';
import { resolveBackgroundImage } from './localImages.js';

/**
 * Applies the global theme variables to the document root element.
 *
 * Updates CSS custom properties based on the provided settings theme.
 *
 * @param {Partial<Settings>} [settings={}] - Settings object containing theme configuration.
 * @returns {void}
 */
export function applyGlobalTheme(settings = {}) {
  const root = document.documentElement;
  const theme = settings.theme || {};

  root.style.setProperty(
    '--version',
    `"v${VERSION}"`
  );

  root.style.setProperty(
    '--color-bg-body',
    theme.backgroundColor
  );

  root.classList.toggle('is-default-bg', Boolean(theme.backgroundDefault));

  if (theme.backgroundDefault) {
    root.style.removeProperty('--image-bg-body');
    return;
  }

  const backgroundImage = theme.backgroundSolid ? null : resolveBackgroundImage(theme);
  if (backgroundImage) {
    root.style.setProperty(
      '--image-bg-body',
      `url("${backgroundImage}")`
    );
  } else {
    root.style.setProperty('--image-bg-body', 'none');
  }
}

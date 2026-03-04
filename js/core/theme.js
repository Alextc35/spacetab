import '../types/types.js'; // typedefs
import { VERSION } from './config.js';

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

  root.classList.remove('is-default-bg');

  if (theme.backgroundImageUrl) {
    root.style.setProperty(
      '--image-bg-body',
      `url("${theme.backgroundImageUrl}")`
    );
  } else if (!theme.backgroundDefault) {
    root.style.setProperty('--image-bg-body', 'none');
    root.classList.remove('is-default-bg');
  } else {
    root.classList.add('is-default-bg');
  }
}
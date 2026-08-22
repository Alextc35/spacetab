import '../../types/types.js'; // typedefs

/**
 * Creates a favicon image element for a bookmark.
 *
 * Attempts to fetch the site favicon. If it fails or the URL is internal,
 * generates a fallback image with the bookmark initials.
 *
 * @param {Bookmark} bookmark - Bookmark object
 * @param {Object} [options]
 * @param {string|null} [options.placeholderUrl] - Local image used instead of resolving a site.
 * @return {HTMLImageElement} <img> element with favicon or initials
 */
export function createFavicon(bookmark, { placeholderUrl = null } = {}) {
  const img = document.createElement('img');
  img.className = 'bookmark-favicon';

  if (placeholderUrl) {
    img.src = placeholderUrl;
    return img;
  }

  let isInternal = false;
  try {
    const urlObj = new URL(bookmark.url);
    isInternal = urlObj.hostname.endsWith('.internal') || urlObj.hostname.endsWith('.local');
    if (!isInternal) {
      const faviconOrigin = getFaviconOrigin(urlObj);
      img.src =
        `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(faviconOrigin)}&size=64`;
      img.onerror = () => {
        img.onerror = null;
        img.src = generateInitialsFallback(bookmark.name);
      };
    }
  } catch {
    img.src = generateInitialsFallback(bookmark.name);
  }

  if (isInternal) img.src = generateInitialsFallback(bookmark.name);

  return img;
}

/**
 * Uses the apex host for favicon discovery while preserving the bookmark URL.
 * Google can return a generic icon for a leading www host even when the apex
 * host has the correct favicon registered.
 *
 * @param {URL} url
 * @returns {string}
 */
function getFaviconOrigin(url) {
  if (!url.hostname.startsWith('www.')) return url.origin;

  const faviconUrl = new URL(url.origin);
  faviconUrl.hostname = faviconUrl.hostname.slice(4);
  return faviconUrl.origin;
}

/**
 * Generates an inline SVG containing the bookmark initials.
 *
 * Used as a fallback when the favicon cannot be retrieved.
 *
 * @param {string} name - Bookmark display name.
 * @returns {string} Data URL representing the generated image.
 */
function generateInitialsFallback(name) {
  const initials = Array.from((name || '').trim())
    .filter(character => /[\p{L}\p{N}]/u.test(character))
    .slice(0, 2)
    .join('')
    .toLocaleUpperCase() || '?';
  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">',
    '<rect width="64" height="64" rx="14" fill="#17263b"/>',
    `<text x="32" y="34" fill="#f8fafc" font-family="system-ui,sans-serif" `,
    `font-size="26" font-weight="700" text-anchor="middle" dominant-baseline="middle">${initials}</text>`,
    '</svg>'
  ].join('');
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

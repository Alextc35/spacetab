import '../types/types.js'; // typedefs

/**
 * Creates a favicon image element for a bookmark.
 *
 * Attempts to fetch the site favicon. If it fails or the URL is internal,
 * generates a fallback image with the bookmark initials.
 *
 * @param {Bookmark} bookmark - Bookmark object
 * @return {HTMLImageElement} <img> element with favicon or initials
 */
export function createFavicon(bookmark) {
  const img = document.createElement('img');
  img.className = 'bookmark-favicon';

  let isInternal = false;
  try {
    const urlObj = new URL(bookmark.url);
    isInternal = urlObj.hostname.endsWith('.internal') || urlObj.hostname.endsWith('.local');
    if (!isInternal) {
      img.src =
        `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(urlObj.origin)}&size=64`;
      img.onerror = () => {
        img.onerror = null;
        img.src = generateInitialsCanvas(bookmark.name);
      };
    }
  } catch {
    img.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
  }

  if (isInternal) img.src = generateInitialsCanvas(bookmark.name);

  return img;
}

/**
 * Generates a base64-encoded image containing the bookmark initials.
 *
 * Used as a fallback when the favicon cannot be retrieved.
 *
 * @param {Bookmark} name - Bookmark display name.
 * @returns {string} Data URL representing the generated image.
 */
function generateInitialsCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.fillStyle = '#555';
  ctx.fillRect(0, 0, 64, 64);
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const initials = (name || '?').slice(0, 2).toUpperCase();
  ctx.fillText(initials, 32, 32);
  return canvas.toDataURL();
}
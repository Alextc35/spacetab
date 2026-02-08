/**
 * Fetch favicon or generate fallback initials canvas
 * 
 * @param {Object} bookmark
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
      img.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(urlObj.origin)}&size=64`;
      img.onerror = () => {
        img.onerror = null;
        img.src = generateInitialsCanvas(bookmark.name);
      };
    }
  } catch {
    img.src = 'https://cdn-icons-png.flaticon.com/512/1828/1828843.png';
  }

  if (isInternal) {
    img.src = generateInitialsCanvas(bookmark.name);
  }

  return img;
}

/**
 * Generate a base64 image with initials for bookmarks without favicon
 * 
 * @param {string} name
 * @returns {string} Data URL of the generated image
 */
function generateInitialsCanvas(name) {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
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
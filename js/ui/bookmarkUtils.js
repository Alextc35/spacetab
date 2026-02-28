export function isVisuallyDark(bookmark) {
  let dark = isDarkColor(bookmark.backgroundColor);
  if (bookmark.backgroundImageUrl) dark = true;
  if (bookmark.invertColorBg) dark = !dark;
  return dark;
}

function isDarkColor(color) {
  if (!color || color === 'transparent') return true;
  if (!color.startsWith('#')) return true;
  const hex = color.replace('#', '');
  const r = parseInt(hex.slice(0,2), 16);
  const g = parseInt(hex.slice(2,4), 16);
  const b = parseInt(hex.slice(4,6), 16);
  const luminance = 0.2126*r + 0.7152*g + 0.0722*b;
  return luminance < 64;
}
export const BOOKMARK_RESIZE_MODES = Object.freeze({
  NONE: 'none',
  SMOOTH: 'smooth'
});

const VALID_MODES = new Set(Object.values(BOOKMARK_RESIZE_MODES));

/** @returns {'smooth'|'none'} */
export function normalizeBookmarkResizeMode(value) {
  return VALID_MODES.has(value)
    ? value
    : BOOKMARK_RESIZE_MODES.SMOOTH;
}

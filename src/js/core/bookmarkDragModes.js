export const BOOKMARK_DRAG_MODES = Object.freeze({
  NONE: 'none',
  CASCADE: 'cascade',
  RELOCATE: 'relocate'
});

const VALID_MODES = new Set(Object.values(BOOKMARK_DRAG_MODES));

/** @returns {'none'|'cascade'|'relocate'} */
export function normalizeBookmarkDragMode(value) {
  return VALID_MODES.has(value)
    ? value
    : BOOKMARK_DRAG_MODES.RELOCATE;
}

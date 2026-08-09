import { t } from '../core/i18n.js';
import { toggleEditing } from '../core/store.js';

import { renderBookmarks } from './bookmark/renderer.js';

import { hasOpenModal } from './modalManager.js';
import { flash } from './flash.js';

/** @type {HTMLElement|null} */
let containerRef = null;

/** @type {HTMLElement|null} */
let gridOverlayRef = null;

/** @type {HTMLElement|null} */
let toggleButtonRef = null;

/** @type {number|null} */
let resizeTimeout = null;

/**
 * Initializes global UI controller behavior.
 * 
 * Responsibilities:
 * - Registers global keyboard shortcuts
 * - Handles resize re-render logic
 * - Binds Add and Edit toggle buttons
 *
 * @param {Object} options
 * @param {HTMLElement} options.container - Bookmark container element
 * @param {HTMLElement} options.gridOverlay - Grid overlay element
 * @param {HTMLElement} options.addButton - Add bookmark button
 * @param {HTMLElement} options.toggleButton - Edit mode toggle button
 */
export function initUIController({
  container,
  gridOverlay,
  toggleButton
}) {
  containerRef = container;
  gridOverlayRef = gridOverlay;
  toggleButtonRef = toggleButton;

  document.addEventListener('keydown', handleEditModeShortcut);
  window.addEventListener('resize', handleResize);

  toggleButtonRef?.addEventListener('click', toggleEditMode);
}

/**
 * Updates visual UI state when edit mode changes.
 *
 * @param {boolean} isEditing - Whether edit mode is enabled
 */
export function updateEditUI(isEditing) {
  if (!toggleButtonRef || !gridOverlayRef) return;

  toggleButtonRef.textContent = isEditing ? '🔒' : '✎';
  gridOverlayRef.style.display = isEditing ? 'block' : 'none';
}

/**
 * Toggles edit mode in the store and displays a feedback message.
 *
 * @returns {Promise<void>}
 */
async function toggleEditMode() {
  const isEditing = await toggleEditing();

  flash(
    isEditing
      ? t('flash.editMode.enabled')
      : t('flash.editMode.disabled'),
    'info',
    1000
  );
}

/**
 * Handles the Space key shortcut to toggle edit mode.
 *
 * Does nothing while a modal is open.
 *
 * @param {KeyboardEvent} event
 */
function handleEditModeShortcut(event) {
  if (hasOpenModal()) return;

  if (event.code === 'Space') {
    event.preventDefault();
    toggleButtonRef?.click();
  }
}

/**
 * Debounced window resize handler.
 *
 * Re-renders bookmarks after a short delay to avoid
 * excessive layout recalculations during resize.
 */
function handleResize() {
  if (!containerRef) return;

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks(containerRef);
  }, 100);
}
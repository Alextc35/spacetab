import { t } from '../core/i18n.js';
import { getState, toggleEditing } from '../core/store.js';

import { resizeBookmarkView } from './bookmark/renderer.js';
import { cancelGridGesture } from './bookmark/dragResize.js';
import { ensurePanelFits, isListView } from './viewportMode.js';

import { hasOpenModal } from './modalManager.js';
import { flash } from './flash.js';

/** @type {HTMLElement|null} */
let containerRef = null;

/** @type {HTMLElement|null} */
let gridOverlayRef = null;

/** @type {HTMLElement|null} */
let toggleButtonRef = null;

/** @type {number|null} */
let resizeFrame = null;

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
  if (!getState().ui.isEditing && !ensurePanelFits()) return;
  const isEditing = await toggleEditing();

  if (isEditing) containerRef?.focus({ preventScroll: true });

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
 * Updates the view once per frame and cancels unfinished grid gestures.
 * List mode is read-only, including when entered from an editing session.
 */
function handleResize() {
  if (!containerRef) return;
  cancelGridGesture();

  if (resizeFrame !== null) cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    resizeFrame = null;
    if (isListView() && getState().ui.isEditing) {
      void toggleEditing();
      return;
    }
    resizeBookmarkView(containerRef);
    containerRef.querySelector('.is-keyboard-active')?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  });
}

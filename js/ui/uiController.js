import { toggleEditing } from '../core/store.js';
import { renderBookmarks } from './bookmarkRenderer.js';
import { flash } from './flash.js';
import { t } from '../core/i18n.js';
import { hasOpenModal, shouldSuppressGlobalEnter } from './modalManager.js';
import { showAddBookmarkModal } from './modals/index.js';

/** @type {HTMLElement|null} */
let containerRef = null;

/** @type {HTMLElement|null} */
let gridOverlayRef = null;

/** @type {HTMLElement|null} */
let addButtonRef = null;

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
  addButton,
  toggleButton
}) {
  containerRef = container;
  gridOverlayRef = gridOverlay;
  addButtonRef = addButton;
  toggleButtonRef = toggleButton;

  document.addEventListener('keydown', handleGlobalKeydown);
  window.addEventListener('resize', handleResize);

  addButtonRef.addEventListener('click', () =>
    showAddBookmarkModal()
  );

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
 * Handles global keyboard shortcuts.
 *
 * Shortcuts:
 * - "." → Open settings
 * - Enter → Open Add Bookmark modal
 * - Space → Toggle edit mode
 *
 * Suppresses:
 * - Active modal interactions
 * - Input/textarea typing contexts
 * - Modal-controlled Enter behavior
 *
 * @param {KeyboardEvent} e
 */
function handleGlobalKeydown(e) {
  if (e.code === 'Enter' && shouldSuppressGlobalEnter()) {
    e.preventDefault();
    return;
  }

  const tag = document.activeElement?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA') return;

  if (hasOpenModal()) return;

  if (e.key === '.') {
    e.preventDefault();
    document.getElementById('settings')?.click();
    return;
  }

  if (e.code === 'Enter') {
    e.preventDefault();
    showAddBookmarkModal();
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
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
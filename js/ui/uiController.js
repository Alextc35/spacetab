import { toggleEditing } from '../core/store.js';
import { renderBookmarks } from './bookmarkRenderer.js';
import { flash } from './flash.js';
import { t } from '../core/i18n.js';
import { hasOpenModal, shouldSuppressGlobalEnter } from './modalManager.js';
import { showAddBookmarkModal } from './modals/index.js';

/* ================= Private references ================= */

let containerRef = null;
let addButtonRef = null;
let toggleButtonRef = null;
let gridOverlayRef = null;

let resizeTimeout = null;

/* ================= Public API ================= */

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

export function updateEditUI(isEditing) {
  if (!toggleButtonRef || !gridOverlayRef) return;

  toggleButtonRef.textContent = isEditing ? '🔒' : '✎';
  gridOverlayRef.style.display = isEditing ? 'block' : 'none';
}

/* ================= Internal logic ================= */

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

function handleResize() {
  if (!containerRef) return;

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    renderBookmarks(containerRef);
  }, 100);
}
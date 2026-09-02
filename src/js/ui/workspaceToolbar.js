import {
  createBookmarkGroup,
  deleteBookmarkGroup,
  getAdjacentBookmarkGroupId,
  setActiveBookmarkGroup
} from '../core/bookmarkGroups.js';
import { getState, redoBookmarks, subscribe, undoBookmarks } from '../core/store.js';
import { t } from '../core/i18n.js';
import { flash, flashSuccess } from './flash.js';
import { hasOpenModal } from './modalManager.js';
import { showAlert, showPrompt } from './modals/alert.js';
import { openSearchModal } from './modals/searchModal.js';
import { clearBookmarkSelection } from './bookmark/selection.js';

const WORKSPACE_EXIT_DURATION = 120;
const WORKSPACE_ENTER_DURATION = 220;

/** @type {boolean} */
let isSwitchingWorkspace = false;

export function initWorkspaceToolbar() {
  const container = document.getElementById('bookmark-container');
  const select = document.getElementById('workspace-select');
  const selectButton = select.querySelector('button');
  const addButton = document.getElementById('workspace-add');
  const deleteButton = document.getElementById('workspace-delete');
  const undoButton = document.getElementById('history-undo');
  const redoButton = document.getElementById('history-redo');

  document.getElementById('search-bookmarks').addEventListener('click', openSearchModal);

  // Keep Space and type-ahead in the picker from triggering page shortcuts.
  select.addEventListener('keydown', event => event.stopPropagation());
  select.addEventListener('change', async () => {
    const targetId = select.value || null;
    const { bookmarkGroups, activeBookmarkGroupId } = getState().data.settings;
    const ids = [null, ...bookmarkGroups.map(group => group.id)];
    const direction = ids.indexOf(targetId) < ids.indexOf(activeBookmarkGroupId)
      ? -1
      : 1;
    await switchWorkspace(container, targetId, direction);
  });
  addButton.addEventListener('click', async () => {
    const name = await showPrompt(t('workspace.prompt'), {
      placeholder: t('workspace.namePlaceholder')
    });
    if (name && createBookmarkGroup(name)) {
      flashSuccess('flash.workspace.created');
    }
  });
  deleteButton.addEventListener('click', async () => {
    if (!select.value) return;
    const { bookmarks, folders, settings } = getState().data;
    const group = settings.bookmarkGroups.find(item => item.id === select.value);
    if (!group) return;

    const bookmarkCount = bookmarks.filter(bookmark => bookmark.groupId === group.id).length;
    const folderCount = folders.filter(folder => folder.groupId === group.id).length;
    const confirmed = await showAlert(t('workspace.confirmDelete', {
      name: group.name,
      bookmarkCount,
      folderCount
    }), { type: 'confirm' });
    if (confirmed && deleteBookmarkGroup(group.id)) {
      flashSuccess('flash.workspace.deleted');
    }
  });
  undoButton.addEventListener('click', async () => {
    if (await undoBookmarks()) flash(t('flash.history.undone'), 'info', 1000);
  });
  redoButton.addEventListener('click', async () => {
    if (await redoBookmarks()) flash(t('flash.history.redone'), 'info', 1000);
  });

  subscribe(state => {
    const { bookmarkGroups, activeBookmarkGroupId } = state.data.settings;
    const selected = activeBookmarkGroupId ?? '';
    select.replaceChildren(...(selectButton ? [selectButton] : []), new Option(t('workspace.main'), ''));
    for (const group of bookmarkGroups) select.add(new Option(group.name, group.id));
    select.value = selected;
    select.title = select.selectedOptions[0]?.textContent ?? '';
    deleteButton.disabled = !selected;
    undoButton.disabled = !state.ui.history.canUndo;
    redoButton.disabled = !state.ui.history.canRedo;
  });

  document.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z') return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    event.preventDefault();
    (event.shiftKey ? redoButton : undoButton).click();
  });

  document.addEventListener('keydown', event => {
    if (!event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (!['ArrowUp', 'ArrowDown'].includes(event.key)) return;
    if (isSwitchingWorkspace || hasOpenModal() || isTypingTarget(event.target)) return;

    const direction = event.key === 'ArrowUp' ? -1 : 1;
    const settings = getState().data.settings;
    const targetId = getAdjacentBookmarkGroupId(settings, direction);
    if (targetId === settings.activeBookmarkGroupId) return;

    event.preventDefault();
    void switchWorkspace(container, targetId, direction);
  });
}

/**
 * Changes workspace after animating the current grid out, then animates the
 * newly rendered grid in from the requested direction.
 *
 * @param {HTMLElement|null} container
 * @param {string|null} targetId
 * @param {-1|1|number} direction
 */
async function switchWorkspace(container, targetId, direction) {
  if (isSwitchingWorkspace) return false;
  if (getState().data.settings.activeBookmarkGroupId === targetId) return false;

  isSwitchingWorkspace = true;
  clearBookmarkSelection();
  container?.classList.add('is-switching-workspace');

  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const distance = direction < 0 ? 18 : -18;
  let exitAnimation = null;

  try {
    if (!reducedMotion && typeof container?.animate === 'function') {
      exitAnimation = container.animate([
        { opacity: 1, transform: 'translateY(0) scale(1)' },
        { opacity: 0, transform: `translateY(${distance}px) scale(.992)` }
      ], {
        duration: WORKSPACE_EXIT_DURATION,
        easing: 'cubic-bezier(.4, 0, 1, 1)',
        fill: 'forwards'
      });
      await exitAnimation.finished;
    }

    const changed = await setActiveBookmarkGroup(targetId);
    exitAnimation?.cancel();
    exitAnimation = null;
    if (!changed) return false;

    if (!reducedMotion && typeof container?.animate === 'function') {
      const enterAnimation = container.animate([
        { opacity: 0, transform: `translateY(${-distance}px) scale(.992)` },
        { opacity: 1, transform: 'translateY(0) scale(1)' }
      ], {
        duration: WORKSPACE_ENTER_DURATION,
        easing: 'cubic-bezier(.22, 1, .36, 1)'
      });
      await enterAnimation.finished;
    }
    return true;
  } catch (error) {
    if (error?.name !== 'AbortError') throw error;
    return false;
  } finally {
    exitAnimation?.cancel();
    container?.classList.remove('is-switching-workspace');
    isSwitchingWorkspace = false;
  }
}

/** @param {EventTarget|null} target */
function isTypingTarget(target) {
  return target instanceof HTMLElement && (
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
    || target.isContentEditable
  );
}

import { deleteBookmarkFolder, renameBookmarkFolder } from '../../core/bookmarkFolders.js';
import { t } from '../../core/i18n.js';
import { getState } from '../../core/store.js';
import {
  createBookmarkActionButton,
  initBookmarkActionMenu
} from '../bookmark/actions.js';
import { flashSuccess } from '../flash.js';
import { showAlert, showPrompt } from '../modals/alert.js';

export function addFolderActions(container, folder) {
  const menu = document.createElement('div');
  menu.className = 'bookmark-action-menu folder-action-menu';

  const toggle = document.createElement('button');
  toggle.className = 'bookmark-actions-toggle is-dark';
  toggle.type = 'button';
  toggle.textContent = '•••';
  toggle.setAttribute('aria-label', t('folder.actions.openMenu'));

  const actions = document.createElement('div');
  actions.className = 'bookmark-actions folder-actions';
  actions.id = `folder-actions-${folder.id}`;
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('folder.actions.menuLabel'));
  toggle.setAttribute('aria-controls', actions.id);

  const renameButton = createBookmarkActionButton('✎', 'edit', 'is-dark', async () => {
    const name = await showPrompt(t('folder.renamePrompt'), {
      value: folder.name,
      placeholder: t('folder.namePlaceholder')
    });
    if (name && renameBookmarkFolder(folder.id, name)) {
      flashSuccess('flash.folder.renamed');
    }
  });
  renameButton.setAttribute('aria-label', t('folder.actions.rename'));

  const deleteButton = createBookmarkActionButton('🗑', 'delete', 'is-dark', async () => {
    const { bookmarks } = getState().data;
    const count = bookmarks.filter(bookmark => bookmark.folderId === folder.id).length;
    const confirmed = await showAlert(t('folder.confirmDelete', {
      name: folder.name,
      count
    }), { type: 'confirm' });
    if (!confirmed) return;

    if (deleteBookmarkFolder(folder.id).deleted) {
      flashSuccess('flash.folder.deleted');
    }
  });
  deleteButton.setAttribute('aria-label', t('folder.actions.delete'));

  actions.append(renameButton, deleteButton);
  menu.append(toggle, actions);
  container.append(menu);
  initBookmarkActionMenu(container, menu, toggle, actions);
}

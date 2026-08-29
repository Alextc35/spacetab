import { deleteBookmarkFolder } from '../../core/bookmarkFolders.js';
import { t } from '../../core/i18n.js';
import { getState } from '../../core/store.js';
import { createItemActionButton } from '../bookmark/actions.js';
import { flashSuccess } from '../flash.js';
import { showAlert } from '../modals/alert.js';
import { openFolderEditor } from '../modals/folderEditorModal.js';

export function addFolderActions(container, folder) {
  const actions = document.createElement('div');
  actions.className = 'item-actions folder-item-actions';
  actions.setAttribute('role', 'group');
  actions.setAttribute('aria-label', t('folder.actions.ariaLabel'));

  const editButton = createItemActionButton(
    '✎',
    'edit',
    'is-dark',
    () => openFolderEditor(folder.id)
  );
  editButton.setAttribute('aria-label', t('folder.actions.customize'));

  const deleteButton = createItemActionButton('🗑', 'delete', 'is-dark', async () => {
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

  actions.append(editButton, deleteButton);
  container.append(actions);
}

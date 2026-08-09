import { t } from '../../core/i18n.js';
import { getState } from '../../core/store.js';
import { closeModal, openModal, registerModal } from '../modalManager.js';

let initialized = false;
let input;
let results;

export function initSearchModal() {
  if (initialized) return;
  initialized = true;

  const modal = document.getElementById('search-modal');
  input = document.getElementById('search-modal-input');
  results = document.getElementById('search-modal-results');

  input.addEventListener('input', renderResults);
  document.getElementById('search-modal-close').addEventListener('click', closeModal);

  registerModal({
    id: 'search',
    element: modal,
    closeOnEsc: true,
    closeOnOverlay: true,
    shortcut: '/',
    onShortcut: openSearchModal,
    initialFocus: input
  });
}

export function openSearchModal() {
  input.value = '';
  renderResults();
  openModal('search', { onCancel: closeModal, initialFocus: input });
}

function renderResults() {
  const query = input.value.trim().toLocaleLowerCase();
  const { data: { bookmarks, settings } } = getState();
  const groups = new Map(settings.bookmarkGroups.map(group => [group.id, group.name]));
  const matches = bookmarks
    .filter(bookmark => !query || `${bookmark.name} ${bookmark.url}`.toLocaleLowerCase().includes(query))
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 30);

  results.replaceChildren();
  if (!matches.length) {
    const empty = document.createElement('p');
    empty.className = 'search-empty';
    empty.textContent = t('search.empty');
    results.append(empty);
    return;
  }

  for (const bookmark of matches) {
    const link = document.createElement('a');
    link.className = 'search-result';
    link.href = bookmark.url || '#';
    link.setAttribute('role', 'option');
    link.addEventListener('click', () => closeModal());

    const name = document.createElement('strong');
    name.textContent = bookmark.name;
    const detail = document.createElement('small');
    const workspace = groups.get(bookmark.groupId) ?? t('workspace.main');
    detail.textContent = `${workspace} · ${bookmark.url || t('search.noUrl')}`;
    link.append(name, detail);
    results.append(link);
  }
}

import { createBookmarkEditor } from './editor.js';
import { initTabs } from '../tabs.js';

const TEMPLATE_ID = 'bookmark-form-template';

/**
 * Resolves bookmark form control elements inside a mounted form root.
 *
 * @param {HTMLElement} root
 * @returns {Object}
 */
function resolveElements(root) {
  const field = (name) => root.querySelector(`[data-field="${name}"]`);

  return {
    preview: field('preview'),
    name: field('name'),
    url: field('url'),
    backgroundColor: field('backgroundColor'),
    backgroundImage: field('backgroundImage'),
    backgroundFavicon: field('backgroundFavicon'),
    noBackground: field('noBackground'),
    invertBg: field('invertBg'),
    showText: field('showText'),
    textColor: field('textColor'),
    showFavicon: field('showFavicon'),
    invertIcon: field('invertIcon'),
    urlToggleBtn: field('urlToggle'),
    urlCopyBtn: field('urlCopy'),
    urlClearBtn: field('urlClear'),
    bgToggleBtn: field('bgToggle'),
    bgCopyBtn: field('bgCopy'),
    bgClearBtn: field('bgClear')
  };
}

/**
 * Mounts a bookmark form from the shared HTML template.
 *
 * @param {Object} options
 * @param {HTMLElement} options.host - Container where the form is mounted.
 * @param {string} options.idPrefix - Unique prefix for tab panel ids.
 * @param {boolean} [options.showGeneral=true] - Whether the General tab is shown.
 * @param {Object} [options.bookmark={}] - Initial bookmark state.
 * @param {Function} [options.onChange] - Called when the form state changes.
 * @returns {Object|null}
 */
export function createBookmarkForm({
  host,
  idPrefix,
  showGeneral = true,
  bookmark = {},
  onChange
}) {
  const template = document.getElementById(TEMPLATE_ID);
  if (!host || !template) return null;

  const root = template.content.firstElementChild.cloneNode(true);
  host.replaceChildren(root);

  const panels = {
    general: root.querySelector('[data-tab-panel="general"]'),
    style: root.querySelector('[data-tab-panel="style"]'),
    text: root.querySelector('[data-tab-panel="text"]'),
    icon: root.querySelector('[data-tab-panel="icon"]')
  };

  const tabButtons = {
    general: root.querySelector('[data-tab-button="general"]'),
    style: root.querySelector('[data-tab-button="style"]'),
    text: root.querySelector('[data-tab-button="text"]'),
    icon: root.querySelector('[data-tab-button="icon"]')
  };

  const tabIds = {
    general: `${idPrefix}-tab-general`,
    style: `${idPrefix}-tab-style`,
    text: `${idPrefix}-tab-text`,
    icon: `${idPrefix}-tab-icon`
  };

  for (const [key, panel] of Object.entries(panels)) {
    if (!panel) continue;
    panel.id = tabIds[key];
  }

  for (const [key, button] of Object.entries(tabButtons)) {
    if (!button) continue;
    button.dataset.tab = tabIds[key];
  }

  if (!showGeneral) {
    tabButtons.general?.remove();
    panels.general?.remove();
    tabButtons.style?.classList.add('active');
    panels.style?.classList.remove('is-hidden');
  } else if (tabButtons.style) {
    tabButtons.style.classList.remove('active');
    panels.style?.classList.add('is-hidden');
    tabButtons.general?.classList.add('active');
    panels.general?.classList.remove('is-hidden');
  }

  const defaultTab = showGeneral ? tabIds.general : tabIds.style;

  const tabs = initTabs({
    root,
    tabButtonSelector: '.edit-bookmark-modal-tab-btn',
    tabContentSelector: '.edit-bookmark-modal-tab-content'
  });

  root.querySelectorAll('[data-field]').forEach((input) => {
    const field = input.dataset.field;
    const controlId = `${idPrefix}-${field}`;
    input.id = controlId;

    const label = input.type === 'checkbox'
      ? input.parentElement?.querySelector('label')
      : input.previousElementSibling;

    if (label?.tagName === 'LABEL' && !label.htmlFor) {
      label.htmlFor = controlId;
    }
  });

  const elements = resolveElements(root);

  const editor = createBookmarkEditor({
    elements,
    bookmark,
    onChange
  });

  return {
    root,
    elements,
    editor,
    tabs,
    defaultTab,
    reset: (state) => editor.reset(state),
    syncUI: () => editor.syncUI(),
    getState: () => editor.getState(),
    destroy: () => editor.destroy(),
    activateDefaultTab: () => tabs?.activate(defaultTab)
  };
}
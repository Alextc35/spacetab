import { renderBookmarkPreview } from './preview.js';
import { createLockableInputController } from '../modals/helper/stateLocked.js';

/**
 * Synchronization flag used to prevent update loops
 * while syncing state into the UI and vice versa.
 *
 * Note: since this lives at module scope, it would be shared
 * across multiple editor instances if they ever coexist.
 */
let syncing = false;

/**
 * Creates a bookmark editor that keeps form inputs,
 * bookmark state, and live preview in sync.
 *
 * @param {Object} params
 * @param {Object} params.elements - DOM references for form controls and preview.
 * @param {Object} params.bookmark - Initial bookmark state to edit.
 * @param {Function} params.onChange - Callback invoked with a cloned bookmark state.
 * @returns {Object} Public editor API.
 */
export function createBookmarkEditor({ elements, bookmark, onChange }) {
  const {
    preview,
    name,
    url,
    backgroundColor,
    backgroundImage,
    backgroundFavicon,
    noBackground,
    invertBg,
    showText,
    textColor,
    showFavicon,
    invertIcon,
    urlToggleBtn,
    urlCopyBtn,
    urlClearBtn,
    bgToggleBtn,
    bgCopyBtn,
    bgClearBtn
  } = elements;

  /**
   * Controllers for lockable inputs.
   * They handle lock/unlock, copy, clear, and visual refresh logic.
   */
  let bgController;
  let urlController;

  /* ===============================
     Helpers
  =============================== */

  /**
   * Returns whether the given value contains a non-empty image string.
   *
   * @param {string|null|undefined} value
   * @returns {boolean}
   */
  const hasImage = value => typeof value === "string" && value.trim() !== "";

  /**
   * Re-renders the bookmark preview when a preview container exists.
   */
  const updatePreview = () => {
    if (preview) renderBookmarkPreview(preview, bookmark);
  };

  /**
   * Emits the current bookmark state after updating the preview.
   * A cloned object is returned to avoid leaking the internal reference.
   */
  const emitChange = () => {
    updatePreview();
    onChange?.(structuredClone(bookmark));
  };

  /**
   * Updates enabled/disabled states across related controls
   * based on the current bookmark configuration.
   */
  const updateStates = () => {
    const hasBgImage = hasImage(bookmark.backgroundImageUrl);

    if (backgroundFavicon) backgroundFavicon.disabled = hasBgImage;
    if (backgroundColor) backgroundColor.disabled = bookmark.noBackground;
    if (textColor) textColor.disabled = !bookmark.showText;
    if (backgroundImage) backgroundImage.disabled = bookmark.backgroundFavicon;
    if (showFavicon) showFavicon.disabled = bookmark.backgroundFavicon;
    if (invertBg) invertBg.disabled = bookmark.backgroundFavicon || !hasBgImage;
    if (invertIcon) invertIcon.disabled = !bookmark.backgroundFavicon && !bookmark.showFavicon;
    if (url) url.disabled = bookmark.urlLocked;
  };

  /* ===============================
     Lock Controllers
  =============================== */

  /**
   * Creates the lockable controller for the background image input.
   * This keeps the bookmark state synchronized with lock/copy/clear actions.
   */
  if (backgroundImage && bgToggleBtn && !bgController) {
    bgController = createLockableInputController({
      input: backgroundImage,
      toggleBtn: bgToggleBtn,
      copyBtn: bgCopyBtn,
      clearBtn: bgClearBtn,
      initialLocked: bookmark.backgroundImageUrlLocked ?? false,
      onChange: () => {
        if (syncing) return;

        bookmark.backgroundImageUrl = backgroundImage.value.trim() || null;
        bookmark.backgroundImageUrlLocked = bgController?.isLocked() ?? false;

        updateStates();
        emitChange();
      }
    });
  }

  /**
   * Creates the lockable controller for the URL input.
   * This keeps the bookmark state synchronized with lock/copy/clear actions.
   */
  if (url && urlToggleBtn && !urlController) {
    urlController = createLockableInputController({
      input: url,
      toggleBtn: urlToggleBtn,
      copyBtn: urlCopyBtn,
      clearBtn: urlClearBtn,
      initialLocked: bookmark.urlLocked ?? false,
      onChange: () => {
        if (syncing) return;

        bookmark.url = url.value.trim() || '';
        bookmark.urlLocked = urlController?.isLocked() ?? false;

        updateStates();
        emitChange();
      }
    });
  }

  /**
   * Refreshes lockable controller UI state when available.
   */
  const refreshBgController = () => bgController?.refresh?.();
  const refreshUrlController = () => urlController?.refresh?.();

  /**
   * Resets the editor with a new bookmark state.
   * This synchronizes lock states first, then re-syncs the full UI.
   *
   * @param {Object} newState
   */
  const reset = (newState = {}) => {
    syncing = true;

    bookmark = structuredClone(newState);

    if (urlController) {
      urlController.setLocked?.(bookmark.urlLocked ?? false);
    }

    if (bgController) {
      bgController.setLocked?.(bookmark.backgroundImageUrlLocked ?? false);
    }

    syncUI();

    syncing = false;
  };

  /* ===============================
     Bind Inputs
  =============================== */

  /**
   * Binds a form control to a bookmark field.
   * Checkbox inputs use `checked`; all other inputs use `value`.
   *
   * @param {HTMLElement} input
   * @param {string} key - Bookmark property to update.
   * @param {string} type - DOM event type to listen for.
   */
  function bindInput(input, key, type = "input") {
    if (!input) return;

    input.addEventListener(type, () => {
      if (syncing) return;

      bookmark[key] = input.type === "checkbox" ? input.checked : input.value;

      updateStates();
      emitChange();
    });
  }

  bindInput(name, "name");
  bindInput(url, "url");
  bindInput(backgroundColor, "backgroundColor");
  bindInput(backgroundImage, "backgroundImageUrl");
  bindInput(backgroundFavicon, "backgroundFavicon", "change");
  bindInput(noBackground, "noBackground", "change");
  bindInput(invertBg, "invertColorBg", "change");
  bindInput(showText, "showText", "change");
  bindInput(textColor, "textColor");
  bindInput(showFavicon, "showFavicon", "change");
  bindInput(invertIcon, "invertColorIcon", "change");

  /* ===============================
     Public API
  =============================== */

  /**
   * Synchronizes the current bookmark state into the UI controls,
   * refreshes dependent control states, and updates the preview.
   */
  const syncUI = () => {
    if (name) name.value = bookmark.name ?? "";
    if (url) url.value = bookmark.url ?? "";
    if (backgroundColor) backgroundColor.value = bookmark.backgroundColor ?? "";
    if (backgroundImage) backgroundImage.value = bookmark.backgroundImageUrl ?? "";
    if (backgroundFavicon) backgroundFavicon.checked = bookmark.backgroundFavicon ?? false;
    if (noBackground) noBackground.checked = bookmark.noBackground ?? false;
    if (invertBg) invertBg.checked = bookmark.invertColorBg ?? false;
    if (showText) showText.checked = bookmark.showText ?? false;
    if (textColor) textColor.value = bookmark.textColor ?? "";
    if (showFavicon) showFavicon.checked = bookmark.showFavicon ?? false;
    if (invertIcon) invertIcon.checked = bookmark.invertColorIcon ?? false;

    updateStates();
    refreshBgController();
    refreshUrlController();
    updatePreview();
  };

  /**
   * Returns a safe cloned snapshot of the current bookmark state.
   *
   * @returns {Object}
   */
  const getState = () => structuredClone(bookmark);

  /**
   * Replaces the current editor state with a new bookmark state.
   *
   * @param {Object} newState
   */
  const setState = newState => reset(newState);

  /**
   * Clears controller references.
   *
   * Note: this does not currently remove DOM event listeners.
   */
  const destroy = () => {
    bgController = null;
    urlController = null;
  };

  // Initial sync on editor creation
  syncUI();

  return { syncUI, updatePreview, getState, setState, reset, destroy, bgController, urlController };
}
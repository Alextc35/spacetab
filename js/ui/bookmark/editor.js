import { renderBookmarkPreview } from './preview.js';
import { createLockableInputController } from '../modals/helper/stateLocked.js';

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

  let bgController;
  let urlController;

  /* ===============================
     Helpers
  =============================== */

  const hasImage = value => typeof value === "string" && value.trim() !== "";

  const updatePreview = () => {
    if (preview) renderBookmarkPreview(preview, bookmark);
  };

  const emitChange = () => {
    updatePreview();
    onChange?.(structuredClone(bookmark));
  };

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

  if (backgroundImage && bgToggleBtn && !bgController) {
    bgController = createLockableInputController({
      input: backgroundImage,
      toggleBtn: bgToggleBtn,
      copyBtn: bgCopyBtn,
      clearBtn: bgClearBtn,
      initialLocked: bookmark.backgroundImageUrlLocked ?? false,
      onChange: () => {
        bookmark.backgroundImageUrl = backgroundImage.value.trim() || null;
        bookmark.backgroundImageUrlLocked = bgController?.isLocked() ?? false;
        updateStates();
        emitChange();
      }
    });
  }

  if (url && urlToggleBtn && !urlController) {
    urlController = createLockableInputController({
      input: url,
      toggleBtn: urlToggleBtn,
      copyBtn: urlCopyBtn,
      clearBtn: urlClearBtn,
      initialLocked: bookmark.urlLocked ?? false,
      onChange: () => {
        bookmark.url = url.value.trim() || '';
        bookmark.urlLocked = urlController?.isLocked() ?? false;
        updateStates();
        emitChange();
      }
    });
  }

  const refreshBgController = () => bgController?.refresh?.();
  const refreshUrlController = () => urlController?.refresh?.();

  /* ===============================
     Bind Inputs
  =============================== */

  function bindInput(input, key, type = "input") {
    if (!input) return;
    input.addEventListener(type, () => {
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
    updatePreview();
    refreshBgController();
    refreshUrlController();
  };

  const getState = () => structuredClone(bookmark);
  const setState = newState => { bookmark = structuredClone(newState); syncUI(); };

  const destroy = () => {
    bgController = null;
    urlController = null;
  };

  syncUI();

  return { syncUI, updatePreview, getState, setState, destroy, bgController, urlController };
}
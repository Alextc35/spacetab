import { renderBookmarkPreview } from './preview.js';
import { createLockableInputController } from '../modals/helper/stateLocked.js';

export function createBookmarkEditor({
  elements,
  bookmark,
  onChange
}) {

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

    bgToggleBtn,
    bgCopyBtn,
    bgClearBtn
  } = elements;

  let bgController;

  /* ===============================
     Helpers
  =============================== */

  function updatePreview() {
    if (preview) {
      renderBookmarkPreview(preview, bookmark);
    }
  }

  function emitChange() {
    updatePreview();
    onChange?.(structuredClone(bookmark));
  }

  function hasImage(value) {
    return typeof value === "string" && value.trim() !== "";
  }

  /* ===============================
     State Rules
  =============================== */

  function updateStates() {

    const hasBgImage = hasImage(bookmark.backgroundImageUrl);

    if (backgroundFavicon) {
      backgroundFavicon.disabled = hasBgImage;
    }

    if (backgroundColor) {
      backgroundColor.disabled = bookmark.noBackground;
    }

    if (textColor) {
      textColor.disabled = !bookmark.showText;
    }

    if (backgroundImage) {
      backgroundImage.disabled = bookmark.backgroundFavicon;
    }

    if (showFavicon) {
      showFavicon.disabled = bookmark.backgroundFavicon;
    }

    if (invertBg) {
      invertBg.disabled = bookmark.backgroundFavicon || !hasBgImage;
    }

    if (invertIcon) {
      invertIcon.disabled = !bookmark.backgroundFavicon && !bookmark.showFavicon;
    }
  }

  /* ===============================
     Lock Controller
  =============================== */

  if (backgroundImage && bgToggleBtn) {

    bgController = createLockableInputController({
      input: backgroundImage,
      toggleBtn: bgToggleBtn,
      copyBtn: bgCopyBtn,
      clearBtn: bgClearBtn,
      initialLocked: bookmark.backgroundImageUrlLocked ?? false,
      onChange: () => {

        bookmark.backgroundImageUrl =
          backgroundImage.value.trim() || null;

        bookmark.backgroundImageUrlLocked =
          bgController?.isLocked() ?? false;

        updateStates();
        emitChange();
      }
    });
  }

  /* ===============================
     Bind Inputs
  =============================== */

  function bindInput(input, key, type = "input") {

    if (!input) return;

    input.addEventListener(type, () => {

      if (input.type === "checkbox") {
        bookmark[key] = input.checked;
      } else {
        bookmark[key] = input.value;
      }

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

  function syncUI() {

    if (name) name.value = bookmark.name ?? "";
    if (url) url.value = bookmark.url ?? "";

    if (backgroundColor) backgroundColor.value = bookmark.backgroundColor;
    if (backgroundImage) backgroundImage.value = bookmark.backgroundImageUrl ?? "";

    if (backgroundFavicon) backgroundFavicon.checked = bookmark.backgroundFavicon;
    if (noBackground) noBackground.checked = bookmark.noBackground;

    if (invertBg) invertBg.checked = bookmark.invertColorBg;

    if (showText) showText.checked = bookmark.showText;
    if (textColor) textColor.value = bookmark.textColor;

    if (showFavicon) showFavicon.checked = bookmark.showFavicon;
    if (invertIcon) invertIcon.checked = bookmark.invertColorIcon;

    updateStates();
    updatePreview();
  }

  function getState() {
    return structuredClone(bookmark);
  }

  function setState(newState) {
    bookmark = structuredClone(newState);
    syncUI();
  }

  syncUI();

  return {
    syncUI,
    updatePreview,
    getState,
    setState
  };
}
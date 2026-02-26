export async function loadTranslations(lang) {
  const url = chrome.runtime.getURL(`js/core/i18n/lang/${lang}.json`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load translations: ${lang}`);
  }

  return response.json();
}
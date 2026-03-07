export function initTabs({
  root,
  tabButtonSelector,
  tabContentSelector,
  activeClass = 'active',
  hiddenClass = 'is-hidden'
}) {

  const rootEl =
    typeof root === 'string'
      ? document.querySelector(root)
      : root;

  if (!rootEl) return;

  const buttons = rootEl.querySelectorAll(tabButtonSelector);
  const contents = rootEl.querySelectorAll(tabContentSelector);

  function activate(tabId) {

    buttons.forEach(btn => btn.classList.remove(activeClass));

    contents.forEach(tab => {
      tab.classList.add(hiddenClass);
    });

    const btn = rootEl.querySelector(
      `${tabButtonSelector}[data-tab="${tabId}"]`
    );

    if (btn) btn.classList.add(activeClass);

    const content = rootEl.querySelector(`#${tabId}`);

    if (content) {
      content.classList.remove(hiddenClass);

      requestAnimationFrame(() => {
        content.scrollTop = 0;
      });
    }

  }

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      activate(btn.dataset.tab);
    });
  });

  return { activate };

}
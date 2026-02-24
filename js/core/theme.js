export function applyGlobalTheme(settings = {}) {
  const root = document.documentElement;

  const theme = settings.theme || {};

  root.style.setProperty(
    '--color-bg-body',
    theme.backgroundColor || '#000000'
  );

  if (theme.backgroundImageUrl) {
    root.style.setProperty(
      '--image-bg-body',
      `url("${theme.backgroundImageUrl}")`
    );
  } else {
    root.style.setProperty('--image-bg-body', 'none');
  }
}
export function applyGlobalTheme(settings) {
  const root = document.documentElement;

  root.style.setProperty(
    '--color-background-body',
    settings.theme.backgroundColor
  );

  if (settings.theme.backgroundImageUrl) {
    root.style.setProperty(
      '--image-background-body',
      `url("${settings.theme.backgroundImageUrl}")`
    );
  } else {
    root.style.setProperty('--image-background-body', 'none');
  }
}
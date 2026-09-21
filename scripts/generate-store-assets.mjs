import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = fileURLToPath(new URL('..', import.meta.url));
const output = resolve(root, 'assets/store');
await mkdir(output, { recursive: true });
const mimeTypes = new Map([
  ['.css', 'text/css'],
  ['.gif', 'image/gif'],
  ['.html', 'text/html'],
  ['.js', 'text/javascript'],
  ['.json', 'application/json'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp']
]);

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const file = resolve(root, `.${pathname}`);
    if (relative(root, file).startsWith(`..${sep}`) || relative(root, file) === '..') {
      response.writeHead(403).end();
      return;
    }
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    response.writeHead(200, { 'Content-Type': mimeTypes.get(extname(file)) ?? 'application/octet-stream' });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404).end();
  }
});

await new Promise((resolveListen, rejectListen) => {
  server.once('error', rejectListen);
  server.listen(0, '127.0.0.1', resolveListen);
});

const { port } = server.address();
const browser = await chromium.launch({ channel: 'chromium' });

try {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'dark',
    deviceScaleFactor: 1
  });
  await context.route(/^https?:/, route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });

  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${port}/tests/browser-harness.html`);
  await page.getByRole('link', { name: /DEVELOPED BY/ }).waitFor();

  const cards = [
    ['mail', 'Mail', '#ea4335', 0, 0, 2, 1],
    ['calendar', 'Calendar', '#2563eb', 2, 0, 2, 1],
    ['notes', 'Notes', '#7c3aed', 4, 0, 2, 2],
    ['design', 'Design', '#db2777', 0, 1, 2, 1],
    ['projects', 'Projects', '#0891b2', 2, 1, 2, 1],
    ['music', 'Music', '#16a34a', 0, 2, 2, 2],
    ['tasks', 'Tasks', '#f97316', 2, 2, 2, 1],
    ['ideas', 'Ideas', '#9333ea', 4, 2, 2, 1],
    ['chat', 'Chat', '#0284c7', 6, 2, 2, 1],
    ['analytics', 'Analytics', '#0f766e', 2, 3, 2, 1],
    ['finance', 'Finance', '#ca8a04', 4, 3, 2, 1],
    ['docs', 'Documents', '#4f46e5', 6, 3, 2, 1]
  ].map(([id, name, backgroundColor, gx, gy, w, h]) => ({
    id,
    name,
    url: `https://${id}.internal`,
    groupId: 'focus',
    gx,
    gy,
    w,
    h,
    backgroundFavicon: false,
    showFavicon: false,
    showText: true,
    noBackground: false,
    backgroundColor,
    textColor: '#ffffff'
  }));
  cards.push(
    { id: 'read-1', name: 'Articles', url: 'https://articles.internal', folderId: 'reading', groupId: 'focus' },
    { id: 'read-2', name: 'Research', url: 'https://research.internal', folderId: 'reading', groupId: 'focus' }
  );

  const starfield = `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1000" viewBox="0 0 1600 1000"><defs><radialGradient id="space"><stop stop-color="#312e81"/><stop offset=".42" stop-color="#111827"/><stop offset="1" stop-color="#030712"/></radialGradient><radialGradient id="glow"><stop stop-color="#38bdf8" stop-opacity=".48"/><stop offset="1" stop-color="#38bdf8" stop-opacity="0"/></radialGradient><pattern id="stars" width="86" height="73" patternUnits="userSpaceOnUse"><circle cx="8" cy="11" r="1.2" fill="#fff" opacity=".72"/><circle cx="57" cy="36" r=".8" fill="#bae6fd" opacity=".62"/><circle cx="31" cy="65" r=".6" fill="#fff" opacity=".45"/></pattern></defs><rect width="1600" height="1000" fill="url(#space)"/><ellipse cx="1320" cy="170" rx="520" ry="380" fill="url(#glow)"/><rect width="1600" height="1000" fill="url(#stars)"/></svg>`)}`;

  await page.evaluate(({ bookmarks, themeBackground }) => new Promise(resolveSet => {
    chrome.storage.local.set({
      schemaVersion: 9,
      bookmarks,
      folders: [{
        id: 'reading',
        name: 'Reading list',
        groupId: 'focus',
        gx: 6,
        gy: 0,
        w: 2,
        h: 2,
        noBackground: false,
        backgroundColor: '#f59e0b',
        textColor: '#ffffff',
        showFolder: true,
        showPreviews: true,
        showName: true,
        showCount: true
      }],
      settings: {
        language: 'en',
        interfaceTheme: 'dark',
        theme: {
          backgroundDefault: false,
          backgroundSolid: false,
          backgroundColor: '#070b18',
          backgroundImageUrl: themeBackground
        },
        bookmarkGroups: [
          { id: 'focus', name: 'Focus' },
          { id: 'personal', name: 'Personal' },
          { id: 'inspiration', name: 'Inspiration' }
        ],
        activeBookmarkGroupId: 'focus'
      }
    }, resolveSet);
  }), { bookmarks: cards, themeBackground: starfield });
  await page.reload();
  await page.locator('#bookmark-container .bookmark').first().waitFor();
  await page.screenshot({
    path: resolve(output, 'screenshot-1280x800.png'),
    animations: 'disabled'
  });
  await page.locator('#settings').evaluate(button => button.click());
  await page.locator('#settings-modal').waitFor({ state: 'visible' });
  await page.screenshot({
    path: resolve(output, 'screenshot-settings-1280x800.png'),
    animations: 'disabled'
  });

  const icon = (await readFile(resolve(root, 'assets/icons/icon-128.png'))).toString('base64');
  await page.setViewportSize({ width: 440, height: 280 });
  await page.setContent(`<!doctype html>
    <html lang="en"><head><meta charset="utf-8"><style>
      * { box-sizing: border-box; }
      html, body { width: 440px; height: 280px; margin: 0; overflow: hidden; }
      body {
        color: #fff; font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        background:
          radial-gradient(circle at 82% 12%, rgba(56,189,248,.35), transparent 32%),
          radial-gradient(circle at 18% 100%, rgba(124,58,237,.42), transparent 38%),
          #070b18;
      }
      main { position: relative; width: 100%; height: 100%; padding: 32px 34px; }
      .brand { display: flex; align-items: center; gap: 18px; }
      .brand img { width: 82px; height: 82px; filter: drop-shadow(0 12px 24px rgba(0,0,0,.4)); }
      h1 { margin: 0; font-size: 40px; letter-spacing: -.045em; line-height: 1; }
      p { margin: 9px 0 0; color: #cbd5e1; font-size: 16px; line-height: 1.35; }
      .cards { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; margin-top: 30px; }
      .card { height: 62px; border: 1px solid rgba(255,255,255,.13); border-radius: 13px;
        background: rgba(255,255,255,.08); box-shadow: 0 14px 30px rgba(0,0,0,.22); }
      .card:nth-child(1) { background: linear-gradient(145deg,#2563eb,#1d4ed8); }
      .card:nth-child(2) { background: linear-gradient(145deg,#7c3aed,#6d28d9); }
      .card:nth-child(3) { background: linear-gradient(145deg,#db2777,#be185d); }
      .card:nth-child(4) { background: linear-gradient(145deg,#0891b2,#0e7490); }
      .card:nth-child(5) { background: linear-gradient(145deg,#16a34a,#15803d); }
      .shine { position:absolute; inset:-80px auto auto 210px; width:280px; height:180px;
        border:1px solid rgba(255,255,255,.08); border-radius:50%; transform:rotate(-18deg); }
    </style></head><body><main>
      <div class="shine"></div>
      <div class="brand"><img src="data:image/png;base64,${icon}" alt="">
        <div><h1>NewDeskTab</h1><p>Your new tab, organized your way.</p></div>
      </div>
      <div class="cards"><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div><div class="card"></div></div>
    </main></body></html>`);
  await page.screenshot({
    path: resolve(output, 'promo-small-440x280.png'),
    animations: 'disabled'
  });
  await context.close();
  console.log('Created Chrome Web Store assets in assets/store/.');
} finally {
  await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

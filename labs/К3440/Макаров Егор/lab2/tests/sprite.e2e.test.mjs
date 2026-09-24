import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const web = 'http://127.0.0.1:5172';
const screenshots = resolve(root, '../../../../homeworks/К3440/Макаров Егор/hw4/screenshots');
const expected = ['search', 'calendar', 'user', 'logout', 'pin', 'arrow-right', 'arrow-left'];
let processGroup;
let browser;

async function webIsReady() {
  try {
    return (await fetch(web)).ok;
  } catch {
    return false;
  }
}

async function waitForWeb() {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (await webIsReady()) return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error('Web application did not start in time.');
}

function visibleIconNames(page) {
  return page.locator('svg.tt-icon use').evaluateAll((uses) => uses
    .filter((use) => {
      const svg = use.closest('svg');
      const box = svg?.getBoundingClientRect();
      return box && box.width > 0 && box.height > 0 && getComputedStyle(svg).visibility !== 'hidden';
    })
    .map((use) => use.getAttribute('href').split('#icon-')[1]));
}

before(async () => {
  if (!(await webIsReady())) {
    processGroup = spawn('npm', ['run', 'dev'], { cwd: root, env: { ...process.env }, stdio: 'pipe', shell: true, detached: true });
  }
  await waitForWeb();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (processGroup?.pid) {
    try { process.kill(-processGroup.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});

test('svg sprite: symbols are reusable, visible and have correct decorative accessibility', async () => {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  await page.goto(`${web}/index.html`);
  await page.locator('.restaurant-card').first().waitFor();
  await page.waitForFunction(() => document.querySelectorAll('svg.tt-icon use').length >= 8);
  const indexNames = await visibleIconNames(page);
  for (const name of ['search', 'calendar', 'user', 'pin', 'arrow-right']) assert.ok(indexNames.includes(name), `icon-${name} is visible on the search page`);
  await page.screenshot({ path: resolve(screenshots, 'sprite-search-page.png'), fullPage: true });

  const sprite = await page.locator('#tt-svg-sprite').innerHTML();
  for (const name of expected) {
    assert.match(sprite, new RegExp(`<symbol id=["']icon-${name}["']`));
  }
  assert.match(sprite, /(?:fill|stroke)=["']currentColor["']/);
  assert.equal(await page.locator('#tt-svg-sprite svg[aria-hidden="true"][focusable="false"]').count(), 1);
  assert.equal(await page.locator('svg.tt-icon[aria-hidden="true"][focusable="false"]').count() >= 8, true);
  assert.equal(await page.locator('.nav-link[href="index.html"]').getAttribute('aria-current'), 'page');

  await page.goto(`${web}/login.html`);
  await page.getByRole('button', { name: 'Подставить демо-данные' }).click();
  await page.getByRole('button', { name: 'Войти в учебный профиль' }).click();
  await page.waitForURL('**/profile.html');
  await page.waitForFunction(() => document.querySelector('svg.tt-icon--logout'));
  assert.ok((await visibleIconNames(page)).includes('logout'), 'icon-logout is visible after authentication');

  await page.goto(`${web}/restaurant.html?id=baltic-table`);
  await page.getByRole('heading', { name: 'Балтийский стол' }).waitFor();
  await page.waitForFunction(() => document.querySelector('svg.tt-icon--arrow-left'));
  const detailNames = await visibleIconNames(page);
  for (const name of ['logout', 'pin', 'calendar', 'arrow-left']) assert.ok(detailNames.includes(name), `icon-${name} is visible on the restaurant page`);
  await page.screenshot({ path: resolve(screenshots, 'sprite-restaurant-page.png'), fullPage: true });

  assert.deepEqual([...new Set([...indexNames, ...detailNames])].sort(), expected.sort());
  await context.close();
});

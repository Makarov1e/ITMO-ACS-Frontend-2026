import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const web = 'http://127.0.0.1:5172';
let processGroup;
let browser;

async function waitForWeb() {
  const deadline = Date.now() + 20_000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(web);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  throw new Error(`Web application did not start in time: ${lastError?.message || 'no response'}`);
}

before(async () => {
  processGroup = spawn('npm', ['run', 'dev'], { cwd: root, env: { ...process.env }, stdio: 'pipe', shell: true, detached: true });
  await waitForWeb();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (processGroup?.pid) {
    try { process.kill(-processGroup.pid, 'SIGTERM'); } catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
});

test('theme: light, dark and system choice persist and system preference changes apply live', async () => {
  const context = await browser.newContext({ colorScheme: 'light', viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await page.goto(`${web}/index.html`);
  await page.getByRole('radio', { name: 'Система' }).waitFor();

  await assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await assert.equal(await page.locator('html').getAttribute('data-theme-preference'), 'system');
  await assert.doesNotReject(() => page.getByRole('group', { name: 'Оформление' }).waitFor());

  await page.locator('label[for="theme-dark"]').click();
  await assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await assert.equal(await page.evaluate(() => localStorage.getItem('tabletime.theme')), 'dark');
  await page.screenshot({ path: resolve(root, '../../../../homeworks/К3440/Макаров Егор/hw3/screenshots/tabletime-dark.png'), fullPage: true });

  await page.reload();
  await assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await assert.equal(await page.getByRole('radio', { name: 'Тёмная' }).isChecked(), true);

  await page.locator('label[for="theme-light"]').click();
  await assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await assert.equal(await page.evaluate(() => localStorage.getItem('tabletime.theme')), 'light');
  await page.screenshot({ path: resolve(root, '../../../../homeworks/К3440/Макаров Егор/hw3/screenshots/tabletime-light.png'), fullPage: true });

  await page.locator('label[for="theme-system"]').click();
  await assert.equal(await page.evaluate(() => localStorage.getItem('tabletime.theme')), 'system');
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await assert.equal(await page.locator('html').getAttribute('data-theme-preference'), 'system');
  await page.screenshot({ path: resolve(root, '../../../../homeworks/К3440/Макаров Егор/hw3/screenshots/tabletime-system-dark.png'), fullPage: true });

  await page.emulateMedia({ colorScheme: 'light' });
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await context.close();
});

test('theme: both color schemes retain readable contrast and visible keyboard focus', async () => {
  for (const scheme of ['light', 'dark']) {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.addInitScript((selectedScheme) => localStorage.setItem('tabletime.theme', selectedScheme), scheme);
    await page.goto(`${web}/index.html`);
    await page.waitForFunction((selectedScheme) => document.documentElement.dataset.theme === selectedScheme, scheme);
    const result = await page.evaluate(() => {
      const contrast = (foreground, background) => {
        const parse = (color) => {
          if (color.startsWith('#')) {
            const hex = color.slice(1);
            const normalized = hex.length === 3 ? [...hex].map((part) => `${part}${part}`).join('') : hex;
            return [0, 2, 4].map((start) => Number.parseInt(normalized.slice(start, start + 2), 16));
          }
          return color.match(/\d+(?:\.\d+)?/g).slice(0, 3).map(Number);
        };
        const toLinear = (value) => value.map((channel) => {
          const normalized = channel / 255;
          return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
        });
        const [r1, g1, b1] = toLinear(parse(foreground));
        const [r2, g2, b2] = toLinear(parse(background));
        const luminance = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
        const a = luminance(r1, g1, b1);
        const b = luminance(r2, g2, b2);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      };
      const root = getComputedStyle(document.documentElement);
      const css = (name) => root.getPropertyValue(name).trim();
      return {
        body: contrast(css('--tt-ink'), css('--tt-milk')),
        field: contrast(css('--tt-ink'), css('--tt-field-bg')),
        outline: contrast(css('--tt-outline'), css('--tt-paper'))
      };
    });
    assert.ok(result.body >= 4.5, `${scheme} body contrast is ${result.body}`);
    assert.ok(result.field >= 4.5, `${scheme} form contrast is ${result.field}`);
    assert.ok(result.outline >= 4.5, `${scheme} outline button contrast is ${result.outline}`);

    await page.getByRole('radio', { name: 'Система' }).focus();
    await assert.equal(await page.getByRole('radio', { name: 'Система' }).evaluate((element) => document.activeElement === element), true);
    await context.close();
  }
});

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
  processGroup = spawn('npm', ['run', 'dev'], {
    cwd: root,
    env: { ...process.env },
    stdio: 'pipe',
    shell: true,
    detached: true
  });
  await waitForWeb();
  browser = await chromium.launch({ headless: true });
});

after(async () => {
  await browser?.close();
  if (processGroup?.pid) process.kill(-processGroup.pid, 'SIGTERM');
});

test('a11y: search page has landmarks, named controls and a visible skip-link focus target', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${web}/index.html`);
  await page.getByRole('main').waitFor();

  await assert.doesNotReject(() => page.getByRole('navigation', { name: 'Основная навигация' }).waitFor());
  await assert.doesNotReject(() => page.getByRole('main').waitFor());
  await assert.doesNotReject(() => page.getByRole('searchbox', { name: 'Поиск' }).waitFor());
  await assert.doesNotReject(() => page.getByRole('combobox', { name: 'Кухня' }).waitFor());
  await assert.doesNotReject(() => page.getByRole('button', { name: 'Сбросить фильтры' }).waitFor());

  await page.keyboard.press('Tab');
  const skipLink = page.getByRole('link', { name: 'Перейти к основному содержимому' });
  await assert.equal(await skipLink.evaluate((element) => document.activeElement === element), true);
  await assert.equal(await skipLink.evaluate((element) => getComputedStyle(element).transform !== 'none'), true);
  await page.keyboard.press('Enter');
  await assert.equal(await page.locator('#main-content').evaluate((element) => document.activeElement === element), true);
  await page.close();
});

test('a11y: login form has labels and native invalid state is exposed', async () => {
  const page = await browser.newPage();
  await page.goto(`${web}/login.html`);
  await page.getByRole('heading', { name: 'Войти' }).waitFor();

  await assert.equal(await page.locator('#loginEmail').evaluate((element) => element.labels[0].textContent.includes('E-mail')), true);
  await assert.equal(await page.locator('#loginPassword').evaluate((element) => element.labels[0].textContent.includes('Пароль')), true);
  await page.getByRole('button', { name: 'Войти в учебный профиль' }).click();
  await assert.equal(await page.locator('#loginEmail').getAttribute('aria-invalid'), 'true');
  await assert.equal(await page.locator('#loginPassword').getAttribute('aria-invalid'), 'true');
  await page.close();
});

test('a11y: booking dialog uses named modal semantics and returns focus', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${web}/login.html`);
  await page.getByRole('button', { name: 'Подставить демо-данные' }).click();
  await page.getByRole('button', { name: 'Войти в учебный профиль' }).click();
  await page.waitForURL('**/profile.html');
  await page.goto(`${web}/restaurant.html?id=baltic-table`);
  const opener = page.getByRole('button', { name: 'Забронировать столик' });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Забронировать столик' });
  await dialog.waitFor();
  await assert.equal(await dialog.getAttribute('aria-modal'), 'true');
  await assert.equal(await dialog.locator('#bookingDate').evaluate((element) => element.labels[0].textContent.includes('Дата')), true);
  await page.getByRole('button', { name: 'Закрыть форму бронирования' }).click();
  await dialog.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => document.activeElement?.id === 'detailReserve');
  await assert.equal(await opener.evaluate((element) => document.activeElement === element), true);
  await context.close();
});

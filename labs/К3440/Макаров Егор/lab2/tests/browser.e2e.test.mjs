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

before(async () => {
  processGroup = spawn('npm', ['run', 'dev'], { cwd: root, env: { ...process.env }, stdio: 'pipe', shell: true, detached: true });
  const deadline = Date.now() + 15000;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(web);
      if (response.ok) break;
    } catch (error) { lastError = error; }
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
  }
  try {
    const response = await fetch(web);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
  } catch (error) { throw new Error(`Web application did not start in time: ${error.message || lastError?.message}`); }
  browser = await chromium.launch({ headless: true });
});
after(async () => {
  await browser?.close();
  if (processGroup?.pid) process.kill(-processGroup.pid, 'SIGTERM');
});

test('browser: demo login and reservation create, edit, cancel', async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(`${web}/login.html`);
  await page.getByRole('button', { name: 'Подставить демо-данные' }).click();
  await page.getByRole('button', { name: 'Войти в учебный профиль' }).click();
  await page.waitForURL('**/profile.html');
  await assert.doesNotReject(() => page.getByRole('heading', { name: 'Гость TableTime' }).waitFor());
  await page.screenshot({ path: resolve(root, 'screenshots', 'e2e-profile-authenticated.png'), fullPage: true });
  await page.goto(`${web}/restaurant.html?id=baltic-table`);
  await page.getByRole('button', { name: 'Забронировать столик' }).click();
  const form = page.locator('#bookingForm');
  await form.locator('#bookingDate').fill('2030-08-20');
  await form.locator('#bookingTime').selectOption('19:00');
  await form.locator('#bookingGuests').selectOption('2');
  await form.locator('#bookingComment').fill('E2E-проверка');
  await form.getByRole('button', { name: 'Подтвердить бронь' }).click();
  await page.waitForURL('**/bookings.html?created=1');
  await page.getByText('E2E-проверка').waitFor();
  await page.screenshot({ path: resolve(root, 'screenshots', 'e2e-booking-created.png'), fullPage: true });
  await page.getByRole('button', { name: 'Изменить' }).click();
  await page.locator('#bookingGuests').selectOption('3');
  await page.locator('#bookingForm').getByRole('button', { name: 'Сохранить изменения' }).click();
  await page.waitForURL('**/bookings.html?updated=1');
  await page.getByText('3 гостей').waitFor();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Отменить' }).click();
  await page.getByText('Пока нет бронирований').waitFor();
  await page.screenshot({ path: resolve(root, 'screenshots', 'e2e-bookings-empty.png'), fullPage: true });
  await page.close();
});

test('browser: unauthenticated private page redirects to login', async () => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(`${web}/bookings.html`);
  await page.waitForURL('**/login.html?next=bookings.html');
  assert.match(await page.title(), /Вход/);
  await context.close();
});

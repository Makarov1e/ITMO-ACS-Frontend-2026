import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.SMOKE_PORT || 41731);
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const pages = ['index.html', 'login.html', 'register.html', 'profile.html', 'restaurant.html', 'bookings.html'];
const baseUrl = `http://127.0.0.1:${port}`;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForPreview(preview) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (preview.exitCode !== null) throw new Error(`Vite Preview завершился с кодом ${preview.exitCode}.`);
    try {
      const response = await fetch(`${baseUrl}/index.html`);
      if (response.ok) return;
    } catch {
      // Сервер ещё запускается.
    }
    await delay(150);
  }
  throw new Error('Vite Preview не стал доступен за 6 секунд.');
}

function stopPreview(preview) {
  if (preview.exitCode !== null) return;
  try {
    process.kill(-preview.pid, 'SIGTERM');
  } catch {
    preview.kill('SIGTERM');
  }
}

async function main() {
  await Promise.all(pages.map((page) => access(path.join(root, 'dist', page))));

  const preview = spawn(npm, ['run', 'preview', '--', '--port', String(port), '--strictPort'], {
    cwd: root,
    detached: process.platform !== 'win32',
    stdio: 'pipe'
  });
  let previewLog = '';
  preview.stderr.on('data', (chunk) => { previewLog += chunk; });
  preview.stdout.on('data', (chunk) => { previewLog += chunk; });

  try {
    await waitForPreview(preview);
    for (const page of pages) {
      const response = await fetch(`${baseUrl}/${page}`);
      const html = await response.text();
      if (!response.ok) throw new Error(`${page}: ожидался HTTP 200, получен ${response.status}.`);
      if (!html.includes('<html lang="ru">') || !html.includes('type="module"') || !html.includes('id="site-header"')) {
        throw new Error(`${page}: собранная страница не содержит русскую HTML-разметку, module-скрипт или общий header.`);
      }
    }
    console.log(`Smoke PASS: Vite Preview отдал ${pages.length}/${pages.length} HTML-страниц на порту ${port}.`);
  } catch (error) {
    if (previewLog.trim()) process.stderr.write(`Vite Preview log:\n${previewLog}\n`);
    throw error;
  } finally {
    stopPreview(preview);
  }
}

main().catch((error) => {
  console.error(`Smoke FAIL: ${error.message}`);
  process.exitCode = 1;
});

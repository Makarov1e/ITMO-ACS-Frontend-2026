import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gameRoot = process.argv[2];
const url = process.argv[3] || 'http://127.0.0.1:4180/?locale=ru_RU&NODEMO';
if (!gameRoot) throw new Error('Usage: node scripts/verify-git.mjs /path/to/learn-git-branching [URL]');
const manifest = fs.readFileSync(path.join(gameRoot, 'src/levels/generated/manifest.js'), 'utf8');
const ids = ['intro1', 'intro2', 'intro3', 'intro4', ...Array.from({ length: 8 }, (_, i) => `remote${i + 1}`), ...Array.from({ length: 8 }, (_, i) => `remoteAdvanced${i + 1}`)];
const sourceCommit = execFileSync('git', ['-C', gameRoot, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
function definition(id) {
  const match = manifest.match(new RegExp(`id: "${id}"[\\s\\S]*?import\\("([^" ]+)"\\)`));
  if (!match) throw new Error(`Level not in official manifest: ${id}`);
  const file = path.resolve(gameRoot, 'src/levels/generated', match[1]);
  const context = { exports: {} };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context, { filename: file });
  return { id, name: context.exports.level.name.ru_RU, commands: context.exports.level.solutionCommand.split(';').filter(Boolean), source: path.relative(gameRoot, file) };
}
fs.mkdirSync(path.join(output, 'evidence'), { recursive: true });
fs.mkdirSync(path.join(output, 'screenshots/git'), { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const journal = { game: 'Learn Git Branching', source: 'https://github.com/pcottle/learnGitBranching', sourceCommit, method: 'Visible terminal commands; original game checker; no completion-state modifications', results: [] };
const save = () => fs.writeFileSync(path.join(output, 'evidence/git-results.json'), JSON.stringify(journal, null, 2) + '\n');
try {
  await page.goto(url, { waitUntil: 'networkidle' });
  for (const id of ids) {
    const level = definition(id);
    console.log(`START ${id}: ${level.commands.length} commands`);
    const terminal = page.locator('#commandTextField');
    // These official options only suppress introductory slides and automatic hints.
    // They do not change repository state, checker logic, or completion flags.
    await terminal.fill(`level ${id} --noIntroDialog --noStartCommand`);
    await terminal.press('Enter');
    await page.waitForTimeout(1800);
    await terminal.fill(level.commands.join(';'));
    await terminal.press('Enter');
    const result = page.locator('.modalView.show').filter({ hasText: 'Ты прошёл уровень' });
    await result.waitFor({ state: 'visible', timeout: 90000 });
    const confirmation = await result.innerText();
    if (!confirmation.includes('Ты прошёл уровень')) throw new Error(`${id}: no real checker confirmation`);
    const screenshot = `screenshots/git/${id}.png`;
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(output, screenshot), fullPage: false });
    journal.results.push({ ...level, accepted: true, confirmation, screenshot, checkedAt: new Date().toISOString() });
    save();
    console.log(`PASS ${id}`);
    await result.locator('.cancelButton').click();
    await result.waitFor({ state: 'hidden' });
    await page.waitForTimeout(900);
  }
  console.log(`PASS ${journal.results.length}/${ids.length} required levels`);
} catch (error) {
  await page.screenshot({ path: path.join(output, 'evidence/git-error.png'), fullPage: false });
  fs.writeFileSync(path.join(output, 'evidence/git-error.txt'), await page.locator('body').innerText());
  save();
  throw error;
} finally {
  await browser.close();
}

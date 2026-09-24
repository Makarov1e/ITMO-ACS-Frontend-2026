import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const froggy = vm.runInNewContext(fs.readFileSync(path.join(root, 'flexbox-froggy-playthrough.js'), 'utf8') + '\nflexboxFroggySolutions;');
const gardenObject = vm.runInNewContext(fs.readFileSync(path.join(root, 'grid-garden-playthrough.js'), 'utf8') + '\ngridGardenSolutions;');
const garden = Object.values(gardenObject);
const games = [{ id: 'flexbox-froggy', url: 'https://flexboxfroggy.com/#ru', answers: froggy }, { id: 'grid-garden', url: 'https://cssgridgarden.com/#ru', answers: garden }];
fs.mkdirSync(path.join(root, 'evidence'), { recursive: true });
fs.mkdirSync(path.join(root, 'solutions'), { recursive: true });
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });
fs.writeFileSync(path.join(root, 'solutions/css.json'), JSON.stringify({ froggy, garden }, null, 2) + '\n');
const browser = await chromium.launch({ headless: true });
try {
  for (const game of games) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const result = { game: game.id, url: game.url, method: 'Normal textarea input and Next button; original checker; fresh browser context', results: [] };
    const save = () => fs.writeFileSync(path.join(root, `evidence/${game.id}-results.json`), JSON.stringify(result, null, 2) + '\n');
    try {
      await page.goto(game.url, { waitUntil: 'networkidle' });
      await page.waitForSelector('#code');
      for (let i = 0; i < game.answers.length; i++) {
        const level = i + 1;
        await page.waitForFunction(expected => Number(document.querySelector('#level-indicator').innerText.match(/\d+/)?.[0]) === expected, level);
        await page.locator('#code').fill(game.answers[i]);
        await page.locator('#code').press('End');
        await page.waitForFunction(() => !document.querySelector('#next').classList.contains('disabled'), null, { timeout: 10000 });
        const ui = await page.locator('#level-indicator').innerText();
        result.results.push({ level, accepted: true, code: game.answers[i], ui, checkedAt: new Date().toISOString() });
        save();
        console.log(`PASS ${game.id} ${level}/${game.answers.length}`);
        if (level < game.answers.length) await page.locator('#next').click();
      }
      await page.screenshot({ path: path.join(root, `screenshots/${game.id}-last-level.png`), fullPage: true });
      await page.locator('#next').click();
      await page.locator('#share').waitFor({ state: 'visible', timeout: 15000 });
      await page.locator('#editor').waitFor({ state: 'hidden' });
      result.finalScreen = await page.locator('body').innerText();
      result.screenshot = `screenshots/${game.id}-complete.png`;
      await page.screenshot({ path: path.join(root, result.screenshot), fullPage: true });
      save();
    } catch (error) {
      save();
      await page.screenshot({ path: path.join(root, `evidence/${game.id}-error.png`), fullPage: true });
      throw error;
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

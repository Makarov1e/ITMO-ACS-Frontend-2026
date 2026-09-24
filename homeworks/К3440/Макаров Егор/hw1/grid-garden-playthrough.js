/*
 * Воспроизводимый сценарий для реальной страницы https://cssgridgarden.com/#ru.
 * Перед запуском в console страницы штатно выбрать уровень 1 через меню игры,
 * затем выполнить: await enterAndCheckGridGarden(1, 28)
 *
 * Скрипт использует только видимый textarea #code, события ввода и штатную
 * кнопку #next. Он не читает и не записывает localStorage, cookies или
 * внутреннее состояние игры. Проверка происходит встроенным checker: уровень
 * засчитывается, только если кнопка #next стала активной.
 */
const gridGardenSolutions = {
  1: 'grid-column-start: 3;',
  2: 'grid-column-start: 5;',
  3: 'grid-column-end: 4;',
  4: 'grid-column-end: 2;',
  5: 'grid-column-end: -2;',
  6: 'grid-column-start: -3;',
  7: 'grid-column-end: span 2;',
  8: 'grid-column-end: span 5;',
  9: 'grid-column-start: span 3;',
  10: 'grid-column: 4 / 6;',
  11: 'grid-column: 2 / span 3;',
  12: 'grid-row-start: 3;',
  13: 'grid-row: 3 / 6;',
  14: 'grid-column: 2;\ngrid-row: 5;',
  15: 'grid-column: 2 / 6;\ngrid-row: 1 / 6;',
  16: 'grid-area: 1 / 2 / 4 / 6;',
  17: 'grid-area: 2 / 3 / 5 / 6;',
  18: 'order: 2;',
  19: 'order: -1;',
  20: 'grid-template-columns: 50% 50%;',
  21: 'grid-template-columns: repeat(8, 12.5%);',
  22: 'grid-template-columns: 100px 3em 40%;',
  23: 'grid-template-columns: 1fr 5fr;',
  24: 'grid-template-columns: 50px 1fr 1fr 1fr 50px;',
  25: 'grid-template-columns: 75px 3fr 2fr;\ngrid-template-rows: 100%;',
  26: 'grid-template-rows: 50px 0 0 0 1fr;',
  27: 'grid-template: 60% / 200px 1fr;',
  28: 'grid-template: 1fr 50px / 1fr 4fr;'
};

async function enterAndCheckGridGarden(startLevel, endLevel) {
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const getLevel = () => Number(document.querySelector('#level-indicator').innerText.match(/\d+/)?.[0]);
  const setTextareaValue = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  const log = [];

  for (let level = startLevel; level <= endLevel; level += 1) {
    if (getLevel() !== level) throw new Error(`Expected level ${level}, found ${getLevel()}`);
    const editor = document.querySelector('#code');
    setTextareaValue.call(editor, gridGardenSolutions[level]);
    editor.dispatchEvent(new Event('input', { bubbles: true }));
    editor.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ';' }));
    await sleep(500);

    const next = document.querySelector('#next');
    if (next.classList.contains('disabled')) throw new Error(`Level ${level}: checker rejected CSS`);
    log.push({
      level,
      checker: 'accepted',
      solution: gridGardenSolutions[level],
      ui: document.querySelector('#level-indicator').innerText.trim()
    });

    if (level < endLevel) {
      next.click();
      for (let attempt = 0; attempt < 30 && getLevel() !== level + 1; attempt += 1) await sleep(250);
      if (getLevel() !== level + 1) throw new Error(`Level ${level}: game did not advance`);
    }
  }
  return log;
}

// Example in browser console after selecting level 1: await enterAndCheckGridGarden(1, 28)

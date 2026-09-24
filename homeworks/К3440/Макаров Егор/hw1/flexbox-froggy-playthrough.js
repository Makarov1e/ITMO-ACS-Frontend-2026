/*
 * Run in the real Flexbox Froggy page via browser console.
 * It emulates normal entry in #code and presses the visible #next button.
 * It does NOT read/write localStorage or game completion state.
 */
const flexboxFroggySolutions = [
  'justify-content: flex-end;',
  'justify-content: center;',
  'justify-content: space-around;',
  'justify-content: space-between;',
  'align-items: flex-end;',
  'justify-content: center;\nalign-items: center;',
  'justify-content: space-around;\nalign-items: flex-end;',
  'flex-direction: row-reverse;',
  'flex-direction: column;',
  'flex-direction: row-reverse;\njustify-content: flex-end;',
  'flex-direction: column;\njustify-content: flex-end;',
  'flex-direction: column-reverse;\njustify-content: space-between;',
  'flex-direction: row-reverse;\njustify-content: center;\nalign-items: flex-end;',
  'order: 2;',
  'order: -1;',
  'align-self: flex-end;',
  'order: 2;\nalign-self: flex-end;',
  'flex-wrap: wrap;',
  'flex-direction: column;\nflex-wrap: wrap;',
  'flex-flow: column wrap;',
  'align-content: flex-start;',
  'align-content: flex-end;',
  'flex-direction: column-reverse;\nalign-content: center;',
  'flex-flow: column-reverse wrap-reverse;\njustify-content: center;\nalign-content: space-between;'
];

async function enterAndCheckFroggy(startLevel, endLevel) {
  const log = [];
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
  for (let level = startLevel; level <= endLevel; level += 1) {
    const input = document.querySelector('#code');
    const next = document.querySelector('#next');
    if (!input || !next) throw new Error(`Level ${level}: expected game controls were not found`);
    setter.call(input, flexboxFroggySolutions[level - 1]);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: ';' }));
    await new Promise(resolve => setTimeout(resolve, 300));
    const solved = !document.querySelector('#next').classList.contains('disabled');
    if (!solved) throw new Error(`Level ${level}: checker did not accept the entered CSS`);
    log.push({ level, checker: 'accepted', code: flexboxFroggySolutions[level - 1], ui: document.querySelector('#level-indicator').innerText.trim() });
    if (level < endLevel) {
      document.querySelector('#next').click();
      await new Promise(resolve => setTimeout(resolve, 350));
      const reached = Number(document.querySelector('#level-indicator').innerText.match(/\d+/)?.[0]);
      if (reached !== level + 1) throw new Error(`Level ${level}: did not advance to ${level + 1}`);
    }
  }
  return log;
}

// Example: await enterAndCheckFroggy(1, 24)

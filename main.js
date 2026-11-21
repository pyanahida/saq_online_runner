import { lex } from './lexer.js';
import { parse } from './parser.js';
import { Interpreter } from './interpreter.js';

const codeEl = document.getElementById('code');
const runBtn = document.getElementById('run');
const consoleEl = document.getElementById('console');
const overlay = document.getElementById('overlay');
const promptEl = document.getElementById('prompt');
const inputBox = document.getElementById('inputBox');
const okBtn = document.getElementById('ok');

let pendingResolve = null;

function print(text) {
  const line = document.createElement('div');
  line.textContent = text;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function printError(text) {
  const line = document.createElement('div');
  line.className = 'err';
  line.textContent = text;
  consoleEl.appendChild(line);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function showInput(prompt) {
  promptEl.textContent = prompt;
  inputBox.value = '';
  overlay.classList.add('show');
  inputBox.focus();
  return new Promise((resolve) => {
    pendingResolve = resolve;
  });
}

function commitInput() {
  if (!pendingResolve) return;
  const v = inputBox.value;
  overlay.classList.remove('show');
  const r = pendingResolve;
  pendingResolve = null;
  r(v);
}

okBtn.addEventListener('click', commitInput);
inputBox.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') commitInput();
});

runBtn.addEventListener('click', async () => {
  consoleEl.innerHTML = '';
  const src = codeEl.value;

  let ast;
  try {
    ast = parse(lex(src));
  } catch (e) {
    printError(`语法错误: ${e.message}`);
    return;
  }

  const interp = new Interpreter({ print, input: showInput });

  try {
    await interp.run(ast);
  } catch (e) {
    printError(`运行时错误: ${e.message}`);
  }
});

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

fetch('./eg.txt')
  .then((r) => r.text())
  .then((t) => { codeEl.value = t; })
  .catch(() => { codeEl.value = "main{\n    say('hello');\n}\n"; });

let pendingResolve = null;

function print(text) {
  const d = document.createElement('div');
  d.textContent = text;
  consoleEl.appendChild(d);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function printError(text) {
  const d = document.createElement('div');
  d.className = 'err';
  d.textContent = text;
  consoleEl.appendChild(d);
  consoleEl.scrollTop = consoleEl.scrollHeight;
}

function showInput(prompt) {
  promptEl.textContent = prompt;
  inputBox.value = '';
  overlay.classList.add('show');
  inputBox.focus();
  return new Promise((resolve) => { pendingResolve = resolve; });
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
inputBox.addEventListener('keydown', (e) => { if (e.key === 'Enter') commitInput(); });

runBtn.addEventListener('click', async () => {
  consoleEl.innerHTML = '';
  const src = codeEl.value;
  let ast;
  try {
    ast = parse(lex(src));
  } catch (e) {
    printError(`Syntax error: ${e.message}`);
    return;
  }
  const interp = new Interpreter({ print, input: showInput });
  try {
    await interp.run(ast);
  } catch (e) {
    printError(`Runtime error: ${e.message}`);
  }
});

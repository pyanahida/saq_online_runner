const IDENT_START = /[A-Za-z_]/;
const IDENT_PART = /[0-9A-Za-z_\-]/;

export function lex(src) {
  const toks = [];
  let i = 0, line = 1, col = 1;
  const push = (type, value, l, c) => toks.push({ type, value, line: l, col: c });

  while (i < src.length) {
    const ch = src[i];
    const sl = line, sc = col;

    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue; }
    if (ch === '\n') { i++; line++; col = 1; continue; }

    if (ch === "'") {
      i++; col++;
      let s = '';
      let closed = false;
      while (i < src.length) {
        const c = src[i];
        if (c === '\\') {
          const n = src[i + 1];
          if (n === 'n') s += '\n';
          else if (n === 't') s += '\t';
          else if (n === 'r') s += '\r';
          else if (n === '\\') s += '\\';
          else if (n === "'") s += "'";
          else s += '\\' + n;
          i += 2; col += 2;
          continue;
        }
        if (c === "'") { i++; col++; closed = true; break; }
        if (c === '\n') throw new SyntaxError(`Line ${sl}: unterminated string`);
        s += c; i++; col++;
      }
      if (!closed) throw new SyntaxError(`Line ${sl}: unterminated string`);
      push('str', s, sl, sc);
      continue;
    }

    if (/[0-9]/.test(ch)) {
      let n = '';
      while (i < src.length && /[0-9.]/.test(src[i])) { n += src[i]; i++; col++; }
      push('num', Number(n), sl, sc);
      continue;
    }

    if (ch === '#') {
      let count = 0;
      while (src[i] === '#') { count++; i++; col++; }
      let name = '';
      while (i < src.length && IDENT_PART.test(src[i])) { name += src[i]; i++; col++; }
      if (!name) throw new SyntaxError(`Line ${sl}: expected name after '#'`);
      push('hash', { count, name }, sl, sc);
      continue;
    }

    if (IDENT_START.test(ch)) {
      let name = '';
      while (i < src.length && IDENT_PART.test(src[i])) { name += src[i]; i++; col++; }
      push('ident', name, sl, sc);
      continue;
    }

    if ('(){},;'.includes(ch)) {
      push('punct', ch, sl, sc);
      i++; col++;
      continue;
    }

    throw new SyntaxError(`Line ${sl}: unexpected character '${ch}'`);
  }

  push('eof', null, line, col);
  return toks;
}

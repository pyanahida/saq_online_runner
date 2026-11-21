// 词法：字符流 -> token 流
// token: { type, value, line, col }
// type: 'num' | 'str' | 'ident' | 'hash' | 'punct'

const IDENT_CHAR = /[0-9A-Za-z\-_]/;

export function lex(src) {
  const toks = [];
  let i = 0, line = 1, col = 1;

  const push = (type, value, l, c) => toks.push({ type, value, line: l, col: c });

  while (i < src.length) {
    const ch = src[i];
    const startLine = line, startCol = col;

    // 空白
    if (ch === ' ' || ch === '\t' || ch === '\r') { i++; col++; continue; }
    if (ch === '\n') { i++; line++; col = 1; continue; }

    // 字符串：只用单引号
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
          else s += '\\' + n; // 非法转义：原样保留
          i += 2; col += 2;
          continue;
        }
        if (c === "'") { i++; col++; closed = true; break; }
        if (c === '\n') { line++; col = 1; i++; continue; }
        s += c; i++; col++;
      }
      if (!closed) throw new SyntaxError(`第 ${startLine} 行: 字符串未闭合`);
      push('str', s, startLine, startCol);
      continue;
    }

    // 数字
    if (/[0-9]/.test(ch) || (ch === '.' && /[0-9]/.test(src[i + 1] || ''))) {
      let s = '';
      while (i < src.length && /[0-9.]/.test(src[i])) { s += src[i]; i++; col++; }
      push('num', Number(s), startLine, startCol);
      continue;
    }

    // # 糖：贪心吃 [0-9A-Za-z\-_]，遇非法字符截断
    if (ch === '#') {
      let count = 0;
      while (src[i] === '#') { count++; i++; col++; }
      let name = '';
      while (i < src.length && IDENT_CHAR.test(src[i])) { name += src[i]; i++; col++; }
      push('hash', { count, name }, startLine, startCol);
      continue;
    }

    // 标识符 / 关键字
    if (/[A-Za-z_]/.test(ch)) {
      let s = '';
      while (i < src.length && /[A-Za-z0-9_]/.test(src[i])) { s += src[i]; i++; col++; }
      push('ident', s, startLine, startCol);
      continue;
    }

    // 标点
    if ('{}()[],;'.includes(ch)) {
      push('punct', ch, startLine, startCol);
      i++; col++;
      continue;
    }

    throw new SyntaxError(`第 ${line} 行: 无法识别的字符 '${ch}'`);
  }

  push('eof', null, line, col);
  return toks;
}

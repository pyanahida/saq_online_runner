// 语法：token 流 -> AST
// 节点：
//   { type: 'Program', body: [...] }
//   { type: 'Block', body: [...] }
//   { type: 'Main', block }
//   { type: 'Call', callee, args: [...] }
//   { type: 'Hash', count, name, args: null | [...] }   // #a 或 #a(...)
//   { type: 'Num', value }
//   { type: 'Str', value }

export function parse(toks) {
  let pos = 0;
  const peek = () => toks[pos];
  const next = () => toks[pos++];
  const expect = (type, value) => {
    const t = peek();
    if (t.type !== type || (value !== undefined && t.value !== value)) {
      throw new SyntaxError(`第 ${t.line} 行: 期望 ${value || type}，实际 ${t.value ?? t.type}`);
    }
    return next();
  };

  function parseProgram() {
    const body = [];
    while (peek().type !== 'eof') body.push(parseStatement());
    return { type: 'Program', body };
  }

  function parseStatement() {
    const t = peek();
    // main{...}
    if (t.type === 'ident' && t.value === 'main') {
      next();
      const block = parseBlock();
      return { type: 'Main', block };
    }
    if (t.type === 'punct' && t.value === '{') return parseBlock();
    if (t.type === 'punct' && t.value === ';') { next(); return { type: 'Empty' }; }
    const expr = parseExpression();
    expect('punct', ';');
    return { type: 'ExprStmt', expr };
  }

  function parseBlock() {
    expect('punct', '{');
    const body = [];
    while (!(peek().type === 'punct' && peek().value === '}')) {
      if (peek().type === 'eof') throw new SyntaxError('第 ' + peek().line + ' 行: 块未闭合');
      body.push(parseStatement());
    }
    expect('punct', '}');
    return { type: 'Block', body };
  }

  function parseExpression() {
    const t = peek();

    if (t.type === 'num') { next(); return { type: 'Num', value: t.value }; }
    if (t.type === 'str') { next(); return { type: 'Str', value: t.value }; }

    // #a / ##a / #a(...)
    if (t.type === 'hash') {
      next();
      let args = null;
      if (peek().type === 'punct' && peek().value === '(') {
        args = parseArgs();
      }
      return { type: 'Hash', count: t.value.count, name: t.value.name, args };
    }

    // 调用：ident(...) 或 ident{...}（块参数）
    if (t.type === 'ident') {
      next();
      const callee = t.value;
      if (peek().type === 'punct' && peek().value === '(') {
        return { type: 'Call', callee, args: parseArgs() };
      }
      // main 之外裸标识符不合法
      throw new SyntaxError(`第 ${t.line} 行: 意外的标识符 '${callee}'`);
    }

    throw new SyntaxError(`第 ${t.line} 行: 意外的 token '${t.value ?? t.type}'`);
  }

  // 参数列表：值、块、#a 都可以
  function parseArgs() {
    expect('punct', '(');
    const args = [];
    if (peek().type === 'punct' && peek().value === ')') { next(); return args; }
    while (true) {
      if (peek().type === 'punct' && peek().value === '{') {
        args.push(parseBlock());
      } else {
        args.push(parseExpression());
      }
      const t = peek();
      if (t.type === 'punct' && t.value === ',') { next(); continue; }
      if (t.type === 'punct' && t.value === ')') { next(); break; }
      throw new SyntaxError(`第 ${t.line} 行: 参数列表语法错误`);
    }
    return args;
  }

  return parseProgram();
}

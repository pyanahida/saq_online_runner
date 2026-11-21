import { lex } from './lexer.js';

export function parse(tokens) {
  let p = 0;
  const peek = () => tokens[p];
  const next = () => tokens[p++];
  const expect = (v) => {
    const t = next();
    if (!t || t.value !== v) throw new SyntaxError(`Line ${t ? t.line : '?'}: expected '${v}'`);
    return t;
  };

  function parseProgram() {
    const body = [];
    while (peek().type !== 'eof') body.push(parseTop());
    return { type: 'Program', body };
  }

  function parseTop() {
    const t = peek();
    if (t.type === 'ident' && t.value === 'def') return parseDef();
    if (t.type === 'ident' && t.value === 'end') return parseEnd();
    if (t.type === 'ident' && t.value === 'main' && tokens[p + 1] && tokens[p + 1].value === '{') {
      next();
      return { type: 'Main', body: parseBlock() };
    }
    return parseExprStmt();
  }

  function parseDef() {
    next();
    expect('(');
    const nameTok = next();
    if (nameTok.type !== 'str') throw new SyntaxError(`Line ${nameTok.line}: def name must be a string`);
    const params = [];
    while (peek().value !== ')') {
      expect(',');
      const pt = next();
      if (pt.type !== 'ident') throw new SyntaxError(`Line ${pt.line}: parameter must be an identifier`);
      params.push(pt.value);
    }
    expect(')');
    const body = parseBlock();
    return { type: 'Def', name: nameTok.value, params, body };
  }

  function parseEnd() {
    next();
    const body = parseBlock();
    return { type: 'End', body };
  }

  function parseBlock() {
    expect('{');
    const body = [];
    while (peek().value !== '}') {
      if (peek().type === 'eof') throw new SyntaxError('unexpected EOF in block');
      body.push(parseExprStmt());
    }
    expect('}');
    return { type: 'Block', body };
  }

  function parseExprStmt() {
    const expr = parseExpr();
    if (peek().value === ';') next();
    return { type: 'ExprStmt', expr };
  }

  function parseExpr() {
    return parseCall();
  }

  function parseArg() {
    if (peek().value === '{') return parseBlock();
    return parseExpr();
  }

  function parseCall() {
    let callee;
    const t = peek();

    if (t.type === 'ident' && t.value === 'usr') {
      next();
      expect('::');
      const nameTok = next();
      if (nameTok.type !== 'ident') throw new SyntaxError(`Line ${nameTok.line}: expected function name after 'usr::'`);
      callee = { type: 'UserCallRef', name: nameTok.value };
    } else if (t.type === 'ident') {
      next();
      callee = { type: 'Ident', name: t.value };
    } else if (t.type === 'amp') {
      next();
      return { type: 'Amp', name: t.value.name };
    } else if (t.type === 'hash') {
      next();
      return { type: 'Hash', count: t.value.count, name: t.value.name };
    } else if (t.type === 'str') {
      next();
      return { type: 'Str', value: t.value };
    } else if (t.type === 'num') {
      next();
      return { type: 'Num', value: t.value };
    } else {
      throw new SyntaxError(`Line ${t.line}: unexpected token '${t.value}'`);
    }

    if (peek().value !== '(') return callee;

    expect('(');
    const args = [];
    while (peek().value !== ')') {
      if (args.length) expect(',');
      args.push(parseArg());
    }
    expect(')');
    return { type: 'Call', callee, args };
  }

  return parseProgram();
}

// 求值：AST -> 结果
// 关键点：
//   - 块参数（{...}）不立即执行，包成 thunk 传给内建函数
//   - while 的第一个参数需要反复求值，包成 thunk
//   - input 是异步的，所以整条求值链是 async
//   - 未声明变量直接抛错，整个程序停止

import { makeBuiltins } from './builtins.js';

export class Interpreter {
  constructor(io) {
    this.io = io;
    this.vars = new Map();
    this.sysvars = new Map();
    this.startTime = performance.now();
    this.builtins = makeBuiltins({
      vars: this.vars,
      sysvars: this.sysvars,
      print: (v) => this.io.print(String(v)),
    });
  }

  async run(ast) {
    this.vars.clear();
    this.startTime = performance.now();
    this.sysvars.set('time', Date.now());
    this.sysvars.set('clock', 0);

    for (const stmt of ast.body) {
      await this.exec(stmt);
    }
  }

  async exec(node) {
    switch (node.type) {
      case 'Empty': return;
      case 'Block': {
        for (const s of node.body) await this.exec(s);
        return;
      }
      case 'Main': {
        await this.exec(node.block);
        return;
      }
      case 'ExprStmt': {
        await this.evalExpr(node.expr);
        return;
      }
      default:
        throw new Error(`未知语句类型 ${node.type}`);
    }
  }

  async evalExpr(node) {
    switch (node.type) {
      case 'Num':
      case 'Str':
        return node.value;

      case 'Hash':
        return this.evalHash(node);

      case 'Call':
        return this.evalCall(node);

      default:
        throw new Error(`未知表达式类型 ${node.type}`);
    }
  }

  async evalHash(node) {
    const { count, name, args } = node;

    // ##x：系统变量
    if (count === 2) {
      if (args) throw new SyntaxError(`系统变量 '##${name}' 不能赋值`);
      if (!this.sysvars.has(name)) throw new ReferenceError(`系统变量 '${name}' 不存在`);
      return this.sysvars.get(name);
    }

    if (count !== 1) throw new SyntaxError(`'${'#'.repeat(count)}${name}' 不合法`);

    // #a：读
    if (!args) {
      if (!this.vars.has(name)) throw new ReferenceError(`变量 '${name}' 未定义`);
      return this.vars.get(name);
    }

    // #a(...)：赋值糖
    if (args.length !== 1) throw new SyntaxError(`'#${name}(...)' 只能接受一个参数`);
    if (!this.vars.has(name)) throw new ReferenceError(`变量 '${name}' 未定义`);
    const val = await this.evalArg(args[0]);
    this.vars.set(name, val);
    return val;
  }

  async evalCall(node) {
    const { callee, args } = node;

    if (callee === 'input') {
      const prompt = args.length ? String(await this.evalArg(args[0])) : '';
      const value = await this.io.input(prompt);
      this.sysvars.set('ipt', value);
      return undefined;
    }

    const fn = this.builtins[callee];
    if (!fn) throw new ReferenceError(`未知函数 '${callee}'`);

    // while 的条件需要反复求值：包成 thunk
    if (callee === 'while') {
      const [, body] = args;
      const condFn = () => {
        // 这里必须同步拿到布尔值，而 evalArg 是 async；
        // 由于条件表达式不含 input，我们同步求值一次即可
        return this.evalSync(args[0]);
      };
      while (condFn()) {
        await this.execBlockArg(body);
      }
      return undefined;
    }

    const values = [];
    for (const a of args) values.push(await this.evalArg(a));
    return fn(...values);
  }

  // 参数求值：块不执行，包成 thunk
  async evalArg(arg) {
    if (arg.type === 'Block') {
      const self = this;
      return function () { return self.exec(arg); };
    }
    return this.evalExpr(arg);
  }

  async execBlockArg(arg) {
    if (arg.type !== 'Block') throw new TypeError('此处需要块参数 {...}');
    await this.exec(arg);
  }

  // 同步求值：仅用于不含 input 的表达式（如 while 条件）
  evalSync(node) {
    switch (node.type) {
      case 'Num':
      case 'Str':
        return node.value;
      case 'Hash': {
        const { count, name, args } = node;
        if (count === 2) {
          if (!this.sysvars.has(name)) throw new ReferenceError(`系统变量 '${name}' 不存在`);
          return this.sysvars.get(name);
        }
        if (args) throw new SyntaxError('while 条件中不支持赋值');
        if (!this.vars.has(name)) throw new ReferenceError(`变量 '${name}' 未定义`);
        return this.vars.get(name);
      }
      case 'Call': {
        const { callee, args } = node;
        if (callee === 'input') throw new SyntaxError('while 条件中不能调用 input');
        const fn = this.builtins[callee];
        if (!fn) throw new ReferenceError(`未知函数 '${callee}'`);
        const values = args.map((a) => {
          if (a.type === 'Block') throw new SyntaxError('while 条件中不能出现块');
          return this.evalSync(a);
        });
        return fn(...values);
      }
      default:
        throw new Error(`未知表达式类型 ${node.type}`);
    }
  }
}

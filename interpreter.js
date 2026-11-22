export class Interpreter {
  constructor(io) {
    this.io = io;
    this.vars = new Map();
    this.funcs = new Map();
    this.endBlock = null;
    this.frames = [];
  }

  async run(program) {
    for (const node of program.body) {
      if (node.type === 'Def') {
        this.funcs.set(node.name, node);
      } else if (node.type === 'End') {
        this.endBlock = node;
      }
    }

    for (const node of program.body) {
      if (node.type === 'Main') {
        await this.execBlock(node.body);
      } else if (node.type === 'ExprStmt') {
        await this.exec(node);
      }
    }

    if (this.endBlock) {
      await this.execBlock(this.endBlock.body);
    }
  }

  async exec(node) {
    if (node.type === 'ExprStmt') {
      await this.evalExpr(node.expr);
      return;
    }
    if (node.type === 'Block') {
      await this.execBlock(node);
      return;
    }
    await this.evalExpr(node);
  }

  async execBlock(block) {
    for (const s of block.body) {
      await this.exec(s);
    }
  }

  async evalExpr(node) {
    switch (node.type) {
      case 'Num':
      case 'Str':
        return node.value;
      case 'Hash': {
        if (!this.vars.has(node.name)) {
          throw new Error(`变量 '${node.name}' 未定义`);
        }
        return this.vars.get(node.name);
      }
      case 'Amp': {
        const frame = this.frames[this.frames.length - 1];
        if (!frame) {
          if (!this.vars.has(node.name)) throw new Error(`变量 '${node.name}' 未定义`);
          return this.vars.get(node.name);
        }
        return frame.params.get(node.name);
      }
      case 'Ident':
        return node;
      case 'UserCallRef':
        return node;
      case 'Call':
        return await this.evalCall(node);
      default:
        throw new Error(`unknown expression: ${node.type}`);
    }
  }

  async evalCall(node) {
    const args = [];
    for (const a of node.args) {
      if (a && a.type === 'Block') {
        args.push(a);
      } else {
        args.push(await this.evalExpr(a));
      }
    }

    if (node.callee.type === 'UserCallRef') {
      const def = this.funcs.get(node.callee.name);
      if (!def) throw new Error(`函数 '${node.callee.name}' 未定义`);
      return await this.callUser(def, args);
    }

    const name = node.callee.name;
    const fn = this.builtins()[name];
    if (!fn) throw new Error(`函数 '${name}' 未定义`);
    return await fn.apply(this, args);
  }

  async callUser(def, args) {
    const params = new Map();
    for (let i = 0; i < def.params.length; i++) {
      params.set(def.params[i], i < args.length ? args[i] : 0);
    }
    this.frames.push({ params });
    try {
      await this.execBlock(def.body);
    } finally {
      this.frames.pop();
    }
    return undefined;
  }

  builtins() {
    const self = this;

    const thunk = (arg) => {
      if (arg && arg.type === 'Block') return () => self.execBlock(arg);
      return async () => self.evalExpr(arg);
    };

    const branch = async (cond, thenB, elseB) => {
      const c = await cond;
      if (c) return await thunk(thenB)();
      if (elseB) return await thunk(elseB)();
      return undefined;
    };

    return {
      say: (v) => { self.io.print(String(v)); return v; },
      var: (name, value) => { self.vars.set(String(name), value); return value; },
      del: (name) => { self.vars.delete(String(name)); return undefined; },
      input: async (prompt) => {
        const v = await self.io.input(String(prompt));
        self.vars.set('ipt', v);
        return v;
      },
      add: (a, b) => a + b,
      sub: (a, b) => a - b,
      mul: (a, b) => a * b,
      div: (a, b) => a / b,
      eq: (a, b) => a === b,
      not: (a) => !a,
      lt: (a, b) => a < b,
      cat: (...xs) => xs.join(''),
      tonum: (v) => Number(v),
      'if-else': branch,
      if: branch,
      loop: async (n, body) => {
        const times = Number(await n);
        for (let k = 0; k < times; k++) await thunk(body)();
        return undefined;
      },
      while: async (condArg, body) => {
        const condThunk = thunk(condArg);
        const bodyThunk = thunk(body);
        let guard = 0;
        while (await condThunk()) {
          if (++guard > 100000) throw new Error('loop limit exceeded');
          await bodyThunk();
        }
        return undefined;
      }
    };
  }
}

export function makeBuiltins(rt) {
  const num = (x) => (typeof x === 'number' ? x : Number(x));
  return {
    say: (v) => { rt.print(v); return undefined; },
    var: (k, v) => { rt.vars.set(String(k), v); return undefined; },
    v: (k) => {
      const key = String(k);
      if (!rt.vars.has(key)) throw new ReferenceError(`变量 '${key}' 未定义`);
      return rt.vars.get(key);
    },
    rs: (k, v) => {
      const key = String(k);
      if (!rt.vars.has(key)) throw new ReferenceError(`变量 '${key}' 未定义`);
      rt.vars.set(key, v);
      return undefined;
    },
    reset: (k, v) => {
      const key = String(k);
      if (!rt.vars.has(key)) throw new ReferenceError(`变量 '${key}' 未定义`);
      rt.vars.set(key, v);
      return undefined;
    },
    vg: (k) => {
      const key = String(k);
      if (!rt.sysvars.has(key)) throw new ReferenceError(`系统变量 '${key}' 不存在`);
      return rt.sysvars.get(key);
    },
    sa: (k, x) => {
      const key = String(k);
      if (!rt.vars.has(key)) throw new ReferenceError(`变量 '${key}' 未定义`);
      rt.vars.set(key, num(rt.vars.get(key)) + num(x));
      return undefined;
    },
    tonum: (s) => {
      const n = Number(s);
      return Number.isNaN(n) ? NaN : n;
    },
    cat: (a, b) => String(a) + String(b),
    add: (a, b) => num(a) + num(b),
    sub: (a, b) => num(a) - num(b),
    mul: (a, b) => num(a) * num(b),
    div: (a, b) => num(a) / num(b),
    mod: (a, b) => num(a) % num(b),
    eq: (a, b) => a === b,
    gt: (a, b) => num(a) > num(b),
    lt: (a, b) => num(a) < num(b),
    and: (a, b) => Boolean(a) && Boolean(b),
    or: (a, b) => Boolean(a) || Boolean(b),
    not: (a) => !a,
    if: async (cond, thenBlock) => {
      if (cond) await thenBlock();
      return undefined;
    },
    'if-else': async (cond, thenBlock, elseBlock) => {
      if (cond) await thenBlock();
      else await elseBlock();
      return undefined;
    },
    loop: async (n, body) => {
      const times = Math.trunc(num(n));
      if (!Number.isFinite(times)) return undefined;
      for (let i = 0; i < times; i++) await body();
      return undefined;
    },
    while: async (condFn, body) => {
      while (condFn()) await body();
      return undefined;
    },
  };
}

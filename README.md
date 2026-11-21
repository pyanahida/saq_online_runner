# Saq Online Runner

A browser-based runner for **Saq**, a minimal scripting language where
everything is a call or a block — no operators, no keywords.

Live: https://pyanahida.github.io/saq_online_runner/

## Usage

Open the page, edit the code in the editor, and press **Run**.
Output appears in the console below. `input(...)` opens a modal dialog.

The editor loads its sample program from `eg.txt`.

## The Language

- **Entry**: `main{ ... }`
- **Variables**: `var(k, v)` declares; `rs(k, v)` / `reset(k, v)` reassigns;
  `v('k')` or `#k` reads. Accessing an undeclared variable is a fatal error.
- **Sugar**: `#a(v)` reassigns (`a = v`); `#a(#b)` is `a = b`;
  `##k` is `vg('k')` for system variables.
- **`#` lexing**: greedy over `[0-9A-Za-z\-_]`, truncates at the first
  character outside that set.
- **System variables** (read-only): `##ipt`, `##time`, `##clock`.
- **Comparison / logic**: `eq gt lt and or not`.
- **Branching**: `if(cond, { ... })`, `if-else(cond, { ... }, { ... })`.
- **Loops**: `loop(n, { ... })` (auto `tonum`), `while(cond, { ... })`.
  No `break` / `continue`.
- **Arithmetic**: `add sub mul div mod`, implicit numeric coercion.
  `mod` takes the sign of `a * b`. Numbers are JS-style `Number`.
- **Strings**: single quotes only; escapes `\n \t \r \\ \'`.
  `cat(a, b)` concatenates; `tonum(s)` converts, returning `NaN` on failure.
- **Self-add**: `sa('k', x)` ≡ `rs(k, add(v(k), x))`.
- **I/O**: `say(...)`, `input('text')` writes to system variable `ipt`.
- **Errors**: value-level failures yield `NaN` silently; undeclared variable
  access halts the whole program. No `isnan` — use `not(eq(#x, #x))`.

## Example

```saq
main{
    input('Enter a number');
    var('n', tonum(##ipt));
    if(not(eq(#n, #n)), {
        say('Not a number');
    }, {
        var('i', 0);
        var('sum', 0);
        while(lt(#i, #n), {
            sa('sum', #i);
            sa('i', 1);
        });
        say(cat('Sum: ', #sum));
    });
}
```

## Running Locally

Because `eg.txt` is loaded via `fetch`, serve the directory over HTTP:

```bash
python -m http.server
```

Then open `http://localhost:8000/`.

## Changelog

- **v1.3.0** — English UI, mobile layout
- **v1.2.0** — hosted on GitHub Pages
- **v1.1.0** — sample program moved to `eg.txt`
- **v1.0.0** — initial release

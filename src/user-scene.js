// threeLab — cenas coladas pelo usuário: compila o código em tempo de execução e guarda no navegador.
import * as THREE from 'three';
import * as lib from './lib/index.js';

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const IMPORT_RE = /^[ \t]*import\s+([\s\S]*?)\s+from\s+['"]([^'"]+)['"][ \t]*;?/gm;
const SIDE_EFFECT_IMPORT_RE = /^[ \t]*import\s+['"][^'"]+['"]/m;

/** Converte `import { a, b as c } from '...'` em `const { a, b: c } = __lib;`. */
function importToDestructuring(clause, spec) {
  let source;
  if (/(^|\/)three(\.module\.js)?$/.test(spec) || spec === 'three') source = '__THREE';
  else if (/lib(\/index(\.js)?)?$/.test(spec) || /threelab/i.test(spec)) source = '__lib';
  else throw new Error(`Import não suportado: "${spec}". Use apenas '../src/lib/index.js'.`);

  const lines = [];
  const named = clause.match(/\{([\s\S]*?)\}/);
  const ns = clause.match(/\*\s*as\s+(\w+)/);
  const rest = clause.replace(/\{[\s\S]*?\}/, '').replace(/\*\s*as\s+\w+/, '').replace(/,/g, '').trim();

  if (ns) lines.push(`const ${ns[1]} = ${source};`);
  if (rest) lines.push(`const ${rest} = ${source}.default ?? ${source};`);
  if (named) {
    const items = named[1]
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => s.replace(/\s+as\s+/, ': '));
    if (items.length) lines.push(`const { ${items.join(', ')} } = ${source};`);
  }
  return lines.join(' ');
}

/**
 * Compila o texto de um módulo de cena (formato de scenes/*.js) em { meta, params, default }.
 * Lança Error com mensagem em português se o código for inválido.
 */
export async function compileScene(code) {
  if (!code || !code.trim()) throw new Error('A resposta está vazia. Cole o código que a IA gerou.');
  if (SIDE_EFFECT_IMPORT_RE.test(code)) throw new Error("Imports sem nomes (import 'x') não são suportados.");
  if (/\bimport\s*\(/.test(code)) throw new Error('import() dinâmico não é suportado.');
  if (!/export\s+default/.test(code)) {
    throw new Error('Não encontrei `export default function build(p) { ... }` no código. A resposta veio completa?');
  }

  let body = code.replace(IMPORT_RE, (_, clause, spec) => importToDestructuring(clause, spec));

  let defName = '__default';
  const named = body.match(/export\s+default\s+((?:async\s+)?function\s*\*?\s*)(\w+)\s*\(/);
  if (named) {
    defName = named[2];
    body = body.replace(/export\s+default\s+(?=(?:async\s+)?function)/, '');
  } else {
    body = body.replace(/export\s+default\s+/, 'const __default = ');
  }
  body = body
    .replace(/^[ \t]*export\s*\{[^}]*\}[ \t]*;?/gm, '')
    .replace(/^([ \t]*)export\s+(?=(?:const|let|var|function|async|class)\b)/gm, '$1');

  let factory;
  try {
    factory = new AsyncFunction(
      '__lib',
      '__THREE',
      `${body}\n;return { meta: typeof meta === 'undefined' ? undefined : meta, ` +
        `params: typeof params === 'undefined' ? undefined : params, default: ${defName} };`,
    );
  } catch (err) {
    throw new Error(`Erro de sintaxe no código: ${err.message}`);
  }
  const mod = await factory(lib, THREE);
  if (typeof mod.default !== 'function') {
    throw new Error('`export default` precisa ser uma função: `export default function build(p) { ... }`');
  }
  return mod;
}

// ---------------------------------------------------------------- "Minhas criações" (localStorage)
const KEY = 'threeLab:myScenes';

function read() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
function write(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}

export const myScenes = {
  all: () => read(),
  get: (id) => read().find((s) => s.id === id) ?? null,
  add({ title, code }) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ok = write([{ id, title: title || 'Sem título', code, createdAt: Date.now() }, ...read()]);
    if (!ok) throw new Error('Não consegui salvar no navegador (armazenamento cheio ou bloqueado). O modelo continua aberto, mas não ficará em "Minhas criações".');
    return id;
  },
  remove: (id) => write(read().filter((s) => s.id !== id)),
};

export const slug = (s) =>
  String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modelo';

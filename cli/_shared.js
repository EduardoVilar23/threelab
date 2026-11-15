// Utilidades do CLI (Node).
import { existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// GLTFExporter usa FileReader (API de navegador) — polyfill mínimo para o Node.
if (!globalThis.FileReader) {
  globalThis.FileReader = class FileReader {
    #done(result) { this.result = result; this.onload?.({ target: this }); this.onloadend?.({ target: this }); }
    readAsArrayBuffer(blob) { blob.arrayBuffer().then((b) => this.#done(b)); }
    readAsDataURL(blob) {
      blob.arrayBuffer().then((b) => this.#done(`data:${blob.type || 'application/octet-stream'};base64,${Buffer.from(b).toString('base64')}`));
    }
  };
}

// PLYExporter usa requestAnimationFrame.
globalThis.requestAnimationFrame ??= (cb) => setTimeout(() => cb(performance.now()), 0);

// Silencia um aviso inofensivo do GLTFExporter.
const warn = console.warn;
console.warn = (...a) => { if (String(a[0]).includes('normalized normal attribute')) return; warn(...a); };

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const SCENES_DIR = resolve(ROOT, 'scenes');
export const EXPORTS_DIR = resolve(ROOT, 'exports');

export function listScenes() {
  return readdirSync(SCENES_DIR).filter((f) => f.endsWith('.js') && !f.startsWith('_')).map((f) => basename(f, '.js')).sort();
}

export async function loadScene(name) {
  const file = resolve(SCENES_DIR, `${name.replace(/\.js$/, '')}.js`);
  if (!existsSync(file)) {
    throw new Error(`Cena "${name}" não encontrada em scenes/. Disponíveis: ${listScenes().join(', ') || '(nenhuma)'}`);
  }
  return import(pathToFileURL(file).href + `?t=${Date.now()}`);
}

/** Parser simples: posicionais + --chave valor / --chave=valor / --set a=1 --set b=2 */
export function parseArgs(argv) {
  const out = { _: [], set: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) { out._.push(a); continue; }
    let [k, v] = a.slice(2).split(/=(.*)/s);
    if (v === undefined) v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
    if (k === 'set') { const [pk, pv] = String(v).split(/=(.*)/s); out.set[pk] = pv; }
    else out[k] = v;
  }
  return out;
}

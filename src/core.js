// threeLab — monta uma cena a partir do módulo em scenes/<nome>.js
import * as THREE from 'three';

/** Valores padrão dos parâmetros declarados em `export const params`. */
export function defaultParams(mod) {
  const out = {};
  for (const [k, p] of Object.entries(mod.params ?? {})) {
    out[k] = p && typeof p === 'object' && 'value' in p ? p.value : p;
  }
  return out;
}

/** Converte strings da linha de comando ("12", "true", "#ff0000") para o tipo do padrão. */
export function coerceParams(mod, raw = {}) {
  const defs = defaultParams(mod);
  const out = {};
  for (const [k, v] of Object.entries(raw)) {
    const d = defs[k];
    if (typeof d === 'number') out[k] = Number(v);
    else if (typeof d === 'boolean') out[k] = v === true || v === 'true' || v === '1';
    else out[k] = v;
  }
  return out;
}

/** Executa build(params) e devolve um Group raiz nomeado. */
export async function buildScene(mod, overrides = {}) {
  if (typeof mod.default !== 'function') {
    throw new Error('A cena precisa ter `export default function build(params) { return objeto3D }`');
  }
  const params = { ...defaultParams(mod), ...overrides };
  const result = await mod.default(params);
  if (!result || !result.isObject3D) throw new Error('build() deve retornar um THREE.Object3D (mesh ou group)');
  const root = new THREE.Group();
  root.name = mod.meta?.title ?? 'cena';
  root.add(result);
  root.updateMatrixWorld(true);
  return { root, params };
}

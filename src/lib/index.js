// threeLab — biblioteca de modelagem.
// Convenções: 1 unidade = 1 mm, eixo Y para cima, chão em y = 0.
// Rotações nas opções (`rot`) são em GRAUS.
// Funciona tanto no navegador (visualizador) quanto no Node (CLI de exportação).

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';
import { mergeGeometries, mergeVertices, toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import ManifoldModule from 'manifold-3d';
import { SVGLoader } from 'three/addons/loaders/SVGLoader.js';
import helvetiker from 'three/examples/fonts/helvetiker_regular.typeface.json' with { type: 'json' };
import helvetikerBold from 'three/examples/fonts/helvetiker_bold.typeface.json' with { type: 'json' };
import gentilis from 'three/examples/fonts/gentilis_regular.typeface.json' with { type: 'json' };
import gentilisBold from 'three/examples/fonts/gentilis_bold.typeface.json' with { type: 'json' };

export { THREE };

const DEG = Math.PI / 180;

// ---------------------------------------------------------------- materiais

/** Material padrão (PBR). `color` aceita '#rrggbb', nome CSS ou número. */
export function mat(color = '#d8d8d8', opts = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.55,
    metalness: opts.metalness ?? 0.0,
    transparent: opts.opacity !== undefined && opts.opacity < 1,
    opacity: opts.opacity ?? 1,
    emissive: opts.emissive ?? 0x000000,
    emissiveIntensity: opts.emissiveIntensity ?? 1,
    flatShading: opts.flat ?? false,
    side: opts.doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    name: opts.name ?? (typeof color === 'string' ? color : undefined),
  });
}

/** Paleta pronta para começar rápido. */
export const colors = {
  white: '#f2f2f2', black: '#222222', gray: '#9a9a9a', red: '#e5484d', orange: '#f76b15',
  yellow: '#ffc53d', green: '#30a46c', teal: '#12a594', blue: '#3e63dd', purple: '#8e4ec6',
  pink: '#d6409f', brown: '#8a5a3b', wood: '#b88a5a', gold: '#d4a72c', silver: '#c0c4cc',
};

// ---------------------------------------------------------------- transformações

/**
 * Aplica opções comuns a um Object3D.
 * opts: { pos:[x,y,z], rot:[rx,ry,rz] (graus), scale:n|[x,y,z], name, color, material }
 */
export function place(obj, opts = {}) {
  if (opts.pos) obj.position.set(...opts.pos);
  if (opts.rot) obj.rotation.set(opts.rot[0] * DEG, opts.rot[1] * DEG, opts.rot[2] * DEG);
  if (opts.scale !== undefined) {
    Array.isArray(opts.scale) ? obj.scale.set(...opts.scale) : obj.scale.setScalar(opts.scale);
  }
  if (opts.name) obj.name = opts.name;
  if (opts.castShadow !== false) obj.castShadow = true;
  obj.receiveShadow = true;
  return obj;
}

function mesh(geometry, opts = {}) {
  const material = opts.material ?? mat(opts.color, opts);
  return place(new THREE.Mesh(geometry, material), opts);
}

/** Agrupa objetos. Uso: group([a, b, c], { pos, rot }) */
export function group(children = [], opts = {}) {
  const g = new THREE.Group();
  for (const c of children.flat()) if (c) g.add(c);
  return place(g, opts);
}

/** Copia um objeto (geometria compartilhada) com novas opções de posição. */
export function copy(obj, opts = {}) {
  return place(obj.clone(), opts);
}

/** Repete `fn(i)` n vezes e agrupa. Útil para padrões. */
export function repeat(n, fn, opts = {}) {
  return group(Array.from({ length: n }, (_, i) => fn(i)), opts);
}

/** Distribui `n` cópias em círculo de raio r (no plano XZ). fn(i, angRad) -> objeto */
export function radial(n, r, fn, opts = {}) {
  return repeat(n, (i) => {
    const a = (i / n) * Math.PI * 2;
    const o = fn(i, a);
    o.position.x += Math.cos(a) * r;
    o.position.z += Math.sin(a) * r;
    return o;
  }, opts);
}

/** Apoia o objeto no chão (menor y = 0) e opcionalmente centraliza em X/Z. */
export function onFloor(obj, { center = true } = {}) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  obj.position.y -= box.min.y;
  if (center) {
    obj.position.x -= (box.min.x + box.max.x) / 2;
    obj.position.z -= (box.min.z + box.max.z) / 2;
  }
  return obj;
}

/** Bounding box e dimensões (mm). */
export function measure(obj) {
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  const size = box.getSize(new THREE.Vector3());
  return { min: box.min.toArray(), max: box.max.toArray(), size: size.toArray() };
}

// ---------------------------------------------------------------- primitivas
// Todas recebem dimensões em mm e terminam com `opts` (ver place() + color/material).
// Por padrão ficam CENTRADAS na origem (use pos ou onFloor() para apoiar no chão).

export const box = (w = 10, h = 10, d = 10, opts = {}) =>
  mesh(new THREE.BoxGeometry(w, h, d), opts);

export const roundedBox = (w = 10, h = 10, d = 10, radius = 1, opts = {}) =>
  mesh(new RoundedBoxGeometry(w, h, d, opts.segments ?? 4, radius), opts);

export const sphere = (r = 5, opts = {}) =>
  mesh(new THREE.SphereGeometry(r, opts.segments ?? 48, Math.round((opts.segments ?? 48) / 2)), opts);

/** Cilindro vertical (eixo Y). opts.rTop para tronco de cone. */
export const cylinder = (r = 5, h = 10, opts = {}) =>
  mesh(new THREE.CylinderGeometry(opts.rTop ?? r, r, h, opts.segments ?? 64), opts);

export const cone = (r = 5, h = 10, opts = {}) =>
  mesh(new THREE.ConeGeometry(r, h, opts.segments ?? 64), opts);

/** Prisma regular de n lados (hexágono = 6). */
export const prism = (sides = 6, r = 5, h = 10, opts = {}) =>
  mesh(new THREE.CylinderGeometry(r, r, h, sides), opts);

/** Toro deitado no plano XZ. R = raio maior, r = espessura. */
export const torus = (R = 10, r = 2, opts = {}) => {
  const g = new THREE.TorusGeometry(R, r, opts.radialSegments ?? 24, opts.segments ?? 96);
  g.rotateX(Math.PI / 2);
  return mesh(g, opts);
};

export const capsule = (r = 3, length = 10, opts = {}) =>
  mesh(new THREE.CapsuleGeometry(r, length, 12, opts.segments ?? 32), opts);

export const plane = (w = 100, d = 100, opts = {}) => {
  const g = new THREE.PlaneGeometry(w, d);
  g.rotateX(-Math.PI / 2);
  return mesh(g, { doubleSided: true, ...opts });
};

/**
 * Forma 2D a partir de pontos [[x,y], ...] (opcionalmente com furos).
 * Retorna THREE.Shape. Use com extrude().
 */
export function shape(points, holes = []) {
  const s = new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  for (const h of holes) s.holes.push(new THREE.Path(h.map(([x, y]) => new THREE.Vector2(x, y))));
  return s;
}

/** Polígono regular 2D (pontos) — útil em shape(). */
export function polygon(sides, r, rotDeg = 0) {
  return Array.from({ length: sides }, (_, i) => {
    const a = (i / sides) * Math.PI * 2 + rotDeg * DEG;
    return [Math.cos(a) * r, Math.sin(a) * r];
  });
}

/** Círculo 2D (pontos). */
export const circle2d = (r, segments = 64) => polygon(segments, r);

/** Retângulo 2D com cantos arredondados (pontos), centrado. */
export function roundedRect2d(w, h, r, seg = 8) {
  r = Math.min(r, w / 2, h / 2);
  const pts = [];
  const corners = [[w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, 90], [-w / 2 + r, -h / 2 + r, 180], [w / 2 - r, -h / 2 + r, 270]];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= seg; i++) {
      const a = (start + (90 * i) / seg) * DEG;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  }
  return pts;
}

/**
 * Extruda uma forma 2D (Shape ou lista de pontos) para cima (eixo Y), de y=0 até y=depth.
 * O plano 2D (x, y) da forma vira o plano (x, z) do mundo.
 * opts: { bevel: mm, bevelSegments, curveSegments }
 */
export function extrude(s, depth = 5, opts = {}) {
  const sh = Array.isArray(s) ? shape(s) : s;
  const g = new THREE.ExtrudeGeometry(sh, {
    depth,
    bevelEnabled: !!opts.bevel,
    bevelThickness: opts.bevel ?? 0,
    bevelSize: opts.bevel ?? 0,
    bevelSegments: opts.bevelSegments ?? 3,
    curveSegments: opts.curveSegments ?? 32,
  });
  g.rotateX(-Math.PI / 2); // forma no plano XZ, extrusão para +Y
  return mesh(g, opts);
}

/**
 * Sólido de revolução em torno do eixo Y.
 * profile: [[raio, altura], ...] — de baixo para cima. Feche no eixo (raio 0) para sólido maciço.
 */
export function lathe(profile, opts = {}) {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), opts.segments ?? 96);
  return mesh(g, opts);
}

/** Tubo ao longo de uma curva suave que passa pelos pontos [[x,y,z], ...]. */
export function tube(points, radius = 1, opts = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), !!opts.closed);
  const g = new THREE.TubeGeometry(curve, opts.segments ?? 200, radius, opts.radialSegments ?? 16, !!opts.closed);
  return mesh(g, opts);
}

/** Superfície paramétrica f(u, v) -> [x, y, z], u,v ∈ [0,1]. */
export function parametric(fn, opts = {}) {
  const g = new ParametricGeometry((u, v, target) => target.set(...fn(u, v)), opts.slices ?? 64, opts.stacks ?? 64);
  return mesh(g, opts);
}

const fonts = {
  regular: new FontLoader().parse(helvetiker),
  bold: new FontLoader().parse(helvetikerBold),
  serif: new FontLoader().parse(gentilis),
  serifBold: new FontLoader().parse(gentilisBold),
};

/**
 * Texto 3D. size = altura da letra (mm), depth = espessura.
 * Por padrão fica em pé (plano XY, voltado para +Z), centralizado em X e com a base em y=0.
 * opts.flat = true deita o texto no chão (plano XZ, extrudado para +Y) — ideal para placas/carimbos.
 */
export function text(str, size = 10, depth = 2, opts = {}) {
  const g = new TextGeometry(String(str), {
    font: fonts[opts.weight ?? 'bold'] ?? fonts.bold,
    size,
    depth,
    curveSegments: opts.curveSegments ?? 8,
    bevelEnabled: !!opts.bevel,
    bevelThickness: opts.bevel ?? 0,
    bevelSize: opts.bevel ?? 0,
    bevelSegments: 2,
  });
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const align = opts.align ?? 'center';
  const dx = align === 'left' ? -bb.min.x : align === 'right' ? -bb.max.x : -(bb.min.x + bb.max.x) / 2;
  g.translate(dx, -bb.min.y, 0);
  if (opts.flat) {
    g.translate(0, -(bb.max.y - bb.min.y) / 2, 0);
    g.rotateX(-Math.PI / 2);
  }
  // remove grupos (face/lateral) para funcionar bem em CSG e com um só material
  g.clearGroups();
  return mesh(g, opts);
}

// ---------------------------------------------------------------- arquivos e SVG

const isNode = typeof window === 'undefined';

/**
 * Lê um arquivo da pasta assets/ (texto). Funciona no navegador e no Node.
 * Uso dentro de build async: const logo = await asset('logo.svg');
 */
export async function asset(name) {
  if (isNode) {
    const fs = 'node:fs/promises', url = 'node:url', xml = '@xmldom/xmldom';
    const { readFile } = await import(/* @vite-ignore */ fs);
    const { fileURLToPath } = await import(/* @vite-ignore */ url);
    if (typeof globalThis.DOMParser === 'undefined') {
      globalThis.DOMParser = (await import(/* @vite-ignore */ xml)).DOMParser; // usado pelo SVGLoader
    }
    return readFile(fileURLToPath(new URL(`../../assets/${name}`, import.meta.url)), 'utf8');
  }
  const res = await fetch(`/assets/${name}`);
  if (!res.ok) throw new Error(`asset("${name}") não encontrado em assets/`);
  return res.text();
}

/**
 * Converte um SVG (texto) em sólido extrudado — logos, ícones, silhuetas.
 * Fica EM PÉ no plano XY voltado para +Z, centralizado em X, base em y=0, de z=0 até z=depth.
 * Tamanho: opts.width OU opts.height (mm). Só preenchimentos (fill) são usados; furos (ex.: "o", "a") são respeitados.
 * opts.flat = true deita no chão (plano XZ, extrudado para +Y), como text().
 */
export function svg(svgText, depth = 1, opts = {}) {
  const data = new SVGLoader().parse(svgText);
  const geos = [];
  for (const path of data.paths) {
    const fill = path.userData?.style?.fill;
    if (fill === 'none' || fill === 'transparent') continue;
    for (const s of SVGLoader.createShapes(path)) {
      const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false, curveSegments: opts.curveSegments ?? 12 });
      g.deleteAttribute('uv');
      geos.push(g);
    }
  }
  if (!geos.length) throw new Error('svg(): nenhum preenchimento encontrado no SVG');
  const g = mergeGeometries(geos, false);
  g.clearGroups();
  g.scale(1, -1, 1); // SVG tem Y para baixo
  // escala -1 inverte as faces: corrige a ordem dos vértices
  const idx = g.index;
  if (idx) for (let i = 0; i < idx.count; i += 3) { const b = idx.getX(i + 1); idx.setX(i + 1, idx.getX(i + 2)); idx.setX(i + 2, b); }
  else {
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      const t = [pos.getX(i + 1), pos.getY(i + 1), pos.getZ(i + 1)];
      pos.setXYZ(i + 1, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
      pos.setXYZ(i + 2, ...t);
    }
  }
  g.computeBoundingBox();
  const bb = g.boundingBox;
  const w = bb.max.x - bb.min.x, h = bb.max.y - bb.min.y;
  const k = opts.width ? opts.width / w : opts.height ? opts.height / h : 1;
  g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, 0);
  g.scale(k, k, depth);
  if (opts.flat) { g.translate(0, -(h * k) / 2, 0); g.rotateX(-Math.PI / 2); }
  g.computeVertexNormals();
  return mesh(g, opts);
}

// ---------------------------------------------------------------- operações booleanas (CSG)
// Motor: manifold-3d (WASM). Resultado SEMPRE fechado/manifold — ideal para impressão 3D.
// O resultado fica no espaço do mundo (as posições dos objetos de entrada já estão aplicadas).

const wasm = await ManifoldModule();
wasm.setup();
const { Manifold, Mesh: MMesh } = wasm;
export { wasm as manifold };

/** Converte objeto (Mesh ou Group) em uma geometria única no espaço do mundo (só posição/normal). */
export function bake(obj) {
  obj.updateMatrixWorld(true);
  const geos = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    g.applyMatrix4(o.matrixWorld);
    geos.push(g);
  });
  if (!geos.length) throw new Error('bake(): objeto sem malhas');
  return geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
}

function firstMaterial(obj) {
  let m = null;
  obj.traverse((o) => { if (!m && o.isMesh) m = o.material; });
  return m ?? mat();
}

/** Objeto three (Mesh/Group) -> Manifold. Cada Mesh vira um sólido; vários são unidos. */
export function toManifold(obj) {
  if (obj instanceof Manifold) return obj;
  obj.updateMatrixWorld(true);
  const parts = [];
  obj.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    const pos = g.attributes.position;
    const flip = o.matrixWorld.determinant() < 0;
    const v = new THREE.Vector3();
    const map = new Map();
    const verts = [];
    const tris = [];
    const id = (k) => {
      v.fromBufferAttribute(pos, k).applyMatrix4(o.matrixWorld);
      const key = `${Math.round(v.x * 1e5)},${Math.round(v.y * 1e5)},${Math.round(v.z * 1e5)}`;
      let i = map.get(key);
      if (i === undefined) { i = verts.length / 3; map.set(key, i); verts.push(v.x, v.y, v.z); }
      return i;
    };
    const n = g.index ? g.index.count : pos.count;
    for (let t = 0; t < n; t += 3) {
      const a = id(g.index ? g.index.getX(t) : t);
      const b = id(g.index ? g.index.getX(t + 1) : t + 1);
      const c = id(g.index ? g.index.getX(t + 2) : t + 2);
      if (a === b || b === c || a === c) continue;
      flip ? tris.push(a, c, b) : tris.push(a, b, c);
    }
    const mesh = new MMesh({ numProp: 3, vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tris) });
    mesh.merge();
    try {
      parts.push(new Manifold(mesh));
    } catch (e) {
      throw new Error(`CSG: a peça "${o.name || o.geometry.type}" não é um sólido fechado (${e.message ?? e}). Use primitivas fechadas (lathe deve começar e terminar no eixo, raio 0).`);
    }
  });
  if (!parts.length) throw new Error('CSG: objeto sem malhas');
  return parts.length === 1 ? parts[0] : Manifold.union(parts);
}

/** Manifold -> THREE.BufferGeometry com normais "vincadas" (arestas vivas, curvas suaves). */
export function fromManifold(m, creaseDeg = 35) {
  const mesh = m.getMesh();
  const g = new THREE.BufferGeometry();
  const np = mesh.numProp;
  const pos = new Float32Array((mesh.vertProperties.length / np) * 3);
  for (let i = 0, j = 0; i < mesh.vertProperties.length; i += np, j += 3) {
    pos[j] = mesh.vertProperties[i]; pos[j + 1] = mesh.vertProperties[i + 1]; pos[j + 2] = mesh.vertProperties[i + 2];
  }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(new Uint32Array(mesh.triVerts), 1));
  return toCreasedNormals(g, creaseDeg * DEG);
}

function csgResult(manifold, ref, opts) {
  const material = opts.material ?? (opts.color ? mat(opts.color, opts) : firstMaterial(ref));
  return place(new THREE.Mesh(fromManifold(manifold, opts.crease), material), opts);
}

/** União de vários objetos em um único sólido. Cor = do primeiro (ou opts.color). */
export const union = (objs, opts = {}) =>
  csgResult(Manifold.union(objs.flat().filter(Boolean).map(toManifold)), objs[0], opts);

/** Subtrai `cutters` (objeto ou lista) de `base`. */
export const subtract = (base, cutters, opts = {}) =>
  csgResult(Manifold.difference([toManifold(base), ...[cutters].flat().filter(Boolean).map(toManifold)]), base, opts);

/** Interseção de vários objetos. */
export const intersect = (objs, opts = {}) =>
  csgResult(Manifold.intersection(objs.flat().filter(Boolean).map(toManifold)), objs[0], opts);

/** Casco convexo (convex hull) de vários objetos — ótimo para formas "orgânicas" simples. */
export const hull = (objs, opts = {}) =>
  csgResult(Manifold.hull([objs].flat().filter(Boolean).map(toManifold)), [objs].flat()[0], opts);

/**
 * Erosão: encolhe o sólido `t` mm para dentro em todas as direções (interseção de cópias deslocadas em 26 direções).
 * Base para ocar peças: subtract(peca, erode(peca, 2)). Exato para formas convexas; em geral a parede fica entre ~0,93·t e t.
 */
export function erode(obj, t = 2, opts = {}) {
  const m = toManifold(obj);
  const dirs = [];
  for (const x of [-1, 0, 1]) for (const y of [-1, 0, 1]) for (const z of [-1, 0, 1]) {
    if (!x && !y && !z) continue;
    const l = Math.hypot(x, y, z);
    dirs.push([(x / l) * t, (y / l) * t, (z / l) * t]);
  }
  return csgResult(Manifold.intersection(dirs.map((d) => m.translate(d))), obj, opts);
}

/**
 * Oca uma peça para economizar material (resina): deixa casca de espessura `t`.
 * opts.openBottom: abre o fundo (y < 0.01) — drena sozinho; opts.keep: objetos cuja região (dilatada por t) deve continuar maciça.
 */
export function hollow(obj, t = 2, opts = {}) {
  let inner = erode(obj, t);
  if (opts.keep?.length) inner = subtract(inner, opts.keep);
  return subtract(obj, inner, opts);
}

/** Corta o objeto por um plano horizontal em y = h, mantendo a parte de cima (keep:'above') ou de baixo. */
export function cutAt(obj, h = 0, opts = {}) {
  const m = toManifold(obj);
  // trimByPlane mantém o lado para onde a normal aponta
  const normal = opts.keep === 'below' ? [0, -1, 0] : [0, 1, 0];
  const offset = opts.keep === 'below' ? -h : h;
  return csgResult(m.trimByPlane(normal, offset), obj, opts);
}

/** Mescla vários objetos em uma só malha sem CSG (rápido; pode ter faces internas). */
export function merge(objs, opts = {}) {
  const g = mergeVertices(bake(group([objs].flat().map((o) => o.clone()))));
  g.computeVertexNormals();
  return place(new THREE.Mesh(g, opts.material ?? mat(opts.color ?? firstMaterial(objs[0]).color)), opts);
}

// ---------------------------------------------------------------- helpers de impressão 3D

/** Furo cilíndrico vertical para usar em subtract(). Ligeiramente mais alto para cortar limpo. */
export const hole = (diameter, h, opts = {}) =>
  cylinder(diameter / 2, h + 0.2, { segments: 48, ...opts });

/** Furo para parafuso com cabeça escareada (countersunk), atravessando de y=0 a y=h. */
export function screwHole(d = 3.2, h = 5, headD = 6.5, opts = {}) {
  const shaft = cylinder(d / 2, h + 1, { pos: [0, h / 2, 0] });
  const headH = (headD - d) / 2;
  const head = cylinder(d / 2, headH + 0.01, { rTop: headD / 2, pos: [0, h - headH / 2 + 0.005, 0] });
  const top = cylinder(headD / 2, 2, { pos: [0, h + 1, 0] });
  return place(group([shaft, head, top]), opts);
}

/** Casca: subtrai um "miolo" deslocado de um sólido — útil para potes/caixas. */
export function shell(outer, inner, opts = {}) {
  return subtract(outer, inner, opts);
}

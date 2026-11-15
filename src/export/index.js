// threeLab — exportadores (isomórfico: navegador e Node).
//
// Unidades: a cena é modelada em milímetros.
//  - glb/gltf/usdz (web/AR): convertidos para METROS por padrão (padrão do glTF/model-viewer).
//  - stl/3mf/obj/ply (impressão/CAD): ficam em milímetros.
// Eixos: a cena é Y-up. STL e 3MF são convertidos para Z-up (padrão dos fatiadores).

import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { OBJExporter } from 'three/addons/exporters/OBJExporter.js';
import { PLYExporter } from 'three/addons/exporters/PLYExporter.js';
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js';
import { zipSync, strToU8 } from 'fflate';

export const FORMATS = {
  glb: { label: 'GLB (web)', mime: 'model/gltf-binary', use: 'web' },
  gltf: { label: 'glTF (web, JSON)', mime: 'model/gltf+json', use: 'web' },
  usdz: { label: 'USDZ (AR iOS)', mime: 'model/vnd.usdz+zip', use: 'web' },
  stl: { label: 'STL (impressão)', mime: 'model/stl', use: 'print' },
  '3mf': { label: '3MF (impressão, cores)', mime: 'model/3mf', use: 'print' },
  obj: { label: 'OBJ', mime: 'model/obj', use: 'cad' },
  ply: { label: 'PLY', mime: 'application/octet-stream', use: 'cad' },
};

/** Envolve um clone do objeto numa transformação (escala/rotação) para exportar. */
function wrap(object, { scale = 1, zUp = false } = {}) {
  const root = new THREE.Group();
  const inner = object.clone(true);
  root.add(inner);
  if (zUp) root.rotation.x = Math.PI / 2; // Y-up -> Z-up
  root.scale.setScalar(scale);
  root.updateMatrixWorld(true);
  return root;
}

/** Remove objetos marcados como auxiliares (userData.helper) antes de exportar. */
function stripHelpers(object) {
  const clone = object.clone(true);
  const remove = [];
  clone.traverse((o) => { if (o.userData?.helper || o.isLight || o.isCamera) remove.push(o); });
  remove.forEach((o) => o.parent?.remove(o));
  return clone;
}

/**
 * Exporta `object` no formato pedido.
 * @returns {Promise<{ data: Uint8Array|string, ext: string, mime: string }>}
 */
export async function exportObject(object, format, opts = {}) {
  format = format.toLowerCase();
  const obj = stripHelpers(object);
  const webScale = opts.webScale ?? 0.001; // mm -> m

  switch (format) {
    case 'glb':
    case 'gltf': {
      const root = wrap(obj, { scale: webScale });
      root.name = opts.name ?? 'threeLab';
      const result = await new GLTFExporter().parseAsync(root, { binary: format === 'glb' });
      return format === 'glb'
        ? { data: new Uint8Array(result), ext: 'glb', mime: FORMATS.glb.mime }
        : { data: JSON.stringify(result, null, 2), ext: 'gltf', mime: FORMATS.gltf.mime };
    }
    case 'usdz': {
      const root = wrap(obj, { scale: webScale });
      const data = await new USDZExporter().parseAsync(root);
      return { data, ext: 'usdz', mime: FORMATS.usdz.mime };
    }
    case 'stl': {
      const root = wrap(obj, { zUp: true });
      const view = new STLExporter().parse(root, { binary: true });
      return { data: new Uint8Array(view.buffer, view.byteOffset, view.byteLength), ext: 'stl', mime: FORMATS.stl.mime };
    }
    case 'obj': {
      const root = wrap(obj, { zUp: !!opts.zUp });
      return { data: new OBJExporter().parse(root), ext: 'obj', mime: FORMATS.obj.mime };
    }
    case 'ply': {
      const root = wrap(obj, { zUp: !!opts.zUp });
      const data = await new Promise((res) => new PLYExporter().parse(root, res, { binary: true }));
      return { data: new Uint8Array(data), ext: 'ply', mime: FORMATS.ply.mime };
    }
    case '3mf': {
      return { data: export3MF(wrap(obj, { zUp: true }), opts), ext: '3mf', mime: FORMATS['3mf'].mime };
    }
    default:
      throw new Error(`Formato desconhecido: ${format}. Use: ${Object.keys(FORMATS).join(', ')}`);
  }
}

// ---------------------------------------------------------------- 3MF

const hex = (c) => '#' + c.getHexString().toUpperCase();
const fmt = (n) => (Math.abs(n) < 1e-9 ? '0' : +n.toFixed(5)).toString();

/**
 * Gera um 3MF (zip) em milímetros. Cada Mesh vira um <object> com sua cor
 * (basematerials) — fatiadores multicor (Bambu/Prusa/Orca) reconhecem as peças.
 */
export function export3MF(root, opts = {}) {
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse((o) => { if (o.isMesh && o.visible) meshes.push(o); });

  const colorIndex = new Map();
  const colorsXml = [];
  const objectsXml = [];
  const itemsXml = [];
  const v = new THREE.Vector3();

  meshes.forEach((m, i) => {
    const material = Array.isArray(m.material) ? m.material[0] : m.material;
    const color = material?.color ? hex(material.color) : '#CCCCCC';
    if (!colorIndex.has(color)) {
      colorIndex.set(color, colorIndex.size);
      colorsXml.push(`<base name="${material?.name || color}" displaycolor="${color}FF"/>`);
    }
    const g = m.geometry;
    const pos = g.attributes.position;
    // solda vértices idênticos para gerar malha conectada
    const keyOf = (x, y, z) => `${Math.round(x * 1e4)},${Math.round(y * 1e4)},${Math.round(z * 1e4)}`;
    const map = new Map();
    const verts = [];
    const idx = (k) => {
      v.fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld);
      const key = keyOf(v.x, v.y, v.z);
      let id = map.get(key);
      if (id === undefined) { id = verts.length; map.set(key, id); verts.push(`<vertex x="${fmt(v.x)}" y="${fmt(v.y)}" z="${fmt(v.z)}"/>`); }
      return id;
    };
    const tris = [];
    const count = g.index ? g.index.count : pos.count;
    // matriz com determinante negativo (espelhamento) inverte a orientação das faces
    const flip = m.matrixWorld.determinant() < 0;
    for (let t = 0; t < count; t += 3) {
      const a = idx(g.index ? g.index.getX(t) : t);
      const b = idx(g.index ? g.index.getX(t + 1) : t + 1);
      const c = idx(g.index ? g.index.getX(t + 2) : t + 2);
      if (a === b || b === c || a === c) continue; // degenerado
      tris.push(flip ? `<triangle v1="${a}" v2="${c}" v3="${b}"/>` : `<triangle v1="${a}" v2="${b}" v3="${c}"/>`);
    }
    const id = i + 2;
    const name = (m.name || `parte_${i + 1}`).replace(/[<>&"]/g, '');
    objectsXml.push(
      `<object id="${id}" name="${name}" type="model" pid="1" pindex="${colorIndex.get(color)}"><mesh><vertices>${verts.join('')}</vertices><triangles>${tris.join('')}</triangles></mesh></object>`
    );
    itemsXml.push(`<item objectid="${id}"/>`);
  });

  const model = `<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Application">threeLab</metadata>
<metadata name="Title">${(opts.name ?? 'threeLab').replace(/[<>&"]/g, '')}</metadata>
<resources>
<basematerials id="1">${colorsXml.join('')}</basematerials>
${objectsXml.join('\n')}
</resources>
<build>${itemsXml.join('')}</build>
</model>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/>
</Relationships>`;

  return zipSync({
    '[Content_Types].xml': strToU8(contentTypes),
    '_rels/.rels': strToU8(rels),
    '3D/3dmodel.model': strToU8(model),
  });
}

// ---------------------------------------------------------------- embed para site

/** HTML pronto para colar num site, usando <model-viewer> com o GLB exportado. */
export function embedSnippet(glbFile, { title = 'Modelo 3D', usdzFile } = {}) {
  return `<!-- Cole no seu site. Coloque ${glbFile}${usdzFile ? ` e ${usdzFile}` : ''} na mesma pasta (ou ajuste o src). -->
<script type="module" src="https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js"></script>
<model-viewer
  src="${glbFile}"${usdzFile ? `\n  ios-src="${usdzFile}"` : ''}
  alt="${title}"
  camera-controls
  auto-rotate
  shadow-intensity="1"
  ar
  style="width: 100%; height: 480px; background: transparent;">
</model-viewer>
`;
}

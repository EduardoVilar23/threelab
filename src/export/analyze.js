// threeLab — análise para impressão 3D: dimensões, volume, massa estimada,
// e se cada peça é fechada (watertight / manifold).

import * as THREE from 'three';

const DENSITY = { PLA: 1.24, PETG: 1.27, ABS: 1.04, TPU: 1.21, resina: 1.1 }; // g/cm³

export function analyze(object, { printer = [256, 256, 256] } = {}) {
  object.updateMatrixWorld(true);
  // bounding box só das peças reais (ignora objetos auxiliares, userData.helper)
  const box = new THREE.Box3();
  object.traverse((o) => {
    if (!o.isMesh) return;
    for (let p = o; p; p = p.parent) if (p.userData?.helper) return;
    box.expandByObject(o);
  });
  const size = box.getSize(new THREE.Vector3());
  const parts = [];
  let totalTris = 0;
  let totalVolume = 0;

  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();

  object.traverse((m) => {
    if (!m.isMesh) return;
    for (let q = m; q; q = q.parent) if (q.userData?.helper) return;
    const g = m.geometry;
    const pos = g.attributes.position;
    const count = g.index ? g.index.count : pos.count;

    // solda vértices por posição (ignora normais/uv) para avaliar a topologia
    const keyOf = (v) => `${Math.round(v.x * 1e4)},${Math.round(v.y * 1e4)},${Math.round(v.z * 1e4)}`;
    const ids = new Map();
    const world = [];
    const vid = (k) => {
      const v = new THREE.Vector3().fromBufferAttribute(pos, k).applyMatrix4(m.matrixWorld);
      const key = keyOf(v);
      let id = ids.get(key);
      if (id === undefined) { id = world.length; ids.set(key, id); world.push(v); }
      return id;
    };

    const edges = new Map();
    let tris = 0, degenerate = 0, volume = 0;
    for (let t = 0; t < count; t += 3) {
      const i0 = vid(g.index ? g.index.getX(t) : t);
      const i1 = vid(g.index ? g.index.getX(t + 1) : t + 1);
      const i2 = vid(g.index ? g.index.getX(t + 2) : t + 2);
      if (i0 === i1 || i1 === i2 || i0 === i2) { degenerate++; continue; }
      tris++;
      for (const [p, q] of [[i0, i1], [i1, i2], [i2, i0]]) {
        const k = p < q ? `${p}_${q}` : `${q}_${p}`;
        edges.set(k, (edges.get(k) ?? 0) + 1);
      }
      a.copy(world[i0]); b.copy(world[i1]); c.copy(world[i2]);
      volume += a.dot(b.clone().cross(c)) / 6; // volume assinado (mm³)
    }
    if (m.matrixWorld.determinant() < 0) volume = -volume;

    let open = 0, nonManifold = 0;
    for (const n of edges.values()) { if (n === 1) open++; else if (n > 2) nonManifold++; }

    totalTris += tris;
    totalVolume += Math.abs(volume);
    parts.push({
      name: m.name || '(sem nome)',
      color: m.material?.color ? '#' + m.material.color.getHexString() : null,
      triangles: tris,
      watertight: open === 0 && nonManifold === 0,
      openEdges: open,
      nonManifoldEdges: nonManifold,
      degenerateTriangles: degenerate,
      volume_cm3: +(Math.abs(volume) / 1000).toFixed(2),
      insideOut: volume < 0,
    });
  });

  const dims = size.toArray().map((n) => +n.toFixed(2));
  // impressão: Z-up => largura X, profundidade (Z da cena), altura (Y da cena)
  const printDims = [dims[0], dims[2], dims[1]];
  const fits = printDims.every((d, i) => d <= printer[i]);

  return {
    size_mm: { x: dims[0], y: dims[1], z: dims[2] },
    print_size_mm: { width: printDims[0], depth: printDims[1], height: printDims[2] },
    fitsPrinter: fits,
    printer_mm: printer,
    onFloor: Math.abs(box.min.y) < 0.01,
    triangles: totalTris,
    volume_cm3: +(totalVolume / 1000).toFixed(2),
    mass_g_100pct_infill: Object.fromEntries(Object.entries(DENSITY).map(([k, d]) => [k, +((totalVolume / 1000) * d).toFixed(1)])),
    watertight: parts.every((p) => p.watertight),
    parts,
  };
}

/** Resumo legível do relatório. */
export function formatReport(r) {
  const lines = [];
  const s = r.print_size_mm;
  lines.push(`Tamanho (impressão L×P×A): ${s.width} × ${s.depth} × ${s.height} mm  ${r.fitsPrinter ? '✓ cabe' : '✗ NÃO cabe'} na mesa ${r.printer_mm.join('×')}`);
  lines.push(`Apoiado no chão (y=0): ${r.onFloor ? 'sim' : 'não — o fatiador vai reposicionar'}`);
  lines.push(`Triângulos: ${r.triangles.toLocaleString('pt-BR')}   Volume: ${r.volume_cm3} cm³   PLA maciço ≈ ${r.mass_g_100pct_infill.PLA} g`);
  lines.push(`Fechado (watertight): ${r.watertight ? '✓ sim' : '✗ não'}`);
  for (const p of r.parts) {
    const flags = [];
    if (!p.watertight) flags.push(`${p.openEdges} arestas abertas, ${p.nonManifoldEdges} não-manifold`);
    if (p.insideOut) flags.push('normais invertidas');
    lines.push(`  • ${p.name} ${p.color ?? ''} — ${p.triangles} tri, ${p.volume_cm3} cm³ ${p.watertight ? '✓' : '⚠ ' + flags.join('; ')}`);
  }
  return lines.join('\n');
}

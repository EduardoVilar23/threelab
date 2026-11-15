#!/usr/bin/env node
// Mede a espessura das paredes lançando raios da superfície para dentro.
// Uso: npm run walls <cena> [-- --set param=valor] [--min 1.5]
import * as THREE from 'three';
import { loadScene, parseArgs } from './_shared.js';
import { buildScene, coerceParams } from '../src/core.js';

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) { console.error('Uso: npm run walls <cena> [-- --set param=valor] [--min 1.5]'); process.exit(1); }
const minOk = Number(args.min ?? 1.5);
const mod = await loadScene(args._[0]);
const { root } = await buildScene(mod, coerceParams(mod, args.set));
root.updateMatrixWorld(true);

const rc = new THREE.Raycaster();
const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), o = new THREE.Vector3();
root.traverse((mesh) => {
  if (!mesh.isMesh) return;
  for (let q = mesh; q; q = q.parent) if (q.userData?.helper) return;
  mesh.material.side = THREE.DoubleSide;
  const g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry;
  const pos = g.attributes.position;
  const d = [];
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(pos, i + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(pos, i + 2).applyMatrix4(mesh.matrixWorld);
    n.subVectors(b, a).cross(c.clone().sub(a));
    const area = n.length() / 2;
    if (area < 0.05) continue;
    n.normalize(); // normal para fora
    o.copy(a).add(b).add(c).divideScalar(3);
    rc.set(o.clone().addScaledVector(n, -0.005), n.clone().negate());
    const hit = rc.intersectObject(mesh).find((h) => h.distance > 0.01);
    if (hit) d.push({ t: hit.distance + 0.005, at: o.toArray().map((v) => +v.toFixed(1)), area });
  }
  if (!d.length) return;
  d.sort((x, y) => x.t - y.t);
  const q = (p) => d[Math.floor(p * (d.length - 1))].t.toFixed(2);
  const thin = d.filter((x) => x.t < minOk);
  const thinArea = thin.reduce((s, x) => s + x.area, 0), total = d.reduce((s, x) => s + x.area, 0);
  console.log(`${mesh.name || 'peça'}: parede mín ${q(0)} mm · p5 ${q(0.05)} · mediana ${q(0.5)} mm`);
  console.log(`  abaixo de ${minOk} mm: ${((thinArea / total) * 100).toFixed(1)}% da superfície ${thin.length ? '⚠' : '✓'}`);
  if (thin.length) console.log('  pontos mais finos (x,y,z):', thin.slice(0, 4).map((x) => `${x.t.toFixed(2)}mm@[${x.at}]`).join('  '));
});

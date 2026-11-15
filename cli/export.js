#!/usr/bin/env node
// Uso: npm run export <cena> [-- --formats glb,stl,3mf] [--set param=valor] [--out pasta] [--printer 256x256x256]
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { loadScene, parseArgs, EXPORTS_DIR, ROOT } from './_shared.js';
import { buildScene, coerceParams } from '../src/core.js';
import { exportObject, embedSnippet, FORMATS } from '../src/export/index.js';
import { analyze, formatReport } from '../src/export/analyze.js';

const args = parseArgs(process.argv.slice(2));
const name = args._[0];
if (!name) {
  console.error('Uso: npm run export <cena> -- --formats glb,stl,3mf,obj,ply,gltf,usdz,embed|all [--set param=valor]');
  process.exit(1);
}

let formats = String(args.formats ?? 'glb,stl,3mf,embed').split(',').map((s) => s.trim().toLowerCase());
if (formats.includes('all')) formats = [...Object.keys(FORMATS), 'embed'];

const mod = await loadScene(name);
const { root, params } = await buildScene(mod, coerceParams(mod, args.set));
const outDir = resolve(args.out ?? resolve(EXPORTS_DIR, name));
mkdirSync(outDir, { recursive: true });

const written = [];
for (const f of formats.filter((f) => f !== 'embed')) {
  const t0 = performance.now();
  const { data, ext } = await exportObject(root, f, { name: mod.meta?.title ?? name });
  const file = resolve(outDir, `${name}.${ext}`);
  writeFileSync(file, data);
  const kb = (typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength) / 1024;
  written.push(file);
  console.log(`✓ ${f.padEnd(5)} ${relative(ROOT, file)}  (${kb.toFixed(1)} KB, ${(performance.now() - t0).toFixed(0)} ms)`);
}

if (formats.includes('embed')) {
  if (!formats.includes('glb')) {
    const { data } = await exportObject(root, 'glb');
    writeFileSync(resolve(outDir, `${name}.glb`), data);
  }
  const file = resolve(outDir, `${name}.embed.html`);
  writeFileSync(file, embedSnippet(`${name}.glb`, { title: mod.meta?.title ?? name, usdzFile: formats.includes('usdz') ? `${name}.usdz` : undefined }));
  written.push(file);
  console.log(`✓ embed ${relative(ROOT, file)}  (snippet <model-viewer> para site)`);
}

const printer = args.printer ? String(args.printer).split('x').map(Number) : undefined;
const report = analyze(root, { printer });
writeFileSync(resolve(outDir, `${name}.report.json`), JSON.stringify({ scene: name, params, ...report }, null, 2));
console.log('\nParâmetros:', JSON.stringify(params));
console.log(formatReport(report));

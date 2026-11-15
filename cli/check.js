#!/usr/bin/env node
// Uso: npm run check <cena> [-- --set param=valor] [--json] [--printer 256x256x256]
import { loadScene, parseArgs } from './_shared.js';
import { buildScene, coerceParams } from '../src/core.js';
import { analyze, formatReport } from '../src/export/analyze.js';

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) { console.error('Uso: npm run check <cena>'); process.exit(1); }
const mod = await loadScene(args._[0]);
const t0 = performance.now();
const { root, params } = await buildScene(mod, coerceParams(mod, args.set));
const ms = performance.now() - t0;
const printer = args.printer ? String(args.printer).split('x').map(Number) : undefined;
const report = analyze(root, { printer });
if (args.json) console.log(JSON.stringify({ params, build_ms: Math.round(ms), ...report }, null, 2));
else { console.log(`Cena: ${args._[0]} (build ${ms.toFixed(0)} ms)  Parâmetros: ${JSON.stringify(params)}`); console.log(formatReport(report)); }

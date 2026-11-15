#!/usr/bin/env node
import { listScenes, loadScene } from './_shared.js';
for (const n of listScenes()) {
  try {
    const m = await loadScene(n);
    const p = Object.keys(m.params ?? {});
    console.log(`${n.padEnd(22)} ${m.meta?.title ?? ''}${p.length ? `  [params: ${p.join(', ')}]` : ''}`);
  } catch (e) { console.log(`${n.padEnd(22)} ⚠ erro: ${e.message}`); }
}

#!/usr/bin/env node
// Uso: npm run new <nome> ["Título"]
import { existsSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SCENES_DIR } from './_shared.js';

const [name, title] = process.argv.slice(2);
if (!name || !/^[a-z0-9][a-z0-9-_]*$/i.test(name)) { console.error('Uso: npm run new <nome-sem-espacos> ["Título"]'); process.exit(1); }
const file = resolve(SCENES_DIR, `${name}.js`);
if (existsSync(file)) { console.error(`scenes/${name}.js já existe.`); process.exit(1); }
writeFileSync(file, `import { box, cylinder, subtract, group, colors } from '../src/lib/index.js';

export const meta = {
  title: ${JSON.stringify(title ?? name)},
  description: '',
};

// Parâmetros ajustáveis (aparecem como sliders no visualizador e via --set no CLI)
export const params = {
  size: { value: 40, min: 10, max: 120, step: 1, label: 'Tamanho (mm)' },
};

export default function build(p) {
  const base = box(p.size, 10, p.size, { color: colors.blue, pos: [0, 5, 0] });
  const furo = cylinder(p.size / 6, 12, { pos: [0, 5, 0] });
  return group([subtract(base, furo)]);
}
`);
console.log(`✓ scenes/${name}.js criado. Veja em http://localhost:5199/?scene=${name}`);

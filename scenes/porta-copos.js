import { cylinder, text, subtract, union, group, torus, colors } from '../src/lib/index.js';

export const meta = {
  title: 'Porta-copos personalizado',
  description: 'Porta-copos redondo com borda e texto em relevo. Pronto para imprimir em PLA.',
};

export const params = {
  diameter: { value: 95, min: 60, max: 130, step: 1, label: 'Diâmetro (mm)' },
  thickness: { value: 4, min: 2, max: 8, step: 0.5, label: 'Espessura (mm)' },
  label: { value: 'threeLab', label: 'Texto' },
  textColor: { value: '#ffc53d', label: 'Cor do texto' },
  baseColor: { value: '#3e63dd', label: 'Cor da base' },
};

export default function build(p) {
  const r = p.diameter / 2;
  // base com rebaixo no centro (deixa uma borda de 3 mm)
  const disco = cylinder(r, p.thickness, { pos: [0, p.thickness / 2, 0], segments: 128 });
  const rebaixo = cylinder(r - 3, 2, { pos: [0, p.thickness, 0], segments: 128 });
  const base = subtract(disco, rebaixo, { color: p.baseColor, name: 'base' });

  // texto em relevo, apoiado no fundo do rebaixo — peça separada (multicor no 3MF)
  const fundo = p.thickness - 1;
  const size = Math.min(14, (p.diameter * 0.7) / Math.max(4, p.label.length) * 1.6);
  const letras = text(p.label, size, 1.6, { flat: true, color: p.textColor, pos: [0, fundo, 0], name: 'texto' });

  return group([base, letras]);
}

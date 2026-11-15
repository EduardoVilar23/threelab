import { roundedBox, box, subtract, intersect, group } from '../src/lib/index.js';

export const meta = {
  title: 'Logo threeLab',
  description: 'O símbolo do threeLab feito com o próprio threeLab: subtract(box, box). Um L que perde o canto, e a peça removida sai deslocada. Duas peças, uma cor cada (3MF).',
};

export const params = {
  lado: { value: 60, min: 20, max: 200, step: 1, label: 'Lado (mm)' },
  espessura: { value: 8, min: 2, max: 30, step: 0.5, label: 'Espessura (mm)' },
  explodir: { value: 5, min: 0, max: 15, step: 0.5, label: 'Afastamento da peça (mm)' },
  barra: { value: 26.4, min: 10, max: 40, step: 0.2, label: 'Largura do L (mm)' },
  raio: { value: 5, min: 0, max: 12, step: 0.5, label: 'Raio do canto (mm)' },
  corCorpo: { value: '#141414', label: 'Cor do corpo' },
  corPeca: { value: '#ffc21a', label: 'Cor da peça' },
};

export default function build(p) {
  const H = p.lado;                 // altura total; a largura total também é H (corpo + afastamento)
  const T = p.espessura;
  const e = p.explodir;
  const bw = p.barra;               // largura de cada braço do L
  const W = H - e;                  // largura do corpo
  const P = H - bw - e;             // lado da peça removida
  const r = Math.min(p.raio, P / 2, bw / 2);
  const x0 = -H / 2;                // o conjunto fica centrado em x e z
  const z0 = -H / 2;

  // caixa por limites em x e z, com folga em y para o corte atravessar a peça
  const slab = (xa, xb, za, zb, opts = {}) =>
    box(xb - xa, T + 2, zb - za, { pos: [(xa + xb) / 2, T / 2, (za + zb) / 2], ...opts });

  // corpo: quadrado arredondado menos o canto superior direito, que vira o L
  const base = roundedBox(W, T, H, r, { pos: [x0 + W / 2, T / 2, 0] });
  const canto = slab(x0 + bw, x0 + W + 1, z0 - 1, z0 + H - bw);
  const corpo = subtract(base, [canto], { color: p.corCorpo, name: 'corpo' });

  // peça: só o canto superior direito é arredondado. Um roundedBox maior, com os outros
  // cantos fora da área de corte, é recortado por uma caixa do tamanho da peça.
  const px0 = x0 + bw + e;
  const px1 = x0 + H;
  const pz0 = z0;
  const pz1 = z0 + P;
  const grande = roundedBox(P + 2 * r, T, P + 2 * r, r, { pos: [px0 - r + P / 2, T / 2, pz0 + (P + 2 * r) / 2] });
  const peca = intersect([grande, slab(px0, px1, pz0, pz1)], { color: p.corPeca, name: 'peca' });

  return group([corpo, peca]);
}

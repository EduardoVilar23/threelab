import { lathe, cylinder, sphere, extrude, radial, group, union, colors, mat } from '../src/lib/index.js';

export const meta = {
  title: 'Foguete de brinquedo',
  description: 'Foguete multicolorido: corpo, nariz, aletas e janela. Bom para web (GLB) e impressão multicor (3MF).',
};

export const params = {
  height: { value: 120, min: 60, max: 240, step: 1, label: 'Altura do corpo (mm)' },
  fins: { value: 4, min: 3, max: 6, step: 1, label: 'Aletas' },
  body: { value: '#f2f2f2', label: 'Corpo' },
  accent: { value: '#e5484d', label: 'Detalhes' },
};

export default function build(p) {
  const H = p.height, R = H * 0.14;
  const corpo = lathe([[0, 0], [R * 0.8, 0], [R, H * 0.08], [R, H * 0.85], [R * 0.98, H], [0, H]], { color: p.body, name: 'corpo' });
  const nariz = lathe(
    [[0, H]].concat(Array.from({ length: 24 }, (_, i) => { const t = i / 23; return [R * 0.98 * Math.cos(t * Math.PI / 2) ** 0.8, H + t * H * 0.38]; })).concat([[0, H * 1.38]]),
    { color: p.accent, name: 'nariz' }
  );
  const janela = cylinder(R * 0.38, 4, { rot: [90, 0, 0], pos: [0, H * 0.62, R - 1.2], color: '#3e63dd', name: 'janela', metalness: 0.2 });
  const aleta = () => extrude([[0, 0], [R * 0.95, -H * 0.05], [R * 0.95, H * 0.12], [0, H * 0.32]], 3, { color: p.accent, bevel: 0.6, name: 'aleta' });
  const aletas = radial(p.fins, R * 0.85, (i, a) => {
    const f = aleta();
    // extrude gera a forma no plano XZ; giramos para ficar em pé e apontando para fora
    f.rotation.set(Math.PI / 2, 0, 0);
    const g = group([f], { rot: [0, -a * 180 / Math.PI, 0] });
    g.children[0].position.set(0, 0, 0);
    return g;
  }, { name: 'aletas' });
  const bocal = cylinder(R * 0.6, H * 0.06, { rTop: R * 0.75, pos: [0, -H * 0.03, 0], color: '#555555', metalness: 0.6, name: 'bocal' });
  return group([corpo, nariz, janela, aletas, bocal], { pos: [0, H * 0.06, 0] });
}

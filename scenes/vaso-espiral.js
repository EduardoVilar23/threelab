import { THREE, mat, parametric, lathe, group, union, colors } from '../src/lib/index.js';

export const meta = {
  title: 'Vaso espiral',
  description: 'Vaso torcido com lóbulos, gerado por revolução + torção. Bom para "modo vaso" no fatiador.',
};

export const params = {
  height: { value: 140, min: 60, max: 250, step: 1, label: 'Altura (mm)' },
  radius: { value: 45, min: 20, max: 90, step: 1, label: 'Raio (mm)' },
  lobes: { value: 7, min: 3, max: 12, step: 1, label: 'Lóbulos' },
  twist: { value: 120, min: 0, max: 360, step: 5, label: 'Torção (graus)' },
  color: { value: '#12a594', label: 'Cor' },
};

export default function build(p) {
  const rings = 120, seg = 180;
  const positions = [];
  const index = [];
  const radiusAt = (t, a) => {
    const perfil = 0.75 + 0.35 * Math.sin(Math.PI * t * 0.9 + 0.3) - 0.1 * t; // barriga
    const lobo = 1 + 0.08 * Math.cos(p.lobes * (a + (p.twist * Math.PI / 180) * t));
    return p.radius * perfil * lobo;
  };
  // superfície lateral
  for (let i = 0; i <= rings; i++) {
    const t = i / rings;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      const r = radiusAt(t, a);
      positions.push(Math.cos(a) * r, t * p.height, Math.sin(a) * r);
    }
  }
  for (let i = 0; i < rings; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * seg + j, b = i * seg + ((j + 1) % seg), c = a + seg, d = b + seg;
      index.push(a, c, b, b, c, d);
    }
  }
  // fundo e tampa (fechados: sólido maciço — use "modo vaso"/espiral no fatiador)
  const bottom = positions.length / 3; positions.push(0, 0, 0);
  const top = bottom + 1; positions.push(0, p.height, 0);
  for (let j = 0; j < seg; j++) {
    index.push(bottom, j, (j + 1) % seg);
    const o = rings * seg;
    index.push(top, o + ((j + 1) % seg), o + j);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  g.setIndex(index);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat(p.color, { roughness: 0.35 }));
  m.name = 'vaso';
  return m;
}

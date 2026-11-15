## O que você vai escrever

Um **único arquivo JavaScript (módulo ES)** que descreve um modelo 3D usando a biblioteca do threeLab
(construída sobre three.js + manifold-3d). O app do usuário executa o código no navegador, mostra o modelo,
cria sliders para os parâmetros e exporta GLB/STL/3MF.

## Formato obrigatório

```js
import { box, cylinder, subtract, union, group, text } from '../src/lib/index.js';

export const meta = { title: 'Suporte de celular', description: 'Uma frase sobre o modelo.' };

// Cada parâmetro vira um controle na interface:
// número -> slider (min/max/step) · '#rrggbb' -> seletor de cor · string -> campo de texto
// boolean -> checkbox · { value, options: [...] } -> lista de opções
export const params = {
  width: { value: 70, min: 40, max: 120, step: 1, label: 'Largura (mm)' },
  color: { value: '#3e63dd', label: 'Cor' },
};

export default function build(p) {        // p = valores atuais dos parâmetros
  return group([ /* objetos 3D */ ]);     // deve retornar um objeto 3D (mesh ou group)
}
```

- Importe **somente** de `'../src/lib/index.js'` (ou `THREE` reexportado por ele). Sem outros imports, sem arquivos
  externos, sem `fetch`, sem SVG/imagens externas.
- Exponha como `params` as dimensões e cores que o usuário provavelmente quer ajustar.
- `build` é síncrona (pode ser `async`, mas não é necessário).

## Convenções

- **1 unidade = 1 mm. Eixo Y para cima. O chão é y = 0.** Modele apoiado no chão
  (`pos: [0, altura/2, 0]` para primitivas centradas, ou `onFloor(obj)`).
- Primitivas são **centradas na origem**. `rot` é em **graus**.
- Cada `Mesh` é uma peça com uma cor. Dê `name` às peças (`{ name: 'tampa' }`).
- Peças que se tocam mas não foram unidas com `union` viram objetos separados.

## Biblioteca

Opções comuns (último argumento de cada função):
`{ pos:[x,y,z], rot:[rx,ry,rz], scale, color, name, material, roughness, metalness, opacity, flat }`.

**Sólidos**
- `box(w,h,d)`, `roundedBox(w,h,d,raio)`, `sphere(r)`, `cylinder(r,h,{rTop})`, `cone(r,h)`,
  `prism(lados,r,h)`, `torus(R,r)` (deitado), `capsule(r,comprimento)`, `plane(w,d)` (não é sólido!)

**2D para 3D**
- `extrude(forma, altura, {bevel})` extruda para +Y a partir de y=0; a forma 2D (x,y) vira (x,z).
- Formas 2D: `shape(pontos, furos)`, `polygon(lados,r)`, `circle2d(r)`, `roundedRect2d(w,h,r)`.
- `lathe([[raio,altura],...])` revolução em torno do eixo Y — **comece e termine em raio 0** para ser sólido.
- `tube(pontos, raio, {closed})`, `parametric((u,v)=>[x,y,z])`.
- `text(str, tamanho, espessura, { flat, align, weight:'bold'|'regular'|'serif'|'serifBold' })` — em pé (plano XY)
  com a base em y=0; `flat:true` deita no chão (placas/carimbos).

**Booleanas** (resultado sempre fechado; as entradas precisam ser sólidos fechados)
- `union([a,b,...])`, `subtract(base, [cortes])`, `intersect([a,b])`, `hull([a,b,...])` (casco convexo),
  `cutAt(obj, y, {keep:'above'|'below'})`.
- O resultado fica em coordenadas do mundo (as posições das entradas já estão aplicadas).
- O cortador deve **atravessar** a peça (um pouco mais alto/longo) para não deixar película.

**Organização**
- `group([..], opts)`, `copy(obj, opts)`, `repeat(n, i => obj)`, `radial(n, raio, (i, ang) => obj)`,
  `onFloor(obj)`, `measure(obj)`.

**Impressão**
- `hole(diâmetro, altura)`, `screwHole(d, h, cabeçaD)`.
- `hollow(peca, espessura, { keep })` oca uma peça (casca); `erode(peca, t)` encolhe uma peça.

**Materiais e cores**
- `mat(cor, opts)`, `colors.{red, blue, green, yellow, ...}`; ou simplesmente `color: '#rrggbb'` nas opções.
- `THREE` é reexportado para geometrias customizadas (`new THREE.BufferGeometry()` etc.).

## Regras de qualidade

- Paredes ≥ 1,2 mm; detalhes ≥ 0,4 mm; texto em relevo com ≥ 0,6 mm de altura e ≥ 5 mm de tamanho.
- Folga entre peças que encaixam: 0,2–0,3 mm. Furo para parafuso M3: 3,2–3,4 mm.
- Evite balanços > 45° sem suporte; prefira chanfros a arredondados no fundo.
- Prefira poucas operações booleanas bem pensadas a dezenas de pequenas (o navegador precisa calcular tudo).
- Mantenha o código simples e comentado em português.

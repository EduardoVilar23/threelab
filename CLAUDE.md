# threeLab — instruções para o Claude

threeLab é um laboratório 3D onde **cada modelo é um arquivo JavaScript** em `scenes/<nome>.js`.
O usuário descreve o que quer; você escreve/edita a cena, confere visualmente e exporta.
Responda sempre em português do Brasil.

## Fluxo de trabalho

1. **Criar**: `npm run new <nome> "Título"` (ou escreva `scenes/<nome>.js` direto). Nomes em kebab-case.
2. **Checar** (sempre, depois de cada mudança): `npm run check <nome>` — mostra dimensões, volume,
   massa estimada e se cada peça é fechada (watertight). Erros de código aparecem aqui também.
3. **Ver**: com o servidor rodando (`npm run dev`, porta 5199), abra
   `http://localhost:5199/?scene=<nome>` no navegador embutido. A página recarrega sozinha ao salvar.
   API de automação no console da página (`window.threeLab`):
   - `await threeLab.load('nome', {param: valor})` → retorna o relatório
   - `await threeLab.setParams({...})`, `threeLab.view('iso'|'front'|'back'|'side'|'top'|'bottom')`
   - `threeLab.report()`, `threeLab.params()`, `threeLab.screenshot()` (dataURL PNG), `threeLab.section(true)` (corte em x=0 para ver o interior)
   Tire screenshot e **olhe** o resultado antes de dizer que ficou pronto.
4. **Exportar**: `npm run export <nome> -- --formats glb,stl,3mf,embed` (padrão) ou `--formats all`.
   Parâmetros: `--set chave=valor` (repetível). Mesa da impressora: `--printer 256x256x256`.
   Saída em `exports/<nome>/` (+ `<nome>.report.json`).

## Formatos

| formato | uso | unidade/eixo |
|---|---|---|
| `glb` | web (three.js, model-viewer, Blender) — **o melhor para sites** | metros, Y-up |
| `gltf` | web, JSON legível | metros, Y-up |
| `usdz` | AR no iPhone/Safari | metros |
| `embed` | `<nome>.embed.html`: snippet `<model-viewer>` pronto para colar no site (+ GLB) | — |
| `stl` | impressão 3D (uma cor) | mm, Z-up |
| `3mf` | impressão 3D **com cores por peça** (Bambu/Orca/Prusa) — preferido p/ impressão | mm, Z-up |
| `obj`, `ply` | CAD / outros programas | mm, Y-up |

## Formato de uma cena

```js
import { box, cylinder, subtract, union, group, text, colors } from '../src/lib/index.js';

export const meta = { title: 'Suporte de celular', description: '...' };

// Viram sliders/cores no visualizador e aceitam --set no CLI.
// número -> slider (min/max/step), '#rrggbb' -> seletor de cor, string -> texto, boolean -> checkbox,
// { value, options: [...] } -> lista
export const params = {
  width: { value: 70, min: 40, max: 120, step: 1, label: 'Largura (mm)' },
  color: { value: '#3e63dd', label: 'Cor' },
};

export default function build(p) {      // pode ser async
  return group([ /* objetos */ ]);       // deve retornar um THREE.Object3D
}
```

## Convenções

- **1 unidade = 1 mm. Y para cima. Chão em y = 0.** Modele apoiado no chão (`pos: [0, h/2, 0]` para
  primitivas centradas, ou `onFloor(obj)`).
- Primitivas são **centradas na origem**. `rot` é em **graus**.
- Cada `Mesh` = uma peça com uma cor. No 3MF cada peça vira um objeto com sua cor (impressão multicor).
- Dê `name` às peças (`{ name: 'tampa' }`) — aparece no relatório e no 3MF.

## Biblioteca (`src/lib/index.js`)

Opções comuns (último argumento): `{ pos:[x,y,z], rot:[rx,ry,rz], scale, color, name, material, roughness, metalness, opacity, flat }`.

- Sólidos: `box(w,h,d)`, `roundedBox(w,h,d,raio)`, `sphere(r)`, `cylinder(r,h,{rTop})`, `cone(r,h)`,
  `prism(lados,r,h)`, `torus(R,r)` (deitado), `capsule(r,comprimento)`, `plane(w,d)` (não sólido!)
- 2D → 3D: `extrude(forma, altura, {bevel})` extruda para +Y a partir de y=0; a forma 2D (x,y) vira (x,z).
  Formas: `shape(pontos, furos)`, `polygon(lados,r)`, `circle2d(r)`, `roundedRect2d(w,h,r)`.
- `lathe([[raio,altura],...])` revolução no eixo Y — **comece e termine em raio 0** para ser sólido.
- `tube(pontos, raio, {closed})`, `parametric((u,v)=>[x,y,z])`.
- `text(str, tamanho, espessura, { flat, align, weight:'bold'|'regular'|'serif'|'serifBold' })` — em pé (plano XY) com base
  em y=0; `flat:true` deita no chão (para placas/carimbos).
- Logos/ícones: coloque o `.svg` em `assets/` e, num `build` **async**:
  `svg(await asset('logo.svg'), espessura, { width | height, flat })` — em pé no plano XY (voltado p/ +Z),
  centralizado em X, base em y=0. Só preenchimentos (fill) viram sólido; contornos (stroke) são ignorados.
  `asset(nome)` lê qualquer arquivo de texto de `assets/` (navegador e CLI).
- Booleanas (motor **manifold-3d**, resultado sempre fechado): `union([a,b,...])`, `subtract(base, [cortes])`,
  `intersect([a,b])`, `hull([a,b,...])` (casco convexo), `cutAt(obj, y, {keep:'above'|'below'})`.
  O resultado fica em coordenadas do mundo (as posições das entradas já estão aplicadas).
  Entradas precisam ser sólidos fechados.
- Organização: `group([..], opts)`, `copy(obj, opts)`, `repeat(n, i => obj)`, `radial(n, raio, (i, ang) => obj)`,
  `onFloor(obj)`, `measure(obj)`.
- Impressão: `hole(diâmetro, altura)`, `screwHole(d, h, cabeçaD)`.
- Materiais/cores: `mat(cor, opts)`, `colors.{red, blue, green, yellow, ...}`.
- `THREE` é reexportado para geometrias customizadas (`new THREE.BufferGeometry()` etc.).

## Boas práticas para impressão 3D

- Paredes ≥ 1,2 mm; detalhes ≥ 0,4 mm; texto em relevo ≥ 0,6 mm de altura e ≥ 5 mm de tamanho.
- Folga entre peças que encaixam: 0,2–0,3 mm. Furo para parafuso M3: 3,2–3,4 mm.
- Evite balanços > 45° sem suporte; prefira chanfros a arredondados no fundo.
- Para cortar furos: o cortador deve **atravessar** a peça (um pouco mais alto/longo) para não deixar película.
- Peças que se tocam mas não são unidas viram objetos separados — use `union` quando devem ser uma peça só.
- Confira `Fechado ✓` no `npm run check` antes de exportar para impressão.

### Resina (brindes e peças de uma cor só)

- Detalhe vem do **relevo**, não da cor: relevo/gravação de 0,8–1,2 mm, traços ≥ 0,3 mm.
- Gere **peça única**: `union` do corpo com relevos (ou `subtract` para gravado). Ofereça um parâmetro
  `finish: relevo | gravado | multicor` quando fizer sentido.
- Peças maciças até ~20 cm³ podem ir sólidas; acima disso, **oque no modelo**: `hollow(peca, t, { keep })` ou
  `subtract(peca, erode(peca, t))` (casca 2–2,5 mm). Proteja com `keep`/subtração regiões que devem ficar maciças
  (encaixes, furos — dilatados em t). Prefira fundo aberto (drena sozinho) ou 2 furos de drenagem de ~3 mm.
- Depois de ocar, rode `npm run walls <cena>` para medir a espessura mínima das paredes; evite bordas em "fio de navalha"
  (arredondamentos grandes encontrando paredes retas, saídas de canal em superfícies curvas).
- No visualizador, use um cinza de resina (`#8e9096`) para avaliar o relevo.

## Para web

- GLB é o formato principal. Use materiais com `roughness`/`metalness`. Mantenha < ~200k triângulos.
- `embed` gera o HTML com `<model-viewer>` (rotação, zoom, AR).

## Estrutura

- `scenes/` — modelos (um por arquivo; arquivos começando com `_` são ignorados — use para helpers compartilhados)
- `src/lib/` — biblioteca de modelagem · `src/export/` — exportadores e análise · `src/viewer/` — visualizador
- `cli/` — comandos `new`, `check`, `export`, `list` · `exports/` — saída (ignorada pelo git)

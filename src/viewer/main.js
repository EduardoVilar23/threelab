// threeLab — visualizador web.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import GUI from 'lil-gui';
import '@fontsource-variable/archivo/standard.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import { buildScene, defaultParams } from '../core.js';
import { exportObject, embedSnippet, FORMATS } from '../export/index.js';
import { analyze } from '../export/analyze.js';

import madeWithSvg from '../../brand/badges/made-with-threelab.svg?raw';
import { compileScene, myScenes, slug } from '../user-scene.js';
import { GOALS, buildCreatePrompt, buildRefinePrompt, buildFixPrompt, extractCode } from '../prompt/index.js';

const modules = import.meta.glob('/scenes/*.js');
const sources = import.meta.glob('/scenes/*.js', { query: '?raw', import: 'default' });
const MINE = 'my:'; // prefixo das cenas coladas pelo usuário (guardadas no navegador)
const sceneNames = Object.keys(modules)
  .map((p) => p.match(/\/scenes\/(.+)\.js$/)[1])
  .filter((n) => !n.startsWith('_'))
  .sort();

// ---------------------------------------------------------------- três.js básico
const stage = document.getElementById('stage');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.localClippingEnabled = true;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45; // luz ambiente mais baixa: cores fiéis e relevo legível
renderer.toneMappingExposure = 0.95;

const camera = new THREE.PerspectiveCamera(35, 1, 0.5, 20000);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target, new THREE.HemisphereLight(0xffffff, 0x888888, 0.4));

const helpers = new THREE.Group();
scene.add(helpers);
const shadowFloor = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), new THREE.ShadowMaterial({ opacity: 0.18 }));
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

function resize() {
  const { clientWidth: w, clientHeight: h } = stage;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);

// ---------------------------------------------------------------- estado
const state = { name: null, mod: null, root: null, params: {}, report: null, wire: false, bbox: false, spin: false, section: false };
const sectionPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0); // mostra a metade x < 0
let gui = null;
const $ = (id) => document.getElementById(id);

const storage = {
  get(k) { try { return JSON.parse(sessionStorage.getItem('threeLab:' + k)); } catch { return null; } },
  set(k, v) { try { sessionStorage.setItem('threeLab:' + k, JSON.stringify(v)); } catch {} },
};

const isMine = (name) => name?.startsWith(MINE);
/** Nome base dos arquivos baixados (título para cenas do usuário, nome do arquivo para exemplos). */
const fileBase = () => (isMine(state.name) ? slug(state.mod?.meta?.title ?? 'modelo') : state.name);

function showError(err) {
  const el = $('error');
  if (!err) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = `Erro na cena "${state.mod?.meta?.title ?? state.name}":\n${err.stack || err.message || err}`;
  console.error(err);
}

function toast(msg) {
  const t = $('toast');
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast.t); toast.t = setTimeout(() => (t.hidden = true), 2200);
}

// ---------------------------------------------------------------- carregar cena
/** Devolve o módulo da cena: exemplo (scenes/*.js) ou criação do usuário (compilada do código salvo). */
async function resolveModule(name) {
  if (isMine(name)) {
    const saved = myScenes.get(name.slice(MINE.length));
    if (!saved) throw new Error(`Criação "${name}" não encontrada neste navegador.`);
    return compileScene(saved.code);
  }
  return modules[`/scenes/${name}.js`]();
}

async function load(name, overrides) {
  if (!isMine(name) && !modules[`/scenes/${name}.js`]) throw new Error(`Cena "${name}" não existe. Disponíveis: ${sceneNames.join(', ')}`);
  const sameScene = state.name === name;
  state.name = name;
  history.replaceState(null, '', `?scene=${encodeURIComponent(name)}`);
  document.querySelectorAll('.scene-list a').forEach((a) => a.classList.toggle('active', a.dataset.name === name));
  $('refine').hidden = false;
  try {
    state.mod = await resolveModule(name);
    const saved = storage.get(`params:${name}`) ?? {};
    // mantém só parâmetros que ainda existem na cena
    const defs = defaultParams(state.mod);
    const kept = Object.fromEntries(Object.entries(saved).filter(([k]) => k in defs));
    await rebuild({ ...kept, ...(overrides ?? {}) });
    buildGui();
    if (!sameScene && !restoreView()) setView('iso');
    showError(null);
  } catch (err) {
    showError(err);
  }
  return state.report;
}

async function rebuild(params = state.params) {
  const { root, params: used } = await buildScene(state.mod, params);
  if (state.root) {
    scene.remove(state.root);
    state.root.traverse((o) => o.geometry?.dispose?.());
  }
  state.root = root;
  state.params = used;
  storage.set(`params:${state.name}`, used);
  root.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  scene.add(root);
  applyWire();
  state.report = analyze(root);
  updateHelpers();
  renderInfo();
}

function buildGui() {
  gui?.destroy();
  const defs = state.mod.params ?? {};
  if (!Object.keys(defs).length) { gui = null; return; }
  gui = new GUI({ container: stage, title: 'Parâmetros' });
  const obj = { ...state.params };
  let pending = null;
  const onChange = () => {
    clearTimeout(pending);
    pending = setTimeout(() => rebuild(obj).then(() => showError(null)).catch(showError), 60);
  };
  for (const [k, d] of Object.entries(defs)) {
    const def = typeof d === 'object' && d !== null ? d : { value: d };
    const label = def.label ?? k;
    let c;
    if (def.options) c = gui.add(obj, k, def.options);
    else if (typeof def.value === 'string' && /^#([0-9a-f]{3}){1,2}$/i.test(def.value)) c = gui.addColor(obj, k);
    else if (typeof def.value === 'number') c = gui.add(obj, k, def.min, def.max, def.step);
    else c = gui.add(obj, k);
    c.name(label).onChange(onChange);
  }
  gui.add({ reset: () => { Object.assign(obj, defaultParams(state.mod)); gui.controllersRecursive().forEach((c) => c.updateDisplay()); onChange(); } }, 'reset').name('Restaurar padrões');
}

// ---------------------------------------------------------------- UI lateral
function renderInfo() {
  const r = state.report;
  $('title').textContent = state.mod.meta?.title ?? state.name;
  $('desc').textContent = state.mod.meta?.description ?? '';
  const s = r.print_size_mm;
  const okCls = (b) => (b ? 'ok' : 'bad');
  $('stats').innerHTML = `<dl id="stats" style="display:contents">
    <dt>L × P × A</dt><dd>${s.width} × ${s.depth} × ${s.height} mm</dd>
    <dt>Triângulos</dt><dd>${r.triangles.toLocaleString('pt-BR')}</dd>
    <dt>Peças</dt><dd>${r.parts.length}</dd>
    <dt>Volume</dt><dd>${r.volume_cm3} cm³</dd>
    <dt>PLA maciço</dt><dd>≈ ${r.mass_g_100pct_infill.PLA} g</dd>
    <dt>Fechado</dt><dd class="${okCls(r.watertight)}">${r.watertight ? 'pronto p/ imprimir' : 'abertas: ' + r.parts.filter((p) => !p.watertight).map((p) => p.name).join(', ')}</dd>
    <dt>Mesa 256³</dt><dd class="${okCls(r.fitsPrinter)}">${r.fitsPrinter ? 'cabe' : 'não cabe'}</dd>
  </dl>`;
}

const ICON_X = '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function renderSceneList() {
  $('scenes').innerHTML = sceneNames.map((n) => `<li><a href="?scene=${n}" data-name="${n}">${n}</a></li>`).join('');
  const mine = myScenes.all();
  $('mine-box').hidden = !mine.length;
  $('my-scenes').innerHTML = mine
    .map((s) => `<li><a href="?scene=${MINE}${s.id}" data-name="${MINE}${s.id}">${esc(s.title)}</a>` +
      `<button class="del" data-del="${s.id}" title="Excluir" aria-label="Excluir ${esc(s.title)}">${ICON_X}</button></li>`)
    .join('');
  document.querySelectorAll('.scene-list a').forEach((a) => a.classList.toggle('active', a.dataset.name === state.name));
}

function bindSceneList() {
  for (const list of [$('scenes'), $('my-scenes')]) {
    list.addEventListener('click', (e) => {
      const del = e.target.closest('[data-del]');
      if (del) {
        if (!confirm('Excluir esta criação deste navegador?')) return;
        myScenes.remove(del.dataset.del);
        renderSceneList();
        if (state.name === MINE + del.dataset.del) load(sceneNames[0]);
        return;
      }
      const a = e.target.closest('a');
      if (!a) return;
      e.preventDefault();
      load(a.dataset.name);
    });
  }
}

function download(data, filename, mime) {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

async function exportAs(format) {
  const { data, ext, mime } = await exportObject(state.root, format, { name: state.mod.meta?.title ?? state.name });
  download(data, `${fileBase()}.${ext}`, mime);
  toast(`${fileBase()}.${ext} exportado`);
}

function renderExportButtons() {
  $('exports').innerHTML = Object.entries(FORMATS)
    .map(([k, f]) => `<button data-format="${k}">.${k}<small>${f.label.replace(/^[^(]+\(|\)$/g, '')}</small></button>`).join('');
  $('exports').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (b) exportAs(b.dataset.format).catch(showError);
  });
  $('embed').addEventListener('click', async () => {
    const html = embedSnippet(`${fileBase()}.glb`, { title: state.mod.meta?.title ?? state.name });
    try { await navigator.clipboard.writeText(html); } catch {}
    await exportAs('glb');
    toast('Código copiado + GLB baixado');
  });
}

// ---------------------------------------------------------------- câmera e auxiliares
function bounds() {
  const box = new THREE.Box3().setFromObject(state.root);
  if (box.isEmpty()) box.set(new THREE.Vector3(-10, 0, -10), new THREE.Vector3(10, 10, 10));
  return box;
}

const VIEWS = { iso: [1, 0.75, 1.15], front: [0, 0, 1], back: [0, 0, -1], side: [1, 0, 0], top: [0, 1, 0.0001], bottom: [0, -1, 0.0001] };
function setView(name) {
  const box = bounds();
  const center = box.getCenter(new THREE.Vector3());
  const radius = box.getBoundingSphere(new THREE.Sphere()).radius;
  const dist = radius / Math.sin((camera.fov * Math.PI) / 360) * 1.15;
  const dir = new THREE.Vector3(...VIEWS[name]).normalize();
  camera.position.copy(center).addScaledVector(dir, dist);
  camera.near = dist / 100; camera.far = dist * 100; camera.updateProjectionMatrix();
  controls.target.copy(center);
  controls.update();
}

function saveView() {
  if (state.name) storage.set(`view:${state.name}`, { p: camera.position.toArray(), t: controls.target.toArray() });
}
function restoreView() {
  const v = storage.get(`view:${state.name}`);
  if (!v) return false;
  camera.position.fromArray(v.p); controls.target.fromArray(v.t); controls.update();
  return true;
}
controls.addEventListener('end', saveView);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (state.root) updateHelpers(); });

function updateHelpers() {
  helpers.clear();
  const box = bounds();
  const size = box.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.z, 50);
  const gridSize = Math.ceil((span * 2) / 100) * 100;
  const gridColor = new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue('--grid').trim() || '#8c8a83');
  const fine = new THREE.GridHelper(gridSize, gridSize / 10, gridColor, gridColor);
  fine.material.opacity = 0.18; fine.material.transparent = true;
  const coarse = new THREE.GridHelper(gridSize, gridSize / 50, gridColor, gridColor);
  coarse.material.opacity = 0.35; coarse.material.transparent = true;
  coarse.position.y = 0.01;
  helpers.add(fine, coarse);
  shadowFloor.scale.setScalar(gridSize * 2);
  if (state.bbox) helpers.add(new THREE.Box3Helper(box, 0xffc21a));
  // sol posicionado de acordo com o tamanho
  const r = Math.max(size.length(), 50);
  sun.position.set(r * 0.8, r * 1.6, r * 1.0);
  sun.target.position.copy(box.getCenter(new THREE.Vector3()));
  Object.assign(sun.shadow.camera, { left: -r, right: r, top: r, bottom: -r, near: 1, far: r * 6 });
  sun.shadow.camera.updateProjectionMatrix();
}

function applyWire() {
  state.root?.traverse((o) => {
    if (!o.isMesh) return;
    [o.material].flat().forEach((m) => {
      m.wireframe = state.wire;
      // corte ao meio (plano x = 0): revela paredes internas de peças ocas
      m.clippingPlanes = state.section ? [sectionPlane] : null;
      m.side = state.section ? THREE.DoubleSide : (m.userData.side ?? (m.userData.side = m.side));
      m.needsUpdate = true;
    });
  });
}

document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => { setView(b.dataset.view); saveView(); }));
$('wire').addEventListener('click', (e) => { state.wire = !state.wire; e.target.classList.toggle('on', state.wire); applyWire(); });
$('bbox').addEventListener('click', (e) => { state.bbox = !state.bbox; e.target.classList.toggle('on', state.bbox); updateHelpers(); });
$('section').addEventListener('click', (e) => { state.section = !state.section; e.target.classList.toggle('on', state.section); applyWire(); });
$('spin').addEventListener('click', (e) => { state.spin = !state.spin; e.target.classList.toggle('on', state.spin); controls.autoRotate = state.spin; });
// Selo "made with threeLab" (brand/badges) desenhado no canto inferior direito do PNG exportado.
const BADGE_SYMBOL = madeWithSvg.match(/<path d="([^"]+)"/)[1];
async function withBadge(source) {
  await Promise.all([document.fonts.load('400 12px "JetBrains Mono"'), document.fonts.load('600 12px "JetBrains Mono"')]);
  const out = document.createElement('canvas');
  out.width = source.width; out.height = source.height;
  const g = out.getContext('2d');
  g.drawImage(source, 0, 0);
  const s = Math.max(1, out.width / 960); // o selo cresce com a imagem
  g.save();
  g.translate(out.width - 172 * s - 12 * s, out.height - 22 * s - 12 * s);
  g.scale(s, s);
  g.fillStyle = '#141414'; g.fillRect(0, 0, 99, 22);
  g.fillStyle = '#FFC21A'; g.fillRect(99, 0, 73, 22);
  g.fill(new Path2D(BADGE_SYMBOL), 'evenodd');
  g.font = '400 11.5px "JetBrains Mono", monospace'; g.fillStyle = '#EFECE4'; g.textAlign = 'start';
  g.fillText('made with', 25, 15);
  g.font = '600 11.5px "JetBrains Mono", monospace'; g.fillStyle = '#141414'; g.textAlign = 'center';
  g.fillText('threeLab', 135.2, 15);
  g.restore();
  return out;
}

// escolha do selo lembrada neste navegador (padrão: com selo)
try { $('shot-badge').value = localStorage.getItem('threeLab:shotBadge') === 'off' ? 'off' : 'on'; } catch {}
$('shot-badge').addEventListener('change', (e) => { try { localStorage.setItem('threeLab:shotBadge', e.target.value); } catch {} });

$('shot').addEventListener('click', async () => {
  renderer.render(scene, camera);
  const out = $('shot-badge').value === 'off' ? renderer.domElement : await withBadge(renderer.domElement);
  out.toBlob((b) => download(b, `${fileBase()}.png`, 'image/png'));
  toast(`${fileBase()}.png exportado`);
});

// ---------------------------------------------------------------- criar com IA (prompt → resposta colada)
const dlg = $('creator');
const cr = { mode: 'new', baseCode: null, lastCode: '' };

$('cr-goal').innerHTML = Object.entries(GOALS).map(([k, g]) => `<option value="${k}">${g.label}</option>`).join('');

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch {}
  // alternativa para contextos sem permissão de área de transferência
  const ta = $('cr-prompt');
  ta.hidden = false; ta.value = text; ta.select();
  try { return document.execCommand('copy'); } catch { return false; }
}

function currentPrompt() {
  const request = $('cr-request').value.trim();
  const goal = $('cr-goal').value;
  return cr.mode === 'refine' ? buildRefinePrompt({ code: cr.baseCode, change: request, goal }) : buildCreatePrompt({ request, goal });
}

function refreshPrompt() {
  const has = $('cr-request').value.trim().length > 0;
  $('cr-copy').disabled = !has;
  if (!$('cr-prompt').hidden) $('cr-prompt').value = has ? currentPrompt() : '';
}

function crError(err) {
  const box = $('cr-error');
  box.hidden = !err;
  if (err) box.querySelector('pre').textContent = err.message || String(err);
}

async function openCreator(mode = 'new') {
  cr.mode = mode;
  cr.baseCode = null;
  if (mode === 'refine') {
    cr.baseCode = isMine(state.name) ? myScenes.get(state.name.slice(MINE.length))?.code : await sources[`/scenes/${state.name}.js`]?.();
    if (!cr.baseCode) { toast('Não consegui ler o código desta cena'); return; }
  }
  const refine = mode === 'refine';
  $('cr-heading').textContent = refine ? `Ajustar “${state.mod?.meta?.title ?? state.name}” com IA` : 'Novo modelo com IA';
  $('cr-label').textContent = refine ? 'O que você quer mudar?' : 'Descreva o que você quer criar';
  $('cr-request').placeholder = refine ? 'Ex.: deixe 20% mais alto e adicione um furo para cordão no topo' : 'Ex.: suporte de celular com 70 mm de largura e o nome “Ana” em relevo';
  $('cr-request').value = '';
  $('cr-response').value = '';
  $('cr-prompt').hidden = true;
  $('cr-show').textContent = 'ver prompt';
  crError(null);
  refreshPrompt();
  dlg.showModal();
  $('cr-request').focus();
}

/** Texto da resposta da IA → compila, valida, salva em "Minhas criações" e abre no visualizador. */
async function createFromText(text) {
  const code = extractCode(text);
  cr.lastCode = code;
  const mod = await compileScene(code);
  await buildScene(mod); // valida com os parâmetros padrão antes de salvar
  const id = myScenes.add({ title: mod.meta?.title, code });
  renderSceneList();
  await load(MINE + id);
  return id;
}

$('new-ai').addEventListener('click', () => openCreator('new'));
$('refine').addEventListener('click', () => openCreator('refine'));
$('cr-request').addEventListener('input', refreshPrompt);
$('cr-goal').addEventListener('change', refreshPrompt);
$('cr-show').addEventListener('click', () => {
  const p = $('cr-prompt');
  p.hidden = !p.hidden;
  $('cr-show').textContent = p.hidden ? 'ver prompt' : 'ocultar prompt';
  refreshPrompt();
});
$('cr-copy').addEventListener('click', async () => {
  const ok = await copyText(currentPrompt());
  toast(ok ? 'Prompt copiado — cole na sua IA' : 'Não consegui copiar: selecione o prompt abaixo e copie');
});
$('cr-load').addEventListener('click', async () => {
  crError(null);
  try {
    await createFromText($('cr-response').value);
    dlg.close();
    toast('Modelo carregado');
  } catch (err) {
    console.error(err);
    crError(err);
  }
});
$('cr-copy-fix').addEventListener('click', async () => {
  const msg = $('cr-error').querySelector('pre').textContent;
  const ok = await copyText(buildFixPrompt({ code: cr.lastCode, error: msg }));
  toast(ok ? 'Prompt de correção copiado — cole na sua IA' : 'Não consegui copiar');
});

// ---------------------------------------------------------------- loop
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});

// ---------------------------------------------------------------- API para automação (Claude via navegador)
window.threeLab = {
  scenes: () => sceneNames,
  load: (name, params) => load(name, params),
  setParams: async (params) => { await rebuild({ ...state.params, ...params }); buildGui(); return state.report; },
  params: () => state.params,
  report: () => state.report,
  view: (name = 'iso') => setView(name),
  section: (on = true) => { state.section = on; $('section').classList.toggle('on', on); applyWire(); },
  screenshotWithBadge: async () => (await withBadge(renderer.domElement)).toDataURL('image/png'),
  screenshot: () => { renderer.render(scene, camera); return renderer.domElement.toDataURL('image/png'); },
  export: (format) => exportAs(format),
  loadCode: (code) => createFromText(code),
  THREE,
  get root() { return state.root; },
};

// ---------------------------------------------------------------- início
renderSceneList();
bindSceneList();
renderExportButtons();
resize();
const wanted = new URLSearchParams(location.search).get('scene');
const initial = wanted && (isMine(wanted) ? myScenes.get(wanted.slice(MINE.length)) : sceneNames.includes(wanted)) ? wanted : sceneNames[0];
if (initial) load(initial);
else showError(new Error('Nenhuma cena em scenes/. Crie uma com: npm run new minha-cena'));

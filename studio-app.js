(() => {
'use strict';
const GEN = window.STUDIO_GEN;
const ATLAS = window.POSE_ATLAS;
if (!GEN || !ATLAS) return;

const CFG_KEY = 'pose_atlas_studio_cfg_v1';
const PAGE = 48;
const PANES = [
  {
    key: 'portrait',
    data: '/data/portrait-zh.json',
    titleField: '标题',
    tabField: '分区',
    searchFields: ['id', '标题', '发长', '发型名称', '分区']
  },
  {
    key: 'costume',
    data: '/data/costume-zh.json',
    titleField: '服装名称',
    tabField: '分类',
    searchFields: ['id', '服装名称', '分类', '关键词']
  },
  {
    key: 'pose',
    data: '/data/pose-zh.json',
    titleField: '姿势名称',
    tabField: '体系',
    searchFields: ['id', '姿势名称', '姿势编号', '分类', '体系', '角度']
  }
];
const DEFAULT_CFG = {
  provider: 'qwen',
  style: 'realistic',
  comfyUrl: 'http://127.0.0.1:8188',
  qwenKey: '',
  qwenModel: 'qwen-image-edit-plus',
  qwenBase: 'https://dashscope.aliyuncs.com',
  doubaoKey: '',
  doubaoModel: 'doubao-seedream-4-0-250828',
  doubaoBase: 'https://ark.cn-beijing.volces.com',
  useProxy: true
};

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const INFO = {
  guide: {
    title: '使用指南',
    html: '<ul><li>在本页三列里直接点选人像、服装、姿势，不必跳到图库。</li><li>点<strong>生成</strong>。本机有 ComfyUI 会自动用它；否则填写通义千问或豆包密钥。</li><li>随机一套只填槽位，不会提交生成。</li></ul>'
  },
  notice: {
    title: '注意事项',
    html: '<ul><li>素材仅供 AI 绘画技术研究与合法艺术创作学习使用。</li><li>禁止用于违法违规、色情传播或未经授权的真人换脸。</li><li>使用者自行承担法律责任。图片数据禁止再分发、转载与再售。</li></ul>'
  }
};

const catalogs = { portrait: [], costume: [], pose: [] };
const filters = {
  portrait: { tab: '', query: '', shown: PAGE },
  costume: { tab: '', query: '', shown: PAGE },
  pose: { tab: '', query: '', shown: PAGE }
};

function loadCfg() {
  try {
    return { ...DEFAULT_CFG, ...JSON.parse(localStorage.getItem(CFG_KEY) || '{}') };
  } catch {
    return { ...DEFAULT_CFG };
  }
}

function saveCfg(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

function recipe() {
  return ATLAS.getRecipe();
}

function slim(item) {
  return {
    id: item.id,
    标题: item.标题,
    发长: item.发长,
    服装名称: item.服装名称,
    姿势名称: item.姿势名称,
    角度: item.角度,
    体系: item.体系,
    分类: item.分类,
    原图: item.原图,
    缩略图: item.缩略图,
    预览图: item.预览图
  };
}

function pickItem(kind, item) {
  const next = { ...recipe(), [kind]: slim(item) };
  ATLAS.setRecipe(next);
}

function slotTitle(kind, item) {
  if (!item) return '';
  if (kind === 'portrait') return item.标题 || item.发长 || item.id;
  if (kind === 'costume') return item.服装名称 || item.id;
  return [item.姿势名称, item.角度].filter(Boolean).join(' ') || item.id;
}

function slotImage(item) {
  return item && (item.缩略图 || item.预览图 || item.原图);
}

function visibleList(kind) {
  const pane = PANES.find(item => item.key === kind);
  let list = catalogs[kind];
  if (ATLAS.isSafeMode()) {
    if (kind === 'pose') list = list.filter(item => !ATLAS.isNsfwPose(item));
    if (kind === 'costume') list = list.filter(item => !ATLAS.isNsfwCostume(item));
  }
  const state = filters[kind];
  if (state.tab) list = list.filter(item => item[pane.tabField] === state.tab);
  if (state.query) {
    const query = state.query;
    list = list.filter(item => item._search.includes(query));
  }
  return list;
}

function tabsFor(kind) {
  const pane = PANES.find(item => item.key === kind);
  let source = catalogs[kind];
  if (ATLAS.isSafeMode()) {
    if (kind === 'pose') source = source.filter(item => !ATLAS.isNsfwPose(item));
    if (kind === 'costume') source = source.filter(item => !ATLAS.isNsfwCostume(item));
  }
  return [...new Set(source.map(item => item[pane.tabField]).filter(Boolean))];
}

function renderTabs(kind) {
  const state = filters[kind];
  const tabs = ['', ...tabsFor(kind)];
  $(`#${kind}Tabs`).innerHTML = tabs.map(tab => (
    `<button type="button" data-tab="${esc(tab)}" aria-pressed="${state.tab === tab}">${tab || '全部'}</button>`
  )).join('');
}

function renderPicked(kind) {
  const item = recipe()[kind];
  const box = $(`#${kind}Picked`);
  if (!item) {
    box.innerHTML = '<p class="studio-picked-empty">还没选</p>';
    return;
  }
  const src = slotImage(item);
  box.innerHTML = `<div class="studio-picked-card">
    <img src="${esc(GEN.assetUrl(src))}" alt="">
    <div><strong>${esc(slotTitle(kind, item))}</strong><span>${esc(item.id || '')}</span></div>
    <button class="link-btn" type="button" data-clear="${kind}">去掉</button>
  </div>`;
}

function renderGrid(kind, append = false) {
  const list = visibleList(kind);
  const state = filters[kind];
  if (!append) state.shown = PAGE;
  const selected = recipe()[kind];
  const slice = list.slice(append ? $(`#${kind}Grid`).querySelectorAll('[data-id]').length : 0, state.shown);
  const html = slice.map(item => {
    const on = selected && selected.id === item.id ? ' on' : '';
    const title = slotTitle(kind, item);
    return `<button type="button" class="studio-pick${on}" data-id="${esc(item.id)}" title="${esc(title)}" aria-pressed="${on ? 'true' : 'false'}">
      <img src="${esc(GEN.assetUrl(item.缩略图))}" alt="${esc(title)}" loading="lazy" decoding="async">
    </button>`;
  }).join('');
  const grid = $(`#${kind}Grid`);
  if (append) grid.insertAdjacentHTML('beforeend', html);
  else grid.innerHTML = html || '<p class="studio-picked-empty">没有匹配的图</p>';
  const more = document.querySelector(`[data-more="${kind}"]`);
  const shown = grid.querySelectorAll('[data-id]').length;
  more.hidden = shown >= list.length || !list.length;
  more.textContent = `显示更多（${list.length - shown}）`;
}

function renderPane(kind) {
  renderTabs(kind);
  renderPicked(kind);
  renderGrid(kind);
}

function renderAllPanes() {
  PANES.forEach(pane => renderPane(pane.key));
}

function renderStyle() {
  const cfg = loadCfg();
  $('#stylePreset').innerHTML = Object.entries(GEN.STYLE_PRESETS).map(([id, info]) => (
    `<button type="button" data-style="${id}" aria-pressed="${cfg.style === id}">${info.label}</button>`
  )).join('');
}

function renderProvider() {
  const cfg = loadCfg();
  document.querySelectorAll('#providerTabs button').forEach(button => {
    button.setAttribute('aria-pressed', button.dataset.provider === cfg.provider);
  });
  const box = $('#providerSettings');
  if (cfg.provider === 'comfyui') {
    box.innerHTML = `<label class="studio-field"><span>ComfyUI 地址</span>
      <input id="comfyUrl" type="url" value="${cfg.comfyUrl}" autocomplete="off" spellcheck="false">
    </label>
    <div class="studio-inline">
      <button class="open-btn" type="button" id="detectComfy">检测连接</button>
      <p class="studio-status" id="comfyStatus"></p>
    </div>`;
    $('#comfyUrl').addEventListener('change', event => {
      saveCfg({ ...loadCfg(), comfyUrl: event.target.value.trim() || DEFAULT_CFG.comfyUrl });
    });
    $('#detectComfy').addEventListener('click', () => detectComfy(true));
  } else {
    const isQwen = cfg.provider === 'qwen';
    box.innerHTML = `<label class="studio-field"><span>API Key</span>
      <input id="apiKey" type="password" value="${isQwen ? cfg.qwenKey : cfg.doubaoKey}" autocomplete="off">
    </label>
    <label class="studio-field"><span>模型</span>
      <input id="apiModel" type="text" value="${isQwen ? cfg.qwenModel : cfg.doubaoModel}" autocomplete="off" spellcheck="false">
    </label>
    <label class="studio-field"><span>接口地址</span>
      <input id="apiBase" type="url" value="${isQwen ? cfg.qwenBase : cfg.doubaoBase}" autocomplete="off" spellcheck="false">
    </label>
    <label class="studio-check"><input id="useProxy" type="checkbox"${cfg.useProxy ? ' checked' : ''}> 经本站代理（国内访问需要）</label>`;
    const bind = (id, field) => {
      $('#' + id).addEventListener('change', event => {
        const next = { ...loadCfg() };
        next[field] = id === 'useProxy' ? event.target.checked : event.target.value.trim();
        saveCfg(next);
      });
    };
    bind('apiKey', isQwen ? 'qwenKey' : 'doubaoKey');
    bind('apiModel', isQwen ? 'qwenModel' : 'doubaoModel');
    bind('apiBase', isQwen ? 'qwenBase' : 'doubaoBase');
    bind('useProxy', 'useProxy');
  }
}

function syncPrompt(force) {
  const area = $('#promptInput');
  if (!force && area.dataset.dirty === '1') return;
  area.value = GEN.buildRecipePrompt(recipe(), loadCfg().style);
  area.dataset.dirty = '';
}

function setStatus(message) {
  $('#runStatus').textContent = message || '';
}

async function detectComfy(manual) {
  const cfg = loadCfg();
  try {
    const found = await GEN.detectComfy(cfg.comfyUrl);
    if (!found) throw new Error('未找到本机 ComfyUI');
    saveCfg({ ...loadCfg(), provider: 'comfyui', comfyUrl: found.baseUrl });
    renderProvider();
    const status = $('#comfyStatus');
    if (status) status.textContent = found.info;
    setStatus(found.info);
    return true;
  } catch (error) {
    if (manual) {
      const status = $('#comfyStatus');
      if (status) status.textContent = error.message;
      setStatus(error.message);
    }
    return false;
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function randomRecipe() {
  const next = {};
  PANES.forEach(pane => {
    const list = visibleList(pane.key);
    if (list.length) next[pane.key] = slim(pickRandom(list));
  });
  ATLAS.setRecipe(next);
  $('#promptInput').dataset.dirty = '';
}

function clearRecipe() {
  ATLAS.setRecipe({});
  $('#promptInput').dataset.dirty = '';
}

function setBusy(busy, message) {
  const button = $('#runGenerate');
  button.disabled = busy;
  button.textContent = busy ? '正在生成' : '生成';
  const progress = $('#resultProgress');
  progress.hidden = !busy;
  progress.textContent = message || '正在生成…';
  setStatus(busy ? (message || '正在生成…') : '');
}

function showError(message) {
  const error = $('#resultError');
  error.hidden = !message;
  error.textContent = message || '';
}

async function runGenerate() {
  const cfg = loadCfg();
  const current = recipe();
  const missing = PANES.filter(pane => !current[pane.key]).map(pane => pane.key === 'portrait' ? '人像' : pane.key === 'costume' ? '服装' : '姿势');
  if (missing.length) {
    showError(`还差：${missing.join('、')}`);
    return;
  }
  const prompt = $('#promptInput').value.trim() || GEN.buildRecipePrompt(current, cfg.style);
  showError('');
  setBusy(true, '正在准备…');
  try {
    let result;
    if (cfg.provider === 'comfyui') {
      result = await GEN.generateWithComfyUi({
        recipe: current,
        prompt,
        baseUrl: cfg.comfyUrl,
        onProgress: info => setBusy(true, info.message)
      });
    } else {
      const isQwen = cfg.provider === 'qwen';
      result = await GEN.generateCloud({
        provider: cfg.provider,
        recipe: current,
        prompt,
        apiKey: isQwen ? cfg.qwenKey : cfg.doubaoKey,
        baseUrl: isQwen ? cfg.qwenBase : cfg.doubaoBase,
        model: isQwen ? cfg.qwenModel : cfg.doubaoModel,
        useProxy: cfg.useProxy
      });
    }
    const image = $('#resultImage');
    image.src = result.imageUrl;
    image.hidden = false;
    $('#resultEmpty').hidden = true;
    const download = $('#downloadResult');
    download.href = result.imageUrl;
    download.hidden = false;
  } catch (error) {
    showError(error.message || '生成失败');
  } finally {
    setBusy(false);
  }
}

async function loadCatalogs() {
  await Promise.all(PANES.map(async pane => {
    const res = await fetch(pane.data);
    if (!res.ok) throw new Error('读取图库失败');
    catalogs[pane.key] = (await res.json()).map(item => {
      const copy = { ...item };
      copy._search = pane.searchFields.map(field => item[field]).filter(Boolean).join(' ').toLowerCase();
      return copy;
    });
  }));
}

function bind() {
  PANES.forEach(pane => {
    $(`#${pane.key}Tabs`).addEventListener('click', event => {
      const button = event.target.closest('[data-tab]');
      if (!button) return;
      filters[pane.key].tab = button.dataset.tab;
      renderPane(pane.key);
    });
    let timer;
    $(`#${pane.key}Search`).addEventListener('input', event => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        filters[pane.key].query = event.target.value.trim().toLowerCase();
        renderPane(pane.key);
      }, 80);
    });
    $(`#${pane.key}Grid`).addEventListener('click', event => {
      const button = event.target.closest('[data-id]');
      if (!button) return;
      const item = catalogs[pane.key].find(entry => entry.id === button.dataset.id);
      if (item) pickItem(pane.key, item);
    });
    document.querySelector(`[data-more="${pane.key}"]`).addEventListener('click', () => {
      filters[pane.key].shown += PAGE;
      renderGrid(pane.key, true);
    });
  });

  document.querySelector('.studio-pickers').addEventListener('click', event => {
    const upload = event.target.closest('[data-upload]');
    const clear = event.target.closest('[data-clear]');
    if (upload) {
      $('#slotFile').dataset.slot = upload.dataset.upload;
      $('#slotFile').click();
    }
    if (clear) {
      const next = recipe();
      delete next[clear.dataset.clear];
      ATLAS.setRecipe(next);
    }
  });

  $('#slotFile').addEventListener('change', event => {
    const file = event.target.files && event.target.files[0];
    const kind = event.target.dataset.slot;
    event.target.value = '';
    if (!file || !kind) return;
    const reader = new FileReader();
    reader.onload = () => {
      pickItem(kind, {
        id: 'local-' + kind,
        标题: file.name,
        服装名称: file.name,
        姿势名称: file.name,
        原图: reader.result,
        缩略图: reader.result
      });
    };
    reader.readAsDataURL(file);
  });

  $('#stylePreset').addEventListener('click', event => {
    const button = event.target.closest('[data-style]');
    if (!button) return;
    saveCfg({ ...loadCfg(), style: button.dataset.style });
    renderStyle();
    syncPrompt();
  });

  $('#providerTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-provider]');
    if (!button) return;
    saveCfg({ ...loadCfg(), provider: button.dataset.provider });
    renderProvider();
  });

  $('#promptInput').addEventListener('input', () => { $('#promptInput').dataset.dirty = '1'; });
  $('#randomRecipe').addEventListener('click', randomRecipe);
  $('#clearRecipe').addEventListener('click', clearRecipe);
  $('#runGenerate').addEventListener('click', runGenerate);

  window.addEventListener('pose-atlas-recipe', () => {
    PANES.forEach(pane => {
      renderPicked(pane.key);
      document.querySelectorAll(`#${pane.key}Grid .studio-pick`).forEach(button => {
        const on = recipe()[pane.key]?.id === button.dataset.id;
        button.classList.toggle('on', on);
        button.setAttribute('aria-pressed', String(on));
      });
    });
    syncPrompt();
  });
  window.addEventListener('pose-atlas-safe-mode', () => {
    PANES.forEach(pane => {
      if (filters[pane.key].tab && !tabsFor(pane.key).includes(filters[pane.key].tab)) filters[pane.key].tab = '';
    });
    renderAllPanes();
  });

  document.querySelectorAll('[data-info]').forEach(button => {
    button.addEventListener('click', () => {
      const info = INFO[button.dataset.info];
      $('#infoTitle').textContent = info.title;
      $('#infoContent').innerHTML = info.html;
      $('#infoDialog').showModal();
    });
  });
  $('#infoClose').addEventListener('click', () => $('#infoDialog').close());
  $('#infoDialog').addEventListener('click', event => {
    if (event.target === $('#infoDialog')) $('#infoDialog').close();
  });
}

async function start() {
  renderStyle();
  renderProvider();
  syncPrompt(true);
  bind();
  try {
    await loadCatalogs();
    renderAllPanes();
  } catch (error) {
    showError(error.message);
  }
  detectComfy(false);
}

start();
})();

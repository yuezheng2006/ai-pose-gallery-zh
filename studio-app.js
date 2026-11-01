(() => {
'use strict';
const GEN = window.STUDIO_GEN;
const ATLAS = window.POSE_ATLAS;
if (!GEN || !ATLAS) return;

const CFG_KEY = 'pose_atlas_studio_cfg_v1';
const SLOTS = [
  { key: 'portrait', label: '人像', pick: '/portraits/', data: '/data/portrait-zh.json' },
  { key: 'costume', label: '服装', pick: '/costumes/', data: '/data/costume-zh.json' },
  { key: 'pose', label: '姿势', pick: '/poses/', data: '/data/pose-zh.json' }
];
const DEFAULT_CFG = {
  provider: 'comfyui',
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
const INFO = {
  guide: {
    title: '使用指南',
    html: '<ul><li>在姿势、服装、人像页打开大图，点<strong>加入合成</strong>；或在本页上传本地图片。</li><li>本机 ComfyUI 请先启动，并加上 <code>--enable-cors-header "*"</code>。内置工作流为 Qwen Image Edit 2509 三图合成，4 步 Lightning。</li><li>通义千问与豆包走本站 <code>/api/proxy</code>，密钥只保存在浏览器。</li><li>随机填入不会提交生成请求。</li></ul>'
  },
  notice: {
    title: '注意事项',
    html: '<ul><li>素材仅供 AI 绘画技术研究与合法艺术创作学习使用。</li><li>禁止用于违法违规、色情传播或未经授权的真人换脸。</li><li>使用者自行承担法律责任。图片数据禁止再分发、转载与再售。</li></ul>'
  }
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

function slotTitle(kind, item) {
  if (!item) return '';
  if (kind === 'portrait') return item.标题 || item.发长 || item.id;
  if (kind === 'costume') return item.服装名称 || item.id;
  return item.姿势名称 || item.id;
}

function slotImage(item) {
  return item && (item.缩略图 || item.预览图 || item.原图);
}

function recipe() {
  return ATLAS.getRecipe();
}

function setSlot(kind, item) {
  ATLAS.addToRecipe(kind, item);
}

function renderSlots() {
  const data = recipe();
  $('#studioSlots').innerHTML = SLOTS.map(slot => {
    const item = data[slot.key];
    const src = slotImage(item);
    const title = slotTitle(slot.key, item);
    const body = src
      ? `<img src="${GEN.assetUrl(src)}" alt="${title}"><div class="studio-slot-copy"><strong>${slot.label}</strong><span>${title}</span></div>`
      : `<div class="studio-slot-empty"><strong>${slot.label}</strong><span>从图库选择或上传</span></div>`;
    return `<article class="studio-slot${item ? ' filled' : ''}" data-slot="${slot.key}">
      ${body}
      <div class="studio-slot-bar">
        <a class="open-btn" href="${slot.pick}">去选</a>
        <button class="open-btn" type="button" data-upload="${slot.key}">上传</button>
        <button class="open-btn" type="button" data-clear="${slot.key}" ${item ? '' : 'disabled'}>移除</button>
      </div>
    </article>`;
  }).join('');
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
    </div>
    <p class="studio-hint">启动示例：<code>python main.py --listen 127.0.0.1 --enable-cors-header "*"</code></p>`;
    $('#comfyUrl').addEventListener('change', event => {
      const next = { ...loadCfg(), comfyUrl: event.target.value.trim() || DEFAULT_CFG.comfyUrl };
      saveCfg(next);
    });
    $('#detectComfy').addEventListener('click', detectComfy);
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

async function detectComfy() {
  const status = $('#comfyStatus');
  if (status) status.textContent = '正在检测…';
  const cfg = loadCfg();
  try {
    const found = await GEN.detectComfy(cfg.comfyUrl);
    if (!found) throw new Error('未找到本机 ComfyUI');
    saveCfg({ ...cfg, comfyUrl: found.baseUrl });
    const urlInput = $('#comfyUrl');
    if (urlInput) urlInput.value = found.baseUrl;
    if (status) status.textContent = found.info;
  } catch (error) {
    if (status) status.textContent = error.message;
  }
}

function pickRandom(list) {
  return list[Math.floor(Math.random() * list.length)];
}

async function randomRecipe() {
  const results = await Promise.all(SLOTS.map(async slot => {
    const res = await fetch(slot.data);
    if (!res.ok) throw new Error('读取图库失败');
    let items = await res.json();
    if (ATLAS.isSafeMode()) {
      if (slot.key === 'pose') items = items.filter(item => !ATLAS.isNsfwPose(item));
      if (slot.key === 'costume') items = items.filter(item => !ATLAS.isNsfwCostume(item));
    }
    return [slot.key, pickRandom(items)];
  }));
  const next = {};
  results.forEach(([key, item]) => { next[key] = item; });
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
  button.textContent = busy ? '正在合成' : '开始合成';
  const progress = $('#resultProgress');
  progress.hidden = !busy;
  progress.textContent = message || '正在合成…';
}

function showError(message) {
  const error = $('#resultError');
  error.hidden = !message;
  error.textContent = message || '';
}

async function runGenerate() {
  const cfg = loadCfg();
  const current = recipe();
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
    showError(error.message || '合成失败');
  } finally {
    setBusy(false);
  }
}

function bind() {
  renderSlots();
  renderStyle();
  renderProvider();
  syncPrompt(true);

  $('#studioSlots').addEventListener('click', event => {
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
      setSlot(kind, {
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
  $('#randomRecipe').addEventListener('click', () => randomRecipe().catch(error => showError(error.message)));
  $('#clearRecipe').addEventListener('click', clearRecipe);
  $('#runGenerate').addEventListener('click', runGenerate);

  window.addEventListener('pose-atlas-recipe', () => {
    renderSlots();
    syncPrompt();
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

  if (loadCfg().provider === 'comfyui') detectComfy();
}

bind();
})();

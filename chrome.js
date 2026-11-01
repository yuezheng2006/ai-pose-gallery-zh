(() => {
'use strict';
const ASSET_BASE = 'https://pose-images.cyber101.cc/';
const SAFE_KEY = 'pose_atlas_safe_mode_v1';
const RECIPE_KEY = 'pose_atlas_recipe_v3';
const NSFW_POSE = new Set(['全身单人・性感系', '双人缠绵']);
const NSFW_COSTUME = new Set(['内衣・睡衣', '性感穿搭']);

function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || String(path).startsWith('data:')) return path;
  return ASSET_BASE + String(path).replace(/^\//, '');
}

function isSafeMode() {
  return localStorage.getItem(SAFE_KEY) !== 'false';
}

function readRecipe() {
  try {
    return JSON.parse(localStorage.getItem(RECIPE_KEY) || '{}') || {};
  } catch {
    return {};
  }
}

function writeRecipe(recipe) {
  localStorage.setItem(RECIPE_KEY, JSON.stringify(recipe));
  window.dispatchEvent(new CustomEvent('pose-atlas-recipe', { detail: recipe }));
}

const api = {
  ASSET_BASE,
  assetUrl,
  isSafeMode,
  isNsfwPose(item) { return NSFW_POSE.has(item?.体系 || item?.system); },
  isNsfwCostume(item) { return NSFW_COSTUME.has(item?.分类); },
  getRecipe: readRecipe,
  setRecipe: writeRecipe,
  addToRecipe(kind, item) {
    const recipe = readRecipe();
    recipe[kind] = {
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
    writeRecipe(recipe);
    toast('已加入合成');
    return recipe;
  }
};

window.POSE_ATLAS = api;

function currentPath() {
  const path = location.pathname;
  return path.endsWith('/') ? path : path + '/';
}

function ensureNav() {
  const nav = document.querySelector('.gallery-nav');
  if (!nav) return;
  const items = [
    ['/', '总览'],
    ['/poses/', '姿势'],
    ['/costumes/', '服装'],
    ['/portraits/', '人像'],
    ['/studio/', '合成']
  ];
  const here = currentPath();
  nav.innerHTML = items.map(([href, label]) => {
    const current = here === href || (href !== '/' && here.startsWith(href));
    return `<a href="${href}"${current ? ' aria-current="page"' : ''}>${label}</a>`;
  }).join('');
}

function ensureSafeToggle() {
  const actions = document.querySelector('.top-actions');
  if (!actions || actions.querySelector('#safeModeBtn')) return;
  const button = document.createElement('button');
  button.id = 'safeModeBtn';
  button.type = 'button';
  button.className = 'action-btn';
  actions.prepend(button);
  syncSafeButton();
  button.addEventListener('click', () => {
    if (isSafeMode()) confirmUnlock();
    else setSafe(true);
  });
}

function syncSafeButton() {
  const button = document.querySelector('#safeModeBtn');
  if (!button) return;
  const on = isSafeMode();
  button.textContent = on ? '安全模式' : '完整图库';
  button.setAttribute('aria-pressed', String(on));
  button.title = on ? '已隐藏成人向分类，点击关闭' : '正在显示完整图库，点击开启安全模式';
}

function setSafe(on) {
  localStorage.setItem(SAFE_KEY, String(on));
  syncSafeButton();
  window.dispatchEvent(new CustomEvent('pose-atlas-safe-mode', { detail: on }));
}

function confirmUnlock() {
  let dialog = document.getElementById('safeModeDialog');
  if (!dialog) {
    dialog = document.createElement('dialog');
    dialog.id = 'safeModeDialog';
    dialog.className = 'info-dialog';
    dialog.innerHTML = `<div class="info-head"><h2>关闭安全模式</h2><button class="info-close" type="button" aria-label="关闭">×</button></div>
      <div class="info-content">
        <p>关闭后将显示成人向姿势与内衣/性感穿搭分类。未满 18 周岁请不要关闭。</p>
        <p>素材仅供绘画与动作参考，禁止用于违法用途或未经授权的真人换脸。</p>
        <div class="safe-dialog-actions">
          <button type="button" class="open-btn" data-keep>保持安全模式</button>
          <button type="button" class="download-btn" data-unlock>我已满 18 岁，关闭</button>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    dialog.querySelector('.info-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.querySelector('[data-keep]').addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-unlock]').addEventListener('click', () => {
      setSafe(false);
      dialog.close();
    });
  }
  dialog.showModal();
}

function recipeCount() {
  const recipe = readRecipe();
  return ['portrait', 'costume', 'pose'].filter(key => recipe[key]).length;
}

function updateRecipeBadge() {
  const link = document.querySelector('.gallery-nav a[href="/studio/"]');
  if (!link) return;
  let badge = link.querySelector('.nav-count');
  if (!badge) {
    badge = document.createElement('span');
    badge.className = 'nav-count';
    link.appendChild(badge);
  }
  const count = recipeCount();
  badge.textContent = count ? String(count) : '';
  badge.hidden = !count;
}

function toast(message) {
  let el = document.getElementById('atlasToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'atlasToast';
    el.className = 'atlas-toast';
    el.hidden = true;
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.hidden = false;
  clearTimeout(el._timer);
  el._timer = setTimeout(() => { el.hidden = true; }, 1800);
}

window.addEventListener('pose-atlas-recipe', updateRecipeBadge);

ensureNav();
ensureSafeToggle();
updateRecipeBadge();
})();

(() => {
'use strict';
const PAGE = window.GALLERY_PAGE;
if (!PAGE) return;

const PAGE_SIZE = 96;
const ASSET_BASE = 'https://pose-images.cyber101.cc/';
const assetUrl = path => {
  if (!path) return path;
  if (/^https?:\/\//i.test(path)) return path;
  return ASSET_BASE + String(path).replace(/^\//, '');
};
const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const format = value => Number(value).toLocaleString('zh-CN');
const searchIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m20 20-4.2-4.2"/></svg>';
const expandIcon = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M8 3H3v5m13-5h5v5M8 21H3v-5m13 5h5v-5"/></svg>';

const state = { tab: '', hair: '', pick: '', query: '', shown: PAGE_SIZE };
let DATA = [];
let TABS = [];
let currentList = [];
let renderedCount = 0;
const viewerState = { index: 0, token: 0, returnFocus: null };

function prepareData(data) {
  DATA = data.map(item => {
    const copy = { ...item };
    copy._search = String(item.检索 || [item.id, item.服装名称, item.标题, item.发型名称, item.分类, item.分区, item.发长, (item.标签 || []).join(' '), item.关键词].filter(Boolean).join(' ')).toLowerCase();
    return copy;
  });
  TABS = PAGE.tabs || [...new Set(DATA.map(item => item[PAGE.tabField]).filter(Boolean))];
  if (PAGE.kind === 'portrait') {
    const featured = DATA.filter(item => item.精选).length;
    const hot = DATA.filter(item => item.热门).length;
    $('#statFeatured').textContent = format(featured);
    $('#statHot').textContent = format(hot);
  }
  $('#statTotal').textContent = format(visibleData().length);
  renderTabs();
  renderHairFilter();
  render();
}

function renderTabs() {
  const source = visibleData();
  const tabs = (PAGE.tabs || [...new Set(source.map(item => item[PAGE.tabField]).filter(Boolean))])
    .filter(tab => source.some(item => item[PAGE.tabField] === tab));
  const shown = [['', PAGE.allLabel, source.length], ...tabs.map(tab => [tab, tab, source.filter(item => item[PAGE.tabField] === tab).length])];
  $('#lineTabs').innerHTML = shown.map(([value, label, count]) => `<button class="line-tab" type="button" role="tab" data-tab="${esc(value)}" aria-selected="${state.tab === value}"><span class="tab-name">${esc(label)}</span><span class="tab-count">${format(count)} ${esc(PAGE.unit)}</span></button>`).join('');
}

function renderHairFilter() {
  const hair = $('#hairFilter');
  if (!hair) return;
  const values = ['', ...PAGE.hairOptions];
  hair.innerHTML = values.map(value => `<button type="button" data-hair="${esc(value)}" aria-pressed="${state.hair === value}">${value || '全部发长'}</button>`).join('');
}

function visibleData() {
  const atlas = window.POSE_ATLAS;
  if (!atlas || !atlas.isSafeMode()) return DATA;
  if (PAGE.kind === 'costume') return DATA.filter(item => !atlas.isNsfwCostume(item));
  return DATA;
}

function hit(item) {
  const atlas = window.POSE_ATLAS;
  if (atlas && atlas.isSafeMode() && PAGE.kind === 'costume' && atlas.isNsfwCostume(item)) return false;
  if (state.tab && item[PAGE.tabField] !== state.tab) return false;
  if (state.hair && item.发长 !== state.hair) return false;
  if (state.pick === 'featured' && !item.精选) return false;
  if (state.pick === 'hot' && !item.热门) return false;
  if (state.query && !item._search.includes(state.query)) return false;
  return true;
}

function cardTags(item) {
  const tags = item.标签 || [];
  if (!tags.length) return '';
  const shown = tags.slice(0, 4).map(tag => `<span>${esc(tag)}</span>`).join('');
  const more = tags.length > 4 ? `<span>+${tags.length - 4}</span>` : '';
  return `<div class="card-tags">${shown}${more}</div>`;
}

function card(item, index) {
  const title = item[PAGE.titleField] || item.id;
  const badge = PAGE.kind === 'portrait' ? (item.发长 || '') : (item.分类 || '');
  const meta = PAGE.kind === 'portrait'
    ? `<span class="system">${esc(item.分区 || '')}</span><span class="meta-dot">·</span><span class="category">${esc(item.发型名称 || item.发长 || '')}</span>`
    : `<span class="system">${esc(item.分类 || '')}</span>`;
  const flags = [
    item.精选 ? '<span class="flag">精选</span>' : '',
    item.热门 ? '<span class="flag hot">热门</span>' : ''
  ].join('');
  return `<article class="pose-card simple-card" tabindex="0" data-index="${index}" aria-label="${esc(title)}"><div class="card-image"><img class="main-image" src="${esc(assetUrl(item.缩略图))}" alt="${esc(title)}" loading="lazy" decoding="async"><div class="image-top"><span class="pose-no">${esc(item.id)}</span>${badge ? `<span class="angle-tag">${esc(badge)}</span>` : ''}</div><span class="zoom-hint">${expandIcon}</span></div><div class="card-body"><h3>${esc(title)}</h3><div class="card-meta">${meta}${flags}</div>${cardTags(item)}</div></article>`;
}

function syncControls() {
  document.querySelectorAll('.line-tab').forEach(button => button.setAttribute('aria-selected', button.dataset.tab === state.tab));
  document.querySelectorAll('#hairFilter button').forEach(button => button.setAttribute('aria-pressed', button.dataset.hair === state.hair));
  document.querySelectorAll('#pickFilter button').forEach(button => button.setAttribute('aria-pressed', button.dataset.pick === state.pick));
  $('#searchClear').hidden = !state.query;
  const count = [state.hair, state.pick].filter(Boolean).length;
  const badge = $('#filterBadge');
  if (badge) badge.textContent = count || '';
}

function renderActiveFilters() {
  const filters = [];
  if (state.tab) filters.push(['tab', `${PAGE.tabField}：${state.tab}`]);
  if (state.hair) filters.push(['hair', `发长：${state.hair}`]);
  if (state.pick === 'featured') filters.push(['pick', '精选']);
  if (state.pick === 'hot') filters.push(['pick', '热门']);
  if (state.query) filters.push(['query', `搜索：${state.query}`]);
  $('#activeFilters').innerHTML = filters.map(([key, label]) => `<button class="filter-chip" type="button" data-clear="${key}">${esc(label)}</button>`).join('');
}

function render(append = false) {
  const grid = $('#grid');
  if (!append) {
    currentList = DATA.filter(hit);
    renderedCount = 0;
    grid.innerHTML = '';
  }
  const total = currentList.length;
  const visible = currentList.slice(renderedCount, state.shown);
  grid.insertAdjacentHTML('beforeend', visible.map((item, offset) => card(item, renderedCount + offset)).join(''));
  renderedCount += visible.length;
  $('#resultCount').textContent = `${format(total)} ${PAGE.unit}`;
  $('#visibleCount').textContent = total > state.shown ? `已显示 ${format(renderedCount)} / ${format(total)}` : `共 ${format(total)} ${PAGE.unit}`;
  if (!total) {
    grid.innerHTML = `<div class="empty"><div class="empty-icon">${searchIcon}</div><h3>${esc(PAGE.emptyTitle)}</h3><p>试试更换关键词或减少筛选条件。</p><button type="button" id="emptyReset">清除全部筛选</button></div>`;
  }
  const more = $('#loadMore');
  more.hidden = renderedCount >= total || !total;
  more.textContent = `加载更多（剩余 ${format(Math.max(total - renderedCount, 0))}）`;
  syncControls();
  renderActiveFilters();
}

function resetView() {
  state.shown = PAGE_SIZE;
  render();
}

function resetAll() {
  state.tab = '';
  state.hair = '';
  state.pick = '';
  state.query = '';
  $('#searchInput').value = '';
  renderTabs();
  renderHairFilter();
  resetView();
}

$('#lineTabs').addEventListener('click', event => {
  const button = event.target.closest('.line-tab');
  if (!button || button.dataset.tab === state.tab) return;
  state.tab = button.dataset.tab;
  resetView();
});

const hairFilter = $('#hairFilter');
if (hairFilter) {
  hairFilter.addEventListener('click', event => {
    const button = event.target.closest('button[data-hair]');
    if (!button) return;
    state.hair = button.dataset.hair;
    resetView();
  });
}

const pickFilter = $('#pickFilter');
if (pickFilter) {
  pickFilter.addEventListener('click', event => {
    const button = event.target.closest('button[data-pick]');
    if (!button) return;
    state.pick = button.dataset.pick;
    resetView();
  });
}

let searchTimer;
$('#searchInput').addEventListener('input', event => {
  $('#searchClear').hidden = !event.target.value;
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    state.query = event.target.value.trim().toLowerCase();
    resetView();
  }, 120);
});
$('#searchClear').addEventListener('click', () => {
  $('#searchInput').value = '';
  state.query = '';
  resetView();
  $('#searchInput').focus();
});

const filterToggle = $('#filterToggle');
if (filterToggle) {
  filterToggle.addEventListener('click', () => {
    const open = $('#filterPanel').classList.toggle('open');
    filterToggle.setAttribute('aria-expanded', String(open));
  });
}

$('#resetFilters')?.addEventListener('click', resetAll);
$('#activeFilters').addEventListener('click', event => {
  const button = event.target.closest('button[data-clear]');
  if (!button) return;
  const key = button.dataset.clear;
  if (key === 'tab') state.tab = '';
  if (key === 'hair') state.hair = '';
  if (key === 'pick') state.pick = '';
  if (key === 'query') { state.query = ''; $('#searchInput').value = ''; }
  renderTabs();
  renderHairFilter();
  resetView();
});

$('#grid').addEventListener('click', event => {
  if (event.target.closest('#emptyReset')) { resetAll(); return; }
  const cardNode = event.target.closest('.pose-card[data-index]');
  if (!cardNode) return;
  openViewer(Number(cardNode.dataset.index));
});
$('#grid').addEventListener('keydown', event => {
  if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('.pose-card[data-index]')) {
    event.preventDefault();
    openViewer(Number(event.target.dataset.index));
  }
});
$('#loadMore').addEventListener('click', () => {
  state.shown = Math.min(state.shown + PAGE_SIZE, currentList.length);
  render(true);
});

function openViewer(index) {
  viewerState.index = index;
  viewerState.returnFocus = document.activeElement;
  $('#viewer').hidden = false;
  document.body.classList.add('viewer-open');
  showViewer();
  $('#viewerClose').focus({ preventScroll: true });
}

function closeViewer() {
  if ($('#viewer').hidden) return;
  viewerState.token++;
  $('#viewer').hidden = true;
  document.body.classList.remove('viewer-open');
  if (viewerState.returnFocus && document.contains(viewerState.returnFocus)) viewerState.returnFocus.focus({ preventScroll: true });
}

function showViewer() {
  const item = currentList[viewerState.index];
  if (!item) return;
  const token = ++viewerState.token;
  const title = item[PAGE.titleField] || item.id;
  const image = $('#viewerImage');
  image.src = assetUrl(item.缩略图);
  image.alt = title;
  image.classList.add('is-loading');
  $('#imageStatus').textContent = '正在加载原图…';
  $('#imageStatus').hidden = false;
  const full = new Image();
  full.decoding = 'async';
  full.onload = () => {
    if (token !== viewerState.token) return;
    image.src = assetUrl(item.原图);
    image.classList.remove('is-loading');
    $('#imageStatus').hidden = true;
  };
  full.onerror = () => {
    if (token !== viewerState.token) return;
    image.classList.remove('is-loading');
    $('#imageStatus').textContent = '原图加载失败，可点击新窗口重试';
    $('#imageStatus').hidden = false;
  };
  full.src = assetUrl(item.原图);

  $('#viewerNumber').textContent = PAGE.kind === 'costume' ? '服装' : '人像';
  $('#viewerPosition').textContent = `${viewerState.index + 1} / ${currentList.length}`;
  $('#viewerTitle').textContent = title;
  $('#viewerId').textContent = item.id;
  $('#copyId').textContent = '复制 ID';
  const rows = PAGE.meta(item);
  $('#viewerMeta').innerHTML = rows.map(([key, value]) => `<dt>${esc(key)}</dt><dd>${esc(value || '—')}</dd>`).join('');
  const tags = item.标签 || [];
  const tagBox = $('#viewerTags');
  if (tagBox) {
    tagBox.hidden = !tags.length;
    tagBox.innerHTML = tags.length ? `<h3 class="side-section-title">标签</h3><div class="card-tags large">${tags.map(tag => `<span>${esc(tag)}</span>`).join('')}</div>` : '';
  }
  const download = $('#downloadImage');
  const ext = (item.原图 || '').split('.').pop() || 'webp';
  download.href = assetUrl(item.原图);
  download.setAttribute('download', `${item.id}.${ext}`);
  $('#openImage').href = assetUrl(item.原图);
  const add = $('#addToRecipe');
  if (add) add.textContent = '加入合成';
}

function stepItem(direction) {
  const next = viewerState.index + direction;
  if (next < 0 || next >= currentList.length) return;
  viewerState.index = next;
  showViewer();
}

$('#viewerClose').addEventListener('click', closeViewer);
$('#viewer').addEventListener('click', event => { if (event.target === $('#viewer')) closeViewer(); });
$('#anglePrev').addEventListener('click', () => stepItem(-1));
$('#angleNext').addEventListener('click', () => stepItem(1));
$('#copyId').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentList[viewerState.index].id);
    $('#copyId').textContent = '已复制';
  } catch {
    $('#copyId').textContent = '请手动复制';
  }
});
$('#addToRecipe')?.addEventListener('click', () => {
  const item = currentList[viewerState.index];
  const atlas = window.POSE_ATLAS;
  if (!item || !atlas) return;
  atlas.addToRecipe(PAGE.kind, item);
  $('#addToRecipe').textContent = '已加入';
});
window.addEventListener('pose-atlas-safe-mode', () => {
  if (PAGE.kind === 'costume' && state.tab && window.POSE_ATLAS?.isNsfwCostume({ 分类: state.tab })) state.tab = '';
  $('#statTotal').textContent = format(visibleData().length);
  renderTabs();
  resetView();
});

let touchStart = null;
$('#viewerStage').addEventListener('touchstart', event => {
  const touch = event.touches[0];
  touchStart = { x: touch.clientX, y: touch.clientY };
}, { passive: true });
$('#viewerStage').addEventListener('touchend', event => {
  if (!touchStart) return;
  const touch = event.changedTouches[0];
  const dx = touch.clientX - touchStart.x;
  const dy = touch.clientY - touchStart.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) stepItem(dx < 0 ? 1 : -1);
  touchStart = null;
}, { passive: true });

document.addEventListener('keydown', event => {
  if (!$('#viewer').hidden) {
    if (event.key === 'Escape') closeViewer();
    else if (event.key === 'ArrowRight' || event.key === 'ArrowDown') { event.preventDefault(); stepItem(1); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') { event.preventDefault(); stepItem(-1); }
    return;
  }
  if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    $('#searchInput').focus();
  }
});

document.querySelectorAll('[data-info]').forEach(button => {
  button.addEventListener('click', () => {
    const info = PAGE.info[button.dataset.info];
    $('#infoTitle').textContent = info.title;
    $('#infoContent').innerHTML = info.html;
    $('#infoDialog').showModal();
  });
});
$('#infoClose').addEventListener('click', () => $('#infoDialog').close());
$('#infoDialog').addEventListener('click', event => { if (event.target === $('#infoDialog')) $('#infoDialog').close(); });

fetch(PAGE.dataUrl)
  .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
  .then(prepareData)
  .catch(error => {
    console.error(error);
    $('#resultCount').textContent = '图库加载失败';
    $('#grid').innerHTML = `<div class="empty"><h3>无法读取${esc(PAGE.unit)}数据</h3><p>请确认通过 HTTP 访问，并检查数据文件是否存在。</p><button type="button" onclick="location.reload()">重新加载</button></div>`;
  });
})();

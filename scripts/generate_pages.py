#!/usr/bin/env python3
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://ai-pose.cyber101.cc"
ASSET = "https://pose-images.cyber101.cc"
ICON = (
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E"
    "%3Crect width='32' height='32' rx='8' fill='%235b5bd6'/%3E%3Ccircle cx='16' cy='9' r='3.2' fill='white'/%3E"
    "%3Cpath d='M16 13.5c-2.5 0-4 1.6-4 3.8v3.8h2v7h4v-7h2v-3.8c0-2.2-1.5-3.8-4-3.8z' fill='white'/%3E%3C/svg%3E"
)

NAV = {
    "/": "总览",
    "/poses/": "姿势",
    "/costumes/": "服装",
    "/portraits/": "人像",
    "/studio/": "合成",
}

BRAND = """    <a class="brand" href="/" aria-label="返回参考库首页">
      <span class="brand-mark"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="5" r="2.4"/><path d="M12 8v6m0-3-4 2m4-2 4 2m-4 2-3 6m3-6 3 6"/></svg></span>
      <span class="brand-copy"><strong>POSE Atlas</strong><span>Reference Library</span></span>
    </a>"""

ACTIONS = """    <nav class="top-actions" aria-label="帮助">
      <button class="action-btn" type="button" data-info="guide"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.4 2.4 0 0 1 4.6 1c0 1.8-2.3 2-2.3 3.6M12 17h.01"/></svg><span class="action-text">使用指南</span></button>
      <button class="action-btn" type="button" data-info="notice"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5m0 3h.01"/></svg><span class="action-text">注意事项</span></button>
    </nav>"""

FOOTER = """<footer class="site-footer">
  <div class="shell footer-inner">
    <div class="footer-copy">
      <p><strong>POSE Atlas 中文版</strong> · 图片与原始数据版权归原作者ギア所有</p>
      <p>姿势、服装、人像均为 AI 生成参考素材。使用前请阅读注意事项；图片数据的再分发、转载与再售以原作者条款为准。</p>
    </div>
  </div>
</footer>"""

DIALOG = """<dialog class="info-dialog" id="infoDialog">
  <div class="info-head"><h2 id="infoTitle">使用指南</h2><button class="info-close" id="infoClose" type="button" aria-label="关闭"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>
  <div class="info-content" id="infoContent"></div>
</dialog>"""

VIEWER = """<div class="viewer" id="viewer" role="dialog" aria-modal="true" aria-labelledby="viewerTitle" hidden>
  <section class="viewer-panel">
    <button class="viewer-close" id="viewerClose" type="button" aria-label="关闭大图"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
    <div class="viewer-stage" id="viewerStage">
      <img class="viewer-image" id="viewerImage" alt="" draggable="false">
      <span class="image-status" id="imageStatus" hidden>正在加载原图…</span>
      <button class="viewer-nav prev" id="anglePrev" type="button" aria-label="上一张"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m15 5-7 7 7 7"/></svg></button>
      <button class="viewer-nav next" id="angleNext" type="button" aria-label="下一张"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m9 5 7 7-7 7"/></svg></button>
    </div>
    <aside class="viewer-side">
      <div class="viewer-heading">
        <div class="viewer-eyebrow"><span id="viewerNumber">ITEM</span><span class="viewer-position" id="viewerPosition"></span></div>
        <h2 id="viewerTitle">详情</h2>
        <div class="id-row"><code class="viewer-id" id="viewerId"></code><button class="copy-btn" id="copyId" type="button">复制 ID</button></div>
      </div>
      <div id="viewerTags"></div>
      <div class="download-stack">
        <a class="download-btn" id="downloadImage" href="#" download><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg>下载原图</a>
        <a class="open-btn" id="openImage" href="#" target="_blank" rel="noopener noreferrer"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M14 4h6v6m0-6-9 9M19 14v6H4V5h6"/></svg>新窗口打开</a>
      </div>
      <dl class="metadata" id="viewerMeta"></dl>
      <div class="keyboard-help"><kbd>←</kbd> <kbd>→</kbd> 切换条目<br><kbd>Esc</kbd> 关闭 · 手机可左右滑动</div>
    </aside>
  </section>
</div>"""

ANALYTICS = '<script defer src="https://u.authbox.cn/script.js" data-website-id="cde8a23b-4bf6-4ded-8cd9-2c9551dc8d38"></script>'


def nav(current: str) -> str:
    links = []
    for href, label in NAV.items():
        current_attr = ' aria-current="page"' if href == current else ""
        links.append(f'      <a href="{href}"{current_attr}>{label}</a>')
    return '<nav class="gallery-nav" aria-label="图库入口">\n' + "\n".join(links) + "\n    </nav>"


def head(title, desc, path, keywords, page_name, about):
    url = HOST + path
    return f"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="light">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="keywords" content="{keywords}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="application-name" content="POSE Atlas">
<meta name="theme-color" content="#f5f7fb">
<link rel="canonical" href="{url}">
<link rel="sitemap" type="application/xml" href="/sitemap.xml">
<link rel="alternate" hreflang="zh-CN" href="{url}">
<meta property="og:type" content="website">
<meta property="og:locale" content="zh_CN">
<meta property="og:site_name" content="POSE Atlas">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{url}">
<meta property="og:image" content="{ASSET}/og-cover.jpg">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{desc}">
<meta name="twitter:image" content="{ASSET}/og-cover.jpg">
<link rel="icon" href="{ICON}">
<link rel="stylesheet" href="/site.css">
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@graph": [
    {{
      "@type": "WebSite",
      "@id": "{HOST}/#website",
      "url": "{HOST}/",
      "name": "POSE Atlas",
      "alternateName": "AI 角色参考库",
      "description": "姿势、服装、人像三合一 AI 绘画参考库。",
      "inLanguage": "zh-CN"
    }},
    {{
      "@type": "ImageGallery",
      "@id": "{url}#webpage",
      "url": "{url}",
      "name": "{page_name}",
      "description": "{desc}",
      "isPartOf": {{ "@id": "{HOST}/#website" }},
      "inLanguage": "zh-CN",
      "about": {{ "@type": "Thing", "name": "{about}" }}
    }}
  ]
}}
</script>
</head>
<body>"""


def write_css():
    html = (ROOT / "index.html").read_text()
    start = html.index("<style>") + len("<style>\n")
    end = html.index("</style>")
    extra = (ROOT / "site-extra.css").read_text()
    (ROOT / "site.css").write_text(html[start:end].rstrip() + "\n" + extra)
    print("wrote site.css")


def write_poses():
    html = (ROOT / "index.html").read_text()
    html = re.sub(r"<style>.*?</style>", '<link rel="stylesheet" href="/site.css">', html, count=1, flags=re.S)
    html = html.replace(f'{HOST}/"', f'{HOST}/poses/"')
    html = html.replace(f"{HOST}/<", f"{HOST}/poses/<")
    html = html.replace(f"{HOST}/#webpage", f"{HOST}/poses/#webpage")
    html = html.replace('href="./"', 'href="/"')
    html = html.replace('aria-label="返回姿势参考库首页"', 'aria-label="返回参考库首页"')
    html = html.replace(
        '    <nav class="top-actions" aria-label="帮助与来源">',
        nav("/poses/") + '\n    <nav class="top-actions" aria-label="帮助">',
    )
    html = re.sub(
        r'\s*<a class="action-btn author" href="https://github.com/anhao/ai-pose-gallery-zh".*?</a>\n'
        r'\s*<a class="action-btn author" href="https://x.com/anhao_ai".*?</a>\n',
        "\n",
        html,
        count=1,
        flags=re.S,
    )
    html = re.sub(r'\s*<meta name="twitter:site"[^>]*>\n\s*<meta name="twitter:creator"[^>]*>\n', "", html, count=1)
    html = re.sub(r'\s*<meta name="author"[^>]*>\n', "", html, count=1)
    html = html.replace(
        "      <p><strong>POSE Atlas 中文版</strong> · 图片与原始数据版权归原作者ギア所有 · 中文版由 Anhao 整理维护</p>\n"
        '      <p>来源：<a href="https://ai-pose-gallery.pages.dev/" target="_blank" rel="noopener noreferrer">ai-pose-gallery.pages.dev</a> · 使用图片前请阅读注意事项，图片数据的再分发、转载与再售以原作者条款为准。</p>',
        "      <p><strong>POSE Atlas 中文版</strong> · 图片与原始数据版权归原作者ギア所有</p>\n"
        "      <p>姿势、服装、人像均为 AI 生成参考素材。使用前请阅读注意事项；图片数据的再分发、转载与再售以原作者条款为准。</p>",
    )
    html = re.sub(r'\s*<div class="footer-links">.*?</div>\n', "\n", html, count=1, flags=re.S)
    html = html.replace("fetch('data/pose-zh.json')", "fetch('/data/pose-zh.json')")
    dest = ROOT / "poses" / "index.html"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(html)
    print("wrote poses/index.html")


def gallery_page(kind):
    if kind == "costume":
        path = "/costumes/"
        title = "AI 服装参考库｜1407 套无人穿搭"
        desc = "按春夏秋冬、内衣睡衣、泳装与礼服筛选 1407 套 AI 服装参考，适合角色换装与穿搭提示词。"
        keywords = "AI 服装,穿搭参考,换装,服装图库,角色服装"
        page_name = "AI 服装参考库"
        about = "服装穿搭参考"
        h1 = "AI 服装参考库"
        tagline = "找到你想要的一套衣服"
        hero = "无人着装的整身穿搭参考，按季节与风格筛选，适合直接作为角色换装参考。"
        stats = """      <div class="stat"><strong id="statTotal">1,407</strong><span>套服装</span></div>
      <div class="stat"><strong>8</strong><span>个分类</span></div>
      <div class="stat"><strong>86</strong><span>个标签</span></div>"""
        search = "搜索服装名、标签、编号或英文关键词"
        hint = "点击卡片查看原图与标签"
        heading = "服装图库列表"
        unit = "套"
        filter_panel = ""
        config = """window.GALLERY_PAGE = {
  kind: 'costume',
  dataUrl: '/data/costume-zh.json',
  tabField: '分类',
  allLabel: '全部',
  titleField: '服装名称',
  unit: '套',
  emptyTitle: '没有找到匹配的服装',
  tabs: ['春季穿搭','夏季穿搭','秋季穿搭','冬季穿搭','内衣・睡衣','性感穿搭','泳装・度假','派对・礼服'],
  meta: item => [['分类', item.分类], ['英文关键词', item.关键词], ['标签数', String((item.标签 || []).length)]],
  info: {
    guide: { title: '使用指南', html: '<ul><li>服装图多为<strong>无人体穿搭</strong>，适合直接作为角色换装参考。</li><li>按季节/风格页签筛选，或搜索单品、颜色、英文关键词。</li><li>点击卡片查看原图，可复制 ID、下载或新窗口打开。</li></ul>' },
    notice: { title: '注意事项', html: '<ul><li>图片为 AI 生成的虚构服装参考，并非真实品牌商品图。</li><li><strong>禁止对图片数据本身进行再分发、转载或转售。</strong></li><li>图库含内衣与性感穿搭分类，未成年人请勿访问。</li></ul>' }
  }
};"""
    else:
        path = "/portraits/"
        title = "AI 人像参考库｜1499 张人像"
        desc = "正脸参考与造型氛围共 1499 张 AI 人像，可按发长、精选与热门筛选，适合固定角色脸与造型。"
        keywords = "AI 人像,脸部参考,发型参考,角色脸,人像图库"
        page_name = "AI 人像参考库"
        about = "人像参考"
        h1 = "AI 人像参考库"
        tagline = "找到你想要的一张脸"
        hero = "正脸参考适合固定角色脸，造型氛围适合扩展气质与发型。按分区、发长、精选或热门筛选。"
        stats = """      <div class="stat"><strong id="statTotal">1,499</strong><span>张人像</span></div>
      <div class="stat"><strong id="statFeatured">0</strong><span>精选</span></div>
      <div class="stat"><strong id="statHot">0</strong><span>热门</span></div>"""
        search = "搜索发型、分区、编号或标题"
        hint = "点击卡片查看原图"
        heading = "人像图库列表"
        unit = "张"
        filter_panel = """    <div class="filter-panel simple-filters" id="filterPanel">
      <div class="filter-field">
        <span class="filter-label">发长</span>
        <div class="segmented" id="hairFilter" role="group" aria-label="按发长筛选"></div>
      </div>
      <div class="filter-field">
        <span class="filter-label">榜单</span>
        <div class="segmented" id="pickFilter" role="group" aria-label="按精选或热门筛选">
          <button type="button" data-pick="" aria-pressed="true">全部</button>
          <button type="button" data-pick="featured" aria-pressed="false">精选</button>
          <button type="button" data-pick="hot" aria-pressed="false">热门</button>
        </div>
      </div>
      <button class="reset-btn" id="resetFilters" type="button">重置筛选</button>
    </div>"""
        config = """window.GALLERY_PAGE = {
  kind: 'portrait',
  dataUrl: '/data/portrait-zh.json',
  tabField: '分区',
  allLabel: '全部',
  titleField: '标题',
  unit: '张',
  emptyTitle: '没有找到匹配的人像',
  hairOptions: ['短发','中发','中长发','长发'],
  meta: item => [['分区', item.分区], ['发长', item.发长], ['发型', item.发型名称], ['尺寸', item.宽 && item.高 ? (item.宽 + ' × ' + item.高) : '—']],
  info: {
    guide: { title: '使用指南', html: '<ul><li>正脸参考适合固定角色脸；造型氛围适合发丝、服装气质与整体感觉。</li><li>可按发长、精选、热门筛选，或搜索发型名称。</li><li>同一张正脸反复作为参考，更容易保持生成结果中的脸一致。</li></ul>' },
    notice: { title: '注意事项', html: '<ul><li>人像均为 AI 生成的虚构角色，不是真实人物照片。</li><li><strong>禁止对图片数据本身进行再分发、转载或转售。</strong></li><li>请勿用于冒充真人、未成年人相关用途或违法用途。</li></ul>' }
  }
};"""

    filter_toggle = (
        ""
        if kind == "costume"
        else """      <button class="filter-toggle" id="filterToggle" type="button" aria-expanded="false" aria-controls="filterPanel"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 6h16M7 12h10m-7 6h4"/></svg>筛选<span class="filter-badge" id="filterBadge"></span></button>
"""
    )
    html = f"""{head(title, desc, path, keywords, page_name, about)}
<header class="site-header">
  <div class="shell topbar">
{BRAND}
{nav(path)}
{ACTIONS}
  </div>
  <div class="shell hero">
    <div>
      <p class="eyebrow">AI CHARACTER REFERENCE · 中文版图库</p>
      <h1>{h1}<span class="hero-tagline">{tagline}</span></h1>
      <p class="hero-desc">{hero}</p>
    </div>
    <div class="hero-stats" aria-label="图库统计">
{stats}
    </div>
  </div>
</header>
<section class="controls" aria-label="图库筛选">
  <div class="shell controls-inner">
    <div class="line-tabs" id="lineTabs" role="tablist" aria-label="分类"></div>
    <div class="search-row">
      <label class="search-box">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m20 20-4.2-4.2"/></svg>
        <input id="searchInput" type="search" placeholder="{search}" autocomplete="off" aria-label="搜索">
        <button class="search-clear" id="searchClear" type="button" aria-label="清空搜索" hidden><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="m6 6 12 12M18 6 6 18"/></svg></button>
        <span class="search-key" aria-hidden="true">/</span>
      </label>
{filter_toggle}    </div>
{filter_panel}  </div>
</section>
<main class="shell">
  <h2 class="sr-only">{heading}</h2>
  <div class="result-head">
    <div class="result-summary"><strong id="resultCount">正在加载图库…</strong><span id="visibleCount"></span></div>
    <div class="result-hint"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><circle cx="12" cy="12" r="3"/></svg>{hint}</div>
  </div>
  <div class="active-filters" id="activeFilters" aria-label="当前筛选条件"></div>
  <div class="grid" id="grid" aria-live="polite">
    <div class="pose-card skeleton"><div class="card-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
    <div class="pose-card skeleton"><div class="card-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
    <div class="pose-card skeleton"><div class="card-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
    <div class="pose-card skeleton"><div class="card-image"></div><div class="skeleton-line"></div><div class="skeleton-line short"></div></div>
  </div>
  <button class="load-more" id="loadMore" type="button" hidden>加载更多</button>
</main>
{FOOTER}
{VIEWER}
{DIALOG}
<script>
{config}
</script>
<script src="/gallery-simple.js"></script>
{ANALYTICS}
</body>
</html>
"""
    dest = ROOT / kind.replace("costume", "costumes").replace("portrait", "portraits") / "index.html"
    dest.parent.mkdir(exist_ok=True)
    dest.write_text(html)
    print("wrote", dest.relative_to(ROOT))


HUB_INFO = """
<script>
const INFO = {
  guide: {
    title: '使用指南',
    html: '<ul><li>从总览进入<strong>姿势、服装、人像</strong>三个参考库。</li><li>姿势库提供多角度人体素体；服装库是无人穿搭；人像库用于定脸和发型。</li><li>各库支持搜索、分类筛选、大图预览与原图下载。</li></ul>'
  },
  notice: {
    title: '注意事项',
    html: '<ul><li>图片为 AI 生成参考素材，并非真实人物照片。</li><li><strong>禁止对图片数据本身进行再分发、转载或转售。</strong></li><li>部分姿势与服装分类含成人向内容，未成年人请勿访问。</li></ul>'
  }
};
document.querySelectorAll('[data-info]').forEach(button => {
  button.addEventListener('click', () => {
    const info = INFO[button.dataset.info];
    document.getElementById('infoTitle').textContent = info.title;
    document.getElementById('infoContent').innerHTML = info.html;
    document.getElementById('infoDialog').showModal();
  });
});
document.getElementById('infoClose').addEventListener('click', () => document.getElementById('infoDialog').close());
document.getElementById('infoDialog').addEventListener('click', event => { if (event.target === document.getElementById('infoDialog')) document.getElementById('infoDialog').close(); });
</script>
"""


def write_hub():
    html = f"""{head("AI 角色参考库｜姿势 · 服装 · 人像", "姿势 1439 张、服装 1407 套、人像 1499 张，三合一 AI 绘画参考库。", "/", "AI 姿势,AI 服装,AI 人像,角色参考,绘画参考", "AI 角色参考库", "AI 角色参考")}
<header class="site-header">
  <div class="shell topbar">
{BRAND}
{nav("/")}
{ACTIONS}
  </div>
  <div class="shell hero">
    <div>
      <p class="eyebrow">AI CHARACTER REFERENCE · 中文版图库</p>
      <h1>AI 角色参考库<span class="hero-tagline">姿势 · 服装 · 人像</span></h1>
      <p class="hero-desc">从三个参考库挑选动作、穿搭和脸，用于 AI 绘画与角色设定。</p>
    </div>
    <div class="hero-stats" aria-label="图库统计">
      <div class="stat"><strong>1,439</strong><span>张姿势</span></div>
      <div class="stat"><strong>1,407</strong><span>套服装</span></div>
      <div class="stat"><strong>1,499</strong><span>张人像</span></div>
    </div>
  </div>
</header>
<main class="shell hub-main">
  <h2 class="sr-only">图库入口</h2>
  <div class="hub-grid">
    <a class="hub-card" href="/poses/">
      <div class="hub-preview">
        <img src="{ASSET}/thumbs/full_sexy_P001_front.jpg" alt="" width="300" height="400">
        <img src="{ASSET}/thumbs/full_single_P001_front.jpg" alt="" width="300" height="400">
        <img src="{ASSET}/thumbs/upper80v2_P001_front.jpg" alt="" width="300" height="400">
      </div>
      <div class="hub-card-body">
        <h2>姿势参考库</h2>
        <p>288 组人体素体，5 种视角，适合动作与构图参考。</p>
        <span class="hub-card-count">1,439 张 · 进入</span>
      </div>
    </a>
    <a class="hub-card" href="/costumes/">
      <div class="hub-preview">
        <img src="{ASSET}/thumbs/costume/SPR-0001.webp" alt="" width="400" height="500">
        <img src="{ASSET}/thumbs/costume/SUM-0162.webp" alt="" width="400" height="500">
        <img src="{ASSET}/thumbs/costume/WIN-0001.webp" alt="" width="400" height="500">
      </div>
      <div class="hub-card-body">
        <h2>服装参考库</h2>
        <p>无人着装的整身穿搭，按季节与风格筛选，适合角色换装。</p>
        <span class="hub-card-count">1,407 套 · 进入</span>
      </div>
    </a>
    <a class="hub-card" href="/portraits/">
      <div class="hub-preview">
        <img src="{ASSET}/thumbs/portrait/f71f980dde3.webp" alt="" width="400" height="500">
        <img src="{ASSET}/thumbs/portrait/f06fe4f6b36.webp" alt="" width="400" height="500">
        <img src="{ASSET}/thumbs/portrait/f192f568573.webp" alt="" width="400" height="500">
      </div>
      <div class="hub-card-body">
        <h2>人像参考库</h2>
        <p>正脸参考与造型氛围，按发长筛选，适合定脸与发型。</p>
        <span class="hub-card-count">1,499 张 · 进入</span>
      </div>
    </a>
  </div>
</main>
{FOOTER}
{DIALOG}
{HUB_INFO}
{ANALYTICS}
</body>
</html>
"""
    (ROOT / "index.html").write_text(html)
    print("wrote index.html hub")


def main():
    write_css()
    write_poses()
    gallery_page("costume")
    gallery_page("portrait")
    write_hub()


if __name__ == "__main__":
    main()

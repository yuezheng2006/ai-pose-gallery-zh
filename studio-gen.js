(() => {
'use strict';
const ASSET_BASE = 'https://pose-images.cyber101.cc/';
const STYLE_PRESETS = {
  none: { label: '跟随参考图', prompt: '' },
  realistic: { label: '写实人像', prompt: '写实商业摄影质感，85mm 人像镜头，自然光影，真实肌肤与织物细节。' },
  fashion: { label: '杂志画报', prompt: '时尚穿搭杂志画报，干净背景，突出人物与服装剪裁。' },
  film: { label: '胶片写真', prompt: '35mm 胶片质感，轻微颗粒，柔和暖调。' },
  anime: { label: '日系插画', prompt: '日系二次元插画，细腻光影，色彩通透。' },
  ink: { label: '角色设定', prompt: '角色设定集立绘，纯白或浅灰底，全身比例清晰。' }
};

function assetUrl(path) {
  if (!path) return path;
  if (/^https?:\/\//i.test(path) || String(path).startsWith('data:')) return path;
  return ASSET_BASE + String(path).replace(/^\//, '');
}

function buildRecipePrompt(recipe, stylePreset = 'realistic') {
  const styleInfo = STYLE_PRESETS[stylePreset] || STYLE_PRESETS.realistic;
  const clauses = [];
  let idx = 1;
  let costumeIdx = 0;
  if (recipe.portrait) {
    const hair = recipe.portrait.标题 || recipe.portrait.发长 || '';
    clauses.push(`• 人物：图${idx}中的人物，保持脸型、五官、发型（${hair}）和发色一致。`);
    idx += 1;
  }
  if (recipe.costume) {
    costumeIdx = idx;
    clauses.push(`• 服装：让人物穿上图${idx}的整套服装和配饰（${recipe.costume.服装名称 || ''}），颜色、款式、面料以图${idx}为准。`);
    idx += 1;
  }
  if (recipe.pose) {
    const wear = costumeIdx ? `，穿着图${costumeIdx}的服装` : '';
    clauses.push(`• 姿势：按图${idx}人体模型的动作和镜头角度摆姿势（${recipe.pose.姿势名称 || ''}，${recipe.pose.角度 || ''}）；图${idx}只是动作示意${wear}。`);
    idx += 1;
  }
  if (!clauses.length) return '请先选择人像、服装或姿势。';
  const lines = [`请根据提供的 ${clauses.length} 张参考图，生成一张完整人物图像：`, ...clauses];
  if (styleInfo.prompt) lines.push(`• 风格：${styleInfo.prompt}`);
  lines.push('画面中没有任何文字、标志或水印。');
  return lines.join('\n');
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('加载图片失败'));
    img.src = assetUrl(src);
  });
}

async function srcToPngDataUrl(src) {
  if (String(src).startsWith('data:image/')) return src;
  const img = await loadImage(src);
  const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

function dataUrlToBlob(dataUrl) {
  const [head, b64] = dataUrl.split(',');
  const mime = (head.match(/:(.*?);/) || [])[1] || 'image/png';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

async function smartFetch(targetUrl, init, useProxy) {
  try {
    if (!useProxy) return await fetch(targetUrl, init);
    const headers = new Headers(init.headers || {});
    headers.set('x-target-url', targetUrl);
    return await fetch('/api/proxy', { method: init.method || 'POST', headers, body: init.body });
  } catch (error) {
    if (useProxy) throw error;
    throw new Error('无法直连该接口。请确认对方允许浏览器跨域，或改用通义千问 / 豆包走本站代理。');
  }
}

function resolveEndpoint(provider, baseUrl) {
  const base = String(baseUrl || '').replace(/\/+$/, '');
  if (!base) throw new Error('请填写接口地址');
  if (/\/(images\/(generations|edits)|chat\/completions|multimodal-generation\/generation)$/.test(base)) return base;
  if (provider === 'qwen' || /dashscope/i.test(base)) {
    return `${base}/api/v1/services/aigc/multimodal-generation/generation`;
  }
  if (provider === 'doubao' || /volces\.com/i.test(base)) {
    return `${base}/api/v3/images/generations`;
  }
  if (/\/v1$/.test(base)) return `${base}/images/generations`;
  return `${base}/v1/images/generations`;
}

function cloudKind(provider, baseUrl) {
  const base = String(baseUrl || '');
  if (provider === 'qwen' || /dashscope/i.test(base) || /multimodal-generation/.test(base)) return 'qwen';
  if (provider === 'doubao' || /volces\.com/i.test(base) || /\/api\/v3\/images/.test(base)) return 'doubao';
  if (/chat\/completions/.test(base)) return 'chat';
  return 'openai';
}

function extractImage(json) {
  if (json?.data?.[0]?.b64_json) return `data:image/png;base64,${json.data[0].b64_json}`;
  if (json?.data?.[0]?.url) return json.data[0].url;
  const choices = json?.output?.choices?.[0]?.message?.content;
  if (Array.isArray(choices)) {
    for (const part of choices) {
      if (part?.image) return part.image.startsWith('http') || part.image.startsWith('data:') ? part.image : `data:image/png;base64,${part.image}`;
      if (part?.image_url?.url) return part.image_url.url;
    }
  }
  const openaiContent = json?.choices?.[0]?.message?.content;
  if (Array.isArray(openaiContent)) {
    for (const part of openaiContent) {
      if (part?.image_url?.url) return part.image_url.url;
      if (part?.image) return part.image.startsWith('http') || part.image.startsWith('data:') ? part.image : `data:image/png;base64,${part.image}`;
    }
  }
  const text = typeof choices === 'string' ? choices : openaiContent;
  if (typeof text === 'string') {
    const dataMatch = text.match(/data:image\/[a-zA-Z0-9+.-]+;base64,[A-Za-z0-9+/=\s]+/);
    if (dataMatch) return dataMatch[0].replace(/\s+/g, '');
    const urlMatch = text.match(/https?:\/\/\S+\.(?:png|jpe?g|webp)/i);
    if (urlMatch) return urlMatch[0];
  }
  return null;
}

function normalizeComfy(baseUrl) {
  return String(baseUrl || 'http://127.0.0.1:8188').replace(/\/+$/, '');
}

async function comfyFetch(baseUrl, path, init = {}, timeoutMs = 30000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(normalizeComfy(baseUrl) + path, { ...init, signal: ctrl.signal });
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('连接 ComfyUI 超时。请确认已启动，并用 --enable-cors-header "*"。');
    throw new Error('无法连接 ComfyUI。请在本机启动后开启跨域，例如：python main.py --enable-cors-header "*"');
  } finally {
    clearTimeout(timer);
  }
}

async function testComfy(baseUrl) {
  const res = await comfyFetch(baseUrl, '/system_stats', {}, 8000);
  if (!res.ok) throw new Error(`ComfyUI 返回 HTTP ${res.status}`);
  const data = await res.json();
  if (!data?.system) throw new Error('该地址不是 ComfyUI');
  const gpu = data.devices?.[0]?.name ? String(data.devices[0].name) : '本地设备';
  return `ComfyUI ${data.system.comfyui_version || ''} · ${gpu}`;
}

async function detectComfy(current) {
  const candidates = [...new Set([
    normalizeComfy(current),
    'http://127.0.0.1:8188',
    'http://127.0.0.1:8000',
    'http://localhost:8188'
  ])];
  for (const url of candidates) {
    try {
      const info = await testComfy(url);
      return { baseUrl: url, info };
    } catch {
      /* next */
    }
  }
  return null;
}

async function uploadToComfy(baseUrl, src, prefix) {
  const dataUrl = await srcToPngDataUrl(src);
  const form = new FormData();
  form.append('image', dataUrlToBlob(dataUrl), `${prefix}_${Date.now()}.png`);
  form.append('subfolder', 'pose_studio');
  form.append('overwrite', 'true');
  const res = await comfyFetch(baseUrl, '/upload/image', { method: 'POST', body: form }, 60000);
  if (!res.ok) throw new Error(`上传参考图失败（HTTP ${res.status}）`);
  const json = await res.json();
  return json.subfolder ? `${json.subfolder}/${json.name}` : json.name;
}

async function loadWorkflow() {
  const res = await fetch('/workflows/qwen_image_edit_2509_3img.api.json');
  if (!res.ok) throw new Error('无法加载 ComfyUI 工作流');
  return res.json();
}

async function generateWithComfyUi({ recipe, prompt, baseUrl, onProgress }) {
  const report = onProgress || (() => {});
  report({ message: '正在检查 ComfyUI…' });
  await testComfy(baseUrl);
  const workflow = await loadWorkflow();
  const slots = [
    { id: '1', src: recipe.portrait && (recipe.portrait.原图 || recipe.portrait.缩略图), label: '人像' },
    { id: '2', src: recipe.costume && (recipe.costume.预览图 || recipe.costume.原图 || recipe.costume.缩略图), label: '服装' },
    { id: '3', src: recipe.pose && (recipe.pose.原图 || recipe.pose.缩略图), label: '姿势' }
  ];
  const missing = slots.filter(slot => !slot.src);
  if (missing.length) throw new Error(`请先选择：${missing.map(slot => slot.label).join('、')}`);
  for (const slot of slots) {
    report({ message: `正在上传${slot.label}…` });
    workflow[slot.id].inputs.image = await uploadToComfy(baseUrl, slot.src, `studio_${slot.id}`);
  }
  if (workflow['12']?.inputs) workflow['12'].inputs.prompt = prompt;
  const seed = Math.floor(Math.random() * 9e13) + 1e6;
  Object.values(workflow).forEach(node => {
    if (!node?.inputs) return;
    if (typeof node.inputs.seed === 'number') node.inputs.seed = seed;
    if (typeof node.inputs.noise_seed === 'number') node.inputs.noise_seed = seed;
  });
  const clientId = `pose_studio_${Math.random().toString(36).slice(2, 10)}`;
  report({ message: '正在提交工作流…' });
  const promptRes = await comfyFetch(baseUrl, '/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow, client_id: clientId })
  }, 60000);
  const promptJson = await promptRes.json();
  if (!promptRes.ok || !promptJson?.prompt_id) {
    throw new Error(promptJson?.error?.message || `提交失败（HTTP ${promptRes.status}）`);
  }
  const promptId = promptJson.prompt_id;
  const started = Date.now();
  for (;;) {
    if (Date.now() - started > 10 * 60 * 1000) throw new Error('等待 ComfyUI 结果超时');
    await new Promise(resolve => setTimeout(resolve, 1500));
    report({ message: 'ComfyUI 正在生成…' });
    const histRes = await comfyFetch(baseUrl, `/history/${promptId}`, {}, 15000);
    if (!histRes.ok) continue;
    const item = (await histRes.json())?.[promptId];
    if (!item) continue;
    if (item.status?.status_str === 'error') throw new Error('ComfyUI 工作流执行出错');
    let outImg = null;
    Object.values(item.outputs || {}).forEach(nodeOut => {
      (nodeOut?.images || []).forEach(im => {
        if (!outImg || (im?.type === 'output' && outImg.type !== 'output')) outImg = im;
      });
    });
    if (!outImg) {
      if (item.status?.completed) throw new Error('工作流完成但没有输出图片');
      continue;
    }
    const qs = new URLSearchParams({
      filename: outImg.filename,
      subfolder: outImg.subfolder || '',
      type: outImg.type || 'output'
    });
    const imgRes = await comfyFetch(baseUrl, `/view?${qs}`, {}, 60000);
    if (!imgRes.ok) throw new Error('获取生成结果失败');
    const blob = await imgRes.blob();
    return { imageUrl: URL.createObjectURL(blob), modelUsed: 'qwen_image_edit_2509', providerUsed: 'comfyui' };
  }
}

async function generateCloud({ provider, recipe, prompt, apiKey, baseUrl, model, useProxy }) {
  const sources = [
    recipe.portrait && (recipe.portrait.原图 || recipe.portrait.缩略图),
    recipe.costume && (recipe.costume.预览图 || recipe.costume.原图 || recipe.costume.缩略图),
    recipe.pose && (recipe.pose.原图 || recipe.pose.缩略图)
  ].filter(Boolean).map(assetUrl);
  if (!sources.length) throw new Error('请先选择至少 1 张参考图');
  if (!apiKey) throw new Error('请先填写 API Key');
  const endpoint = resolveEndpoint(provider, baseUrl);
  const kind = cloudKind(provider, endpoint);
  const headers = { Authorization: `Bearer ${apiKey}` };
  let body;
  if (kind === 'qwen') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      model,
      input: { messages: [{ role: 'user', content: [...sources.map(image => ({ image })), { text: prompt }] }] },
      parameters: { size: '1024*1536', n: 1, prompt_extend: true, watermark: false }
    });
  } else if (kind === 'chat') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      model,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          ...sources.map(url => ({ type: 'image_url', image_url: { url } }))
        ]
      }]
    });
  } else if (kind === 'doubao') {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      model,
      prompt,
      image: sources,
      size: '2K',
      watermark: false,
      response_format: 'b64_json',
      n: 1
    });
  } else {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify({
      model,
      prompt,
      image: sources,
      size: '1024x1536',
      response_format: 'b64_json',
      n: 1
    });
  }
  const res = await smartFetch(endpoint, { method: 'POST', headers, body }, useProxy);
  let json = {};
  try {
    json = await res.json();
  } catch {
    json = {};
  }
  if (!res.ok) {
    const message = json?.error?.message || json?.message || json?.error || `请求失败 HTTP ${res.status}`;
    if (res.status === 403 && useProxy) throw new Error('本站代理仅支持通义、豆包和官方 OpenAI。自定义接口请关闭代理后直连。');
    throw new Error(typeof message === 'string' ? message : `请求失败 HTTP ${res.status}`);
  }
  const imageUrl = extractImage(json);
  if (!imageUrl) throw new Error('接口已响应但未解析到图片');
  return { imageUrl, modelUsed: model, providerUsed: provider };
}

window.STUDIO_GEN = {
  STYLE_PRESETS,
  assetUrl,
  buildRecipePrompt,
  testComfy,
  detectComfy,
  generateWithComfyUi,
  generateCloud
};
})();

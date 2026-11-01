const ALLOW = new Set([
  'dashscope.aliyuncs.com',
  'ark.cn-beijing.volces.com',
  'generativelanguage.googleapis.com',
  'api.openai.com'
]);

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, x-target-url, x-goog-api-key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.status(204).end();
    return;
  }
  const target = req.headers['x-target-url'];
  if (!target || typeof target !== 'string') {
    res.status(400).json({ error: 'missing x-target-url' });
    return;
  }
  let url;
  try {
    url = new URL(target);
  } catch {
    res.status(400).json({ error: 'invalid target' });
    return;
  }
  if (url.protocol !== 'https:' || !ALLOW.has(url.hostname)) {
    res.status(403).json({ error: 'host not allowed' });
    return;
  }
  const headers = {};
  for (const key of ['authorization', 'content-type', 'x-goog-api-key']) {
    if (req.headers[key]) headers[key] = req.headers[key];
  }
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body
  });
  res.status(upstream.status);
  const type = upstream.headers.get('content-type');
  if (type) res.setHeader('Content-Type', type);
  res.send(Buffer.from(await upstream.arrayBuffer()));
};

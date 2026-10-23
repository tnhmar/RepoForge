import http from 'node:http';
const clientId = process.env.GITHUB_CLIENT_ID;
const secret = process.env.GITHUB_CLIENT_SECRET;
const redirect = 'repoforge://oauth';
if (!clientId || !secret) throw new Error('Set server-only GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET');
const limits = new Map();
const send = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
const basic = Buffer.from(`${clientId}:${secret}`).toString('base64');
http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
    if (req.method !== 'POST' || !['/token', '/refresh', '/revoke'].includes(req.url)) return send(res, 404, { error: 'not_found' });
    if (req.headers.origin) return send(res, 403, { error: 'native_client_only' });
    if (!req.headers['content-type']?.startsWith('application/json')) return send(res, 415, { error: 'json_required' });
    const ip = req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    for (const [key, value] of limits) if (value.until < now) limits.delete(key);
    const bucket = limits.get(ip) || { count: 0, until: now + 60000 };
    bucket.count += 1; limits.set(ip, bucket);
    if (bucket.count > 30 || limits.size > 10000) return send(res, 429, { error: 'rate_limited' });
    let size = 0; const chunks = [];
    for await (const chunk of req) { size += chunk.length; if (size > 8192) return send(res, 413, { error: 'body_too_large' }); chunks.push(chunk); }
    const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (req.url === '/revoke') {
      if (typeof body.accessToken !== 'string' || body.accessToken.length > 2048) return send(res, 400, { error: 'invalid_token' });
      const response = await fetch(`https://api.github.com/applications/${encodeURIComponent(clientId)}/token`, { method: 'DELETE', headers: { Authorization: `Basic ${basic}`, Accept: 'application/vnd.github+json', 'Content-Type': 'application/json', 'User-Agent': 'RepoForge-Token-Broker', 'X-GitHub-Api-Version': '2022-11-28' }, body: JSON.stringify({ access_token: body.accessToken }), signal: AbortSignal.timeout(20000) });
      return send(res, response.ok || response.status === 404 ? 200 : 400, { ok: response.ok || response.status === 404 });
    }
    const fields = { client_id: clientId, client_secret: secret };
    if (req.url === '/token') {
      if (typeof body.code !== 'string' || !/^[A-Za-z0-9_-]{1,512}$/.test(body.code) || typeof body.verifier !== 'string' || !/^[A-Za-z0-9._~-]{43,128}$/.test(body.verifier)) return send(res, 400, { error: 'invalid_code_or_verifier' });
      Object.assign(fields, { code: body.code, code_verifier: body.verifier, redirect_uri: redirect });
    } else {
      if (typeof body.refreshToken !== 'string' || body.refreshToken.length > 2048) return send(res, 400, { error: 'invalid_refresh_token' });
      Object.assign(fields, { grant_type: 'refresh_token', refresh_token: body.refreshToken });
    }
    const response = await fetch('https://github.com/login/oauth/access_token', { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(fields), signal: AbortSignal.timeout(20000) });
    const result = await response.json();
    if (!response.ok || !result.access_token) return send(res, 400, { error: 'github_authorization_failed' });
    send(res, 200, { access_token: result.access_token, refresh_token: result.refresh_token, expires_in: result.expires_in, refresh_token_expires_in: result.refresh_token_expires_in });
  } catch { if (!res.headersSent) send(res, 400, { error: 'request_failed' }); }
}).listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1');

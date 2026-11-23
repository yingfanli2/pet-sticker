// 本地測試用：node server.js → http://localhost:8787
// 部署到 Vercel 時不會用到這個文件（Vercel 用 api/sticker.js）
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv(path.join(__dirname, '.env'));
const { createSticker, clientIp } = await import('./lib/handler.js');

const PORT = Number(process.env.PORT || 8787);

http
  .createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        return res.end(await readFile(path.join(__dirname, 'index.html')));
      }
      if (req.method === 'GET' && req.url === '/lib/prompts.js') {
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        return res.end(await readFile(path.join(__dirname, 'lib', 'prompts.js')));
      }
      if (req.method === 'GET' && req.url === '/config.js') {
        // 本地測試走後端，不用瀏覽器直連的設定
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        return res.end('');
      }
      if (req.method === 'POST' && req.url === '/api/sticker') {
        let raw = '';
        let size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 9 * 1024 * 1024) return json(res, 413, { error: '照片太大了，換一張小一點的試試。' });
          raw += chunk;
        }
        let body = null;
        try { body = JSON.parse(raw); } catch {}
        const out = await createSticker(body, clientIp(req.headers, req.socket.remoteAddress));
        return json(res, out.status, out.body);
      }
      return json(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error(err);
      return json(res, 500, { error: '伺服器出了點問題，請再試一次。' });
    }
  })
  .listen(PORT, () => console.log(`AI 寵物貼圖機：http://localhost:${PORT}（PROVIDER=${process.env.PROVIDER || 'demo'}）`));

function json(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

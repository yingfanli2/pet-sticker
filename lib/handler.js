// 生成貼圖的共用邏輯：本地 server.js 和 Vercel 的 api/sticker.js 都用這個
import { STYLES, photoPrompt, textPrompt } from './prompts.js';
import { generateSticker, ProviderError } from './provider.js';

const MAX_UPLOAD_BYTES = 6 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp']);

// 簡單限流（存在記憶體裡；雲端部署時每個伺服器實例各自計算，足夠講座現場用）
const ipHits = new Map();
let hourHits = [];

/**
 * @param {any} body  前端送來的 JSON
 * @param {string} ip 觀眾的 IP
 * @returns {Promise<{status:number, body:object}>}
 */
export async function createSticker(body, ip) {
  const perIp = Number(process.env.PER_IP_LIMIT || 5);
  const perHour = Number(process.env.MAX_PER_HOUR || 200);
  const now = Date.now();

  hourHits = hourHits.filter((t) => now - t < 3600_000);
  if (hourHits.length >= perHour) return { status: 429, body: { error: '現場太熱鬧了，稍等一下再試 🙏' } };
  const mine = (ipHits.get(ip) || []).filter((t) => now - t < 600_000);
  if (mine.length >= perIp) return { status: 429, body: { error: `每人每 10 分鐘可以玩 ${perIp} 次，稍後再來！` } };

  if (!body || typeof body !== 'object') return { status: 400, body: { error: '請求格式不對。' } };
  const style = STYLES[body.style] ? body.style : 'quirky';
  let prompt;
  let imageBase64 = null;
  let imageMime = null;

  if (body.mode === 'photo') {
    const m = /^data:(image\/[a-z]+);base64,(.+)$/.exec(body.image || '');
    if (!m || !ALLOWED_MIME.has(m[1])) return { status: 400, body: { error: '請上傳 JPG、PNG 或 WebP 照片。' } };
    imageMime = m[1];
    imageBase64 = m[2];
    if (Buffer.byteLength(imageBase64, 'base64') > MAX_UPLOAD_BYTES) return { status: 413, body: { error: '照片太大了。' } };
    prompt = photoPrompt(style);
  } else if (body.mode === 'text') {
    const desc = String(body.description || '').replace(/[\u0000-\u001f"]/g, ' ').trim().slice(0, 80);
    if (desc.length < 2) return { status: 400, body: { error: '描述一下你最喜歡的動物吧！' } };
    prompt = textPrompt(style, desc);
  } else {
    return { status: 400, body: { error: '請選擇上傳照片或描述動物。' } };
  }

  mine.push(now);
  ipHits.set(ip, mine);
  hourHits.push(now);

  try {
    const started = Date.now();
    const out = await generateSticker({ prompt, imageBase64, imageMime });
    console.log(`[sticker] ${body.mode}/${style} ok in ${((Date.now() - started) / 1000).toFixed(1)}s`);
    // 照片和結果都不寫入硬碟，回傳後就丟掉
    return { status: 200, body: { image: `data:${out.mime};base64,${out.base64}` } };
  } catch (err) {
    console.error('[sticker] failed:', err.message);
    const msg = err instanceof ProviderError ? err.message : 'AI 暫時忙不過來，請再試一次。';
    return { status: 502, body: { error: msg } };
  }
}

export function clientIp(headers, fallback = '') {
  return String(headers['x-forwarded-for'] || headers['x-real-ip'] || fallback).split(',')[0].trim();
}

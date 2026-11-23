// Vercel Serverless Function：POST /api/sticker
import { createSticker, clientIp } from '../lib/handler.js';

// 生成圖片要 20–40 秒，把時限放寬到 60 秒
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  const out = await createSticker(body, clientIp(req.headers, req.socket?.remoteAddress));
  res.setHeader('Cache-Control', 'no-store');
  return res.status(out.status).json(out.body);
}

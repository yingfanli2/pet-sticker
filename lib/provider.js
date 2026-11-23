// ─────────────────────────────────────────────────────────────
// 接 API 的地方：generateSticker() 是網站唯一會調用的函數。
// 用 .env 裡的 PROVIDER 選擇：gemini / openai / demo
// 換其他服務：照著下面的寫法加一個分支，回傳 { mime, base64 } 就行。
// ─────────────────────────────────────────────────────────────

/**
 * @param {object} p
 * @param {string} p.prompt        已組好的提示詞（來自 prompts.js）
 * @param {string|null} p.imageBase64  觀眾上傳的照片（純 base64，沒有 data: 前綴）；文字模式時是 null
 * @param {string|null} p.imageMime    照片格式，例如 image/jpeg
 * @returns {Promise<{mime: string, base64: string}>}
 */
export async function generateSticker({ prompt, imageBase64, imageMime }) {
  const provider = (process.env.PROVIDER || 'demo').toLowerCase();
  if (provider === 'gemini') return gemini({ prompt, imageBase64, imageMime });
  if (provider === 'openai') return openai({ prompt, imageBase64, imageMime });
  return demo({ imageBase64, imageMime });
}

// ── Google Gemini（圖像模型）───────────────────────────────
// 需要：GEMINI_API_KEY，GEMINI_IMAGE_MODEL（填你帳戶可用的圖像生成模型名稱）
async function gemini({ prompt, imageBase64, imageMime }) {
  const key = must('GEMINI_API_KEY');
  const model = must('GEMINI_IMAGE_MODEL');
  const parts = [{ text: prompt }];
  if (imageBase64) parts.push({ inline_data: { mime_type: imageMime, data: imageBase64 } });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ role: 'user', parts }] }),
    },
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ProviderError(json?.error?.message || `Gemini HTTP ${res.status}`);

  const out = json?.candidates?.[0]?.content?.parts || [];
  const img = out.find((x) => x.inline_data || x.inlineData);
  const data = img?.inline_data || img?.inlineData;
  if (!data?.data) throw new ProviderError('模型沒有回傳圖片（可能被安全規則擋下），換一張照片或描述再試。');
  return { mime: data.mime_type || data.mimeType || 'image/png', base64: data.data };
}

// ── OpenAI Images API ─────────────────────────────────────
// 需要：OPENAI_API_KEY，OPENAI_IMAGE_MODEL（填你帳戶可用的圖像模型名稱）
// 有照片 → /v1/images/edits；只有文字 → /v1/images/generations
async function openai({ prompt, imageBase64, imageMime }) {
  const key = must('OPENAI_API_KEY');
  const model = must('OPENAI_IMAGE_MODEL');
  let res;
  if (imageBase64) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    const ext = imageMime === 'image/png' ? 'png' : 'jpg';
    form.append('image', new Blob([Buffer.from(imageBase64, 'base64')], { type: imageMime }), `pet.${ext}`);
    res = await fetch('https://api.openai.com/v1/images/edits', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}` },
      body: form,
    });
  } else {
    res = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, size: '1024x1024' }),
    });
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ProviderError(json?.error?.message || `OpenAI HTTP ${res.status}`);
  const b64 = json?.data?.[0]?.b64_json;
  if (b64) return { mime: 'image/png', base64: b64 };
  const url = json?.data?.[0]?.url;
  if (url) {
    const r = await fetch(url);
    return { mime: r.headers.get('content-type') || 'image/png', base64: Buffer.from(await r.arrayBuffer()).toString('base64') };
  }
  throw new ProviderError('模型沒有回傳圖片，換一張照片或描述再試。');
}

// ── 示範模式：還沒接 API 時用來測試整個流程 ─────────────────
// 有照片就原樣傳回；只有文字就回一張「DEMO」佔位圖
async function demo({ imageBase64, imageMime }) {
  await new Promise((r) => setTimeout(r, 1500));
  if (imageBase64) return { mime: imageMime, base64: imageBase64 };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <rect width="512" height="512" fill="#ffffff"/>
    <circle cx="256" cy="256" r="190" fill="#F2A541" stroke="#171B26" stroke-width="10"/>
    <circle cx="200" cy="230" r="18" fill="#171B26"/><circle cx="312" cy="230" r="18" fill="#171B26"/>
    <path d="M200 320 Q256 360 312 320" fill="none" stroke="#171B26" stroke-width="10" stroke-linecap="round"/>
    <text x="256" y="480" font-family="Arial" font-size="40" font-weight="700" text-anchor="middle" fill="#2B45D4">DEMO</text>
  </svg>`;
  return { mime: 'image/svg+xml', base64: Buffer.from(svg).toString('base64') };
}

export class ProviderError extends Error {}

function must(name) {
  const v = process.env[name];
  if (!v) throw new ProviderError(`伺服器還沒設定 ${name}`);
  return v;
}

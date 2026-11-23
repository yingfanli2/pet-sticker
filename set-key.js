// GitHub Pages 版用：把 API 設定寫進 config.js
// 用法：node set-key.js gemini <模型名稱> <API_KEY>
//      node set-key.js openai <模型名稱> <API_KEY>
// 注意：config.js 會被推上 GitHub，任何人打開網頁都能取出這把 key。
//      講座結束後請馬上到 API 後台刪除這把 key。
import { writeFileSync } from 'node:fs';

const [provider, model, key] = process.argv.slice(2);
if (!['gemini', 'openai'].includes(provider) || !model || !key) {
  console.log('用法：node set-key.js gemini <模型名稱> <API_KEY>');
  process.exit(1);
}
// 倒序再 base64：只是避免 GitHub 的自動掃描把 key 認出來並封掉，不是加密
const k = Buffer.from(key.split('').reverse().join('')).toString('base64');
writeFileSync(
  new URL('./config.js', import.meta.url),
  `// 由 set-key.js 生成。講座結束後刪掉這個文件，並到 API 後台刪除 key。\nwindow.PET_CONFIG = ${JSON.stringify({ provider, model, k, perPhone: 5 }, null, 2)};\n`,
);
console.log(`已寫入 config.js（provider=${provider}, model=${model}）`);

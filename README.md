# AI 寵物貼圖機

講座現場用：觀眾掃碼 → 上傳寵物照片或描述一隻動物 → 選畫風 → AI 生成貼圖 → 存到手機。

## 文件

| 文件 | 用途 |
|---|---|
| `index.html` | 觀眾手機看到的網頁 |
| `lib/prompts.js` | **提示詞**：三種畫風和印刷規格，想調畫風改這裡 |
| `lib/provider.js` | **接 API 的地方**：Gemini、OpenAI 都寫好了，還有示範模式 |
| `lib/handler.js` | 檢查上傳、限流、組提示詞（不保存任何照片） |
| `api/sticker.js` | 部署到 Vercel 時的後端接口 |
| `server.js` | 本地測試用 |

## 本地試跑

```bash
cp .env.example .env     # 先用 PROVIDER=demo
node server.js           # Node 18 以上，沒有其他依賴
```

打開 http://localhost:8787 。示範模式下，上傳照片會原樣傳回，文字描述會回一張 DEMO 圖。

## 部署（GitHub + Vercel，約 5 分鐘）

1. 把這個文件夾推到 GitHub（例如 `yingfanli2/pet-sticker`）
2. 到 vercel.com 用 GitHub 登入 → **Add New → Project** → 選 `pet-sticker` → Deploy（不用改任何設定）
3. 在 Vercel 專案的 **Settings → Environment Variables** 填：
   - `PROVIDER` = `gemini`（或 `openai`）
   - `GEMINI_API_KEY`、`GEMINI_IMAGE_MODEL`（或 `OPENAI_API_KEY`、`OPENAI_IMAGE_MODEL`）
   - 可選：`PER_IP_LIMIT`、`MAX_PER_HOUR`
4. **Deployments → Redeploy** 讓設定生效，拿到 `https://xxx.vercel.app` 網址，做成二維碼

之後每次推到 GitHub，Vercel 會自動重新部署。

> API key 只填在 Vercel 的環境變數，不要寫進程式碼，也不要把 `.env` 推上 GitHub（`.gitignore` 已經擋住了）。

## 講座前檢查

- [ ] 用自己手機（關掉 Wi-Fi，只用流量）完整跑一次
- [ ] 三種畫風各試一次，挑最好看的截圖放進簡報
- [ ] 確認 API 帳戶額度；`MAX_PER_HOUR` 控制全場上限，`PER_IP_LIMIT` 控制每人次數
- [ ] 結果頁「想印在衣服上？」的連結在 `index.html` 的 `PRINT_URL`，不想顯示就留空

## 調整提示詞（`lib/prompts.js`）

- `STYLES`：三種畫風的描述，網頁按鈕名稱也在這裡
- `PRINT_SPEC`：共用規格（白色貼紙邊、白底、無文字、置中），保證可以直接印上衣服
- `photoPrompt()`：照片模式，保留寵物的品種、毛色和花紋
- `textPrompt()`：文字模式，放入觀眾的描述（最多 80 字）

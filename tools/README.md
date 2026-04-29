# EasyStore → 搬家系統 一鍵同步

`easystore-sync.user.js` 是一個 Tampermonkey userscript。裝好之後 EasyStore 後台會多一顆「🚚 同步到搬家系統」按鈕，按下去會自動：

1. 觸發後台「匯出商品」流程（下載所有商品 / CSV 格式）
2. 等 server 跑完匯出（30-60 秒）
3. 抓 S3 上的 CSV
4. POST 到本機 `http://localhost:3000/__sync`
5. 搬家系統收到 SSE 通知後自動把 CSV 跑過 EasyStore adapter，吐到商品清單裡

跟搬家系統現有的「SKU 增量同步」「同步前預覽差異」兩個開關直接整合 — 開關設什麼，sync 就走那個模式。

## 一次性設定

1. **裝 Tampermonkey**（Chrome 擴充）：<https://chromewebstore.google.com/detail/tampermonkey>
2. 開 Tampermonkey 控制台 → 「新增腳本」
3. 把 [`easystore-sync.user.js`](./easystore-sync.user.js) 整份內容貼進去 → 存檔
4. 確認 Tampermonkey 上有顯示這個 script 開啟中

## 日常用法

1. 在 Mac terminal：`cd 商品搬家系統 && npm run dev`（或讓它一直跑）
2. 瀏覽器分頁 1：打開 `http://localhost:3000`（搬家系統）
3. 瀏覽器分頁 2：打開 `https://admin.easystore.co/products`
4. 在分頁 2 按右上「🚚 同步到搬家系統」
5. 切回分頁 1 看商品清單

兩個分頁都要開著（搬家系統需要監聽 SSE 才能收到推送）。

## 故障排除

| 症狀 | 原因 | 修法 |
|---|---|---|
| 按鈕沒出現 | 不在 `/products` 頁；或 EasyStore 改版動到 DOM | 先 `cd /products`；改版的話 userscript 的 `injectButton()` 邏輯要改 |
| 「搬家系統 dev server 沒在跑」 | localhost:3000 沒啟動 | `npm run dev` |
| 「找不到「⋯」選單按鈕」 | EasyStore UI 改版 | 看 [`easystore-sync.user.js`](./easystore-sync.user.js) 裡的 `runExport()`，更新對應 selector |
| CSV 推送了但搬家系統沒反應 | SSE 連線斷了 | 重新整理 localhost:3000 分頁 |
| 想看推送進度 | — | Tampermonkey 控制台會顯示按鈕狀態，dev server console 也會 log |

## 安全性

- userscript 只在 `admin.easystore.co/*` 載入
- POST 目標寫死 `localhost:3000`
- dev server 的 `/__sync` endpoint **只在 dev mode 啟動**（`apply: 'serve'`），production build 不會包含
- CORS 設 `*` 是因為 dev only；要 production 化的話必須換成具體 origin

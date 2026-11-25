# PetMap — 香港寵物友善地點地圖（即時版）

為香港寵物主人而做的地點地圖：搵到邊度可以帶狗入、現場而家幾多人、以及同其他主人即時交流。

Cross Platform Mobile Application Development 2026-2027 — Assessment 2
Ionic + Angular + Node.js（SSE）

> English version: [README.en.md](README.en.md)

---

## 1. 這個 App 解決什麼問題

帶狗出街之前，主人真正想知的唔止「邊度可以去」，而是：

1. **而家去得成嗎？** —— 週末西九、山頂迫爆，去到才發現冇位企。
2. **而家嘅情況同地圖上寫的一樣嗎？** —— 地圖的「寵物友善」標籤冇時間性，可能兩年前。
3. **有冇其他主人喺度？** —— 一個人帶狗去，同有同伴係兩種體驗。

PetMap 的答案：**每個地點都有即時現場狀況 + 一個屬於該地點的討論區**。

---

## 2. 功能

### A1 已完成
- 六個香港寵物友善地點目錄，按「香港／九龍／新界」分區
- 關鍵字搜尋（名稱、地區、地址）
- Leaflet 地圖顯示位置（OpenStreetMap 圖磚，不用付費 API）
- Capacitor Geolocation 取得目前座標，新增地點
- 資料存於 localStorage

### A2 新增（即時通訊）
- **每個地點一個即時討論區**：同一個地點的人才見到彼此的訊息（以地點名作房間）
- **一按「現場報料」**：🟢 好少人／🟡 開始多人／🔴 好擠／🌧 落雨中，不用打字
- **即時在線人數**：主頁每個地點 + 詳情頁右上角
- **未讀提示**：離開該地點後有新訊息，主頁顯示未讀數
- **上次去過**：一按回到上次瀏覽的地點
- **我的報料記錄**：主頁可看自己報過什麼、幾時報
- **離線仍可讀**：訊息會快取在本機，server 關掉都看到之前的對話，並顯示「連線中…」
- **現場相片**：影相或由相簿揀相，上傳後即時推送給同一個地點的所有人；點縮圖可放大
- **相片檢舉**：三個人檢舉就自動隱藏；同一個人對同一張相只可以檢舉一次

---

## 3. 技術架構

```
Ionic 9 / Angular 22（前端）
        │
        ├── fetch POST /message ──────────────► Node.js + Express（後端）
        │                                        │
        └── EventSource（SSE）◄──────────────────┘
             /events?place=…   單一地點的對話
             /summary          所有地點的概況
```

| 層 | 技術 | 為什麼 |
|---|---|---|
| 前端框架 | Ionic 9 + Angular 22 | 課程要求；一套 code 出 Web／PWA／手機 |
| 地圖 | Leaflet + OpenStreetMap | 免費、不用 API key、示範穩定 |
| 定位 | Capacitor Geolocation | 原生定位能力，網頁／手機同一套 API |
| 後端 | Node.js + Express | 最少程式碼開到 API，學生環境易部署 |
| 即時通訊 | **SSE（Server-Sent Events）** | 單向廣播已足夠；瀏覽器內建 `EventSource`，不用額外套件；純 HTTP 易除錯 |
| 相機／相簿 | Capacitor Camera | 一套 API 同時支援網頁（檔案選擇器）同手機（原生相機） |
| 檔案上傳 | multer（multipart） | Express 的標準做法，可設大小上限同只收圖片 |
| 本機儲存 | localStorage | 課程要求；存暱稱、已讀、快取、報料記錄 |

### 為什麼選 SSE 而不是 Socket.IO
需求是「server 推訊息給同一房間的人」＋「用戶送訊息」。
送訊息用普通 POST 就夠，所以只需要單向推送 → SSE 足夠，而且：
- 瀏覽器內建，零額外套件
- 純 HTTP（`data: {...}\n\n`），出問題用瀏覽器就睇得明
- 代碼量最少，容易維護

已知代價：單向（送訊息要另一條 POST）、HTTP/1.1 下每個分頁佔一條連線。

---

## 4. 如何執行

需要 Node.js 18+。

```bash
# 第一個終端機：後端
cd server
npm install      # 第一次才需要
node server.js   # http://localhost:3000

# 第二個終端機：前端
cd ..
npm start        # http://localhost:4200
```

開 **兩個**瀏覽器視窗，進入**同一個**地點，就會見到即時同步。

上傳的相片會存喺 `server/uploads/`（第一次啟動會自動建立，已在 `.gitignore`）。

> 用手機測試：把 `src/app/services/chat.service.ts` 的 `SERVER_URL` 改成電腦的區網 IP
> （例如 `http://192.168.1.10:3000`），手機與電腦需在同一個 Wi-Fi。

---

## 5. 資料放在哪裡

| 資料 | 位置 | 會不會消失 |
|---|---|---|
| 地點清單 | localStorage `pet_places_v5` | 不會（除非清瀏覽器資料） |
| 暱稱 | localStorage `chat_name` | 不會 |
| 已讀進度 | localStorage `pm_last_seen` | 不會 |
| 我的報料 | localStorage `pm_my_reports` | 不會（保留最近 20 條） |
| 訊息快取 | localStorage `pm_chat_cache_<地點>` | 不會（保留最近 30 條） |
| 檢舉記錄 | localStorage `pm_reported` | 不會 |
| 相片檔案 | `server/uploads/`（磁碟） | **會**（重新部署或換機就冇） |
| 即時訊息 | Server 記憶體 | **會**（server 重開即清空，每個地點最多 50 條） |

---

## 6. 商業模式

### 目標市場
香港的寵物主人（以狗主為核心用戶），以及想吸引這群客人的商戶：
寵物友善餐廳、寵物店、獸醫診所、寵物美容、商場。

> 市場規模的具體數字需以政府統計處／行業報告核實，本文件不作估算。

### 痛點與付費意願

| 對象 | 痛點 | 願意付費的原因 |
|---|---|---|
| 寵物主人 | 資訊散落在 Facebook 群組、討論區、朋友口耳相傳；去到現場先知冇位 | 免費使用（供給側） |
| 商戶 | 想被「帶狗的人」找到，但 Google Maps 冇「寵物友善」這個維度 | 被看見＝直接客流 |
| 品牌 | 想接觸養寵物的家庭，但難以在正確的時間地點投放 | 精準場景廣告 |

### 收入模式

1. **商戶認證月費**（主要收入）
   商戶付月費把自己的地點標為「已認證寵物友善」，可上傳相片、回覆該地點的討論區、置頂於分區列表。
   建議定價：HK$99–299／月，按地區與曝光位分級。

2. **場景推廣**
   寵物食品／用品品牌在特定地點（例如週末的寵物市集）投放「附近有活動」提示。
   按曝光或點擊計費。

3. **數據洞察**（需符合私隱條例）
   匿名化的熱門時段、地區人流趨勢報告，賣給商場與品牌作選址與排班參考。
   **只提供聚合數據，不出售個人資料。**

4. **（後期）交易導流**
   獸醫預約、寵物美容 booking 的導流佣金。

### 為什麼是用戶會來（需求側）
- 免費、不用註冊、開網頁就用（PWA）
- 一次解決「去邊度」＋「而家去得成嗎」＋「有冇同伴」
- 資訊由用戶即時提供，比靜態目錄可信

### 與現有方案比較

| | Google Maps | Facebook／WhatsApp 群組 | 一般寵物資訊網站 | **PetMap** |
|---|---|---|---|---|
| 有地點資料 | ✅ | ❌ 散亂 | ✅ | ✅ |
| 寵物友善維度 | ❌ | 🟡 靠人問 | 🟡 靜態 | ✅ |
| **即時現場狀況** | ❌ | 🟡 但要爬文 | ❌ | ✅ |
| 可搜尋、可分區 | ✅ | ❌ | 🟡 | ✅ |
| 地點級討論（不洗版） | ❌ | ❌ 全群組混在一起 | ❌ | ✅ |

**差異化**：不是「又一個寵物目錄」，而是**把「即時性」放在地點層級** —— 這是 Google Maps 結構上不會做、群組做不到的事。

### 冷啟動問題與對策（老實講）
即時功能的價值取決於有幾多人同時在用。對策：
1. 先以「目錄」提供價值（A1 已成立），即時功能是加成而非唯一賣點
2. 與寵物店／獸醫合作，由商戶主動報料（保證每個地點有內容）
3. 集中在少數高流量地點（西九、山頂、將軍澳海濱）先做出密度

---

## 7. 已知限制（誠實列表）

1. **訊息不持久**：存在 server 記憶體，重開即清空。生產環境應寫入資料庫。
2. **沒有帳號系統**：只有 localStorage 暱稱，任何人可用任何名字，不能防止冒充。
3. **沒有內容審核與速率限制**：可被洗版或張貼不當內容。上線前必須加（每 5 秒 1 條、敏感詞、檢舉）。
4. **房間以地點名作 key**：兩個同名地點會撞房間。應改為地點 `id`。
5. **報料沒有驗證**：任何人都可以報「好少人」，可信度靠社群。可加「需要附近 GPS 才可報料」。
6. **未讀以訊息總數計算**：server 重開後數字歸零，需要一次性修正（已在本機自動修正）。
7. **相片沒有內容審核**：只有「三人檢舉自動隱藏」這個機制，沒有真人審核或自動圖片分類。
8. **檔案沒有清理**：被隱藏或過舊的相片仍然留在 `server/uploads/`，正式要用排程清理或物件儲存（S3）。
9. **相片沒有壓縮**：上傳原圖（已限 5 MB），沒有生成縮圖，流動數據用量較大。

---

## 8. 下一步

1. 地點加 `id`，修正同名撞房間
2. 訊息寫入資料庫（SQLite／Postgres）
3. 帳號 + 內容審核 + 速率限制
4. 「附近 500 米」的地點推送（用 A1 已有的 GPS）
5. 商戶後台：認證、回覆討論區、看曝光數據
6. 圖片自動審核（雲端分類 API）＋ 縮圖 ＋ CDN
7. 相片搬去物件儲存（S3／R2），server 只存網址

---

## 9. 部署

### 架構選擇：單一 Express 服務

`server.js` 會同時做兩件事：

1. 提供 API（`/events`、`/summary`、`/message`、`/upload`、`/photos/report`、`/uploads/*`）
2. 提供 `ng build` 出嚟的 `www/`（靜態檔 + SPA fallback）

好處是同源（same origin），**完全沒有 CORS 問題**，SSE 同檔案上傳都最穩。

```js
const WEB_DIR = path.join(__dirname, '..', 'www');
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR));
  app.get('*', (req, res) => res.sendFile(path.join(WEB_DIR, 'index.html')));
}
```

### 步驟（以 Render 為例）

```bash
# 1. 本地先 build，確認 www/ 是最新
npm run build

# 2. 推上 GitHub（www/ 同 server/uploads/ 不入 repo 也可以，但 server/uploads 要存在）
git add .
git commit -m "project"
git push
```

3. Render → New → Web Service → 連接 repo
4. 設定：

| 設定 | 值 |
|---|---|
| Root Directory | `server` |
| Build Command | `cd .. && npm install && npm run build && cd server && npm install` |
| Start Command | `node server.js` |
| Environment | `PORT` 由 Render 提供（`server.js` 已用 `process.env.PORT`） |

5. 部署後開 `https://<你的網址>` 就完成。

### 為什麼唔用 Vercel／Netlify

它們的 function 有執行時間上限，**SSE 長連線會被中斷**。要用 long-running 的 Node host（Render／Railway／Fly.io）。

### 手機測試

部署後有 HTTPS，`Camera.getPhoto()` 同 `Geolocation` 才可以在手機瀏覽器使用。本機 `http://localhost` 例外（瀏覽器當它是安全來源）。

---

## 10. 專案結構

```
PetMap/
├── src/app/
│   ├── home/            主頁：清單、搜尋、分區、即時概況、未讀
│   ├── mall/            詳情頁：地圖 + 資料 + 即時討論
│   ├── add-mall/        新增地點（GPS）
│   ├── emergency-vet/   急症獸醫（多張小地圖）
│   ├── services/
│   │   ├── chat.service.ts      SSE 通訊（兩條頻道）+ POST 送訊息
│   │   └── storage.service.ts   localStorage 集中管理（地點、暱稱、已讀、快取）
│   ├── models/place.ts  地點的型別（PetPlace）
│   ├── data/vets.ts     急症診所資料
│   └── pet-region.ts    十八區 → 三大區對照
└── server/
    ├── server.js        Express + SSE（/events、/summary、/message）
    └── package.json
```

---

## 11. 課程資料

- 科目：Cross Platform Mobile Application Development 2026-2027
- 評核：Project（Group，40%）
- 提交：`Group?_Project.zip`（包含整個專案與 `server/`，**不包含** `node_modules/`），另交 slides（.pptx/.pdf）、2–3 分鐘示範影片（.mp4）、peer evaluation

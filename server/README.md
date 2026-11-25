# PetMap A2 — 即時討論 Server

## 這是什麼
`server.js` 是一個用 SSE（Server-Sent Events）做的即時通訊 server。
它負責接收 App 送出的訊息，然後即時推給所有正在看同一個寵物地點的人。

## 怎麼跑

```bash
cd server
npm install     # 第一次才需要
node server.js
```

看到 `PetMap A2 Server 已啟動` 就成功了。

## 怎麼確認它真的活著

1. 瀏覽器打開 `http://localhost:3000`
   → 應該見到 `PetMap A2 Server 運行中`

2. 瀏覽器打開 `http://localhost:3000/events?place=測試`
   → 畫面會空白但**不會停止載入**（左下角一直轉）
   → 這就是 SSE 連線開著的樣子，正常

## 兩個 App 怎樣測試即時

1. 先開 server（`node server.js`）
2. 開兩個瀏覽器視窗（或一個正常、一個無痕）
3. 兩個都開 `http://localhost:4200`，進入**同一個**寵物地點
4. 在其中一個送出訊息 → 另一個會即時出現
5. 上方「在線人數」會變成 2

## 資料會保存嗎
不會。訊息存在記憶體，server 關掉就清空。
示範、評分都夠用；如果真的要永久保存，就要寫入檔案或資料庫。

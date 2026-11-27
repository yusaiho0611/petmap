// PetMap server
// SSE 頻道：/events?place=（一個地點的訊息同相片）、/summary（所有地點概況）
// 送訊息：POST /message，上傳相片：POST /upload（multipart）
//
// 開法：npm install（第一次）→ node server.js

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// App 喺 4200，呢個 server 喺 3000，browser 當兩個唔同網站，所以要開 CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

// 全部放記憶體，server 一重開就清空（相片檔案除外，檔案仍然留喺 uploads/）
const rooms = {};          // rooms['山頂公園'] = [連線, ...]
const history = {};        // 每個地點最多 50 條文字
const lastReport = {};     // 每個地點最後一條報料
const photos = {};         // 每個地點最多 30 張相
const photoReports = {};   // photoId -> [檢舉人名]
const summaryClients = []; // 主頁那些 /summary 連線

const MAX_HISTORY = 50;
const MAX_PHOTOS = 30;
const HIDE_AFTER_REPORTS = 3; // 三個人檢舉就自動藏起

// ---------- 上傳設定 ----------

const UPLOAD_DIR = path.join(__dirname, 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    // 用隨機檔名，避免用家上傳咩名就存咩名（路徑穿越）
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      const name = Date.now() + '-' + Math.random().toString(36).slice(2, 8) + ext;
      cb(null, name);
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('只可以上傳圖片'));
    }
    cb(null, true);
  }
});

// ---------- 工具 ----------

function writeTo(client, data) {
  // SSE 格式：data: + JSON + 兩個換行
  client.write('data: ' + JSON.stringify(data) + '\n\n');
}

function pushToPlace(place, message) {
  (rooms[place] || []).forEach((client) => writeTo(client, message));
}

// total 係俾前端算已讀／未讀
function pushOnlineCount(place) {
  pushToPlace(place, {
    type: 'online',
    count: (rooms[place] || []).length,
    total: (history[place] || []).length
  });
}

function buildSummary() {
  const places = {};

  const names = new Set([
    ...Object.keys(rooms),
    ...Object.keys(history),
    ...Object.keys(lastReport),
    ...Object.keys(photos)
  ]);

  names.forEach((name) => {
    places[name] = {
      online: (rooms[name] || []).length,
      total: (history[name] || []).length,
      photoCount: (photos[name] || []).length,
      lastReport: lastReport[name] || null
    };
  });

  return { type: 'summary', places: places };
}

function broadcastSummary() {
  const payload = buildSummary();
  summaryClients.forEach((client) => writeTo(client, payload));
}

function startStream(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // 唔 flush 前端會一直等

  // 每 25 秒寫一行 SSE 註解（: 開頭會被 EventSource 忽略）。
  // 唔寫嘅話，雲端平台的 proxy 可能當連線閒置而切斷。
  const ping = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => clearInterval(ping));
}

// ---------- 一個地點的即時頻道 ----------

app.get('/events', (req, res) => {
  const place = req.query.place || '未命名地點';

  startStream(res);

  if (!rooms[place]) {
    rooms[place] = [];
  }
  rooms[place].push(res);

  // 先補歷史，新入嚟都睇到之前講咩
  (history[place] || []).forEach((message) => writeTo(res, message));

  // 相片一次過送上，前端直接換成呢個 list
  if ((photos[place] || []).length > 0) {
    writeTo(res, { type: 'photo-list', photos: photos[place] });
  }

  pushOnlineCount(place);
  broadcastSummary();

  req.on('close', () => {
    rooms[place] = rooms[place].filter((client) => client !== res);
    pushOnlineCount(place);
    broadcastSummary();
  });
});

// ---------- 主頁概況 ----------

app.get('/summary', (req, res) => {
  startStream(res);

  summaryClients.push(res);
  writeTo(res, buildSummary());

  req.on('close', () => {
    const i = summaryClients.indexOf(res);
    if (i !== -1) {
      summaryClients.splice(i, 1);
    }
  });
});

// ---------- 文字訊息 ----------

app.post('/message', (req, res) => {
  const place = req.body.place;
  const text = req.body.text;

  if (!place || !text) {
    return res.status(400).json({ ok: false, error: 'place 和 text 都是必填' });
  }

  const message = {
    type: req.body.type === 'report' ? 'report' : 'chat',
    name: (req.body.name || '匿名主人').slice(0, 20),
    text: String(text).slice(0, 200),
    time: Date.now()
  };

  if (!history[place]) {
    history[place] = [];
  }
  history[place].push(message);

  if (history[place].length > MAX_HISTORY) {
    history[place].shift();
  }

  if (message.type === 'report') {
    lastReport[place] = message;
  }

  pushToPlace(place, message);
  pushOnlineCount(place);
  broadcastSummary();

  res.json({ ok: true });
});

// ---------- 上傳相片 ----------

app.post('/upload', (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (err) {
      return next(err); // 交俾下面的錯誤處理，回傳 400
    }

    const place = req.body.place;
    const name = (req.body.name || '匿名主人').slice(0, 20);

    if (!place || !req.file) {
      return res.status(400).json({ ok: false, error: '缺少地點或相片' });
    }

    const photo = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      place: place,
      name: name,
      url: '/uploads/' + req.file.filename,
      time: Date.now()
    };

    if (!photos[place]) {
      photos[place] = [];
    }
    photos[place].unshift(photo); // 新的排前面

    if (photos[place].length > MAX_PHOTOS) {
      photos[place].pop();
    }

    pushToPlace(place, { type: 'photo', photo: photo });
    broadcastSummary();

    res.json({ ok: true, photo: photo });
  });
});

// ---------- 刪除自己的相片 ----------

app.post('/photos/delete', (req, res) => {
  const place = req.body.place;
  const photoId = req.body.photoId;
  // 用上傳時的暱稱核對（冇帳號系統，呢個係最小可行做法）
  const who = (req.body.name || '匿名主人').slice(0, 20);

  if (!place || !photoId) {
    return res.status(400).json({ ok: false, error: '缺少地點或相片 id' });
  }

  const photo = (photos[place] || []).find((p) => p.id === photoId);

  if (!photo) {
    return res.status(404).json({ ok: false, error: '找不到這張相片' });
  }

  if (photo.name !== who) {
    return res.status(403).json({ ok: false, error: '只可以刪除自己上傳的相片' });
  }

  photos[place] = photos[place].filter((p) => p.id !== photoId);

  // 順手刪檔（Windows 上檔案被讀取中會 EBUSY，失敗都唔影響回應）
  const filename = path.basename(photo.url);
  try {
    fs.unlinkSync(path.join(UPLOAD_DIR, filename));
  } catch (e) {
    console.warn('刪檔失敗（可忽略）：', filename, e.code);
  }

  pushToPlace(place, { type: 'photo-removed', photoId: photoId });
  broadcastSummary();

  res.json({ ok: true });
});

// ---------- 檢舉相片 ----------
app.post('/photos/report', (req, res) => {
  const place = req.body.place;
  const photoId = req.body.photoId;
  const name = (req.body.name || '匿名').slice(0, 20);

  if (!place || !photoId) {
    return res.status(400).json({ ok: false, error: '缺少地點或相片 id' });
  }

  if (!photoReports[photoId]) {
    photoReports[photoId] = [];
  }

  // 同一個人只計一次
  if (!photoReports[photoId].includes(name)) {
    photoReports[photoId].push(name);
  }

  const hidden = photoReports[photoId].length >= HIDE_AFTER_REPORTS;

  if (hidden) {
    photos[place] = (photos[place] || []).filter((p) => p.id !== photoId);
    pushToPlace(place, { type: 'photo-removed', photoId: photoId });
    broadcastSummary();
  }

  res.json({ ok: true, hidden: hidden });
});

// ---------- 靜態檔 ----------

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '7d' }));

// 部署時由同一個 server 提供 Angular 的 build（www/），就冇 CORS 問題
const WEB_DIR = path.join(__dirname, '..', 'www');
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR));
  app.get('*', (req, res) => {
    // 相片路徑唔應該跌落 index.html（否則「刪除了」會回 200，好易誤判）
    if (req.path.startsWith('/uploads/')) {
      return res.status(404).send('not found');
    }
    res.sendFile(path.join(WEB_DIR, 'index.html'));
  });
}

app.get('/', (req, res) => {
  res.send('PetMap server 運行中');
});

// ---------- 錯誤處理 ----------

// 上傳錯誤（太大、唔係圖片）回 400，唔好變 500
app.use((err, req, res, next) => {
  const tooBig = err.code === 'LIMIT_FILE_SIZE';
  res.status(400).json({
    ok: false,
    error: tooBig ? '相片太大，最多 5 MB' : err.message || '上傳失敗'
  });
});

app.listen(PORT, () => {
  console.log('PetMap server: http://localhost:' + PORT);
});

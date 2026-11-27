# PetMap — Pet-Friendly Places in Hong Kong (Live Edition)

A map of pet-friendly places in Hong Kong: find out where dogs are welcome, how busy it is right now, and talk to other owners on the spot.

Cross Platform Mobile Application Development 2026-2027 — Assessment 2
Ionic + Angular + Node.js (SSE)

> 中文版：[README.md](README.md)

---

## 1. The problem

Before taking a dog out, an owner does not only want to know *where* they can go. They want to know:

1. **Can I go there right now?** — West Kowloon and The Peak are packed at weekends; you find out when you arrive.
2. **Is the map still accurate?** — A "pet-friendly" tag has no timestamp. It may be two years old.
3. **Is anyone else there?** — Walking a dog alone and walking with company are two different experiences.

PetMap's answer: **every place carries a live status and its own discussion thread.**

---

## 2. Features

### Built in A1
- Six pet-friendly places, grouped into Hong Kong Island / Kowloon / New Territories
- Keyword search over name, district and address
- Leaflet map (OpenStreetMap tiles — no paid API key)
- Capacitor Geolocation to capture the current position when adding a place
- Data persisted in localStorage

### Added in A2 (real-time)
- **One live discussion room per place** — only people viewing the same place see each other's messages (the place name is the room key)
- **One-tap status report** — 🟢 quiet / 🟡 getting busy / 🔴 crowded / 🌧 raining, no typing needed
- **Live headcount** — on the home list and in the detail header
- **Unread counts** — new messages in a place you have left show up on the home list
- **"Last visited"** — jump straight back to the place you opened last
- **My reports** — a log of what you reported and when
- **Readable offline** — messages are cached locally, so the history survives a server shutdown and the header shows "connecting…"
- **On-site photos** — tap "photo / pick", choose an image (desktop file picker, or Camera / Album on a phone); once uploaded it is pushed live to everyone viewing that place, and tapping a thumbnail opens it full size
- **Photo reporting** — three reports hide a photo automatically, and one person can report the same photo only once
- **Delete your own photo** — photos you uploaded get a red × in the corner; confirming removes it for everyone and deletes the file from disk (the server checks the nickname used at upload time)

---

## 3. Architecture

```
Ionic 9 / Angular 22 (client)
        │
        ├── fetch POST /message ──────────────► Node.js + Express (server)
        │                                        │
        └── EventSource (SSE) ◄──────────────────┘
             /events?place=…   messages for one place
             /summary          live summary of all places
```

| Layer | Technology | Why |
|---|---|---|
| Client framework | Ionic 9 + Angular 22 | Course requirement; one codebase for web / PWA / mobile |
| Map | Leaflet + OpenStreetMap | Free, no API key, stable for a demo |
| Geolocation | Capacitor Geolocation | Native positioning with one API across web and device |
| Server | Node.js + Express | Smallest amount of code to expose an API |
| Real-time | **SSE (Server-Sent Events)** | One-way broadcast is enough; `EventSource` is built into the browser, so no extra package; plain HTTP is easy to debug |
| Photo upload | standard `<input type="file" accept="image/*">` | Opens a file picker on desktop; on a phone the OS offers Camera / Album. Capacitor Camera needs pwa-elements on the web and hangs without it |
| File upload | multer (multipart) | The standard Express approach — size limit and image-only filter |
| Local storage | localStorage | Course requirement; holds nickname, read state, cache, report log |

### Why SSE instead of Socket.IO
The requirement is "the server pushes a message to everyone in one room" plus "a user sends a message".
Sending is already covered by a plain POST, so the only missing piece is one-way push. That makes SSE enough, and it brings:

- built into the browser, zero extra dependencies
- plain HTTP (`data: {...}\n\n`), readable in the browser's network panel
- the least code to maintain

The trade-off, stated plainly: SSE is one-way (sending needs a second POST), and on HTTP/1.1 each tab holds one connection open.

---

## 4. Running it

Requires Node.js 18+.

```bash
# Terminal 1 — server
cd server
npm install      # first time only
node server.js   # http://localhost:3000

# Terminal 2 — client
cd ..
npm start        # http://localhost:4200
```

Open **two** browser windows, enter the **same** place, and the messages sync live.

Uploaded photos are stored in `server/uploads/` (created on first start, already in `.gitignore`).

> On a phone: change `SERVER_URL` in `src/app/services/chat.service.ts` to your machine's LAN IP
> (e.g. `http://192.168.1.10:3000`). Phone and computer must be on the same Wi-Fi.

### Live deployment

```
https://petmap-1.onrender.com
```

Render free tier: the instance sleeps after 15 minutes idle, so the first load can take ~50 seconds.

---

## 5. Where the data lives

| Data | Location | Survives restart? |
|---|---|---|
| Places | localStorage `pet_places_v5` | Yes (unless browser data is cleared) |
| Nickname | localStorage `chat_name` | Yes |
| Read position | localStorage `pm_last_seen` | Yes |
| My reports | localStorage `pm_my_reports` | Yes (last 20) |
| Message cache | localStorage `pm_chat_cache_<place>` | Yes (last 30) |
| Report log | localStorage `pm_reported` | Yes |
| Photo files | `server/uploads/` (disk) | **No** (gone on redeploy or a new machine) |
| Live messages | Server memory | **No** (cleared on restart, 50 per place) |

---

## 6. Business model

### Target market
Hong Kong pet owners (dog owners first), plus the businesses that want them:
pet-friendly restaurants, pet shops, veterinary clinics, groomers, malls.

> Market-size figures should be verified against the Census and Statistics Department or industry reports. This document does not estimate them.

### Pain and willingness to pay

| Who | Pain | Why they pay |
|---|---|---|
| Pet owners | Information is scattered across Facebook groups and word of mouth; you arrive and find no space | Free (supply side) |
| Businesses | They want to be found by people who bring dogs, but Google Maps has no "pet-friendly" dimension | Visibility is footfall |
| Brands | Hard to reach pet-owning households at the right time and place | Scoped, location-based advertising |

### Revenue streams

1. **Verified-listing subscription** (primary)
   A business pays monthly to be marked "verified pet-friendly", can upload photos, reply in that place's room, and be pinned in the district list.
   Suggested pricing: HK$99–299 / month, tiered by district and placement.

2. **Scoped promotion**
   Pet food and accessory brands place "something nearby" notices at specific places (weekend pet markets, for example). Charged per impression or per tap.

3. **Data insight** (subject to the PDPO)
   Anonymised reports on peak hours and footfall trends for malls and brands — site selection and staffing.
   **Aggregate data only; no personal data is sold.**

4. **(Later) Transaction referrals**
   Commission on veterinary bookings and grooming appointments.

### Why owners come back (demand side)
- Free, no sign-up, opens in a browser (PWA)
- One place to answer "where", "is it OK right now", and "is anyone else there"
- Content is supplied live by users, so it stays more current than a static directory

### Comparison

| | Google Maps | Facebook / WhatsApp groups | Typical pet websites | **PetMap** |
|---|---|---|---|---|
| Place data | ✅ | ❌ scattered | ✅ | ✅ |
| Pet-friendly dimension | ❌ | 🟡 ask and hope | 🟡 static | ✅ |
| **Live on-the-ground status** | ❌ | 🟡 buried in threads | ❌ | ✅ |
| Searchable, grouped by district | ✅ | ❌ | 🟡 | ✅ |
| Per-place discussion (not one noisy group) | ❌ | ❌ | ❌ | ✅ |

**The difference**: not another pet directory, but **freshness attached to the place itself** — something Google Maps structurally will not do, and that Facebook groups cannot do.

### The cold-start problem (stated honestly)
A live feature is only worth something when enough people are online at once. Mitigations:
1. The directory already stands on its own (A1); live features are additive, not the only reason to open the app.
2. Partner with shops and clinics so merchants seed each place.
3. Concentrate on a few high-traffic places (West Kowloon, The Peak, Tseung Kwan O waterfront) until density is real.

---

## 7. Known limitations

1. **Messages are not durable** — held in server memory, gone on restart. A production build needs a database.
2. **No accounts** — only a nickname in localStorage; anyone can use any name.
3. **No moderation or rate limiting** — the room can be flooded or abused. Before launch: one message per 5 seconds, a word filter, a report button.
4. **Rooms are keyed by place name** — two places with the same name share a room. Should be a place `id`.
5. **Reports are unverified** — anyone can report "quiet". Could require the reporter to be within ~500 m (GPS).
6. **Unread is derived from message totals** — a server restart resets the totals, which is corrected once on the client.
7. **Photos are not moderated** — the only control is "three reports hide it"; there is no human review or automated image classification.
8. **No file cleanup** — hidden and old photos stay in `server/uploads/`. A production build needs a scheduled job or object storage (S3).
9. **No image compression** — the original file is stored (capped at 5 MB); no thumbnails are generated, so mobile data use is high.
10. **Photo deletion relies on the nickname** — without accounts the server can only compare the nickname used at upload. On another device, or after clearing localStorage, you cannot delete your own photo.

---

## 8. Next steps

1. Give places an `id`; stop sharing rooms on name collisions
2. Persist messages (SQLite / Postgres)
3. Accounts, moderation and rate limiting
4. "Nearby within 500 m" push, reusing the Geolocation already in A1
5. A merchant console: verification, room replies, visibility stats
6. Automated image moderation (cloud classification API), thumbnails, a CDN
7. Move photos to object storage (S3 / R2) and keep only URLs on the server

---

## 9. Deployment

### The choice: one Express service

`server.js` does two jobs:

1. Serves the API (`/events`, `/summary`, `/message`, `/upload`, `/photos/report`, `/uploads/*`)
2. Serves the Angular build (`www/`) — static files plus an SPA fallback

Same origin means **no CORS at all**, and both SSE and file upload stay simple.

```js
const WEB_DIR = path.join(__dirname, '..', 'www');
if (fs.existsSync(WEB_DIR)) {
  app.use(express.static(WEB_DIR));
  app.get('*', (req, res) => res.sendFile(path.join(WEB_DIR, 'index.html')));
}
```

### Steps (Render as an example)

```bash
# 1. Build locally so www/ is current
npm run build

# 2. Push to GitHub
git add .
git commit -m "project"
git push
```

3. Render → New → Web Service → connect the repo
4. Configure:

| Setting | Value |
|---|---|
| Root Directory | `server` |
| Build Command | `cd .. && npm install && npm run build && cd server && npm install` |
| Start Command | `node server.js` |
| Environment | `PORT` is provided by Render (`server.js` already reads `process.env.PORT`); also set `NODE_VERSION=24.21.0` (Angular 22 needs Node ≥ 22.22.3) |

5. Open `https://<your-app>` and it is live.

### Why not Vercel / Netlify

Their functions have an execution time limit, so **a long-lived SSE connection gets cut**. Use a long-running Node host (Render / Railway / Fly.io).

### Testing on a phone

Once deployed you have HTTPS, which is what `Camera.getPhoto()` and `Geolocation` require in a mobile browser. `http://localhost` is the only exception (browsers treat it as a secure origin).

---

## 10. Project structure

```
PetMap/
├── src/app/
│   ├── home/            list, search, district filter, live summary, unread
│   ├── mall/            detail: map + facts + live discussion
│   ├── add-mall/        add a place (GPS)
│   ├── emergency-vet/   emergency clinics (small maps per card)
│   ├── services/
│   │   ├── chat.service.ts      SSE (two channels) + POST to send
│   │   └── storage.service.ts   localStorage in one place
│   ├── models/place.ts  PetPlace type
│   ├── data/vets.ts     clinic data
│   └── pet-region.ts    18 districts → 3 regions
└── server/
    ├── server.js        Express + SSE (/events, /summary, /message)
    └── package.json
```

---

## 11. Course information

- Subject: Cross Platform Mobile Application Development 2026-2027
- Assessment: Project (group, 40%)
- Submission: `Group?_Project.zip` (the whole project including `server/`, **excluding** `node_modules/`), plus slides (.pptx/.pdf), a 2–3 minute demo video (.mp4) and the peer evaluation form

import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

/** 一條文字訊息（type 分一般對話同現場報料）。 */
export interface ChatMessage {
  type: 'chat' | 'report';
  name: string;
  text: string;
  time: number;
}

/** 一張上傳到某個地點的相片。 */
export interface PlacePhoto {
  id: string;
  place: string;
  name: string;
  url: string;
  time: number;
}

/** 主頁每行用到的即時概況。 */
export interface PlaceLive {
  online: number;
  total: number;
  photoCount: number;
  lastReport: ChatMessage | null;
}

/**
 * server 推過嚟的所有事件。
 * 用 union 而唔用一個大 object，前端 switch 的時候 TypeScript 會幫你收窄型別。
 */
export type LiveEvent =
  | ChatMessage
  | { type: 'online'; count: number; total: number }
  | { type: 'photo'; photo: PlacePhoto }
  | { type: 'photo-list'; photos: PlacePhoto[] }
  | { type: 'photo-removed'; photoId: string };

// 開發時係 http://localhost:3000，部署後係空字串（同源，用相對路徑）
const SERVER_URL = environment.serverUrl;

/**
 * 同 server 通訊。兩條 SSE 頻道：
 *   /events?place=…  一個地點的訊息同相片
 *   /summary         所有地點的概況
 * 送訊息同相片用普通 POST（SSE 只係單向）。
 */
@Injectable({ providedIn: 'root' })
export class ChatService {
  private placeSource: EventSource | null = null;
  private summarySource: EventSource | null = null;

  connect(
    place: string,
    onEvent: (event: LiveEvent) => void,
    onStatus: (connected: boolean) => void
  ): void {
    this.close();

    this.placeSource = new EventSource(
      SERVER_URL + '/events?place=' + encodeURIComponent(place)
    );

    this.placeSource.onopen = () => onStatus(true);
    // 斷線時 EventSource 會自己重試，重試成功會再 fire onopen
    this.placeSource.onerror = () => onStatus(false);

    this.placeSource.onmessage = (event: MessageEvent) => {
      onEvent(JSON.parse(event.data) as LiveEvent);
    };
  }

  connectSummary(onSummary: (places: { [place: string]: PlaceLive }) => void): void {
    this.closeSummary();

    this.summarySource = new EventSource(SERVER_URL + '/summary');

    this.summarySource.onmessage = (event: MessageEvent) => {
      const payload = JSON.parse(event.data);
      onSummary(payload.places || {});
    };
  }

  async send(
    place: string,
    name: string,
    text: string,
    type: 'chat' | 'report' = 'chat'
  ): Promise<void> {
    await fetch(SERVER_URL + '/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, name, text, type })
    });
  }

  /** 上傳一張相片。用 FormData，唔好自己設 Content-Type（要俾 browser 加 boundary）。 */
  async uploadPhoto(place: string, name: string, blob: Blob): Promise<void> {
    const form = new FormData();
    form.append('place', place);
    form.append('name', name);
    form.append('photo', blob, 'photo.jpg');

    const res = await fetch(SERVER_URL + '/upload', { method: 'POST', body: form });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || '上傳失敗');
    }
  }

  async reportPhoto(place: string, photoId: string, name: string): Promise<void> {
    await fetch(SERVER_URL + '/photos/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ place, photoId, name })
    });
  }

  /** server 回的是相對路徑（/uploads/xxx.jpg），要加返 server 網址。 */
  photoSrc(photo: PlacePhoto): string {
    return SERVER_URL + photo.url;
  }

  close(): void {
    if (this.placeSource) {
      this.placeSource.close();
      this.placeSource = null;
    }
  }

  closeSummary(): void {
    if (this.summarySource) {
      this.summarySource.close();
      this.summarySource = null;
    }
  }
}

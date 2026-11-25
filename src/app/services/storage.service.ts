import { Injectable } from '@angular/core';
import { ChatMessage } from './chat.service';
import { PetPlace } from '../models/place';

export interface MyReport {
  place: string;
  text: string;
  time: number;
}

/**
 * localStorage 全部集中喺呢個 service。
 * 頁面唔需要知道 key 叫咩，亦唔需要自己 JSON.parse。
 */
@Injectable({ providedIn: 'root' })
export class StorageService {
  private readonly KEY_PLACES = 'pet_places_v5';
  private readonly KEY_NAME = 'chat_name';
  private readonly KEY_LAST_PLACE = 'pm_last_place';
  private readonly KEY_LAST_SEEN = 'pm_last_seen';
  private readonly KEY_MY_REPORTS = 'pm_my_reports';
  private readonly KEY_CHAT_CACHE = 'pm_chat_cache_';
  private readonly KEY_REPORTED = 'pm_reported';

  // ---------- 地點 ----------

  getPlaces(): PetPlace[] {
    return this.readArray<PetPlace>(this.KEY_PLACES);
  }

  savePlaces(list: PetPlace[]): void {
    this.write(this.KEY_PLACES, list);
  }

  /** 刪除某個地點（用名比對，因為舊資料未有 id）。 */
  removePlace(name: string): PetPlace[] {
    const left = this.getPlaces().filter((p) => p.pet_name !== name);
    this.savePlaces(left);
    return left;
  }

  // ---------- 用戶 ----------

  getName(): string {
    return localStorage.getItem(this.KEY_NAME) || '';
  }

  setName(name: string): void {
    localStorage.setItem(this.KEY_NAME, name.trim());
  }

  getLastPlace(): string {
    return localStorage.getItem(this.KEY_LAST_PLACE) || '';
  }

  setLastPlace(place: string): void {
    localStorage.setItem(this.KEY_LAST_PLACE, place);
  }

  // ---------- 已讀 / 未讀 ----------

  private getLastSeen(): { [place: string]: number } {
    return this.readObject<{ [place: string]: number }>(this.KEY_LAST_SEEN, {});
  }

  markSeen(place: string, total: number): void {
    const map = this.getLastSeen();
    map[place] = total;
    this.write(this.KEY_LAST_SEEN, map);
  }

  unreadOf(place: string, total: number): number {
    const seen = this.getLastSeen()[place] || 0;

    // server 重開之後 total 會變細，舊的 seen 要清一清，否則永遠出不到未讀
    if (seen > total) {
      this.markSeen(place, total);
      return 0;
    }

    return total - seen;
  }

  // ---------- 我的報料 ----------

  getMyReports(): MyReport[] {
    return this.readArray<MyReport>(this.KEY_MY_REPORTS);
  }

  addMyReport(place: string, text: string): void {
    const list = this.getMyReports();
    list.unshift({ place, text, time: Date.now() });
    this.write(this.KEY_MY_REPORTS, list.slice(0, 20));
  }

  // ---------- 訊息快取 ----------

  getChatCache(place: string): ChatMessage[] {
    return this.readArray<ChatMessage>(this.KEY_CHAT_CACHE + place);
  }

  setChatCache(place: string, messages: ChatMessage[]): void {
    this.write(this.KEY_CHAT_CACHE + place, messages.slice(-30));
  }

  // ---------- 檢舉過的相片 ----------

  hasReportedPhoto(id: string): boolean {
    return this.readArray<string>(this.KEY_REPORTED).includes(id);
  }

  addReportedPhoto(id: string): void {
    const list = this.readArray<string>(this.KEY_REPORTED);

    if (!list.includes(id)) {
      list.push(id);
      this.write(this.KEY_REPORTED, list.slice(-50));
    }
  }

  // ---------- 內部工具 ----------

  // 資料壞掉就當空，唔好連累個 App 白畫面
  private readArray<T>(key: string): T[] {
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : [];
      return Array.isArray(value) ? (value as T[]) : [];
    } catch (e) {
      console.error('讀 localStorage 失敗：' + key, e);
      return [];
    }
  }

  private readObject<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === 'object' ? (value as T) : fallback;
    } catch (e) {
      console.error('讀 localStorage 失敗：' + key, e);
      return fallback;
    }
  }

  private write(key: string, value: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('寫 localStorage 失敗：' + key, e);
    }
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import * as L from 'leaflet';
import { ChatService, ChatMessage, LiveEvent, PlacePhoto } from '../services/chat.service';
import { StorageService } from '../services/storage.service';
import { PetPlace } from '../models/place';

@Component({
  selector: 'app-mall',
  templateUrl: './mall.page.html',
  styleUrls: ['./mall.page.scss'],
  standalone: false,
})
export class MallPage implements OnInit {
  private map?: L.Map;

  pet_name = '';
  district = '';
  address = '';
  phone = '';
  hours = '';
  pet_lat = 22.3025;
  pet_lon = 114.1595;
  isUserAdded = false;

  // 即時討論
  chatMessages: ChatMessage[] = [];
  onlineCount = 0;
  connected = false;
  draft = '';
  myName = '';

  // 現場相片
  photos: PlacePhoto[] = [];
  viewing: PlacePhoto | null = null;
  uploading = false;

  readonly quickReports: string[] = [
    '🟢 好少人，好舒服',
    '🟡 開始多人',
    '🔴 好擠，建議改天才來',
    '🌧 落雨中'
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private alertCtrl: AlertController,
    private chat: ChatService,
    private storage: StorageService,
    private cdr: ChangeDetectorRef
  ) {
    this.route.queryParams.subscribe(() => {
      const state = this.router.getCurrentNavigation()?.extras.state;
      const pet = state ? (state['pet'] as PetPlace) : undefined;

      if (pet) {
        this.pet_name = pet.pet_name || '';
        this.district = pet.district || '';
        this.address = pet.address || '';
        this.phone = pet.phone || '';
        this.hours = pet.hours || '';
        this.pet_lat = pet.pet_lat || 22.3025;
        this.pet_lon = pet.pet_lon || 114.1595;
        this.isUserAdded = pet.isUserAdded === true;
      }
    });
  }

  ngOnInit() {
    // 直接開 /mall（例如 refresh）時冇 state，用預設地點頂住
    if (!this.pet_name) {
      this.pet_name = '西九文化區藝術公園';
      this.address = '西九文化區博物館道18號';
      this.phone = '2200 0217';
      this.hours = '每日 06:00 - 23:00';
      this.pet_lat = 22.3025;
      this.pet_lon = 114.1595;
    }
  }

  ionViewDidEnter() {
    this.loadMap();

    // 等 flex 計完先叫 Leaflet 重新量度，唔係地圖會有灰邊
    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
      }
    }, 300);

    this.startChat();
  }

  ionViewWillLeave() {
    this.chat.close();
  }

  loadMap() {
    if (this.map) {
      this.map.remove();
    }

    this.map = L.map('map').setView([this.pet_lat, this.pet_lon], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '© OpenStreetMap'
    }).addTo(this.map);

    L.marker([this.pet_lat, this.pet_lon])
      .addTo(this.map)
      .bindPopup(`<b>${this.pet_name}</b><br>${this.address || ''}`)
      .openPopup();
  }

  // ---------------- 即時討論 ----------------

  /** 用地點名做房間，所以同一個地點的人才會見到彼此。 */
  private startChat(): void {
    this.myName = this.storage.getName();
    this.storage.setLastPlace(this.pet_name);

    // 先讀快取，server 連唔上都有嘢睇
    this.chatMessages = this.storage.getChatCache(this.pet_name);
    this.photos = [];
    this.onlineCount = 0;
    this.connected = false;

    this.chat.connect(
      this.pet_name,
      (event) => this.onEvent(event),
      (ok) => {
        this.connected = ok;
        this.cdr.detectChanges();
      }
    );
  }

  private onEvent(event: LiveEvent): void {
    switch (event.type) {
      case 'online':
        this.onlineCount = event.count || 0;
        this.connected = true;
        // server 說「總共 N 條」= 我已經看到最新一條
        this.storage.markSeen(this.pet_name, event.total || 0);
        break;

      case 'photo-list':
        this.photos = event.photos || [];
        break;

      case 'photo':
        // 同一個 id 只加一次（重連時 server 會再送）
        if (!this.photos.some((p) => p.id === event.photo.id)) {
          this.photos.unshift(event.photo);
        }
        break;

      case 'photo-removed':
        this.photos = this.photos.filter((p) => p.id !== event.photoId);
        break;

      default:
        // 剩下就是 chat / report
        if (!this.hasMessage(event)) {
          // 快取同 server 補回的歷史會重疊，同一條只加一次
          this.chatMessages.push(event);
          this.storage.setChatCache(this.pet_name, this.chatMessages);
          this.scrollChatToBottom();
        }
        break;
    }

    this.cdr.detectChanges();
  }

  private hasMessage(msg: ChatMessage): boolean {
    return this.chatMessages.some(
      (m) => m.time === msg.time && m.name === msg.name && m.text === msg.text
    );
  }

  saveName(): void {
    this.storage.setName(this.myName);
  }

  async sendChat(): Promise<void> {
    const text = this.draft.trim();
    if (!text) {
      return;
    }

    try {
      await this.chat.send(this.pet_name, this.myName || '匿名主人', text, 'chat');
      this.draft = '';
      this.cdr.detectChanges();
    } catch (e) {
      alert('連不上 server，請先執行 node server.js');
      console.error(e);
    }
  }

  async sendReport(text: string): Promise<void> {
    try {
      await this.chat.send(this.pet_name, this.myName || '匿名主人', text, 'report');
      this.storage.addMyReport(this.pet_name, text);
    } catch (e) {
      alert('連不上 server，請先執行 node server.js');
      console.error(e);
    }
  }

  private scrollChatToBottom(): void {
    // 等 Angular 畫完新的一行再捲
    setTimeout(() => {
      const list = document.getElementById('chat-list');
      if (list) {
        list.scrollTop = list.scrollHeight;
      }
    }, 50);
  }

  // ---------------- 現場相片 ----------------

  /** 影相或由相簿揀一張，然後上傳。 */
  async takePhoto(): Promise<void> {
    try {
      const shot = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 70
      });

      if (!shot.webPath) {
        return;
      }

      const blob = await (await fetch(shot.webPath)).blob();

      this.uploading = true;
      this.cdr.detectChanges();

      await this.chat.uploadPhoto(this.pet_name, this.myName || '匿名主人', blob);
    } catch (e) {
      // 用戶自己取消唔當出錯
      const msg = String(e);
      if (!msg.includes('cancel')) {
        alert('上傳失敗：' + msg);
      }
    } finally {
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }

  photoSrc(photo: PlacePhoto): string {
    return this.chat.photoSrc(photo);
  }

  openPhoto(photo: PlacePhoto): void {
    this.viewing = photo;
  }

  closePhoto(): void {
    this.viewing = null;
  }

  /** 檢舉前先確認；同一個人對同一張相只可以檢舉一次。 */
  async reportPhoto(photo: PlacePhoto): Promise<void> {
    if (this.storage.hasReportedPhoto(photo.id)) {
      alert('你已經檢舉過這張相');
      return;
    }

    const alertEl = await this.alertCtrl.create({
      header: '檢舉相片',
      message: '如果這張相與這個地點無關、或有冒犯內容，可以檢舉。三個人檢舉就會自動隱藏。',
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '檢舉',
          role: 'destructive',
          handler: () => {
            this.sendPhotoReport(photo);
          }
        }
      ]
    });
    await alertEl.present();
  }

  private async sendPhotoReport(photo: PlacePhoto): Promise<void> {
    try {
      await this.chat.reportPhoto(this.pet_name, photo.id, this.myName || '匿名主人');
      this.storage.addReportedPhoto(photo.id);
      alert('已收到檢舉，多謝你幫手維持質素');
    } catch (e) {
      alert('檢舉失敗，請確認 server 已啟動');
      console.error(e);
    }
  }

  // ---------------- 刪除 ----------------

  async confirmDelete() {
    const alert = await this.alertCtrl.create({
      header: '刪除地點',
      message: `確定要刪除「${this.pet_name}」嗎？刪除後不能復原。`,
      buttons: [
        { text: '取消', role: 'cancel' },
        {
          text: '刪除',
          role: 'destructive',
          handler: () => {
            this.storage.removePlace(this.pet_name);
            this.router.navigate(['/home']);
          }
        }
      ]
    });
    await alert.present();
  }
}

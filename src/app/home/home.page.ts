import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, NavigationExtras } from '@angular/router';
import { getRegion, RegionName } from '../pet-region';
import { ChatService, ChatMessage, PlaceLive } from '../services/chat.service';
import { StorageService, MyReport } from '../services/storage.service';
import { PetPlace } from '../models/place';

interface PetBucket {
  region: string;
  items: PetPlace[];
}

/** 第一次打開時用的預設地點。 */
const DEFAULT_PLACES: PetPlace[] = [
  {
    pet_name: '西九文化區藝術公園',
    district: '油尖旺',
    address: '西九文化區博物館道18號',
    phone: '2200 0217',
    hours: '每日 06:00 - 23:00',
    pet_lat: 22.3011,
    pet_lon: 114.1575
  },
  {
    pet_name: '山頂公園',
    district: '中西區',
    address: '山頂柯士甸山道',
    phone: '2853 2566',
    hours: '每日 06:00 - 22:00',
    pet_lat: 22.2724,
    pet_lon: 114.1474
  },
  {
    pet_name: '數碼港海濱長廊',
    district: '南區',
    address: '數碼港道100號',
    phone: '3166 3111',
    hours: '24 小時開放',
    pet_lat: 22.2576,
    pet_lon: 114.1309
  },
  {
    pet_name: '將軍澳海濱長廊',
    district: '西貢區',
    address: '將軍澳海旁唐俊街',
    phone: '2701 0281',
    hours: '24 小時開放',
    pet_lat: 22.3031,
    pet_lon: 114.2641
  },
  {
    pet_name: '啟德跑道公園',
    district: '九龍城',
    address: '啟德承豐道33號',
    phone: '2750 2101',
    hours: '每日 07:00 - 22:00',
    pet_lat: 22.3070,
    pet_lon: 114.2121
  },
  {
    pet_name: '荔枝角公園寵物角',
    district: '深水埗',
    address: '荔枝角荔灣道1號',
    phone: '2307 0882',
    hours: '每日 06:30 - 23:00',
    pet_lat: 22.3363,
    pet_lon: 114.1364
  },
  // ---- 商場 ----
  // 資料參考維基百科（2026-11），實際寵物政策以商場公告為準；
  // 商場電話同開放時間未逐一核實，所以留空／寫「請參考商場官網」。
  {
    pet_name: 'AIRSIDE',
    district: '九龍城',
    address: '啟德協調道2號',
    phone: '',
    hours: '請參考商場官網',
    pet_lat: 22.33137,
    pet_lon: 114.19822,
    kind: 'mall'
  },
  {
    pet_name: '圍方 The Wai',
    district: '沙田',
    address: '大圍車公廟路18號',
    phone: '',
    hours: '請參考商場官網',
    pet_lat: 22.37305,
    pet_lon: 114.1786,
    kind: 'mall'
  },
  {
    pet_name: '赤柱廣場',
    district: '南區',
    address: '赤柱馬坑邨佳美道',
    phone: '',
    hours: '請參考商場官網',
    pet_lat: 22.2184,
    pet_lon: 114.2137,
    kind: 'mall'
  }
];

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnInit {
  allPets: PetPlace[] = [];
  displayPets: PetPlace[] = [];
  searchTerm = '';
  selectedRegion: RegionName | undefined = undefined;

  readonly regions: RegionName[] = ['香港', '九龍', '新界'];

  // A2：即時概況
  liveInfo: { [place: string]: PlaceLive } = {};
  unread: { [place: string]: number } = {};
  lastPlace = '';
  myReports: MyReport[] = [];

  /** 按大區分組，認唔到地區就跌落「其他」。 */
  get groups(): PetBucket[] {
    const order: string[] = [...this.regions, '其他'];

    return order
      .map((region) => ({
        region,
        items: this.displayPets.filter((p) => (getRegion(p.district) || '其他') === region)
      }))
      .filter((bucket) => bucket.items.length > 0);
  }

  constructor(
    private router: Router,
    private cdr: ChangeDetectorRef,
    private chat: ChatService,
    private storage: StorageService
  ) {}

  ngOnInit() {
    this.loadPets();
  }

  ionViewWillEnter() {
    this.loadPets();

    this.lastPlace = this.storage.getLastPlace();
    this.myReports = this.storage.getMyReports().slice(0, 3);

    this.chat.connectSummary((places) => this.onSummary(places));
  }

  ionViewWillLeave() {
    this.chat.closeSummary();
  }

  private onSummary(places: { [place: string]: PlaceLive }): void {
    this.liveInfo = places;

    const unread: { [place: string]: number } = {};
    Object.keys(places).forEach((place) => {
      unread[place] = this.storage.unreadOf(place, places[place].total);
    });
    this.unread = unread;

    this.cdr.detectChanges();
  }

  loadPets() {
    const saved = this.storage.getPlaces();

    if (saved.length > 0) {
      this.allPets = saved;
    } else {
      this.allPets = DEFAULT_PLACES;
      this.storage.savePlaces(this.allPets);
    }

    this.displayPets = this.allPets.slice();
    this.cdr.detectChanges();
  }

  filterPets() {
    const term = this.searchTerm.toLowerCase().trim();

    this.displayPets = this.allPets.filter((p) => {
      const hitText =
        !term ||
        p.pet_name.toLowerCase().includes(term) ||
        p.district.toLowerCase().includes(term) ||
        p.address.toLowerCase().includes(term);

      const hitRegion = !this.selectedRegion || getRegion(p.district) === this.selectedRegion;

      return hitText && hitRegion;
    });
  }

  selectRegion(region?: RegionName) {
    this.selectedRegion = region;
    this.filterPets();
  }

  // A2：模板用的小工具

  onlineOf(place: string): number {
    const live = this.liveInfo[place];
    return live ? live.online : 0;
  }

  unreadOf(place: string): number {
    return this.unread[place] || 0;
  }

  photoCountOf(place: string): number {
    const live = this.liveInfo[place];
    return live ? live.photoCount : 0;
  }

  /** 清單左邊的小色塊：用大區分色，一眼分得出地區。 */
  regionTint(pet: PetPlace): string {
    const region = getRegion(pet.district);

    if (region === '香港') {
      return '#ffe0c7';
    }
    if (region === '九龍') {
      return '#d8ecdf';
    }
    if (region === '新界') {
      return '#d9e4f2';
    }
    return '#e9e3d8';
  }

  /** 只顯示 30 分鐘內的報料，太舊就當冇，免得誤導。 */
  reportLine(place: string): string {
    const live = this.liveInfo[place];
    const report: ChatMessage | null = live ? live.lastReport : null;

    if (!report) {
      return '';
    }

    return Date.now() - report.time < 30 * 60 * 1000 ? report.text : '';
  }

  continueLast(): void {
    const found = this.allPets.find((p) => p.pet_name === this.lastPlace);
    if (found) {
      this.toPetDetail(found);
    }
  }

  toPetDetail(pet: PetPlace) {
    // 入頁面前先記低，回來時就知道「上次去過」同已讀到邊
    this.storage.setLastPlace(pet.pet_name);
    this.storage.markSeen(pet.pet_name, this.liveInfo[pet.pet_name]?.total || 0);

    const navigationExtras: NavigationExtras = { state: { pet } };
    this.router.navigate(['mall'], navigationExtras);
  }

  addPet() {
    this.router.navigate(['add-mall']);
  }

  openEmergencyVets() {
    this.router.navigate(['emergency-vet']);
  }
}

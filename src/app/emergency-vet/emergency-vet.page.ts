import { AfterViewInit, Component, ElementRef, OnDestroy, QueryList, ViewChildren } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import * as L from 'leaflet';
import { EMERGENCY_VETS, VetClinic } from '../data/vets';

@Component({
  selector: 'app-emergency-vet',
  templateUrl: './emergency-vet.page.html',
  styleUrls: ['./emergency-vet.page.scss'],
  standalone: false,
})
export class EmergencyVetPage implements AfterViewInit, OnDestroy {
  vets: VetClinic[] = EMERGENCY_VETS;

  private maps: L.Map[] = [];

  @ViewChildren('vetMap') mapRefs!: QueryList<ElementRef<HTMLElement>>;

  constructor(private router: Router) {}

  ngAfterViewInit() {
    // 等清單 render 完才拿到容器
    setTimeout(() => this.drawMaps());
  }

  ngOnDestroy() {
    this.destroyMaps();
  }

  ionViewDidEnter() {
    setTimeout(() => this.maps.forEach((map) => map.invalidateSize()), 300);
  }

  /** 點卡片就用 App 內的地圖頁睇位置，唔會跳去 Google Maps。 */
  openMap(vet: VetClinic) {
    const navigationExtras: NavigationExtras = {
      state: {
        pet: {
          pet_name: vet.name,
          district: vet.district,
          address: vet.address,
          phone: vet.phone,
          hours: vet.is24Hours ? '24 小時急症' : '夜間應診',
          pet_lat: vet.latitude,
          pet_lon: vet.longitude,
          isUserAdded: false,
        },
      },
    };
    this.router.navigate(['mall'], navigationExtras);
  }

  private drawMaps() {
    this.destroyMaps();

    const containers = this.mapRefs ? this.mapRefs.toArray() : [];

    containers.forEach((ref, index) => {
      const vet = this.vets[index];
      const el = ref.nativeElement;
      if (!vet || !el) {
        return;
      }

      const map = L.map(el, {
        center: [vet.latitude, vet.longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map);

      // 卡片地圖太矮，用 tooltip 唔用 popup，免得向上溢出被切
      L.marker([vet.latitude, vet.longitude])
        .addTo(map)
        .bindTooltip(`${vet.name}<br>${vet.address}`, {
          permanent: true,
          direction: 'right',
          className: 'vet-map-label',
          opacity: 1,
        })
        .openTooltip();

      map.whenReady(() => map.invalidateSize());
      this.maps.push(map);
    });
  }

  private destroyMaps() {
    this.maps.forEach((map) => map.remove());
    this.maps = [];
  }
}

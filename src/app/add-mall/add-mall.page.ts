import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Geolocation } from '@capacitor/geolocation';
import { StorageService } from '../services/storage.service';
import { PetPlace } from '../models/place';

@Component({
  selector: 'app-add-mall',
  templateUrl: './add-mall.page.html',
  styleUrls: ['./add-mall.page.scss'],
  standalone: false
})
export class AddMallPage implements OnInit {
  pet_name = '';
  district = '';
  address = '';
  phone = '';
  hours = '';
  pet_lat = 22.3025;
  pet_lon = 114.1595;

  constructor(
    private router: Router,
    private storage: StorageService
  ) {}

  ngOnInit() {}

  async getGPS() {
    try {
      const pos = await Geolocation.getCurrentPosition();
      this.pet_lat = pos.coords.latitude;
      this.pet_lon = pos.coords.longitude;
      alert('已取得目前位置');
    } catch (e) {
      alert('取不到位置：' + e);
    }
  }

  savePet() {
    if (!this.pet_name) {
      alert('請輸入地點名稱');
      return;
    }

    // 輸入框的座標可能是字串，先轉數字再驗，免得存到 "abc" 令地圖空白
    const lat = Number(this.pet_lat);
    const lon = Number(this.pet_lon);

    if (!this.isValidCoordinate(lat, lon)) {
      alert('緯度／經度不正確，請按「獲取當前 GPS 定位」');
      return;
    }

    const place: PetPlace = {
      pet_name: this.pet_name,
      district: this.district,
      address: this.address,
      phone: this.phone,
      hours: this.hours,
      pet_lat: lat,
      pet_lon: lon,
      isUserAdded: true
    };

    const list = this.storage.getPlaces();
    list.push(place);
    this.storage.savePlaces(list);

    alert('已新增：' + place.pet_name);
    this.router.navigate(['/home']);
  }

  private isValidCoordinate(lat: number, lon: number): boolean {
    return (
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }
}

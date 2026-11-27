/** 一個寵物友善地點。所有頁面共用同一個型別，唔再各自用 any。 */
export type PlaceKind = 'park' | 'mall';

export interface PetPlace {
  pet_name: string;
  district: string;
  address: string;
  phone: string;
  hours: string;
  pet_lat: number;
  pet_lon: number;
  /** park = 公園／海濱，mall = 商場。用來決定清單圖示。 */
  kind?: PlaceKind;
  /** 用戶自己加的地點才會有這個欄位。 */
  isUserAdded?: boolean;
}

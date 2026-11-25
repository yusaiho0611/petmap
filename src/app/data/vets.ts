/** 一間獸醫診所。 */
export interface VetClinic {
  name: string;
  district: string;
  address: string;
  phone: string;
  /** 是否 24 小時應診 —— 緊急情況最重要。 */
  is24Hours: boolean;
  latitude: number;
  longitude: number;
  notes?: string;
}

/**
 * 香港的緊急獸醫診所（24 小時或夜間應診）。
 *
 * 這是靜態示範資料，實際出發前請先打電話確認。
 * 如果要新增診所，只要照格式加一個物件就可以。
 */
export const EMERGENCY_VETS: VetClinic[] = [
  {
    name: '愛護動物協會 (灣仔總部)',
    district: '灣仔',
    address: '灣仔運盛街 5 號',
    phone: '2802 0500',
    is24Hours: true,
    latitude: 22.2762,
    longitude: 114.1769,
    notes: '24 小時急症服務，全港最大的動物福利機構。'
  },
  {
    name: '二十四小時愛寵醫院 (旺角)',
    district: '油尖旺',
    address: '旺角彌敦道 655 號',
    phone: '2382 3323',
    is24Hours: true,
    latitude: 22.3196,
    longitude: 114.1694,
    notes: '通宵應診，先電話登記再前往可減少等候。'
  },
  {
    name: '香港獸醫診所 (大圍)',
    district: '沙田',
    address: '大圍積輝街 1 號',
    phone: '2691 1234',
    is24Hours: false,
    latitude: 22.3725,
    longitude: 114.1786,
    notes: '新界東夜間急症轉介點。'
  },
  {
    name: '南區動物醫院',
    district: '南區',
    address: '香港仔大道 208 號',
    phone: '2555 8899',
    is24Hours: true,
    latitude: 22.2478,
    longitude: 114.1561,
    notes: '港島南區 24 小時急症。'
  }
];

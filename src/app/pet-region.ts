/**
 * 香港十八區 → 三大區的對照表。
 * 用「區」字前的名做 key，所以「南區」同「南」都對應到同一格。
 */
export type RegionName = '香港' | '九龍' | '新界';

const DISTRICT_REGIONS: { [district: string]: RegionName } = {
  // 港島
  '中西': '香港',
  '灣仔': '香港',
  '東': '香港',
  '南': '香港',

  // 九龍
  '油尖旺': '九龍',
  '深水埗': '九龍',
  '九龍城': '九龍',
  '黃大仙': '九龍',
  '觀塘': '九龍',

  // 新界及離島
  '葵青': '新界',
  '荃灣': '新界',
  '屯門': '新界',
  '元朗': '新界',
  '北': '新界',
  '大埔': '新界',
  '沙田': '新界',
  '西貢': '新界',
  '離島': '新界',
};

/** 認唔到就回傳 null，只會在「全部」時顯示。 */
export function getRegion(district: string | undefined): RegionName | null {
  if (!district) {
    return null;
  }

  const name = district.trim().replace(/區$/, '');
  return DISTRICT_REGIONS[name] || null;
}

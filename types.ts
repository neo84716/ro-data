export enum Rarity {
  SS = 'SS', // MVP Cards
  S = 'S',   // Costumes/Rare Gear
  A = 'A',   // High refine mats
  B = 'B',   // Normal refine mats
  C = 'C',   // Consumables
}

export interface GachaItem {
  id: string;
  name: string;
  rarity: Rarity;
  probability: number; // 0-100
  imageUrl?: string;
  category: string;
}

export interface ExpRecord {
  id: string;
  date: string;
  mapName: string;
  startLevel: number;
  startPercent: number;
  endLevel: number;
  endPercent: number;
  durationMinutes: number;
  
  // Modifiers
  serverExpRate: number; // e.g., 100% (1x), 200% (2x)
  itemExpRate: number; // Gear bonus %
  manualBook: number; // 0, 50, 100, 200
  isDaiDai: boolean; // True/False
  
  // Calculated
  totalExpGained: number;
  expPerHour: number;
}

export enum CharacterType {
  NORMAL_PRE_TRANS = '一般職業 (轉生前 1-99)',
  NORMAL_POST_TRANS = '進階/三轉/四轉 (轉生後 1-260)',
  DORAM = '喵族 (1-260)'
}

export interface LevelData {
  level: number;
  requiredExp: number;
}

// Enchant System Types
export interface EnchantOption {
  name: string;
  probability: number; // percentage (0-100)
  isRare?: boolean; // For visual highlighting (e.g., Lv3 or +5 stats)
}

export interface EnchantSlot {
  slotId: number; // e.g., 4, 3, 2
  slotName: string; // "第4洞", "第3洞"
  options: EnchantOption[];
}
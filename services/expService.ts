import { 
  EXP_TABLE_100_200, 
  EXP_TABLE_200_PLUS, 
  EXP_TABLE_DORAM, 
  EXP_TABLE_PRE_TRANS, 
  EXP_TABLE_POST_TRANS 
} from '../constants';
import { CharacterType, LevelData } from '../types';

/**
 * Finds the required EXP for a specific level based on character type.
 */
export const getRequiredExp = (level: number, type: CharacterType): number | null => {
  // 1. Handle Pre-Trans Cap (Max 99)
  if (type === CharacterType.NORMAL_PRE_TRANS && level >= 99) {
      return null; // Cannot level up beyond 99 as Pre-Trans
  }

  // 2. Handle Levels 200+ (Universal for Post-Trans and Doram/Spirit Handler)
  if (level >= 201) {
     if (type === CharacterType.NORMAL_PRE_TRANS) return null;
     const data = EXP_TABLE_200_PLUS.find(d => d.level === level);
     return data ? data.requiredExp : null;
  }

  // 3. Handle Levels 100-200
  if (level >= 100) {
    if (type === CharacterType.NORMAL_PRE_TRANS) return null; // Pre-trans cap check again

    if (type === CharacterType.DORAM) {
        // Doram specific table for 100-200
        const data = EXP_TABLE_DORAM.find(d => d.level === level);
        // Fallback to standard 100-200 if Doram table ends early (though constants show it goes to 200)
        return data ? data.requiredExp : EXP_TABLE_100_200.find(d => d.level === level)?.requiredExp || null;
    }
    // Standard Post-Trans classes use the general 100-200 table
    const data = EXP_TABLE_100_200.find(d => d.level === level);
    return data ? data.requiredExp : null;
  }

  // 4. Handle Levels < 100
  let table: LevelData[] = [];
  switch (type) {
    case CharacterType.DORAM:
      table = EXP_TABLE_DORAM;
      break;
    case CharacterType.NORMAL_PRE_TRANS:
      table = EXP_TABLE_PRE_TRANS;
      break;
    case CharacterType.NORMAL_POST_TRANS:
      table = EXP_TABLE_POST_TRANS;
      break;
    default:
      table = EXP_TABLE_PRE_TRANS;
  }

  const data = table.find(d => d.level === level);
  return data ? data.requiredExp : null;
};

/**
 * Calculates the total accumulated experience from Level 1, 0% to the specific Level and Percentage.
 */
export const calculateAccumulatedExp = (level: number, percent: number, type: CharacterType): number => {
  let total = 0;
  
  // Cap check for calculation loop
  const maxLevel = type === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
  const targetLevel = Math.min(level, maxLevel);

  for (let l = 1; l < targetLevel; l++) {
      const req = getRequiredExp(l, type);
      if (req) {
          total += req;
      }
  }

  // Add percentage of current level
  // If we are at the absolute max level (e.g. 99 for pre-trans), percentage might not matter for "next level",
  // but usually in trackers we want to know how much EXP we have *into* the current level.
  const currentLevelReq = getRequiredExp(targetLevel, type);
  if (currentLevelReq) {
      total += currentLevelReq * (percent / 100);
  }

  return total;
};

export const calculateExpDifference = (
    startLv: number, startPct: number, 
    endLv: number, endPct: number, 
    type: CharacterType
): number => {
    const startTotal = calculateAccumulatedExp(startLv, startPct, type);
    const endTotal = calculateAccumulatedExp(endLv, endPct, type);
    return Math.max(0, endTotal - startTotal);
};
import { 
  EXP_TABLE_100_200, 
  EXP_TABLE_200_PLUS, 
  EXP_TABLE_DORAM, 
  EXP_TABLE_PRE_TRANS, 
  EXP_TABLE_POST_TRANS 
} from '../constants';
import { CharacterType, LevelData } from '../types';

/**
 * Finds the required EXP to level up FROM the current level TO the next level.
 * @param currentLevel The character's current level
 * @param type Character type
 */
export const getRequiredExp = (currentLevel: number, type: CharacterType): number | null => {
  const maxLevel = type === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
  
  if (currentLevel >= maxLevel) {
      return null; // Already at max level, no next level requirement
  }

  const targetLevel = currentLevel + 1;
  let table: LevelData[] = [];

  // Determine which table to use based on Character Type and Level Range
  if (type === CharacterType.DORAM) {
      // Doram uses its specific table up to 200, then shares the 200+ table
      if (targetLevel > 200) {
          table = EXP_TABLE_200_PLUS;
      } else {
          table = EXP_TABLE_DORAM;
      }
  } else if (type === CharacterType.NORMAL_PRE_TRANS) {
      // Pre-Trans is capped at 99, always uses pre-trans table
      table = EXP_TABLE_PRE_TRANS;
  } else {
      // Normal Post-Trans / 3rd / 4th Classes
      if (targetLevel >= 201) {
          table = EXP_TABLE_200_PLUS;
      } else if (targetLevel >= 100) {
          table = EXP_TABLE_100_200;
      } else {
          table = EXP_TABLE_POST_TRANS;
      }
  }

  // Find the specific level data
  const data = table.find(d => d.level === targetLevel);
  
  return data ? data.requiredExp : null;
};

/**
 * Calculates the total accumulated experience from Level 1, 0% to the specific Level and Percentage.
 */
export const calculateAccumulatedExp = (level: number, percent: number, type: CharacterType): number => {
  let total = 0;
  
  const maxLevel = type === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
  const targetLevel = Math.min(level, maxLevel);

  // Sum up all required exp for previous levels
  // e.g. Level 200 means we need sum of exp to reach 2 (from 1) ... to 200 (from 199)
  for (let l = 1; l < targetLevel; l++) {
      const req = getRequiredExp(l, type);
      if (req) {
          total += req;
      }
  }

  // Add percentage of current level
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

export const calculateFinalLevel = (
    startLv: number, 
    startPct: number, 
    gainedExp: number, 
    type: CharacterType
): { level: number, percent: number } => {
    const maxLevel = type === CharacterType.NORMAL_PRE_TRANS ? 99 : 260;
    
    // 1. Get current accumulated Exp
    const currentTotalExp = calculateAccumulatedExp(startLv, startPct, type);
    
    // 2. Add gained Exp
    let newTotalExp = currentTotalExp + gainedExp;
    
    // 3. Reverse calculation: Simulate leveling up from Lv1
    let currentLv = 1;
    
    while (currentLv < maxLevel) {
        const req = getRequiredExp(currentLv, type);
        
        // If we can't find exp data, stop to avoid infinite loops or errors
        if (!req) break;
        
        if (newTotalExp >= req) {
            newTotalExp -= req;
            currentLv++;
        } else {
            // Not enough exp to reach next level
            break; 
        }
    }
    
    // Calculate remaining percentage
    let finalPercent = 0;
    const finalLevelReq = getRequiredExp(currentLv, type);
    
    if (finalLevelReq && finalLevelReq > 0) {
        finalPercent = (newTotalExp / finalLevelReq) * 100;
    } else {
        finalPercent = 0;
    }
    
    return {
        level: currentLv,
        percent: Math.min(100, Math.max(0, finalPercent))
    };
};
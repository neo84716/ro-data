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
  // 1. Handle Levels 200+ (Universal across all types usually, or at least for 4th jobs)
  if (level >= 201) {
     const data = EXP_TABLE_200_PLUS.find(d => d.level === level);
     return data ? data.requiredExp : null;
  }

  // 2. Handle Levels 100-200
  if (level >= 100) {
    if (type === CharacterType.DORAM) {
        // Doram has specific table in 100-200 range provided by user
        const data = EXP_TABLE_DORAM.find(d => d.level === level);
        return data ? data.requiredExp : null;
    }
    // Standard classes use the general 100-200 table
    const data = EXP_TABLE_100_200.find(d => d.level === level);
    return data ? data.requiredExp : null;
  }

  // 3. Handle Levels < 100
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
    case CharacterType.THIRD_CLASS_PLUS:
        // Should not happen for lvl < 100 practically, but fallback to Post-Trans
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
 * Note: Since we only have tables starting from level 2 (requiring X to reach 2), we sum up.
 */
export const calculateAccumulatedExp = (level: number, percent: number, type: CharacterType): number => {
  let total = 0;

  // Sum up all FULL levels before current level
  // e.g. If current is 150, we need to have completed lvl 149.
  // The table says "Level 150 -> Requirement X". This usually means X EXP is needed to go FROM 149 TO 150?
  // OR "Level 150: X" means "To reach 151 from 150, you need X".
  // RO Standard: The table value is "EXP required to reach Next Level".
  // So Row: 100, Val: 1,272,747 means "At Lv100, you need 1.27M to reach 101".
  
  for (let l = 1; l < level; l++) {
      // For level 'l', how much EXP was needed to complete it (reach l+1)?
      // The table provided lists "Level | Requirement".
      // Assuming Row Level 100 = Exp to reach 101.
      // But looking at table start: Level 2 | 55 (Doram).
      // This usually means To reach level 2, or From level 2?
      // Standard RO tables usually list "Base EXP required to level up".
      // Let's assume Row N means "Exp required to go from N to N+1".
      // Wait, look at Doram: Lvl 2 Req 55. Lvl 1->2 is usually tiny. 
      // It is safer to assume the key is "Current Level".
      
      const req = getRequiredExp(l, type);
      if (req) {
          total += req;
      } else {
          // If data is missing (e.g. lvl 1), we assume 0 or negligible for this calculator's scope
          // Typically lvl 1->2 is trivial.
      }
  }

  // Add percentage of current level
  const currentLevelReq = getRequiredExp(level, type);
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
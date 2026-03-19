import { CharityMission } from '../types';

/**
 * Calculates the progress based on items needed.
 */
export const calculateItemsProgress = (mission: CharityMission): number => {
  if (!mission || !mission.itemsNeeded || mission.itemsNeeded.length === 0) return 0;
  
  const totalProgress = mission.itemsNeeded.reduce((acc, item) => {
    const itemProg = item.target > 0 ? (item.current / item.target) : 0;
    return acc + Math.min(1, itemProg);
  }, 0);
  return Math.round((totalProgress / mission.itemsNeeded.length) * 100);
};

/**
 * Calculates the progress based on budget.
 */
export const calculateBudgetProgress = (mission: CharityMission): number => {
  if (!mission || mission.targetBudget <= 0) return 0;
  return Math.min(100, Math.round((mission.currentBudget / mission.targetBudget) * 100));
};

/**
 * Calculates the overall progress of a charity mission (legacy/composite).
 */
export const calculateMissionProgress = (mission: CharityMission): number => {
  if (!mission) return 0;
  
  // Priority 1: Progress based on items needed
  if (mission.itemsNeeded && mission.itemsNeeded.length > 0) {
    return calculateItemsProgress(mission);
  }
  
  // Priority 2: Progress based on budget
  if (mission.targetBudget > 0) {
    return calculateBudgetProgress(mission);
  }
  
  return 0;
};

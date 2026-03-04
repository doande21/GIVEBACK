import { CharityMission } from '../types';

/**
 * Calculates the overall progress of a charity mission.
 */
export const calculateMissionProgress = (mission: CharityMission): number => {
  if (!mission) return 0;
  
  // Priority 1: Progress based on items needed
  if (mission.itemsNeeded && mission.itemsNeeded.length > 0) {
    const totalProgress = mission.itemsNeeded.reduce((acc, item) => {
      const itemProg = item.target > 0 ? (item.current / item.target) : 0;
      return acc + Math.min(1, itemProg);
    }, 0);
    return Math.round((totalProgress / mission.itemsNeeded.length) * 100);
  }
  
  // Priority 2: Progress based on budget
  if (mission.targetBudget > 0) {
    return Math.min(100, Math.round((mission.currentBudget / mission.targetBudget) * 100));
  }
  
  return 0;
};

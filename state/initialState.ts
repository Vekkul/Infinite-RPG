

import { GameState, AppState } from '../types';
import { INITIAL_PLAYER_STATS } from '../constants';

export const initialState: AppState = {
  gameState: GameState.START_SCREEN,
  player: {
      ...INITIAL_PLAYER_STATS,
      // Ensure complex objects are fresh copies
      attributes: { ...INITIAL_PLAYER_STATS.attributes },
      abilities: [], 
      inventory: [],
      equipment: {},
      statusEffects: [],
      journal: {
          quests: [],
          flags: [],
          notes: []
      }
  },
  enemies: [],
  storyText: '',
  actions: [],
  log: [],
  isPlayerTurn: true,
  socialEncounter: null,
  worldData: null,
  playerLocationId: null,
  preCombatState: null,
};

import { GameState, AppState } from '../types';
import { INITIAL_PLAYER_STATS } from '../constants';

export const initialState: AppState = {
  gameState: GameState.START_SCREEN,
  player: {
      ...INITIAL_PLAYER_STATS,
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
};

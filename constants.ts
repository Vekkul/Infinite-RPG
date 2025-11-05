import { Player } from './types';

export const INITIAL_PLAYER_STATS: Player = {
  hp: 50,
  maxHp: 50,
  attack: 10,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isDefending: false,
  inventory: [],
};

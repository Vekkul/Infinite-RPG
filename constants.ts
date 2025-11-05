import { Player, CharacterClass } from './types';

export const INITIAL_PLAYER_STATS: Player = {
  name: 'Hero',
  class: CharacterClass.WARRIOR,
  portrait: '',
  hp: 50,
  maxHp: 50,
  attack: 10,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isDefending: false,
  inventory: [],
};

export const CLASS_STATS: Record<CharacterClass, Partial<Player>> = {
    [CharacterClass.WARRIOR]: {
        maxHp: 60,
        hp: 60,
        attack: 12,
    },
    [CharacterClass.MAGE]: {
        maxHp: 40,
        hp: 40,
        attack: 8,
    },
    [CharacterClass.ROGUE]: {
        maxHp: 50,
        hp: 50,
        attack: 10,
    }
};

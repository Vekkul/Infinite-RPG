import { Player, CharacterClass, PlayerAbility } from './types';

export const JRPG_SAVE_KEY = 'jrpgSaveDataV2';

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
        maxHp: 70,
        hp: 70,
        attack: 12,
    },
    [CharacterClass.MAGE]: {
        maxHp: 45,
        hp: 45,
        attack: 8,
        maxMp: 30,
        mp: 30,
    },
    [CharacterClass.ROGUE]: {
        maxHp: 55,
        hp: 55,
        attack: 9,
        maxEp: 20,
        ep: 20,
    }
};

export interface AbilityDetails {
    name: PlayerAbility;
    cost: number;
    resource: 'MP' | 'EP' | 'None';
    description: string;
}

export const PLAYER_ABILITIES: Record<PlayerAbility, AbilityDetails> = {
    [PlayerAbility.HEAVY_STRIKE]: {
        name: PlayerAbility.HEAVY_STRIKE,
        cost: 0,
        resource: 'None',
        description: 'A powerful blow that deals significant damage.'
    },
    [PlayerAbility.FIREBALL]: {
        name: PlayerAbility.FIREBALL,
        cost: 10,
        resource: 'MP',
        description: 'Hurls a ball of fire, dealing magical damage.'
    },
    [PlayerAbility.QUICK_STRIKE]: {
        name: PlayerAbility.QUICK_STRIKE,
        cost: 5,
        resource: 'EP',
        description: 'Two rapid strikes that deal moderate damage.'
    }
};


// Game Mechanics
export const CRIT_CHANCE = 0.1;
export const CRIT_MULTIPLIER = 1.5;
export const FLEE_CHANCE = 0.4;
export const TRAVEL_ENCOUNTER_CHANCE = 0.5;
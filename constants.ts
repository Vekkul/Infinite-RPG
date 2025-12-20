
import { Player, CharacterClass, PlayerAbility, Element, StatusEffectType } from './types';

export const JRPG_SAVE_KEY = 'jrpgSaveDataV2';

export const INITIAL_PLAYER_STATS: Player = {
  name: 'Hero',
  class: CharacterClass.WARRIOR,
  portrait: '',
  hp: 50,
  maxHp: 50,
  attack: 10,
  defense: 0,
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isDefending: false,
  inventory: [],
  equipment: {},
  statusEffects: [],
  journal: {
      quests: [],
      flags: [],
      notes: []
  }
};

export const CLASS_STATS: Record<CharacterClass, Partial<Player>> = {
    [CharacterClass.WARRIOR]: {
        maxHp: 70,
        hp: 70,
        attack: 12,
        defense: 2,
    },
    [CharacterClass.MAGE]: {
        maxHp: 45,
        hp: 45,
        attack: 8,
        maxMp: 30,
        mp: 30,
        defense: 0,
    },
    [CharacterClass.ROGUE]: {
        maxHp: 55,
        hp: 55,
        attack: 9,
        maxEp: 20,
        ep: 20,
        defense: 1,
    }
};

export interface AbilityDetails {
    name: PlayerAbility;
    cost: number;
    resource: 'MP' | 'EP' | 'None';
    description: string;
    element: Element;
    damageMultiplier: number;
    statusEffect?: StatusEffectType;
    statusChance?: number;
}

export const PLAYER_ABILITIES: Record<PlayerAbility, AbilityDetails> = {
    [PlayerAbility.EARTHEN_STRIKE]: {
        name: PlayerAbility.EARTHEN_STRIKE,
        cost: 0,
        resource: 'None',
        description: 'Attack with earthen force. Grants a temporary defense boost and has a 20% chance to make the enemy Grounded, lowering their defense.',
        element: Element.EARTH,
        damageMultiplier: 1.2, // Small damage boost
        statusEffect: StatusEffectType.GROUNDED,
        statusChance: 0.2,
    },
    [PlayerAbility.FIREBALL]: {
        name: PlayerAbility.FIREBALL,
        cost: 10,
        resource: 'MP',
        description: 'Hurls a ball of fire, dealing medium magical damage. Has a 10% chance to Burn the target, causing damage over time.',
        element: Element.FIRE,
        damageMultiplier: 1.5, // Medium damage boost
        statusEffect: StatusEffectType.BURN,
        statusChance: 0.1,
    },
    [PlayerAbility.ICE_SHARD]: {
        name: PlayerAbility.ICE_SHARD,
        cost: 8,
        resource: 'MP',
        description: 'Launches a shard of ice, dealing small magical damage. Has a 20% chance to Chill the target, lowering their attack.',
        element: Element.ICE,
        damageMultiplier: 1.2, // Small damage boost
        statusEffect: StatusEffectType.CHILL,
        statusChance: 0.2,
    },
    [PlayerAbility.LIGHTNING_STRIKE]: {
        name: PlayerAbility.LIGHTNING_STRIKE,
        cost: 5,
        resource: 'EP',
        description: 'A rapid strike imbued with lightning. Deals minor bonus damage and has a 20% chance to Shock the target, with a small chance to stun them.',
        element: Element.LIGHTNING,
        damageMultiplier: 1.1, // Tiny damage boost
        statusEffect: StatusEffectType.SHOCK,
        statusChance: 0.2,
    }
};

// Game Mechanics
export const CRIT_CHANCE = 0.1;
export const CRIT_MULTIPLIER = 1.5;
export const FLEE_CHANCE = 0.4;
export const TRAVEL_ENCOUNTER_CHANCE = 0.35; // Reduced from 0.5 for better pacing

export const ELEMENTAL_RESISTANCES: Record<Element, Element> = {
    [Element.EARTH]: Element.LIGHTNING,
    [Element.LIGHTNING]: Element.ICE,
    [Element.ICE]: Element.FIRE,
    [Element.FIRE]: Element.EARTH,
    [Element.NONE]: Element.NONE, // For clarity
};

export const STATUS_EFFECT_CONFIG = {
    [StatusEffectType.BURN]: { duration: 3, name: 'Burn' },
    [StatusEffectType.CHILL]: { duration: 3, damageReduction: 0.2, name: 'Chill' },
    [StatusEffectType.SHOCK]: { duration: 3, stunChance: 0.1, name: 'Shock' },
    [StatusEffectType.GROUNDED]: { duration: 3, defenseReduction: 0.2, name: 'Grounded' }, // Takes 20% more damage
    [StatusEffectType.EARTH_ARMOR]: { duration: 2, defenseBonus: 0.3, name: 'Earth Armor' }, // Takes 30% less damage
};

export const ENEMY_STATUS_CHANCE: Record<Element, number> = {
    [Element.FIRE]: 0.1,
    [Element.ICE]: 0.2,
    [Element.LIGHTNING]: 0.2,
    [Element.EARTH]: 0.2,
    [Element.NONE]: 0,
};

export const ENEMY_STATUS_MAP: Record<Element, StatusEffectType> = {
    [Element.FIRE]: StatusEffectType.BURN,
    [Element.ICE]: StatusEffectType.CHILL,
    [Element.LIGHTNING]: StatusEffectType.SHOCK,
    [Element.EARTH]: StatusEffectType.GROUNDED,
    [Element.NONE]: StatusEffectType.BURN, // Should not happen
};

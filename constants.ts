
import { Player, PlayerAbility, Element, StatusEffectType, Recipe, ItemType, EquipmentSlot } from './types';

export const RPG_SAVE_KEY = 'rpgSaveDataV1';

export const INITIAL_PLAYER_STATS: Player = {
  name: 'Hero',
  className: 'Adventurer',
  portrait: '',
  attributes: {
      strength: 5,
      intelligence: 5,
      agility: 5
  },
  hp: 50,
  maxHp: 50,
  mp: 20,
  maxMp: 20,
  ep: 20,
  maxEp: 20,
  sp: 20,
  maxSp: 20,
  attack: 10,
  defense: 1, 
  level: 1,
  xp: 0,
  xpToNextLevel: 100,
  isDefending: false,
  inventory: [],
  equipment: {},
  abilities: [],
  statusEffects: [],
  journal: {
      quests: [],
      flags: [],
      notes: [],
      history: []
  }
};

export interface AbilityDetails {
    name: PlayerAbility;
    cost: number;
    resource: 'MP' | 'EP' | 'SP' | 'None';
    description: string;
    element: Element;
    damageMultiplier: number; // 0 if non-damaging
    statusEffect?: StatusEffectType;
    statusChance?: number;
    healAmount?: number; // Multiplier of INT
}

export const PLAYER_ABILITIES: Record<PlayerAbility, AbilityDetails> = {
    [PlayerAbility.EARTHEN_STRIKE]: {
        name: PlayerAbility.EARTHEN_STRIKE,
        cost: 12,
        resource: 'SP',
        description: 'A heavy blow using Stamina. Grants a temporary defense boost.',
        element: Element.EARTH,
        damageMultiplier: 1.2,
        statusEffect: StatusEffectType.EARTH_ARMOR, 
        statusChance: 1.0, 
    },
    [PlayerAbility.POWER_SLASH]: {
        name: PlayerAbility.POWER_SLASH,
        cost: 15,
        resource: 'SP',
        description: 'A devastating physical attack that can crush defenses.',
        element: Element.NONE,
        damageMultiplier: 1.8,
    },
    [PlayerAbility.FIREBALL]: {
        name: PlayerAbility.FIREBALL,
        cost: 12,
        resource: 'MP',
        description: 'Hurls a ball of fire. Chance to Burn.',
        element: Element.FIRE,
        damageMultiplier: 1.5,
        statusEffect: StatusEffectType.BURN,
        statusChance: 0.3,
    },
    [PlayerAbility.ICE_SHARD]: {
        name: PlayerAbility.ICE_SHARD,
        cost: 8,
        resource: 'MP',
        description: 'Launches a shard of ice. Chance to Chill.',
        element: Element.ICE,
        damageMultiplier: 1.2,
        statusEffect: StatusEffectType.CHILL,
        statusChance: 0.4,
    },
    [PlayerAbility.ARCANE_BLAST]: {
        name: PlayerAbility.ARCANE_BLAST,
        cost: 20,
        resource: 'MP',
        description: 'A massive blast of pure magical energy.',
        element: Element.NONE,
        damageMultiplier: 2.2,
    },
    [PlayerAbility.HEAL]: {
        name: PlayerAbility.HEAL,
        cost: 15,
        resource: 'MP',
        description: 'Restores health using magical energy.',
        element: Element.NONE,
        damageMultiplier: 0,
        healAmount: 3.5, // Reduced slightly to balance Int scaling
    },
    [PlayerAbility.LIGHTNING_STRIKE]: {
        name: PlayerAbility.LIGHTNING_STRIKE,
        cost: 10,
        resource: 'EP',
        description: 'A rapid strike using Energy. Chance to Shock.',
        element: Element.LIGHTNING,
        damageMultiplier: 1.3,
        statusEffect: StatusEffectType.SHOCK,
        statusChance: 0.25,
    },
    [PlayerAbility.QUICK_STAB]: {
        name: PlayerAbility.QUICK_STAB,
        cost: 5,
        resource: 'EP',
        description: 'A very fast, low cost attack.',
        element: Element.NONE,
        damageMultiplier: 1.1, 
    }
};

// Game Mechanics
export const CRIT_CHANCE = 0.1;
export const CRIT_MULTIPLIER = 1.5;
export const FLEE_CHANCE = 0.4;
export const TRAVEL_ENCOUNTER_CHANCE = 0.35;

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
    [StatusEffectType.SHOCK]: { duration: 3, stunChance: 0.15, name: 'Shock' }, // Increased stun chance slightly
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

export const CRAFTING_RECIPES: Recipe[] = [
    {
        name: 'Greater Healing Potion',
        description: 'A potent brew that heals 50 HP.',
        ingredients: [{ name: 'Minor Healing Potion', quantity: 2 }],
        result: {
            name: 'Greater Healing Potion',
            description: 'A glowing red potion that radiates warmth.',
            type: ItemType.POTION,
            value: 50,
            stackLimit: 5,
        }
    },
    {
        name: 'Iron Sword',
        description: 'A solid blade, better than a rusty one.',
        ingredients: [{ name: 'Rusty Sword', quantity: 1 }, { name: 'Iron Ore', quantity: 1 }],
        result: {
            name: 'Iron Sword',
            description: 'A reliable iron sword with a sharp edge.',
            type: ItemType.WEAPON,
            value: 5,
            stackLimit: 1,
            slot: EquipmentSlot.MAIN_HAND
        }
    },
    {
        name: 'Steel Plate',
        description: 'Sturdy armor providing good protection.',
        ingredients: [{ name: 'Leather Armor', quantity: 1 }, { name: 'Iron Ore', quantity: 1 }],
        result: {
            name: 'Steel Plate',
            description: 'Heavy armor reinforced with steel plates.',
            type: ItemType.ARMOR,
            value: 5,
            stackLimit: 1,
            slot: EquipmentSlot.BODY
        }
    },
    {
        name: 'Elixir of Vitality',
        description: 'A rare elixir that fully restores HP.',
        ingredients: [{ name: 'Greater Healing Potion', quantity: 2 }, { name: 'Magic Dust', quantity: 1 }],
        result: {
            name: 'Elixir of Vitality',
            description: 'A swirling golden liquid.',
            type: ItemType.POTION,
            value: 999,
            stackLimit: 3,
        }
    }
];

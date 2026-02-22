
export enum GameState {
  LOADING = 'LOADING',
  START_SCREEN = 'START_SCREEN',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  EXPLORING = 'EXPLORING',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER',
  SOCIAL_ENCOUNTER = 'SOCIAL_ENCOUNTER',
  JOURNAL = 'JOURNAL', 
}

export enum Element {
    FIRE = 'FIRE',
    ICE = 'ICE',
    LIGHTNING = 'LIGHTNING',
    EARTH = 'EARTH',
    NONE = 'NONE',
}

export enum StatusEffectType {
    BURN = 'BURN',       
    CHILL = 'CHILL',     
    SHOCK = 'SHOCK',     
    GROUNDED = 'GROUNDED', 
    EARTH_ARMOR = 'EARTH_ARMOR', 
}

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  sourceAttack?: number; 
}

export enum ItemType {
  POTION = 'POTION',
  WEAPON = 'WEAPON',
  ARMOR = 'ARMOR',
  KEY_ITEM = 'KEY_ITEM', 
  MATERIAL = 'MATERIAL',
}

export enum EquipmentSlot {
  MAIN_HAND = 'MAIN_HAND',
  BODY = 'BODY',
}

export enum EnemyAbility {
  HEAL = 'HEAL',
  SHIELD = 'SHIELD',
  MULTI_ATTACK = 'MULTI_ATTACK',
  DRAIN_LIFE = 'DRAIN_LIFE',
}

export enum AIPersonality {
  AGGRESSIVE = 'AGGRESSIVE',
  DEFENSIVE = 'DEFENSIVE',
  STRATEGIC = 'STRATEGIC',
  WILD = 'WILD',
}

export enum PlayerAbility {
    FIREBALL = 'Fireball',
    ICE_SHARD = 'Ice Shard',
    EARTHEN_STRIKE = 'Earthen Strike',
    LIGHTNING_STRIKE = 'Lightning Strike',
    HEAL = 'Heal',
    POWER_SLASH = 'Power Slash',
    QUICK_STAB = 'Quick Stab',
    ARCANE_BLAST = 'Arcane Blast'
}

export interface Item {
  name: string;
  description: string;
  type: ItemType;
  value?: number; 
  quantity: number;
  stackLimit: number;
  slot?: EquipmentSlot; 
  traits?: string[]; 
}

// --- Crafting ---
export interface Ingredient {
    name: string;
    quantity: number;
}

export interface Recipe {
    name: string;
    description: string;
    ingredients: Ingredient[];
    result: Omit<Item, 'quantity'>;
}

// --- Quest & Journal System ---
export interface Quest {
    id: string;
    title: string;
    description: string;
    status: 'ACTIVE' | 'COMPLETED' | 'FAILED';
}

export interface PlayerJournal {
    quests: Quest[];
    flags: string[]; 
    notes: string[]; 
    history: string[]; // Chronological list of significant events
}

export interface Attributes {
    strength: number; // HP & SP & Attack
    intelligence: number; // MP & Magic Attack
    agility: number; // EP & Defense/Crit
}

export interface Player {
  name: string;
  className: string; // Custom class name
  portrait: string; 
  
  // Base Stats
  attributes: Attributes;

  // Derived Vitals
  hp: number;
  maxHp: number;
  mp: number; 
  maxMp: number;
  ep: number; 
  maxEp: number;
  sp: number; 
  maxSp: number;
  
  attack: number;
  defense: number; 
  
  level: number;
  xp: number;
  xpToNextLevel: number;
  
  isDefending: boolean;
  inventory: Item[];
  equipment: {
    [EquipmentSlot.MAIN_HAND]?: Item;
    [EquipmentSlot.BODY]?: Item;
  };
  
  abilities: PlayerAbility[]; // List of learned abilities
  statusEffects: StatusEffect[];
  journal: PlayerJournal; 
}

export interface Enemy {
  name: string;
  description: string;
  hp: number;
  maxHp: number;
  attack: number;
  loot?: Omit<Item, 'quantity'>;
  ability?: EnemyAbility;
  aiPersonality?: AIPersonality;
  isShielded?: boolean;
  element?: Element;
  statusEffects: StatusEffect[];
}

export interface GameAction {
  label: string;
  type: 'explore' | 'rest' | 'encounter' | 'social' | 'move';
  targetLocationId?: string; 
}

// --- Social Encounter ---
export enum RewardType {
    XP = 'XP',
    ITEM = 'ITEM',
    QUEST = 'QUEST', 
}

export interface Reward {
    type: RewardType;
    value?: number; 
    item?: Omit<Item, 'quantity'>; 
    quest?: Quest; 
}

export interface QuestUpdate {
    questId: string;
    status: 'COMPLETED' | 'FAILED';
}

export interface SocialChoice {
    label: string;
    outcome: string;
    reward?: Reward;
    flagUpdate?: string; 
    questUpdate?: QuestUpdate; 
}

export interface SocialEncounter {
    description: string;
    choices: SocialChoice[];
}

// --- World Map ---
export interface MapLocation {
    id: string;
    name: string;
    description: string;
    x: number; 
    y: number; 
    isExplored: boolean;
}

export interface Connection {
    from: string; 
    to: string; 
}

export interface WorldData {
    image: string; 
    locations: MapLocation[];
    connections: Connection[];
    startLocationId: string;
}

export interface SaveData {
    version: number;
    timestamp: number;
    id: string; // Slot ID
    player: Player;
    storyText: string;
    actions: GameAction[];
    log: string[];
    worldData: WorldData;
    playerLocationId: string;
}

export interface SaveMetadata {
    id: string;
    timestamp: number;
    version: number;
    playerName: string;
    playerLevel: number;
    playerClass: string;
    locationName: string;
    isAutoSave: boolean;
}

// --- App Settings ---
export interface AppSettings {
    crtEnabled: boolean;
    textSpeed: number;
}

// --- UI Types ---
export interface EventPopup {
  id: number;
  text: string;
  type: 'info' | 'heal' | 'item' | 'xp' | 'quest';
}

// --- Reducer State & Actions ---

export interface AppState {
  gameState: GameState;
  player: Player;
  enemies: Enemy[];
  storyText: string;
  actions: GameAction[];
  log: string[];
  isPlayerTurn: boolean;
  socialEncounter: SocialEncounter | null;
  worldData: WorldData | null;
  playerLocationId: string | null;
  preCombatState: { description: string; actions: GameAction[] } | null;
}

export type Action =
  | { type: 'START_NEW_GAME' }
  | { type: 'CREATE_CHARACTER'; payload: { name: string; className: string; attributes: Attributes; abilities: PlayerAbility[]; portrait: string } }
  | { type: 'LOAD_GAME'; payload: SaveData }
  | { type: 'SAVE_GAME' }
  | { type: 'SET_GAME_STATE'; payload: GameState }
  | { type: 'SET_SCENE'; payload: { description: string; actions: GameAction[] } }
  | { type: 'SET_ENEMIES'; payload: Enemy[] }
  | { type: 'PLAYER_ACTION_DEFEND' }
  | { type: 'PLAYER_ACTION_FLEE_FAILURE' }
  | { type: 'PLAYER_ACTION_ABILITY'; payload: { ability: PlayerAbility; targetIndex: number } }
  | { type: 'SET_PLAYER_TURN'; payload: boolean }
  | { type: 'UPDATE_ENEMY'; payload: { index: number; data: Partial<Enemy> } }
  | { type: 'UPDATE_PLAYER'; payload: Partial<Player> }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'ADD_ITEM_TO_INVENTORY'; payload: Omit<Item, 'quantity'> }
  | { type: 'PROCESS_COMBAT_VICTORY'; payload: { xpGained: number; loot: Omit<Item, 'quantity'>[]; regen: {hp: number; mp: number; ep: number; sp: number; } } }
  | { type: 'USE_ITEM'; payload: { inventoryIndex: number } }
  | { type: 'EQUIP_ITEM'; payload: { inventoryIndex: number } }
  | { type: 'UNEQUIP_ITEM'; payload: { slot: EquipmentSlot } }
  | { type: 'CRAFT_ITEM'; payload: { recipe: Recipe } }
  | { type: 'ENEMY_ACTION_HEAL'; payload: { enemyIndex: number; healAmount: number } }
  | { type: 'ENEMY_ACTION_DRAIN_LIFE', payload: { enemyIndex: number; damage: number } }
  | { type: 'ENEMY_ACTION_SHIELD'; payload: { enemyIndex: number } }
  | { type: 'SET_SOCIAL_ENCOUNTER'; payload: SocialEncounter }
  | { type: 'RESOLVE_SOCIAL_CHOICE'; payload: { choice: SocialChoice } }
  | { type: 'SET_WORLD_DATA'; payload: WorldData }
  | { type: 'MOVE_PLAYER'; payload: string } 
  | { type: 'PROCESS_TURN_EFFECTS'; payload: { target: 'player' | 'enemy'; index?: number } }
  | { type: 'APPLY_STATUS_EFFECT'; payload: { target: 'player' | 'enemy'; index?: number; effect: StatusEffect } }
  | { type: 'ADD_QUEST'; payload: Quest }
  | { type: 'UPDATE_QUEST_STATUS'; payload: { id: string; status: Quest['status'] } }
  | { type: 'ADD_JOURNAL_FLAG'; payload: string }
  | { type: 'ADD_NARRATIVE_HISTORY'; payload: string } // New Action
  | { type: 'SAVE_SCENE_STATE' }
  | { type: 'RESTORE_SCENE_STATE'; payload?: { appendText: string } };

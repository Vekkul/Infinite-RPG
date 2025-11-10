export enum GameState {
  LOADING = 'LOADING',
  START_SCREEN = 'START_SCREEN',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  EXPLORING = 'EXPLORING',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER',
  SOCIAL_ENCOUNTER = 'SOCIAL_ENCOUNTER',
}

export enum CharacterClass {
    WARRIOR = 'Warrior',
    MAGE = 'Mage',
    ROGUE = 'Rogue',
}

export enum ItemType {
  POTION = 'POTION',
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
    HEAVY_STRIKE = 'Heavy Strike',
    QUICK_STRIKE = 'Quick Strike',
}

export interface Item {
  name: string;
  description: string;
  type: ItemType;
  value?: number; // e.g., amount of HP to restore
  quantity: number;
  stackLimit: number;
}

export interface Player {
  name: string;
  class: CharacterClass;
  portrait: string; // base64 encoded image
  hp: number;
  maxHp: number;
  mp?: number; // Mana for Mages
  maxMp?: number;
  ep?: number; // Energy for Rogues
  maxEp?: number;
  attack: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  isDefending: boolean;
  inventory: Item[];
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
}

export interface GameAction {
  label: string;
  type: 'explore' | 'rest' | 'encounter' | 'social' | 'move';
  targetLocationId?: string; // for 'move' type
}

// --- Social Encounter ---
export enum RewardType {
    XP = 'XP',
    ITEM = 'ITEM',
}

export interface Reward {
    type: RewardType;
    value?: number; // for XP
    item?: Omit<Item, 'quantity'>; // for item
}

export interface SocialChoice {
    label: string;
    outcome: string;
    reward?: Reward;
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
    x: number; // 0-100 percentage
    y: number; // 0-100 percentage
    isExplored: boolean;
}

export interface Connection {
    from: string; // location id
    to: string; // location id
}

export interface WorldData {
    image: string; // base64 encoded image
    locations: MapLocation[];
    connections: Connection[];
    startLocationId: string;
}

export interface SaveData {
    player: Player;
    storyText: string;
    actions: GameAction[];
    log: string[];
    worldData: WorldData;
    playerLocationId: string;
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
}

export type Action =
  | { type: 'START_NEW_GAME' }
  | { type: 'CREATE_CHARACTER'; payload: { name: string; class: CharacterClass; portrait: string } }
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
  | { type: 'COMBAT_VICTORY'; payload: { enemies: Enemy[] } }
  | { type: 'USE_ITEM'; payload: { inventoryIndex: number } }
  | { type: 'ENEMY_ACTION_HEAL'; payload: { enemyIndex: number; healAmount: number } }
  | { type: 'ENEMY_ACTION_DRAIN_LIFE', payload: { enemyIndex: number; damage: number } }
  | { type: 'ENEMY_ACTION_SHIELD'; payload: { enemyIndex: number } }
  | { type: 'SET_SOCIAL_ENCOUNTER'; payload: SocialEncounter }
  | { type: 'RESOLVE_SOCIAL_CHOICE'; payload: { choice: SocialChoice } }
  | { type: 'SET_WORLD_DATA'; payload: WorldData }
  | { type: 'MOVE_PLAYER'; payload: string }; // payload is targetLocationId
export enum GameState {
  LOADING = 'LOADING',
  START_SCREEN = 'START_SCREEN',
  CHARACTER_CREATION = 'CHARACTER_CREATION',
  EXPLORING = 'EXPLORING',
  COMBAT = 'COMBAT',
  GAME_OVER = 'GAME_OVER',
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
  isShielded?: boolean;
}

export interface GameAction {
  label: string;
  type: 'explore' | 'rest' | 'encounter';
}

export interface SaveData {
    player: Player;
    storyText: string;
    actions: GameAction[];
    log: string[];
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
  | { type: 'SET_PLAYER_TURN'; payload: boolean }
  | { type: 'UPDATE_ENEMY'; payload: { index: number; data: Partial<Enemy> } }
  | { type: 'UPDATE_PLAYER'; payload: Partial<Player> }
  | { type: 'ADD_LOG'; payload: string }
  | { type: 'ADD_ITEM_TO_INVENTORY'; payload: Omit<Item, 'quantity'> }
  | { type: 'COMBAT_VICTORY'; payload: { enemies: Enemy[] } }
  | { type: 'USE_ITEM'; payload: { inventoryIndex: number } }
  | { type: 'ENEMY_ACTION_HEAL'; payload: { enemyIndex: number; healAmount: number } }
  | { type: 'ENEMY_ACTION_SHIELD'; payload: { enemyIndex: number } };
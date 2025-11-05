import { AppState, Action, GameState, Item, Player, CharacterClass } from '../types';
import { initialState } from './initialState';
import { CLASS_STATS } from '../constants';

const appendToLog = (log: string[], message: string): string[] => {
    return [...log.slice(-10), message];
};

const addItemToInventory = (inventory: Item[], itemDef: Omit<Item, 'quantity'>): Item[] => {
    const newInventory = [...inventory];
    const existingItemStackIndex = newInventory.findIndex(
        i => i.name === itemDef.name && i.quantity < i.stackLimit
    );

    if (existingItemStackIndex !== -1) {
        newInventory[existingItemStackIndex] = {
            ...newInventory[existingItemStackIndex],
            quantity: newInventory[existingItemStackIndex].quantity + 1,
        };
    } else {
        newInventory.push({ ...itemDef, quantity: 1 });
    }
    return newInventory;
};

const handleLevelUp = (currentPlayer: Player): { updatedPlayer: Player; logs: string[] } => {
    const newLevel = currentPlayer.level + 1;
    const newMaxHp = currentPlayer.maxHp + 20;
    const newAttack = currentPlayer.attack + 5;
    const newXpToNextLevel = Math.floor(currentPlayer.xpToNextLevel * 1.5);

    const logs = [
        `LEVEL UP! You are now level ${newLevel}!`,
        `HP and Attack increased!`
    ];

    const updatedPlayer = {
        ...currentPlayer,
        level: newLevel,
        hp: newMaxHp,
        maxHp: newMaxHp,
        attack: newAttack,
        xp: currentPlayer.xp - currentPlayer.xpToNextLevel, // Carry over remaining XP
        xpToNextLevel: newXpToNextLevel,
    };

    return { updatedPlayer, logs };
};


export const reducer = (state: AppState, action: Action): AppState => {
  switch (action.type) {
    case 'START_NEW_GAME':
      return {
        ...initialState,
        gameState: GameState.CHARACTER_CREATION,
        log: [],
      };
    
    case 'CREATE_CHARACTER': {
        const { name, class: characterClass, portrait } = action.payload;
        const classStats = CLASS_STATS[characterClass];

        const startingPlayer: Player = {
            ...initialState.player,
            ...classStats,
            name,
            class: characterClass,
            portrait,
        };

        return {
            ...state,
            player: startingPlayer,
            gameState: GameState.LOADING,
            log: [`The adventure of ${name} the ${characterClass} begins...`],
        };
    }
    
    case 'LOAD_GAME':
      return {
        ...state,
        player: action.payload.player,
        storyText: action.payload.storyText,
        actions: action.payload.actions,
        log: appendToLog(action.payload.log, 'Game Loaded.'),
        enemies: [],
        gameState: GameState.EXPLORING,
      };

    case 'SET_GAME_STATE':
      return { ...state, gameState: action.payload };

    case 'ADD_LOG':
      return { ...state, log: appendToLog(state.log, action.payload) };

    case 'SET_SCENE':
      return { ...state, storyText: action.payload.description, actions: action.payload.actions };
    
    case 'SET_ENEMIES':
        return { ...state, enemies: action.payload };

    case 'UPDATE_PLAYER':
        return { ...state, player: { ...state.player, ...action.payload } };

    case 'UPDATE_ENEMY':
        const newEnemies = [...state.enemies];
        newEnemies[action.payload.index] = { ...newEnemies[action.payload.index], ...action.payload.data };
        return { ...state, enemies: newEnemies };

    case 'SET_PLAYER_TURN':
        return { ...state, isPlayerTurn: action.payload };
    
    case 'PLAYER_ACTION_DEFEND':
        return {
            ...state,
            player: { ...state.player, isDefending: true },
            log: appendToLog(state.log, 'You brace for the next attack!'),
        };
    
    case 'PLAYER_ACTION_FLEE_FAILURE':
        return { ...state, log: appendToLog(state.log, 'You failed to escape!') };

    case 'ADD_ITEM_TO_INVENTORY':
        return {
            ...state,
            player: { ...state.player, inventory: addItemToInventory(state.player.inventory, action.payload) }
        };

    case 'COMBAT_VICTORY': {
        const defeatedEnemies = action.payload.enemies;
        const totalXpGained = defeatedEnemies.reduce((sum, e) => sum + Math.floor(e.maxHp / 2) + e.attack, 0);
        
        let newLog = [...state.log];
        newLog = appendToLog(newLog, 'VICTORY! All enemies defeated!');
        newLog = appendToLog(newLog, `You gained ${totalXpGained} XP!`);
        
        let newInventory = [...state.player.inventory];
        defeatedEnemies.forEach(e => {
            if (e.loot) {
                newLog = appendToLog(newLog, `You obtained a ${e.loot.name}!`);
                newInventory = addItemToInventory(newInventory, e.loot);
            }
        });
        
        let updatedPlayer: Player = {
            ...state.player,
            xp: state.player.xp + totalXpGained,
            inventory: newInventory
        };
        
        if (updatedPlayer.xp >= updatedPlayer.xpToNextLevel) {
            const { updatedPlayer: leveledUpPlayer, logs: levelUpLogs } = handleLevelUp(updatedPlayer);
            updatedPlayer = leveledUpPlayer;
            levelUpLogs.forEach(l => newLog = appendToLog(newLog, l));
        }

        return {
            ...state,
            player: updatedPlayer,
            log: newLog,
        };
    }

    case 'USE_ITEM': {
        const newInventory = [...state.player.inventory];
        const itemStack = { ...newInventory[action.payload.inventoryIndex] };
        itemStack.quantity -= 1;

        if (itemStack.quantity <= 0) {
            newInventory.splice(action.payload.inventoryIndex, 1);
        } else {
            newInventory[action.payload.inventoryIndex] = itemStack;
        }
        return { ...state, player: { ...state.player, inventory: newInventory } };
    }

    case 'ENEMY_ACTION_HEAL': {
      const { enemyIndex, healAmount } = action.payload;
      const enemiesCopy = [...state.enemies];
      const enemy = enemiesCopy[enemyIndex];
      const newHp = Math.min(enemy.maxHp, enemy.hp + healAmount);
      enemiesCopy[enemyIndex] = { ...enemy, hp: newHp };
      return { ...state, enemies: enemiesCopy };
    }

    case 'ENEMY_ACTION_SHIELD': {
      const { enemyIndex } = action.payload;
      const enemiesCopy = [...state.enemies];
      enemiesCopy[enemyIndex] = { ...enemiesCopy[enemyIndex], isShielded: true };
      return { ...state, enemies: enemiesCopy };
    }

    default:
      return state;
  }
};
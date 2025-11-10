import { AppState, Action, GameState, Item, Player, CharacterClass, Enemy, RewardType, SocialChoice, MapLocation, PlayerAbility } from '../types';
import { initialState } from './initialState';
import { CLASS_STATS, PLAYER_ABILITIES } from '../constants';

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

    const updatedPlayer: Player = {
        ...currentPlayer,
        level: newLevel,
        hp: newMaxHp,
        maxHp: newMaxHp,
        attack: newAttack,
        xp: currentPlayer.xp - currentPlayer.xpToNextLevel, // Carry over remaining XP
        xpToNextLevel: newXpToNextLevel,
    };
    
    if (updatedPlayer.class === CharacterClass.MAGE) {
        const newMaxMp = (updatedPlayer.maxMp || 0) + 10;
        updatedPlayer.maxMp = newMaxMp;
        updatedPlayer.mp = newMaxMp;
        logs.push('Max MP increased!');
    } else if (updatedPlayer.class === CharacterClass.ROGUE) {
        const newMaxEp = (updatedPlayer.maxEp || 0) + 5;
        updatedPlayer.maxEp = newMaxEp;
        updatedPlayer.ep = newMaxEp;
        logs.push('Max EP increased!');
    }


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
            worldData: null,
            playerLocationId: null,
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
        worldData: action.payload.worldData,
        playerLocationId: action.payload.playerLocationId,
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

    case 'SET_WORLD_DATA': {
        const worldData = action.payload;
        const startingLocationIndex = worldData.locations.findIndex(l => l.id === worldData.startLocationId);
        if (startingLocationIndex !== -1) {
            worldData.locations[startingLocationIndex].isExplored = true;
        }
        return {
            ...state,
            worldData: worldData,
            playerLocationId: worldData.startLocationId,
        };
    }

    case 'MOVE_PLAYER': {
        if (!state.worldData) return state;
        const newWorldData = JSON.parse(JSON.stringify(state.worldData));
        const newLocationIndex = newWorldData.locations.findIndex((l: MapLocation) => l.id === action.payload);
        if (newLocationIndex !== -1) {
            newWorldData.locations[newLocationIndex].isExplored = true;
        }
        return {
            ...state,
            worldData: newWorldData,
            playerLocationId: action.payload,
        };
    }

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
        
    case 'PLAYER_ACTION_ABILITY': {
        const { ability, targetIndex } = action.payload;
        const abilityDetails = PLAYER_ABILITIES[ability];
        if (!abilityDetails) return state;

        let newLog = [...state.log];
        const newEnemies = [...state.enemies];
        const target = newEnemies[targetIndex];
        let newPlayerState = {...state.player};

        switch (ability) {
            case PlayerAbility.FIREBALL: {
                const damage = Math.floor(state.player.attack * 1.5 + (Math.random() * 8));
                const damageTaken = target.isShielded ? Math.floor(damage / 2) : damage;
                const newHp = Math.max(0, target.hp - damageTaken);
                newEnemies[targetIndex] = { ...target, hp: newHp };
                newPlayerState.mp = (newPlayerState.mp || 0) - abilityDetails.cost;
                newLog = appendToLog(newLog, `You cast Fireball on ${target.name} for ${damageTaken} damage!`);
                if (newHp <= 0) {
                     newLog = appendToLog(newLog, `${target.name} is defeated!`);
                }
                break;
            }
            case PlayerAbility.QUICK_STRIKE: {
                const damage1 = Math.floor(state.player.attack * 0.8 + (Math.random() * 3));
                const damage2 = Math.floor(state.player.attack * 0.8 + (Math.random() * 3));
                const totalDamage = damage1 + damage2;
                const damageTaken = target.isShielded ? Math.floor(totalDamage / 2) : totalDamage;
                const newHp = Math.max(0, target.hp - damageTaken);
                newEnemies[targetIndex] = { ...target, hp: newHp };
                newPlayerState.ep = (newPlayerState.ep || 0) - abilityDetails.cost;
                newLog = appendToLog(newLog, `You use Quick Strike on ${target.name} for ${damage1} and ${damage2} damage!`);
                 if (newHp <= 0) {
                     newLog = appendToLog(newLog, `${target.name} is defeated!`);
                }
                break;
            }
            case PlayerAbility.HEAVY_STRIKE: {
                const damage = Math.floor(state.player.attack * 1.8 + (Math.random() * 6));
                const damageTaken = target.isShielded ? Math.floor(damage / 2) : damage;
                const newHp = Math.max(0, target.hp - damageTaken);
                newEnemies[targetIndex] = { ...target, hp: newHp };
                newLog = appendToLog(newLog, `You use Heavy Strike on ${target.name} for ${damageTaken} damage!`);
                if (newHp <= 0) {
                     newLog = appendToLog(newLog, `${target.name} is defeated!`);
                }
                break;
            }
        }

        return { ...state, player: newPlayerState, enemies: newEnemies, log: newLog };
    }

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
        
        // Post-combat resource regeneration
        if (updatedPlayer.class === CharacterClass.MAGE) {
            const mpRegen = Math.floor((updatedPlayer.maxMp || 0) * 0.2);
            updatedPlayer.mp = Math.min(updatedPlayer.maxMp || 0, (updatedPlayer.mp || 0) + mpRegen);
            newLog = appendToLog(newLog, `You recovered ${mpRegen} MP.`);
        } else if (updatedPlayer.class === CharacterClass.ROGUE) {
            const epRegen = Math.floor((updatedPlayer.maxEp || 0) * 0.25);
            updatedPlayer.ep = Math.min(updatedPlayer.maxEp || 0, (updatedPlayer.ep || 0) + epRegen);
            newLog = appendToLog(newLog, `You recovered ${epRegen} EP.`);
        } else if (updatedPlayer.class === CharacterClass.WARRIOR) {
            const hpRegen = Math.floor(updatedPlayer.maxHp * 0.1);
            updatedPlayer.hp = Math.min(updatedPlayer.maxHp, updatedPlayer.hp + hpRegen);
            newLog = appendToLog(newLog, `Your warrior's resolve recovers you ${hpRegen} HP.`);
        }
        
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
    
    case 'ENEMY_ACTION_DRAIN_LIFE': {
        const { enemyIndex, damage } = action.payload;
        const enemiesCopy = [...state.enemies];
        const enemy = enemiesCopy[enemyIndex];
        const healAmount = Math.floor(damage * 0.5); // Heals for 50% of damage dealt
        
        const newEnemyHp = Math.min(enemy.maxHp, enemy.hp + healAmount);
        enemiesCopy[enemyIndex] = { ...enemy, hp: newEnemyHp };

        // Player damage is now handled in App.tsx to prevent double-dipping
        return { ...state, enemies: enemiesCopy };
    }

    case 'ENEMY_ACTION_SHIELD': {
      const { enemyIndex } = action.payload;
      const enemiesCopy = [...state.enemies];
      enemiesCopy[enemyIndex] = { ...enemiesCopy[enemyIndex], isShielded: true };
      return { ...state, enemies: enemiesCopy };
    }

    case 'SET_SOCIAL_ENCOUNTER':
        return {
            ...state,
            storyText: action.payload.description,
            socialEncounter: action.payload,
            gameState: GameState.SOCIAL_ENCOUNTER,
        };

    case 'RESOLVE_SOCIAL_CHOICE': {
        const { choice } = action.payload;
        let newLog = appendToLog(state.log, choice.outcome);
        let updatedPlayer = { ...state.player };
        let newInventory = [...state.player.inventory];

        if (choice.reward) {
            switch (choice.reward.type) {
                case RewardType.XP:
                    const xpGained = choice.reward.value || 0;
                    updatedPlayer.xp += xpGained;
                    newLog = appendToLog(newLog, `You gained ${xpGained} XP!`);
                    break;
                case RewardType.ITEM:
                    if (choice.reward.item) {
                        newInventory = addItemToInventory(newInventory, choice.reward.item);
                        newLog = appendToLog(newLog, `You obtained a ${choice.reward.item.name}!`);
                    }
                    break;
            }
        }
        
        updatedPlayer.inventory = newInventory;

        if (updatedPlayer.xp >= updatedPlayer.xpToNextLevel) {
            const { updatedPlayer: leveledUpPlayer, logs: levelUpLogs } = handleLevelUp(updatedPlayer);
            updatedPlayer = leveledUpPlayer;
            levelUpLogs.forEach(l => newLog = appendToLog(newLog, l));
        }

        return {
            ...state,
            player: updatedPlayer,
            log: newLog,
            socialEncounter: null,
        };
    }

    default:
      return state;
  }
};
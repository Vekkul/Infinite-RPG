
import { AppState, Action, GameState, Item, Player, Enemy, RewardType, MapLocation, PlayerAbility, StatusEffect, StatusEffectType, Element, ItemType, EquipmentSlot, Quest, Attributes } from '../types';
import { initialState } from './initialState';
import { PLAYER_ABILITIES, ELEMENTAL_RESISTANCES, STATUS_EFFECT_CONFIG } from '../constants';

const appendToLog = (log: string[], message: string): string[] => {
    return [...log.slice(-20), message];
};

const addItemToInventory = (inventory: Item[], itemDef: Omit<Item, 'quantity'>): Item[] => {
    const newInventory = [...inventory];
    const existingItemStackIndex = newInventory.findIndex(
        i => i.name === itemDef.name && i.type === itemDef.type && i.quantity < i.stackLimit
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

const removeItemFromInventory = (inventory: Item[], itemName: string, quantityToRemove: number): Item[] => {
    let newInventory = [...inventory];
    let remaining = quantityToRemove;
    
    for (let i = 0; i < newInventory.length; i++) {
        if (newInventory[i].name === itemName) {
            if (newInventory[i].quantity >= remaining) {
                newInventory[i] = { ...newInventory[i], quantity: newInventory[i].quantity - remaining };
                remaining = 0;
            } else {
                remaining -= newInventory[i].quantity;
                newInventory[i] = { ...newInventory[i], quantity: 0 };
            }
            if (remaining === 0) break;
        }
    }
    return newInventory.filter(item => item.quantity > 0);
};

// Dynamic Stat Calculation based on Attributes
const calculatePlayerDerivedStats = (player: Player): Partial<Player> => {
    const { strength, intelligence, agility, charisma } = player.attributes;
    const level = player.level;

    // Base Formulas
    // HP: 40 + (STR * 4) + (Level * 10)
    const maxHp = 40 + (strength * 4) + (level * 10);
    
    // MP: Intelligence * 5
    const maxMp = intelligence * 5;
    
    // SP: Strength * 3
    const maxSp = strength * 3;
    
    // EP: Agility * 4
    const maxEp = agility * 4;

    // Attack: 2 + (STR * 1.5) + (Level * 2)
    let attack = Math.floor(2 + (strength * 1.5) + (level * 2));
    
    // Defense: AGI * 0.5
    let defense = Math.floor(agility * 0.5);

    // Luck: Charisma * 1
    let luck = Math.floor(charisma);

    // Add Equipment Stats
    if (player.equipment[EquipmentSlot.MAIN_HAND]) {
        attack += player.equipment[EquipmentSlot.MAIN_HAND]?.value || 0;
    }
    if (player.equipment[EquipmentSlot.BODY]) {
        defense += player.equipment[EquipmentSlot.BODY]?.value || 0;
    }

    return { 
        maxHp, maxMp, maxSp, maxEp, attack, defense, luck,
        hp: player.hp > maxHp ? maxHp : player.hp, // Clamp logic usually handled elsewhere, but safe to default
        mp: player.mp > maxMp ? maxMp : player.mp,
        sp: player.sp > maxSp ? maxSp : player.sp,
        ep: player.ep > maxEp ? maxEp : player.ep
    };
};

const handleLevelUp = (currentPlayer: Player): { updatedPlayer: Player; logs: string[] } => {
    const newLevel = currentPlayer.level + 1;
    const newXpToNextLevel = Math.floor(currentPlayer.xpToNextLevel * 1.5);

    // Increase attributes slightly on level up (1 point distributed cyclically or just +1 to all every few levels? Let's do simple scaling)
    // Every level grants +1 to all attributes to keep it powerful
    const newAttributes = {
        strength: currentPlayer.attributes.strength + 1,
        intelligence: currentPlayer.attributes.intelligence + 1,
        agility: currentPlayer.attributes.agility + 1,
        charisma: currentPlayer.attributes.charisma + 1,
    };

    let tempPlayer: Player = {
        ...currentPlayer,
        level: newLevel,
        attributes: newAttributes,
        xp: currentPlayer.xp - currentPlayer.xpToNextLevel,
        xpToNextLevel: newXpToNextLevel,
    };
    
    const derivedStats = calculatePlayerDerivedStats(tempPlayer);
    
    // Full heal on level up
    const updatedPlayer = {
        ...tempPlayer,
        ...derivedStats,
        hp: derivedStats.maxHp!,
        mp: derivedStats.maxMp!,
        sp: derivedStats.maxSp!,
        ep: derivedStats.maxEp!,
    };

    const logs = [
        `LEVEL UP! You are now level ${newLevel}!`,
        `Your attributes increased! HP, MP, SP, EP, ATK, DEF, and Luck have improved.`
    ];

    return { updatedPlayer, logs };
};

const applyStatusEffect = (target: Player | Enemy, effect: StatusEffect): { target: Player | Enemy, log: string } => {
    const newTarget = { ...target };
    const existingEffectIndex = newTarget.statusEffects.findIndex(e => e.type === effect.type);

    if (existingEffectIndex !== -1) {
        newTarget.statusEffects[existingEffectIndex] = { ...newTarget.statusEffects[existingEffectIndex], duration: effect.duration };
    } else {
        newTarget.statusEffects.push(effect);
    }
    
    const logMessage = `${target.name} is afflicted with ${STATUS_EFFECT_CONFIG[effect.type].name}!`;

    return { target: newTarget, log: logMessage };
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
        const { name, className, attributes, abilities, portrait } = action.payload;

        let startingPlayer: Player = {
            ...initialState.player,
            name,
            className,
            attributes,
            abilities,
            portrait,
            statusEffects: [],
            journal: { quests: [], flags: [], notes: [], history: [`Started adventure as ${name} the ${className}.`] },
        };

        // Calculate initial derived stats based on choices
        const derived = calculatePlayerDerivedStats(startingPlayer);
        startingPlayer = {
            ...startingPlayer,
            ...derived,
            hp: derived.maxHp!,
            mp: derived.maxMp!,
            ep: derived.maxEp!,
            sp: derived.maxSp!
        };

        return {
            ...state,
            player: startingPlayer,
            gameState: GameState.LOADING,
            worldData: null,
            playerLocationId: null,
            log: [`The adventure of ${name} the ${className} begins...`],
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
        
        // 1. Consume Resources
        if (abilityDetails.resource === 'MP') newPlayerState.mp = (newPlayerState.mp || 0) - abilityDetails.cost;
        if (abilityDetails.resource === 'EP') newPlayerState.ep = (newPlayerState.ep || 0) - abilityDetails.cost;
        if (abilityDetails.resource === 'SP') newPlayerState.sp = (newPlayerState.sp || 0) - abilityDetails.cost;
        
        // 2. Apply Healing (Self)
        if (abilityDetails.healAmount && abilityDetails.healAmount > 0) {
            const healVal = Math.floor(newPlayerState.attributes.intelligence * abilityDetails.healAmount);
            newPlayerState.hp = Math.min(newPlayerState.maxHp, newPlayerState.hp + healVal);
            newLog = appendToLog(newLog, `You cast ${abilityDetails.name} and heal for ${healVal} HP.`);
        } 

        // 3. Handle Special Abilities (Befriend)
        if (abilityDetails.name === PlayerAbility.BEFRIEND) {
             const successChance = 0.3 + (state.player.luck * 0.03); // 30% base + 3% per Luck
             const roll = Math.random();
             
             if (roll < successChance) {
                 newLog = appendToLog(newLog, `You successfully befriended the ${target.name}! It leaves you a gift and departs peacefully.`);
                 
                 // Give Loot
                 if (target.loot) {
                     newPlayerState.inventory = addItemToInventory(newPlayerState.inventory, target.loot);
                     newLog = appendToLog(newLog, `The ${target.name} gave you a ${target.loot.name}!`);
                 }
                 
                 // Give XP (Half kill XP?)
                 const xpGain = Math.floor(target.maxHp / 2);
                 newPlayerState.xp += xpGain;
                 newLog = appendToLog(newLog, `You gained ${xpGain} XP.`);

                 // Remove Enemy
                 newEnemies.splice(targetIndex, 1);
                 
                 // Check Level Up immediately
                 if (newPlayerState.xp >= newPlayerState.xpToNextLevel) {
                    const { updatedPlayer: leveledUpPlayer, logs: levelUpLogs } = handleLevelUp(newPlayerState);
                    newPlayerState = leveledUpPlayer;
                    levelUpLogs.forEach(l => newLog = appendToLog(newLog, l));
                 }

                 // If all enemies gone, combat ends automatically by GameEngine loop checking enemies length
             } else {
                 newLog = appendToLog(newLog, `You failed to befriend the ${target.name}. It seems annoyed!`);
                 // Penalty: Enemy gets a buff? Or just turn waste.
                 // Let's make it Enraged (Attack buff)
                 // We don't have an Enraged status, but we can just say it attacks next turn.
             }
        }
        
        // 4. Apply Damage (Target)
        // Only if damageMultiplier > 0, to separate pure buffs from attacks
        if (abilityDetails.damageMultiplier > 0) {
            let damage = Math.floor(state.player.attack * abilityDetails.damageMultiplier + (Math.random() * 5));

            if (target.element && ELEMENTAL_RESISTANCES[target.element] === abilityDetails.element) {
                damage = Math.floor(damage / 2);
                newLog = appendToLog(newLog, `${target.name} resists the ${abilityDetails.element} attack!`);
            }

            if (target.statusEffects.some(e => e.type === StatusEffectType.GROUNDED)) {
                damage = Math.floor(damage * (1 + STATUS_EFFECT_CONFIG.GROUNDED.defenseReduction));
            }
            
            const damageTaken = target.isShielded ? Math.floor(damage / 2) : damage;
            const newHp = Math.max(0, target.hp - damageTaken);
            newEnemies[targetIndex] = { ...target, hp: newHp };
            newLog = appendToLog(newLog, `You use ${abilityDetails.name} on ${target.name} for ${damageTaken} damage!`);
            
            if (newHp <= 0) {
                 newLog = appendToLog(newLog, `${target.name} is defeated!`);
            }
        }

        // 4. Apply Status Effects
        if (abilityDetails.statusEffect && Math.random() < (abilityDetails.statusChance || 0)) {
            // Self-Targeting Status Effects
            if (abilityDetails.statusEffect === StatusEffectType.EARTH_ARMOR) {
                const { target: updatedPlayer, log: effectLog } = applyStatusEffect(newPlayerState, {
                    type: StatusEffectType.EARTH_ARMOR,
                    duration: STATUS_EFFECT_CONFIG.EARTH_ARMOR.duration,
                });
                newPlayerState = updatedPlayer as Player;
                newLog = appendToLog(newLog, effectLog);
            } 
            // Enemy-Targeting Status Effects (Only if target is alive)
            else if (newEnemies[targetIndex].hp > 0) {
                 const effect: StatusEffect = {
                    type: abilityDetails.statusEffect,
                    duration: STATUS_EFFECT_CONFIG[abilityDetails.statusEffect].duration,
                };
                if (effect.type === StatusEffectType.BURN) {
                    effect.sourceAttack = state.player.attack;
                }
                const { target: updatedTarget, log: effectLog } = applyStatusEffect(newEnemies[targetIndex], effect);
                newEnemies[targetIndex] = updatedTarget as Enemy;
                newLog = appendToLog(newLog, effectLog);
            }
        }

        return { ...state, player: newPlayerState, enemies: newEnemies, log: newLog };
    }

    case 'ADD_ITEM_TO_INVENTORY':
        return {
            ...state,
            player: { ...state.player, inventory: addItemToInventory(state.player.inventory, action.payload) }
        };

    case 'PROCESS_COMBAT_VICTORY': {
        const { xpGained, loot, regen } = action.payload;
        
        let newLog = [...state.log];
        newLog = appendToLog(newLog, 'VICTORY! All enemies defeated!');
        if(xpGained > 0) newLog = appendToLog(newLog, `You gained ${xpGained} XP!`);
        
        let newInventory = [...state.player.inventory];
        loot.forEach(item => {
            newLog = appendToLog(newLog, `You obtained a ${item.name}!`);
            newInventory = addItemToInventory(newInventory, item);
        });
        
        let updatedPlayer: Player = {
            ...state.player,
            xp: state.player.xp + xpGained,
            inventory: newInventory,
            hp: Math.min(state.player.maxHp, state.player.hp + regen.hp),
            mp: Math.min(state.player.maxMp || 0, (state.player.mp || 0) + regen.mp),
            ep: Math.min(state.player.maxEp || 0, (state.player.ep || 0) + regen.ep),
            sp: Math.min(state.player.maxSp || 0, (state.player.sp || 0) + regen.sp),
            statusEffects: [], 
        };

        if (regen.hp > 0) newLog = appendToLog(newLog, `Recovered ${regen.hp} HP.`);
        if (regen.mp > 0) newLog = appendToLog(newLog, `Recovered ${regen.mp} MP.`);
        if (regen.ep > 0) newLog = appendToLog(newLog, `Recovered ${regen.ep} EP.`);
        if (regen.sp > 0) newLog = appendToLog(newLog, `Recovered ${regen.sp} Stamina.`);
        
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

    case 'EQUIP_ITEM': {
        const itemIndex = action.payload.inventoryIndex;
        const itemToEquip = state.player.inventory[itemIndex];
        
        let targetSlot = itemToEquip.slot;
        if (!targetSlot) {
            if (itemToEquip.type === ItemType.WEAPON) targetSlot = EquipmentSlot.MAIN_HAND;
            else if (itemToEquip.type === ItemType.ARMOR) targetSlot = EquipmentSlot.BODY;
            else return state; // Cannot equip this type
        }

        let newInventory = [...state.player.inventory];
        let newEquipment = { ...state.player.equipment };
        let newLog = [...state.log];

        if (newEquipment[targetSlot]) {
            const unequippedItem = newEquipment[targetSlot]!;
            newInventory = addItemToInventory(newInventory, unequippedItem);
            newLog = appendToLog(newLog, `Unequipped ${unequippedItem.name}.`);
        }

        newEquipment[targetSlot] = { ...itemToEquip, quantity: 1, slot: targetSlot }; // Ensure slot is set on the item
        newLog = appendToLog(newLog, `Equipped ${itemToEquip.name}.`);

        const itemStack = { ...newInventory[itemIndex] };
        itemStack.quantity -= 1;
        if (itemStack.quantity <= 0) {
            newInventory.splice(itemIndex, 1);
        } else {
            newInventory[itemIndex] = itemStack;
        }

        let tempPlayer = { ...state.player, inventory: newInventory, equipment: newEquipment };
        const derived = calculatePlayerDerivedStats(tempPlayer);

        return {
            ...state,
            player: { ...tempPlayer, ...derived },
            log: newLog
        };
    }

    case 'UNEQUIP_ITEM': {
        const slot = action.payload.slot;
        if (!state.player.equipment[slot]) return state;

        let newEquipment = { ...state.player.equipment };
        const itemToUnequip = newEquipment[slot]!;
        delete newEquipment[slot];

        let newInventory = addItemToInventory(state.player.inventory, itemToUnequip);
        
        let tempPlayer = { ...state.player, inventory: newInventory, equipment: newEquipment };
        const derived = calculatePlayerDerivedStats(tempPlayer);

        return {
            ...state,
            player: { ...tempPlayer, ...derived },
            log: appendToLog(state.log, `Unequipped ${itemToUnequip.name}.`)
        };
    }

    case 'CRAFT_ITEM': {
        const { recipe } = action.payload;
        let newInventory = [...state.player.inventory];
        let newLog = [...state.log];

        for (const ingredient of recipe.ingredients) {
            newInventory = removeItemFromInventory(newInventory, ingredient.name, ingredient.quantity);
        }
        newInventory = addItemToInventory(newInventory, recipe.result);
        newLog = appendToLog(newLog, `Crafted ${recipe.result.name}!`);

        return {
            ...state,
            player: { ...state.player, inventory: newInventory },
            log: newLog
        };
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
        const healAmount = Math.floor(damage * 0.5); 
        
        const newEnemyHp = Math.min(enemy.maxHp, enemy.hp + healAmount);
        enemiesCopy[enemyIndex] = { ...enemy, hp: newEnemyHp };

        return { ...state, enemies: enemiesCopy };
    }

    case 'ENEMY_ACTION_SHIELD': {
      const { enemyIndex } = action.payload;
      const enemiesCopy = [...state.enemies];
      enemiesCopy[enemyIndex] = { ...enemiesCopy[enemyIndex], isShielded: true };
      return { ...state, enemies: enemiesCopy };
    }

    case 'APPLY_STATUS_EFFECT': {
        let newLog = [...state.log];
        if (action.payload.target === 'player') {
            const { target: updatedPlayer, log: effectLog } = applyStatusEffect(state.player, action.payload.effect);
            newLog = appendToLog(newLog, effectLog);
            return { ...state, player: updatedPlayer as Player, log: newLog };
        } else if (action.payload.target === 'enemy' && action.payload.index !== undefined) {
            const newEnemies = [...state.enemies];
            const { target: updatedEnemy, log: effectLog } = applyStatusEffect(newEnemies[action.payload.index], action.payload.effect);
            newEnemies[action.payload.index] = updatedEnemy as Enemy;
            newLog = appendToLog(newLog, effectLog);
            return { ...state, enemies: newEnemies, log: newLog };
        }
        return state;
    }

    case 'PROCESS_TURN_EFFECTS': {
        let newLog = [...state.log];
        let newPlayer = { ...state.player };
        let newEnemies = [...state.enemies];

        const processTarget = (target: Player | Enemy): { updatedTarget: Player | Enemy; logs: string[] } => {
            let logs: string[] = [];
            let updatedTarget = { ...target, statusEffects: [...target.statusEffects] };
            let currentHp = 'hp' in updatedTarget ? updatedTarget.hp : 0;
            
            const remainingEffects: StatusEffect[] = [];

            for (const effect of updatedTarget.statusEffects) {
                switch(effect.type) {
                    case StatusEffectType.BURN:
                        const burnDamage = Math.floor((effect.sourceAttack || 5) * 0.5);
                        currentHp = Math.max(0, currentHp - burnDamage);
                        logs.push(`${updatedTarget.name} takes ${burnDamage} damage from Burn!`);
                        break;
                }

                const newDuration = effect.duration - 1;
                if (newDuration > 0) {
                    remainingEffects.push({ ...effect, duration: newDuration });
                } else {
                    logs.push(`${STATUS_EFFECT_CONFIG[effect.type].name} has worn off from ${updatedTarget.name}.`);
                }
            }
            
            updatedTarget.hp = currentHp;
            updatedTarget.statusEffects = remainingEffects;
            return { updatedTarget, logs };
        };
        
        if (action.payload.target === 'player') {
            const { updatedTarget, logs } = processTarget(state.player);
            newPlayer = updatedTarget as Player;
            logs.forEach(l => newLog = appendToLog(newLog, l));
        } else if (action.payload.target === 'enemy' && action.payload.index !== undefined) {
            const { updatedTarget, logs } = processTarget(state.enemies[action.payload.index]);
            newEnemies[action.payload.index] = updatedTarget as Enemy;
            logs.forEach(l => newLog = appendToLog(newLog, l));
        }

        return { ...state, player: newPlayer, enemies: newEnemies, log: newLog };
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
        let newJournal = { ...state.player.journal };

        if (choice.flagUpdate) {
            if (!newJournal.flags.includes(choice.flagUpdate)) {
                newJournal.flags = [...newJournal.flags, choice.flagUpdate];
            }
        }
        
        if (choice.questUpdate) {
             const qIndex = newJournal.quests.findIndex(q => q.id === choice.questUpdate!.questId);
             if (qIndex !== -1) {
                 const updatedQuests = [...newJournal.quests];
                 updatedQuests[qIndex] = { 
                     ...updatedQuests[qIndex], 
                     status: choice.questUpdate!.status,
                     outcome: choice.questUpdate!.outcome || choice.outcome,
                     rewardText: choice.questUpdate!.rewardText
                 };
                 newJournal.quests = updatedQuests;
                 const statusText = choice.questUpdate!.status === 'COMPLETED' ? 'Completed' : 'Failed';
                 newLog = appendToLog(newLog, `Quest ${statusText}: ${updatedQuests[qIndex].title}`);
             }
        }

        // Add to history
        newJournal.history = [...(newJournal.history || [])];
        if (newJournal.history.length > 10) newJournal.history.shift();
        newJournal.history.push(choice.outcome);

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
                case RewardType.QUEST:
                    if (choice.reward.quest) {
                        if (!newJournal.quests.some(q => q.id === choice.reward.quest!.id)) {
                             newJournal.quests = [...newJournal.quests, choice.reward.quest];
                             newLog = appendToLog(newLog, `Quest Started: ${choice.reward.quest.title}`);
                             newJournal.history.push(`Started quest: ${choice.reward.quest.title}`);
                        }
                    }
                    break;
            }
        }
        
        updatedPlayer.inventory = newInventory;
        updatedPlayer.journal = newJournal;

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

    case 'ADD_QUEST': {
        const newJournal = { ...state.player.journal };
        if (!newJournal.quests.some(q => q.id === action.payload.id)) {
            newJournal.quests = [...newJournal.quests, action.payload];
            return {
                ...state,
                player: { ...state.player, journal: newJournal },
                log: appendToLog(state.log, `Quest Started: ${action.payload.title}`)
            };
        }
        return state;
    }

    case 'UPDATE_QUEST_STATUS': {
        const newJournal = { ...state.player.journal };
        const questIndex = newJournal.quests.findIndex(q => q.id === action.payload.questId);
        if (questIndex !== -1) {
            const updatedQuests = [...newJournal.quests];
            updatedQuests[questIndex] = { 
                ...updatedQuests[questIndex], 
                status: action.payload.status,
                outcome: action.payload.outcome,
                rewardText: action.payload.rewardText
            };
            newJournal.quests = updatedQuests;
            
            let logMsg = '';
            if (action.payload.status === 'COMPLETED') logMsg = `Quest Completed: ${updatedQuests[questIndex].title}`;
            if (action.payload.status === 'FAILED') logMsg = `Quest Failed: ${updatedQuests[questIndex].title}`;
            
            return {
                ...state,
                player: { ...state.player, journal: newJournal },
                log: logMsg ? appendToLog(state.log, logMsg) : state.log
            };
        }
        return state;
    }

    case 'ADD_JOURNAL_FLAG': {
         const newJournal = { ...state.player.journal };
         if (!newJournal.flags.includes(action.payload)) {
             newJournal.flags = [...newJournal.flags, action.payload];
             return { ...state, player: { ...state.player, journal: newJournal } };
         }
         return state;
    }

    case 'ADD_NARRATIVE_HISTORY': {
        const newJournal = { ...state.player.journal };
        const newHistory = [...(newJournal.history || [])];
        // Sliding window: keep last 10 events
        if (newHistory.length >= 10) {
            newHistory.shift();
        }
        newHistory.push(action.payload);
        newJournal.history = newHistory;
        
        return {
            ...state,
            player: { ...state.player, journal: newJournal }
        };
    }

    case 'SAVE_SCENE_STATE':
        return {
            ...state,
            preCombatState: {
                description: state.storyText,
                actions: state.actions
            }
        };

    case 'RESTORE_SCENE_STATE':
        if (state.preCombatState) {
            let desc = state.preCombatState.description;
            if (action.payload?.appendText) {
                desc += ` ${action.payload.appendText}`;
            }
            return {
                ...state,
                storyText: desc,
                actions: state.preCombatState.actions,
                preCombatState: null,
                gameState: GameState.EXPLORING // Ensure we return to exploring
            };
        }
        return state;

    default:
      return state;
  }
};

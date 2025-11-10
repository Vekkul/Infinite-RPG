import React, { useState, useEffect, useCallback, useRef, useReducer } from 'react';
import { GameState, Player, Enemy, GameAction, Item, ItemType, SaveData, CharacterClass, EnemyAbility, SocialChoice, AIPersonality } from './types';
import { generateScene, generateEncounter, generateSocialEncounter, generateWorldData, generateExploreResult } from './services/geminiService';
import { Inventory } from './components/Inventory';
import { reducer } from './state/reducer';
import { initialState } from './state/initialState';
import { StartScreen } from './components/views/StartScreen';
import { CharacterCreationScreen } from './components/views/CharacterCreationScreen';
import { LoadingScreen } from './components/views/LoadingScreen';
import { GameOverScreen } from './components/views/GameOverScreen';
import { ExploringView } from './components/views/ExploringView';
import { CombatView } from './components/views/CombatView';
import { SocialEncounterView } from './components/views/SocialEncounterView';
import { WorldMapView } from './components/views/WorldMapView';
import { StatusBar } from './components/StatusBar';
import { HeartIcon, StarIcon, SaveIcon, BoltIcon, FireIcon, MapIcon } from './components/icons';
import { JRPG_SAVE_KEY, CRIT_CHANCE, CRIT_MULTIPLIER, FLEE_CHANCE, TRAVEL_ENCOUNTER_CHANCE } from './constants';

const App: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { gameState, player, enemies, storyText, actions, log, isPlayerTurn, socialEncounter, worldData, playerLocationId } = state;

    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [saveFileExists, setSaveFileExists] = useState(false);
    const [isResolvingCombat, setIsResolvingCombat] = useState(false);
    const [isGeneratingPostCombatScene, setIsGeneratingPostCombatScene] = useState(false);
    const [isGeneratingPostSocialScene, setIsGeneratingPostSocialScene] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);

    const logRef = useRef<HTMLDivElement>(null);
    const enemyTurnInProgress = useRef(false);
    const prevLevelRef = useRef(player.level);
    const isInitialMount = useRef(true);
    const prevPlayerLocationId = useRef<string | null>(null);

    useEffect(() => {
        const savedData = localStorage.getItem(JRPG_SAVE_KEY);
        setSaveFileExists(!!savedData);
    }, []);

    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [log]);

    useEffect(() => {
        if (player.level > prevLevelRef.current) {
            setShowLevelUp(true);
            const timer = setTimeout(() => setShowLevelUp(false), 3000); // Duration of the animation
            return () => clearTimeout(timer);
        }
        prevLevelRef.current = player.level;
    }, [player.level]);
    
    const appendToLog = useCallback((message: string) => {
        dispatch({ type: 'ADD_LOG', payload: message });
    }, []);

    const handleFallback = useCallback(() => {
        appendToLog('A strange energy interferes with your perception...');
    }, [appendToLog]);
    
    const handleFoundItem = useCallback((itemDef: Omit<Item, 'quantity'>) => {
        appendToLog(`You found a ${itemDef.name}!`);
        dispatch({ type: 'ADD_ITEM_TO_INVENTORY', payload: itemDef });
    }, [appendToLog]);

    const startNewGame = useCallback(() => {
        dispatch({ type: 'START_NEW_GAME' });
    }, []);

    const handleCharacterCreation = useCallback(async (details: { name: string; class: CharacterClass; portrait: string }) => {
        dispatch({ type: 'CREATE_CHARACTER', payload: details });
        
        const newWorldData = await generateWorldData();
        if (!newWorldData) {
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.START_SCREEN });
            appendToLog("Error: Could not generate a new world. Please try again.");
            return;
        }
        dispatch({ type: 'SET_WORLD_DATA', payload: newWorldData });

        const startLocation = newWorldData.locations.find(l => l.id === newWorldData.startLocationId);
        if (startLocation) {
            const tempPlayer = { ...initialState.player, name: details.name, class: details.class, portrait: details.portrait };
            const { description, actions, foundItem, isFallback } = await generateScene(tempPlayer, startLocation);
            
            if (isFallback) handleFallback();

            const moveActions = newWorldData.connections
                .filter(c => c.from === startLocation.id || c.to === startLocation.id)
                .map(c => {
                    const targetId = c.from === startLocation.id ? c.to : c.from;
                    const targetLocation = newWorldData.locations.find(l => l.id === targetId);
                    return {
                        label: `Go to ${targetLocation?.name || '???' }`,
                        type: 'move' as const,
                        targetLocationId: targetId
                    };
                });
            const allActions = [...actions, ...moveActions];

            dispatch({ type: 'SET_SCENE', payload: { description: description, actions: allActions } });
            if (foundItem) {
                handleFoundItem(foundItem);
            }
        }
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [handleFoundItem, appendToLog, handleFallback]);

    const saveGame = useCallback(() => {
        if (!worldData || !playerLocationId) return;
        const saveData: SaveData = { player, storyText, actions, log, worldData, playerLocationId };
        localStorage.setItem(JRPG_SAVE_KEY, JSON.stringify(saveData));
        setSaveFileExists(true);
        appendToLog('Game Saved!');
    }, [player, storyText, actions, log, worldData, playerLocationId, appendToLog]);

    const loadGame = useCallback(() => {
        const savedDataString = localStorage.getItem(JRPG_SAVE_KEY);
        if (savedDataString) {
            const savedData: SaveData = JSON.parse(savedDataString);
            dispatch({ type: 'LOAD_GAME', payload: savedData });
        } else {
            appendToLog('No save file found.');
        }
    }, [appendToLog]);

    const handleAction = useCallback(async (action: GameAction) => {
        if (action.type === 'move' && action.targetLocationId) {
            dispatch({ type: 'MOVE_PLAYER', payload: action.targetLocationId });
            return;
        }
    
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You decide to ${action.label.toLowerCase()}...`);
    
        if (action.type === 'encounter') {
            const { enemies: newEnemies, isFallback } = await generateEncounter(player);
            if (isFallback) handleFallback();
            const enemyNames = newEnemies.map(e => e.name).join(', ');
            dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
            dispatch({ type: 'SET_SCENE', payload: { description: `A wild ${enemyNames} appeared!`, actions: [] } });
            appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        } else if (action.type === 'explore') {
            const result = await generateExploreResult(player, action);
            if (result.isFallback) handleFallback();
            appendToLog(result.outcome);
    
            if (result.foundItem) {
                handleFoundItem(result.foundItem);
            }
    
            if (result.triggerCombat) {
                const { enemies: newEnemies, isFallback } = await generateEncounter(player);
                if (isFallback) handleFallback();
                const enemyNames = newEnemies.map(e => e.name).join(', ');
                dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                dispatch({ type: 'SET_SCENE', payload: { description: `${result.outcome} Suddenly, a ${enemyNames} attacks!`, actions: [] } });
                appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                dispatch({ type: 'SET_PLAYER_TURN', payload: true });
            } else if (result.triggerSocial) {
                const { encounter: socialEncounter, isFallback } = await generateSocialEncounter(player);
                if (isFallback) handleFallback();
                // Combine outcome with social encounter description for context
                socialEncounter.description = `${result.outcome} ${socialEncounter.description}`;
                dispatch({ type: 'SET_SOCIAL_ENCOUNTER', payload: socialEncounter });
            } else {
                // Narrative only. Regenerate the scene with the new outcome as description.
                const currentLocation = worldData?.locations.find(l => l.id === playerLocationId);
                if (currentLocation) {
                    const { actions: localActions, foundItem, isFallback } = await generateScene(player, currentLocation);
                    if(isFallback) handleFallback();
                    
                    const moveActions = worldData.connections
                        .filter(c => c.from === playerLocationId || c.to === playerLocationId)
                        .map(c => {
                            const targetId = c.from === playerLocationId ? c.to : c.from;
                            const targetLocation = worldData.locations.find(l => l.id === targetId);
                            return { label: `Go to ${targetLocation?.name || '???' }`, type: 'move' as const, targetLocationId: targetId };
                        });
    
                    dispatch({ type: 'SET_SCENE', payload: { description: result.outcome, actions: [...localActions, ...moveActions] } });
    
                    if (foundItem) {
                        handleFoundItem(foundItem);
                    }
                }
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
            }
        }
    }, [player, appendToLog, handleFoundItem, worldData, playerLocationId, handleFallback]);

    // This effect handles the logic for moving between locations.
    useEffect(() => {
        // We use a ref to track the previous location to distinguish
        // between a game load (prev is null) and an actual move (prev is not null).
        const prevLocationId = prevPlayerLocationId.current;
        
        // Update the ref for the next render cycle.
        prevPlayerLocationId.current = playerLocationId;

        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        // Only trigger move logic if the location ID has actually changed from
        // one valid location to another. This prevents firing on game load,
        // where the previous location ID would be null.
        if (prevLocationId && prevLocationId !== playerLocationId) {
            if (playerLocationId && worldData) {
                const move = async () => {
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });

                    const newLocation = worldData.locations.find(l => l.id === playerLocationId);
                    if (!newLocation) return;
                    
                    appendToLog(`You travel to ${newLocation.name}...`);
                    
                    if (Math.random() < TRAVEL_ENCOUNTER_CHANCE) {
                        const { enemies: newEnemies, isFallback } = await generateEncounter(player);
                        if (isFallback) handleFallback();
                        const enemyNames = newEnemies.map(e => e.name).join(', ');
                        dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                        dispatch({ type: 'SET_SCENE', payload: { description: `While traveling to ${newLocation.name}, you are ambushed by a ${enemyNames}!`, actions: [] } });
                        appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
                        dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                        dispatch({ type: 'SET_PLAYER_TURN', payload: true });
                    } else {
                        const { description, actions: localActions, foundItem, isFallback } = await generateScene(player, newLocation);
                        if (isFallback) handleFallback();
                         const moveActions = worldData.connections
                            .filter(c => c.from === playerLocationId || c.to === playerLocationId)
                            .map(c => {
                                const targetId = c.from === playerLocationId ? c.to : c.from;
                                const targetLocation = worldData.locations.find(l => l.id === targetId);
                                return {
                                    label: `Go to ${targetLocation?.name || '???' }`,
                                    type: 'move' as const,
                                    targetLocationId: targetId
                                };
                            });
                        dispatch({ type: 'SET_SCENE', payload: { description, actions: [...localActions, ...moveActions] } });
                        if (foundItem) handleFoundItem(foundItem);
                        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                    }
                };
                move();
            }
        }
    }, [playerLocationId, worldData, player, appendToLog, handleFoundItem, handleFallback]);

    const handleUseItem = useCallback((item: Item, index: number) => {
        if (item.type === ItemType.POTION) {
            const healAmount = item.value || 0;
            const newHp = Math.min(player.maxHp, player.hp + healAmount);
            const healed = newHp - player.hp;

            if (healed > 0) {
                dispatch({type: 'USE_ITEM', payload: { inventoryIndex: index }});
                dispatch({ type: 'UPDATE_PLAYER', payload: { hp: newHp } });

                appendToLog(`You use a ${item.name} and recover ${healed} HP.`);
                setIsInventoryOpen(false);

                // Using an item in combat should end the player's turn.
                if (gameState === GameState.COMBAT) {
                    dispatch({ type: 'SET_PLAYER_TURN', payload: false });
                }
            } else {
                appendToLog(`Your HP is already full!`);
            }
        }
    }, [player, appendToLog, gameState]);

    const handleCombatAction = useCallback(async (action: 'attack' | 'defend' | 'flee' | 'ability', payload?: any) => {
        if (!isPlayerTurn || enemies.length === 0) return;
        
        dispatch({ type: 'SET_PLAYER_TURN', payload: false });
        dispatch({ type: 'UPDATE_PLAYER', payload: { isDefending: false } });

        if (action === 'attack' && payload.targetIndex !== undefined) {
            const target = enemies[payload.targetIndex];
            const isCrit = Math.random() < CRIT_CHANCE;
            let damage = Math.floor(player.attack + (Math.random() * 5 - 2));
            if (isCrit) {
                damage = Math.floor(damage * CRIT_MULTIPLIER);
            }
            const damageTaken = target.isShielded ? Math.floor(damage / 2) : damage;
            const newHp = Math.max(0, target.hp - damageTaken);
            
            payload.onDamageDealt?.(damageTaken, isCrit);

            dispatch({ type: 'UPDATE_ENEMY', payload: { index: payload.targetIndex, data: { hp: newHp } } });
            appendToLog(`You attack ${target.name} for ${damageTaken} damage! ${isCrit ? 'CRITICAL HIT!' : ''}`);
            if (newHp <= 0) {
                appendToLog(`${target.name} is defeated!`);
            }
        } else if (action === 'ability' && payload.targetIndex !== undefined) {
            dispatch({ type: 'PLAYER_ACTION_ABILITY', payload });
        } else if (action === 'defend') {
            dispatch({ type: 'PLAYER_ACTION_DEFEND' });
        } else if (action === 'flee') {
            if (Math.random() < FLEE_CHANCE) {
                appendToLog('You successfully escaped!');
                const currentLocation = worldData?.locations.find(l => l.id === playerLocationId);
                if (currentLocation) {
                    const { description, actions: localActions, foundItem, isFallback } = await generateScene(player, currentLocation);
                    if (isFallback) handleFallback();
                     const moveActions = worldData.connections
                        .filter(c => c.from === playerLocationId || c.to === playerLocationId)
                        .map(c => {
                            const targetId = c.from === playerLocationId ? c.to : c.from;
                            const targetLocation = worldData.locations.find(l => l.id === targetId);
                            return {
                                label: `Go to ${targetLocation?.name || '???' }`,
                                type: 'move' as const,
                                targetLocationId: targetId
                            };
                        });

                    dispatch({ type: 'SET_SCENE', payload: { description, actions: [...localActions, ...moveActions] } });
                    if (foundItem) handleFoundItem(foundItem);
                }
                dispatch({ type: 'SET_ENEMIES', payload: [] });
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                return;
            } else {
                dispatch({ type: 'PLAYER_ACTION_FLEE_FAILURE' });
            }
        }
    }, [player, enemies, appendToLog, handleFoundItem, isPlayerTurn, worldData, playerLocationId, handleFallback]);

    const handleSocialChoice = useCallback((choice: SocialChoice) => {
        dispatch({ type: 'RESOLVE_SOCIAL_CHOICE', payload: { choice } });
        setIsGeneratingPostSocialScene(true);
    }, []);

    const handleEnemyTurns = useCallback(async () => {
        enemyTurnInProgress.current = true;
        let currentHp = player.hp;

        const determineEnemyAction = (enemy: Enemy): 'attack' | EnemyAbility | null => {
            if (!enemy.ability) return 'attack';

            const hpPercent = enemy.hp / enemy.maxHp;

            switch (enemy.aiPersonality) {
                case AIPersonality.DEFENSIVE:
                    if (hpPercent < 0.5 && (enemy.ability === EnemyAbility.HEAL || enemy.ability === EnemyAbility.SHIELD)) {
                        if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack'; // Don't shield if already shielded
                        return enemy.ability;
                    }
                    return 'attack';

                case AIPersonality.STRATEGIC:
                    if (hpPercent < 0.3 && enemy.ability === EnemyAbility.HEAL) {
                        return EnemyAbility.HEAL;
                    }
                    if (hpPercent < 0.7 && !enemy.isShielded && enemy.ability === EnemyAbility.SHIELD && Math.random() < 0.8) {
                        return EnemyAbility.SHIELD;
                    }
                    if ((enemy.ability === EnemyAbility.DRAIN_LIFE || enemy.ability === EnemyAbility.MULTI_ATTACK) && Math.random() < 0.4) {
                        return enemy.ability;
                    }
                    return 'attack';
                
                case AIPersonality.WILD:
                    if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack';
                    if (Math.random() < 0.5) {
                        return enemy.ability;
                    }
                    return 'attack';

                case AIPersonality.AGGRESSIVE:
                default:
                    if ((enemy.ability === EnemyAbility.DRAIN_LIFE || enemy.ability === EnemyAbility.MULTI_ATTACK) && Math.random() < 0.3) {
                        return enemy.ability;
                    }
                    if ((enemy.ability === EnemyAbility.HEAL || enemy.ability === EnemyAbility.SHIELD) && Math.random() < 0.15) {
                        if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack';
                        return enemy.ability;
                    }
                    return 'attack';
            }
        };

        for (let i = 0; i < enemies.length; i++) {
                if (enemies[i].hp > 0 && currentHp > 0) { 
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const enemy = enemies[i];
                
                if (enemy.isShielded) {
                    dispatch({ type: 'UPDATE_ENEMY', payload: { index: i, data: { isShielded: false } } });
                    appendToLog(`${enemy.name}'s shield fades.`);
                }
                
                const actionToTake = determineEnemyAction(enemy);

                if (actionToTake !== 'attack' && actionToTake !== null) {
                        appendToLog(`${enemy.name} uses ${actionToTake}!`);
                    switch (actionToTake) {
                        case EnemyAbility.HEAL:
                            const healAmount = Math.floor(enemy.maxHp * 0.25); // Heal for 25%
                            dispatch({ type: 'ENEMY_ACTION_HEAL', payload: { enemyIndex: i, healAmount } });
                            appendToLog(`${enemy.name} recovers ${healAmount} HP.`);
                            break;
                        case EnemyAbility.SHIELD:
                            dispatch({ type: 'ENEMY_ACTION_SHIELD', payload: { enemyIndex: i } });
                            appendToLog(`${enemy.name} raises a magical shield!`);
                            break;
                        case EnemyAbility.DRAIN_LIFE:
                            const drainDamage = Math.floor(enemy.attack * 0.8 + (Math.random() * 4 - 2));
                            const playerDamageTakenDrain = player.isDefending ? Math.max(1, Math.floor(drainDamage / 2)) : drainDamage;
                            currentHp = Math.max(0, currentHp - playerDamageTakenDrain);
                            dispatch({ type: 'UPDATE_PLAYER', payload: { hp: currentHp } });
                            dispatch({type: 'ENEMY_ACTION_DRAIN_LIFE', payload: { enemyIndex: i, damage: playerDamageTakenDrain }})
                            appendToLog(`${enemy.name} drains ${playerDamageTakenDrain} HP from you!`);
                            break;
                        case EnemyAbility.MULTI_ATTACK:
                            for (let j=0; j<2; j++) {
                                if(currentHp > 0) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    const multiDamage = Math.floor(enemy.attack * 0.7 + (Math.random() * 3 - 1));
                                    const playerDamageTakenMulti = player.isDefending ? Math.max(1, Math.floor(multiDamage / 2)) : multiDamage;
                                    currentHp = Math.max(0, currentHp - playerDamageTakenMulti);
                                    dispatch({ type: 'UPDATE_PLAYER', payload: { hp: currentHp } });
                                    appendToLog(`${enemy.name} strikes! You take ${playerDamageTakenMulti} damage.`);
                                }
                            }
                            break;
                    }
                } else {
                    // Handle attack
                    const isCrit = Math.random() < CRIT_CHANCE;
                    let enemyDamage = Math.floor(enemy.attack + (Math.random() * 4 - 2));
                    if(isCrit) {
                        enemyDamage = Math.floor(enemyDamage * CRIT_MULTIPLIER);
                    }
                    let playerDamageTaken = player.isDefending ? Math.max(1, Math.floor(enemyDamage / 2)) : enemyDamage;
                    const newPlayerHp = Math.max(0, currentHp - playerDamageTaken);
                    currentHp = newPlayerHp; // Update local HP tracker
                    dispatch({ type: 'UPDATE_PLAYER', payload: { hp: newPlayerHp } });
                    appendToLog(`${enemy.name} attacks! You take ${playerDamageTaken} damage. ${isCrit ? 'CRITICAL!' : ''}`);
                }

                if (currentHp <= 0) {
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.GAME_OVER });
                    appendToLog('You have been defeated...');
                    enemyTurnInProgress.current = false;
                    return; // Stop enemy turns if player is defeated
                }
            }
        }
        // After all enemies have acted
        if (currentHp > 0) { // Check if player is still alive
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        }
        enemyTurnInProgress.current = false;

    }, [enemies, player, appendToLog]);
    
    // Effect to check for victory or trigger enemy turn after player action
    useEffect(() => {
        if (gameState !== GameState.COMBAT || isPlayerTurn || isResolvingCombat || enemyTurnInProgress.current) return;

        const allEnemiesDefeated = enemies.every(e => e.hp <= 0);
        if (allEnemiesDefeated && enemies.length > 0) {
            setIsResolvingCombat(true);
            dispatch({ type: 'COMBAT_VICTORY', payload: { enemies } });
            setIsGeneratingPostCombatScene(true);
            return;
        }

        if (enemies.some(e => e.hp > 0)) {
           handleEnemyTurns();
        }

    }, [isPlayerTurn, enemies, gameState, isResolvingCombat, handleEnemyTurns]);

    const generatePostEventScene = useCallback(async () => {
        if (!worldData || !playerLocationId) return;

        const currentLocation = worldData.locations.find(l => l.id === playerLocationId);
        if (!currentLocation) return;
        
        const { description, actions: localActions, foundItem, isFallback } = await generateScene(player, currentLocation);
        if (isFallback) handleFallback();

        const moveActions = worldData.connections
            .filter(c => c.from === playerLocationId || c.to === playerLocationId)
            .map(c => {
                const targetId = c.from === playerLocationId ? c.to : c.from;
                const targetLocation = worldData.locations.find(l => l.id === targetId);
                return {
                    label: `Go to ${targetLocation?.name || '???' }`,
                    type: 'move' as const,
                    targetLocationId: targetId
                };
            });

        dispatch({ type: 'SET_SCENE', payload: { description, actions: [...localActions, ...moveActions] } });
        if (foundItem) handleFoundItem(foundItem);
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [worldData, playerLocationId, player, handleFoundItem, handleFallback]);
    
    // Effect to generate the next scene after combat state has been fully updated
    useEffect(() => {
        if (isGeneratingPostCombatScene) {
            generatePostEventScene().then(() => {
                dispatch({ type: 'SET_ENEMIES', payload: [] });
                setIsResolvingCombat(false);
                setIsGeneratingPostCombatScene(false);
            });
        }
    }, [isGeneratingPostCombatScene, generatePostEventScene]);

    // Effect to generate the next scene after a social encounter
    useEffect(() => {
        if (isGeneratingPostSocialScene) {
            generatePostEventScene().then(() => {
                setIsGeneratingPostSocialScene(false);
            });
        }
    }, [isGeneratingPostSocialScene, generatePostEventScene]);
    
    const renderGameContent = () => {
        switch (gameState) {
            case GameState.START_SCREEN:
                return <StartScreen onStart={startNewGame} onLoad={loadGame} saveFileExists={saveFileExists} />;
            case GameState.CHARACTER_CREATION:
                return <CharacterCreationScreen onCreate={handleCharacterCreation} />;
            case GameState.LOADING:
                return <LoadingScreen />;
            case GameState.GAME_OVER:
                return <GameOverScreen onRestart={startNewGame} />;
            case GameState.EXPLORING:
                return <ExploringView storyText={storyText} actions={actions} onAction={handleAction} />;
            case GameState.COMBAT:
                return <CombatView 
                    storyText={storyText} 
                    enemies={enemies} 
                    player={player}
                    isPlayerTurn={isPlayerTurn} 
                    onCombatAction={handleCombatAction} 
                />;
            case GameState.SOCIAL_ENCOUNTER:
                return socialEncounter && <SocialEncounterView encounter={socialEncounter} onChoice={handleSocialChoice} />;
            default:
                return null;
        }
    };

    const isScreenState = gameState === GameState.START_SCREEN || gameState === GameState.LOADING || gameState === GameState.GAME_OVER || gameState === GameState.CHARACTER_CREATION;

    return (
        <main className="h-screen w-screen bg-gray-900 text-gray-200 p-4" style={{
            backgroundImage: `radial-gradient(circle, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 1) 70%)`,
        }}>
            <Inventory 
                isOpen={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
                inventory={player.inventory}
                onUseItem={handleUseItem}
                disabled={!isPlayerTurn && gameState === GameState.COMBAT}
            />
            <WorldMapView
                isOpen={isMapOpen}
                onClose={() => setIsMapOpen(false)}
                worldData={worldData}
                playerLocationId={playerLocationId}
            />
            <div className="max-w-7xl mx-auto h-full bg-black/30 rounded-2xl border-4 border-gray-700 shadow-2xl p-4 flex flex-col relative">
                {showLevelUp && (
                    <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none">
                        <h1 className="text-6xl md:text-8xl font-press-start text-yellow-300 animate-level-up" style={{textShadow: '4px 4px 0 #000'}}>
                            LEVEL UP!
                        </h1>
                    </div>
                )}
                <div className={`flex flex-col md:grid md:grid-cols-3 gap-6 h-full p-4 md:p-6 ${isScreenState ? 'md:items-center' : ''}`}>
                    {/* Player Status */}
                    {!isScreenState && (
                        <div className="md:col-span-1 flex flex-col gap-6 order-1 shrink-0">
                            <div className="bg-gray-800/70 p-4 rounded-lg border-2 border-blue-500 shadow-lg">
                                <div className="flex items-center gap-4 border-b-2 border-blue-400 pb-3 mb-4">
                                    {player.portrait && (
                                        <div className="w-20 h-20 bg-black rounded-md border-2 border-gray-600 flex-shrink-0">
                                            <img src={`data:image/png;base64,${player.portrait}`} alt="Player Portrait" className="w-full h-full object-cover rounded-sm" />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-2xl font-press-start text-blue-300 overflow-hidden text-ellipsis whitespace-nowrap" title={player.name}>{player.name}</h2>
                                        <p className="text-lg text-gray-300">{player.class}</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2"><HeartIcon className="w-5 h-5 text-red-500" /> <StatusBar label="HP" currentValue={player.hp} maxValue={player.maxHp} colorClass="bg-red-500" /></div>
                                    {player.class === CharacterClass.MAGE && player.mp !== undefined && player.maxMp !== undefined && (
                                        <div className="flex items-center gap-2"><FireIcon className="w-5 h-5 text-blue-400" /> <StatusBar label="MP" currentValue={player.mp} maxValue={player.maxMp} colorClass="bg-blue-500" /></div>
                                    )}
                                    {player.class === CharacterClass.ROGUE && player.ep !== undefined && player.maxEp !== undefined && (
                                        <div className="flex items-center gap-2"><BoltIcon className="w-5 h-5 text-green-400" /> <StatusBar label="EP" currentValue={player.ep} maxValue={player.maxEp} colorClass="bg-green-500" /></div>
                                    )}
                                    <div className="flex items-center gap-2"><StarIcon className="w-5 h-5 text-yellow-400" /> <StatusBar label="XP" currentValue={player.xp} maxValue={player.xpToNextLevel} colorClass="bg-yellow-400" /></div>
                                    <div className="text-lg grid grid-cols-2 gap-2">
                                        <span>Level: <span className="font-bold text-white">{player.level}</span></span>
                                        <span>Attack: <span className="font-bold text-white">{player.attack}</span></span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Main Screen & Log */}
                    <div className={`flex flex-col bg-black/50 rounded-lg border-2 border-gray-600 shadow-inner order-2 md:row-span-2 ${isScreenState ? 'md:col-span-3 h-full' : 'md:col-span-2'} grow min-h-0`}>
                        <div className="p-6 text-xl leading-relaxed flex-grow relative overflow-y-auto">
                           {renderGameContent()}
                        </div>
                        {!isScreenState && (
                            <div ref={logRef} className="h-48 bg-black/70 p-4 border-t-2 border-gray-600 overflow-y-auto text-lg space-y-1 shrink-0">
                                {log.map((entry, index) => <p key={index} className="text-gray-300 animate-fade-in-short">{`> ${entry}`}</p>)}
                            </div>
                        )}
                    </div>
                    
                    {/* Actions Panel */}
                     {!isScreenState && (
                        <div className="md:col-span-1 flex flex-col items-center justify-start gap-2 order-3 pt-4 shrink-0">
                            <div className="w-full space-y-2">
                                {(gameState === GameState.EXPLORING || gameState === GameState.COMBAT) && (
                                    <button onClick={() => setIsInventoryOpen(true)} className="w-full text-lg bg-purple-700 hover:bg-purple-600 disabled:bg-purple-900 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg border-2 border-purple-500 transition-all duration-200 transform hover:scale-105" disabled={!isPlayerTurn && gameState === GameState.COMBAT}>
                                        Inventory
                                    </button>
                                )}
                                {gameState === GameState.EXPLORING && (
                                    <>
                                        <button onClick={() => setIsMapOpen(true)} className="w-full flex items-center justify-center gap-2 text-lg bg-teal-700 hover:bg-teal-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-teal-500 transition-all duration-200 transform hover:scale-105">
                                           <MapIcon/> Map
                                        </button>
                                        <button onClick={saveGame} className="w-full flex items-center justify-center gap-2 text-lg bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-indigo-500 transition-all duration-200 transform hover:scale-105">
                                            <SaveIcon /> Save Game
                                        </button>
                                    </>
                                )}
                                {gameState === GameState.COMBAT && !isPlayerTurn && (
                                    <div className="text-center text-yellow-400 font-press-start animate-pulse">Enemy Turn...</div>
                                )}
                            </div>
                        </div>
                     )}
                </div>
            </div>
        </main>
    );
};

export default App;
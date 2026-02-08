
import React, { useState, useEffect, useCallback, useRef, useReducer, useMemo } from 'react';
import { GameState, Item, ItemType, SaveData, CharacterClass, EnemyAbility, SocialChoice, AIPersonality, PlayerAbility, Element, StatusEffectType, StatusEffect, WorldData, GameAction, Enemy, SocialEncounter, EquipmentSlot, AppSettings } from './types';
import { generateScene, generateEncounter, generateWorldData, generateExploreResult, generateImproviseResult } from './services/geminiService';
import { saveGameToStorage, loadGameFromStorage, checkSaveExists } from './services/storageService';
import { Inventory } from './components/Inventory';
import { JournalView } from './components/JournalView';
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
import { LogView } from './components/views/LogView';
import { SettingsView } from './components/views/SettingsView';
import { BoltIcon, FireIcon, MapIcon, BagIcon, SpeakerOnIcon, SpeakerOffIcon, BookIcon, ShieldIcon, SaveIcon, StarIcon, SettingsIcon } from './components/icons';
import { CRIT_CHANCE, CRIT_MULTIPLIER, FLEE_CHANCE, TRAVEL_ENCOUNTER_CHANCE, STATUS_EFFECT_CONFIG, ENEMY_STATUS_CHANCE, ENEMY_STATUS_MAP } from './constants';
import { useAudio } from './hooks/useAudio';
import { useAsset } from './hooks/useAsset';

interface EventPopup {
  id: number;
  text: string;
  type: 'info' | 'heal' | 'item' | 'xp' | 'quest';
}

const statusEffectIcons: Record<StatusEffectType, React.ReactNode> = {
    [StatusEffectType.BURN]: <FireIcon className="w-5 h-5 text-orange-400" />,
    [StatusEffectType.CHILL]: <span className="text-cyan-400 text-xl">❄️</span>,
    [StatusEffectType.SHOCK]: <BoltIcon className="w-5 h-5 text-yellow-400" />,
    [StatusEffectType.GROUNDED]: <span className="text-amber-700 text-xl">⛰️</span>,
    [StatusEffectType.EARTH_ARMOR]: <ShieldIcon className="w-5 h-5 text-green-500" />,
};

const PlayerStatusCard = React.memo(({ player }: { player: any }) => {
    const { assetUrl } = useAsset(player.portrait);
    
    return (
        <div className="bg-gray-800/90 p-2 md:p-3 rounded-lg border-2 border-blue-500 shadow-lg flex flex-row gap-4 items-center w-full max-w-6xl mx-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-black rounded-md border-2 border-gray-600 shrink-0 overflow-hidden relative">
                {assetUrl ? (
                    <img src={assetUrl} alt="Player" className="w-full h-full object-cover rounded-sm image-rendering-pixelated" />
                ) : (
                    <div className="w-full h-full bg-gray-800 animate-pulse"></div>
                )}
            </div>
            <div className="flex flex-col flex-grow justify-between min-w-0 h-full">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h2 className="text-base md:text-xl font-press-start text-blue-300 truncate">{player.name}</h2>
                            <div className="flex items-center gap-1">
                                {player.statusEffects.map((effect: any, i: number) => (
                                    <div key={i} title={effect.type} className="animate-pulse">{statusEffectIcons[effect.type as StatusEffectType]}</div>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs md:text-sm text-gray-400 shrink-0 ml-2">Lvl {player.level} {player.class}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm mb-1 text-gray-300 font-mono">
                        <span>ATK: <span className="text-red-300">{player.attack}</span></span>
                        <span>DEF: <span className="text-blue-300">{player.defense}</span></span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-full mt-1">
                    <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md">
                            {player.hp}/{player.maxHp} HP
                        </div>
                    </div>
                    {player.class === CharacterClass.MAGE && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(player.mp! / player.maxMp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md">
                                {player.mp}/{player.maxMp} MP
                            </div>
                        </div>
                    )}
                    {player.class === CharacterClass.ROGUE && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(player.ep! / player.maxEp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md">
                                {player.ep}/{player.maxEp} EP
                            </div>
                        </div>
                    )}
                     {player.class === CharacterClass.WARRIOR && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${(player.sp! / player.maxSp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md">
                                {player.sp}/{player.maxSp} SP
                            </div>
                        </div>
                    )}
                     <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                        <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${(player.xp / player.xpToNextLevel) * 100}%` }}></div>
                         <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md">
                            {player.xp}/{player.xpToNextLevel} XP
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const App: React.FC = () => {
    const [state, dispatch] = useReducer(reducer, initialState);
    const { gameState, player, enemies, storyText, actions, log, isPlayerTurn, socialEncounter, worldData, playerLocationId } = state;

    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [saveFileExists, setSaveFileExists] = useState(false);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [eventPopups, setEventPopups] = useState<EventPopup[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({ crtEnabled: false, textSpeed: 30 });

    const enemyTurnInProgress = useRef(false);
    const prevLevelRef = useRef(player.level);
    const isInitialMount = useRef(true);
    const prevPlayerLocationId = useRef<string | null>(null);
    const combatActiveRef = useRef(false); // Track robustly if combat is active for timeouts
    
    // Async Operation Tracking to prevent race conditions
    const operationIdRef = useRef(0);

    const { isTtsEnabled, isSpeaking, toggleTts } = useAudio(storyText, gameState);

    // Sync ref with state
    useEffect(() => {
        combatActiveRef.current = gameState === GameState.COMBAT;
    }, [gameState]);

    useEffect(() => {
        // Check for save file asynchronously on mount
        const check = async () => {
            const exists = await checkSaveExists();
            setSaveFileExists(exists);
        };
        check();
    }, []);

    useEffect(() => {
        if (player.level > prevLevelRef.current) {
            setShowLevelUp(true);
            const timer = setTimeout(() => setShowLevelUp(false), 3000); 
            return () => clearTimeout(timer);
        }
        prevLevelRef.current = player.level;
    }, [player.level]);

    const createEventPopup = useCallback((text: string, type: EventPopup['type']) => {
        const newPopup: EventPopup = { id: Date.now() + Math.random(), text, type };
        setEventPopups(prev => [...prev, newPopup]);
        setTimeout(() => {
            setEventPopups(prev => prev.filter(p => p.id !== newPopup.id));
        }, 2500);
    }, []);
    
    const appendToLog = useCallback((message: string) => {
        dispatch({ type: 'ADD_LOG', payload: message });
    }, []);

    const handleFallback = useCallback(() => {
        appendToLog('A strange energy interferes with your perception...');
    }, [appendToLog]);
    
    const handleFoundItem = useCallback((itemDef: Omit<Item, 'quantity'>) => {
        appendToLog(`You found a ${itemDef.name}!`);
        createEventPopup(`Found: ${itemDef.name}!`, 'item');
        dispatch({ type: 'ADD_ITEM_TO_INVENTORY', payload: itemDef });
    }, [appendToLog, createEventPopup]);

    // Memoize the getSceneActions to avoid recalculation on every render
    const currentSceneActions = useMemo(() => {
        if (!worldData || !playerLocationId) return actions; // Fallback to state actions if data missing

        // Filter out any potential 'move' actions returned by the LLM from local actions
        const filteredLocalActions = (state.actions || []).filter(a => a.type !== 'move');

        // De-duplicate move actions based on target location ID
        const moveTargetIds = new Set<string>();
        (worldData.connections || [])
            .filter(c => c.from === playerLocationId || c.to === playerLocationId)
            .forEach(c => {
                const targetId = c.from === playerLocationId ? c.to : c.from;
                moveTargetIds.add(targetId);
            });

        const moveActions = Array.from(moveTargetIds).map(targetId => {
            const targetLocation = worldData.locations.find(l => l.id === targetId);
            return {
                label: `Go to ${targetLocation?.name || '???' }`,
                type: 'move' as const,
                targetLocationId: targetId
            };
        });

        const combinedActions = [...filteredLocalActions, ...moveActions];
        
        // Ensure there is always at least one action to prevent empty UI
        if (combinedActions.length === 0) {
            return [{ label: "Explore Area", type: "explore" } as GameAction];
        }

        return combinedActions;
    }, [worldData, playerLocationId, state.actions, actions]);

    const startNewGame = useCallback(() => {
        dispatch({ type: 'START_NEW_GAME' });
    }, []);

    const handleCharacterCreation = useCallback(async (details: { name: string; class: CharacterClass; portrait: string }) => {
        const opId = ++operationIdRef.current;
        dispatch({ type: 'CREATE_CHARACTER', payload: details });
        
        const newWorldData = await generateWorldData();
        if (opId !== operationIdRef.current) return;

        if (!newWorldData) {
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.START_SCREEN });
            appendToLog("Error: Could not generate a new world. Please try again.");
            return;
        }
        dispatch({ type: 'SET_WORLD_DATA', payload: newWorldData });

        const startLocation = newWorldData.locations.find(l => l.id === newWorldData.startLocationId);
        if (startLocation) {
            const tempPlayer = { ...initialState.player, name: details.name, class: details.class, portrait: details.portrait };
            const { description, actions: localActions, foundItem, isFallback } = await generateScene(tempPlayer, startLocation);
            
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();

            // We set the scene here, but the Memoized Actions above will actually handle the 'move' logic for display
            dispatch({ type: 'SET_SCENE', payload: { description: description, actions: localActions } });
            if (foundItem) {
                handleFoundItem(foundItem);
            }
        }
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [handleFoundItem, appendToLog, handleFallback]);

    const saveGame = useCallback(async () => {
        if (!worldData || !playerLocationId) {
            createEventPopup("Cannot save: Invalid state", 'info');
            return;
        }
        
        const saveData: SaveData = { player, storyText, actions, log, worldData, playerLocationId };
        
        setIsSaving(true);
        try {
            await saveGameToStorage(saveData);
            setSaveFileExists(true);
            appendToLog('Game Saved!');
            createEventPopup('Game Saved!', 'info');
        } catch (e) {
            console.error("Save failed", e);
            createEventPopup('Save Failed!', 'info');
            appendToLog('Error: Could not save game (Storage quota exceeded?)');
        } finally {
            setTimeout(() => setIsSaving(false), 2000);
        }
    }, [player, storyText, actions, log, worldData, playerLocationId, appendToLog, createEventPopup]);

    const loadGame = useCallback(async () => {
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        try {
            const savedData = await loadGameFromStorage();
            if (savedData) {
                // Validate essential structure
                if (!savedData.player || !savedData.worldData || !savedData.playerLocationId) {
                    throw new Error("Invalid save file structure");
                }
                dispatch({ type: 'LOAD_GAME', payload: savedData });
            } else {
                appendToLog('No save file found.');
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.START_SCREEN });
            }
        } catch (e) {
            console.error("Load failed", e);
            appendToLog('Error: Corrupt save file.');
            createEventPopup('Load Failed!', 'info');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.START_SCREEN });
        }
    }, [appendToLog, createEventPopup]);

    const handleImprovise = useCallback(async (input: string) => {
        if (!input.trim()) return;
        const opId = ++operationIdRef.current;
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You attempt to: "${input}"`);

        const result = await generateImproviseResult(player, input);
        if (opId !== operationIdRef.current) return;

        if (result.isFallback) handleFallback();

        appendToLog(result.description);
        
        if (result.questUpdate) {
             const quest = player.journal.quests.find(q => q.id === result.questUpdate?.questId);
             if (quest) {
                dispatch({ type: 'UPDATE_QUEST_STATUS', payload: { id: result.questUpdate.questId, status: result.questUpdate.status } });
                createEventPopup(`Quest ${result.questUpdate.status === 'COMPLETED' ? 'Complete' : 'Failed'}: ${quest.title}`, 'quest');
             }
        }

        if (result.nextSceneType === 'EXPLORATION') {
             // We update the local actions from the exploration result
             // The memoized 'currentSceneActions' will pick these up and combine with moves
            dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: result.localActions || [] } });
            if (result.foundItem) {
                handleFoundItem(result.foundItem);
            }
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

        } else if (result.nextSceneType === 'SOCIAL') {
            const encounter: SocialEncounter = {
                description: result.description,
                choices: result.socialChoices || []
            };
            if(encounter.choices.length > 0) {
                dispatch({ type: 'SET_SOCIAL_ENCOUNTER', payload: encounter });
            } else {
                dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: actions } });
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
            }
        } else if (result.nextSceneType === 'COMBAT') {
            const { enemies: newEnemies, isFallback } = await generateEncounter(player);
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();
            dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
            dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: [] } });
            appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        }
    }, [player, appendToLog, handleFoundItem, handleFallback, actions, createEventPopup]);

    const handleAction = useCallback(async (action: GameAction) => {
        const opId = ++operationIdRef.current;

        if (action.type === 'move' && action.targetLocationId) {
            dispatch({ type: 'MOVE_PLAYER', payload: action.targetLocationId });
            return;
        }
    
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You decide to ${action.label.toLowerCase()}...`);
    
        if (action.type === 'encounter') {
            const { enemies: newEnemies, isFallback } = await generateEncounter(player);
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();
            const enemyNames = newEnemies.map(e => e.name).join(', ');
            dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
            dispatch({ type: 'SET_SCENE', payload: { description: `A wild ${enemyNames} appeared!`, actions: [] } });
            appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        } else if (action.type === 'explore') {
            const result = await generateExploreResult(player, action);
            if (opId !== operationIdRef.current) return;

            if (result.isFallback) handleFallback();
    
            appendToLog(result.description);
            
            if (result.questUpdate) {
                const quest = player.journal.quests.find(q => q.id === result.questUpdate?.questId);
                if (quest) {
                    dispatch({ type: 'UPDATE_QUEST_STATUS', payload: { id: result.questUpdate.questId, status: result.questUpdate.status } });
                    createEventPopup(`Quest ${result.questUpdate.status === 'COMPLETED' ? 'Complete' : 'Failed'}: ${quest.title}`, 'quest');
                }
            }
    
            if (result.nextSceneType === 'EXPLORATION') {
                if (worldData && playerLocationId) {
                     // We update the local actions from the exploration result
                     // The memoized 'currentSceneActions' will pick these up and combine with moves
                    dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: result.localActions || [] } });
                    if (result.foundItem) {
                        handleFoundItem(result.foundItem);
                    }
                }
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

            } else if (result.nextSceneType === 'SOCIAL') {
                const encounter: SocialEncounter = {
                    description: result.description,
                    choices: result.socialChoices || []
                };
                if(encounter.choices.length > 0) {
                    dispatch({ type: 'SET_SOCIAL_ENCOUNTER', payload: encounter });
                } else {
                    dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: actions } });
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                }
    
            } else if (result.nextSceneType === 'COMBAT') {
                const { enemies: newEnemies, isFallback } = await generateEncounter(player);
                if (opId !== operationIdRef.current) return;

                if (isFallback) handleFallback();
                dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: [] } });
                appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                dispatch({ type: 'SET_PLAYER_TURN', payload: true });
            }
        }
    }, [player, appendToLog, handleFoundItem, worldData, playerLocationId, handleFallback, actions, createEventPopup]);

    // Handle Movement & Location Changes
    useEffect(() => {
        const prevLocationId = prevPlayerLocationId.current;
        prevPlayerLocationId.current = playerLocationId;

        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (prevLocationId && prevLocationId !== playerLocationId) {
            if (playerLocationId && worldData) {
                const move = async () => {
                    const opId = ++operationIdRef.current;
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });

                    const newLocation = worldData.locations.find(l => l.id === playerLocationId);
                    if (!newLocation) return;
                    
                    appendToLog(`You travel to ${newLocation.name}...`);
                    
                    if (Math.random() < TRAVEL_ENCOUNTER_CHANCE) {
                        const { enemies: newEnemies, isFallback } = await generateEncounter(player);
                        if (opId !== operationIdRef.current) return;

                        if (isFallback) handleFallback();
                        const enemyNames = newEnemies.map(e => e.name).join(', ');
                        dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                        dispatch({ type: 'SET_SCENE', payload: { description: `While traveling to ${newLocation.name}, you are ambushed by a ${enemyNames}!`, actions: [] } });
                        appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
                        dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                        dispatch({ type: 'SET_PLAYER_TURN', payload: true });
                    } else {
                        const { description, actions: localActions, foundItem, isFallback } = await generateScene(player, newLocation);
                        if (opId !== operationIdRef.current) return;

                        if (isFallback) handleFallback();
                         
                        dispatch({ type: 'SET_SCENE', payload: { description, actions: localActions } });

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

                const logMessage = `You use a ${item.name} and recover ${healed} HP.`;
                appendToLog(logMessage);
                createEventPopup(`+${healed} HP`, 'heal');
                
                if (gameState === GameState.COMBAT) {
                    setIsInventoryOpen(false);
                    dispatch({ type: 'SET_PLAYER_TURN', payload: false });
                }
            } else {
                appendToLog(`Your HP is already full!`);
            }
        }
    }, [player, appendToLog, gameState, createEventPopup]);

    const handleEquipItem = useCallback((item: Item, index: number) => {
        dispatch({ type: 'EQUIP_ITEM', payload: { inventoryIndex: index } });
        createEventPopup(`Equipped ${item.name}`, 'info');
        if (gameState === GameState.COMBAT) {
             setIsInventoryOpen(false);
             dispatch({ type: 'SET_PLAYER_TURN', payload: false });
        }
    }, [gameState, createEventPopup]);

    const handleUnequipItem = useCallback((slot: EquipmentSlot) => {
        dispatch({ type: 'UNEQUIP_ITEM', payload: { slot } });
        if (gameState === GameState.COMBAT) {
            setIsInventoryOpen(false);
            dispatch({ type: 'SET_PLAYER_TURN', payload: false });
       }
    }, [gameState]);


    const loadSceneForCurrentLocation = useCallback(async () => {
        const opId = ++operationIdRef.current;
        if (!worldData || !playerLocationId) return;

        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });

        const currentLocation = worldData.locations.find(l => l.id === playerLocationId);
        if (!currentLocation) return;
        
        const { description, actions: localActions, foundItem, isFallback } = await generateScene(player, currentLocation);
        if (opId !== operationIdRef.current) return;

        if (isFallback) handleFallback();

        dispatch({ type: 'SET_SCENE', payload: { description, actions: localActions } });
        if (foundItem) handleFoundItem(foundItem);
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [worldData, playerLocationId, player, handleFoundItem, handleFallback]);

    const handleCombatAction = useCallback(async (
        action: 'attack' | 'defend' | 'flee' | 'ability',
        payload?: { ability?: PlayerAbility; targetIndex?: number; onDamageDealt?: (damage: number, isCrit: boolean) => void; }
    ) => {
        if (!isPlayerTurn || enemies.length === 0) return;

        dispatch({ type: 'SET_PLAYER_TURN', payload: false });
        dispatch({ type: 'UPDATE_PLAYER', payload: { isDefending: false } });
        
        dispatch({ type: 'PROCESS_TURN_EFFECTS', payload: { target: 'player' } });

        if (action === 'attack' && payload?.targetIndex !== undefined) {
            const target = enemies[payload.targetIndex];
            const isCrit = Math.random() < CRIT_CHANCE;
            let damage = Math.floor(player.attack + (Math.random() * 5 - 2));
            if (isCrit) {
                damage = Math.floor(damage * CRIT_MULTIPLIER);
            }
            if (target.statusEffects.some(e => e.type === StatusEffectType.GROUNDED)) {
                damage = Math.floor(damage * (1 + STATUS_EFFECT_CONFIG.GROUNDED.defenseReduction));
            }
            const damageTaken = target.isShielded ? Math.floor(damage / 2) : damage;
            const newHp = Math.max(0, target.hp - damageTaken);

            payload.onDamageDealt?.(damageTaken, isCrit);

            dispatch({ type: 'UPDATE_ENEMY', payload: { index: payload.targetIndex, data: { hp: newHp } } });
            appendToLog(`You attack ${target.name} for ${damageTaken} damage! ${isCrit ? 'CRITICAL HIT!' : ''}`);
            if (newHp <= 0) {
                appendToLog(`${target.name} is defeated!`);
            }
        } else if (action === 'ability' && payload?.targetIndex !== undefined && payload.ability) {
            dispatch({ type: 'PLAYER_ACTION_ABILITY', payload: { ability: payload.ability, targetIndex: payload.targetIndex } });
        } else if (action === 'defend') {
            dispatch({ type: 'PLAYER_ACTION_DEFEND' });
        } else if (action === 'flee') {
            if (Math.random() < FLEE_CHANCE) {
                appendToLog('You successfully escaped!');
                await loadSceneForCurrentLocation();
                dispatch({ type: 'SET_ENEMIES', payload: [] });
                return;
            } else {
                dispatch({ type: 'PLAYER_ACTION_FLEE_FAILURE' });
            }
        }
    }, [player, enemies, appendToLog, isPlayerTurn, loadSceneForCurrentLocation]);

    const handleSocialChoice = useCallback(async (choice: SocialChoice) => {
        const opId = ++operationIdRef.current;
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
    
        dispatch({ type: 'RESOLVE_SOCIAL_CHOICE', payload: { choice } });
        
        if (choice.questUpdate) {
             const quest = player.journal.quests.find(q => q.id === choice.questUpdate?.questId);
             if (quest) {
                createEventPopup(`Quest ${choice.questUpdate.status === 'COMPLETED' ? 'Complete' : 'Failed'}: ${quest.title}`, 'quest');
             }
        }

        if (choice.reward) {
            if (choice.reward.type === 'XP' && choice.reward.value) {
                createEventPopup(`+${choice.reward.value} XP`, 'xp');
            } else if (choice.reward.type === 'ITEM' && choice.reward.item) {
                createEventPopup(`Found: ${choice.reward.item.name}!`, 'item');
            } else if (choice.reward.type === 'QUEST' && choice.reward.quest) {
                createEventPopup(`Quest: ${choice.reward.quest.title}`, 'quest');
            }
        }
    
        if (worldData && playerLocationId) {
            const currentLocation = worldData.locations.find(l => l.id === playerLocationId);
            if (currentLocation) {
                const { actions: localActions, foundItem, isFallback } = await generateScene(player, currentLocation);
                if (opId !== operationIdRef.current) return;

                if (isFallback) handleFallback();
                
                dispatch({ type: 'SET_SCENE', payload: { description: choice.outcome, actions: localActions } });
    
                if (foundItem) {
                    handleFoundItem(foundItem);
                }
            }
        }
        
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
    }, [worldData, playerLocationId, player, handleFoundItem, handleFallback, createEventPopup]);

    const handleEnemyTurns = useCallback(async () => {
        enemyTurnInProgress.current = true;
        let currentHp = player.hp;

        const determineEnemyAction = (enemy: Enemy): 'attack' | EnemyAbility | null => {
            if (!enemy.ability) return 'attack';
            const hpPercent = enemy.hp / enemy.maxHp;
            switch (enemy.aiPersonality) {
                case AIPersonality.DEFENSIVE:
                    if (hpPercent < 0.5 && (enemy.ability === EnemyAbility.HEAL || enemy.ability === EnemyAbility.SHIELD)) {
                        if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack';
                        return enemy.ability;
                    }
                    return 'attack';
                case AIPersonality.STRATEGIC:
                    if (hpPercent < 0.3 && enemy.ability === EnemyAbility.HEAL) return EnemyAbility.HEAL;
                    if (hpPercent < 0.7 && !enemy.isShielded && enemy.ability === EnemyAbility.SHIELD && Math.random() < 0.8) return EnemyAbility.SHIELD;
                    if ((enemy.ability === EnemyAbility.DRAIN_LIFE || enemy.ability === EnemyAbility.MULTI_ATTACK) && Math.random() < 0.4) return enemy.ability;
                    return 'attack';
                case AIPersonality.WILD:
                    if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack';
                    if (Math.random() < 0.5) return enemy.ability;
                    return 'attack';
                case AIPersonality.AGGRESSIVE: default:
                    if ((enemy.ability === EnemyAbility.DRAIN_LIFE || enemy.ability === EnemyAbility.MULTI_ATTACK) && Math.random() < 0.3) return enemy.ability;
                    if ((enemy.ability === EnemyAbility.HEAL || enemy.ability === EnemyAbility.SHIELD) && Math.random() < 0.15) {
                        if (enemy.ability === EnemyAbility.SHIELD && enemy.isShielded) return 'attack';
                        return enemy.ability;
                    }
                    return 'attack';
            }
        };

        for (let i = 0; i < enemies.length; i++) {
                // Combat Active Check: If player fled or game ended mid-turn, stop.
                if (!combatActiveRef.current) break;

                if (enemies[i].hp > 0 && currentHp > 0) { 
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                // Re-check after sleep
                if (!combatActiveRef.current) break;

                dispatch({ type: 'PROCESS_TURN_EFFECTS', payload: { target: 'enemy', index: i } });
                const enemy = state.enemies[i]; 

                if (enemy.statusEffects.some(e => e.type === StatusEffectType.SHOCK) && Math.random() < STATUS_EFFECT_CONFIG.SHOCK.stunChance) {
                    appendToLog(`${enemy.name} is Shocked and unable to move!`);
                    continue;
                }
                
                if (enemy.isShielded) {
                    dispatch({ type: 'UPDATE_ENEMY', payload: { index: i, data: { isShielded: false } } });
                    appendToLog(`${enemy.name}'s shield fades.`);
                }
                
                const actionToTake = determineEnemyAction(enemy);

                if (actionToTake !== 'attack' && actionToTake !== null) {
                        appendToLog(`${enemy.name} uses ${actionToTake}!`);
                    switch (actionToTake) {
                        case EnemyAbility.HEAL:
                            const healAmount = Math.floor(enemy.maxHp * 0.25);
                            dispatch({ type: 'ENEMY_ACTION_HEAL', payload: { enemyIndex: i, healAmount } });
                            createEventPopup(`${enemy.name} heals!`, 'heal');
                            appendToLog(`${enemy.name} recovers ${healAmount} HP.`);
                            break;
                        case EnemyAbility.SHIELD:
                            dispatch({ type: 'ENEMY_ACTION_SHIELD', payload: { enemyIndex: i } });
                            createEventPopup(`${enemy.name} shields!`, 'info');
                            appendToLog(`${enemy.name} raises a magical shield!`);
                            break;
                        case EnemyAbility.DRAIN_LIFE:
                            const drainDamage = Math.floor(enemy.attack * 0.8 + (Math.random() * 4 - 2));
                            const playerDamageTakenDrain = player.isDefending ? Math.max(1, Math.floor(drainDamage / 2)) : drainDamage;
                            const finalDamageDrain = Math.max(1, playerDamageTakenDrain - (player.defense || 0));
                            
                            currentHp = Math.max(0, currentHp - finalDamageDrain);
                            dispatch({ type: 'UPDATE_PLAYER', payload: { hp: currentHp } });
                            dispatch({type: 'ENEMY_ACTION_DRAIN_LIFE', payload: { enemyIndex: i, damage: finalDamageDrain }})
                            appendToLog(`${enemy.name} drains ${finalDamageDrain} HP from you!`);
                            break;
                        case EnemyAbility.MULTI_ATTACK:
                            for (let j=0; j<2; j++) {
                                if(currentHp > 0) {
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    if (!combatActiveRef.current) break;
                                    const multiDamage = Math.floor(enemy.attack * 0.7 + (Math.random() * 3 - 1));
                                    let playerDamageTakenMulti = player.isDefending ? Math.max(1, Math.floor(multiDamage / 2)) : multiDamage;
                                    playerDamageTakenMulti = Math.max(1, playerDamageTakenMulti - (player.defense || 0));
                                    currentHp = Math.max(0, currentHp - playerDamageTakenMulti);
                                    dispatch({ type: 'UPDATE_PLAYER', payload: { hp: currentHp } });
                                    appendToLog(`${enemy.name} strikes! You take ${playerDamageTakenMulti} damage.`);
                                }
                            }
                            break;
                    }
                } else {
                    const isCrit = Math.random() < CRIT_CHANCE;
                    let enemyDamage = Math.floor(enemy.attack + (Math.random() * 4 - 2));

                    if (enemy.statusEffects.some(e => e.type === StatusEffectType.CHILL)) {
                        enemyDamage = Math.floor(enemyDamage * (1 - STATUS_EFFECT_CONFIG.CHILL.damageReduction));
                    }

                    if(isCrit) {
                        enemyDamage = Math.floor(enemyDamage * CRIT_MULTIPLIER);
                    }
                    
                    let playerDamageTaken = player.isDefending ? Math.max(1, Math.floor(enemyDamage / 2)) : enemyDamage;
                    
                    if (player.statusEffects.some(e => e.type === StatusEffectType.GROUNDED)) {
                        playerDamageTaken = Math.floor(playerDamageTaken * (1 + STATUS_EFFECT_CONFIG.GROUNDED.defenseReduction));
                    }
                     if (player.statusEffects.some(e => e.type === StatusEffectType.EARTH_ARMOR)) {
                        playerDamageTaken = Math.floor(playerDamageTaken * (1 - STATUS_EFFECT_CONFIG.EARTH_ARMOR.defenseBonus));
                    }
                    
                    playerDamageTaken = Math.max(1, playerDamageTaken - (player.defense || 0));

                    const newPlayerHp = Math.max(0, currentHp - playerDamageTaken);
                    currentHp = newPlayerHp;
                    dispatch({ type: 'UPDATE_PLAYER', payload: { hp: newPlayerHp } });
                    appendToLog(`${enemy.name} attacks! You take ${playerDamageTaken} damage. ${isCrit ? 'CRITICAL!' : ''}`);

                    if (enemy.element && enemy.element !== Element.NONE && Math.random() < ENEMY_STATUS_CHANCE[enemy.element]) {
                        const effectType = ENEMY_STATUS_MAP[enemy.element];
                        const effect: StatusEffect = {
                            type: effectType,
                            duration: STATUS_EFFECT_CONFIG[effectType].duration
                        };
                        if(effect.type === StatusEffectType.BURN) {
                            effect.sourceAttack = enemy.attack;
                        }
                        dispatch({type: 'APPLY_STATUS_EFFECT', payload: { target: 'player', effect }})
                    }
                }

                if (currentHp <= 0) {
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.GAME_OVER });
                    appendToLog('You have been defeated...');
                    enemyTurnInProgress.current = false;
                    return;
                }
            }
        }
        
        // If combat is still active and player is alive, give turn back
        if (combatActiveRef.current && currentHp > 0) {
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        }
        enemyTurnInProgress.current = false;

    }, [enemies, player, appendToLog, createEventPopup, state.enemies]);

    const handleCombatVictory = useCallback(async (defeatedEnemies: Enemy[]) => {
        const totalXpGained = defeatedEnemies.reduce((sum, e) => sum + Math.floor(e.maxHp / 2) + e.attack, 0);
        const lootItems = defeatedEnemies.map(e => e.loot).filter((l): l is Omit<Item, 'quantity'> => !!l);

        createEventPopup('VICTORY!', 'info');
        if (totalXpGained > 0) setTimeout(() => createEventPopup(`+${totalXpGained} XP`, 'xp'), 500);
        lootItems.forEach((item, index) => setTimeout(() => createEventPopup(`Found: ${item.name}!`, 'item'), 1000 + index * 500));
        
        let regen = { hp: 0, mp: 0, ep: 0, sp: 0 };
        // Base small HP regen for everyone to keep momentum
        regen.hp = Math.floor(player.maxHp * 0.05);

        if (player.class === CharacterClass.MAGE) {
            regen.mp = Math.floor((player.maxMp || 0) * 0.2);
            if(regen.mp > 0) setTimeout(() => createEventPopup(`+${regen.mp} MP`, 'heal'), 1500 + lootItems.length * 500);
        } else if (player.class === CharacterClass.ROGUE) {
            regen.ep = Math.floor((player.maxEp || 0) * 0.25);
            if (regen.ep > 0) setTimeout(() => createEventPopup(`+${regen.ep} EP`, 'heal'), 1500 + lootItems.length * 500);
        } else if (player.class === CharacterClass.WARRIOR) {
            regen.sp = Math.floor((player.maxSp || 0) * 0.25);
            if (regen.sp > 0) setTimeout(() => createEventPopup(`+${regen.sp} SP`, 'heal'), 1500 + lootItems.length * 500);
        }
        
        if (regen.hp > 0) setTimeout(() => createEventPopup(`+${regen.hp} HP`, 'heal'), 1800 + lootItems.length * 500);

        dispatch({ 
            type: 'PROCESS_COMBAT_VICTORY', 
            payload: { xpGained: totalXpGained, loot: lootItems, regen }
        });

        await loadSceneForCurrentLocation();
        dispatch({ type: 'SET_ENEMIES', payload: [] });
    }, [player, loadSceneForCurrentLocation, createEventPopup]);
    
    useEffect(() => {
        if (gameState !== GameState.COMBAT || isPlayerTurn || enemyTurnInProgress.current) return;

        const allEnemiesDefeated = enemies.every(e => e.hp <= 0);
        if (allEnemiesDefeated && enemies.length > 0) {
            handleCombatVictory(enemies);
            return;
        }

        if (enemies.some(e => e.hp > 0)) {
           handleEnemyTurns();
        }

    }, [isPlayerTurn, enemies, gameState, handleEnemyTurns, handleCombatVictory]);
    
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
                return <ExploringView storyText={storyText} actions={currentSceneActions} onAction={handleAction} onImprovise={handleImprovise} />;
            case GameState.COMBAT:
                return <CombatView 
                    storyText={storyText} 
                    enemies={enemies} 
                    player={player}
                    isPlayerTurn={isPlayerTurn} 
                    onCombatAction={handleCombatAction}
                />;
            case GameState.SOCIAL_ENCOUNTER:
                return socialEncounter && <SocialEncounterView encounter={socialEncounter} onChoice={handleSocialChoice} onImprovise={handleImprovise} />;
            default:
                return null;
        }
    };

    const isScreenState = gameState === GameState.START_SCREEN || gameState === GameState.LOADING || gameState === GameState.GAME_OVER || gameState === GameState.CHARACTER_CREATION;

    const ActionButtons = React.memo(() => (
        <div className="flex items-center gap-2 w-full max-w-4xl mx-auto overflow-x-auto whitespace-nowrap pb-1 no-scrollbar">
            {(gameState === GameState.EXPLORING || gameState === GameState.COMBAT) && (
                <button 
                    onClick={() => setIsInventoryOpen(true)} 
                    className="flex-shrink-0 flex items-center justify-center bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white p-3 rounded-lg border-2 border-purple-500 active:scale-95 transition-all w-14 h-14"
                    disabled={!isPlayerTurn && gameState === GameState.COMBAT}
                >
                    <BagIcon className="w-6 h-6" />
                </button>
            )}
            <button 
                onClick={() => setIsJournalOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-amber-700 hover:bg-amber-600 text-white p-3 rounded-lg border-2 border-amber-500 active:scale-95 transition-all w-14 h-14"
            >
                <StarIcon className="w-6 h-6"/>
            </button>
            <button 
                onClick={() => setIsLogOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-yellow-700 hover:bg-yellow-600 text-white p-3 rounded-lg border-2 border-yellow-500 active:scale-95 transition-all w-14 h-14"
            >
                <BookIcon className="w-6 h-6"/>
            </button>
            {gameState === GameState.EXPLORING && (
                <>
                    <button 
                        onClick={() => setIsMapOpen(true)} 
                        className="flex-shrink-0 flex items-center justify-center bg-teal-700 hover:bg-teal-600 text-white p-3 rounded-lg border-2 border-teal-500 active:scale-95 transition-all w-14 h-14"
                    >
                        <MapIcon className="w-6 h-6"/>
                    </button>
                    <button 
                        onClick={saveGame} 
                        disabled={isSaving}
                        className={`flex-shrink-0 flex items-center justify-center p-3 rounded-lg border-2 active:scale-95 transition-all w-14 h-14 ${isSaving ? 'bg-green-600 border-green-400 opacity-80 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 border-indigo-500 text-white'}`}
                    >
                        {isSaving ? <span className="text-xs font-bold animate-pulse">...</span> : <SaveIcon className="w-6 h-6" />}
                    </button>
                </>
            )}
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg border-2 border-gray-500 active:scale-95 transition-all w-14 h-14"
            >
                <SettingsIcon className="w-6 h-6"/>
            </button>
        </div>
    ));

    return (
        <main className="w-full bg-gray-900 text-gray-200 flex flex-col overflow-x-hidden min-h-[100dvh] min-h-[560px]" style={{
            backgroundImage: `radial-gradient(circle, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 1) 70%)`,
        }}>
            {settings.crtEnabled && <div className="crt-effect" />}
            
            <Inventory 
                isOpen={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
                inventory={player.inventory}
                player={player}
                onUseItem={handleUseItem}
                onEquipItem={handleEquipItem}
                onUnequipItem={handleUnequipItem}
                disabled={!isPlayerTurn && gameState === GameState.COMBAT}
            />
            <JournalView isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} player={player} />
            <WorldMapView isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} worldData={worldData} playerLocationId={playerLocationId} />
            <LogView isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} log={log} />
            <SettingsView isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={s => setSettings(prev => ({ ...prev, ...s }))} />

            {/* Level Up Overlay */}
            {showLevelUp && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none fixed">
                    <h1 className="text-6xl md:text-8xl font-press-start text-yellow-300 animate-level-up" style={{textShadow: '4px 4px 0 #000'}}>
                        LEVEL UP!
                    </h1>
                </div>
            )}
             
            {/* Popups */}
            <div className="event-popup-container fixed">
                {eventPopups.map(p => (
                    <div key={p.id} className={`event-popup ${p.type}`}>{p.text}</div>
                ))}
            </div>

            {/* Top Status Bar (All Screens) */}
            {!isScreenState && (
                <div className="p-2 bg-gray-900 border-b border-gray-700 z-10 shrink-0">
                    <PlayerStatusCard player={player} />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative min-w-0 min-h-0">
                 <div className="flex-1 p-4 md:p-8 relative min-h-0 overflow-hidden flex flex-col">
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                        {renderGameContent()}
                    </div>
                    
                    {!isScreenState && (
                        <button
                            onClick={toggleTts}
                            className={`absolute top-2 right-2 md:top-4 md:right-4 text-gray-400 hover:text-white transition-colors z-20 ${isSpeaking ? 'animate-pulse' : ''}`}
                        >
                            {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6 md:w-8 md:h-8 text-green-400" /> : <SpeakerOffIcon className="w-6 h-6 md:w-8 md:h-8" />}
                        </button>
                    )}
                 </div>

                 {/* Bottom Actions (All Screens) */}
                 {!isScreenState && (
                    <div className="p-2 bg-gray-900 border-t border-gray-700 z-10 shrink-0 pb-[env(safe-area-inset-bottom)]">
                        {gameState === GameState.COMBAT && !isPlayerTurn && (
                            <div className="text-center text-yellow-400 font-press-start animate-pulse mb-2 text-xs">Enemy Turn...</div>
                        )}
                        <ActionButtons />
                    </div>
                 )}
            </div>
        </main>
    );
};

export default App;

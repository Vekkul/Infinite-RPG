
import { useCallback, useRef, useEffect, useMemo } from 'react';
import { GameState, Player, GameAction, SocialChoice, WorldData, SocialEncounter, Item, EventPopup, Attributes, PlayerAbility, Enemy } from '../types';
import { generateScene, generateEncounter, generateWorldData, generateExploreResult, generateImproviseResult } from '../services/geminiService';
import { TRAVEL_ENCOUNTER_CHANCE } from '../constants';
import { initialState } from '../state/initialState';

interface UseExplorationSystemProps {
    state: {
        player: Player;
        worldData: WorldData | null;
        playerLocationId: string | null;
        actions: GameAction[];
        gameState: GameState;
        preCombatState: any;
    };
    dispatch: React.Dispatch<any>;
    appendToLog: (message: string) => void;
    createEventPopup: (text: string, type: EventPopup['type']) => void;
    handleFoundItem: (item: Omit<Item, 'quantity'>) => void;
    isLocalCombatRef: React.MutableRefObject<boolean>;
    operationIdRef: React.MutableRefObject<number>;
    isInitialMount: React.MutableRefObject<boolean>;
    prevPlayerLocationId: React.MutableRefObject<string | null>;
}

export const useExplorationSystem = ({ 
    state, 
    dispatch, 
    appendToLog, 
    createEventPopup, 
    handleFoundItem,
    isLocalCombatRef,
    operationIdRef,
    isInitialMount,
    prevPlayerLocationId
}: UseExplorationSystemProps) => {
    
    const handleFallback = useCallback(() => {
        appendToLog('A strange energy interferes with your perception...');
    }, [appendToLog]);

    const handleCharacterCreation = useCallback(async (details: { name: string; className: string; attributes: Attributes; abilities: PlayerAbility[]; portrait: string }) => {
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
            const tempPlayer = { ...initialState.player, name: details.name, className: details.className, portrait: details.portrait };
            const { description, actions: localActions, foundItem, isFallback } = await generateScene(tempPlayer, startLocation);
            
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();

            dispatch({ type: 'SET_SCENE', payload: { description: description, actions: localActions } });
            if (foundItem) {
                handleFoundItem(foundItem);
            }
            // Add initial history
            dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Arrived at ${startLocation.name}.` });
        }
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [handleFoundItem, appendToLog, handleFallback, dispatch, operationIdRef]);

    const loadSceneForCurrentLocation = useCallback(async (recentCombat?: { enemies: Enemy[], result: 'VICTORY' | 'FLED' }) => {
        const opId = ++operationIdRef.current;
        if (!state.worldData || !state.playerLocationId) return;

        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });

        const currentLocation = state.worldData.locations.find(l => l.id === state.playerLocationId);
        if (!currentLocation) return;
        
        const { description, actions: localActions, foundItem, isFallback } = await generateScene(state.player, currentLocation, recentCombat);
        if (opId !== operationIdRef.current) return;

        if (isFallback) handleFallback();

        dispatch({ type: 'SET_SCENE', payload: { description, actions: localActions } });
        if (foundItem) handleFoundItem(foundItem);
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });

    }, [state.worldData, state.playerLocationId, state.player, handleFoundItem, handleFallback, dispatch, operationIdRef]);

    const handleImprovise = useCallback(async (input: string) => {
        if (!input.trim()) return;
        const opId = ++operationIdRef.current;
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You attempt to: "${input}"`);

        const result = await generateImproviseResult(state.player, input);
        if (opId !== operationIdRef.current) return;

        if (result.isFallback) handleFallback();

        appendToLog(result.description);
        
        // Add to narrative history for continuity
        dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Improvised: "${input}" -> ${result.description}` });

        if (result.questUpdate) {
             const quest = state.player.journal.quests.find(q => q.id === result.questUpdate?.questId);
             if (quest) {
                dispatch({ type: 'UPDATE_QUEST_STATUS', payload: { questId: result.questUpdate.questId, status: result.questUpdate.status, outcome: result.questUpdate.outcome, rewardText: result.questUpdate.rewardText } });
                dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Quest ${result.questUpdate.status}: ${quest.title}` });
                createEventPopup(`Quest ${result.questUpdate.status === 'COMPLETED' ? 'Complete' : 'Failed'}: ${quest.title}`, 'quest');
             }
        }

        if (result.nextSceneType === 'EXPLORATION') {
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
                dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: state.actions } });
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
            }
        } else if (result.nextSceneType === 'COMBAT') {
            // Optimization: Local encounter, save scene state
            isLocalCombatRef.current = true;
            dispatch({ type: 'SAVE_SCENE_STATE' });

            // Note: generateEncounter is now synchronous/local, no API call
            const { enemies: newEnemies, isFallback } = await generateEncounter(state.player);
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();
            dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
            dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: [] } });
            appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        }
    }, [state.player, state.actions, appendToLog, handleFoundItem, handleFallback, createEventPopup, dispatch, operationIdRef, isLocalCombatRef]);

    const handleAction = useCallback(async (action: GameAction) => {
        const opId = ++operationIdRef.current;

        if (action.type === 'move' && action.targetLocationId) {
            dispatch({ type: 'MOVE_PLAYER', payload: action.targetLocationId });
            return;
        }
    
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You decide to ${action.label.toLowerCase()}...`);
    
        if (action.type === 'encounter') {
            // Optimization: Local encounter, save scene state
            isLocalCombatRef.current = true;
            dispatch({ type: 'SAVE_SCENE_STATE' });

            // Note: generateEncounter is now synchronous/local
            const { enemies: newEnemies, isFallback } = await generateEncounter(state.player);
            if (opId !== operationIdRef.current) return;

            if (isFallback) handleFallback();
            const enemyNames = newEnemies.map(e => e.name).join(', ');
            dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
            dispatch({ type: 'SET_SCENE', payload: { description: `A wild ${enemyNames} appeared!`, actions: [] } });
            appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
            dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
            dispatch({ type: 'SET_PLAYER_TURN', payload: true });
        } else if (action.type === 'explore') {
            const result = await generateExploreResult(state.player, action);
            if (opId !== operationIdRef.current) return;

            if (result.isFallback) handleFallback();
    
            appendToLog(result.description);
            
            // Add to narrative history for continuity
            dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Action: "${action.label}" -> ${result.description}` });
            
            if (result.questUpdate) {
                const quest = state.player.journal.quests.find(q => q.id === result.questUpdate?.questId);
                if (quest) {
                    dispatch({ type: 'UPDATE_QUEST_STATUS', payload: { questId: result.questUpdate.questId, status: result.questUpdate.status, outcome: result.questUpdate.outcome, rewardText: result.questUpdate.rewardText } });
                    dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Quest ${result.questUpdate.status}: ${quest.title}` });
                    createEventPopup(`Quest ${result.questUpdate.status === 'COMPLETED' ? 'Complete' : 'Failed'}: ${quest.title}`, 'quest');
                }
            }
    
            if (result.nextSceneType === 'EXPLORATION') {
                if (state.worldData && state.playerLocationId) {
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
                    dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: state.actions } });
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                }
    
            } else if (result.nextSceneType === 'COMBAT') {
                // Optimization: Local encounter, save scene state
                isLocalCombatRef.current = true;
                dispatch({ type: 'SAVE_SCENE_STATE' });

                const { enemies: newEnemies, isFallback } = await generateEncounter(state.player);
                if (opId !== operationIdRef.current) return;

                if (isFallback) handleFallback();
                dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: [] } });
                appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                dispatch({ type: 'SET_PLAYER_TURN', payload: true });
            }
        }
    }, [state.player, state.worldData, state.playerLocationId, state.actions, appendToLog, handleFoundItem, handleFallback, createEventPopup, dispatch, operationIdRef, isLocalCombatRef]);

    const handleSocialChoice = useCallback(async (choice: SocialChoice) => {
        const opId = ++operationIdRef.current;
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
    
        dispatch({ type: 'RESOLVE_SOCIAL_CHOICE', payload: { choice } });
        
        if (choice.questUpdate) {
             const quest = state.player.journal.quests.find(q => q.id === choice.questUpdate?.questId);
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
    
        if (state.worldData && state.playerLocationId) {
            const currentLocation = state.worldData.locations.find(l => l.id === state.playerLocationId);
            if (currentLocation) {
                const { actions: localActions, foundItem, isFallback } = await generateScene(state.player, currentLocation);
                if (opId !== operationIdRef.current) return;

                if (isFallback) handleFallback();
                
                dispatch({ type: 'SET_SCENE', payload: { description: choice.outcome, actions: localActions } });
    
                if (foundItem) {
                    handleFoundItem(foundItem);
                }
            }
        }
        
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
    }, [state.worldData, state.playerLocationId, state.player, handleFoundItem, handleFallback, createEventPopup, dispatch, operationIdRef]);

    // Handle Movement & Location Changes
    useEffect(() => {
        const prevLocationId = prevPlayerLocationId.current;
        prevPlayerLocationId.current = state.playerLocationId;

        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        if (prevLocationId && prevLocationId !== state.playerLocationId) {
            if (state.playerLocationId && state.worldData) {
                const move = async () => {
                    const opId = ++operationIdRef.current;
                    dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });

                    const newLocation = state.worldData!.locations.find(l => l.id === state.playerLocationId);
                    if (!newLocation) return;
                    
                    appendToLog(`You travel to ${newLocation.name}...`);
                    dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Traveled to ${newLocation.name}.` });
                    
                    if (Math.random() < TRAVEL_ENCOUNTER_CHANCE) {
                        // Optimization: Movement encounter. Do NOT save scene state as we want to generate new scene on win.
                        isLocalCombatRef.current = false;

                        // Note: generateEncounter is now synchronous/local
                        const { enemies: newEnemies, isFallback } = await generateEncounter(state.player);
                        if (opId !== operationIdRef.current) return;

                        if (isFallback) handleFallback();
                        const enemyNames = newEnemies.map(e => e.name).join(', ');
                        dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                        dispatch({ type: 'SET_SCENE', payload: { description: `While traveling to ${newLocation.name}, you are ambushed by a ${enemyNames}!`, actions: [] } });
                        appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'A mysterious force blocks your way.');
                        dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                        dispatch({ type: 'SET_PLAYER_TURN', payload: true });
                    } else {
                        const { description, actions: localActions, foundItem, isFallback } = await generateScene(state.player, newLocation);
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
    }, [state.playerLocationId, state.worldData, state.player, appendToLog, handleFoundItem, handleFallback, dispatch, operationIdRef, isInitialMount, prevPlayerLocationId, isLocalCombatRef]);

    // Compute available actions including movement
    const currentSceneActions = useMemo(() => {
        let actions = [...state.actions];
        
        if (state.worldData && state.playerLocationId) {
            const connections = state.worldData.connections.filter(c => c.from === state.playerLocationId);
            connections.forEach(conn => {
                const targetLocation = state.worldData!.locations.find(l => l.id === conn.to);
                if (targetLocation) {
                    actions.push({
                        label: `Travel to ${targetLocation.name}`,
                        type: 'move',
                        targetLocationId: targetLocation.id
                    });
                }
            });
        }
        return actions;
    }, [state.actions, state.worldData, state.playerLocationId]);

    return {
        handleCharacterCreation,
        handleImprovise,
        handleAction,
        handleSocialChoice,
        loadSceneForCurrentLocation,
        handleFallback,
        currentSceneActions
    };
};

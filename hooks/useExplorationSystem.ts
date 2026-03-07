
import React, { useCallback, useRef, useEffect, useMemo } from 'react';
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
        locationCache: Record<string, any>;
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

    const handleSceneResult = useCallback((result: any, opId: number, inputLabel?: string) => {
        if (opId !== operationIdRef.current) return;

        if (result.isFallback) handleFallback();

        if (inputLabel) {
            appendToLog(result.description);
            dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `${inputLabel} -> ${result.description}` });
        }

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
            if (result.foundItem) handleFoundItem(result.foundItem);
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
            isLocalCombatRef.current = true;
            dispatch({ type: 'SAVE_SCENE_STATE' });

            generateEncounter(state.player).then(({ enemies: newEnemies, isFallback }) => {
                if (opId !== operationIdRef.current) return;
                if (isFallback) handleFallback();
                dispatch({ type: 'SET_ENEMIES', payload: newEnemies });
                dispatch({ type: 'SET_SCENE', payload: { description: result.description, actions: [] } });
                appendToLog(newEnemies.length > 0 ? newEnemies[0].description : 'An unseen foe strikes!');
                dispatch({ type: 'SET_GAME_STATE', payload: GameState.COMBAT });
                dispatch({ type: 'SET_PLAYER_TURN', payload: true });
            });
        }
    }, [state.player, state.actions, appendToLog, handleFoundItem, handleFallback, createEventPopup, dispatch, operationIdRef, isLocalCombatRef]);

    const handleImprovise = useCallback(async (input: string) => {
        if (!input.trim()) return;
        const opId = ++operationIdRef.current;
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You attempt to: "${input}"`);

        const result = await generateImproviseResult(state.player, input);
        handleSceneResult(result, opId, `Improvised: "${input}"`);
    }, [state.player, appendToLog, dispatch, operationIdRef, handleSceneResult]);

    const handleAction = useCallback(async (action: GameAction) => {
        const opId = ++operationIdRef.current;

        if (action.type === 'move' && action.targetLocationId) {
            dispatch({ type: 'MOVE_PLAYER', payload: action.targetLocationId });
            return;
        }
    
        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        appendToLog(`You decide to ${action.label.toLowerCase()}...`);
    
        if (action.type === 'encounter' || action.type === 'explore') {
            const result = await generateExploreResult(state.player, action);
            handleSceneResult(result, opId, `Action: "${action.label}"`);
        }
    }, [state.player, appendToLog, handleFallback, dispatch, operationIdRef, isLocalCombatRef, handleSceneResult]);

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
                        // Check Cache First
                        if (state.locationCache && state.locationCache[newLocation.id]) {
                            const cached = state.locationCache[newLocation.id];
                            dispatch({ type: 'SET_SCENE', payload: { description: cached.description, actions: cached.localActions } });
                            dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                            return;
                        }

                        const { description, actions: localActions, foundItem, isFallback } = await generateScene(state.player, newLocation);
                        if (opId !== operationIdRef.current) return;

                        if (isFallback) handleFallback();
                         
                        dispatch({ type: 'SET_SCENE', payload: { description, actions: localActions } });

                        if (foundItem) handleFoundItem(foundItem);
                        
                        // Cache the result if not fallback
                        if (!isFallback) {
                            dispatch({ type: 'CACHE_LOCATION', payload: { id: newLocation.id, data: { description, localActions } } });
                        }

                        dispatch({ type: 'SET_GAME_STATE', payload: GameState.EXPLORING });
                    }
                };
                move();
            }
        }
    }, [state.playerLocationId, state.worldData, state.player, state.locationCache, appendToLog, handleFoundItem, handleFallback, dispatch, operationIdRef, isInitialMount, prevPlayerLocationId, isLocalCombatRef]);

    // Compute available actions including movement
    const currentSceneActions = useMemo(() => {
        // 1. Get Interaction Actions (Limit to 2)
        let actions = state.actions.filter(a => a.type === 'explore' || a.type === 'encounter').slice(0, 2);
        
        // Ensure we have 2 interaction options if possible (fallback if AI returned fewer)
        if (actions.length < 2) {
            actions.push({ label: "Inspect surroundings", type: "explore" });
        }
        if (actions.length < 2) {
             actions.push({ label: "Listen for danger", type: "encounter" });
        }

        // 2. Get Travel Actions (Limit/Fill to 2)
        if (state.worldData && state.playerLocationId) {
            const connections = state.worldData.connections.filter(c => c.from === state.playerLocationId);
            const travelActions: GameAction[] = [];

            // Add real connections
            connections.forEach(conn => {
                const targetLocation = state.worldData!.locations.find(l => l.id === conn.to);
                if (targetLocation) {
                    travelActions.push({
                        label: `Travel to ${targetLocation.name}`,
                        type: 'move',
                        targetLocationId: targetLocation.id
                    });
                }
            });

            // Fill with "Wilderness" or "Distant" travel if needed
            while (travelActions.length < 2) {
                 // Try to find a random location we aren't connected to
                 const otherLocations = state.worldData.locations.filter(l => 
                    l.id !== state.playerLocationId && 
                    !travelActions.some(a => a.targetLocationId === l.id)
                 );
                 
                 if (otherLocations.length > 0) {
                     const randomLoc = otherLocations[Math.floor(Math.random() * otherLocations.length)];
                     travelActions.push({
                        label: `Journey to ${randomLoc.name}`,
                        type: 'move',
                        targetLocationId: randomLoc.id
                    });
                 } else {
                     // Fallback if world is tiny (shouldn't happen with 6-8 locs)
                     travelActions.push({
                         label: "Wander into the Wilds",
                         type: 'explore' // effectively just an explore that looks like travel? Or maybe we make it a move to self?
                         // Let's just make it an explore for now to avoid breaking move logic
                     });
                 }
            }

            // Take exactly 2
            actions = [...actions, ...travelActions.slice(0, 2)];
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

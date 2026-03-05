
import { useReducer, useState, useEffect, useCallback, useRef } from 'react';
import { GameState, EventPopup } from '../types';
import { reducer } from '../state/reducer';
import { initialState } from '../state/initialState';
import { useSaveSystem } from './useSaveSystem';
import { useInventorySystem } from './useInventorySystem';
import { useExplorationSystem } from './useExplorationSystem';
import { useCombatSystem } from './useCombatSystem';

export const useGameEngine = () => {
    const [state, dispatch] = useReducer(reducer, initialState);

    // --- UI/Transient State maintained by Engine ---
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [eventPopups, setEventPopups] = useState<EventPopup[]>([]);

    // --- Refs for Loops & Async tracking ---
    const prevLevelRef = useRef(state.player.level);
    const isInitialMount = useRef(true);
    const prevPlayerLocationId = useRef<string | null>(null);
    const operationIdRef = useRef(0);
    // OPTIMIZATION: Track if combat is local (no movement). If so, we restore the scene instead of regenerating.
    const isLocalCombatRef = useRef(false);

    // Level Up Detection
    useEffect(() => {
        if (state.player.level > prevLevelRef.current) {
            setShowLevelUp(true);
            const timer = setTimeout(() => setShowLevelUp(false), 3000); 
            return () => clearTimeout(timer);
        }
        prevLevelRef.current = state.player.level;
    }, [state.player.level]);

    // --- Helpers ---
    const createEventPopup = useCallback((text: string, type: EventPopup['type']) => {
        const newPopup: EventPopup = { id: Date.now() + Math.random(), text, type };
        setEventPopups(prev => [...prev, newPopup]);
        setTimeout(() => {
            setEventPopups(prev => prev.filter(p => p.id !== newPopup.id));
        }, 2500);
    }, []);

    // Damage Popup Detection
    const prevHpRef = useRef(state.player.hp);
    useEffect(() => {
        if (state.player.hp < prevHpRef.current) {
            const damage = prevHpRef.current - state.player.hp;
            // Only show if damage > 0
            if (damage > 0) {
                createEventPopup(`-${damage} HP`, 'damage');
            }
        }
        prevHpRef.current = state.player.hp;
    }, [state.player.hp, createEventPopup]);

    const appendToLog = useCallback((message: string) => {
        dispatch({ type: 'ADD_LOG', payload: message });
    }, []);

    const startNewGame = useCallback(() => {
        isLocalCombatRef.current = false;
        dispatch({ type: 'START_NEW_GAME' });
    }, []);

    // --- Sub-Systems ---
    const { 
        handleUseItem, 
        handleEquipItem, 
        handleUnequipItem, 
        handleCombineItems, 
        handleFoundItem 
    } = useInventorySystem({ 
        state, 
        dispatch, 
        appendToLog, 
        createEventPopup 
    });

    const { 
        handleCharacterCreation, 
        handleImprovise, 
        handleAction, 
        handleSocialChoice, 
        loadSceneForCurrentLocation,
        handleFallback,
        currentSceneActions
    } = useExplorationSystem({ 
        state, 
        dispatch, 
        appendToLog, 
        createEventPopup, 
        handleFoundItem, 
        isLocalCombatRef, 
        operationIdRef,
        isInitialMount,
        prevPlayerLocationId
    });

    const { 
        handleCombatAction, 
        acknowledgeVictory 
    } = useCombatSystem({ 
        state, 
        dispatch, 
        appendToLog, 
        createEventPopup, 
        loadSceneForCurrentLocation, 
        isLocalCombatRef 
    });

    const { 
        saveFileExists, 
        latestSaveMeta, 
        availableSaves, 
        isSaving, 
        saveGame, 
        loadGame, 
        deleteSave 
    } = useSaveSystem({ 
        state, 
        dispatch, 
        appendToLog, 
        createEventPopup 
    });

    return {
        state,
        dispatch,
        saveFileExists,
        latestSaveMeta,
        availableSaves,
        showLevelUp,
        eventPopups,
        isSaving,
        startNewGame,
        handleCharacterCreation,
        saveGame,
        loadGame,
        deleteSave,
        handleImprovise,
        handleAction,
        handleUseItem,
        handleEquipItem,
        handleUnequipItem,
        handleCombineItems,
        handleCombatAction,
        handleSocialChoice,
        acknowledgeVictory,
        handleFallback,
        currentSceneActions
    };
};

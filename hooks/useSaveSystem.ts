
import { useState, useCallback, useEffect } from 'react';
import { GameState, SaveData, WorldData, Player, GameAction, EventPopup } from '../types';
import { saveGameToStorage, loadGameFromStorage, getLatestSaveMetadata, listSaves } from '../services/storageService';

interface UseSaveSystemProps {
    state: {
        player: Player;
        storyText: string;
        actions: GameAction[];
        log: string[];
        worldData: WorldData | null;
        playerLocationId: string | null;
        gameState: GameState;
    };
    dispatch: React.Dispatch<any>;
    appendToLog: (message: string) => void;
    createEventPopup: (text: string, type: EventPopup['type']) => void;
}

export const useSaveSystem = ({ state, dispatch, appendToLog, createEventPopup }: UseSaveSystemProps) => {
    const [saveFileExists, setSaveFileExists] = useState(false);
    const [latestSaveMeta, setLatestSaveMeta] = useState<any>(null);
    const [availableSaves, setAvailableSaves] = useState<any[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Check Save on Mount
    useEffect(() => {
        const check = async () => {
            const latest = await getLatestSaveMetadata();
            const saves = await listSaves();
            setAvailableSaves(saves);
            if (latest) {
                setSaveFileExists(true);
                setLatestSaveMeta(latest);
            } else {
                setSaveFileExists(false);
            }
        };
        check();
    }, []);

    const saveGame = useCallback(async (slotIdOrEvent?: string | React.SyntheticEvent) => {
        const slotId = typeof slotIdOrEvent === 'string' ? slotIdOrEvent : 'manual_1';

        if (!state.worldData || !state.playerLocationId) {
            createEventPopup("Cannot save: Invalid state", 'info');
            return;
        }
        
        const saveData: SaveData = { 
            version: 1,
            timestamp: Date.now(),
            id: slotId,
            player: state.player, 
            storyText: state.storyText, 
            actions: state.actions, 
            log: state.log, 
            worldData: state.worldData, 
            playerLocationId: state.playerLocationId 
        };
        
        setIsSaving(true);
        try {
            await saveGameToStorage(saveData, slotId);
            if (slotId.startsWith('manual')) {
                setSaveFileExists(true);
                // Update local metadata state so "Load Game" uses this new save if we return to title
                setLatestSaveMeta({
                    id: slotId,
                    timestamp: Date.now(),
                    version: 1, 
                    playerName: state.player.name,
                    playerLevel: state.player.level,
                    playerClass: state.player.className,
                    locationName: state.worldData.locations.find(l => l.id === state.playerLocationId)?.name || 'Unknown',
                    isAutoSave: false
                });
                appendToLog('Game Saved!');
                createEventPopup('Game Saved!', 'info');
            }
        } catch (e) {
            console.error("Save failed", e);
            createEventPopup('Save Failed!', 'info');
            appendToLog('Error: Could not save game (Storage quota exceeded?)');
        } finally {
            setTimeout(() => setIsSaving(false), 2000);
        }
    }, [state, appendToLog, createEventPopup]);

    const loadGame = useCallback(async (slotIdOrEvent?: string | React.SyntheticEvent) => {
        const slotId = typeof slotIdOrEvent === 'string' ? slotIdOrEvent : undefined;

        dispatch({ type: 'SET_GAME_STATE', payload: GameState.LOADING });
        try {
            const targetSlot = slotId || (latestSaveMeta ? latestSaveMeta.id : 'manual_1');
            const savedData = await loadGameFromStorage(targetSlot);
            if (savedData) {
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
    }, [appendToLog, createEventPopup, latestSaveMeta, dispatch]);

    const deleteSaveHandler = useCallback(async (slotId: string) => {
        try {
            await deleteSave(slotId);
            const saves = await listSaves();
            setAvailableSaves(saves);
            
            // If we deleted the latest save, update meta
            if (latestSaveMeta && latestSaveMeta.id === slotId) {
                 const newLatest = await getLatestSaveMetadata();
                 setLatestSaveMeta(newLatest);
                 setSaveFileExists(!!newLatest);
            }
            createEventPopup('Save Deleted', 'info');
        } catch (e) {
            console.error("Delete failed", e);
            createEventPopup('Delete Failed', 'info');
        }
    }, [latestSaveMeta, createEventPopup]);

    // Auto-Save Trigger
    useEffect(() => {
        if (state.gameState === GameState.EXPLORING && state.worldData && state.playerLocationId) {
            const timer = setTimeout(() => {
                saveGame('auto_1');
            }, 2000); // Debounce auto-save 2s after settling in EXPLORING state
            return () => clearTimeout(timer);
        }
    }, [state.gameState, state.playerLocationId, state.player.level, state.player.journal.quests, saveGame, state.worldData]);

    return {
        saveFileExists,
        latestSaveMeta,
        availableSaves,
        isSaving,
        saveGame,
        loadGame,
        deleteSave: deleteSaveHandler
    };
};

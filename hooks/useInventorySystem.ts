
import { useCallback } from 'react';
import { GameState, Item, ItemType, EquipmentSlot, EventPopup, Player } from '../types';

interface UseInventorySystemProps {
    state: {
        player: Player;
        gameState: GameState;
    };
    dispatch: React.Dispatch<any>;
    appendToLog: (message: string) => void;
    createEventPopup: (text: string, type: EventPopup['type']) => void;
}

export const useInventorySystem = ({ state, dispatch, appendToLog, createEventPopup }: UseInventorySystemProps) => {
    const handleUseItem = useCallback((item: Item, index: number) => {
        if (item.type === ItemType.POTION) {
            const healAmount = item.value || 0;
            const newHp = Math.min(state.player.maxHp, state.player.hp + healAmount);
            const healed = newHp - state.player.hp;

            if (healed > 0) {
                dispatch({type: 'USE_ITEM', payload: { inventoryIndex: index }});
                dispatch({ type: 'UPDATE_PLAYER', payload: { hp: newHp } });

                const logMessage = `You use a ${item.name} and recover ${healed} HP.`;
                appendToLog(logMessage);
                createEventPopup(`+${healed} HP`, 'heal');
                
                if (state.gameState === GameState.COMBAT) {
                    dispatch({ type: 'SET_PLAYER_TURN', payload: false });
                }
            } else {
                appendToLog(`Your HP is already full!`);
            }
        }
    }, [state.player, state.gameState, appendToLog, createEventPopup, dispatch]);

    const handleEquipItem = useCallback((item: Item, index: number) => {
        dispatch({ type: 'EQUIP_ITEM', payload: { inventoryIndex: index } });
        createEventPopup(`Equipped ${item.name}`, 'info');
        if (state.gameState === GameState.COMBAT) {
             dispatch({ type: 'SET_PLAYER_TURN', payload: false });
        }
    }, [state.gameState, createEventPopup, dispatch]);

    const handleUnequipItem = useCallback((slot: EquipmentSlot) => {
        dispatch({ type: 'UNEQUIP_ITEM', payload: { slot } });
        if (state.gameState === GameState.COMBAT) {
            dispatch({ type: 'SET_PLAYER_TURN', payload: false });
       }
    }, [state.gameState, dispatch]);

    const handleCombineItems = useCallback((item1Index: number, item2Index: number) => {
        dispatch({ type: 'COMBINE_ITEMS', payload: { item1Index, item2Index } });
    }, [dispatch]);

    const handleFoundItem = useCallback((itemDef: Omit<Item, 'quantity'>) => {
        appendToLog(`You found a ${itemDef.name}!`);
        createEventPopup(`Found: ${itemDef.name}!`, 'item');
        dispatch({ type: 'ADD_ITEM_TO_INVENTORY', payload: itemDef });
    }, [appendToLog, createEventPopup, dispatch]);

    return {
        handleUseItem,
        handleEquipItem,
        handleUnequipItem,
        handleCombineItems,
        handleFoundItem
    };
};

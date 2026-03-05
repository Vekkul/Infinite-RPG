
import { useEffect, useRef, useCallback } from 'react';
import { GameState, Enemy, Player, EnemyAbility, StatusEffectType, AIPersonality, Element, PlayerAbility, Item } from '../types';
import { STATUS_EFFECT_CONFIG, ENEMY_STATUS_CHANCE, ENEMY_STATUS_MAP, CRIT_CHANCE, CRIT_MULTIPLIER, FLEE_CHANCE } from '../constants';

interface UseCombatSystemProps {
    state: {
        gameState: GameState;
        isPlayerTurn: boolean;
        enemies: Enemy[];
        player: Player;
        combatResult: { xp: number; loot: Omit<Item, 'quantity'>[]; text: string } | null;
        preCombatState: { description: string; actions: any[] } | null;
    };
    dispatch: React.Dispatch<any>;
    appendToLog: (message: string) => void;
    createEventPopup: (text: string, type: 'info' | 'heal' | 'item' | 'xp' | 'quest' | 'damage') => void;
    loadSceneForCurrentLocation: (args: { enemies: Enemy[], result: 'VICTORY' | 'FLED' }) => Promise<void>;
    isLocalCombatRef: React.MutableRefObject<boolean>;
}

export const useCombatSystem = ({ 
    state, 
    dispatch, 
    appendToLog, 
    createEventPopup, 
    loadSceneForCurrentLocation, 
    isLocalCombatRef 
}: UseCombatSystemProps) => {
    
    const enemyTurnInProgress = useRef(false);
    const combatActiveRef = useRef(false);

    // Sync combatActiveRef
    useEffect(() => {
        combatActiveRef.current = state.gameState === GameState.COMBAT;
    }, [state.gameState]);

    const handleCombatAction = useCallback(async (
        action: 'attack' | 'defend' | 'flee' | 'ability',
        payload?: { ability?: PlayerAbility; targetIndex?: number; onDamageDealt?: (damage: number, isCrit: boolean) => void; }
    ) => {
        if (!state.isPlayerTurn || state.enemies.length === 0) return;

        dispatch({ type: 'SET_PLAYER_TURN', payload: false });
        dispatch({ type: 'UPDATE_PLAYER', payload: { isDefending: false } });
        
        dispatch({ type: 'PROCESS_TURN_EFFECTS', payload: { target: 'player' } });

        if (action === 'attack' && payload?.targetIndex !== undefined) {
            const target = state.enemies[payload.targetIndex];
            const isCrit = Math.random() < CRIT_CHANCE;
            let damage = Math.floor(state.player.attack + (Math.random() * 5 - 2));
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
                // OPTIMIZATION: Check if we can restore local scene instead of calling API
                if (isLocalCombatRef.current && state.preCombatState) {
                    const enemyNames = state.enemies.map(e => e.name).join(', ');
                    dispatch({ type: 'RESTORE_SCENE_STATE', payload: { appendText: `You managed to escape from the ${enemyNames}.` } });
                    dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Fled from ${enemyNames}.` });
                    dispatch({ type: 'SET_ENEMIES', payload: [] });
                } else {
                    await loadSceneForCurrentLocation({ enemies: state.enemies, result: 'FLED' });
                    dispatch({ type: 'SET_ENEMIES', payload: [] });
                }
                return;
            } else {
                dispatch({ type: 'PLAYER_ACTION_FLEE_FAILURE' });
            }
        }
    }, [state.player, state.enemies, state.isPlayerTurn, state.preCombatState, appendToLog, loadSceneForCurrentLocation, isLocalCombatRef, dispatch]);

    const acknowledgeVictory = useCallback(async () => {
        const defeatedEnemies = state.enemies;
        dispatch({ type: 'ACKNOWLEDGE_VICTORY' });

        if (isLocalCombatRef.current && state.preCombatState) {
             dispatch({ type: 'RESTORE_SCENE_STATE', payload: { appendText: "The battle is won." } });
        } else {
             await loadSceneForCurrentLocation({ enemies: defeatedEnemies, result: 'VICTORY' });
        }
    }, [state.enemies, state.preCombatState, loadSceneForCurrentLocation, isLocalCombatRef, dispatch]);

    // Combat Logic: Enemy AI Turn
    useEffect(() => {
        if (state.gameState !== GameState.COMBAT || state.isPlayerTurn || enemyTurnInProgress.current || state.combatResult) return;

        const handleCombatVictory = async (defeatedEnemies: Enemy[]) => {
            const totalXpGained = defeatedEnemies.reduce((sum, e) => sum + Math.floor(e.maxHp / 2) + e.attack, 0);
            const lootItems = defeatedEnemies.map(e => e.loot).filter((l): l is Omit<Item, 'quantity'> => !!l);
            const enemyNames = defeatedEnemies.map(e => e.name).join(', ');

            let regen = { hp: 0, mp: 0, ep: 0, sp: 0 };
            // Base regeneration
            regen.hp = Math.floor(state.player.maxHp * 0.05);

            // Regenerate resources if they have them
            if (state.player.maxMp > 0) regen.mp = Math.max(1, Math.floor(state.player.maxMp * 0.15));
            if (state.player.maxEp > 0) regen.ep = Math.max(1, Math.floor(state.player.maxEp * 0.15));
            if (state.player.maxSp > 0) regen.sp = Math.max(1, Math.floor(state.player.maxSp * 0.15));
            
            dispatch({ 
                type: 'PROCESS_COMBAT_VICTORY', 
                payload: { xpGained: totalXpGained, loot: lootItems, regen }
            });
            
            // Add to Narrative History
            dispatch({ type: 'ADD_NARRATIVE_HISTORY', payload: `Defeated ${enemyNames}.` });
            
            const victoryTexts = [
                `The ${enemyNames} lies defeated at your feet.`,
                `Silence falls as the ${enemyNames} is vanquished.`,
                `You stand victorious over the fallen ${enemyNames}.`
            ];
            const text = victoryTexts[Math.floor(Math.random() * victoryTexts.length)];

            dispatch({
                type: 'SET_COMBAT_RESULT',
                payload: { xp: totalXpGained, loot: lootItems, text }
            });
        };

        const allEnemiesDefeated = state.enemies.every(e => e.hp <= 0);
        if (allEnemiesDefeated && state.enemies.length > 0) {
            handleCombatVictory(state.enemies);
            return;
        }

        const runEnemyTurns = async () => {
            enemyTurnInProgress.current = true;
            let currentHp = state.player.hp;
            
            // DELAY 1: Post-player turn pause (600ms)
            await new Promise(resolve => setTimeout(resolve, 600));
    
            // Weighted RNG Decision Logic
            const determineEnemyAction = (enemy: Enemy): 'attack' | EnemyAbility | null => {
                if (!enemy.ability) return 'attack';
                
                const roll = Math.random();
                const hpPercent = enemy.hp / enemy.maxHp;

                switch (enemy.aiPersonality) {
                    case AIPersonality.AGGRESSIVE:
                        // 70% Attack, 20% Ability, 10% Wait/Fallthrough
                        if (roll < 0.70) return 'attack';
                        if (roll < 0.90) return enemy.ability;
                        return 'attack';
                    
                    case AIPersonality.DEFENSIVE:
                         // High chance to Heal/Shield if low HP, otherwise balanced
                        if (hpPercent < 0.5 && (enemy.ability === EnemyAbility.HEAL || enemy.ability === EnemyAbility.SHIELD)) {
                             // 60% chance to use defensive ability when low
                             if (roll < 0.60) return enemy.ability;
                        }
                        // Default Defensive: 40% Attack, 40% Defend/Ability, 20% Wait
                        if (roll < 0.40) return 'attack';
                        if (roll < 0.80) return enemy.ability;
                        return 'attack';

                    case AIPersonality.STRATEGIC:
                        // Context aware. 
                        if (enemy.ability === EnemyAbility.HEAL && hpPercent < 0.4) return EnemyAbility.HEAL;
                        if (enemy.ability === EnemyAbility.SHIELD && !enemy.isShielded && roll < 0.7) return EnemyAbility.SHIELD;
                        // Otherwise 60/40 split
                        if (roll < 0.6) return 'attack';
                        return enemy.ability;

                    case AIPersonality.WILD:
                        // 50/50 Split
                        if (roll < 0.5) return 'attack';
                        return enemy.ability;

                    default:
                        return 'attack';
                }
            };
    
            for (let i = 0; i < state.enemies.length; i++) {
                    if (!combatActiveRef.current) break;
    
                    if (state.enemies[i].hp > 0 && currentHp > 0) { 
                    
                    // DELAY 2: Pause before each enemy specific action (1000ms)
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    
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
                                const playerDamageTakenDrain = state.player.isDefending ? Math.max(1, Math.floor(drainDamage / 2)) : drainDamage;
                                const finalDamageDrain = Math.max(1, playerDamageTakenDrain - (state.player.defense || 0));
                                
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
                                        let playerDamageTakenMulti = state.player.isDefending ? Math.max(1, Math.floor(multiDamage / 2)) : multiDamage;
                                        playerDamageTakenMulti = Math.max(1, playerDamageTakenMulti - (state.player.defense || 0));
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
                        
                        let playerDamageTaken = state.player.isDefending ? Math.max(1, Math.floor(enemyDamage / 2)) : enemyDamage;
                        
                        if (state.player.statusEffects.some(e => e.type === StatusEffectType.GROUNDED)) {
                            playerDamageTaken = Math.floor(playerDamageTaken * (1 + STATUS_EFFECT_CONFIG.GROUNDED.defenseReduction));
                        }
                         if (state.player.statusEffects.some(e => e.type === StatusEffectType.EARTH_ARMOR)) {
                            playerDamageTaken = Math.floor(playerDamageTaken * (1 - STATUS_EFFECT_CONFIG.EARTH_ARMOR.defenseBonus));
                        }
                        
                        playerDamageTaken = Math.max(1, playerDamageTaken - (state.player.defense || 0));
    
                        const newPlayerHp = Math.max(0, currentHp - playerDamageTaken);
                        currentHp = newPlayerHp;
                        dispatch({ type: 'UPDATE_PLAYER', payload: { hp: newPlayerHp } });
                        appendToLog(`${enemy.name} attacks! You take ${playerDamageTaken} damage. ${isCrit ? 'CRITICAL!' : ''}`);
    
                        if (enemy.element && enemy.element !== Element.NONE && Math.random() < ENEMY_STATUS_CHANCE[enemy.element]) {
                            const effectType = ENEMY_STATUS_MAP[enemy.element];
                            const effect: any = {
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
                        break;
                    }
                }
            }
            
            if (currentHp > 0) {
                dispatch({ type: 'SET_PLAYER_TURN', payload: true });
            }
            enemyTurnInProgress.current = false;
        };

        runEnemyTurns();

    }, [
        state.gameState, 
        state.isPlayerTurn, 
        state.enemies, 
        state.player, 
        state.combatResult, 
        dispatch, 
        appendToLog, 
        createEventPopup
    ]);

    return {
        handleCombatAction,
        acknowledgeVictory
    };
};

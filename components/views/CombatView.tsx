
import React, { useState, useMemo, useCallback } from 'react';
import { Enemy, EnemyAbility, Player, PlayerAbility, StatusEffectType, Element } from '../../types';
import { StatusBar } from '../StatusBar';
import { HealIcon, ShieldIcon, SwordIcon, RunIcon, FireIcon, BoltIcon, StarIcon } from '../icons';
import { useTypewriter } from '../../hooks/useTypewriter';
import { PLAYER_ABILITIES, STATUS_EFFECT_CONFIG } from '../../constants';

interface CombatViewProps {
  storyText: string;
  enemies: Enemy[];
  player: Player;
  isPlayerTurn: boolean;
  onCombatAction: (action: 'attack' | 'defend' | 'flee' | 'ability', payload?: any) => void;
}

interface DamagePopup {
    id: number;
    value: number;
    isCrit: boolean;
    enemyIndex: number;
}

const statusEffectIcons: Record<StatusEffectType, React.ReactNode> = {
    [StatusEffectType.BURN]: <FireIcon className="w-4 h-4 text-orange-400" />,
    [StatusEffectType.CHILL]: <span className="text-cyan-400">❄️</span>,
    [StatusEffectType.SHOCK]: <BoltIcon className="w-4 h-4 text-yellow-400" />,
    [StatusEffectType.GROUNDED]: <span className="text-amber-700">⛰️</span>,
    [StatusEffectType.EARTH_ARMOR]: <ShieldIcon className="w-4 h-4 text-green-500" />,
};

// Memoized Sub-Component for individual Enemies to prevent mass re-renders
const EnemyUnit = React.memo(({ enemy, index, damagePopups }: { enemy: Enemy, index: number, damagePopups: DamagePopup[] }) => {
    return (
        <div 
            className={`relative bg-gray-800/90 p-3 rounded-lg border-2 shadow-lg animate-fade-in w-full sm:w-48 text-center transition-all duration-300 ${
                enemy.isShielded ? 'border-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse' : 'border-red-500/80'
            }`}
        >
            {damagePopups.map(p => (
                <div key={p.id} className={`damage-popup ${p.isCrit ? 'crit' : ''}`}>
                    {p.isCrit ? 'CRIT! ' : ''}-{p.value}
                </div>
            ))}
            
            <div className="flex items-center justify-center gap-1.5 mb-2 relative z-10 flex-wrap">
                <h2 className="text-lg font-cinzel font-bold text-red-200 truncate max-w-[80%]" title={enemy.name}>{enemy.name}</h2>
                
                {/* Info Tooltip */}
                <div className="group/info relative flex items-center justify-center">
                    <div className="w-5 h-5 rounded-full border border-gray-500 text-gray-400 text-xs flex items-center justify-center cursor-help hover:bg-gray-700 hover:text-white transition-colors bg-gray-900 font-serif italic">i</div>
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-gray-900/95 backdrop-blur-sm border border-yellow-500/30 text-white text-xs p-3 rounded-lg shadow-2xl opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none z-[100] text-left font-sans">
                        <p className="font-bold font-cinzel text-yellow-500 mb-1 text-sm">{enemy.name}</p>
                        <p className="italic text-gray-300 mb-2 leading-relaxed font-serif">{enemy.description}</p>
                        <div className="border-t border-gray-700 pt-2 grid grid-cols-2 gap-x-2 gap-y-1 font-bold text-[10px] text-gray-400">
                                <span>ATK: <span className="text-gray-200">{enemy.attack}</span></span>
                                <span>HP: <span className="text-gray-200">{enemy.hp}/{enemy.maxHp}</span></span>
                                {enemy.element && enemy.element !== 'NONE' && <span className="col-span-2 text-blue-300">Element: {enemy.element}</span>}
                                {enemy.ability && <span className="col-span-2 text-purple-300">Ability: {enemy.ability}</span>}
                                {enemy.aiPersonality && <span className="col-span-2 text-green-300">AI: {enemy.aiPersonality}</span>}
                        </div>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-yellow-500/30"></div>
                    </div>
                </div>

                {enemy.ability === EnemyAbility.HEAL && <HealIcon className="w-5 h-5 text-green-400" title="Heal Ability" />}
                {enemy.ability === EnemyAbility.SHIELD && <ShieldIcon className="w-5 h-5 text-cyan-400" title="Shield Ability" />}
                {enemy.ability === EnemyAbility.DRAIN_LIFE && <BoltIcon className="w-5 h-5 text-purple-400" title="Drain Life Ability" />}
                {enemy.ability === EnemyAbility.MULTI_ATTACK && <SwordIcon className="w-5 h-5 text-orange-400" title="Multi-Attack Ability" />}

                {/* Status Effects next to name */}
                {enemy.statusEffects.map(effect => (
                    <div key={effect.type} title={effect.type} className="animate-pulse">
                        {statusEffectIcons[effect.type]}
                    </div>
                ))}
            </div>

            <StatusBar label="HP" currentValue={enemy.hp} maxValue={enemy.maxHp} colorClass="bg-red-500" />
            
        </div>
    );
}, (prev, next) => {
    // Only re-render if enemy data changes or if relevant damage popups change
    return prev.enemy === next.enemy && 
           prev.index === next.index && 
           prev.damagePopups === next.damagePopups;
});


export const CombatView: React.FC<CombatViewProps> = ({ storyText, enemies, player, isPlayerTurn, onCombatAction }) => {
    const [view, setView] = useState<'main' | 'targeting' | 'abilities'>('main');
    const [actionType, setActionType] = useState<'attack' | 'ability'>('attack');
    const [selectedAbility, setSelectedAbility] = useState<PlayerAbility | null>(null);
    const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);

    const displayedText = useTypewriter(storyText, 30);
    
    // Create popups without triggering full re-renders of unrelated components if possible
    const createDamagePopup = useCallback((damage: number, isCrit: boolean, enemyIndex: number) => {
        const newPopup: DamagePopup = { id: Date.now(), value: damage, isCrit, enemyIndex };
        setDamagePopups(prev => [...prev, newPopup]);
        setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
        }, 1000); 
    }, []);

    const handleActionClick = useCallback((type: 'attack' | 'ability', ability: PlayerAbility | null = null) => {
        const activeEnemiesCount = enemies.filter(e => e.hp > 0).length;
        
        setActionType(type);
        setSelectedAbility(ability);

        if (type === 'ability' && ability) {
            const details = PLAYER_ABILITIES[ability];
            // If it's a self-target ability (Heal, Buff), execute immediately or handle differently
            if (details.healAmount || details.statusEffect === StatusEffectType.EARTH_ARMOR) {
                 onCombatAction('ability', {
                    ability: ability,
                    targetIndex: 0, // Target index irrelevant for self-cast, but payload needed
                });
                return;
            }
        }
        
        if (activeEnemiesCount === 1) {
            const targetIndex = enemies.findIndex(e => e.hp > 0);
            onCombatAction(type, {
                ability: ability,
                targetIndex: targetIndex,
                onDamageDealt: (damage: number, isCrit: boolean) => createDamagePopup(damage, isCrit, targetIndex)
            });
        } else {
            setView('targeting');
        }
    }, [enemies, onCombatAction, createDamagePopup]);
    
    const handleTargetSelect = useCallback((index: number) => {
        onCombatAction(actionType, {
            ability: selectedAbility,
            targetIndex: index,
            onDamageDealt: (damage: number, isCrit: boolean) => createDamagePopup(damage, isCrit, index)
        });
        setView('main');
        setSelectedAbility(null);
    }, [actionType, selectedAbility, onCombatAction, createDamagePopup]);
    
    const renderAbilities = useMemo(() => {
        return (
            <div className="grid grid-cols-1 gap-2 col-span-full max-h-48 overflow-y-auto pr-2">
                {player.abilities.map((abilityName) => {
                    const details = PLAYER_ABILITIES[abilityName];
                    if (!details) return null;
                    
                    let canAfford = true;
                    if (details.resource === 'MP' && (player.mp < details.cost)) canAfford = false;
                    if (details.resource === 'EP' && (player.ep < details.cost)) canAfford = false;
                    if (details.resource === 'SP' && (player.sp < details.cost)) canAfford = false;

                    let colorClass = "bg-gray-700 border-gray-500";
                    if (details.element === Element.FIRE) colorClass = "bg-orange-700 border-orange-500 hover:bg-orange-600";
                    else if (details.element === Element.ICE) colorClass = "bg-cyan-700 border-cyan-500 hover:bg-cyan-600";
                    else if (details.element === Element.EARTH) colorClass = "bg-amber-800 border-amber-600 hover:bg-amber-700";
                    else if (details.element === Element.LIGHTNING) colorClass = "bg-indigo-700 border-indigo-500 hover:bg-indigo-600";
                    else if (details.healAmount) colorClass = "bg-green-700 border-green-500 hover:bg-green-600";
                    else if (details.isSocial) colorClass = "bg-pink-700 border-pink-500 hover:bg-pink-600";

                    return (
                        <button 
                            key={abilityName} 
                            onClick={() => handleActionClick('ability', abilityName)} 
                            disabled={!canAfford} 
                            className={`flex items-center justify-between gap-2 text-base md:text-lg text-white font-cinzel font-bold py-3 px-4 rounded-lg border-2 active:scale-95 transition-all ${colorClass} disabled:opacity-50 disabled:grayscale`}
                        >
                            <span>{details.name}</span>
                            <span className="text-xs font-sans font-bold bg-black/30 px-2 py-1 rounded tracking-wide">{details.cost} {details.resource}</span>
                        </button>
                    );
                })}
            </div>
        );
    }, [player.abilities, player.mp, player.ep, player.sp, handleActionClick]);

    return (
        <div className="flex flex-col h-full">
            {/* Scrollable Content Area (Enemies + Text) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-2 flex flex-col gap-4">
                {/* Narrative Area */}
                <div className="min-h-[3rem] shrink-0">
                    <p className={`transition-opacity duration-300 text-lg md:text-xl font-serif leading-relaxed ${!isPlayerTurn ? 'opacity-50' : ''}`}>{displayedText}</p>
                </div>
                
                {/* Enemies Area */}
                <div className="mb-2 p-1">
                    <div className="flex flex-wrap items-center justify-center gap-4">
                        {enemies.map((enemy, index) => enemy.hp > 0 && (
                            <EnemyUnit 
                                key={index} 
                                enemy={enemy} 
                                index={index} 
                                damagePopups={damagePopups.filter(p => p.enemyIndex === index)} 
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Fixed Bottom Actions */}
            <div className="flex-shrink-0 pt-2 border-t border-gray-700/50 mt-auto">
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                     {isPlayerTurn && view === 'main' && (
                        <>
                            <button onClick={() => handleActionClick('attack')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold py-3 px-2 rounded-lg border-2 border-red-600 active:scale-95 transition-all shadow-md"><SwordIcon/>Attack</button>
                            <button onClick={() => setView('abilities')} disabled={player.abilities.length === 0} className="flex items-center justify-center gap-2 text-base md:text-lg bg-purple-800 hover:bg-purple-700 disabled:bg-gray-700 text-white font-cinzel font-bold py-3 px-2 rounded-lg border-2 border-purple-600 active:scale-95 transition-all shadow-md"><StarIcon />Ability</button>
                            <button onClick={() => onCombatAction('defend')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-blue-800 hover:bg-blue-700 text-white font-cinzel font-bold py-3 px-2 rounded-lg border-2 border-blue-600 active:scale-95 transition-all shadow-md"><ShieldIcon/>Defend</button>
                            <button onClick={() => onCombatAction('flee')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-green-800 hover:bg-green-700 text-white font-cinzel font-bold py-3 px-2 rounded-lg border-2 border-green-600 active:scale-95 transition-all shadow-md"><RunIcon/>Flee</button>
                        </>
                     )}
                     {isPlayerTurn && view === 'targeting' && (
                        <div className="col-span-full flex flex-col gap-2 animate-fade-in-short max-h-32 md:max-h-48 overflow-y-auto pr-2">
                            <p className="text-center text-sm uppercase tracking-wide text-gray-400 font-bold">Select Target</p>
                            {enemies.map((enemy, index) => enemy.hp > 0 && (
                                <button key={index} onClick={() => handleTargetSelect(index)} className="w-full text-lg bg-red-800 hover:bg-red-700 text-white font-cinzel font-bold py-3 px-3 rounded-lg border-2 border-red-600">{enemy.name}</button>
                            ))}
                            <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-cinzel font-bold py-3 px-3 rounded-lg border-2 border-gray-400">Cancel</button>
                        </div>
                    )}
                    {isPlayerTurn && view === 'abilities' && (
                        <div className="col-span-full flex flex-col gap-2 animate-fade-in-short">
                            <p className="text-center text-sm uppercase tracking-wide text-gray-400 font-bold">Select Ability</p>
                            {renderAbilities}
                            <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-cinzel font-bold py-3 px-3 rounded-lg border-2 border-gray-400 mt-2">Back</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
    
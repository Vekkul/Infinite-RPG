
import React, { useState } from 'react';
import { Enemy, EnemyAbility, Player, CharacterClass, PlayerAbility, StatusEffectType, Element } from '../../types';
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

export const CombatView: React.FC<CombatViewProps> = ({ storyText, enemies, player, isPlayerTurn, onCombatAction }) => {
    const [view, setView] = useState<'main' | 'targeting' | 'abilities'>('main');
    const [actionType, setActionType] = useState<'attack' | 'ability'>('attack');
    const [selectedAbility, setSelectedAbility] = useState<PlayerAbility | null>(null);
    const [damagePopups, setDamagePopups] = useState<DamagePopup[]>([]);

    const displayedText = useTypewriter(storyText, 30);
    const activeEnemies = enemies.filter(e => e.hp > 0);

    const createDamagePopup = (damage: number, isCrit: boolean, enemyIndex: number) => {
        const newPopup: DamagePopup = { id: Date.now(), value: damage, isCrit, enemyIndex };
        setDamagePopups(prev => [...prev, newPopup]);
        setTimeout(() => {
            setDamagePopups(prev => prev.filter(p => p.id !== newPopup.id));
        }, 1000); 
    };

    const handleActionClick = (type: 'attack' | 'ability', ability: PlayerAbility | null = null) => {
        setActionType(type);
        setSelectedAbility(ability);
        if (activeEnemies.length === 1) {
            const targetIndex = enemies.findIndex(e => e.hp > 0);
            onCombatAction(type, {
                ability: ability,
                targetIndex: targetIndex,
                onDamageDealt: (damage: number, isCrit: boolean) => createDamagePopup(damage, isCrit, targetIndex)
            });
        } else {
            setView('targeting');
        }
    };
    
    const handleTargetSelect = (index: number) => {
        onCombatAction(actionType, {
            ability: selectedAbility,
            targetIndex: index,
            onDamageDealt: (damage: number, isCrit: boolean) => createDamagePopup(damage, isCrit, index)
        });
        setView('main');
        setSelectedAbility(null);
    };
    
    const renderAbilities = () => {
        const abilities: React.ReactNode[] = [];
        if (player.class === CharacterClass.WARRIOR) {
            const ability = PLAYER_ABILITIES[PlayerAbility.EARTHEN_STRIKE];
            abilities.push(<button key={ability.name} onClick={() => handleActionClick('ability', ability.name)} className="flex items-center justify-center gap-2 text-base md:text-lg bg-amber-800 hover:bg-amber-700 text-white font-bold py-3 px-4 rounded-lg border-2 border-amber-600 active:scale-95 transition-all">⛰️ {ability.name}</button>)
        }
        if (player.class === CharacterClass.MAGE) {
            const fireball = PLAYER_ABILITIES[PlayerAbility.FIREBALL];
            const iceShard = PLAYER_ABILITIES[PlayerAbility.ICE_SHARD];
            const fbDisabled = (player.mp ?? 0) < fireball.cost;
            const isDisabled = (player.mp ?? 0) < iceShard.cost;
            abilities.push(<button key={fireball.name} onClick={() => handleActionClick('ability', fireball.name)} disabled={fbDisabled} className="flex items-center justify-center gap-2 text-base md:text-lg bg-orange-700 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-orange-500 active:scale-95 transition-all"><FireIcon/> {fireball.name} ({fireball.cost} MP)</button>)
            abilities.push(<button key={iceShard.name} onClick={() => handleActionClick('ability', iceShard.name)} disabled={isDisabled} className="flex items-center justify-center gap-2 text-base md:text-lg bg-cyan-700 hover:bg-cyan-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-cyan-500 active:scale-95 transition-all">❄️ {iceShard.name} ({iceShard.cost} MP)</button>)
        }
        if (player.class === CharacterClass.ROGUE) {
             const ability = PLAYER_ABILITIES[PlayerAbility.LIGHTNING_STRIKE];
             const disabled = (player.ep ?? 0) < ability.cost;
            abilities.push(<button key={ability.name} onClick={() => handleActionClick('ability', ability.name)} disabled={disabled} className="flex items-center justify-center gap-2 text-base md:text-lg bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-indigo-500 active:scale-95 transition-all"><BoltIcon/> {ability.name} ({ability.cost} EP)</button>)
        }
        return <div className="grid grid-cols-1 gap-2 col-span-full max-h-48 overflow-y-auto">{abilities}</div>;
    }

    return (
        <div className="flex flex-col h-full">
            {/* Narrative Area - Fixed Height or Collapsible on tiny screens could be good, but Flex-1 is fine */}
            <div className="mb-4 min-h-[3rem]">
                <p className={`transition-opacity duration-300 text-lg ${!isPlayerTurn ? 'opacity-50' : ''}`}>{displayedText}</p>
            </div>
            
            {/* Enemies Area - Scrollable if too many */}
            <div className="flex-grow overflow-y-auto mb-4 p-1">
                <div className="flex flex-wrap items-center justify-center gap-4">
                    {enemies.map((enemy, index) => enemy.hp > 0 && (
                        <div 
                            key={index} 
                            className={`relative bg-gray-800/90 p-3 rounded-lg border-2 shadow-lg animate-fade-in w-full sm:w-48 text-center transition-all duration-300 ${
                                enemy.isShielded ? 'border-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse' : 'border-red-500'
                            }`}
                        >
                            {damagePopups.filter(p => p.enemyIndex === index).map(p => (
                                <div key={p.id} className={`damage-popup ${p.isCrit ? 'crit' : ''}`}>
                                    {p.isCrit ? 'CRIT! ' : ''}-{p.value}
                                </div>
                            ))}
                            
                            <div className="flex items-center justify-center gap-2 mb-1">
                                <h2 className="text-lg font-press-start text-red-300 truncate" title={enemy.name}>{enemy.name}</h2>
                                {enemy.ability === EnemyAbility.HEAL && <HealIcon className="w-5 h-5 text-green-400" title="Heal Ability" />}
                                {enemy.ability === EnemyAbility.SHIELD && <ShieldIcon className="w-5 h-5 text-cyan-400" title="Shield Ability" />}
                                {enemy.ability === EnemyAbility.DRAIN_LIFE && <BoltIcon className="w-5 h-5 text-purple-400" title="Drain Life Ability" />}
                                {enemy.ability === EnemyAbility.MULTI_ATTACK && <SwordIcon className="w-5 h-5 text-orange-400" title="Multi-Attack Ability" />}
                            </div>

                            <StatusBar label="HP" currentValue={enemy.hp} maxValue={enemy.maxHp} colorClass="bg-red-500" />
                            
                            <div className="flex justify-center items-center gap-1.5 mt-2 h-5">
                                {enemy.statusEffects.map(effect => (
                                    <div key={effect.type} className="relative group">
                                        {statusEffectIcons[effect.type]}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions Area */}
            <div className="shrink-0 grid grid-cols-2 gap-3 pb-2">
                 {isPlayerTurn && view === 'main' && (
                    <>
                        <button onClick={() => handleActionClick('attack')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-2 rounded-lg border-2 border-red-500 active:scale-95 transition-all"><SwordIcon/>Attack</button>
                        <button onClick={() => setView('abilities')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-2 rounded-lg border-2 border-purple-500 active:scale-95 transition-all"><StarIcon />Ability</button>
                        <button onClick={() => onCombatAction('defend')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-2 rounded-lg border-2 border-blue-500 active:scale-95 transition-all"><ShieldIcon/>Defend</button>
                        <button onClick={() => onCombatAction('flee')} className="flex items-center justify-center gap-2 text-base md:text-lg bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-2 rounded-lg border-2 border-green-500 active:scale-95 transition-all"><RunIcon/>Flee</button>
                    </>
                 )}
                 {isPlayerTurn && view === 'targeting' && (
                    <div className="col-span-full flex flex-col gap-2 animate-fade-in-short max-h-48 overflow-y-auto">
                        <p className="text-center text-sm uppercase tracking-wide text-gray-400">Select Target</p>
                        {enemies.map((enemy, index) => enemy.hp > 0 && (
                            <button key={index} onClick={() => handleTargetSelect(index)} className="w-full text-lg bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-3 rounded-lg border-2 border-red-600">{enemy.name}</button>
                        ))}
                        <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-3 rounded-lg border-2 border-gray-400">Cancel</button>
                    </div>
                )}
                {isPlayerTurn && view === 'abilities' && (
                    <div className="col-span-full flex flex-col gap-2 animate-fade-in-short">
                        <p className="text-center text-sm uppercase tracking-wide text-gray-400">Select Ability</p>
                        {renderAbilities()}
                        <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-bold py-3 px-3 rounded-lg border-2 border-gray-400 mt-2">Back</button>
                    </div>
                )}
            </div>
        </div>
    );
};

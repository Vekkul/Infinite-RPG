import React, { useState } from 'react';
import { Enemy, EnemyAbility, Player, CharacterClass, PlayerAbility } from '../../types';
import { StatusBar } from '../StatusBar';
import { HealIcon, ShieldIcon, SwordIcon, RunIcon, FireIcon, BoltIcon } from '../icons';
import { useTypewriter } from '../../hooks/useTypewriter';
import { PLAYER_ABILITIES } from '../../constants';

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
        }, 1000); // Corresponds to animation duration
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
        if (player.class === CharacterClass.WARRIOR) {
            const ability = PLAYER_ABILITIES[PlayerAbility.HEAVY_STRIKE];
            return <button onClick={() => handleActionClick('ability', ability.name)} className="flex items-center justify-center gap-2 text-lg bg-red-800 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg border-2 border-red-600 transition-all transform hover:scale-105"><SwordIcon/> {ability.name}</button>
        }
        if (player.class === CharacterClass.MAGE) {
            const ability = PLAYER_ABILITIES[PlayerAbility.FIREBALL];
            const disabled = (player.mp ?? 0) < ability.cost;
            return <button onClick={() => handleActionClick('ability', ability.name)} disabled={disabled} className="flex items-center justify-center gap-2 text-lg bg-orange-700 hover:bg-orange-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-orange-500 transition-all transform hover:scale-105"><FireIcon/> {ability.name} ({ability.cost} MP)</button>
        }
        if (player.class === CharacterClass.ROGUE) {
             const ability = PLAYER_ABILITIES[PlayerAbility.QUICK_STRIKE];
             const disabled = (player.ep ?? 0) < ability.cost;
            return <button onClick={() => handleActionClick('ability', ability.name)} disabled={disabled} className="flex items-center justify-center gap-2 text-lg bg-green-700 hover:bg-green-600 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-green-500 transition-all transform hover:scale-105"><BoltIcon/> {ability.name} ({ability.cost} EP)</button>
        }
        return null;
    }


    return (
        <div className="flex flex-col h-full justify-between">
            {/* Narrative Area */}
            <div>
                <p className={`transition-opacity duration-300 ${!isPlayerTurn ? 'opacity-50' : ''}`}>{displayedText}</p>
            </div>
            
            {/* Enemies Area */}
            <div className="flex-grow flex flex-wrap items-center justify-center gap-4 py-4">
                {enemies.map((enemy, index) => enemy.hp > 0 && (
                    <div 
                        key={index} 
                        className={`relative bg-gray-800/80 p-3 rounded-lg border-2 shadow-lg animate-fade-in w-48 text-center transition-all duration-300 ${
                            enemy.isShielded ? 'border-cyan-400 shadow-lg shadow-cyan-400/50 animate-pulse' : 'border-red-500'
                        }`}
                    >
                        {damagePopups.filter(p => p.enemyIndex === index).map(p => (
                            <div key={p.id} className={`damage-popup ${p.isCrit ? 'crit' : ''}`}>
                                {p.isCrit ? 'CRITICAL! ' : ''}-{p.value}
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
                    </div>
                ))}
            </div>

            {/* Actions Area */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                 {isPlayerTurn && view === 'main' && (
                    <>
                        <button onClick={() => handleActionClick('attack')} className="flex items-center justify-center gap-2 text-lg bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-red-500 transition-all transform hover:scale-105"><SwordIcon/>Attack</button>
                        <button onClick={() => setView('abilities')} className="flex items-center justify-center gap-2 text-lg bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-purple-500 transition-all transform hover:scale-105">Ability</button>
                        <button onClick={() => onCombatAction('defend')} className="flex items-center justify-center gap-2 text-lg bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-blue-500 transition-all transform hover:scale-105"><ShieldIcon/>Defend</button>
                        <button onClick={() => onCombatAction('flee')} className="flex items-center justify-center gap-2 text-lg bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-green-500 transition-all transform hover:scale-105"><RunIcon/>Flee</button>
                    </>
                 )}
                 {isPlayerTurn && view === 'targeting' && (
                    <div className="col-span-full flex flex-col gap-2 animate-fade-in-short">
                        <p className="text-center">Select Target:</p>
                        {enemies.map((enemy, index) => enemy.hp > 0 && (
                            <button key={index} onClick={() => handleTargetSelect(index)} className="w-full text-lg bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg border-2 border-red-600">{enemy.name}</button>
                        ))}
                        <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg border-2 border-gray-400">Cancel</button>
                    </div>
                )}
                {isPlayerTurn && view === 'abilities' && (
                    <div className="col-span-full flex flex-col gap-2 animate-fade-in-short">
                        <p className="text-center">Select Ability:</p>
                        {renderAbilities()}
                        <button onClick={() => setView('main')} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg border-2 border-gray-400">Back</button>
                    </div>
                )}
            </div>
        </div>
    );
};
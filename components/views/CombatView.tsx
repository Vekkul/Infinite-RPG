import React, { useState } from 'react';
import { Enemy, EnemyAbility } from '../../types';
import { StatusBar } from '../StatusBar';
import { HealIcon, ShieldIcon, SwordIcon, RunIcon } from '../icons';

interface CombatViewProps {
  storyText: string;
  enemies: Enemy[];
  isPlayerTurn: boolean;
  onCombatAction: (action: 'attack' | 'defend' | 'flee', targetIndex?: number) => void;
}

export const CombatView: React.FC<CombatViewProps> = ({ storyText, enemies, isPlayerTurn, onCombatAction }) => {
    const [isTargeting, setIsTargeting] = useState(false);

    const handleAttackClick = () => {
        const activeEnemies = enemies.filter(e => e.hp > 0);
        if (activeEnemies.length === 1) {
            const targetIndex = enemies.findIndex(e => e.hp > 0);
            onCombatAction('attack', targetIndex);
        } else {
            setIsTargeting(true);
        }
    };
    
    const handleTargetSelect = (index: number) => {
        onCombatAction('attack', index);
        setIsTargeting(false);
    };

    return (
        <div className="flex flex-col h-full justify-between">
            {/* Narrative Area */}
            <div>
                <p className={`transition-opacity duration-300 ${!isPlayerTurn ? 'opacity-50' : ''}`}>{storyText}</p>
            </div>
            
            {/* Enemies Area */}
            <div className="flex-grow flex flex-wrap items-center justify-center gap-4 py-4">
                {enemies.map((enemy, index) => enemy.hp > 0 && (
                    <div key={index} className="relative bg-gray-800/80 p-3 rounded-lg border-2 border-red-500 shadow-lg animate-fade-in w-48 text-center">
                        <h2 className="text-lg font-press-start text-red-300">{enemy.name}</h2>
                        <div className="absolute top-1 right-1 flex gap-1">
                            {enemy.ability === EnemyAbility.HEAL && <HealIcon className="w-4 h-4 text-green-400" title="Heal Ability" />}
                            {enemy.isShielded && <ShieldIcon className="w-4 h-4 text-blue-400" title="Shielded" />}
                        </div>
                        <StatusBar label="HP" currentValue={enemy.hp} maxValue={enemy.maxHp} colorClass="bg-red-500" />
                    </div>
                ))}
            </div>

            {/* Actions Area */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 {isPlayerTurn && !isTargeting && (
                    <>
                        <button onClick={handleAttackClick} className="flex items-center justify-center gap-2 text-lg bg-red-700 hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-red-500 transition-all transform hover:scale-105"><SwordIcon/>Attack</button>
                        <button onClick={() => onCombatAction('defend')} className="flex items-center justify-center gap-2 text-lg bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-blue-500 transition-all transform hover:scale-105"><ShieldIcon/>Defend</button>
                        <button onClick={() => onCombatAction('flee')} className="flex items-center justify-center gap-2 text-lg bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-green-500 transition-all transform hover:scale-105"><RunIcon/>Flee</button>
                    </>
                 )}
                 {isPlayerTurn && isTargeting && (
                    <div className="sm:col-span-3 flex flex-col gap-2 animate-fade-in-short">
                        <p className="text-center">Select Target:</p>
                        {enemies.map((enemy, index) => enemy.hp > 0 && (
                            <button key={index} onClick={() => handleTargetSelect(index)} className="w-full text-lg bg-red-800 hover:bg-red-700 text-white font-bold py-2 px-3 rounded-lg border-2 border-red-600">{enemy.name}</button>
                        ))}
                        <button onClick={() => setIsTargeting(false)} className="w-full text-lg bg-gray-600 hover:bg-gray-500 text-white font-bold py-2 px-3 rounded-lg border-2 border-gray-400">Cancel</button>
                    </div>
                )}
            </div>
        </div>
    );
};

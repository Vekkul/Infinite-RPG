
import React, { useState } from 'react';
import { PlayerAbility, Attributes } from '../../types';
import { generateCharacterPortrait } from '../../services/geminiService';
import { useAsset } from '../../hooks/useAsset';
import { PLAYER_ABILITIES } from '../../constants';

interface CharacterCreationScreenProps {
  onCreate: (details: { name: string; className: string; attributes: Attributes; abilities: PlayerAbility[]; portrait: string }) => void;
}

const TOTAL_POINTS = 10;
const BASE_STAT = 3;
const MAX_STAT = 10;

export const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ onCreate }) => {
    const [name, setName] = useState('');
    const [className, setClassName] = useState('Adventurer');
    const [description, setDescription] = useState('');
    const [portraitId, setPortraitId] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [fallbackUsed, setFallbackUsed] = useState(false);
    
    // Stats
    const [attributes, setAttributes] = useState<Attributes>({
        strength: BASE_STAT,
        intelligence: BASE_STAT,
        agility: BASE_STAT,
        charisma: BASE_STAT
    });

    // Abilities
    const [selectedAbilities, setSelectedAbilities] = useState<PlayerAbility[]>([]);

    const remainingPoints = TOTAL_POINTS - (attributes.strength + attributes.intelligence + attributes.agility + attributes.charisma - (BASE_STAT * 4));

    // Use hook to resolve the ID to a URL
    const { assetUrl } = useAsset(portraitId);

    const handleStatChange = (stat: keyof Attributes, change: number) => {
        const currentVal = attributes[stat];
        const newVal = currentVal + change;

        if (newVal < BASE_STAT || newVal > MAX_STAT) return;
        if (change > 0 && remainingPoints <= 0) return;

        setAttributes(prev => ({ ...prev, [stat]: newVal }));
    };

    const toggleAbility = (ability: PlayerAbility) => {
        if (selectedAbilities.includes(ability)) {
            setSelectedAbilities(prev => prev.filter(a => a !== ability));
        } else {
            if (selectedAbilities.length < 2) {
                setSelectedAbilities(prev => [...prev, ability]);
            }
        }
    };

    const handleGeneratePortrait = async () => {
        if (!description.trim()) {
            alert("Please provide a description for your character.");
            return;
        }
        setIsGenerating(true);
        setPortraitId('');
        setFallbackUsed(false);
        
        const { portrait: generatedId, isFallback } = await generateCharacterPortrait(description, className);
        
        if (generatedId) {
            setPortraitId(generatedId);
            if (isFallback) {
                setFallbackUsed(true);
            }
        } else {
            alert("Failed to generate portrait. Please try a different description or try again later.");
        }

        setIsGenerating(false);
    };

    const handleCreate = () => {
        if (!name.trim()) {
            alert("Please enter a name for your character.");
            return;
        }
        if (!className.trim()) {
            alert("Please define your class.");
            return;
        }
        if (selectedAbilities.length === 0) {
            alert("Please select at least one ability.");
            return;
        }
        if (!portraitId) {
            alert("Please generate a portrait for your character.");
            return;
        }
        onCreate({ name, className, attributes, abilities: selectedAbilities, portrait: portraitId });
    };

    const renderStatRow = (label: string, statKey: keyof Attributes, description: string) => (
        <div className="flex items-center justify-between bg-gray-900/50 p-2 rounded">
            <div className="flex-1">
                <span className="font-bold text-lg text-white block font-cinzel">{label}</span>
                <span className="text-xs text-gray-400 font-serif italic">{description}</span>
            </div>
            <div className="flex items-center gap-3">
                <button 
                    onClick={() => handleStatChange(statKey, -1)}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 border border-gray-500 flex items-center justify-center font-bold text-xl"
                    disabled={attributes[statKey] <= BASE_STAT}
                >-</button>
                <span className={`text-xl font-bold w-6 text-center ${attributes[statKey] >= 8 ? 'text-green-400' : 'text-white'}`}>{attributes[statKey]}</span>
                <button 
                    onClick={() => handleStatChange(statKey, 1)}
                    className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 border border-gray-500 flex items-center justify-center font-bold text-xl"
                    disabled={remainingPoints <= 0 || attributes[statKey] >= MAX_STAT}
                >+</button>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col flex-grow animate-fade-in text-lg overflow-y-auto h-full pr-2 p-4">
            <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-yellow-400 mb-6 text-center drop-shadow-md">Design Your Hero</h1>
            
            <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 pb-20">
                {/* Left Side: Stats & Details */}
                <div className="space-y-6">
                    {/* Identity */}
                    <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-600 space-y-4 shadow-lg">
                        <h2 className="text-xl font-cinzel font-bold text-blue-300 border-b border-gray-600 pb-2">Identity</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="name" className="block text-sm mb-1 text-gray-400 uppercase tracking-wide font-bold">Name</label>
                                <input
                                    id="name"
                                    type="text"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    className="w-full p-2 bg-gray-700 border-2 border-gray-500 rounded focus:outline-none focus:border-yellow-400 font-serif"
                                    maxLength={20}
                                    placeholder="e.g. Aragorn"
                                />
                            </div>
                            <div>
                                <label htmlFor="className" className="block text-sm mb-1 text-gray-400 uppercase tracking-wide font-bold">Class Name</label>
                                <input
                                    id="className"
                                    type="text"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    className="w-full p-2 bg-gray-700 border-2 border-gray-500 rounded focus:outline-none focus:border-yellow-400 font-serif"
                                    maxLength={20}
                                    placeholder="e.g. Ranger"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-600 shadow-lg">
                        <div className="flex justify-between items-center border-b border-gray-600 pb-2 mb-4">
                             <h2 className="text-xl font-cinzel font-bold text-green-300">Attributes</h2>
                             <span className={`font-bold text-sm ${remainingPoints > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>Points Left: {remainingPoints}</span>
                        </div>
                        <div className="space-y-3">
                            {renderStatRow("Strength", "strength", "Increases HP, Stamina, and Attack")}
                            {renderStatRow("Intelligence", "intelligence", "Increases MP and Magic Power")}
                            {renderStatRow("Agility", "agility", "Increases Energy, Defense, and Crit")}
                            {renderStatRow("Charisma", "charisma", "Increases Luck and Social Success")}
                        </div>
                    </div>

                    {/* Abilities */}
                    <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-600 shadow-lg">
                        <h2 className="text-xl font-cinzel font-bold text-purple-300 border-b border-gray-600 pb-2 mb-4">Starting Abilities (Max 2)</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-2">
                            {Object.values(PLAYER_ABILITIES).map(ability => (
                                <div 
                                    key={ability.name}
                                    onClick={() => toggleAbility(ability.name)}
                                    className={`p-3 rounded border-2 cursor-pointer transition-all ${
                                        selectedAbilities.includes(ability.name) 
                                        ? 'bg-purple-900/50 border-purple-400 shadow-inner' 
                                        : 'bg-gray-900 border-gray-700 hover:border-gray-500'
                                    } ${selectedAbilities.length >= 2 && !selectedAbilities.includes(ability.name) ? 'opacity-50' : ''}`}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-cinzel font-bold text-sm text-white">{ability.name}</span>
                                        <span className="text-xs text-gray-400 font-bold">{ability.cost} {ability.resource}</span>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-tight font-serif italic">{ability.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Side: Visuals & Actions */}
                <div className="flex flex-col space-y-6">
                     <div className="bg-gray-800/80 p-4 rounded-lg border border-gray-600 h-full flex flex-col shadow-lg">
                        <h2 className="text-xl font-cinzel font-bold text-orange-300 border-b border-gray-600 pb-2 mb-4">Visuals</h2>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 bg-gray-700 border-2 border-gray-500 rounded focus:outline-none focus:border-yellow-400 text-sm mb-4 font-serif"
                            rows={3}
                            placeholder="Describe your hero... (e.g., A masked duelist with twin daggers)"
                        />
                         <div className="flex-grow flex items-center justify-center bg-black/50 border-4 border-gray-700 rounded-md relative overflow-hidden min-h-[250px]">
                            {isGenerating ? (
                               <div className="text-center">
                                   <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
                                   <p className="mt-2 text-sm">Generating...</p>
                               </div>
                            ) : assetUrl ? (
                                <>
                                    <img src={assetUrl} alt="Character Portrait" className="w-full h-full object-cover image-rendering-pixelated absolute inset-0" />
                                    {fallbackUsed && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-yellow-200 text-xs text-center p-1">
                                            Magical interference. Using sketch.
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center text-gray-400 p-4">
                                    <p>Portrait Placeholder</p>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleGeneratePortrait}
                            disabled={isGenerating || !description.trim()}
                            className="w-full mt-4 font-cinzel text-sm bg-indigo-700 hover:bg-indigo-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded border-2 border-indigo-500 hover:border-indigo-400 transition-colors shadow-md"
                        >
                            {isGenerating ? 'Painting...' : 'Generate Portrait'}
                        </button>
                    </div>

                    <button
                        onClick={handleCreate}
                        disabled={!name.trim() || !className.trim() || !portraitId || isGenerating || selectedAbilities.length === 0}
                        className="w-full font-cinzel text-xl bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg border-2 border-green-500 hover:border-green-400 transition-all transform hover:scale-105 shadow-xl"
                    >
                        Start Adventure
                    </button>
                </div>
            </div>
        </div>
    );
};
    
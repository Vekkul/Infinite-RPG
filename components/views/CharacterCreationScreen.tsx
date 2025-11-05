import React, { useState } from 'react';
import { CharacterClass } from '../../types';
import { generateCharacterPortrait } from '../../services/geminiService';

interface CharacterCreationScreenProps {
  onCreate: (details: { name: string; class: CharacterClass; portrait: string }) => void;
}

const classDescriptions: Record<CharacterClass, string> = {
    [CharacterClass.WARRIOR]: "A master of arms, boasting high health and powerful attacks.",
    [CharacterClass.MAGE]: "A wielder of arcane energies, fragile but capable of immense power.",
    [CharacterClass.ROGUE]: "A cunning opportunist, striking a balance between offense and defense."
};

export const CharacterCreationScreen: React.FC<CharacterCreationScreenProps> = ({ onCreate }) => {
    const [name, setName] = useState('');
    const [selectedClass, setSelectedClass] = useState<CharacterClass>(CharacterClass.WARRIOR);
    const [description, setDescription] = useState('');
    const [portrait, setPortrait] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGeneratePortrait = async () => {
        if (!description.trim()) {
            alert("Please provide a description for your character.");
            return;
        }
        setIsGenerating(true);
        setPortrait('');
        const generatedImage = await generateCharacterPortrait(description, selectedClass);
        if (generatedImage) {
            setPortrait(generatedImage);
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
        if (!portrait) {
            alert("Please generate a portrait for your character.");
            return;
        }
        onCreate({ name, class: selectedClass, portrait });
    };

    return (
        <div className="flex flex-col items-center justify-center h-full animate-fade-in text-lg">
            <h1 className="text-5xl font-press-start text-yellow-400 mb-6" style={{textShadow: '2px 2px 0 #000'}}>Create Your Hero</h1>
            
            <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Side: Form */}
                <div className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-xl mb-2 font-bold">Name</label>
                        <input
                            id="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-2 bg-gray-700 border-2 border-gray-500 rounded-md focus:outline-none focus:border-yellow-400"
                            maxLength={20}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-xl mb-2 font-bold">Class</label>
                        <div className="grid grid-cols-3 gap-2">
                            {Object.values(CharacterClass).map(charClass => (
                                <button
                                    key={charClass}
                                    onClick={() => setSelectedClass(charClass)}
                                    className={`p-2 rounded-md border-2 transition-colors ${selectedClass === charClass ? 'bg-yellow-500 border-yellow-300 text-black font-bold' : 'bg-gray-700 border-gray-500 hover:bg-gray-600'}`}
                                >
                                    {charClass}
                                </button>
                            ))}
                        </div>
                        <p className="mt-2 text-gray-300 h-14">{classDescriptions[selectedClass]}</p>
                    </div>

                    <div>
                        <label htmlFor="description" className="block text-xl mb-2 font-bold">Appearance</label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-2 bg-gray-700 border-2 border-gray-500 rounded-md focus:outline-none focus:border-yellow-400"
                            rows={4}
                            placeholder="e.g., A young woman with long silver hair, wearing steel armor and a determined expression."
                        />
                    </div>
                </div>

                {/* Right Side: Portrait */}
                <div className="flex flex-col items-center justify-between">
                     <div className="w-64 h-64 bg-black/50 border-4 border-gray-600 rounded-md flex items-center justify-center mb-4">
                        {isGenerating ? (
                           <div className="text-center">
                               <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-yellow-400 mx-auto"></div>
                               <p className="mt-2 text-sm">Generating...</p>
                           </div>
                        ) : portrait ? (
                            <img src={`data:image/png;base64,${portrait}`} alt="Character Portrait" className="w-full h-full object-cover rounded-sm" />
                        ) : (
                            <div className="text-center text-gray-400 p-4">
                                <p>Your character's portrait will appear here.</p>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={handleGeneratePortrait}
                        disabled={isGenerating || !description.trim()}
                        className="w-full font-press-start text-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg border-2 border-indigo-800 hover:border-indigo-700 transition-colors"
                    >
                        {isGenerating ? 'Creating...' : 'Generate Portrait'}
                    </button>
                </div>
            </div>
            
            <div className="mt-8 w-full max-w-sm">
                <button
                    onClick={handleCreate}
                    disabled={!name.trim() || !portrait || isGenerating}
                    className="w-full font-press-start text-2xl bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-4 px-8 rounded-lg border-4 border-green-800 hover:border-green-700 transition-all transform hover:scale-105"
                >
                    Start Adventure
                </button>
            </div>
        </div>
    );
};

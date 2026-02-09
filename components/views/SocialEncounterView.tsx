
import React, { useState } from 'react';
import { SocialEncounter, SocialChoice } from '../../types';
import { useTypewriter } from '../../hooks/useTypewriter';
import { SparklesIcon } from '../icons';

interface SocialEncounterViewProps {
  encounter: SocialEncounter;
  onChoice: (choice: SocialChoice) => void;
  onImprovise: (input: string) => void;
}

export const SocialEncounterView: React.FC<SocialEncounterViewProps> = ({ encounter, onChoice, onImprovise }) => {
  const displayedText = useTypewriter(encounter.description, 30);
  const [improviseInput, setImproviseInput] = useState('');

  const handleImproviseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (improviseInput.trim()) {
      onImprovise(improviseInput);
      setImproviseInput('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Scrollable Content Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2 pb-2">
          <p className="animate-fade-in text-lg md:text-xl leading-relaxed font-serif text-gray-200">{displayedText}</p>
      </div>
      
      {/* Fixed Bottom Choices */}
      <div className="flex-shrink-0 pt-2 border-t border-gray-700/50 mt-auto flex flex-col gap-3">
        
         {/* Improvise Form */}
        <form onSubmit={handleImproviseSubmit} className="flex gap-2 w-full animate-fade-in">
          <input
            type="text"
            value={improviseInput}
            onChange={(e) => setImproviseInput(e.target.value)}
            placeholder="Do something unexpected..."
            className="flex-1 bg-gray-800 text-white p-3 rounded-lg border border-gray-600 focus:outline-none focus:border-yellow-500 placeholder-gray-500 font-serif"
            maxLength={60}
          />
          <button 
            type="submit" 
            disabled={!improviseInput.trim()}
            className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:opacity-50 text-white p-3 rounded-lg border-2 border-purple-500 transition-colors"
          >
             <SparklesIcon className="w-6 h-6" />
          </button>
        </form>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
          {encounter.choices.map((choice, index) => (
            <button 
              key={index} 
              onClick={() => onChoice(choice)} 
              className="w-full text-base md:text-lg bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 md:py-4 px-4 rounded-lg border-2 border-gray-500 active:scale-95 transition-all duration-200 font-cinzel tracking-wide shadow-md"
            >
              {choice.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
    
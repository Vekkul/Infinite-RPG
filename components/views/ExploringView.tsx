
import React, { useState } from 'react';
import { GameAction } from '../../types';
import { useTypewriter } from '../../hooks/useTypewriter';
import { SparklesIcon } from '../icons';

interface ExploringViewProps {
  storyText: string;
  actions: GameAction[];
  onAction: (action: GameAction) => void;
  onImprovise: (input: string) => void;
}

export const ExploringView: React.FC<ExploringViewProps> = ({ storyText, actions, onAction, onImprovise }) => {
  const displayedText = useTypewriter(storyText, 30);
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
      
      {/* Fixed Bottom Actions */}
      <div className="flex-shrink-0 pt-2 border-t border-gray-700/50 mt-auto flex flex-col gap-3">
        
        {/* Improvise Form */}
        <form onSubmit={handleImproviseSubmit} className="flex gap-2 w-full animate-fade-in">
          <input
            type="text"
            value={improviseInput}
            onChange={(e) => setImproviseInput(e.target.value)}
            placeholder="Try something else... (e.g. Check the waterfall)"
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
          {actions.map((action, index) => (
            <button 
              key={index} 
              onClick={() => onAction(action)} 
              className={`w-full text-base md:text-lg text-white font-bold py-3 md:py-4 px-4 rounded-lg border-2 shadow-lg active:transform active:scale-95 transition-all duration-200 font-cinzel tracking-wide ${
                  action.type === 'move'
                  ? 'bg-green-800 hover:bg-green-700 border-green-600'
                  : 'bg-gray-700 hover:bg-gray-600 border-gray-500'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
    
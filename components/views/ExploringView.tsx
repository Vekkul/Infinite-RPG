import React from 'react';
import { GameAction } from '../../types';

interface ExploringViewProps {
  storyText: string;
  actions: GameAction[];
  onAction: (action: GameAction) => void;
}

export const ExploringView: React.FC<ExploringViewProps> = ({ storyText, actions, onAction }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-grow">
          <p className="animate-fade-in">{storyText}</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        {actions.map((action, index) => (
          <button 
            key={index} 
            onClick={() => onAction(action)} 
            className="w-full text-lg bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg border-2 border-gray-500 transition-all duration-200 transform hover:scale-105"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
};

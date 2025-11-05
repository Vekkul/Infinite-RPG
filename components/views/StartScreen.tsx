import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  onLoad: () => void;
  saveFileExists: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onLoad, saveFileExists }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full animate-fade-in">
      <h1 className="text-6xl font-press-start text-yellow-400 mb-4" style={{textShadow: '3px 3px 0 #000'}}>Infinite JRPG</h1>
      <p className="text-xl mb-8 max-w-lg">An endless adventure powered by Gemini. Explore, battle, and grow stronger in a world that never ends.</p>
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <button onClick={onStart} className="font-press-start text-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-lg border-4 border-blue-800 hover:border-blue-700 transition-all duration-300 transform hover:scale-105">
          Start Your Journey
        </button>
        {saveFileExists && (
          <button onClick={onLoad} className="font-press-start text-xl bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg border-4 border-green-800 hover:border-green-700 transition-all duration-300 transform hover:scale-105">
            Load Game
          </button>
        )}
      </div>
    </div>
  );
};

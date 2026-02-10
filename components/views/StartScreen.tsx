
import React from 'react';

interface StartScreenProps {
  onStart: () => void;
  onLoad: () => void;
  saveFileExists: boolean;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onLoad, saveFileExists }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full w-full animate-fade-in overflow-y-auto">
      <div className="flex flex-col items-center justify-center min-h-full py-8">
        <h1 className="text-5xl sm:text-7xl font-cinzel font-bold text-yellow-400 mb-4 drop-shadow-lg" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.8)'}}>Infinite RPG</h1>
        <p className="text-2xl mb-8 max-w-lg font-serif italic text-gray-300">An endless adventure powered by Gemini. Explore, battle, and grow stronger in a world that never ends.</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <button onClick={onStart} className="font-cinzel text-2xl bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg border-2 border-blue-500 shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all duration-300 transform hover:scale-105 tracking-wide">
            Start Your Journey
          </button>
          {saveFileExists && (
            <button onClick={onLoad} className="font-cinzel text-xl bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-green-500 shadow-lg hover:shadow-xl hover:border-green-400 transition-all duration-300 transform hover:scale-105 tracking-wide">
              Load Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

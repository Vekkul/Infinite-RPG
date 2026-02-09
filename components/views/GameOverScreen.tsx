
import React from 'react';

interface GameOverScreenProps {
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full w-full animate-fade-in overflow-y-auto">
        <div className="flex flex-col items-center justify-center min-h-full py-8">
            <h1 className="text-7xl font-cinzel font-bold text-red-600 mb-4 drop-shadow-xl" style={{textShadow: '4px 4px 0 #000'}}>Game Over</h1>
            <p className="text-2xl mb-8 font-serif italic text-gray-300">Your journey has come to an end... but another awaits.</p>
            <button onClick={onRestart} className="font-cinzel text-2xl bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-8 rounded-lg border-2 border-gray-500 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
                Begin Anew
            </button>
        </div>
    </div>
  );
};
    
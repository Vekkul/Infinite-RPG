import React from 'react';

interface GameOverScreenProps {
  onRestart: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({ onRestart }) => {
  return (
    <div className="text-center flex flex-col items-center justify-center h-full animate-fade-in">
      <h1 className="text-7xl font-press-start text-red-500 mb-4" style={{textShadow: '3px 3px 0 #000'}}>Game Over</h1>
      <p className="text-2xl mb-8">Your journey has come to an end... but another awaits.</p>
      <button onClick={onRestart} className="font-press-start text-2xl bg-gray-600 hover:bg-gray-500 text-white font-bold py-4 px-8 rounded-lg border-4 border-gray-800 hover:border-gray-700 transition-all duration-300 transform hover:scale-105">
        Begin Anew
      </button>
    </div>
  );
};


import React, { useState } from 'react';
import { SaveMetadata } from '../../types';

interface StartScreenProps {
  onStart: () => void;
  onLoad: (slotId: string) => void;
  saveFileExists: boolean;
  availableSaves?: SaveMetadata[];
  onDeleteSave?: (slotId: string) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({ onStart, onLoad, saveFileExists, availableSaves = [], onDeleteSave }) => {
  const [showLoadMenu, setShowLoadMenu] = useState(false);

  const handleLoadClick = () => {
    if (availableSaves.length > 0) {
        setShowLoadMenu(true);
    } else if (saveFileExists) {
        // Fallback for legacy behavior if no metadata list but flag is true
        onLoad('manual_1');
    }
  };

  const handleDelete = (e: React.MouseEvent, slotId: string) => {
      e.stopPropagation();
      if (window.confirm("Are you sure you want to delete this save?")) {
          onDeleteSave?.(slotId);
      }
  };

  return (
    <div className="text-center flex flex-col items-center justify-center h-full w-full animate-fade-in overflow-y-auto relative">
      <div className="flex flex-col items-center justify-center min-h-full py-8 w-full max-w-4xl">
        <h1 className="text-5xl sm:text-7xl font-cinzel font-bold text-yellow-400 mb-4 drop-shadow-lg" style={{textShadow: '3px 3px 6px rgba(0,0,0,0.8)'}}>Infinite RPG</h1>
        <p className="text-2xl mb-8 max-w-lg font-serif italic text-gray-300">An endless adventure powered by Gemini. Explore, battle, and grow stronger in a world that never ends.</p>
        
        {!showLoadMenu ? (
            <div className="flex flex-col gap-4 w-full max-w-sm">
            <button onClick={onStart} className="font-cinzel text-2xl bg-blue-700 hover:bg-blue-600 text-white font-bold py-4 px-8 rounded-lg border-2 border-blue-500 shadow-xl hover:shadow-2xl hover:border-blue-400 transition-all duration-300 transform hover:scale-105 tracking-wide">
                Start Your Journey
            </button>
            {(saveFileExists || availableSaves.length > 0) && (
                <button onClick={handleLoadClick} className="font-cinzel text-xl bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-6 rounded-lg border-2 border-green-500 shadow-lg hover:shadow-xl hover:border-green-400 transition-all duration-300 transform hover:scale-105 tracking-wide">
                Load Game
                </button>
            )}
            </div>
        ) : (
            <div className="w-full max-w-2xl bg-gray-800/90 border-2 border-gray-600 rounded-xl p-6 shadow-2xl animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b border-gray-600 pb-2">
                    <h2 className="text-2xl font-cinzel text-yellow-400">Select Save File</h2>
                    <button onClick={() => setShowLoadMenu(false)} className="text-gray-400 hover:text-white">✕</button>
                </div>
                <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-2">
                    {availableSaves.sort((a, b) => b.timestamp - a.timestamp).map(save => (
                        <div key={save.id} className="flex items-center gap-2 group">
                            <button 
                                onClick={() => onLoad(save.id)}
                                className="flex-1 text-left bg-gray-700 hover:bg-gray-600 p-4 rounded-lg border border-gray-500 hover:border-yellow-500 transition-all group-hover:shadow-md flex justify-between items-center"
                            >
                                <div>
                                    <div className="font-bold text-lg text-white font-cinzel">
                                        {save.playerName || 'Unknown Hero'} 
                                        <span className="text-sm text-gray-400 ml-2 font-sans">Lvl {save.playerLevel} {save.playerClass}</span>
                                    </div>
                                    <div className="text-sm text-gray-400 font-serif italic">{save.locationName}</div>
                                    <div className="text-xs text-gray-500 mt-1">
                                        {new Date(save.timestamp).toLocaleString()} 
                                        {save.isAutoSave && <span className="ml-2 text-yellow-600 font-bold uppercase text-[10px] border border-yellow-600 px-1 rounded">Auto</span>}
                                    </div>
                                </div>
                            </button>
                            {onDeleteSave && (
                                <button 
                                    onClick={(e) => handleDelete(e, save.id)}
                                    className="p-4 bg-red-900/50 hover:bg-red-700 text-red-300 hover:text-white rounded-lg border border-red-800 hover:border-red-500 transition-colors h-full flex items-center justify-center"
                                    title="Delete Save"
                                >
                                    🗑️
                                </button>
                            )}
                        </div>
                    ))}
                    {availableSaves.length === 0 && (
                        <p className="text-gray-500 italic py-4">No save files found.</p>
                    )}
                </div>
                <button onClick={() => setShowLoadMenu(false)} className="mt-4 w-full py-2 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded border border-gray-500">Cancel</button>
            </div>
        )}

      </div>
    </div>
  );
};

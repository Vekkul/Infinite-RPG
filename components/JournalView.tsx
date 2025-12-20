
import React from 'react';
import { Player } from '../types';

interface JournalViewProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

export const JournalView: React.FC<JournalViewProps> = ({ isOpen, onClose, player }) => {
  if (!isOpen) {
    return null;
  }

  const activeQuests = player.journal.quests.filter(q => q.status === 'ACTIVE');
  const completedQuests = player.journal.quests.filter(q => q.status === 'COMPLETED');

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in-short"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 rounded-lg border-4 border-amber-600 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b-2 border-amber-500 flex justify-between items-center bg-stone-950">
          <h2 className="text-3xl font-press-start text-amber-500">Journal</h2>
          <button 
            onClick={onClose} 
            className="text-2xl font-bold text-gray-400 hover:text-white transition-colors"
            aria-label="Close journal"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto bg-stone-900/90 flex-grow text-amber-100 font-serif">
          
          <div className="mb-8">
            <h3 className="text-2xl font-bold border-b border-amber-700 mb-4 pb-2 text-amber-400">Active Quests</h3>
            {activeQuests.length === 0 ? (
                <p className="italic text-gray-400">No active quests. Explore the world to find adventure.</p>
            ) : (
                <div className="space-y-4">
                    {activeQuests.map(quest => (
                        <div key={quest.id} className="bg-stone-800 p-4 rounded border border-amber-900">
                            <h4 className="text-xl font-bold text-amber-200">{quest.title}</h4>
                            <p className="text-stone-300 mt-1">{quest.description}</p>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div>
            <h3 className="text-xl font-bold border-b border-amber-800 mb-4 pb-2 text-stone-500">Completed Archives</h3>
             {completedQuests.length === 0 ? (
                <p className="italic text-gray-600 text-sm">No completed quests yet.</p>
            ) : (
                <div className="space-y-2 opacity-70">
                    {completedQuests.map(quest => (
                        <div key={quest.id} className="flex items-center gap-2">
                            <span className="text-green-500">✔</span>
                            <span className="line-through text-stone-500">{quest.title}</span>
                        </div>
                    ))}
                </div>
            )}
          </div>
          
           {/* Debug/Dev view of Flags - usually hidden in a real game, but useful for verifying the "Infinite" mechanic */}
           <div className="mt-8 pt-4 border-t border-stone-800">
               <h4 className="text-sm uppercase tracking-widest text-stone-600 mb-2">Narrative Threads (Debug)</h4>
               <div className="flex flex-wrap gap-2">
                   {player.journal.flags.length === 0 && <span className="text-stone-700 text-xs">No threads woven yet.</span>}
                   {player.journal.flags.map((flag, i) => (
                       <span key={i} className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded">{flag}</span>
                   ))}
               </div>
           </div>

        </div>
      </div>
    </div>
  );
};

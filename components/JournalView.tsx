
import React, { useState } from 'react';
import { Player, Quest } from '../types';

interface JournalViewProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player;
}

export const JournalView: React.FC<JournalViewProps> = ({ isOpen, onClose, player }) => {
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);

  if (!isOpen) {
    return null;
  }

  const activeQuests = player.journal.quests.filter(q => q.status === 'ACTIVE');
  const completedQuests = player.journal.quests.filter(q => q.status === 'COMPLETED');
  const failedQuests = player.journal.quests.filter(q => q.status === 'FAILED');
  const history = player.journal.history || [];

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-stone-900 rounded-lg border-4 border-amber-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-amber-700/50 flex justify-between items-center bg-stone-950 rounded-t-lg">
          <div className="flex items-center gap-3">
             <span className="text-3xl">📖</span>
             <h2 className="text-3xl font-cinzel font-bold text-amber-500" style={{ textShadow: '2px 2px 0 #3f2e18' }}>Journal</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-2xl font-bold text-stone-500 hover:text-amber-400 transition-colors w-8 h-8 flex items-center justify-center"
            aria-label="Close journal"
          >
            &times;
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto bg-stone-900/95 flex-grow font-serif">
          
          {/* Active Quests */}
          <section className="mb-10">
            <h3 className="text-xl font-cinzel font-bold border-b-2 border-amber-800/50 mb-6 pb-2 text-amber-400 flex items-center gap-2 uppercase tracking-wide">
              <span>⚡</span> Active Quests
            </h3>
            
            {activeQuests.length === 0 ? (
                <div className="bg-stone-800/30 border border-stone-800 border-dashed rounded-lg p-8 text-center flex flex-col items-center gap-2">
                    <span className="text-4xl opacity-20 text-stone-500">🗺️</span>
                    <p className="italic text-stone-500 text-lg">Your tale is just beginning. Explore the world to find your purpose.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {activeQuests.map(quest => (
                        <div 
                            key={quest.id} 
                            onClick={() => setSelectedQuest(quest)}
                            className="relative group bg-gradient-to-br from-stone-800 to-stone-800/80 p-5 rounded-lg border border-amber-900/50 shadow-lg hover:shadow-amber-900/20 hover:border-amber-700/50 transition-all duration-300 cursor-pointer"
                        >
                             {/* Decorative corner */}
                            <div className="absolute top-0 right-0 p-2 opacity-50 pointer-events-none">
                                <div className="w-16 h-16 bg-amber-500/5 rotate-45 transform translate-x-8 -translate-y-8 blur-xl"></div>
                            </div>
                            
                            <div className="relative z-10">
                                <div className="flex justify-between items-start mb-3 gap-4">
                                    <h4 className="text-xl font-bold text-amber-100 group-hover:text-amber-300 transition-colors">{quest.title}</h4>
                                    <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider bg-amber-900/60 text-amber-200 px-2 py-1 rounded border border-amber-700/50 shadow-sm font-cinzel">
                                        In Progress
                                    </span>
                                </div>
                                <p className="text-stone-300 leading-relaxed text-base border-l-2 border-stone-700 pl-3 group-hover:border-amber-700/50 transition-colors line-clamp-2">
                                    {quest.description}
                                </p>
                                <div className="mt-2 text-xs text-stone-500 italic text-right group-hover:text-amber-500/70 transition-colors">
                                    Click for details
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </section>

          {/* Narrative History */}
          <section className="mb-10">
              <h3 className="text-xl font-cinzel font-bold border-b-2 border-amber-800/50 mb-6 pb-2 text-stone-300 flex items-center gap-2 uppercase tracking-wide">
                  <span>📜</span> Recent Chronicles
              </h3>
              {history.length === 0 ? (
                   <p className="text-stone-600 italic">No legends recorded yet...</p>
              ) : (
                  <ul className="space-y-3 relative border-l border-stone-800 ml-3 pl-6">
                      {history.slice().reverse().map((event, i) => (
                          <li key={i} className="relative text-stone-400">
                              <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-stone-700 border-2 border-stone-900"></span>
                              {event}
                          </li>
                      ))}
                  </ul>
              )}
          </section>

          {/* Completed / Failed Archives */}
          {(completedQuests.length > 0 || failedQuests.length > 0) && (
            <section className="mb-8">
                <h3 className="text-lg font-cinzel font-bold border-b border-stone-800 mb-4 pb-2 text-stone-500 flex items-center gap-2 uppercase tracking-wide">
                    <span>🗃️</span> Archives
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {completedQuests.map(quest => (
                        <div 
                            key={quest.id} 
                            onClick={() => setSelectedQuest(quest)}
                            className="flex items-center gap-4 p-3 rounded-md bg-stone-950/40 border border-stone-800/50 hover:bg-stone-950/60 transition-colors group cursor-pointer"
                        >
                            <div className="bg-green-900/20 rounded-full p-1.5 border border-green-900/30 group-hover:border-green-800/50 transition-colors">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 group-hover:text-green-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-grow">
                                <span className="text-stone-500 font-medium line-through decoration-stone-700 group-hover:text-stone-400 transition-colors">{quest.title}</span>
                            </div>
                            <span className="text-xs text-stone-600 font-bold tracking-wider font-cinzel">COMPLETED</span>
                        </div>
                    ))}
                     {failedQuests.map(quest => (
                        <div 
                            key={quest.id} 
                            onClick={() => setSelectedQuest(quest)}
                            className="flex items-center gap-4 p-3 rounded-md bg-red-950/10 border border-red-900/10 hover:bg-red-950/20 transition-colors group cursor-pointer"
                        >
                            <div className="bg-red-900/20 rounded-full p-1.5 border border-red-900/30">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-700" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div className="flex-grow">
                                <span className="text-stone-500 font-medium line-through decoration-stone-700 group-hover:text-stone-400 transition-colors">{quest.title}</span>
                            </div>
                            <span className="text-xs text-red-900/50 font-bold tracking-wider font-cinzel">FAILED</span>
                        </div>
                    ))}
                </div>
            </section>
          )}
          
           {/* Narrative Flags */}
           <div className="mt-8 pt-6 border-t border-stone-800/80">
               <h4 className="text-xs uppercase tracking-widest text-stone-600 mb-3 flex items-center gap-2 font-bold font-cinzel">
                   <span>🧶</span> Narrative Threads
               </h4>
               {player.journal.flags.length === 0 ? (
                   <div className="text-stone-700 text-sm italic pl-2 border-l-2 border-stone-800">
                       The weavers of fate await your actions.
                   </div>
               ) : (
                   <div className="flex flex-wrap gap-2">
                       {player.journal.flags.map((flag, i) => (
                           <div key={i} className="group relative">
                                <span className="text-xs bg-stone-950 text-stone-400 px-3 py-1.5 rounded-full border border-stone-800 hover:border-amber-800 hover:text-amber-500 hover:bg-stone-900 transition-all cursor-default select-none shadow-sm">
                                    #{flag}
                                </span>
                           </div>
                       ))}
                   </div>
               )}
           </div>

        </div>
      </div>

      {/* Quest Details Modal */}
      {selectedQuest && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[60] p-4 animate-fade-in" onClick={() => setSelectedQuest(null)}>
              <div className="bg-stone-900 border-2 border-amber-600 rounded-lg max-w-lg w-full p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
                  <button 
                    onClick={() => setSelectedQuest(null)} 
                    className="absolute top-2 right-4 text-stone-500 hover:text-amber-500 text-2xl transition-colors"
                  >
                    &times;
                  </button>
                  
                  <h3 className="text-2xl font-cinzel font-bold text-amber-500 mb-2 pr-8">{selectedQuest.title}</h3>
                  
                  <div className="flex gap-2 mb-6">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${
                          selectedQuest.status === 'ACTIVE' ? 'bg-amber-900/40 text-amber-200 border-amber-700/50' :
                          selectedQuest.status === 'COMPLETED' ? 'bg-green-900/40 text-green-200 border-green-700/50' :
                          'bg-red-900/40 text-red-200 border-red-700/50'
                      }`}>
                          {selectedQuest.status}
                      </span>
                  </div>

                  <div className="space-y-5 text-stone-300 font-serif">
                      <div>
                          <h4 className="text-stone-500 text-xs uppercase tracking-widest font-bold mb-1">Description</h4>
                          <p className="leading-relaxed text-lg">{selectedQuest.description}</p>
                      </div>

                      {selectedQuest.giver && (
                          <div className="bg-stone-950/50 p-3 rounded border border-stone-800">
                              <h4 className="text-stone-500 text-xs uppercase tracking-widest font-bold mb-1">Quest Giver</h4>
                              <p className="text-amber-100/80">{selectedQuest.giver}</p>
                          </div>
                      )}

                      {selectedQuest.outcome && (
                          <div className={`p-3 rounded border ${selectedQuest.status === 'FAILED' ? 'bg-red-950/20 border-red-900/30' : 'bg-stone-950/50 border-stone-800'}`}>
                              <h4 className="text-stone-500 text-xs uppercase tracking-widest font-bold mb-1">Outcome</h4>
                              <p className="italic text-stone-400">"{selectedQuest.outcome}"</p>
                          </div>
                      )}

                      {selectedQuest.rewardText && (
                          <div className="bg-amber-900/10 p-3 rounded border border-amber-900/30">
                              <h4 className="text-amber-600/70 text-xs uppercase tracking-widest font-bold mb-1">Rewards</h4>
                              <p className="text-amber-200/90 font-medium">{selectedQuest.rewardText}</p>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

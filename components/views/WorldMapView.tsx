
import React from 'react';
import { WorldData } from '../../types';
import { useAsset } from '../../hooks/useAsset';

interface WorldMapViewProps {
  isOpen: boolean;
  onClose: () => void;
  worldData: WorldData | null;
  playerLocationId: string | null;
}

export const WorldMapView: React.FC<WorldMapViewProps> = ({ isOpen, onClose, worldData, playerLocationId }) => {
  const { assetUrl, isLoading } = useAsset(worldData?.image);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in-short"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg border-4 border-green-600 shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-4 border-b-2 border-green-500 flex justify-between items-center">
          <h2 className="text-3xl font-press-start text-green-300">World Map</h2>
          <button 
            onClick={onClose} 
            className="text-3xl font-bold text-gray-400 hover:text-white transition-colors"
            aria-label="Close map"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-auto flex-grow flex justify-center items-start">
          {isLoading ? (
            <div className="text-center text-gray-400 text-xl py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-green-400 mx-auto mb-4"></div>
              <p>Unrolling the scroll...</p>
            </div>
          ) : assetUrl ? (
            <div className="relative inline-block max-w-full max-h-full">
              <img 
                src={assetUrl}
                alt="World Map" 
                className="block max-w-full max-h-full rounded-md border-2 border-gray-600"
              />
              {worldData?.locations.map(location => {
                    const isPlayerLocation = location.id === playerLocationId;
                    return (
                        <div
                            key={location.id}
                            className="absolute"
                            style={{ left: `${location.x}%`, top: `${location.y}%`, transform: 'translate(-50%, -50%)' }}
                            title={location.name}
                        >
                           {isPlayerLocation ? (
                             <div className="relative flex items-center justify-center w-8 h-8">
                                <span className="absolute inset-0 rounded-full bg-yellow-400 opacity-75 animate-ping"></span>
                                <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-white"></div>
                             </div>
                           ) : (
                            <div className={`w-4 h-4 rounded-full border-2 border-white ${location.isExplored ? 'bg-blue-500' : 'bg-gray-500'}`}></div>
                           )}
                           <span className={`absolute top-full left-1/2 -translate-x-1/2 mt-1 text-sm font-bold text-white whitespace-nowrap px-1 rounded ${isPlayerLocation ? 'bg-yellow-500 text-black' : 'bg-black/60'}`} style={{textShadow: '1px 1px 2px black'}}>
                                {location.isExplored ? location.name : '???'}
                           </span>
                        </div>
                    );
                })}
            </div>
          ) : (
            <div className="text-center text-gray-400 text-xl py-8">
              <p>Map not available...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

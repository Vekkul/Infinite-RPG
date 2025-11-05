import React from 'react';
import { Item } from '../types';
import { PotionIcon } from './icons';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Item[];
  onUseItem: (item: Item, index: number) => void;
  disabled?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({ isOpen, onClose, inventory, onUseItem, disabled = false }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-short"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg border-4 border-purple-600 shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="p-4 border-b-2 border-purple-500 flex justify-between items-center">
          <h2 className="text-3xl font-press-start text-purple-300">Inventory</h2>
          <button 
            onClick={onClose} 
            className="text-2xl font-bold text-gray-400 hover:text-white transition-colors"
            aria-label="Close inventory"
          >
            &times;
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {inventory.length === 0 ? (
            <p className="text-center text-gray-400 text-xl py-8">Your bag is empty.</p>
          ) : (
            <ul className="space-y-4">
              {inventory.map((item, index) => (
                <li 
                  key={index} 
                  className="bg-gray-900/80 p-4 rounded-md border border-gray-700 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-purple-400">
                        <PotionIcon className="w-8 h-8"/>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">{item.name} <span className="text-gray-400 text-lg">x{item.quantity}</span></h3>
                      <p className="text-gray-300">{item.description} (Heals {item.value} HP)</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => onUseItem(item, index)} 
                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded border-2 border-green-800 hover:border-green-700 transition-all transform hover:scale-105"
                    disabled={disabled}
                  >
                    Use
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

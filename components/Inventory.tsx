

import React, { useState } from 'react';
import { Item, ItemType, Player, EquipmentSlot, Recipe } from '../types';
import { PotionIcon, SwordIcon, ShieldIcon } from './icons';
import { CRAFTING_RECIPES } from '../constants';

interface InventoryProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: Item[];
  player: Player;
  onUseItem: (item: Item, index: number) => void;
  onEquipItem: (item: Item, index: number) => void;
  onUnequipItem: (slot: EquipmentSlot) => void;
  onCraftItem: (recipe: Recipe) => void;
  disabled?: boolean;
}

export const Inventory: React.FC<InventoryProps> = ({ isOpen, onClose, inventory, player, onUseItem, onEquipItem, onUnequipItem, onCraftItem, disabled = false }) => {
  const [activeTab, setActiveTab] = useState<'bag' | 'equipment' | 'crafting'>('bag');

  if (!isOpen) {
    return null;
  }

  const renderIcon = (itemType: ItemType) => {
      switch(itemType) {
          case ItemType.POTION: return <PotionIcon className="w-8 h-8"/>;
          case ItemType.WEAPON: return <SwordIcon className="w-8 h-8"/>;
          case ItemType.ARMOR: return <ShieldIcon className="w-8 h-8"/>;
          case ItemType.MATERIAL: return <span className="text-2xl">🧱</span>;
          case ItemType.KEY_ITEM: return <span className="text-2xl">🔑</span>;
          default: return <PotionIcon className="w-8 h-8"/>;
      }
  };

  const renderDescription = (item: Item) => {
      if (item.type === ItemType.POTION) return `Heals ${item.value} HP`;
      if (item.type === ItemType.WEAPON) return `ATK +${item.value}`;
      if (item.type === ItemType.ARMOR) return `DEF +${item.value}`;
      return item.description;
  };

  // Helper to count items including stacks
  const countItemQuantity = (itemName: string) => {
    return inventory.reduce((total, item) => {
        return item.name === itemName ? total + item.quantity : total;
    }, 0);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-short"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg border-4 border-purple-600 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="p-4 border-b-2 border-purple-500 flex justify-between items-center bg-gray-900">
          <h2 className="text-3xl font-press-start text-purple-300">Character</h2>
          <button 
            onClick={onClose} 
            className="text-2xl font-bold text-gray-400 hover:text-white transition-colors"
            aria-label="Close inventory"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b border-gray-600 overflow-x-auto">
            <button 
                className={`flex-1 py-3 font-bold text-lg min-w-[100px] ${activeTab === 'bag' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('bag')}
            >
                Bag
            </button>
            <button 
                className={`flex-1 py-3 font-bold text-lg min-w-[100px] ${activeTab === 'equipment' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('equipment')}
            >
                Stats
            </button>
            <button 
                className={`flex-1 py-3 font-bold text-lg min-w-[100px] ${activeTab === 'crafting' ? 'bg-gray-700 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('crafting')}
            >
                Crafting
            </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-800 flex-grow">
          {activeTab === 'bag' && (
              <>
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
                                {renderIcon(item.type)}
                            </div>
                            <div>
                            <h3 className="text-xl font-bold text-white">{item.name} <span className="text-gray-400 text-lg">x{item.quantity}</span></h3>
                            <p className="text-gray-300 text-sm">{item.description}</p>
                            <p className="text-blue-300 text-sm font-bold">{renderDescription(item)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {item.type === ItemType.POTION && (
                                <button 
                                    onClick={() => onUseItem(item, index)} 
                                    className="bg-green-600 hover:bg-green-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded border-2 border-green-800 hover:border-green-700 transition-all transform hover:scale-105"
                                    disabled={disabled}
                                >
                                    Use
                                </button>
                            )}
                            {(item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) && (
                                <button 
                                    onClick={() => onEquipItem(item, index)} 
                                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-500 disabled:cursor-not-allowed text-white font-bold py-2 px-4 rounded border-2 border-blue-800 hover:border-blue-700 transition-all transform hover:scale-105"
                                    disabled={disabled}
                                >
                                    Equip
                                </button>
                            )}
                        </div>
                        </li>
                    ))}
                    </ul>
                )}
              </>
          )}

          {activeTab === 'equipment' && (
              <div className="space-y-6">
                  {/* Attributes Section */}
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <h3 className="text-sm font-bold text-gray-400 uppercase mb-3 text-center border-b border-gray-700 pb-2">Attributes</h3>
                      <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-2 bg-gray-800 rounded border border-gray-700/50">
                              <p className="text-xs text-orange-400 font-bold uppercase mb-1" title="Strength">STR</p>
                              <p className="text-2xl font-mono text-white">{player.attributes.strength}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-800 rounded border border-gray-700/50">
                              <p className="text-xs text-blue-400 font-bold uppercase mb-1" title="Intelligence">INT</p>
                              <p className="text-2xl font-mono text-white">{player.attributes.intelligence}</p>
                          </div>
                          <div className="text-center p-2 bg-gray-800 rounded border border-gray-700/50">
                              <p className="text-xs text-green-400 font-bold uppercase mb-1" title="Agility">AGI</p>
                              <p className="text-2xl font-mono text-white">{player.attributes.agility}</p>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700">
                      <div className="text-center">
                          <p className="text-gray-400 uppercase text-xs">Total Attack</p>
                          <p className="text-3xl font-bold text-red-400">{player.attack}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-gray-400 uppercase text-xs">Total Defense</p>
                          <p className="text-3xl font-bold text-blue-400">{player.defense}</p>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-xl font-press-start text-yellow-500 mb-4">Current Gear</h3>
                      <div className="space-y-4">
                          {/* Main Hand */}
                          <div className="bg-gray-900 p-4 rounded border border-gray-600 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                      <SwordIcon className="text-gray-400"/>
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-500 uppercase">Main Hand</p>
                                      <p className="font-bold text-white">{player.equipment[EquipmentSlot.MAIN_HAND]?.name || "Empty"}</p>
                                      {player.equipment[EquipmentSlot.MAIN_HAND] && (
                                          <p className="text-xs text-red-300">+{player.equipment[EquipmentSlot.MAIN_HAND]?.value} ATK</p>
                                      )}
                                  </div>
                              </div>
                              {player.equipment[EquipmentSlot.MAIN_HAND] && (
                                  <button onClick={() => onUnequipItem(EquipmentSlot.MAIN_HAND)} disabled={disabled} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded border border-gray-500">Unequip</button>
                              )}
                          </div>

                          {/* Body */}
                          <div className="bg-gray-900 p-4 rounded border border-gray-600 flex justify-between items-center">
                              <div className="flex items-center gap-3">
                                  <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                      <ShieldIcon className="text-gray-400"/>
                                  </div>
                                  <div>
                                      <p className="text-xs text-gray-500 uppercase">Body Armor</p>
                                      <p className="font-bold text-white">{player.equipment[EquipmentSlot.BODY]?.name || "Empty"}</p>
                                      {player.equipment[EquipmentSlot.BODY] && (
                                          <p className="text-xs text-blue-300">+{player.equipment[EquipmentSlot.BODY]?.value} DEF</p>
                                      )}
                                  </div>
                              </div>
                              {player.equipment[EquipmentSlot.BODY] && (
                                  <button onClick={() => onUnequipItem(EquipmentSlot.BODY)} disabled={disabled} className="text-sm bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded border border-gray-500">Unequip</button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'crafting' && (
              <div className="space-y-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center text-sm text-gray-400 italic">
                      Collect materials during your adventures to craft powerful items.
                  </div>
                  {CRAFTING_RECIPES.map((recipe, index) => {
                      const canCraft = recipe.ingredients.every(ing => countItemQuantity(ing.name) >= ing.quantity);
                      
                      return (
                          <div key={index} className="bg-gray-900/80 p-4 rounded-md border border-gray-700 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="text-yellow-400">{renderIcon(recipe.result.type)}</div>
                                      <div>
                                          <h3 className="font-bold text-white text-lg">{recipe.result.name}</h3>
                                          <p className="text-xs text-gray-400">{recipe.result.description}</p>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => onCraftItem(recipe)}
                                      disabled={!canCraft || disabled}
                                      className={`px-4 py-2 rounded font-bold text-sm border-2 ${
                                          canCraft 
                                          ? 'bg-amber-600 hover:bg-amber-500 border-amber-400 text-white' 
                                          : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                      }`}
                                  >
                                      Craft
                                  </button>
                              </div>
                              
                              <div className="bg-black/30 p-2 rounded text-sm">
                                  <p className="text-xs text-gray-500 uppercase mb-1">Requires:</p>
                                  <ul className="flex flex-wrap gap-x-4 gap-y-1">
                                      {recipe.ingredients.map((ing, i) => {
                                          const have = countItemQuantity(ing.name);
                                          const hasEnough = have >= ing.quantity;
                                          return (
                                              <li key={i} className={`font-mono ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                                                  {ing.name} ({have}/{ing.quantity})
                                              </li>
                                          );
                                      })}
                                  </ul>
                              </div>
                          </div>
                      );
                  })}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};
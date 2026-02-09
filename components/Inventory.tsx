
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
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fade-in-short backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-900 rounded-lg border-4 border-purple-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Prevent closing when clicking inside the modal
      >
        <div className="p-4 border-b-2 border-purple-700 flex justify-between items-center bg-gray-900/90 rounded-t-lg">
          <h2 className="text-3xl font-cinzel font-bold text-purple-300 drop-shadow-sm">Character</h2>
          <button 
            onClick={onClose} 
            className="text-2xl font-bold text-gray-400 hover:text-white transition-colors w-8 h-8 flex items-center justify-center"
            aria-label="Close inventory"
          >
            &times;
          </button>
        </div>

        <div className="flex border-b border-gray-600 overflow-x-auto bg-gray-800">
            <button 
                className={`flex-1 py-3 font-cinzel font-bold text-lg min-w-[100px] transition-colors ${activeTab === 'bag' ? 'bg-gray-700 text-purple-100 border-b-4 border-purple-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('bag')}
            >
                Bag
            </button>
            <button 
                className={`flex-1 py-3 font-cinzel font-bold text-lg min-w-[100px] transition-colors ${activeTab === 'equipment' ? 'bg-gray-700 text-purple-100 border-b-4 border-purple-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('equipment')}
            >
                Stats
            </button>
            <button 
                className={`flex-1 py-3 font-cinzel font-bold text-lg min-w-[100px] transition-colors ${activeTab === 'crafting' ? 'bg-gray-700 text-purple-100 border-b-4 border-purple-500' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                onClick={() => setActiveTab('crafting')}
            >
                Crafting
            </button>
        </div>

        <div className="p-6 overflow-y-auto bg-gray-800/90 flex-grow font-serif">
          {activeTab === 'bag' && (
              <>
                {inventory.length === 0 ? (
                    <p className="text-center text-gray-400 text-xl py-8 italic">Your bag is empty.</p>
                ) : (
                    <ul className="space-y-4">
                    {inventory.map((item, index) => (
                        <li 
                        key={index} 
                        className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 flex items-center justify-between gap-4 hover:border-purple-500/30 transition-colors"
                        >
                        <div className="flex items-center gap-4">
                            <div className="text-purple-400/80">
                                {renderIcon(item.type)}
                            </div>
                            <div>
                            <h3 className="text-xl font-bold text-gray-100">{item.name} <span className="text-gray-400 text-lg font-normal">x{item.quantity}</span></h3>
                            <p className="text-gray-400 text-sm italic">{item.description}</p>
                            <p className="text-blue-300 text-sm font-bold mt-1">{renderDescription(item)}</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            {item.type === ItemType.POTION && (
                                <button 
                                    onClick={() => onUseItem(item, index)} 
                                    className="bg-green-700 hover:bg-green-600 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-1.5 px-4 rounded border border-green-500 shadow-sm font-cinzel text-sm"
                                    disabled={disabled}
                                >
                                    Use
                                </button>
                            )}
                            {(item.type === ItemType.WEAPON || item.type === ItemType.ARMOR) && (
                                <button 
                                    onClick={() => onEquipItem(item, index)} 
                                    className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:opacity-50 text-white font-bold py-1.5 px-4 rounded border border-blue-500 shadow-sm font-cinzel text-sm"
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
                  <div className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                      <h3 className="text-sm font-bold font-cinzel text-gray-400 uppercase mb-4 text-center border-b border-gray-700 pb-2 tracking-widest">Attributes</h3>
                      <div className="grid grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-gray-800/80 rounded border border-gray-700/50">
                              <p className="text-xs text-orange-400 font-bold uppercase mb-1 tracking-wider" title="Strength">STR</p>
                              <p className="text-3xl font-bold text-white">{player.attributes.strength}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/80 rounded border border-gray-700/50">
                              <p className="text-xs text-blue-400 font-bold uppercase mb-1 tracking-wider" title="Intelligence">INT</p>
                              <p className="text-3xl font-bold text-white">{player.attributes.intelligence}</p>
                          </div>
                          <div className="text-center p-3 bg-gray-800/80 rounded border border-gray-700/50">
                              <p className="text-xs text-green-400 font-bold uppercase mb-1 tracking-wider" title="Agility">AGI</p>
                              <p className="text-3xl font-bold text-white">{player.attributes.agility}</p>
                          </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 bg-gray-900/50 p-4 rounded-lg border border-gray-700/50">
                      <div className="text-center">
                          <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Total Attack</p>
                          <p className="text-4xl font-cinzel font-bold text-red-400 drop-shadow-sm">{player.attack}</p>
                      </div>
                      <div className="text-center">
                          <p className="text-gray-400 uppercase text-xs font-bold tracking-wider mb-1">Total Defense</p>
                          <p className="text-4xl font-cinzel font-bold text-blue-400 drop-shadow-sm">{player.defense}</p>
                      </div>
                  </div>

                  <div>
                      <h3 className="text-xl font-cinzel font-bold text-yellow-500 mb-4 tracking-wide border-b border-gray-700 pb-1">Current Gear</h3>
                      <div className="space-y-4">
                          {/* Main Hand */}
                          <div className="bg-gray-900/80 p-4 rounded border border-gray-700/50 flex justify-between items-center hover:border-gray-600 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="bg-gray-800 p-2.5 rounded border border-gray-700">
                                      <SwordIcon className="text-gray-400 w-6 h-6"/>
                                  </div>
                                  <div>
                                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Main Hand</p>
                                      <p className="font-bold text-lg text-white">{player.equipment[EquipmentSlot.MAIN_HAND]?.name || "Empty"}</p>
                                      {player.equipment[EquipmentSlot.MAIN_HAND] && (
                                          <p className="text-xs text-red-300 font-bold">+{player.equipment[EquipmentSlot.MAIN_HAND]?.value} ATK</p>
                                      )}
                                  </div>
                              </div>
                              {player.equipment[EquipmentSlot.MAIN_HAND] && (
                                  <button onClick={() => onUnequipItem(EquipmentSlot.MAIN_HAND)} disabled={disabled} className="text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded border border-gray-500 text-gray-200">Unequip</button>
                              )}
                          </div>

                          {/* Body */}
                          <div className="bg-gray-900/80 p-4 rounded border border-gray-700/50 flex justify-between items-center hover:border-gray-600 transition-colors">
                              <div className="flex items-center gap-4">
                                  <div className="bg-gray-800 p-2.5 rounded border border-gray-700">
                                      <ShieldIcon className="text-gray-400 w-6 h-6"/>
                                  </div>
                                  <div>
                                      <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-0.5">Body Armor</p>
                                      <p className="font-bold text-lg text-white">{player.equipment[EquipmentSlot.BODY]?.name || "Empty"}</p>
                                      {player.equipment[EquipmentSlot.BODY] && (
                                          <p className="text-xs text-blue-300 font-bold">+{player.equipment[EquipmentSlot.BODY]?.value} DEF</p>
                                      )}
                                  </div>
                              </div>
                              {player.equipment[EquipmentSlot.BODY] && (
                                  <button onClick={() => onUnequipItem(EquipmentSlot.BODY)} disabled={disabled} className="text-xs font-bold uppercase tracking-wider bg-gray-700 hover:bg-gray-600 px-3 py-1.5 rounded border border-gray-500 text-gray-200">Unequip</button>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'crafting' && (
              <div className="space-y-4">
                  <div className="bg-gray-900/50 p-4 rounded text-center text-sm text-gray-400 italic border border-gray-800">
                      Collect materials during your adventures to craft powerful items.
                  </div>
                  {CRAFTING_RECIPES.map((recipe, index) => {
                      const canCraft = recipe.ingredients.every(ing => countItemQuantity(ing.name) >= ing.quantity);
                      
                      return (
                          <div key={index} className="bg-gray-900/50 p-4 rounded-md border border-gray-700/50 flex flex-col gap-3">
                              <div className="flex justify-between items-start">
                                  <div className="flex items-center gap-3">
                                      <div className="text-yellow-500/80">{renderIcon(recipe.result.type)}</div>
                                      <div>
                                          <h3 className="font-bold text-white text-lg">{recipe.result.name}</h3>
                                          <p className="text-xs text-gray-400 italic">{recipe.result.description}</p>
                                      </div>
                                  </div>
                                  <button 
                                      onClick={() => onCraftItem(recipe)}
                                      disabled={!canCraft || disabled}
                                      className={`px-5 py-2 rounded font-bold text-xs uppercase tracking-wider border transition-colors font-cinzel ${
                                          canCraft 
                                          ? 'bg-amber-700 hover:bg-amber-600 border-amber-500 text-white shadow-md' 
                                          : 'bg-gray-800 border-gray-700 text-gray-600 cursor-not-allowed'
                                      }`}
                                  >
                                      Craft
                                  </button>
                              </div>
                              
                              <div className="bg-black/20 p-3 rounded text-sm">
                                  <p className="text-[10px] text-gray-500 uppercase font-bold tracking-wider mb-2">Requires:</p>
                                  <ul className="flex flex-wrap gap-x-6 gap-y-1">
                                      {recipe.ingredients.map((ing, i) => {
                                          const have = countItemQuantity(ing.name);
                                          const hasEnough = have >= ing.quantity;
                                          return (
                                              <li key={i} className={`font-bold ${hasEnough ? 'text-green-400' : 'text-red-400'}`}>
                                                  {ing.name} <span className="text-xs opacity-70">({have}/{ing.quantity})</span>
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
    
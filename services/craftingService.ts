import { Item, ItemType, EquipmentSlot } from '../types';

const WEAPON_PREFIXES = ["Reinforced", "Sharpened", "Balanced", "Heavy", "Serrated", "Masterwork"];
const ARMOR_PREFIXES = ["Reinforced", "Plated", "Studded", "Hardened", "Tough", "Masterwork"];
const POTION_PREFIXES = ["Infused", "Concentrated", "Potent", "Glowing", "Volatile"];

export const combineItems = (item1: Item, item2: Item): Item | null => {
    // Prevent combining Key Items
    if (item1.type === ItemType.KEY_ITEM || item2.type === ItemType.KEY_ITEM) {
        return null;
    }

    // Identify roles (Base vs Ingredient)
    let base = item1;
    let ingredient = item2;

    // Logic to determine which is base
    if (item2.type === ItemType.WEAPON || item2.type === ItemType.ARMOR) {
        if (item1.type === ItemType.MATERIAL || item1.type === ItemType.POTION) {
            base = item2;
            ingredient = item1;
        } else if (item1.value && item2.value && item2.value > item1.value) {
            // If both are gear, pick the stronger one as base? Or just fail?
            // Let's allow merging gear to repair/upgrade?
            base = item2;
            ingredient = item1;
        }
    } else if (item2.type === ItemType.POTION && item1.type === ItemType.MATERIAL) {
        base = item2;
        ingredient = item1;
    }

    // --- Logic Branches ---

    // 1. Gear + Material (Upgrade)
    if ((base.type === ItemType.WEAPON || base.type === ItemType.ARMOR) && ingredient.type === ItemType.MATERIAL) {
        const upgradeAmount = Math.ceil((ingredient.value || 1) * 0.5) || 1;
        const newValue = (base.value || 0) + upgradeAmount;
        
        const prefix = base.type === ItemType.WEAPON 
            ? WEAPON_PREFIXES[Math.floor(Math.random() * WEAPON_PREFIXES.length)]
            : ARMOR_PREFIXES[Math.floor(Math.random() * ARMOR_PREFIXES.length)];

        // Avoid double prefixes if possible, or just prepend
        const newName = base.name.includes(prefix) ? base.name : `${prefix} ${base.name}`;

        return {
            ...base,
            name: newName,
            description: `${base.description} Enhanced with ${ingredient.name}.`,
            value: newValue,
            quantity: 1, // Crafted items are single instance usually
            stackLimit: 1
        };
    }

    // 2. Potion + Material (Infuse)
    if (base.type === ItemType.POTION && ingredient.type === ItemType.MATERIAL) {
        const upgradeAmount = (ingredient.value || 5);
        const newValue = (base.value || 0) + upgradeAmount;
        const prefix = POTION_PREFIXES[Math.floor(Math.random() * POTION_PREFIXES.length)];
        
        return {
            ...base,
            name: `${prefix} ${base.name}`,
            description: `A potion infused with ${ingredient.name}.`,
            value: newValue,
            quantity: 1,
            stackLimit: 5
        };
    }

    // 3. Potion + Potion (Mix)
    if (base.type === ItemType.POTION && ingredient.type === ItemType.POTION) {
        const newValue = Math.floor(((base.value || 0) + (ingredient.value || 0)) * 0.8);
        
        return {
            ...base,
            name: "Mixed Concoction",
            description: `A volatile mixture of ${base.name} and ${ingredient.name}.`,
            value: newValue,
            quantity: 1,
            stackLimit: 5
        };
    }

    // 4. Material + Material (Combine/Scrap)
    if (base.type === ItemType.MATERIAL && ingredient.type === ItemType.MATERIAL) {
        return {
            name: "Dense Material",
            description: "A dense block of combined materials.",
            type: ItemType.MATERIAL,
            value: ((base.value || 1) + (ingredient.value || 1)),
            quantity: 1,
            stackLimit: 10
        };
    }

    // 5. Gear + Gear (Salvage/Merge - simplistic)
    if (base.type === base.type && (base.type === ItemType.WEAPON || base.type === ItemType.ARMOR)) {
         // Sacrifice ingredient to boost base slightly
         const upgradeAmount = Math.ceil((ingredient.value || 1) * 0.2) || 1;
         return {
             ...base,
             value: (base.value || 0) + upgradeAmount,
             description: `${base.description} Repaired with parts from ${ingredient.name}.`
         };
    }

    // Fallback: Failed Craft
    return {
        name: "Sludge",
        description: "The result of a failed experiment.",
        type: ItemType.MATERIAL,
        value: 1,
        quantity: 1,
        stackLimit: 10
    };
};

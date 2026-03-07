import { Item, ItemType, EquipmentSlot } from '../types';

interface Recipe {
    ingredients: string[]; // Names of ingredients
    result: Partial<Item>;
}

const RECIPES: Recipe[] = [
    {
        ingredients: ["Herb", "Water"],
        result: {
            name: "Health Potion",
            description: "A standard healing potion.",
            type: ItemType.POTION,
            value: 20,
            quantity: 1,
            stackLimit: 5
        }
    },
    {
        ingredients: ["Iron Ore", "Wood"],
        result: {
            name: "Iron Dagger",
            description: "A simple but effective dagger.",
            type: ItemType.WEAPON,
            value: 5,
            quantity: 1,
            stackLimit: 1,
            slot: EquipmentSlot.MAIN_HAND
        }
    },
    {
        ingredients: ["Leather", "Thread"],
        result: {
            name: "Leather Armor",
            description: "Basic protection.",
            type: ItemType.ARMOR,
            value: 3,
            quantity: 1,
            stackLimit: 1,
            slot: EquipmentSlot.BODY
        }
    }
];

export const getDeterministicResult = (item1: Item, item2: Item): Item | null => {
    // 1. Check Specific Recipes
    const names = [item1.name, item2.name].sort();
    const recipe = RECIPES.find(r => {
        const rNames = [...r.ingredients].sort();
        return rNames[0] === names[0] && rNames[1] === names[1];
    });

    if (recipe) {
        return {
            name: recipe.result.name!,
            description: recipe.result.description!,
            type: recipe.result.type!,
            value: recipe.result.value || 0,
            quantity: 1,
            stackLimit: recipe.result.stackLimit || 1,
            slot: recipe.result.slot,
            traits: []
        };
    }

    // 2. Generic Fallbacks (Simple logic that doesn't need AI)
    // e.g. Potion Mixing
    if (item1.type === ItemType.POTION && item2.type === ItemType.POTION) {
         const newValue = Math.floor(((item1.value || 0) + (item2.value || 0)) * 0.8);
         return {
            name: "Mixed Concoction",
            description: `A volatile mixture of ${item1.name} and ${item2.name}.`,
            type: ItemType.POTION,
            value: newValue,
            quantity: 1,
            stackLimit: 5,
            traits: []
        };
    }

    return null; // No deterministic result -> Use AI
};


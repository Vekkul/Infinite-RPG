import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Player, Enemy, GameAction, Item, ItemType, EnemyAbility, CharacterClass } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the item, e.g., 'Minor Healing Potion', 'Bubbling Concoction'." },
        description: { type: Type.STRING, description: "A brief, flavorful description of the item." },
        type: { type: Type.STRING, description: `The item type. Must be '${ItemType.POTION}'.` },
        value: { type: Type.INTEGER, description: "For potions, the amount of HP it restores. Between 15 and 30." },
        stackLimit: { type: Type.INTEGER, description: "The maximum stack size for this item. For potions, this should be between 5 and 10."}
    },
    required: ["name", "description", "type", "value", "stackLimit"]
};

const sceneSchema = {
  type: Type.OBJECT,
  properties: {
    description: {
      type: Type.STRING,
      description: "A vivid, fantasy JRPG-style description of the current location. Max 80 words. Be creative and evocative. Mention things like weather, terrain, and mood.",
    },
    actions: {
      type: Type.ARRAY,
      description: "An array of 3 possible actions for the player. One should be 'rest', one should be an 'encounter' (like 'Challenge the guardian'), and one should be 'explore'.",
      items: {
        type: Type.OBJECT,
        properties: {
          label: {
            type: Type.STRING,
            description: "The text on the action button, e.g., 'Venture into the Whispering Woods'.",
          },
          type: {
            type: Type.STRING,
            description: "The type of action. Must be one of: 'explore', 'rest', 'encounter'.",
          },
        },
        required: ["label", "type"],
      },
    },
    foundItem: {
      ...itemSchema,
      description: "An item the player finds in this scene. Optional, only include it about 25% of the time."
    }
  },
  required: ["description", "actions"],
};

const enemySchema = {
    type: Type.OBJECT,
    properties: {
        name: {
            type: Type.STRING,
            description: "A creative and menacing fantasy monster name from a JRPG. e.g. 'Gloomfang', 'Crystal Golem', 'Shadow Sprite'."
        },
        description: {
            type: Type.STRING,
            description: "A short, intimidating description of the monster. Max 30 words."
        },
        hp: {
            type: Type.INTEGER,
            description: "The monster's health points. Should be a value between player's level * 15 and player's level * 25."
        },
        attack: {
            type: Type.INTEGER,
            description: "The monster's attack power. Should be a value between player's level * 3 and player's level * 5."
        },
        loot: {
            ...itemSchema,
            description: "An item dropped by the monster upon defeat. Optional, include for about 40% of monsters."
        },
        ability: {
            type: Type.STRING,
            description: `An optional special ability for the monster. Can be one of: '${EnemyAbility.HEAL}', '${EnemyAbility.SHIELD}'. Omit for most monsters.`
        }
    },
    required: ["name", "description", "hp", "attack"]
};

const encounterSchema = {
    type: Type.ARRAY,
    description: "An array of 1 to 3 enemy monsters for the player to fight.",
    items: enemySchema,
};


export const generateScene = async (player: Player): Promise<{ description: string; actions: GameAction[]; foundItem?: Omit<Item, 'quantity'>; }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a new scene for a JRPG player at level ${player.level}. The player just finished a battle or arrived in a new area.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: sceneSchema,
                temperature: 1.0,
            },
        });

        const data = JSON.parse(response.text);
        // Ensure actions are unique and correct types
        const actionsMap = new Map<string, GameAction>();
        (data.actions as GameAction[]).forEach(action => {
            if (['explore', 'rest', 'encounter'].includes(action.type)) {
                if(!actionsMap.has(action.type)) {
                    actionsMap.set(action.type, action);
                }
            }
        });
        
        return {
            description: data.description,
            actions: Array.from(actionsMap.values()),
            foundItem: data.foundItem
        };
    } catch (error) {
        console.error("Error generating scene:", error);
        // Fallback in case of API error
        return {
            description: "An ancient path winds before you, shrouded in an eerie silence. The air is thick with unspoken magic.",
            actions: [
                { label: "Follow the path", type: "explore" },
                { label: "Search for danger", type: "encounter" },
                { label: "Set up camp", type: "rest" },
            ],
        };
    }
};

export const generateEncounter = async (player: Player): Promise<Enemy[]> => {
     try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a fantasy JRPG monster encounter for a player who is level ${player.level}. Generate between 1 and 3 monsters. Some might have special abilities like healing or shielding. The encounter should be a suitable challenge.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: encounterSchema,
                temperature: 1.0,
            },
        });

        const data = JSON.parse(response.text) as Omit<Enemy, 'maxHp' | 'isShielded'>[];
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid response format from API");
        }
        return data.map(enemy => ({ ...enemy, maxHp: enemy.hp, isShielded: false }));
    } catch (error) {
        console.error("Error generating encounter:", error);
        // Fallback enemy
        const hp = player.level * 20;
        const attack = player.level * 4;
        return [{
            name: "Slime",
            description: "A basic, gelatinous creature. It jiggles menacingly.",
            hp: hp,
            maxHp: hp,
            attack: attack,
            isShielded: false,
        }];
    }
};

export const generateCharacterPortrait = async (description: string, characterClass: CharacterClass): Promise<string> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `A 16-bit pixel art portrait of a JRPG character. Class: ${characterClass}. Description: ${description}. Vibrant colors, fantasy style, head and shoulders view.`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
                temperature: 0.9,
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return part.inlineData.data;
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.error("Error generating character portrait:", error);
        // In case of an error, we'll return an empty string. The UI can handle this.
        return "";
    }
};
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Player, Enemy, GameAction, Item, ItemType, EnemyAbility, CharacterClass, SocialEncounter, RewardType, AIPersonality, MapLocation, WorldData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const SYSTEM_INSTRUCTION = "You are a creative and engaging dungeon master for a classic fantasy JRPG. Your descriptions are vivid, your monsters are menacing, and your scenarios are intriguing. Keep the tone epic and adventurous, with a slightly retro feel. Responses must adhere to the provided JSON schema.";

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

const exploreResultSchema = {
    type: Type.OBJECT,
    properties: {
        outcome: {
            type: Type.STRING,
            description: "A vivid, fantasy JRPG-style description of what happens as a result of the player's action. Max 80 words. Be creative and contextually appropriate. This text will become the new main story text."
        },
        foundItem: {
            ...itemSchema,
            description: "An item the player finds. Optional, include it about 30% of the time for 'search' or 'investigate' type actions. Omit otherwise."
        },
        triggerCombat: {
            type: Type.BOOLEAN,
            description: "Set to true ONLY if this action directly and logically leads to a combat encounter (e.g., 'Kick the hornet nest'). Should be false for most actions like 'Read a book'."
        },
        triggerSocial: {
            type: Type.BOOLEAN,
            description: "Set to true if this action leads to a social, non-combat encounter with an NPC."
        }
    },
    required: ["outcome", "triggerCombat", "triggerSocial"]
};

const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "A vivid, fantasy JRPG-style description of the current location, reflecting the provided context. Max 80 words. Be creative and evocative.",
        },
        localActions: {
            type: Type.ARRAY,
            description: "An array of 1 or 2 possible actions unique to this location, besides moving. e.g., 'Search the abandoned shack', 'Listen to the wind'. Label should be short. Type should be 'explore' or 'encounter'.",
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "The text on the action button." },
                    type: { type: Type.STRING, description: "The type of action. Must be 'explore' or 'encounter'." },
                },
                required: ["label", "type"],
            },
        },
        foundItem: {
            ...itemSchema,
            description: "An item the player finds upon arriving in this scene. Optional, only include it about 25% of the time."
        }
    },
    required: ["description", "localActions"],
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
            description: `An optional special ability for the monster. Can be one of: '${EnemyAbility.HEAL}', '${EnemyAbility.SHIELD}', '${EnemyAbility.MULTI_ATTACK}', '${EnemyAbility.DRAIN_LIFE}'. Omit for most monsters.`
        },
        aiPersonality: {
            type: Type.STRING,
            description: `The monster's combat AI. Determines its behavior. Can be one of: '${AIPersonality.AGGRESSIVE}' (attacks often), '${AIPersonality.DEFENSIVE}' (heals/shields when low HP), '${AIPersonality.STRATEGIC}' (balances attack and defense), or '${AIPersonality.WILD}' (unpredictable). Assign strategically based on the monster's concept and abilities.`
        }
    },
    required: ["name", "description", "hp", "attack"]
};

const encounterSchema = {
    type: Type.ARRAY,
    description: "An array of 1 to 3 enemy monsters for the player to fight.",
    items: enemySchema,
};

const rewardSchema = {
    type: Type.OBJECT,
    properties: {
        type: { type: Type.STRING, description: `The type of reward. Must be one of: '${RewardType.XP}', '${RewardType.ITEM}'.` },
        value: { type: Type.INTEGER, description: "For XP, the amount gained. Between 25 and 75." },
        item: { ...itemSchema, description: "For an ITEM reward, describe the item."}
    },
    required: ["type"]
};

const socialChoiceSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING, description: "A short label for the choice button (e.g., 'Help the merchant', 'Ignore him'). Max 5 words." },
        outcome: { type: Type.STRING, description: "The resulting story text if this choice is made. Max 60 words." },
        reward: { ...rewardSchema, description: "An optional reward for this choice. Not every choice should have a reward." }
    },
    required: ["label", "outcome"]
};

const socialEncounterSchema = {
    type: Type.OBJECT,
    properties: {
        description: { type: Type.STRING, description: "A description of a non-combat social situation with an NPC. e.g., meeting a lost child, a grumpy guard, a mysterious vendor. Max 80 words." },
        choices: {
            type: Type.ARRAY,
            description: "An array of exactly 2 choices for the player.",
            items: socialChoiceSchema
        }
    },
    required: ["description", "choices"]
};

const mapLocationSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique, one-word ID for the location (e.g., 'forest', 'castle')." },
        name: { type: Type.STRING, description: "A creative, fantasy name for the location (e.g., 'Glimmerwood Forest', 'Castle Valoria')." },
        description: { type: Type.STRING, description: "A brief, evocative description of the location. Max 30 words." },
        x: { type: Type.INTEGER, description: "The horizontal position on the map, from 5 to 95." },
        y: { type: Type.INTEGER, description: "The vertical position on the map, from 5 to 95." },
    },
    required: ["id", "name", "description", "x", "y"]
};

const connectionSchema = {
    type: Type.OBJECT,
    properties: {
        from: { type: Type.STRING, description: "The ID of the starting location." },
        to: { type: Type.STRING, description: "The ID of the destination location." },
    },
    required: ["from", "to"]
};

const worldDataSchema = {
    type: Type.OBJECT,
    properties: {
        locations: {
            type: Type.ARRAY,
            description: "An array of 6 to 8 unique map locations.",
            items: mapLocationSchema
        },
        connections: {
            type: Type.ARRAY,
            description: "An array of connections between location IDs, ensuring all locations form a single connected graph.",
            items: connectionSchema
        },
        startLocationId: {
            type: Type.STRING,
            description: "The ID of the location where the player should start."
        }
    },
    required: ["locations", "connections", "startLocationId"]
};

export const generateExploreResult = async (player: Player, action: GameAction): Promise<{ outcome: string; foundItem?: Omit<Item, 'quantity'>; triggerCombat: boolean; triggerSocial: boolean; isFallback?: boolean; }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `The player, a level ${player.level} ${player.class}, decided to perform the action: "${action.label}". Generate a contextually appropriate outcome. The action should not always lead to combat; for example, reading a sign should provide information, not start a fight. The outcome description will replace the current scene text.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: exploreResultSchema,
                temperature: 0.9,
            },
        });

        const data = JSON.parse(response.text);

        return {
            outcome: data.outcome,
            foundItem: data.foundItem,
            triggerCombat: data.triggerCombat || false,
            triggerSocial: data.triggerSocial || false,
        };

    } catch (error) {
        console.error("Error generating explore result:", error);
        // Fallback result
        return {
            outcome: "You cautiously proceed, but find nothing of interest. The path ahead remains.",
            triggerCombat: false,
            triggerSocial: false,
            isFallback: true,
        };
    }
};

export const generateScene = async (player: Player, location: MapLocation): Promise<{ description: string; actions: GameAction[]; foundItem?: Omit<Item, 'quantity'>; isFallback?: boolean; }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a new scene for a JRPG player at level ${player.level}. The player has just arrived at ${location.name}: "${location.description}". Generate a vivid description and 1-2 thematically appropriate local actions.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: sceneSchema,
                temperature: 0.9,
            },
        });

        const data = JSON.parse(response.text);
        
        return {
            description: data.description,
            actions: data.localActions || [],
            foundItem: data.foundItem
        };
    } catch (error) {
        console.error("Error generating scene:", error);
        // Fallback in case of API error
        return {
            description: `You have arrived at ${location.name}. An ancient path winds before you, shrouded in an eerie silence. The air is thick with unspoken magic.`,
            actions: [
                { label: "Search the area", type: "explore" },
                { label: "Listen for danger", type: "encounter" },
            ],
            isFallback: true,
        };
    }
};

export const generateEncounter = async (player: Player): Promise<{ enemies: Enemy[]; isFallback?: boolean; }> => {
     try {
        const numMonsters = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a fantasy JRPG monster encounter for a player who is level ${player.level}. Generate exactly ${numMonsters} monster(s). Some might have special abilities like healing, shielding, multi-attack, or drain life. The encounter should be a suitable challenge.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: encounterSchema,
                temperature: 1.0,
            },
        });

        const data = JSON.parse(response.text) as Omit<Enemy, 'maxHp' | 'isShielded'>[];
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid response format from API");
        }
        return { enemies: data.map(enemy => ({ ...enemy, maxHp: enemy.hp, isShielded: false })) };
    } catch (error) {
        console.error("Error generating encounter:", error);
        // Fallback enemy
        const hp = player.level * 20;
        const attack = player.level * 4;
        return {
            enemies: [{
                name: "Slime",
                description: "A basic, gelatinous creature. It jiggles menacingly.",
                hp: hp,
                maxHp: hp,
                attack: attack,
                isShielded: false,
                aiPersonality: AIPersonality.AGGRESSIVE,
            }],
            isFallback: true,
        };
    }
};

export const generateSocialEncounter = async (player: Player): Promise<{ encounter: SocialEncounter; isFallback?: boolean; }> => {
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Generate a social, non-combat encounter for a level ${player.level} ${player.class} in a JRPG. The situation should present a clear choice with two distinct outcomes. One choice might offer a small reward like XP or an item.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: socialEncounterSchema,
                temperature: 1.0,
            },
        });
        return { encounter: JSON.parse(response.text) as SocialEncounter };
    } catch (error)
        {
        console.error("Error generating social encounter:", error);
        // Fallback social encounter
        return {
            encounter: {
                description: "You come across an old merchant whose cart has a broken wheel. He looks at you with weary eyes.",
                choices: [
                    {
                        label: "Help him fix the wheel.",
                        outcome: "You spend some time helping the merchant. Grateful, he thanks you for your kindness.",
                        reward: { type: RewardType.XP, value: 30 }
                    },
                    {
                        label: "Ignore him and continue.",
                        outcome: "You decide you don't have time to help and continue on your journey down the path."
                    }
                ]
            },
            isFallback: true,
        };
    }
};

export const generateCharacterPortrait = async (description: string, characterClass: CharacterClass): Promise<{ portrait: string; isFallback?: boolean; }> => {
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
            },
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return { portrait: part.inlineData.data };
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.error("Error generating character portrait:", error);
        // In case of an error, we'll return an empty string. The UI can handle this.
        return { portrait: "", isFallback: true };
    }
};

export const generateWorldData = async (): Promise<WorldData | null> => {
    try {
        // Step 1: Generate the world map image first.
        const imageResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: {
                parts: [
                    {
                        text: `Generate a top-down, 16-bit pixel art style JRPG world map. The map should feature diverse biomes like lush forests, snowy mountains, villages, a large castle, and a coastline. IMPORTANT: The map image must be clean and contain absolutely no text, no labels, no icons, and no UI elements. It is a background image only.`,
                    },
                ],
            },
            config: {
                responseModalities: [Modality.IMAGE],
            },
        });

        let image = "";
        let imageMimeType = "";
        for (const part of imageResponse.candidates[0].content.parts) {
            if (part.inlineData) {
                image = part.inlineData.data;
                imageMimeType = part.inlineData.mimeType;
                break;
            }
        }

        if (!image || !imageMimeType) throw new Error("No image data found in response for world map.");

        // Step 2: Analyze the generated image to create coherent world data.
        const worldDataResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: imageMimeType,
                            data: image,
                        },
                    },
                    {
                        text: `You are a fantasy cartographer. Analyze the provided JRPG world map image. Identify 6 to 8 distinct locations like villages, castles, forests, or mountains. Create a JSON object that follows the provided schema. One location MUST be a starting village named 'Oakhaven' (id: 'oakhaven') and set as the 'startLocationId'. For each location, provide its x and y coordinates based on its position in the image. Ensure all locations form a single connected graph.`,
                    },
                ],
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: worldDataSchema,
                temperature: 0.8,
            },
        });

        const worldJson = JSON.parse(worldDataResponse.text.trim());
        
        const locationsWithExplored = worldJson.locations.map((loc: Omit<MapLocation, 'isExplored'>) => ({...loc, isExplored: false}));
        
        return {
            image,
            locations: locationsWithExplored,
            connections: worldJson.connections,
            startLocationId: worldJson.startLocationId,
        };

    } catch (error) {
        console.error("Error generating world data:", error);
        return null;
    }
};

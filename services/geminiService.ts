
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Player, GameAction, Item, ItemType, EnemyAbility, CharacterClass, SocialEncounter, RewardType, AIPersonality, MapLocation, WorldData, Element, Enemy, SocialChoice, EquipmentSlot, Quest, QuestUpdate } from '../types';

// Helper to get a fresh instance of the API client
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY as string });

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const SYSTEM_INSTRUCTION = "You are a creative and engaging dungeon master for a classic fantasy JRPG. Your descriptions are vivid, your monsters are menacing, and your scenarios are intriguing. Keep the tone epic and adventurous, with a slightly retro feel. Responses must adhere to the provided JSON schema.";

const questSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique, short ID for the quest (e.g., 'find_lost_cat')." },
        title: { type: Type.STRING, description: "The title of the quest." },
        description: { type: Type.STRING, description: "A brief description of what the player needs to do." },
        status: { type: Type.STRING, enum: ['ACTIVE'], description: "Initial status." }
    },
    required: ["id", "title", "description", "status"]
};

const questUpdateSchema = {
    type: Type.OBJECT,
    properties: {
        questId: { type: Type.STRING, description: "The ID of the quest to update. MUST match an ID from the context." },
        status: { type: Type.STRING, enum: ['COMPLETED', 'FAILED'], description: "The new status of the quest." }
    },
    required: ["questId", "status"]
};

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the item, e.g., 'Minor Healing Potion', 'Rusty Iron Sword', 'Leather Jerkin', 'Ancient Key'." },
        description: { type: Type.STRING, description: "A brief, flavorful description of the item." },
        type: { type: Type.STRING, enum: [ItemType.POTION, ItemType.WEAPON, ItemType.ARMOR, ItemType.KEY_ITEM], description: "The item type. Use KEY_ITEM for story objects." },
        value: { type: Type.INTEGER, description: "For POTION: HP restored. WEAPON/ARMOR: Stat bonus. KEY_ITEM: 0." },
        stackLimit: { type: Type.INTEGER, description: "Max stack size. Potions: 5-10. Equipment: 1. Key Items: 1."},
        slot: { type: Type.STRING, enum: [EquipmentSlot.MAIN_HAND, EquipmentSlot.BODY], description: "Only for WEAPON/ARMOR. Null for others."},
        traits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Optional narrative tags, e.g., ['cursed', 'glows', 'rusty']."}
    },
    required: ["name", "description", "type", "value", "stackLimit"]
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

const socialChoiceSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING, description: "A short label for the choice button (e.g., 'Help the merchant', 'Ignore him'). Max 5 words." },
        outcome: { type: Type.STRING, description: "The resulting story text if this choice is made. Max 60 words." },
        flagUpdate: { type: Type.STRING, description: "Optional: A narrative flag to add to the player's journal if this choice is taken (e.g., 'helped_merchant', 'stole_apple')." },
        reward: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, description: `The type of reward. Must be one of: '${RewardType.XP}', '${RewardType.ITEM}', '${RewardType.QUEST}'.` },
                value: { type: Type.INTEGER, description: "For XP, the amount gained. Between 25 and 75." },
                item: { ...itemSchema, description: "For an ITEM reward, describe the item." },
                quest: { ...questSchema, description: "For a QUEST reward, describe the new quest." }
            },
            required: ["type"]
        },
        questUpdate: { ...questUpdateSchema, description: "Optional: Update an existing active quest status if this choice completes it." }
    },
    required: ["label", "outcome"]
};

const exploreResultSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "A vivid description of the result of the player's action, which also sets the stage for what comes next. This text is used for both the event log and the main screen. For an EXPLORATION result, it should describe the outcome and then restate the scene. For a SOCIAL or COMBAT result, it should provide the lead-in text for the encounter. Max 80 words."
        },
        nextSceneType: {
            type: Type.STRING,
            enum: ['EXPLORATION', 'SOCIAL', 'COMBAT'],
            description: "The type of scene that follows. MUST be one of the enum values, chosen logically based on the player's action."
        },
        localActions: {
            ...sceneSchema.properties.localActions,
            description: "ONLY include if nextSceneType is 'EXPLORATION'."
        },
        foundItem: {
            ...itemSchema,
            description: "An optional item found. ONLY include if nextSceneType is 'EXPLORATION' and it makes narrative sense."
        },
        socialChoices: {
            type: Type.ARRAY,
            description: "An array of 2 choices. ONLY include if nextSceneType is 'SOCIAL'.",
            items: socialChoiceSchema
        },
        questUpdate: { ...questUpdateSchema, description: "Optional: If this action logically completes an ACTIVE quest from the context, update it here." }
    },
    required: ["description", "nextSceneType"]
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
        },
        element: {
            type: Type.STRING,
            description: `An optional elemental affinity for the monster. Can be one of: '${Element.FIRE}', '${Element.ICE}', '${Element.LIGHTNING}', '${Element.EARTH}'. Omit for non-elemental monsters.`
        }
    },
    required: ["name", "description", "hp", "attack"]
};

const encounterSchema = {
    type: Type.ARRAY,
    description: "An array of 1 to 3 enemy monsters for the player to fight.",
    items: enemySchema,
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

// --- Helper for Prompt Construction ---
const getContextString = (player: Player) => {
    let context = `Player Context: Level ${player.level} ${player.class}.`;
    if (player.journal.quests.length > 0) {
        // IMPORTANT: Sending IDs so the AI can reference them in updates.
        const activeQuests = player.journal.quests
            .filter(q => q.status === 'ACTIVE')
            .map(q => `${q.title} (ID: ${q.id}: ${q.description})`)
            .join(', ');
        
        if (activeQuests) {
             context += ` Active Quests: ${activeQuests}.`;
        }
    }
    if (player.journal.flags.length > 0) {
        context += ` Narrative Flags (Events that happened): ${player.journal.flags.join(', ')}.`;
    }
    return context;
};

export const generateExploreResult = async (player: Player, action: GameAction): Promise<{ description: string; nextSceneType: 'EXPLORATION' | 'SOCIAL' | 'COMBAT'; localActions?: GameAction[]; foundItem?: Omit<Item, 'quantity'>; socialChoices?: SocialChoice[]; questUpdate?: QuestUpdate; isFallback?: boolean; }> => {
    try {
        const context = getContextString(player);
        const response = await getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: `Context: ${context}. The player decided to: "${action.label}". Generate a logically consistent result that respects the narrative flags. The 'description' must vividly narrate the outcome and set up the next scene. For EXPLORATION, describe the action's result and the current scene. If the player's action and location logically conclude an ACTIVE quest (e.g., they found the item or person described in the quest ID/Description), strictly use 'questUpdate' to mark it COMPLETED. For SOCIAL/COMBAT, provide the lead-in text. E.g., for 'Search a chest', 'description' could be 'You open the chest and find a healing potion. The dusty room is otherwise empty.', with nextSceneType 'EXPLORATION'. Trigger COMBAT sparingly.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: exploreResultSchema,
                temperature: 0.7,
            },
        });

        const data = JSON.parse(response.text);

        return {
            description: data.description,
            nextSceneType: data.nextSceneType,
            localActions: data.localActions,
            foundItem: data.foundItem,
            socialChoices: data.socialChoices,
            questUpdate: data.questUpdate,
        };

    } catch (error) {
        return {
            description: "You cautiously proceed but find nothing of interest. The path ahead remains, waiting for your next move.",
            nextSceneType: 'EXPLORATION',
            localActions: [{ label: "Scan the surroundings", type: "explore" }],
            isFallback: true,
        };
    }
};

export const generateScene = async (player: Player, location: MapLocation): Promise<{ description: string; actions: GameAction[]; foundItem?: Omit<Item, 'quantity'>; isFallback?: boolean; }> => {
    try {
        const context = getContextString(player);
        const response = await getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: `Context: ${context}. Generate a new scene for a JRPG player. The player has just arrived at ${location.name}: "${location.description}". Generate a vivid description that incorporates active quests or narrative flags if they seem relevant to this location. Generate 1-2 thematically appropriate local actions.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: sceneSchema,
                temperature: 0.7,
            },
        });

        const data = JSON.parse(response.text);
        
        return {
            description: data.description,
            actions: data.localActions || [],
            foundItem: data.foundItem
        };
    } catch (error) {
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
        const context = getContextString(player);
        const numMonsters = Math.floor(Math.random() * 3) + 1; // 1, 2, or 3

        const response = await getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: `Context: ${context}. Generate a fantasy JRPG monster encounter for a player who is level ${player.level}. Generate exactly ${numMonsters} monster(s). Some might have special abilities like healing or shielding. Monsters can also have an elemental affinity (Fire, Ice, Lightning, Earth). The encounter should be a suitable challenge.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: encounterSchema,
                temperature: 0.6,
            },
        });

        const data = JSON.parse(response.text) as Omit<Enemy, 'maxHp' | 'isShielded' | 'statusEffects'>[];
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error("Invalid response format from API");
        }
        return { enemies: data.map(enemy => ({ ...enemy, maxHp: enemy.hp, isShielded: false, statusEffects: [] })) };
    } catch (error) {
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
                statusEffects: [],
                aiPersonality: AIPersonality.AGGRESSIVE,
            }],
            isFallback: true,
        };
    }
};

// Generates a deterministic pixel art style placeholder if image generation fails
const getFallbackPortrait = (characterClass: CharacterClass): string => {
    let bgColor = "#4B5563"; // gray-600
    let mainColor = "#9CA3AF"; // gray-400
    
    switch (characterClass) {
        case CharacterClass.WARRIOR:
            bgColor = "#7F1D1D"; // red-900
            mainColor = "#FCA5A5"; // red-300
            break;
        case CharacterClass.MAGE:
            bgColor = "#1E3A8A"; // blue-900
            mainColor = "#93C5FD"; // blue-300
            break;
        case CharacterClass.ROGUE:
            bgColor = "#064E3B"; // green-900
            mainColor = "#6EE7B7"; // green-300
            break;
    }

    const svgString = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 8 8">
        <rect width="8" height="8" fill="${bgColor}" />
        <rect x="2" y="2" width="4" height="4" fill="${mainColor}" />
        <rect x="3" y="3" width="1" height="1" fill="#000" opacity="0.6"/>
        <rect x="5" y="3" width="1" height="1" fill="#000" opacity="0.6"/>
        <rect x="2" y="6" width="4" height="1" fill="#000" opacity="0.3"/>
    </svg>`;

    return btoa(svgString);
};

export const generateCharacterPortrait = async (description: string, characterClass: CharacterClass): Promise<{ portrait: string; isFallback?: boolean; }> => {
    try {
        const response = await getAi().models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [
                    {
                        text: `A 16-bit pixel art portrait of a JRPG character. Class: ${characterClass}. Description: ${description}. Vibrant colors, fantasy style, head and shoulders view.`,
                    },
                ],
            },
        });

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    return { portrait: part.inlineData.data };
                }
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.warn("Error generating character portrait, using fallback.", error);
        return { portrait: getFallbackPortrait(characterClass), isFallback: true };
    }
};

export const generateWorldData = async (): Promise<WorldData | null> => {
    try {
        // Step 1: Generate the world map image.
        const imageResponse = await getAi().models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [
                    {
                        text: `Generate a top-down, 16-bit pixel art style JRPG world map. The map should feature diverse biomes like lush forests, snowy mountains, villages, a large castle, and a coastline. IMPORTANT: The map image must be clean and contain absolutely no text, no labels, no icons, and no UI elements. It is a background image only.`,
                    },
                ],
            },
        });

        let image = "";
        let imageMimeType = "";
        const imageParts = imageResponse.candidates?.[0]?.content?.parts;
        if (imageParts) {
            for (const part of imageParts) {
                if (part.inlineData) {
                    image = part.inlineData.data;
                    imageMimeType = part.inlineData.mimeType;
                    break;
                }
            }
        }

        if (!image || !imageMimeType) throw new Error("No image data found in response for world map.");

        // Step 2: Analyze the generated image to create coherent world data.
        const worldDataResponse = await getAi().models.generateContent({
            model: TEXT_MODEL,
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
                temperature: 0.6,
            },
        });

        const worldJson = JSON.parse(worldDataResponse.text.trim());
        
        let startId = worldJson.startLocationId;
        const locations = worldJson.locations || [];
        const connections = worldJson.connections || [];

        if (!startId || !locations.some((l: MapLocation) => l.id === startId)) {
            if (locations.length > 0) {
                startId = locations[0].id;
            } else {
                return null;
            }
        }
        
        const locationsWithExplored = locations.map((loc: Omit<MapLocation, 'isExplored'>) => ({...loc, isExplored: false}));
        
        return {
            image,
            locations: locationsWithExplored,
            connections: connections,
            startLocationId: startId,
        };

    } catch (error) {
        console.error("Error generating world data:", error);
        return null;
    }
};

export const generateSpeech = async (text: string): Promise<{ audio: string; isFallback: boolean; }> => {
    try {
        const response = await getAi().models.generateContent({
            model: TTS_MODEL,
            contents: [{ parts: [{ text: `Say with the tone of an epic fantasy narrator: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' },
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return { audio: base64Audio, isFallback: false };
        }
        throw new Error("No audio data found in response.");

    } catch (error) {
        return { audio: "", isFallback: true };
    }
};


import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Player, GameAction, Item, ItemType, EnemyAbility, SocialEncounter, RewardType, AIPersonality, MapLocation, WorldData, Element, Enemy, SocialChoice, EquipmentSlot, Quest, QuestUpdate } from '../types';
import { assetService } from './assetService';
import { BESTIARY, BestiaryEntry } from '../data/bestiary';

// Helper to get a fresh instance of the API client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
const getAi = () => ai;

const TEXT_MODEL = 'gemini-3-flash-preview';
const IMAGE_MODEL = 'gemini-2.5-flash-image';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

const SYSTEM_INSTRUCTION = `You are a world-class fantasy RPG Dungeon Master. 
Your goal is to weave a compelling, reactive narrative based on the player's choices.
- Be vivid but concise (max 60 words for descriptions).
- Strictly adhere to the provided JSON schema.
- Ensure narrative continuity by referencing the provided context.
- When generating items, ensure they are balanced for the player's current level.
- When generating social choices, make them impactful and distinct.`;

// --- Schemas (Kept as is for brevity, assume they exist) ---
const questSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "A unique, short ID for the quest (e.g., 'find_lost_cat')." },
        title: { type: Type.STRING, description: "The title of the quest." },
        description: { type: Type.STRING, description: "A brief description of what the player needs to do." },
        status: { type: Type.STRING, enum: ['ACTIVE'], description: "Initial status." },
        giver: { type: Type.STRING, description: "Who gave the quest (e.g., 'Village Elder')." },
        rewardText: { type: Type.STRING, description: "Description of the promised reward." }
    },
    required: ["id", "title", "description", "status"]
};

const questUpdateSchema = {
    type: Type.OBJECT,
    properties: {
        questId: { type: Type.STRING, description: "The ID of the quest to update. MUST match an ID from the context." },
        status: { type: Type.STRING, enum: ['COMPLETED', 'FAILED'], description: "The new status of the quest." },
        outcome: { type: Type.STRING, description: "A brief summary of how the quest ended." },
        rewardText: { type: Type.STRING, description: "Description of the actual reward received." }
    },
    required: ["questId", "status"]
};

const itemSchema = {
    type: Type.OBJECT,
    properties: {
        name: { type: Type.STRING, description: "The name of the item." },
        description: { type: Type.STRING, description: "A brief, flavorful description." },
        type: { type: Type.STRING, enum: [ItemType.POTION, ItemType.WEAPON, ItemType.ARMOR, ItemType.KEY_ITEM, ItemType.MATERIAL], description: "Item type." },
        value: { type: Type.INTEGER, description: "Value/Potency." },
        stackLimit: { type: Type.INTEGER, description: "Max stack."},
        slot: { type: Type.STRING, enum: [EquipmentSlot.MAIN_HAND, EquipmentSlot.BODY], description: "Equip slot. REQUIRED for WEAPON/ARMOR."},
        traits: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Tags."}
    },
    required: ["name", "description", "type", "value", "stackLimit"]
};

const sceneSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "A vivid RPG description of the location. Max 60 words.",
        },
        localActions: {
            type: Type.ARRAY,
            description: "Exactly 2 unique local actions (not movement).",
            items: {
                type: Type.OBJECT,
                properties: {
                    label: { type: Type.STRING, description: "Button text." },
                    type: { type: Type.STRING, description: "'explore' or 'encounter'." },
                },
                required: ["label", "type"],
            },
        },
        foundItem: {
            ...itemSchema,
            description: "Optional item found (approx 25% chance)."
        }
    },
    required: ["description", "localActions"],
};

const socialChoiceSchema = {
    type: Type.OBJECT,
    properties: {
        label: { type: Type.STRING, description: "Choice button label." },
        outcome: { type: Type.STRING, description: "Story outcome text. Max 50 words." },
        flagUpdate: { type: Type.STRING, description: "Optional narrative flag." },
        reward: {
            type: Type.OBJECT,
            properties: {
                type: { type: Type.STRING, description: `Reward type: '${RewardType.XP}', '${RewardType.ITEM}', '${RewardType.QUEST}'.` },
                value: { type: Type.INTEGER, description: "XP amount." },
                item: { ...itemSchema, description: "Item details." },
                quest: { ...questSchema, description: "Quest details." }
            },
            required: ["type"]
        },
        questUpdate: { ...questUpdateSchema, description: "Optional quest update." }
    },
    required: ["label", "outcome"]
};

const exploreResultSchema = {
    type: Type.OBJECT,
    properties: {
        description: {
            type: Type.STRING,
            description: "Result description setting up next scene. Max 60 words."
        },
        nextSceneType: {
            type: Type.STRING,
            enum: ['EXPLORATION', 'SOCIAL', 'COMBAT'],
            description: "Next scene type."
        },
        localActions: {
            ...sceneSchema.properties.localActions,
            description: "Include if nextSceneType is 'EXPLORATION'."
        },
        foundItem: {
            ...itemSchema,
            description: "Optional item found."
        },
        socialChoices: {
            type: Type.ARRAY,
            description: "Choices if nextSceneType is 'SOCIAL'.",
            items: socialChoiceSchema
        },
        questUpdate: { ...questUpdateSchema, description: "Optional quest update." }
    },
    required: ["description", "nextSceneType"]
};

const mapLocationSchema = {
    type: Type.OBJECT,
    properties: {
        id: { type: Type.STRING, description: "Unique ID." },
        name: { type: Type.STRING, description: "Location name." },
        description: { type: Type.STRING, description: "Brief description. Max 25 words." },
        x: { type: Type.INTEGER, description: "X pos (5-95)." },
        y: { type: Type.INTEGER, description: "Y pos (5-95)." },
    },
    required: ["id", "name", "description", "x", "y"]
};

const connectionSchema = {
    type: Type.OBJECT,
    properties: {
        from: { type: Type.STRING, description: "Start ID." },
        to: { type: Type.STRING, description: "End ID." },
    },
    required: ["from", "to"]
};

const worldDataSchema = {
    type: Type.OBJECT,
    properties: {
        locations: {
            type: Type.ARRAY,
            description: "6-8 unique locations.",
            items: mapLocationSchema
        },
        connections: {
            type: Type.ARRAY,
            description: "Graph connections.",
            items: connectionSchema
        },
        startLocationId: {
            type: Type.STRING,
            description: "Start ID."
        }
    },
    required: ["locations", "connections", "startLocationId"]
};

// --- Optimizations & Error Handling ---

// Helper for Safe JSON Parsing with cleanup
const safeJsonParse = <T>(text: string | undefined, fallbackMessage: string): T => {
    try {
        if (!text) throw new Error("Text is undefined");
        let cleanedText = text.trim();
        
        // Remove markdown code blocks if present
        cleanedText = cleanedText.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
        
        // Find first { or [ and last } or ] to handle trailing text
        const firstBrace = cleanedText.indexOf('{');
        const firstBracket = cleanedText.indexOf('[');
        const start = (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) ? firstBrace : firstBracket;
        
        const lastBrace = cleanedText.lastIndexOf('}');
        const lastBracket = cleanedText.lastIndexOf(']');
        const end = (lastBrace !== -1 && (lastBracket === -1 || lastBrace > lastBracket)) ? lastBrace : lastBracket;

        if (start === -1 || end === -1) {
             throw new Error("Response is not JSON");
        }
        
        cleanedText = cleanedText.substring(start, end + 1);
        
        return JSON.parse(cleanedText) as T;
    } catch (error) {
        console.warn(`JSON Parse Error: ${fallbackMessage}`, error);
        throw error;
    }
};

// Retry wrapper for API calls
const callWithRetry = async <T>(
    fn: () => Promise<T>, 
    retries: number = 2, 
    delay: number = 1000
): Promise<T> => {
    try {
        return await fn();
    } catch (error: any) {
        if (retries > 0) {
            console.warn(`API call failed. Retrying in ${delay}ms...`, error);
            await new Promise(resolve => setTimeout(resolve, delay));
            return callWithRetry(fn, retries - 1, delay * 2);
        }
        throw error;
    }
};

// --- Helper for Prompt Construction ---
const getContextString = (player: Player) => {
    let context = `Player: Level ${player.level} ${player.className}. `;
    
    // Only show the 3 most relevant active quests to save tokens
    const activeQuests = player.journal.quests
        .filter(q => q.status === 'ACTIVE')
        .slice(-3)
        .map(q => `${q.title} (ID: ${q.id})`)
        .join(', ');
    
    if (activeQuests) {
         context += `Active Quests: ${activeQuests}. `;
    }
    
    // Inject the Narrative History chain - last 5 events for tight context
    if (player.journal.history && player.journal.history.length > 0) {
        const recentHistory = player.journal.history.slice(-5);
        context += `Recent History: ${recentHistory.join(' -> ')}. `;
    }

    // Limit to last 5 flags
    if (player.journal.flags.length > 0) {
        const recentFlags = player.journal.flags.slice(-5);
        context += `Flags: ${recentFlags.join(', ')}. `;
    }
    return context.trim();
};

export const generateExploreResult = async (player: Player, action: GameAction): Promise<{ description: string; nextSceneType: 'EXPLORATION' | 'SOCIAL' | 'COMBAT'; localActions?: GameAction[]; foundItem?: Omit<Item, 'quantity'>; socialChoices?: SocialChoice[]; questUpdate?: QuestUpdate; isFallback?: boolean; }> => {
    try {
        const context = getContextString(player);
        const prompt = `${context} Action: "${action.label}" (Type: ${action.type}). 
        Generate result. ${action.type === 'encounter' ? 'This action is high-risk and likely leads to COMBAT, but if the player just fought here, consider a different outcome.' : 'Favor EXPLORATION unless the action is explicitly risky.'} 
        If EXPLORATION, describe scene and provide exactly 2 local actions. If SOCIAL/COMBAT, lead-in text. Update quests if applicable.`;

        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: exploreResultSchema,
                temperature: 0.7,
            },
        }));

        const data = safeJsonParse<any>(response.text, "generateExploreResult");

        return {
            description: data.description,
            nextSceneType: data.nextSceneType,
            localActions: data.localActions,
            foundItem: data.foundItem,
            socialChoices: data.socialChoices,
            questUpdate: data.questUpdate,
        };

    } catch (error) {
        console.error("Explore Generation failed:", error);
        return {
            description: "You cautiously proceed but find nothing of interest.",
            nextSceneType: 'EXPLORATION',
            localActions: [{ label: "Scan the surroundings", type: "explore" }],
            isFallback: true,
        };
    }
};

export const generateImproviseResult = async (player: Player, input: string): Promise<{ description: string; nextSceneType: 'EXPLORATION' | 'SOCIAL' | 'COMBAT'; localActions?: GameAction[]; foundItem?: Omit<Item, 'quantity'>; socialChoices?: SocialChoice[]; questUpdate?: QuestUpdate; isFallback?: boolean; }> => {
    try {
        const context = getContextString(player);
        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: `${context} Player Input: "${input}". Resolve action. If skill check, assume fair roll. Transition to combat/social if appropriate. If EXPLORATION, provide exactly 2 local actions.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: exploreResultSchema,
                temperature: 0.85, 
            },
        }));

        const data = safeJsonParse<any>(response.text, "generateImproviseResult");

        return {
            description: data.description,
            nextSceneType: data.nextSceneType,
            localActions: data.localActions,
            foundItem: data.foundItem,
            socialChoices: data.socialChoices,
            questUpdate: data.questUpdate,
        };

    } catch (error) {
        console.error("Improvise Generation failed:", error);
        return {
            description: "You hesitate, unsure if that is possible here.",
            nextSceneType: 'EXPLORATION',
            localActions: [{ label: "Look around", type: "explore" }],
            isFallback: true,
        };
    }
};

export const generateScene = async (
    player: Player, 
    location: MapLocation, 
    recentCombat?: { enemies: Enemy[], result: 'VICTORY' | 'FLED' }
): Promise<{ description: string; actions: GameAction[]; foundItem?: Omit<Item, 'quantity'>; isFallback?: boolean; }> => {
    try {
        const context = getContextString(player);
        let prompt = `${context} Arrived at ${location.name}: "${location.description}".`;

        if (recentCombat) {
            const enemyNames = recentCombat.enemies.map(e => e.name).join(', ');
            const action = recentCombat.result === 'VICTORY' ? 'just defeated' : 'just escaped from';
            prompt += ` Context update: The player ${action} a ${enemyNames} while traveling here. Incorporate this aftermath into the location description (e.g. wiping blade, catching breath) but focusing on the new location.`;
        }

        prompt += ` Describe scene. Exactly 2 local actions.`;

        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: prompt,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: sceneSchema,
                temperature: 0.7,
            },
        }));

        const data = safeJsonParse<any>(response.text, "generateScene");
        
        return {
            description: data.description,
            actions: data.localActions || [],
            foundItem: data.foundItem
        };
    } catch (error) {
        console.error("Scene Generation failed:", error);
        return {
            description: `You have arrived at ${location.name}.`,
            actions: [
                { label: "Search the area", type: "explore" },
                { label: "Listen for danger", type: "encounter" },
            ],
            isFallback: true,
        };
    }
};

/**
 * Generates an encounter using deterministic math and a pre-defined Bestiary.
 * This completely avoids API calls for combat generation, making it fast and balanced.
 */
export const generateEncounter = async (player: Player): Promise<{ enemies: Enemy[]; isFallback?: boolean; }> => {
    try {
        // 1. Determine Challenge Rating based on player level
        const playerLevel = player.level;
        
        // 2. Filter Bestiary for valid enemies (minLevel <= playerLevel)
        // Add a small buffer so we can fight slightly lower level things for variety
        const validEnemies = BESTIARY.filter(e => e.minLevel <= playerLevel + 1);
        
        if (validEnemies.length === 0) {
            // Fallback if low level and somehow nothing matches (shouldn't happen with updated Bestiary)
             return {
                enemies: [{
                    name: "Rat",
                    description: "A small, angry rodent.",
                    hp: 10, maxHp: 10, attack: 2,
                    isShielded: false, statusEffects: [],
                    aiPersonality: AIPersonality.WILD,
                    element: Element.NONE
                }],
                isFallback: true
            };
        }

        // 3. Determine Number of Enemies (1-3)
        // Skew towards 1 enemy at very low levels
        let numEnemies = 1;
        const roll = Math.random();
        if (playerLevel > 2) {
             if (roll > 0.85) numEnemies = 3;
             else if (roll > 0.5) numEnemies = 2;
        }

        const encounterEnemies: Enemy[] = [];

        for (let i = 0; i < numEnemies; i++) {
            // Pick a random enemy from valid list
            // Weight slightly towards enemies close to player level? For now, pure random from valid set.
            const template = validEnemies[Math.floor(Math.random() * validEnemies.length)];
            
            // 4. Scale Stats
            // Formula: Base + (LevelDifference * Scale) + RandomVariance
            // We use Player Level for scaling to keep it relevant
            
            const levelDiff = Math.max(0, playerLevel - 1); // Levels past 1
            const variance = 0.9 + (Math.random() * 0.3); // 0.9 to 1.2 multiplier

            const hp = Math.floor((template.baseHp + (template.hpPerLevel * levelDiff)) * variance);
            const attack = Math.floor((template.baseAttack + (template.atkPerLevel * levelDiff)) * variance);
            
            // Add Loot (Simple logic for now)
            let loot: Omit<Item, 'quantity'> | undefined = undefined;
            if (Math.random() < 0.15) {
                loot = {
                    name: "Gold Coin",
                    description: "A shiny coin.",
                    type: ItemType.MATERIAL,
                    value: 10,
                    stackLimit: 99
                };
            }

            encounterEnemies.push({
                name: template.name,
                description: template.description,
                hp: hp,
                maxHp: hp,
                attack: attack,
                loot: loot,
                ability: template.ability,
                aiPersonality: template.aiPersonality,
                element: template.element,
                isShielded: false,
                statusEffects: []
            });
        }
        
        return { enemies: encounterEnemies, isFallback: false };

    } catch (error) {
        console.error("Encounter Generation failed:", error);
        // Fallback enemy
        const hp = player.level * 20;
        const attack = player.level * 4;
        return {
            enemies: [{
                name: "Glitch Ghost",
                description: "An entity born of errors.",
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
const getFallbackPortrait = (): string => {
    let bgColor = "#4B5563"; // gray-600
    let mainColor = "#9CA3AF"; // gray-400
    
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

export const generateCharacterPortrait = async (description: string, className: string): Promise<{ portrait: string; isFallback?: boolean; }> => {
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [
                    {
                        text: `16-bit pixel art portrait, RPG character. Class: ${className}. Description: ${description}. Head and shoulders.`,
                    },
                ],
            },
        }), 1); // Less retry for images to save time

        const parts = response.candidates?.[0]?.content?.parts;
        if (parts) {
            for (const part of parts) {
                if (part.inlineData) {
                    // Optimization: Save binary to AssetService and return UUID
                    const assetId = await assetService.saveBase64Asset(part.inlineData.data, part.inlineData.mimeType);
                    return { portrait: assetId };
                }
            }
        }
        throw new Error("No image data found in response.");

    } catch (error) {
        console.warn("Error generating character portrait, using fallback.", error);
        return { portrait: getFallbackPortrait(), isFallback: true };
    }
};

export const generateWorldData = async (): Promise<WorldData | null> => {
    try {
        // Step 1: Generate the world map image.
        const imageResponse = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: IMAGE_MODEL,
            contents: {
                parts: [
                    {
                        text: `Top-down 16-bit pixel art RPG world map. Forests, mountains, castle, coast. NO TEXT, NO LABELS.`,
                    },
                ],
            },
        }), 1);

        let imageBase64 = "";
        let imageMimeType = "";
        const imageParts = imageResponse.candidates?.[0]?.content?.parts;
        if (imageParts) {
            for (const part of imageParts) {
                if (part.inlineData) {
                    imageBase64 = part.inlineData.data;
                    imageMimeType = part.inlineData.mimeType;
                    break;
                }
            }
        }

        if (!imageBase64 || !imageMimeType) throw new Error("No image data found in response for world map.");

        // Step 2: Analyze the generated image to create coherent world data.
        const worldDataResponse = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: imageMimeType,
                            data: imageBase64,
                        },
                    },
                    {
                        text: `Analyze map. Create JSON. 6-8 locations (villages, forests, etc). Include 'Oakhaven' (id: 'oakhaven') as startLocationId. Ensure connected graph where each location has at least 2 connections.`,
                    },
                ],
            },
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: worldDataSchema,
                temperature: 0.6,
            },
        }));

        const worldJson = safeJsonParse<any>(worldDataResponse.text, "generateWorldData");
        
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
        
        // Optimization: Save the heavy map image to AssetStore
        const assetId = await assetService.saveBase64Asset(imageBase64, imageMimeType);

        return {
            image: assetId,
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
        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TTS_MODEL,
            contents: [{ parts: [{ text: `Epic fantasy narrator: ${text}` }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Zephyr' },
                    },
                },
            },
        }));
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Audio) {
            return { audio: base64Audio, isFallback: false };
        }
        throw new Error("No audio data found in response.");

    } catch (error) {
        return { audio: "", isFallback: true };
    }
};

export const generateCraftingResult = async (item1: Item, item2: Item): Promise<Item | null> => {
    try {
        const response = await callWithRetry<GenerateContentResponse>(() => getAi().models.generateContent({
            model: TEXT_MODEL,
            contents: `Combine "${item1.name}" (${item1.description}) and "${item2.name}" (${item2.description}) into a new RPG item. 
            If they don't make sense together, create a "Failed Experiment" or "Sludge".
            Return JSON matching the Item interface.`,
            config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: itemSchema,
                temperature: 0.7,
            },
        }));

        const data = safeJsonParse<Item>(response.text, "generateCraftingResult");
        if (data) {
            return {
                ...data,
                quantity: 1, 
                stackLimit: data.stackLimit || 1
            };
        }
        return null;
    } catch (error) {
        console.error("Crafting generation failed", error);
        return null;
    }
};

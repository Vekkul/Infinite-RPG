
import React, { useState } from 'react';
import { GameState, Enemy, SocialEncounter, EquipmentSlot, AppSettings, EventPopup } from './types';
import { Inventory } from './components/Inventory';
import { JournalView } from './components/JournalView';
import { StartScreen } from './components/views/StartScreen';
import { CharacterCreationScreen } from './components/views/CharacterCreationScreen';
import { LoadingScreen } from './components/views/LoadingScreen';
import { GameOverScreen } from './components/views/GameOverScreen';
import { ExploringView } from './components/views/ExploringView';
import { CombatView } from './components/views/CombatView';
import { SocialEncounterView } from './components/views/SocialEncounterView';
import { WorldMapView } from './components/views/WorldMapView';
import { LogView } from './components/views/LogView';
import { SettingsView } from './components/views/SettingsView';
import { BoltIcon, FireIcon, MapIcon, BagIcon, SpeakerOnIcon, SpeakerOffIcon, BookIcon, ShieldIcon, SaveIcon, StarIcon, SettingsIcon } from './components/icons';
import { useAudio } from './hooks/useAudio';
import { useAsset } from './hooks/useAsset';
import { useGameEngine } from './hooks/useGameEngine';
import { StatusEffectType } from './types';

const statusEffectIcons: Record<StatusEffectType, React.ReactNode> = {
    [StatusEffectType.BURN]: <FireIcon className="w-5 h-5 text-orange-400" />,
    [StatusEffectType.CHILL]: <span className="text-cyan-400 text-xl">❄️</span>,
    [StatusEffectType.SHOCK]: <BoltIcon className="w-5 h-5 text-yellow-400" />,
    [StatusEffectType.GROUNDED]: <span className="text-amber-700 text-xl">⛰️</span>,
    [StatusEffectType.EARTH_ARMOR]: <ShieldIcon className="w-5 h-5 text-green-500" />,
};

const PlayerStatusCard = React.memo(({ player }: { player: any }) => {
    const { assetUrl } = useAsset(player.portrait);
    
    // Determine which bars to show based on max stats
    const showMana = player.maxMp > 15; // Arbitrary threshold to hide bar if stat is base/low
    const showEnergy = player.maxEp > 15;
    const showStamina = player.maxSp > 15;

    return (
        <div className="bg-gray-800/90 p-2 md:p-3 rounded-lg border-2 border-blue-500 shadow-lg flex flex-row gap-4 items-center w-full max-w-6xl mx-auto">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-black rounded-md border-2 border-gray-600 shrink-0 overflow-hidden relative">
                {assetUrl ? (
                    <img src={assetUrl} alt="Player" className="w-full h-full object-cover rounded-sm image-rendering-pixelated" />
                ) : (
                    <div className="w-full h-full bg-gray-800 animate-pulse"></div>
                )}
            </div>
            <div className="flex flex-col flex-grow justify-between min-w-0 h-full">
                <div>
                    <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2 overflow-hidden">
                            <h2 className="text-lg md:text-2xl font-cinzel font-bold text-amber-100 truncate drop-shadow-md">{player.name}</h2>
                            <div className="flex items-center gap-1">
                                {player.statusEffects.map((effect: any, i: number) => (
                                    <div key={i} title={effect.type} className="animate-pulse">{statusEffectIcons[effect.type as StatusEffectType]}</div>
                                ))}
                            </div>
                        </div>
                        <span className="text-xs md:text-sm text-gray-400 shrink-0 ml-2 font-bold tracking-wide">Lvl {player.level} {player.className}</span>
                    </div>
                    <div className="flex justify-between text-xs md:text-sm mb-1 text-gray-300">
                        <span className="font-cinzel text-amber-500/80 tracking-wide font-bold">ATK: <span className="text-red-300 text-base">{player.attack}</span></span>
                        <span className="font-cinzel text-amber-500/80 tracking-wide font-bold">DEF: <span className="text-blue-300 text-base">{player.defense}</span></span>
                    </div>
                </div>

                <div className="flex flex-col gap-1 w-full mt-1">
                    <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                        <div className="bg-red-500 h-full transition-all duration-500" style={{ width: `${(player.hp / player.maxHp) * 100}%` }}></div>
                        <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md tracking-wider">
                            {player.hp}/{player.maxHp} HP
                        </div>
                    </div>
                    {showMana && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-blue-500 h-full transition-all duration-500" style={{ width: `${(player.mp! / player.maxMp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md tracking-wider">
                                {player.mp}/{player.maxMp} MP
                            </div>
                        </div>
                    )}
                    {showEnergy && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-green-500 h-full transition-all duration-500" style={{ width: `${(player.ep! / player.maxEp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md tracking-wider">
                                {player.ep}/{player.maxEp} EP
                            </div>
                        </div>
                    )}
                     {showStamina && (
                         <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                            <div className="bg-amber-600 h-full transition-all duration-500" style={{ width: `${(player.sp! / player.maxSp!) * 100}%` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md tracking-wider">
                                {player.sp}/{player.maxSp} SP
                            </div>
                        </div>
                    )}
                     <div className="w-full bg-black/50 rounded-full h-3 md:h-4 border border-gray-600 relative overflow-hidden">
                        <div className="bg-yellow-500 h-full transition-all duration-500" style={{ width: `${(player.xp / player.xpToNextLevel) * 100}%` }}></div>
                         <div className="absolute inset-0 flex items-center justify-center text-[8px] md:text-[10px] text-white font-bold drop-shadow-md tracking-wider">
                            {player.xp}/{player.xpToNextLevel} XP
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

const App: React.FC = () => {
    // Game Engine Hook - Contains all business logic
    const { state, computed, ui, handlers } = useGameEngine();
    const { gameState, player, enemies, storyText, log, isPlayerTurn, socialEncounter, worldData, playerLocationId } = state;
    const { currentSceneActions } = computed;
    const { saveFileExists, showLevelUp, eventPopups, isSaving } = ui;

    // UI Local State
    const [isInventoryOpen, setIsInventoryOpen] = useState(false);
    const [isMapOpen, setIsMapOpen] = useState(false);
    const [isLogOpen, setIsLogOpen] = useState(false);
    const [isJournalOpen, setIsJournalOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [settings, setSettings] = useState<AppSettings>({ crtEnabled: false, textSpeed: 30 });

    // Audio Hook
    const { isTtsEnabled, isSpeaking, toggleTts } = useAudio(storyText, gameState);

    const handleInventoryUse = (item: any, index: number) => {
        handlers.handleUseItem(item, index);
        if (gameState === GameState.COMBAT) {
            setIsInventoryOpen(false);
        }
    };

    const handleInventoryEquip = (item: any, index: number) => {
        handlers.handleEquipItem(item, index);
        if (gameState === GameState.COMBAT) {
            setIsInventoryOpen(false);
        }
    };

    const handleInventoryUnequip = (slot: EquipmentSlot) => {
        handlers.handleUnequipItem(slot);
        if (gameState === GameState.COMBAT) {
            setIsInventoryOpen(false);
        }
    };
    
    const renderGameContent = () => {
        switch (gameState) {
            case GameState.START_SCREEN:
                return <StartScreen onStart={handlers.startNewGame} onLoad={handlers.loadGame} saveFileExists={saveFileExists} />;
            case GameState.CHARACTER_CREATION:
                return <CharacterCreationScreen onCreate={handlers.handleCharacterCreation} />;
            case GameState.LOADING:
                return <LoadingScreen />;
            case GameState.GAME_OVER:
                return <GameOverScreen onRestart={handlers.startNewGame} />;
            case GameState.EXPLORING:
                return <ExploringView storyText={storyText} actions={currentSceneActions} onAction={handlers.handleAction} onImprovise={handlers.handleImprovise} />;
            case GameState.COMBAT:
                return <CombatView 
                    storyText={storyText} 
                    enemies={enemies} 
                    player={player}
                    isPlayerTurn={isPlayerTurn} 
                    onCombatAction={handlers.handleCombatAction}
                />;
            case GameState.SOCIAL_ENCOUNTER:
                return socialEncounter && <SocialEncounterView encounter={socialEncounter} onChoice={handlers.handleSocialChoice} onImprovise={handlers.handleImprovise} />;
            default:
                return null;
        }
    };

    const isScreenState = gameState === GameState.START_SCREEN || gameState === GameState.LOADING || gameState === GameState.GAME_OVER || gameState === GameState.CHARACTER_CREATION;

    const ActionButtons = React.memo(() => (
        <div className="flex items-center gap-2 w-full max-w-4xl mx-auto overflow-x-auto whitespace-nowrap pb-1 no-scrollbar">
            {(gameState === GameState.EXPLORING || gameState === GameState.COMBAT) && (
                <button 
                    onClick={() => setIsInventoryOpen(true)} 
                    className="flex-shrink-0 flex items-center justify-center bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white p-3 rounded-lg border-2 border-purple-500 active:scale-95 transition-all w-14 h-14"
                    disabled={!isPlayerTurn && gameState === GameState.COMBAT}
                >
                    <BagIcon className="w-6 h-6" />
                </button>
            )}
            <button 
                onClick={() => setIsJournalOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-amber-700 hover:bg-amber-600 text-white p-3 rounded-lg border-2 border-amber-500 active:scale-95 transition-all w-14 h-14"
            >
                <StarIcon className="w-6 h-6"/>
            </button>
            <button 
                onClick={() => setIsLogOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-yellow-700 hover:bg-yellow-600 text-white p-3 rounded-lg border-2 border-yellow-500 active:scale-95 transition-all w-14 h-14"
            >
                <BookIcon className="w-6 h-6"/>
            </button>
            {gameState === GameState.EXPLORING && (
                <>
                    <button 
                        onClick={() => setIsMapOpen(true)} 
                        className="flex-shrink-0 flex items-center justify-center bg-teal-700 hover:bg-teal-600 text-white p-3 rounded-lg border-2 border-teal-500 active:scale-95 transition-all w-14 h-14"
                    >
                        <MapIcon className="w-6 h-6"/>
                    </button>
                    <button 
                        onClick={handlers.saveGame} 
                        disabled={isSaving}
                        className={`flex-shrink-0 flex items-center justify-center p-3 rounded-lg border-2 active:scale-95 transition-all w-14 h-14 ${isSaving ? 'bg-green-600 border-green-400 opacity-80 cursor-not-allowed' : 'bg-indigo-700 hover:bg-indigo-600 border-indigo-500 text-white'}`}
                    >
                        {isSaving ? <span className="text-xs font-bold animate-pulse">...</span> : <SaveIcon className="w-6 h-6" />}
                    </button>
                </>
            )}
             <button 
                onClick={() => setIsSettingsOpen(true)}
                className="flex-shrink-0 flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white p-3 rounded-lg border-2 border-gray-500 active:scale-95 transition-all w-14 h-14"
            >
                <SettingsIcon className="w-6 h-6"/>
            </button>
        </div>
    ));

    return (
        <main className="w-full bg-gray-900 text-gray-200 flex flex-col overflow-x-hidden min-h-[100dvh] min-h-[560px]" style={{
            backgroundImage: `radial-gradient(circle, rgba(31, 41, 55, 0.9) 0%, rgba(17, 24, 39, 1) 70%)`,
        }}>
            {settings.crtEnabled && <div className="crt-effect" />}
            
            <Inventory 
                isOpen={isInventoryOpen}
                onClose={() => setIsInventoryOpen(false)}
                inventory={player.inventory}
                player={player}
                onUseItem={handleInventoryUse}
                onEquipItem={handleInventoryEquip}
                onUnequipItem={handleInventoryUnequip}
                onCraftItem={handlers.handleCraftItem}
                disabled={!isPlayerTurn && gameState === GameState.COMBAT}
            />
            <JournalView isOpen={isJournalOpen} onClose={() => setIsJournalOpen(false)} player={player} />
            <WorldMapView isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} worldData={worldData} playerLocationId={playerLocationId} />
            <LogView isOpen={isLogOpen} onClose={() => setIsLogOpen(false)} log={log} />
            <SettingsView isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} onUpdateSettings={s => setSettings(prev => ({ ...prev, ...s }))} />

            {/* Level Up Overlay */}
            {showLevelUp && (
                <div className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center pointer-events-none fixed">
                    <h1 className="text-6xl md:text-8xl font-cinzel font-bold text-yellow-300 animate-level-up" style={{textShadow: '4px 4px 0 #000'}}>
                        LEVEL UP!
                    </h1>
                </div>
            )}
             
            {/* Popups */}
            <div className="event-popup-container fixed">
                {eventPopups.map(p => (
                    <div key={p.id} className={`event-popup ${p.type}`}>{p.text}</div>
                ))}
            </div>

            {/* Top Status Bar (All Screens) */}
            {!isScreenState && (
                <div className="p-2 bg-gray-900 border-b border-gray-700 z-10 shrink-0">
                    <PlayerStatusCard player={player} />
                </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col relative min-w-0 min-h-0">
                 <div className="flex-1 p-4 md:p-8 relative min-h-0 overflow-hidden flex flex-col">
                    <div className="max-w-4xl mx-auto w-full h-full flex flex-col">
                        {renderGameContent()}
                    </div>
                    
                    {!isScreenState && (
                        <button
                            onClick={toggleTts}
                            className={`absolute top-2 right-2 md:top-4 md:right-4 text-gray-400 hover:text-white transition-colors z-20 ${isSpeaking ? 'animate-pulse' : ''}`}
                        >
                            {isTtsEnabled ? <SpeakerOnIcon className="w-6 h-6 md:w-8 md:h-8 text-green-400" /> : <SpeakerOffIcon className="w-6 h-6 md:w-8 md:h-8" />}
                        </button>
                    )}
                 </div>

                 {/* Bottom Actions (All Screens) */}
                 {!isScreenState && (
                    <div className="p-2 bg-gray-900 border-t border-gray-700 z-10 shrink-0 pb-[env(safe-area-inset-bottom)]">
                        {gameState === GameState.COMBAT && !isPlayerTurn && (
                            <div className="text-center text-yellow-400 font-cinzel font-bold animate-pulse mb-2 text-sm tracking-wider">Enemy Turn...</div>
                        )}
                        <ActionButtons />
                    </div>
                 )}
            </div>
        </main>
    );
};

export default App;
    
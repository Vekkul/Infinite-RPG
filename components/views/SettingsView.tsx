
import React, { useState } from 'react';
import { AppSettings } from '../../types';

interface SettingsViewProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ isOpen, onClose, settings, onUpdateSettings }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in backdrop-blur-sm"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg border-4 border-gray-600 shadow-2xl w-full max-w-lg flex flex-col p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-600 pb-2">
            <h2 className="text-3xl font-cinzel font-bold text-gray-300">Settings</h2>
            <button onClick={onClose} className="text-3xl font-bold text-gray-400 hover:text-white">&times;</button>
        </div>

        <div className="space-y-8 flex-grow">
            {/* CRT Toggle */}
            <div className="flex justify-between items-center">
                <div>
                    <label className="text-xl font-bold text-white block font-cinzel">Retro Display</label>
                    <p className="text-sm text-gray-400 font-serif italic">Enable CRT scanlines & vignette</p>
                </div>
                <button 
                    onClick={() => onUpdateSettings({ crtEnabled: !settings.crtEnabled })}
                    className={`w-16 h-8 rounded-full p-1 transition-colors ${settings.crtEnabled ? 'bg-green-600' : 'bg-gray-600'}`}
                >
                    <div className={`w-6 h-6 rounded-full bg-white transition-transform ${settings.crtEnabled ? 'translate-x-8' : 'translate-x-0'}`}></div>
                </button>
            </div>

            {/* Text Speed */}
            <div>
                <label className="text-xl font-bold text-white block mb-2 font-cinzel">Text Speed</label>
                <div className="grid grid-cols-4 gap-2">
                    {[
                        { label: 'Slow', val: 50 },
                        { label: 'Normal', val: 30 },
                        { label: 'Fast', val: 10 },
                        { label: 'Instant', val: 0 }
                    ].map((opt) => (
                        <button
                            key={opt.label}
                            onClick={() => onUpdateSettings({ textSpeed: opt.val })}
                            className={`py-2 px-1 rounded border-2 text-sm font-bold transition-all ${
                                settings.textSpeed === opt.val 
                                ? 'bg-blue-600 border-blue-400 text-white transform scale-105' 
                                : 'bg-gray-700 border-gray-500 text-gray-300 hover:bg-gray-600'
                            }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>

        <div className="mt-8 pt-4 border-t border-gray-600">
            <button 
                onClick={onClose} 
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-white font-bold rounded-lg border-2 border-gray-500 font-cinzel"
            >
                Close
            </button>
        </div>
      </div>
    </div>
  );
};
    
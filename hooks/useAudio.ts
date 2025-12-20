
import { useState, useRef, useCallback, useEffect } from 'react';
import { generateSpeech } from '../services/geminiService';
import { GameState } from '../types';

function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

// Singleton for AudioContext to avoid "Too many AudioContexts" warning
let globalAudioContext: AudioContext | null = null;
const getAudioContext = () => {
    if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return globalAudioContext;
};

export const useAudio = (storyText: string, gameState: GameState) => {
    const [isTtsEnabled, setIsTtsEnabled] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const currentSpeechSourceRef = useRef<AudioBufferSourceNode | null>(null);
    const spokenTextRef = useRef<string>('');

    const playSpeech = useCallback(async (text: string) => {
        if (!text) return;
        const ctx = getAudioContext();

        // Stop any previous speech
        if (currentSpeechSourceRef.current) {
            currentSpeechSourceRef.current.stop();
            currentSpeechSourceRef.current = null;
        }

        setIsSpeaking(true);
        spokenTextRef.current = text;

        const { audio, isFallback } = await generateSpeech(text);
        
        // Stale check: If the spoken text ref has changed while we were awaiting, discard this result.
        if (spokenTextRef.current !== text) {
             return;
        }

        if (isFallback || !audio) {
            setIsSpeaking(false);
            return;
        }

        try {
            // Check if context is suspended (browser policy)
             if (ctx.state === 'suspended') {
                await ctx.resume();
            }
            
            const audioBuffer = await decodeAudioData(
                decode(audio),
                ctx,
                24000,
                1,
            );
            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(ctx.destination);
            source.start();

            currentSpeechSourceRef.current = source;
            source.onended = () => {
                if (currentSpeechSourceRef.current === source) {
                    currentSpeechSourceRef.current = null;
                }
                setIsSpeaking(false);
            };
        } catch (error) {
            console.error("Error playing audio:", error);
            setIsSpeaking(false);
        }
    }, []);

    const toggleTts = useCallback(() => {
        setIsTtsEnabled(prev => {
            const willBeEnabled = !prev;
            if (willBeEnabled) {
                // Initialize context on user interaction if needed
                getAudioContext();
                spokenTextRef.current = ''; // Reset to trigger current text
            } else {
                if (currentSpeechSourceRef.current) {
                    currentSpeechSourceRef.current.stop();
                    currentSpeechSourceRef.current = null;
                }
                setIsSpeaking(false);
            }
            return willBeEnabled;
        });
    }, []);

    useEffect(() => {
        const canPlaySpeech = isTtsEnabled && storyText &&
            gameState !== GameState.LOADING &&
            gameState !== GameState.START_SCREEN &&
            gameState !== GameState.CHARACTER_CREATION;

        if (canPlaySpeech) {
            if (storyText !== spokenTextRef.current) {
                playSpeech(storyText);
            }
        } else {
            // If we navigate away or disable logic, stop speech
            if (currentSpeechSourceRef.current && !isTtsEnabled) {
                currentSpeechSourceRef.current.stop();
                currentSpeechSourceRef.current = null;
                 if (isSpeaking) setIsSpeaking(false);
            }
        }
    }, [storyText, isTtsEnabled, gameState, playSpeech, isSpeaking]);

    // Cleanup
    useEffect(() => {
        return () => {
             if (currentSpeechSourceRef.current) {
                currentSpeechSourceRef.current.stop();
            }
        }
    }, []);

    return { isTtsEnabled, isSpeaking, toggleTts };
};

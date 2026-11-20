import React from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { VoiceState } from '../types';

interface MicControlProps {
  state: VoiceState;
  onToggle: () => void;
  disabled?: boolean;
}

export const MicControl: React.FC<MicControlProps> = ({ state, onToggle, disabled = false }) => {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing';
  const isSpeaking = state === 'speaking';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={onToggle}
        disabled={disabled || isProcessing}
        className={`relative p-4 rounded-full transition-all duration-300 flex items-center justify-center ${
          isListening
            ? 'bg-cyan-500 text-black shadow-[0_0_35px_rgba(6,182,212,0.85)] scale-110 active:scale-95'
            : isProcessing
            ? 'bg-amber-500 text-black shadow-[0_0_35px_rgba(245,158,11,0.7)] cursor-wait opacity-90'
            : isSpeaking
            ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_35px_rgba(168,85,247,0.75)] hover:scale-105 active:scale-95'
            : 'bg-indigo-600/90 hover:bg-indigo-600 text-white shadow-[0_0_25px_rgba(99,102,241,0.4)] hover:scale-105 active:scale-95'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        aria-label={
          isListening
            ? 'Listening - Tap to finish speaking'
            : isProcessing
            ? 'AI Processing - please wait'
            : isSpeaking
            ? 'Speaking - Tap to stop speech playback'
            : 'Start microphone'
        }
      >
        {/* Pulsing acoustic ring when listening */}
        {isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75 pointer-events-none" />
        )}

        {/* Pulsing glow ring when speaking */}
        {isSpeaking && (
          <span className="absolute inset-0 rounded-full border-2 border-purple-400 animate-pulse opacity-60 pointer-events-none" />
        )}

        {/* State icons */}
        {isListening ? (
          <Square className="w-5 h-5 fill-current" />
        ) : isProcessing ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : isSpeaking ? (
          <Square className="w-5 h-5 fill-current" />
        ) : (
          <Mic className="w-5 h-5" />
        )}
      </button>

      {/* Clear status hint with Spacebar keyboard shortcut */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400 select-none">
        {isListening ? (
          <span className="text-cyan-400 font-medium">Tap to finish</span>
        ) : isProcessing ? (
          <span className="text-amber-400 font-medium">Thinking...</span>
        ) : isSpeaking ? (
          <span className="text-purple-300 font-medium">Tap to stop audio</span>
        ) : (
          <>
            <span>Press</span>
            <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-300 shadow-sm">
              Space
            </kbd>
            <span>to speak</span>
          </>
        )}
      </div>
    </div>
  );
};

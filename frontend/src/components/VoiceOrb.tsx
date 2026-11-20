import React from 'react';
import { VoiceState } from '../types';

interface VoiceOrbProps {
  state: VoiceState;
  audioLevel?: number; // 0.0 to 1.0
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  audioLevel = 0,
  onClick,
  size = 'lg',
}) => {
  const sizeClasses = {
    sm: 'w-24 h-24',
    md: 'w-44 h-44',
    lg: 'w-64 h-64 sm:w-72 sm:h-72',
  }[size];

  // Dynamic configuration mapping for voice states
  const config = {
    idle: {
      gradient: 'from-indigo-600 via-indigo-500/80 to-purple-800',
      ringColor: 'border-indigo-500/30',
      outerGlow: 'shadow-[0_0_80px_rgba(99,102,241,0.35)]',
      pulseSpeed: 'duration-[3500ms]',
      label: 'Tap to speak',
      sublabel: 'Aura is standing by',
    },
    listening: {
      gradient: 'from-cyan-400 via-teal-500 to-indigo-600',
      ringColor: 'border-cyan-400/50',
      outerGlow: 'shadow-[0_0_100px_rgba(6,182,212,0.65)]',
      pulseSpeed: 'duration-1000',
      label: 'Listening...',
      sublabel: 'Speak your thoughts or tap to finish',
    },
    processing: {
      gradient: 'from-amber-400 via-violet-600 to-fuchsia-700',
      ringColor: 'border-amber-400/40',
      outerGlow: 'shadow-[0_0_110px_rgba(245,158,11,0.55)]',
      pulseSpeed: 'duration-700',
      label: 'Processing...',
      sublabel: 'Synthesizing with Gemini AI',
    },
    speaking: {
      gradient: 'from-purple-400 via-indigo-600 to-pink-500',
      ringColor: 'border-purple-400/60',
      outerGlow: 'shadow-[0_0_110px_rgba(168,85,247,0.65)]',
      pulseSpeed: 'duration-1000',
      label: 'Speaking...',
      sublabel: 'Tap orb to stop audio',
    },
  }[state];

  // Live scale multiplier responding to user's real audio volume when listening
  const dynamicScale = state === 'listening' ? 1 + audioLevel * 0.25 : 1;
  const rippleScale = state === 'listening' ? 1 + audioLevel * 0.5 : 1;

  return (
    <div className="flex flex-col items-center justify-center select-none py-6">
      <div
        onClick={onClick}
        className={`relative ${sizeClasses} cursor-pointer group flex items-center justify-center transition-transform duration-200`}
        style={{ transform: `scale(${dynamicScale})` }}
        role="button"
        tabIndex={0}
        aria-label={`Voice assistant orb - ${config.label}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
      >
        {/* Outermost ambient glow aura */}
        <div
          className={`absolute inset-0 rounded-full bg-gradient-to-tr ${config.gradient} opacity-40 blur-2xl transition-all duration-700 ${config.outerGlow}`}
        />

        {/* Outer orbital acoustic ripple ring */}
        <div
          className={`absolute -inset-4 sm:-inset-6 rounded-full border ${config.ringColor} transition-transform duration-300 ${
            state === 'listening'
              ? 'animate-ping opacity-40'
              : state === 'speaking'
              ? 'animate-pulse opacity-30'
              : 'scale-100 opacity-20'
          }`}
          style={{ transform: `scale(${rippleScale})` }}
        />

        {/* Intermediate spinning harmonic ring */}
        <div
          className={`absolute -inset-2 sm:-inset-3 rounded-full border border-dashed ${config.ringColor} ${
            state === 'processing'
              ? 'animate-spin'
              : state === 'listening'
              ? 'animate-spin-slow'
              : 'opacity-30'
          }`}
          style={{ animationDuration: state === 'processing' ? '4s' : '16s' }}
        />

        {/* Main glowing orb body */}
        <div
          className={`relative w-4/5 h-4/5 rounded-full bg-gradient-to-br ${config.gradient} shadow-2xl flex items-center justify-center overflow-hidden transition-all duration-300 transform group-hover:scale-105 active:scale-95`}
        >
          {/* Internal specular reflection highlight */}
          <div className="absolute top-2 left-4 w-1/3 h-1/4 rounded-full bg-white/30 blur-[2px] transform -rotate-12 pointer-events-none" />

          {/* Harmonic core particles */}
          <div className="relative w-1/2 h-1/2 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center animate-pulse">
            <div className="w-1/2 h-1/2 rounded-full bg-white/80 shadow-[0_0_15px_white]" />
          </div>

          {/* Fluid wave distortion overlay when speaking or listening */}
          {(state === 'listening' || state === 'speaking') && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-white/20 mix-blend-overlay animate-pulse" />
          )}
        </div>
      </div>

      {/* Status label under the orb */}
      <div className="mt-4 text-center">
        <p className="text-sm font-semibold tracking-wide text-slate-100 transition-colors">
          {config.label}
        </p>
        <p className="text-xs text-slate-400 mt-0.5 tracking-normal">
          {config.sublabel}
        </p>
      </div>
    </div>
  );
};

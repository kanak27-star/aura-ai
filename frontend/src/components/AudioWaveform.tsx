import React from 'react';
import { Activity, Radio } from 'lucide-react';
import { VoiceState } from '../types';

interface AudioWaveformProps {
  state: VoiceState;
  audioLevel?: number; // 0.0 to 1.0 (from WebAudioMeter)
  isActualMetering?: boolean; // True if real microphone metering is active
  barCount?: number;
  showBadge?: boolean;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  state,
  audioLevel = 0,
  isActualMetering = false,
  barCount = 18,
  showBadge = true,
}) => {
  const isListening = state === 'listening';
  const isSpeaking = state === 'speaking';
  const isProcessing = state === 'processing';
  const isActive = isListening || isSpeaking || isProcessing;

  return (
    <div className="flex flex-col items-center gap-1.5 py-1">
      {/* Bars container */}
      <div className="flex items-center justify-center gap-1 h-9 px-3" aria-hidden="true">
        {Array.from({ length: barCount }).map((_, i) => {
          // Dynamic styling based on whether real metering is active
          let heightPct = 10;

          if (isListening && isActualMetering) {
            // Harmonic bell curve centered in the middle of the spectrum
            const centerDist = Math.abs(i - barCount / 2) / (barCount / 2);
            const factor = Math.max(0.15, 1 - centerDist * 0.7);
            // Height responds directly to user microphone volume
            heightPct = Math.min(100, Math.max(12, audioLevel * 100 * factor + (i % 2 === 0 ? 8 : 4)));
          } else if (isActive) {
            // Rhythmic fallback wave
            heightPct = isListening || isSpeaking ? 30 + ((i * 13) % 65) : 20;
          }

          const colorClass = isListening
            ? isActualMetering
              ? 'bg-cyan-400'
              : 'bg-emerald-400'
            : isSpeaking
            ? 'bg-indigo-400'
            : isProcessing
            ? 'bg-amber-400'
            : 'bg-slate-700/60';

          const delay = (i % 6) * 0.12;

          return (
            <span
              key={i}
              className={`w-1 rounded-full transition-all duration-150 ${colorClass}`}
              style={{
                height: `${heightPct}%`,
                animation:
                  !isActualMetering && isActive
                    ? `wave-bounce 0.8s ease-in-out infinite ${delay}s`
                    : 'none',
                minHeight: '4px',
              }}
            />
          );
        })}
      </div>

      {/* Honest metering state badge */}
      {showBadge && isActive && (
        <div className="flex items-center gap-1 text-[10px] tracking-wide font-medium">
          {isListening ? (
            isActualMetering ? (
              <span className="flex items-center gap-1 text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Mic Meter ({Math.round(audioLevel * 100)}%)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-amber-300 bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-500/20">
                <Radio className="w-3 h-3 text-amber-400" />
                Simulated Wave (Metering Unavailable)
              </span>
            )
          ) : isSpeaking ? (
            <span className="flex items-center gap-1 text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-full border border-indigo-500/30">
              <Activity className="w-3 h-3 text-indigo-400 animate-pulse" />
              Speech Synthesis Active
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              AI Thinking & Synthesizing
            </span>
          )}
        </div>
      )}
    </div>
  );
};

import React from 'react';
import {
  Cpu,
  KeyRound,
  RotateCcw,
  Sliders,
  Sparkles,
  Volume2,
} from 'lucide-react';

import { AssistantSettings, HealthStatus } from '../types';

interface SettingsViewProps {
  settings: AssistantSettings;
  health: HealthStatus | null;
  onUpdateSettings: (newSettings: Partial<AssistantSettings>) => void;
  onClearAllData: () => Promise<void>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  health,
  onUpdateSettings,
  onClearAllData,
}) => {
  const avatars = ['✦', '⚡', '🪐', '◈', '✨', '🌊'];

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Title */}
      <div className="pb-4 border-b border-white/5">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Sliders className="w-5 h-5 text-indigo-400" />
          <span>Assistant Settings & Preferences</span>
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Customize Aura&apos;s voice synthesis, personality, and intelligence connection.
        </p>
      </div>

      {/* Assistant Persona Card */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Persona & Identity</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Assistant Name</label>
            <input
              type="text"
              value={settings.name}
              onChange={(e) => onUpdateSettings({ name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Avatar Glyph</label>
            <div className="flex items-center gap-2">
              {avatars.map((av) => (
                <button
                  key={av}
                  type="button"
                  onClick={() => onUpdateSettings({ avatar: av })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm transition-all ${
                    settings.avatar === av
                      ? 'bg-indigo-600 text-white border border-indigo-400 shadow-md shadow-indigo-900/40'
                      : 'bg-slate-800 border border-white/5 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {av}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-300 mb-1.5">Tone & Role Instructions</label>
          <textarea
            rows={3}
            value={settings.instructions}
            onChange={(e) => onUpdateSettings({ instructions: e.target.value })}
            placeholder="e.g. You are my executive voice assistant. Keep verbal responses ultra-concise."
            className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
          />
        </div>
      </div>

      {/* Voice & Audio Customization */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-purple-400" />
          <span>Speech Synthesis Controls</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span>Speech Speed</span>
              <span className="font-mono text-purple-300">{settings.speechRate}x</span>
            </div>
            <input
              type="range"
              min="0.75"
              max="1.5"
              step="0.05"
              value={settings.speechRate}
              onChange={(e) => onUpdateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-xs text-slate-300 mb-1.5">
              <span>Voice Pitch</span>
              <span className="font-mono text-purple-300">{settings.speechPitch}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.3"
              step="0.05"
              value={settings.speechPitch}
              onChange={(e) => onUpdateSettings({ speechPitch: parseFloat(e.target.value) })}
              className="w-full accent-purple-500 cursor-pointer"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-200">Auto-Read Assistant Responses</p>
            <p className="text-[11px] text-slate-400">Read spoken replies automatically via text-to-speech</p>
          </div>
          <button
            type="button"
            onClick={() => onUpdateSettings({ autoSpeak: !settings.autoSpeak })}
            className={`w-11 h-6 rounded-full transition-colors relative ${
              settings.autoSpeak ? 'bg-indigo-600' : 'bg-slate-800'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.autoSpeak ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Intelligence Engine & Backend Status */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-white/10 space-y-4">
        <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
          <Cpu className="w-4 h-4 text-emerald-400" />
          <span>Intelligence Engine</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5">
            <span className="text-[11px] text-slate-400 block mb-1">Backend Connection</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span>{health?.status === 'healthy' ? 'Online' : 'Unavailable'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5">
            <span className="text-[11px] text-slate-400 block mb-1">Model Provider</span>
            <span className="text-xs font-semibold text-slate-200">
              {health?.is_mock ? 'Offline Heuristic Core' : health?.model || 'Gemini 2.5 Flash'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-800/60 border border-white/5">
            <span className="text-[11px] text-slate-400 block mb-1">Database Engine</span>
            <span className="text-xs font-semibold text-slate-200">
              {health?.database || 'SQLite'}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-xs text-indigo-200/90 leading-relaxed flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-indigo-200">Configuring Gemini API Key</p>
            <p className="mt-0.5 text-indigo-300/80">
              To connect real Google Gemini inference, set <code className="text-indigo-200 bg-indigo-900/60 px-1 py-0.5 rounded">GEMINI_API_KEY=...</code> in your <code className="text-indigo-200 bg-indigo-900/60 px-1 py-0.5 rounded">backend/.env</code> file. When empty, Aura runs flawlessly in smart offline mock mode.
            </p>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="p-6 rounded-2xl bg-rose-950/20 border border-rose-500/20 space-y-3">
        <h3 className="text-sm font-semibold text-rose-300 flex items-center gap-2">
          <RotateCcw className="w-4 h-4 text-rose-400" />
          <span>Reset Session Data</span>
        </h3>
        <p className="text-xs text-slate-400">
          Clear conversation turns, board tasks, and voice notes.
        </p>
        <button
          onClick={onClearAllData}
          className="px-4 py-2 bg-rose-600/80 hover:bg-rose-600 text-white rounded-xl text-xs font-medium transition-colors"
        >
          Clear All History & Data
        </button>
      </div>
    </div>
  );
};

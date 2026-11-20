import React from 'react';
import {
  ExternalLink,
  Menu,
  Sparkles,
} from 'lucide-react';
import { HealthStatus, ViewMode } from '../types';

interface HeaderProps {
  currentView: ViewMode;
  onOpenMobileSidebar: () => void;
  onOpenDictate: () => void;
  health: HealthStatus | null;
  speechSupported: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onOpenMobileSidebar,
  onOpenDictate,
  health,
  speechSupported,
}) => {

  const titles: Record<ViewMode, string> = {
    dashboard: 'Executive Overview',
    chat: 'Voice Assistant Dialogue',
    tasks: 'Actionable Tasks',
    notes: 'Notes & Dictations',
    settings: 'Assistant Preferences',
  };

  return (
    <header className="h-16 px-4 border-b border-white/5 bg-slate-950/40 backdrop-blur-md flex items-center justify-between z-30">
      {/* Left: Mobile hamburger & title */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="p-2 text-slate-400 hover:text-slate-200 lg:hidden"
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div>
          <h2 className="text-sm font-semibold text-white tracking-tight">
            {titles[currentView]}
          </h2>
          <p className="text-[11px] text-slate-400 hidden sm:block">
            Aura AI Voice Assistant
          </p>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5">
        {/* Say Your Day Button */}
        <button
          onClick={onOpenDictate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 hover:from-cyan-500/30 hover:to-indigo-500/30 border border-cyan-500/30 text-cyan-300 text-xs font-medium transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Say Your Day</span>
        </button>

        {/* Speech support status indicator */}
        <div
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900 border border-white/5 text-[11px] text-slate-400"
          title={`${speechSupported ? 'Native Web Speech API active' : 'Text mode active'}. AI Core: ${health?.model || 'Connecting...'}`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              speechSupported ? 'bg-cyan-400' : 'bg-amber-400'
            }`}
          />
          <span>{speechSupported ? 'Voice Ready' : 'Text Mode'}</span>
        </div>


        {/* GitHub link */}
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-900/60 transition-colors"
          title="Portfolio Repository"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </header>
  );
};

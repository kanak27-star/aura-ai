import React from 'react';
import {
  CheckSquare,
  FileText,
  LayoutDashboard,
  Mic,
  Settings,
} from 'lucide-react';

import { AssistantSettings, HealthStatus, ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  health: HealthStatus | null;
  settings: AssistantSettings;
  pendingTaskCount: number;
  noteCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  health,
  settings,
  pendingTaskCount,
  noteCount,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    {
      id: 'dashboard' as ViewMode,
      label: 'Dashboard',
      icon: <LayoutDashboard className="w-4 h-4" />,
    },
    {
      id: 'chat' as ViewMode,
      label: 'Voice Assistant',
      icon: <Mic className="w-4 h-4" />,
    },
    {
      id: 'tasks' as ViewMode,
      label: 'Tasks & Actions',
      icon: <CheckSquare className="w-4 h-4" />,
      badge: pendingTaskCount > 0 ? pendingTaskCount : undefined,
    },
    {
      id: 'notes' as ViewMode,
      label: 'Notes & Memos',
      icon: <FileText className="w-4 h-4" />,
      badge: noteCount > 0 ? noteCount : undefined,
    },
    {
      id: 'settings' as ViewMode,
      label: 'Settings',
      icon: <Settings className="w-4 h-4" />,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 w-64 bg-slate-950/95 lg:bg-slate-950/70 border-r border-white/5 flex flex-col justify-between p-4 transition-transform duration-300 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Assistant Identity */}
          <div className="flex items-center gap-3 px-2 pt-2">
            <div className="relative w-9 h-9 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-400 p-[1px] shadow-lg shadow-indigo-950/60">
              <div className="w-full h-full rounded-2xl bg-slate-950 flex items-center justify-center">
                <span className="text-base font-bold bg-gradient-to-tr from-indigo-400 to-cyan-300 bg-clip-text text-transparent">
                  {settings.avatar}
                </span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-sm font-bold tracking-tight text-white">Aura AI</h1>
                <span className="px-1.5 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold border border-indigo-500/30">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[150px]">
                {settings.name} Voice Assistant
              </p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onSelectView(item.id);
                    onCloseMobile();
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Connection Status */}
        <div className="pt-4 border-t border-white/5 space-y-3">
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] text-slate-400">Status</span>
              <div className="flex items-center gap-1.5">
                {health?.status === 'healthy' ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-medium text-emerald-400">Connected</span>
                  </>
                ) : (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                    <span className="text-[11px] font-medium text-rose-400">Offline</span>
                  </>
                )}
              </div>
            </div>

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Engine:</span>
              <span className="font-mono text-slate-300 truncate max-w-[120px]">
                {health?.is_mock ? 'Mock Core' : health?.model || 'Gemini'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

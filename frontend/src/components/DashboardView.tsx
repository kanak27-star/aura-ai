import React from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  ListTodo,
  Mic,
  Sparkles,
} from 'lucide-react';

import { HealthStatus, Note, Task, VoiceState } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { VoiceOrb } from './VoiceOrb';

interface DashboardViewProps {
  tasks: Task[];
  notes: Note[];
  health: HealthStatus | null;
  voiceState: VoiceState;
  audioLevel?: number;
  isActualMetering?: boolean;
  onOpenDictate: () => void;
  onNavigateToView: (view: 'chat' | 'tasks' | 'notes') => void;
  onToggleVoice: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  notes,
  health,
  voiceState,
  audioLevel = 0,
  isActualMetering = false,
  onOpenDictate,
  onNavigateToView,
  onToggleVoice,
}) => {

  const pendingTasks = tasks.filter((t) => t.status !== 'done');
  const completedTasks = tasks.filter((t) => t.status === 'done');

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="flex-1 overflow-y-auto max-w-6xl mx-auto px-4 py-6 space-y-6">
      {/* Hero Section with Orb & Say Your Day */}
      <div className="relative rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-indigo-950/40 border border-white/10 p-6 sm:p-8 overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 max-w-xl text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Aura AI Voice Executive</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
              {getGreeting()}. <br />
              <span className="bg-gradient-to-r from-cyan-400 via-indigo-300 to-purple-400 bg-clip-text text-transparent">
                Say your day. It&apos;s handled.
              </span>
            </h1>

            <p className="text-sm text-slate-300 leading-relaxed">
              Dictate your entire schedule in one breath. Aura segments complex thoughts into email drafts, calendar slots, research queues, and actionable reminders.
            </p>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-2">
              <button
                onClick={onOpenDictate}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold text-xs transition-all shadow-lg shadow-cyan-950/50 hover:scale-[1.02] active:scale-95"
              >
                <Mic className="w-4 h-4" />
                <span>Dictate My Day</span>
              </button>

              <button
                onClick={() => onNavigateToView('chat')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-white/10 text-slate-200 font-medium text-xs transition-all"
              >
                <span>Open Voice Chat</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Voice Orb in Hero */}
          <div className="flex flex-col items-center">
            <VoiceOrb
              state={voiceState}
              audioLevel={audioLevel}
              onClick={onToggleVoice}
              size="md"
            />
            <AudioWaveform
              state={voiceState}
              audioLevel={audioLevel}
              isActualMetering={isActualMetering}
              barCount={12}
            />
          </div>

        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div
          onClick={() => onNavigateToView('tasks')}
          className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-indigo-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Pending Tasks</span>
            <ListTodo className="w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{pendingTasks.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Ready on your board</span>
        </div>

        <div
          onClick={() => onNavigateToView('tasks')}
          className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-emerald-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Completed</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{completedTasks.length}</div>
          <span className="text-[11px] text-emerald-400 mt-1 block">Finished items</span>
        </div>

        <div
          onClick={() => onNavigateToView('notes')}
          className="p-4 rounded-2xl bg-slate-900/70 border border-white/5 hover:border-cyan-500/30 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Notes & Dictations</span>
            <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-bold text-white">{notes.length}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Voice memos saved</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/70 border border-white/5">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-medium">Intelligence Core</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-sm font-bold text-white truncate">
            {health?.is_mock ? 'Aura Engine (Offline)' : health?.model || 'Gemini 2.5 Flash'}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-slate-400">
            <span
              className={`w-2 h-2 rounded-full ${
                health?.status === 'healthy' ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="capitalize">{health?.database || 'SQLite active'}</span>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Quick Tasks & Quick Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks Card */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-400" />
                <span>Next on Your Agenda</span>
              </h3>
              <button
                onClick={() => onNavigateToView('tasks')}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                View all &rarr;
              </button>
            </div>

            {pendingTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                All caught up! Dictate your day to add new actions.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingTasks.slice(0, 4).map((task) => (
                  <div
                    key={task.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate pr-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="font-medium text-slate-200 truncate">{task.title}</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-slate-900 border border-white/5 text-[10px] text-slate-400 capitalize flex-shrink-0">
                      {task.category}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Notes Preview */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span>Recent Memos & Dictations</span>
              </h3>
              <button
                onClick={() => onNavigateToView('notes')}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View all &rarr;
              </button>
            </div>

            {notes.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                No notes yet. Dictate your thoughts to record them.
              </p>
            ) : (
              <div className="space-y-2">
                {notes.slice(0, 3).map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl bg-slate-800/60 border border-white/5 text-xs space-y-1"
                  >
                    <p className="font-medium text-slate-200 truncate">{note.title}</p>
                    <p className="text-slate-400 line-clamp-1">{note.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

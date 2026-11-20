import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Flag,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { api, APIError } from '../services/api';
import { Task } from '../types';

type PlannerTab = 'today' | 'week' | 'overdue';

const PRIORITY_COLORS: Record<string, string> = {
  high: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  medium: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  low: 'bg-slate-700/60 text-slate-400 border-slate-600/30',
};

const PRIORITY_DOT: Record<string, string> = {
  high: 'bg-rose-400',
  medium: 'bg-amber-400',
  low: 'bg-slate-400',
};

function formatDue(due: string | undefined): string {
  if (!due) return 'No due date';
  try {
    return new Date(due).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return due;
  }
}

interface PlannerViewProps {
  onNavigateToView: (view: 'tasks') => void;
}

export const PlannerView: React.FC<PlannerViewProps> = ({ onNavigateToView }) => {
  const [tab, setTab] = useState<PlannerTab>('today');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (t: PlannerTab) => {
    setIsLoading(true);
    setError(null);
    try {
      let result: Task[];
      if (t === 'today') result = await api.getPlannerToday();
      else if (t === 'week') result = await api.getPlannerWeek();
      else result = await api.getPlannerOverdue();
      setTasks(result);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Failed to load planner.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(tab); }, [tab]);

  const handleComplete = async (task: Task) => {
    try {
      await api.updateTask(task.id, { status: 'done' });
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    } catch {
      // silent
    }
  };

  const TABS: { key: PlannerTab; label: string; icon: React.ReactNode }[] = [
    { key: 'today', label: "Today's Plan", icon: <Clock className="w-3.5 h-3.5" /> },
    { key: 'week', label: 'This Week', icon: <Calendar className="w-3.5 h-3.5" /> },
    { key: 'overdue', label: 'Overdue', icon: <AlertCircle className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            Daily Planner
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Tasks organised by date and priority</p>
        </div>
        <button
          onClick={() => load(tab)}
          disabled={isLoading}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-slate-900/60 rounded-xl border border-white/5">
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
              tab === key
                ? 'bg-indigo-600/80 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            } ${key === 'overdue' && tab !== 'overdue' ? 'hover:text-rose-300' : ''}`}
          >
            <span className={tab === key ? 'text-white' : key === 'overdue' ? 'text-rose-400' : 'text-slate-400'}>
              {icon}
            </span>
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          <span className="text-sm">Loading planner...</span>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-center mb-4">
            {tab === 'overdue' ? (
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            ) : (
              <Calendar className="w-8 h-8 text-indigo-400/60" />
            )}
          </div>
          <p className="text-slate-300 font-medium text-sm">
            {tab === 'overdue' ? 'No overdue tasks. Great job!' : 'No tasks for this period.'}
          </p>
          <p className="text-slate-500 text-xs mt-1">
            {tab === 'overdue'
              ? 'Everything is on track.'
              : 'Add tasks with a due date from the Tasks panel.'}
          </p>
          <button
            onClick={() => onNavigateToView('tasks')}
            className="mt-4 px-4 py-2 text-xs font-medium text-indigo-300 hover:text-indigo-200 border border-indigo-500/30 rounded-xl hover:bg-indigo-600/10 transition-all"
          >
            Go to Tasks →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-white/10 transition-all flex items-center justify-between gap-4 group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={() => handleComplete(task)}
                  className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-emerald-500 hover:bg-emerald-500/20 flex-shrink-0 transition-all group-hover:border-emerald-500/60"
                  title="Mark complete"
                  aria-label={`Complete task: ${task.title}`}
                />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-200 truncate">{task.title}</p>
                  {task.detail && (
                    <p className="text-xs text-slate-400 truncate mt-0.5">{task.detail}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      {formatDue(task.due_date)}
                    </span>
                    <span className="text-[10px] text-slate-500 capitalize">· {task.category}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium ${PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${PRIORITY_DOT[task.priority] || PRIORITY_DOT.medium}`} />
                  <Flag className="w-2.5 h-2.5" />
                  {task.priority}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

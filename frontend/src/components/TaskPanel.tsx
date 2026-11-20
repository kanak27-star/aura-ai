import React, { useState } from 'react';
import {
  Calendar,
  CheckCircle,
  Circle,
  Clock,
  Filter,
  Inbox,
  Mail,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { Task, TaskCategory, TaskPriority } from '../types';


interface TaskPanelProps {
  tasks: Task[];
  onToggleStatus: (task: Task) => Promise<void>;
  onDeleteTask: (id: number) => Promise<void>;
  onAddTask: (data: {
    title: string;
    detail?: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    due_date?: string;
  }) => Promise<void>;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  tasks,
  onToggleStatus,
  onDeleteTask,
  onAddTask,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDetail, setNewDetail] = useState('');
  const [newCategory, setNewCategory] = useState<TaskCategory>('general');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');

  const categories: { key: string; label: string; icon: React.ReactNode; color: string }[] = [
    { key: 'all', label: 'All', icon: <Inbox className="w-3.5 h-3.5" />, color: 'text-slate-300' },
    { key: 'email', label: 'Email', icon: <Mail className="w-3.5 h-3.5" />, color: 'text-cyan-400' },
    { key: 'calendar', label: 'Calendar', icon: <Calendar className="w-3.5 h-3.5" />, color: 'text-amber-400' },
    { key: 'reminder', label: 'Reminder', icon: <Clock className="w-3.5 h-3.5" />, color: 'text-indigo-400' },
    { key: 'research', label: 'Research', icon: <Search className="w-3.5 h-3.5" />, color: 'text-purple-400' },
    { key: 'general', label: 'General', icon: <Circle className="w-3.5 h-3.5" />, color: 'text-emerald-400' },
  ];

  const filteredTasks = tasks.filter((t) => {
    const matchesCat = selectedCategory === 'all' || t.category === selectedCategory;
    const matchesStatus =
      selectedStatus === 'all' ||
      (selectedStatus === 'done' ? t.status === 'done' : t.status !== 'done');
    const matchesSearch =
      !searchQuery ||
      t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.detail && t.detail.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesStatus && matchesSearch;
  });

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    await onAddTask({
      title: newTitle.trim(),
      detail: newDetail.trim() || undefined,
      category: newCategory,
      priority: newPriority,
    });
    setNewTitle('');
    setNewDetail('');
    setShowAddModal(false);
  };

  const getCategoryBadge = (cat: string) => {
    switch (cat) {
      case 'email':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-950/80 border border-cyan-500/30 text-cyan-300">Email</span>;
      case 'calendar':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/80 border border-amber-500/30 text-amber-300">Calendar</span>;
      case 'reminder':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-950/80 border border-indigo-500/30 text-indigo-300">Reminder</span>;
      case 'research':
        return <span className="px-2 py-0.5 rounded text-[10px] bg-purple-950/80 border border-purple-500/30 text-purple-300">Research</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 border border-slate-700 text-slate-300">General</span>;
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto px-4 py-4">
      {/* Header & New Task Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Tasks & Actions</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Voice-segmented tasks, calendar events, emails, and reminders.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-900/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Task</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {categories.map((c) => (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedCategory === c.key
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className={c.color}>{c.icon}</span>
              <span>{c.label}</span>
            </button>
          ))}
        </div>

        {/* Status & Search */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center rounded-lg bg-slate-900/80 border border-white/10 p-0.5 text-xs">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`px-2.5 py-1 rounded ${selectedStatus === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedStatus('active')}
              className={`px-2.5 py-1 rounded ${selectedStatus === 'active' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Pending
            </button>
            <button
              onClick={() => setSelectedStatus('done')}
              className={`px-2.5 py-1 rounded ${selectedStatus === 'done' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}
            >
              Done
            </button>
          </div>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {filteredTasks.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mb-3">
              <Filter className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-300">No tasks found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Use the voice assistant to say your tasks naturally, or click &ldquo;New Task&rdquo; to add one.
            </p>
          </div>
        ) : (
          filteredTasks.map((t) => {
            const isDone = t.status === 'done';

            return (
              <div
                key={t.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 group ${
                  isDone
                    ? 'bg-slate-900/30 border-white/5 opacity-60'
                    : 'bg-slate-900/80 border-white/10 hover:border-indigo-500/30'
                }`}
              >
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => onToggleStatus(t)}
                    className="mt-0.5 text-slate-400 hover:text-indigo-400 transition-colors"
                    title={isDone ? 'Mark as pending' : 'Mark as completed'}
                  >
                    {isDone ? (
                      <CheckCircle className="w-4 h-4 text-emerald-400 fill-emerald-950" />
                    ) : (
                      <Circle className="w-4 h-4" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getCategoryBadge(t.category)}
                      {t.priority === 'high' && (
                        <span className="px-1.5 py-0.2 bg-rose-950/80 text-rose-300 border border-rose-500/30 rounded text-[10px] font-semibold">
                          High
                        </span>
                      )}
                    </div>
                    <p
                      className={`text-sm font-medium text-slate-200 ${
                        isDone ? 'line-through text-slate-500' : ''
                      }`}
                    >
                      {t.title}
                    </p>
                    {t.detail && t.detail !== t.title && (
                      <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{t.detail}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onDeleteTask(t.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete task"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-4">Create New Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Email quarterly summary to team"
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Details (Optional)</label>
                <textarea
                  value={newDetail}
                  onChange={(e) => setNewDetail(e.target.value)}
                  placeholder="Additional context or notes..."
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as TaskCategory)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="general">General</option>
                    <option value="email">Email</option>
                    <option value="calendar">Calendar</option>
                    <option value="reminder">Reminder</option>
                    <option value="research">Research</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
                >
                  Save Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

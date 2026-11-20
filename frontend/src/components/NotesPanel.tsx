import React, { useState } from 'react';
import {
  BookOpen,
  Check,
  Copy,
  FileText,
  ListPlus,
  Plus,
  Search,
  Tag,
  Trash2,
} from 'lucide-react';
import { Note, TaskCategory } from '../types';

interface NotesPanelProps {
  notes: Note[];
  onCreateNote: (data: { title: string; content: string; tags?: string }) => Promise<void>;
  onDeleteNote: (id: number) => Promise<void>;
  onConvertToTask: (data: { title: string; detail?: string; category?: TaskCategory }) => Promise<void>;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  notes,
  onCreateNote,
  onDeleteNote,
  onConvertToTask,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  // New Note state
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newTags, setNewTags] = useState('voice');

  // Extract all unique tags
  const allTags = Array.from(
    new Set(
      notes
        .flatMap((n) => (n.tags ? n.tags.split(',').map((t) => t.trim()) : []))
        .filter(Boolean)
    )
  );

  const filteredNotes = notes.filter((n) => {
    const matchesSearch =
      !searchQuery ||
      n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag =
      selectedTag === 'all' ||
      (n.tags && n.tags.toLowerCase().includes(selectedTag.toLowerCase()));
    return matchesSearch && matchesTag;
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;
    await onCreateNote({
      title: newTitle.trim(),
      content: newContent.trim(),
      tags: newTags.trim() || 'voice',
    });
    setNewTitle('');
    setNewContent('');
    setShowAddModal(false);
  };

  const handleCopy = (content: string, id: number) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto px-4 py-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/5">
        <div>
          <h2 className="text-lg font-semibold text-slate-100">Notes & Dictations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Voice memos, meeting transcripts, and research synthesis repository.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium transition-all shadow-md shadow-indigo-900/30 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Note</span>
        </button>
      </div>

      {/* Search and Tag Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setSelectedTag('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedTag === 'all'
                ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-slate-200'
            }`}
          >
            All Notes
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTag === tag
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-200'
                  : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Tag className="w-3 h-3 text-slate-500" />
              <span>{tag}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-3 py-1.5 bg-slate-900/80 border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Notes Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {filteredNotes.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/5 flex items-center justify-center text-slate-500 mb-3">
              <BookOpen className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-300">No notes saved</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Dictate long thoughts in the assistant or create a note manually to store it here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredNotes.map((note) => (
              <div
                key={note.id}
                className="p-4 rounded-xl bg-slate-900/80 border border-white/10 hover:border-indigo-500/30 transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      <span className="truncate">{note.title}</span>
                    </h3>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopy(note.content, note.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-md transition-colors"
                        title="Copy note text"
                      >
                        {copiedId === note.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() =>
                          onConvertToTask({
                            title: note.title,
                            detail: note.content,
                            category: 'note',
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded-md transition-colors"
                        title="Convert note into task on your board"
                      >
                        <ListPlus className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteNote(note.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-md transition-colors"
                        title="Delete note"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 whitespace-pre-wrap line-clamp-6 leading-relaxed">
                    {note.content}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <div className="flex items-center gap-1.5">
                    {note.tags?.split(',').map((t, i) => (
                      <span
                        key={i}
                        className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700/60 text-[10px] text-slate-400"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-slate-100 mb-4">Create New Note</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Project Architecture Thoughts"
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Content</label>
                <textarea
                  required
                  rows={6}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Note body or dictation content..."
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="voice, meeting, ideas"
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
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
                  Save Note
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  BookmarkPlus,
  ExternalLink,
  Loader2,
  Search,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { api, APIError } from '../services/api';
import { SearchResult } from '../types';

export const SearchPanel: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [provider, setProvider] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [savedNoteId, setSavedNoteId] = useState<number | null>(null);

  useEffect(() => {
    api.getSearchStatus().then((s) => {
      setProvider(s.provider);
      setIsConfigured(s.is_configured);
    }).catch(() => setIsConfigured(false));
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setIsLoading(true);
    setError(null);
    setResults([]);
    setIsMock(false);
    setSavedNoteId(null);

    try {
      const res = await api.searchWeb(q, 8);
      setResults(res.results);
      setIsMock(res.is_mock);
      if (res.error) setError(res.error);
      if (res.note_id) setSavedNoteId(res.note_id);
    } catch (err) {
      setError(err instanceof APIError ? err.message : 'Search request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    const q = query.trim();
    if (!q || results.length === 0) return;
    try {
      const res = await api.searchWeb(q, 8, true);
      if (res.note_id) setSavedNoteId(res.note_id);
    } catch {
      // silent
    }
  };

  return (
    <div className="flex-1 overflow-y-auto max-w-4xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Web Research
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Search the web and save results as notes</p>
        </div>
        {/* Provider badge */}
        {isConfigured !== null && (
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-medium ${
            isConfigured
              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
              : 'bg-slate-900/60 border-white/10 text-slate-400'
          }`}>
            {isConfigured ? (
              <><Wifi className="w-3 h-3" /> {provider} active</>
            ) : (
              <><WifiOff className="w-3 h-3" /> No provider</>
            )}
          </div>
        )}
      </div>

      {/* Config notice */}
      {isConfigured === false && (
        <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-300">No Search Provider Configured</p>
            <p className="mt-0.5 leading-relaxed">
              Set <code className="px-1 bg-black/30 rounded">SEARCH_PROVIDER=serpapi</code> and <code className="px-1 bg-black/30 rounded">SERPAPI_KEY</code>, or{' '}
              <code className="px-1 bg-black/30 rounded">SEARCH_PROVIDER=tavily</code> and <code className="px-1 bg-black/30 rounded">TAVILY_API_KEY</code> in{' '}
              <code className="px-1 bg-black/30 rounded">backend/.env</code> to enable live search.
              You can still test the endpoint — it will return an honest empty result.
            </p>
          </div>
        </div>
      )}

      {/* Search form */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Research anything — e.g. 'FastAPI WebSocket best practices'…"
            className="w-full pl-9 pr-4 py-3 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/60 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            aria-label="Search query"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !query.trim()}
          className="px-5 py-3 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
        >
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          Search
        </button>
      </form>

      {/* Error */}
      {error && (
        <div className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
          isMock
            ? 'bg-amber-950/30 border-amber-500/30 text-amber-200'
            : 'bg-rose-950/40 border-rose-500/30 text-rose-200'
        }`}>
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-400" />
          <span className="leading-relaxed">{error}</span>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">
              {results.length} result{results.length !== 1 ? 's' : ''} via {provider}
            </span>
            {!savedNoteId && (
              <button
                onClick={handleSaveNote}
                className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                title="Save results as a note"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                Save as Note
              </button>
            )}
            {savedNoteId && (
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                ✓ Saved as Note #{savedNoteId}
              </span>
            )}
          </div>

          {results.map((r, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-slate-900/60 border border-white/5 hover:border-cyan-500/20 transition-all"
            >
              <a
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-cyan-300 group-hover:text-cyan-200 transition-colors truncate">
                    {r.title}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate mt-0.5">{r.url}</p>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed line-clamp-3">
                    {r.snippet}
                  </p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors flex-shrink-0 mt-1" />
              </a>
            </div>
          ))}
        </div>
      )}

      {/* Empty state (no search yet) */}
      {!isLoading && results.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-cyan-400/40" />
          </div>
          <p className="text-slate-400 text-sm">Enter a query to research the web</p>
          <p className="text-slate-600 text-xs mt-1">Results will appear here</p>
        </div>
      )}
    </div>
  );
};

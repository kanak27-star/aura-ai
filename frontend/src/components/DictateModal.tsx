import React, { useState } from 'react';
import {
  CheckCircle,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  X,
} from 'lucide-react';

import { activeVoiceAgent } from '../services/voice';
import { Note, Task } from '../types';

interface DictateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProcessDictation: (text: string) => Promise<{
    summary: string;
    created_tasks: Task[];
    created_notes: Note[];
    spoken_summary: string;
  } | null>;
}

export const DictateModal: React.FC<DictateModalProps> = ({
  isOpen,
  onClose,
  onProcessDictation,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<{
    summary: string;
    created_tasks: Task[];
    created_notes: Note[];
  } | null>(null);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (isRecording) {
      activeVoiceAgent.stopListening();
      setIsRecording(false);
    } else {
      activeVoiceAgent.startListening({
        onTranscript: (transcript, isFinal) => {
          setText((prev) => {
            const separator = prev ? ' ' : '';
            return isFinal ? `${prev}${separator}${transcript}.` : `${prev}${separator}${transcript}`;
          });
        },
        onError: (err) => {
          console.warn('Speech error:', err);
          setIsRecording(false);
        },
        onEnd: () => {
          setIsRecording(false);
        },
      }).then((ok) => {
        if (ok) setIsRecording(true);
      });
    }
  };

  const handleProcess = async () => {
    if (!text.trim() || isProcessing) return;
    if (isRecording) {
      activeVoiceAgent.stopListening();
      setIsRecording(false);
    }

    setIsProcessing(true);
    try {
      const res = await onProcessDictation(text.trim());
      if (res) {
        setResult({
          summary: res.summary,
          created_tasks: res.created_tasks,
          created_notes: res.created_notes,
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setText('');
    setResult(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Head */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100">Say Your Day</h2>
              <p className="text-xs text-slate-400">
                Dictate your entire day in one breath. Aura splits it into tasks and notes.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          {!result ? (
            <>
              {/* Voice Trigger Banner */}
              <div className="p-4 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleRecording}
                    className={`p-3.5 rounded-full transition-all ${
                      isRecording
                        ? 'bg-cyan-500 text-black shadow-[0_0_25px_rgba(6,182,212,0.8)] animate-pulse'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                    }`}
                  >
                    {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                  </button>
                  <div>
                    <p className="text-xs font-semibold text-slate-200">
                      {isRecording ? 'Listening to your voice...' : 'Click mic or start typing'}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Say things like: &ldquo;Email team launch notes, schedule 3pm sync, and remember to order coffee beans.&rdquo;
                    </p>
                  </div>
                </div>
              </div>

              {/* Dictation Textarea */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">
                  Dictated Stream of Thoughts
                </label>
                <textarea
                  rows={6}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Start talking or paste your raw thoughts here..."
                  className="w-full px-4 py-3 bg-slate-800/90 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 resize-none leading-relaxed"
                />
              </div>
            </>
          ) : (
            /* Results view */
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200 flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-semibold text-emerald-300">Successfully Processed!</h4>
                  <p className="text-xs text-emerald-200/90 mt-0.5">{result.summary}</p>
                </div>
              </div>

              {result.created_tasks.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Tasks Added to Board ({result.created_tasks.length})
                  </h5>
                  <div className="space-y-2">
                    {result.created_tasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-slate-800 border border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-950 border border-indigo-500/30 text-indigo-300 text-[10px] capitalize">
                            {t.category}
                          </span>
                          <span className="text-slate-200 font-medium">{t.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.created_notes.length > 0 && (
                <div>
                  <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Notes Saved ({result.created_notes.length})
                  </h5>
                  <div className="space-y-2">
                    {result.created_notes.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg bg-slate-800 border border-white/5 text-xs text-slate-300"
                      >
                        <p className="font-semibold text-slate-200">{n.title}</p>
                        <p className="text-slate-400 mt-1 line-clamp-2">{n.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={result ? handleReset : onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            {result ? 'Dictate Another' : 'Cancel'}
          </button>

          {!result ? (
            <button
              type="button"
              onClick={handleProcess}
              disabled={!text.trim() || isProcessing}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-semibold rounded-xl text-xs transition-all shadow-lg shadow-cyan-950/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Segmenting Day...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Fan Out into Tasks</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl text-xs transition-colors"
            >
              Done & View Board
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

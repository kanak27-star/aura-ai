
import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  Clock,
  Copy,
  FileText,
  Info,
  ListTodo,
  Loader2,
  MicOff,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  Trash2,
  User,
} from 'lucide-react';
import { APIError } from '../services/api';
import { VoiceError } from '../services/voice/types';
import { Message, VoiceState } from '../types';
import { AudioWaveform } from './AudioWaveform';
import { MicControl } from './MicControl';
import { VoiceOrb } from './VoiceOrb';

interface ConversationViewProps {
  messages: Message[];
  isLoading: boolean;
  error: APIError | null;
  voiceError: VoiceError | null;
  emptyTranscriptNotice: boolean;
  voiceState: VoiceState;
  interimTranscript: string;
  audioLevel: number;
  isActualMetering: boolean;
  speechSupported: boolean;
  onSendMessage: (text: string) => Promise<void>;
  onRetry: () => void;
  onClearHistory: () => Promise<void>;
  onToggleVoice: () => void;
  onStopSpeaking: () => void;
  onDismissVoiceError: () => void;
}

type ActionDetails = {
  title?: string;
  category?: string;
  action_type?: string;
  recipient?: string;
  detail?: string;
  content?: string;
  subject?: string;
  due_time?: string;
  due_date?: string;
  priority?: string;
};

export const ConversationView: React.FC<ConversationViewProps> = ({
  messages,
  isLoading,
  error,
  voiceError,
  emptyTranscriptNotice,
  voiceState,
  interimTranscript,
  audioLevel,
  isActualMetering,
  speechSupported,
  onSendMessage,
  onRetry,
  onClearHistory,
  onToggleVoice,
  onStopSpeaking,
  onDismissVoiceError,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimTranscript, isLoading, voiceError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const text = inputText.trim();

    if (!text || isLoading || voiceState === 'processing') return;

    setInputText('');
    await onSendMessage(text);
  };

  const handleCopy = (content: string, id?: string | number) => {
    navigator.clipboard.writeText(content);

    if (id !== undefined) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const suggestions = [
    'Dictate my day: Remind me to review budget at 2pm and email Sarah the launch notes.',
    'What can you handle for me as my executive voice assistant?',
    'Research top considerations when migrating from Next.js to Vite.',
  ];

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto px-4 py-4 select-text">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>

          <div>
            <h2 className="text-sm font-semibold text-slate-200">
              Aura AI Conversation
            </h2>
            <p className="text-xs text-slate-400">
              Natural voice dialogue & structured task extraction
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {voiceState === 'speaking' && (
            <button
              onClick={onStopSpeaking}
              className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/80 hover:bg-purple-600 text-white text-xs font-medium rounded-lg transition-all shadow-md shadow-purple-900/30 animate-pulse"
              title="Stop audio speech playback"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop Speech</span>
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={onClearHistory}
              disabled={isLoading || voiceState === 'processing'}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-md transition-colors disabled:opacity-40"
              title="Clear conversation history"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Conversation Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {/* Browser Voice Capability Notice */}
        {!speechSupported && (
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />

            <div>
              <p className="font-semibold text-amber-300">
                Browser Speech API Limitation
              </p>

              <p className="mt-0.5 text-amber-200/90 leading-relaxed">
                Your current browser does not natively support the Web Speech
                Recognition API. Text chat and speech synthesis work normally.
                For full voice recognition, open this page in{' '}
                <strong>Google Chrome</strong> or{' '}
                <strong>Microsoft Edge</strong>.
              </p>
            </div>
          </div>
        )}

        {/* Microphone Error */}
        {voiceError && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              {voiceError.type === 'permission_denied' ? (
                <MicOff className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              )}

              <div>
                <p className="font-semibold text-rose-300">
                  {voiceError.type === 'permission_denied'
                    ? 'Microphone Permission Needed'
                    : 'Voice Input Warning'}
                </p>

                <p className="mt-0.5 text-rose-200/90 leading-relaxed">
                  {voiceError.message}
                </p>

                {voiceError.type === 'permission_denied' && (
                  <p className="mt-1 text-[11px] text-rose-300/80">
                    Tip: Click the microphone lock icon in your browser URL bar
                    to change permission to "Allow", then tap the mic again.
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={onDismissVoiceError}
              className="text-xs text-rose-300 hover:text-white px-2 py-1 rounded bg-rose-900/50 hover:bg-rose-900 transition-colors flex-shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Empty Transcript Notice */}
        {emptyTranscriptNotice && (
          <div className="p-3 rounded-xl bg-slate-900/80 border border-white/10 text-slate-300 text-xs flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>
              Didn't catch that. Tap the microphone and speak clearly.
            </span>
          </div>
        )}

        {/* Welcome Screen */}
        {messages.length === 0 && !interimTranscript && (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <VoiceOrb
              state={voiceState}
              audioLevel={audioLevel}
              onClick={onToggleVoice}
              size="md"
            />

            <h3 className="text-lg font-semibold text-slate-200 mt-2">
              Say your day. It's handled.
            </h3>

            <p className="text-sm text-slate-400 max-w-md mt-1">
              Speak or type anything naturally. Aura breaks your thoughts into
              actionable tasks, emails, notes, and research.
            </p>

            <div className="mt-6 flex flex-col gap-2 w-full max-w-lg">
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider text-left">
                Suggested Prompts
              </span>

              {suggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => onSendMessage(prompt)}
                  disabled={isLoading || voiceState === 'processing'}
                  className="text-left text-xs p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 hover:border-indigo-500/30 text-slate-300 transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <span className="truncate pr-2">{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-slate-500 group-hover:text-indigo-400 flex-shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Message Turns */}
        {messages.map((msg, index) => {
          const isUser = msg.role === 'user';
          const msgKey = msg.id ?? index;

          return (
            <div
              key={msgKey}
              className={`flex flex-col ${
                isUser ? 'items-end' : 'items-start'
              } group`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all ${
                  isUser
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-md shadow-indigo-950/40'
                    : 'bg-slate-900/90 border border-white/10 text-slate-100 rounded-tl-none shadow-sm'
                }`}
              >
                {/* AI Header */}
                {!isUser && (
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-white/5 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5 font-medium text-indigo-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      Aura

                      {msg.is_mock && (
                        <span className="px-1.5 py-0.2 bg-amber-500/20 text-amber-300 rounded text-[10px]">
                          offline mode
                        </span>
                      )}
                    </span>

                    <button
                      onClick={() => handleCopy(msg.content, msgKey)}
                      className="p-1 hover:text-slate-200 transition-colors"
                      title="Copy text"
                    >
                      {copiedId === msgKey ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}

                {/* Message Body */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>

                {/* Structured Actions */}
                {msg.structured_actions &&
                  msg.structured_actions.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-white/10 space-y-3">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                        <ListTodo className="w-3.5 h-3.5" />
                        <span>
                          Extracted Actions ({msg.structured_actions.length}):
                        </span>
                      </div>

                      <div className="space-y-2">
                        {msg.structured_actions.map((rawAction, aIdx) => {
                          const action = rawAction as ActionDetails;

                          const category =
                            action.category || action.action_type || 'task';

                          const isEmail =
                            category.toLowerCase().includes('email') ||
                            category.toLowerCase() === 'mail';

                          const detail = action.detail || action.content;

                          const hasDetails =
                            Boolean(action.recipient) ||
                            Boolean(detail) ||
                            Boolean(action.subject) ||
                            Boolean(action.due_time) ||
                            Boolean(action.due_date) ||
                            Boolean(action.priority);

                          return (
                            <div
                              key={aIdx}
                              className="rounded-xl bg-indigo-950/40 border border-indigo-500/20 p-3 space-y-2"
                            >
                              {/* Action Title */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="capitalize font-semibold text-xs text-indigo-300">
                                    {category}
                                  </span>

                                  <span className="text-sm font-medium text-slate-100 truncate">
                                    {action.title || 'Untitled action'}
                                  </span>
                                </div>

                                {action.priority && (
                                  <span className="text-[10px] uppercase tracking-wide text-amber-300 bg-amber-500/10 px-2 py-1 rounded">
                                    {action.priority}
                                  </span>
                                )}
                              </div>

                              {/* Additional Action Information */}
                              {hasDetails ? (
                                <div className="space-y-2 text-xs text-slate-300">
                                  {action.recipient && (
                                    <div className="flex items-start gap-2">
                                      <User className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />

                                      <div>
                                        <span className="text-slate-400">
                                          {isEmail ? 'Recipient' : 'Person'}:
                                        </span>{' '}
                                        <span className="text-slate-200">
                                          {action.recipient}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {action.subject && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />

                                      <div>
                                        <span className="text-slate-400">
                                          Subject:
                                        </span>{' '}
                                        <span className="text-slate-200">
                                          {action.subject}
                                        </span>
                                      </div>
                                    </div>
                                  )}

                                  {detail && (
                                    <div className="flex items-start gap-2">
                                      <FileText className="w-3.5 h-3.5 text-indigo-400 mt-0.5 flex-shrink-0" />

                                      <div className="min-w-0">
                                        <span className="text-slate-400">
                                          {isEmail
                                            ? 'Message details'
                                            : 'Details'}
                                          :
                                        </span>

                                        <p className="text-slate-200 mt-1 whitespace-pre-wrap break-words">
                                          {detail}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  {action.due_date && (
                                    <div className="flex items-center gap-2">
                                      <CalendarDays className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                      <span className="text-slate-400">
                                        Date:
                                      </span>
                                      <span className="text-slate-200">
                                        {action.due_date}
                                      </span>
                                    </div>
                                  )}

                                  {action.due_time && (
                                    <div className="flex items-center gap-2">
                                      <Clock className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" />
                                      <span className="text-slate-400">
                                        Time:
                                      </span>
                                      <span className="text-slate-200">
                                        {action.due_time}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p className="text-[11px] text-slate-500">
                                  No additional details were returned by the
                                  backend.
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
              </div>

              {/* Timestamp */}
              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {new Date(msg.created_at).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}

        {/* Live Interim Transcript */}
        {(interimTranscript || voiceState === 'listening') && (
          <div className="flex flex-col items-end">
            <div className="max-w-[85%] rounded-2xl rounded-tr-none p-4 bg-cyan-950/50 border border-cyan-500/40 text-cyan-100 shadow-lg shadow-cyan-950/50">
              <div className="flex items-center justify-between gap-3 text-xs text-cyan-400 mb-2">
                <span className="flex items-center gap-1.5 font-medium">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  Live Speech Recognition
                </span>

                <span className="text-[10px] text-cyan-300/80">
                  Tap mic when done
                </span>
              </div>

              <p className="text-sm italic min-h-[1.25rem]">
                {interimTranscript || 'Listening to your voice...'}
              </p>

              <div className="mt-2 pt-2 border-t border-cyan-500/20">
                <AudioWaveform
                  state={voiceState}
                  audioLevel={audioLevel}
                  isActualMetering={isActualMetering}
                  barCount={14}
                  showBadge={true}
                />
              </div>
            </div>
          </div>
        )}

        {/* Loading Indicator */}
        {(isLoading || voiceState === 'processing') && (
          <div className="flex items-center gap-3 p-4 max-w-[70%] rounded-2xl rounded-tl-none bg-slate-900/80 border border-white/10 text-slate-300">
            <Loader2 className="w-4 h-4 text-amber-400 animate-spin flex-shrink-0" />

            <div className="flex items-center gap-1 text-xs">
              <span>Aura is thinking & segmenting</span>
              <span className="animate-pulse">...</span>
            </div>
          </div>
        )}

        {/* Communication Error */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />

              <div>
                <p className="text-xs font-semibold text-rose-300">
                  Communication Error
                </p>

                <p className="text-xs text-rose-200/90 mt-0.5">
                  {error.message}
                </p>
              </div>
            </div>

            {error.canRetry && (
              <button
                onClick={onRetry}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-medium transition-colors shadow-sm self-end sm:self-center"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={
                voiceState === 'listening'
                  ? 'Listening to microphone...'
                  : voiceState === 'processing'
                    ? 'Aura is processing...'
                    : 'Ask anything or dictate your day (or tap mic)...'
              }
              disabled={isLoading || voiceState === 'processing'}
              className="w-full px-4 py-3 bg-slate-900/90 border border-white/10 rounded-xl text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/40 disabled:opacity-50 transition-all pr-10"
            />

            {inputText.trim() && (
              <button
                type="submit"
                disabled={isLoading || voiceState === 'processing'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50"
                title="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center">
            <MicControl
              state={voiceState}
              onToggle={onToggleVoice}
              disabled={isLoading || voiceState === 'processing'}
            />
          </div>
        </form>
      </div>
    </div>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import { ConversationView } from './components/ConversationView';
import { DashboardView } from './components/DashboardView';
import { DictateModal } from './components/DictateModal';
import { Header } from './components/Header';
import { NotesPanel } from './components/NotesPanel';
import { SettingsView } from './components/SettingsView';
import { Sidebar } from './components/Sidebar';
import { TaskPanel } from './components/TaskPanel';
import { api, APIError } from './services/api';
import { activeVoiceAgent } from './services/voice';
import { VoiceError } from './services/voice/types';
import {
  AssistantSettings,
  HealthStatus,
  Message,
  Note,
  Task,
  TaskCategory,
  ViewMode,
  VoiceState,
} from './types';

const DEFAULT_SETTINGS: AssistantSettings = {
  name: 'Aura',
  avatar: '✦',
  vibe: 'Executive, concise, and structured',
  instructions: 'You are Aura, my personal voice executive assistant. Always be concise, warm, and highly structured.',
  voiceAccent: 'en-US',
  speechRate: 1.0,
  speechPitch: 1.0,
  autoSpeak: true,
  apiUrl: 'http://localhost:8000',
};

export const App: React.FC = () => {
  // Navigation & UI state
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDictateModalOpen, setIsDictateModalOpen] = useState(false);

  // Assistant & Voice state
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [speechSupported, setSpeechSupported] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isActualMetering, setIsActualMetering] = useState(false);
  const [voiceError, setVoiceError] = useState<VoiceError | null>(null);
  const [emptyTranscriptNotice, setEmptyTranscriptNotice] = useState(false);

  // Data states
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  // Request & error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<APIError | null>(null);
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);

  // Settings state with localStorage persistence
  const [settings, setSettings] = useState<AssistantSettings>(() => {
    try {
      const saved = localStorage.getItem('aura_assistant_settings');
      return saved ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const voiceStateRef = useRef(voiceState);
  voiceStateRef.current = voiceState;

  // Initialize voice agent capabilities and poll initial data
  useEffect(() => {
    activeVoiceAgent.getCapabilities().then((caps) => {
      setSpeechSupported(caps.speechRecognitionSupported);
    });

    const initData = async () => {
      try {
        const h = await api.getHealth();
        setHealth(h);
      } catch (err) {
        console.warn('Backend currently offline:', err);
      }

      try {
        const history = await api.getHistory('default');
        setMessages(history);
      } catch {
        // Handled silently
      }

      try {
        const t = await api.getTasks();
        setTasks(t);
      } catch {
        // Handled silently
      }

      try {
        const n = await api.getNotes();
        setNotes(n);
      } catch {
        // Handled silently
      }
    };

    initData();
  }, []);

  // Sync settings to localStorage
  const handleUpdateSettings = (newSettings: Partial<AssistantSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('aura_assistant_settings', JSON.stringify(updated));
      return updated;
    });
  };

  // Send message to AI assistant
  const handleSendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setError(null);
    setLastFailedMessage(null);
    setIsLoading(true);
    setVoiceState('processing');
    setInterimTranscript('');
    setEmptyTranscriptNotice(false);

    // Optimistically add user turn
    const userMsg: Message = {
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const response = await api.sendMessage(trimmed, 'default', settings.instructions);

      const assistantMsg: Message = {
        role: 'assistant',
        content: response.message,
        model_used: response.model,
        is_mock: response.is_mock,
        structured_actions: response.structured_actions,
        created_at: response.created_at,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If tasks were extracted and created, refresh tasks
      if (response.structured_actions && response.structured_actions.length > 0) {
        api.getTasks().then(setTasks).catch(console.error);
      }

      // Voice read aloud if autoSpeak enabled
      if (settings.autoSpeak) {
        setVoiceState('speaking');
        activeVoiceAgent.speak(response.message, {
          rate: settings.speechRate,
          pitch: settings.speechPitch,
          onEnd: () => setVoiceState('idle'),
          onError: () => setVoiceState('idle'),
        });
      } else {
        setVoiceState('idle');
      }
    } catch (err) {
      setLastFailedMessage(trimmed);
      setVoiceState('idle');
      if (err instanceof APIError) {
        setError(err);
      } else {
        setError(new APIError('Failed to process message. Please check server status.', 0, true));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedMessage) {
      handleSendMessage(lastFailedMessage);
    }
  };

  const handleClearHistory = async () => {
    try {
      await api.clearHistory('default');
      setMessages([]);
    } catch (err) {
      console.error('Failed to clear history:', err);
    }
  };

  // Stop speech playback
  const handleStopSpeaking = () => {
    activeVoiceAgent.stopSpeaking();
    setVoiceState('idle');
  };

  // Dismiss voice error banner
  const handleDismissVoiceError = () => {
    setVoiceError(null);
  };

  // Toggle Voice Recognition
  const handleToggleVoice = () => {
    if (voiceState === 'speaking') {
      handleStopSpeaking();
      return;
    }

    if (voiceState === 'listening') {
      activeVoiceAgent.stopListening();
      setVoiceState('idle');
      setInterimTranscript('');
      setAudioLevel(0);
      setIsActualMetering(false);
      return;
    }

    // Start listening
    setVoiceState('listening');
    setInterimTranscript('');
    setVoiceError(null);
    setEmptyTranscriptNotice(false);

    activeVoiceAgent.startListening({
      onStart: () => {
        setVoiceState('listening');
      },
      onTranscript: (transcript, isFinal) => {
        if (isFinal) {
          if (transcript.trim()) {
            setInterimTranscript('');
            handleSendMessage(transcript);
          } else {
            setVoiceState('idle');
            setInterimTranscript('');
            setAudioLevel(0);
            setIsActualMetering(false);
            setEmptyTranscriptNotice(true);
            setTimeout(() => setEmptyTranscriptNotice(false), 4000);
          }
        } else {
          setInterimTranscript(transcript);
        }
      },
      onAudioLevel: (level, isActual) => {
        setAudioLevel(level);
        setIsActualMetering(isActual);
      },
      onError: (err) => {
        // Don't show error banner for harmless aborted events triggered by stopListening()
        if (err.type !== 'aborted') {
          setVoiceError(err);
        }
        setVoiceState('idle');
        setInterimTranscript('');
        setAudioLevel(0);
        setIsActualMetering(false);
      },
      onEnd: () => {
        // Only transition away from listening if we haven't already moved to processing/speaking
        if (voiceStateRef.current === 'listening') {
          setVoiceState('idle');
        }
        setAudioLevel(0);
        setIsActualMetering(false);
      },
    });
  };

  // Spacebar hotkey to toggle voice when not inside an input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (e.code === 'Space' && !e.repeat && !isInput && !isLoading) {
        e.preventDefault();
        handleToggleVoice();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voiceState, isLoading]);

  // Task actions
  const handleToggleTaskStatus = async (task: Task) => {
    const nextStatus = task.status === 'done' ? 'queued' : 'done';
    try {
      const updated = await api.updateTask(task.id, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updated : t)));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    try {
      await api.deleteTask(id);
      setTasks((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleAddTask = async (data: {
    title: string;
    detail?: string;
    category?: TaskCategory;
  }) => {
    try {
      const created = await api.createTask(data);
      setTasks((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  // Note actions
  const handleCreateNote = async (data: { title: string; content: string; tags?: string }) => {
    try {
      const created = await api.createNote(data);
      setNotes((prev) => [created, ...prev]);
    } catch (err) {
      console.error('Failed to create note:', err);
    }
  };

  const handleDeleteNote = async (id: number) => {
    try {
      await api.deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleConvertToTask = async (data: { title: string; detail?: string; category?: TaskCategory }) => {
    await handleAddTask(data);
    setCurrentView('tasks');
  };

  // Dictation ("Say your day")
  const handleProcessDictation = async (text: string) => {
    try {
      const res = await api.dictateDay(text, 'default');
      setTasks((prev) => [...res.created_tasks, ...prev]);
      setNotes((prev) => [...res.created_notes, ...prev]);
      return res;
    } catch (err) {
      console.error('Failed to dictate day:', err);
      return null;
    }
  };

  const handleClearAllData = async () => {
    if (window.confirm('Are you sure you want to clear your conversation history?')) {
      await handleClearHistory();
      alert('Conversation history reset.');
    }
  };

  const pendingTaskCount = tasks.filter((t) => t.status !== 'done').length;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-aura-950 font-sans text-slate-100">
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        health={health}
        settings={settings}
        pendingTaskCount={pendingTaskCount}
        noteCount={notes.length}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-radial from-slate-900/30 to-aura-950">
        <Header
          currentView={currentView}
          onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
          onOpenDictate={() => setIsDictateModalOpen(true)}
          health={health}
          speechSupported={speechSupported}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {currentView === 'dashboard' && (
            <DashboardView
              tasks={tasks}
              notes={notes}
              health={health}
              voiceState={voiceState}
              audioLevel={audioLevel}
              isActualMetering={isActualMetering}
              onOpenDictate={() => setIsDictateModalOpen(true)}
              onNavigateToView={(view) => setCurrentView(view)}
              onToggleVoice={handleToggleVoice}
            />
          )}

          {currentView === 'chat' && (
            <ConversationView
              messages={messages}
              isLoading={isLoading}
              error={error}
              voiceError={voiceError}
              emptyTranscriptNotice={emptyTranscriptNotice}
              voiceState={voiceState}
              interimTranscript={interimTranscript}
              audioLevel={audioLevel}
              isActualMetering={isActualMetering}
              speechSupported={speechSupported}
              onSendMessage={handleSendMessage}
              onRetry={handleRetry}
              onClearHistory={handleClearHistory}
              onToggleVoice={handleToggleVoice}
              onStopSpeaking={handleStopSpeaking}
              onDismissVoiceError={handleDismissVoiceError}
            />
          )}

          {currentView === 'tasks' && (
            <TaskPanel
              tasks={tasks}
              onToggleStatus={handleToggleTaskStatus}
              onDeleteTask={handleDeleteTask}
              onAddTask={handleAddTask}
            />
          )}

          {currentView === 'notes' && (
            <NotesPanel
              notes={notes}
              onCreateNote={handleCreateNote}
              onDeleteNote={handleDeleteNote}
              onConvertToTask={handleConvertToTask}
            />
          )}

          {currentView === 'settings' && (
            <SettingsView
              settings={settings}
              health={health}
              onUpdateSettings={handleUpdateSettings}
              onClearAllData={handleClearAllData}
            />
          )}
        </main>
      </div>

      {/* Say Your Day Dictation Modal */}
      <DictateModal
        isOpen={isDictateModalOpen}
        onClose={() => setIsDictateModalOpen(false)}
        onProcessDictation={handleProcessDictation}
      />
    </div>
  );
};
export default App;

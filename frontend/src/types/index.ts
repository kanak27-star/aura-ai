export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking';

export type ViewMode = 'dashboard' | 'chat' | 'tasks' | 'notes' | 'planner' | 'search' | 'documents' | 'settings';

export type TaskCategory = 'research' | 'reminder' | 'calendar' | 'email' | 'note' | 'general';

export type TaskStatus = 'queued' | 'in_progress' | 'done' | 'failed';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface StructuredAction {
  action_type: 'task' | 'reminder' | 'calendar' | 'email' | 'note' | 'research';
  title: string;
  detail?: string;
  category: string;
  due_date?: string;
}

export interface Message {
  id?: number | string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  model_used?: string;
  is_mock?: boolean;
  structured_actions?: StructuredAction[];
  created_at: string;
}

export interface Task {
  id: number;
  title: string;
  detail?: string;
  category: TaskCategory;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  content: string;
  tags?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  title: string;
  content: string;
  source?: string;
  tags?: string;
  created_at: string;
}

export interface DocumentSearchResult {
  id: number;
  title: string;
  snippet: string;
  source?: string;
  tags?: string;
  score: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  provider: string;
  results: SearchResult[];
  is_mock: boolean;
  error?: string;
  note_id?: number;
}

export interface ToolResult {
  tool: string;
  success: boolean;
  data?: unknown;
  error?: string;
  requires_confirmation?: boolean;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'offline';
  database: string;
  model: string;
  is_mock: boolean;
  version: string;
  timestamp: string;
}

export interface AssistantSettings {
  name: string;
  avatar: string;
  vibe: string;
  instructions: string;
  voiceAccent: string;
  speechRate: number;
  speechPitch: number;
  autoSpeak: boolean;
  apiUrl: string;
}

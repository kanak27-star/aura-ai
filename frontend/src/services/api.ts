import {
  Document,
  DocumentSearchResult,
  HealthStatus,
  Message,
  Note,
  StructuredAction,
  Task,
  TaskCategory,
  TaskPriority,
  TaskStatus,
  ToolResult,
  WebSearchResponse,
} from '../types';

const API_BASE = import.meta.env.VITE_API_URL || '';

export class APIError extends Error {
  status?: number;
  isRateLimit?: boolean;
  canRetry: boolean;

  constructor(message: string, status?: number, canRetry: boolean = true) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.isRateLimit = status === 429;
    this.canRetry = canRetry;
  }
}

async function request<T>(endpoint: string, options?: RequestInit, retries = 1): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options?.headers || {}),
      },
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      const message = errorData.detail || `Request failed with status ${res.status}`;

      if (res.status === 429) {
        throw new APIError('AI rate limit reached. Please wait a moment before trying again.', 429, true);
      }

      if (res.status >= 500 && retries > 0) {
        await new Promise((r) => setTimeout(r, 1000));
        return request<T>(endpoint, options, retries - 1);
      }

      throw new APIError(message, res.status, res.status >= 500 || res.status === 429);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof APIError) throw err;
    throw new APIError(
      'Unable to connect to Aura backend. Please ensure the server is running on port 8000.',
      0,
      true
    );
  }
}

export const api = {
  // ── Health ────────────────────────────────────────────────────
  async getHealth(): Promise<HealthStatus> {
    return request<HealthStatus>('/api/health');
  },

  // ── Conversations ─────────────────────────────────────────────
  async getHistory(sessionId = 'default'): Promise<Message[]> {
    return request<Message[]>(`/api/conversations?session_id=${encodeURIComponent(sessionId)}`);
  },

  async sendMessage(
    message: string,
    sessionId = 'default',
    systemInstruction?: string
  ): Promise<{
    message: string;
    role: string;
    session_id: string;
    model: string;
    is_mock: boolean;
    structured_actions: StructuredAction[];
    created_at: string;
  }> {
    return request('/api/conversations/chat', {
      method: 'POST',
      body: JSON.stringify({ message, session_id: sessionId, system_instruction: systemInstruction }),
    });
  },

  async clearHistory(sessionId = 'default'): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/conversations?session_id=${encodeURIComponent(sessionId)}`, {
      method: 'DELETE',
    });
  },

  // ── Tasks ─────────────────────────────────────────────────────
  async getTasks(status?: TaskStatus, category?: TaskCategory): Promise<Task[]> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (category) params.append('category', category);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<Task[]>(`/api/tasks${qs}`);
  },

  async createTask(data: {
    title: string;
    detail?: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    due_date?: string;
  }): Promise<Task> {
    return request<Task>('/api/tasks', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateTask(
    id: number,
    updates: { title?: string; detail?: string; status?: TaskStatus; category?: TaskCategory; priority?: TaskPriority; due_date?: string }
  ): Promise<Task> {
    return request<Task>(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async deleteTask(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/tasks/${id}`, { method: 'DELETE' });
  },

  // ── Notes ─────────────────────────────────────────────────────
  async getNotes(search?: string, tag?: string): Promise<Note[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (tag) params.append('tag', tag);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<Note[]>(`/api/notes${qs}`);
  },

  async createNote(data: { title: string; content: string; tags?: string }): Promise<Note> {
    return request<Note>('/api/notes', { method: 'POST', body: JSON.stringify(data) });
  },

  async updateNote(id: number, updates: { title?: string; content?: string; tags?: string }): Promise<Note> {
    return request<Note>(`/api/notes/${id}`, { method: 'PATCH', body: JSON.stringify(updates) });
  },

  async deleteNote(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/notes/${id}`, { method: 'DELETE' });
  },

  // ── Voice Dictation ───────────────────────────────────────────
  async dictateDay(text: string, sessionId = 'default'): Promise<{
    raw_text: string;
    summary: string;
    created_tasks: Task[];
    created_notes: Note[];
    spoken_summary: string;
  }> {
    return request('/api/voice/dictate', {
      method: 'POST',
      body: JSON.stringify({ text, session_id: sessionId }),
    });
  },

  // ── Planner ───────────────────────────────────────────────────
  async getPlannerToday(): Promise<Task[]> {
    return request<Task[]>('/api/planner/today');
  },

  async getPlannerWeek(): Promise<Task[]> {
    return request<Task[]>('/api/planner/week');
  },

  async getPlannerOverdue(): Promise<Task[]> {
    return request<Task[]>('/api/planner/overdue');
  },

  // ── Web Search ────────────────────────────────────────────────
  async searchWeb(query: string, maxResults = 5, saveAsNote = false): Promise<WebSearchResponse> {
    return request<WebSearchResponse>('/api/search', {
      method: 'POST',
      body: JSON.stringify({ query, max_results: maxResults, save_as_note: saveAsNote }),
    });
  },

  async getSearchStatus(): Promise<{ provider: string; is_configured: boolean; note?: string }> {
    return request('/api/search/status');
  },

  // ── Tool Calling ──────────────────────────────────────────────
  async invokeTool(tool: string, args: Record<string, unknown> = {}, confirmed = false): Promise<ToolResult> {
    return request<ToolResult>('/api/tools/invoke', {
      method: 'POST',
      body: JSON.stringify({ tool, args, confirmed }),
    });
  },

  async listTools(): Promise<{ tools: Record<string, unknown> }> {
    return request('/api/tools/list');
  },

  // ── Documents ─────────────────────────────────────────────────
  async getDocuments(tag?: string): Promise<Document[]> {
    const qs = tag ? `?tag=${encodeURIComponent(tag)}` : '';
    return request<Document[]>(`/api/documents${qs}`);
  },

  async createDocument(data: { title: string; content: string; source?: string; tags?: string }): Promise<Document> {
    return request<Document>('/api/documents', { method: 'POST', body: JSON.stringify(data) });
  },

  async searchDocuments(q: string, limit = 10): Promise<DocumentSearchResult[]> {
    return request<DocumentSearchResult[]>(
      `/api/documents/search?q=${encodeURIComponent(q)}&limit=${limit}`
    );
  },

  async deleteDocument(id: number): Promise<{ message: string }> {
    return request<{ message: string }>(`/api/documents/${id}`, { method: 'DELETE' });
  },
};

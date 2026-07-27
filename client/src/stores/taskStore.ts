import { create } from 'zustand';
import api from '../services/api';

export interface ActionLink {
  title: string;
  deepLink: string;
  badge?: string;
}

export type TaskCategory = 'ACTIONABLE' | 'FOCUS' | 'OUTING' | 'ADMIN';

export interface AgentTask {
  _id: string;
  title: string;
  description?: string;
  storedSummary?: string;
  category: TaskCategory;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags: string[];
  actionLinks: ActionLink[];
  displayOnMain: boolean;
  status: string;
  locationIntent?: string | string[];
}

interface TaskStore {
  tasks: AgentTask[];
  streamMessage: string;
  isStreaming: boolean;
  error: string | null;

  setTasks: (tasks: AgentTask[]) => void;
  addTasks: (tasks: AgentTask[]) => void;
  swipeOut: (id: string) => void;
  setStreamMessage: (message: string) => void;
  setStreaming: (streaming: boolean) => void;
  setError: (error: string | null) => void;
}

function sharesContext(a: AgentTask, b: AgentTask): boolean {
  if (a.category && b.category && a.category === b.category) return true;
  const aTags = new Set(a.tags || []);
  return (b.tags || []).some((tag) => aTags.has(tag));
}

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  streamMessage: '',
  isStreaming: false,
  error: null,

  setTasks: (tasks) => set({ tasks }),

  addTasks: (tasks) =>
    set((state) => {
      const existingIds = new Set(state.tasks.map((t) => t._id));
      const fresh = tasks.filter((t) => !existingIds.has(t._id));
      return { tasks: [...fresh, ...state.tasks] };
    }),

  swipeOut: (id) => {
    const { tasks } = get();
    const swiped = tasks.find((t) => t._id === id);
    if (!swiped) return;

    // Find the next backlog task that shares the same category or a tag and is
    // currently hidden from the main view, so we can float it up into the slot.
    const nextContextual = tasks.find(
      (t) =>
        t._id !== id &&
        !t.displayOnMain &&
        t.status === 'open' &&
        sharesContext(swiped, t)
    );

    // Optimistically update the store: hide the swiped card, reveal the next.
    set({
      tasks: tasks.map((t) => {
        if (t._id === id) return { ...t, displayOnMain: false };
        if (nextContextual && t._id === nextContextual._id) {
          return { ...t, displayOnMain: true };
        }
        return t;
      }),
    });

    // Persist the change in MongoDB (do NOT delete the task).
    api
      .put(`/tasks/${id}`, { displayOnMain: false })
      .catch((err) => {
        console.error('Failed to persist swipe-out:', err?.message);
        // Roll back on failure.
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t._id === id ? { ...t, displayOnMain: true } : t
          ),
        }));
      });

    if (nextContextual) {
      api
        .put(`/tasks/${nextContextual._id}`, { displayOnMain: true })
        .catch((err) => console.error('Failed to float next task:', err?.message));
    }
  },

  setStreamMessage: (message) => set({ streamMessage: message }),
  setStreaming: (streaming) => set({ isStreaming: streaming }),
  setError: (error) => set({ error }),
}));

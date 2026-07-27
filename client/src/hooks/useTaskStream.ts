import { useCallback, useRef } from 'react';
import api from '../services/api';
import { useTaskStore, AgentTask } from '../stores/taskStore';

interface SSEEvent {
  event: string;
  data: any;
}

function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem('auth-storage');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed.state?.token || null;
  } catch {
    return null;
  }
}

/**
 * Parse a raw SSE chunk buffer into discrete events. Returns the parsed events
 * plus any trailing partial text that should be carried into the next read.
 */
function parseSSEBuffer(buffer: string): { events: SSEEvent[]; rest: string } {
  const events: SSEEvent[] = [];
  const blocks = buffer.split('\n\n');
  // The last block may be incomplete; keep it for the next iteration.
  const rest = blocks.pop() ?? '';

  for (const block of blocks) {
    if (!block.trim()) continue;
    let event = 'message';
    let data = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event:')) event = line.slice(6).trim();
      else if (line.startsWith('data:')) data += line.slice(5).trim();
    }
    let parsed: any = data;
    try {
      parsed = JSON.parse(data);
    } catch {
      // leave as raw string
    }
    events.push({ event, data: parsed });
  }

  return { events, rest };
}

export function useTaskStream() {
  const { setStreaming, setStreamMessage, addTasks, setError } = useTaskStore();
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(
    async (prompt: string) => {
      const trimmed = prompt.trim();
      if (!trimmed) return;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setStreaming(true);
      setStreamMessage('מעבד משימות...');

      const baseURL = api.defaults.baseURL || 'http://localhost:5000/api';
      const token = getAuthToken();

      try {
        const res = await fetch(`${baseURL}/tasks/ai-parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt: trimmed }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`Request failed with status ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const { events, rest } = parseSSEBuffer(buffer);
          buffer = rest;

          for (const { event, data } of events) {
            if (event === 'progress') {
              setStreamMessage(data?.message || '');
            } else if (event === 'success') {
              const tasks: AgentTask[] = data?.tasks || [];
              addTasks(tasks);
              setStreaming(false);
            } else if (event === 'error') {
              setError(data?.message || 'שגיאה בעיבוד המשימות');
              setStreaming(false);
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          setError(err?.message || 'שגיאה בחיבור לשרת');
        }
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [setStreaming, setStreamMessage, addTasks, setError]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, [setStreaming]);

  return { submit, cancel };
}

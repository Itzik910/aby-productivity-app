import { useCallback, useRef } from 'react';
import api, { refreshAuthToken, forceLogout } from '../services/api';
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
    async (prompt: string, options?: { forceMultiple?: boolean }): Promise<AgentTask[] | undefined> => {
      const trimmed = prompt.trim();
      if (!trimmed) return undefined;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setError(null);
      setStreaming(true);
      setStreamMessage('מעבד משימות...');

      const baseURL = api.defaults.baseURL || 'http://localhost:5000/api';

      // Raw fetch() (needed to consume the SSE body) doesn't go through the
      // axios `api` instance's 401 → refresh-token → retry interceptor, so
      // the 15-minute access token expiring would otherwise fail this call
      // even while every other axios-backed request in the app keeps working
      // transparently. Mirror that same refresh-once-and-retry behavior here.
      const doFetch = (token: string | null) =>
        fetch(`${baseURL}/tasks/ai-parse`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ prompt: trimmed, forceSplit: !!options?.forceMultiple }),
          signal: controller.signal,
        });

      let createdTasks: AgentTask[] | undefined;

      try {
        let res = await doFetch(getAuthToken());

        if (res.status === 401) {
          try {
            const newToken = await refreshAuthToken();
            res = await doFetch(newToken);
          } catch {
            forceLogout();
            throw new Error('Your session expired — please sign in again');
          }
        }

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
              createdTasks = tasks;
              addTasks(tasks);
              setStreaming(false);
              // Same signal CreateTaskModal already dispatches, so any page
              // listening for it (CalendarPage, and the new mobile Today/
              // Tasks tabs) refetches and picks up the newly created tasks.
              window.dispatchEvent(new CustomEvent('taskCreated'));
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

      return createdTasks;
    },
    [setStreaming, setStreamMessage, addTasks, setError]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, [setStreaming]);

  return { submit, cancel };
}

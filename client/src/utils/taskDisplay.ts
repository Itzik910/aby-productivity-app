// Shared helpers for the mobile Today/Tasks/Calendar screens. All of them
// work off the classic Task shape returned by GET /tasks (the same one
// TasksPage.tsx and CalendarPage.tsx already fetch), not the agentic
// AgentTask shape used by the Dashboard's swipe-deck.

export interface MobileTaskStep {
  _id?: string;
  title: string;
  isCompleted: boolean;
  order: number;
}

export interface MobileTask {
  _id: string;
  title: string;
  description?: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  dueDate: string;
  estimatedDuration?: number;
  steps: MobileTaskStep[];
  /** Swipe-to-postpone: hides the task from Today's list until this passes. */
  hiddenUntil?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  work: '#3B82F6',
  personal: '#A855F7',
  health: '#EF4444',
  learning: '#7C3AED',
  social: '#EC4899',
  finance: '#F59E0B',
  home: '#6366F1',
  other: '#14B8A6',
  ACTIONABLE: '#6366F1',
  FOCUS: '#7C3AED',
  OUTING: '#14B8A6',
  ADMIN: '#F59E0B',
};

export function categoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#6366F1';
}

const PRIORITY_BADGE: Record<string, { bg: string; fg: string }> = {
  urgent: { bg: '#FEECEC', fg: '#DC2626' },
  high: { bg: '#FEECEC', fg: '#DC2626' },
  medium: { bg: '#FEF4E2', fg: '#A15C07' },
  low: { bg: '#F3F1FA', fg: '#6B6580' },
};

export function priorityBadge(priority: string) {
  return PRIORITY_BADGE[priority] || PRIORITY_BADGE.low;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export type TaskBucket = 'overdue' | 'today' | 'later';

export function taskBucket(task: MobileTask, now: Date = new Date()): TaskBucket {
  const due = new Date(task.dueDate);
  if (task.status !== 'completed' && due < now && !isSameDay(due, now)) return 'overdue';
  if (isSameDay(due, now)) return 'today';
  return 'later';
}

export function formatTaskTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function isTaskDone(task: MobileTask): boolean {
  return task.status === 'completed';
}

/** True while a "swipe right" postpone is still in effect (before the next day starts). */
export function isHiddenNow(task: MobileTask, now: Date = new Date()): boolean {
  return !!task.hiddenUntil && new Date(task.hiddenUntil) > now;
}

/** Midnight at the start of the day after `from` — used to postpone a task "until tomorrow". */
export function startOfNextDay(from: Date = new Date()): Date {
  const next = new Date(from.getFullYear(), from.getMonth(), from.getDate() + 1);
  return next;
}

// Preferred display order: agentic categories first (ACTIONABLE/FOCUS/OUTING/
// ADMIN, used by AI-parsed tasks), then classic categories (used by manually
// created tasks). Anything else falls back to first-appearance order.
const CATEGORY_ORDER = [
  'ACTIONABLE',
  'ADMIN',
  'FOCUS',
  'OUTING',
  'work',
  'personal',
  'health',
  'learning',
  'social',
  'finance',
  'home',
  'other',
];

export function categoryLabel(category: string): string {
  return category.length ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase() : category;
}

export interface CategoryGroup {
  category: string;
  items: MobileTask[];
}

/** Groups tasks by category, ordered per CATEGORY_ORDER then by first appearance. */
export function groupByCategory(tasks: MobileTask[]): CategoryGroup[] {
  const seen: string[] = [];
  const byCategory = new Map<string, MobileTask[]>();
  for (const task of tasks) {
    if (!byCategory.has(task.category)) {
      byCategory.set(task.category, []);
      seen.push(task.category);
    }
    byCategory.get(task.category)!.push(task);
  }
  const ordered = [
    ...CATEGORY_ORDER.filter((c) => byCategory.has(c)),
    ...seen.filter((c) => !CATEGORY_ORDER.includes(c)),
  ];
  return ordered.map((category) => ({ category, items: byCategory.get(category)! }));
}

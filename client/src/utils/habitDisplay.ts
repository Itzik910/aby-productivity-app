export interface Habit {
  _id: string;
  title: string;
  emoji: string;
  color: string;
  currentStreak: number;
  longestStreak: number;
  completedDates: string[];
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function isDoneToday(habit: Habit): boolean {
  return habit.completedDates.includes(isoDate(new Date()));
}

/** Oldest -> newest, 7 booleans for the last 7 days including today. */
export function last7Days(habit: Habit): boolean[] {
  const days: boolean[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(habit.completedDates.includes(isoDate(d)));
  }
  return days;
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Flame, X, Check, Loader2, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { last7Days } from '../utils/habitDisplay';
import HabitCheckRing from '../components/mobile/HabitCheckRing';

interface Habit {
  _id: string;
  title: string;
  description?: string;
  frequency: string;
  daysOfWeek?: number[];
  preferredTime?: string;
  category: string;
  color: string;
  emoji: string;
  completedDates: string[];
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
}

const LAST_N_DAYS = 21;

const getLast21Days = () => {
  const days: string[] = [];
  for (let i = LAST_N_DAYS - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
};

const HabitsPage: React.FC = () => {
  const { t } = useTranslation();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newHabit, setNewHabit] = useState({ title: '', emoji: '⭐', color: '#7c3aed', frequency: 'daily', category: 'personal', daysOfWeek: [] as number[], preferredTime: '' });
  const [saving, setSaving] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const days = getLast21Days();
  const today = days[days.length - 1];

  useEffect(() => {
    fetchHabits();
  }, []);

  const fetchHabits = async () => {
    try {
      const res = await api.get('/habits');
      setHabits(res.data.habits || []);
    } catch {
      toast.error('Failed to load habits');
    } finally {
      setLoading(false);
    }
  };

  const toggleToday = async (habit: Habit) => {
    const isDone = habit.completedDates.includes(today);
    setTogglingId(habit._id);
    try {
      if (isDone) {
        await api.delete(`/habits/${habit._id}/complete`);
      } else {
        await api.post(`/habits/${habit._id}/complete`);
      }
      await fetchHabits();
    } catch {
      toast.error('Failed to update habit');
    } finally {
      setTogglingId(null);
    }
  };

  const createHabit = async () => {
    if (!newHabit.title.trim()) return;
    setSaving(true);
    try {
      await api.post('/habits', newHabit);
      setNewHabit({ title: '', emoji: '⭐', color: '#7c3aed', frequency: 'daily', category: 'personal', daysOfWeek: [], preferredTime: '' });
      setShowCreate(false);
      await fetchHabits();
      toast.success('Habit created!');
    } catch {
      toast.error('Failed to create habit');
    } finally {
      setSaving(false);
    }
  };

  const deleteHabit = async (id: string) => {
    try {
      await api.delete(`/habits/${id}`);
      setHabits((prev) => prev.filter((h) => h._id !== id));
      toast.success('Habit removed');
    } catch {
      toast.error('Failed to delete habit');
    }
  };

  const EMOJIS = ['⭐', '💪', '📚', '🏃', '💧', '😴', '🧘', '🥗', '✍️', '🎵', '🎯', '💊'];
  const COLORS = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#06b6d4', '#8b5cf6'];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 pt-12 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <>
      {/* ---------- Mobile card layout ---------- */}
      <div className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
        <div className="px-5 pt-4">
          <div className="flex items-center justify-between">
            <h1 className="text-[21px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.habits.title')}</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="h-[42px] rounded-2xl bg-aby-violet px-4 text-[13px] font-bold text-white"
            >
              {t('mobile.habits.newHabit')}
            </button>
          </div>

          {habits.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-aby-line py-14 text-center dark:border-aby-line-dark">
              <div className="mb-3 text-5xl">🌱</div>
              <p className="text-sm font-medium text-aby-muted dark:text-aby-muted-dark">{t('mobile.tasks.empty')}</p>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-3">
              {habits.map((habit) => {
                const doneToday = habit.completedDates.includes(today);
                return (
                  <div
                    key={habit._id}
                    className="rounded-[20px] border border-aby-line bg-aby-card p-3.5 dark:border-aby-line-dark dark:bg-aby-card-dark"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-2xl text-xl"
                        style={{ background: `${habit.color}1F` }}
                      >
                        {habit.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-bold text-aby-ink dark:text-aby-ink-dark">{habit.title}</p>
                        <p
                          className="mt-0.5 text-xs font-semibold"
                          style={{ color: habit.currentStreak > 0 ? '#EA7C1B' : undefined }}
                        >
                          {habit.currentStreak > 0
                            ? t('mobile.habits.streakBest', { n: habit.currentStreak, best: habit.longestStreak })
                            : t('mobile.habits.startAgain', { best: habit.longestStreak })}
                        </p>
                      </div>
                      <HabitCheckRing
                        done={doneToday}
                        color={habit.color}
                        disabled={togglingId === habit._id}
                        onToggle={() => toggleToday(habit)}
                      />
                    </div>
                    <div className="mt-3 flex gap-1.5">
                      {last7Days(habit).map((done, i) => (
                        <span
                          key={i}
                          className="h-[22px] flex-1 rounded-[7px]"
                          style={{ background: done ? habit.color : '#EFECF7', opacity: done ? 0.9 : 1 }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Desktop layout (unchanged) ---------- */}
      <div className="hidden min-h-screen bg-gray-50 pt-14 pb-20 md:block">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Habits</h1>
            <p className="text-gray-500 mt-1">Track your daily habits and build streaks</p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Habit
          </button>
        </div>

        {/* Day column headers */}
        {habits.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
            {/* Day headers */}
            <div className="flex border-b border-gray-100 px-4 py-2">
              <div className="w-48 flex-shrink-0" />
              <div className="flex-1 flex gap-0.5 overflow-x-auto scrollbar-hide">
                {days.map((d) => {
                  const date = new Date(d + 'T12:00:00');
                  const dayName = date.toLocaleDateString('en', { weekday: 'narrow' });
                  const dayNum = date.getDate();
                  const isToday = d === today;
                  return (
                    <div key={d} className={`flex-1 min-w-[28px] flex flex-col items-center gap-0.5 ${isToday ? 'text-purple-600 font-bold' : 'text-gray-400'}`}>
                      <span className="text-[10px] uppercase">{dayName}</span>
                      <span className="text-xs">{dayNum}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Habit rows */}
            {habits.map((habit) => {
              const doneToday = habit.completedDates.includes(today);
              return (
                <div key={habit._id} className="flex items-center border-b border-gray-50 last:border-0 px-4 py-3 hover:bg-gray-50 group">
                  <div className="w-48 flex-shrink-0 flex items-center gap-2 pr-4">
                    <span className="text-xl">{habit.emoji}</span>
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">{habit.title}</div>
                      <div className="flex items-center gap-1 text-xs text-orange-500">
                        <Flame className="w-3 h-3" />
                        <span>{habit.currentStreak} day streak</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex gap-0.5 overflow-x-auto scrollbar-hide">
                    {days.map((d) => {
                      const done = habit.completedDates.includes(d);
                      const isToday = d === today;
                      return (
                        <div key={d} className="flex-1 min-w-[28px] flex items-center justify-center">
                          {isToday ? (
                            <button
                              onClick={() => toggleToday(habit)}
                              disabled={togglingId === habit._id}
                              className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                                done
                                  ? 'text-white ring-2 ring-offset-1'
                                  : 'border-2 border-dashed border-gray-300 hover:border-purple-400'
                              }`}
                              style={done ? { backgroundColor: habit.color } : {}}
                            >
                              {done ? <Check className="w-3.5 h-3.5" /> : null}
                            </button>
                          ) : (
                            <div
                              className="w-5 h-5 rounded-md"
                              style={{ backgroundColor: done ? habit.color : '#f3f4f6', opacity: done ? 0.85 : 1 }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => deleteHabit(habit._id)}
                    className="opacity-0 group-hover:opacity-100 ml-2 text-gray-300 hover:text-red-500 transition-all flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {habits.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌱</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No habits yet</h3>
            <p className="text-gray-500 mb-6">Start tracking a daily habit and build your streaks.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700"
            >
              Create first habit
            </button>
          </div>
        )}

        {/* Streak summary */}
        {habits.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {habits.filter((h) => h.currentStreak > 0).slice(0, 4).map((h) => (
              <div key={h._id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="text-2xl mb-1">{h.emoji}</div>
                <div className="text-sm font-medium text-gray-900 truncate">{h.title}</div>
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <span className="text-lg font-bold" style={{ color: h.color }}>{h.currentStreak}</span>
                  <span className="text-xs text-gray-400">days</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">best: {h.longestStreak}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create habit modal */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-gray-900">New Habit</h2>
                <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-gray-400" /></button>
              </div>

              <div className="space-y-4">
                <input
                  value={newHabit.title}
                  onChange={(e) => setNewHabit({ ...newHabit, title: e.target.value })}
                  placeholder="Habit name (e.g. Drink water)"
                  autoFocus
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none text-sm"
                />

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setNewHabit({ ...newHabit, emoji: e })}
                        className={`text-xl p-1.5 rounded-lg transition-all ${newHabit.emoji === e ? 'bg-purple-100 ring-2 ring-purple-400' : 'hover:bg-gray-100'}`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewHabit({ ...newHabit, color: c })}
                        className={`w-7 h-7 rounded-full transition-all ${newHabit.color === c ? 'ring-2 ring-offset-2 ring-gray-600 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Frequency</label>
                    <select
                      value={newHabit.frequency}
                      onChange={(e) => setNewHabit({ ...newHabit, frequency: e.target.value, daysOfWeek: [] })}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekdays">Weekdays</option>
                      <option value="weekends">Weekends</option>
                      <option value="custom">Custom days</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Time</label>
                    <input
                      type="time"
                      value={newHabit.preferredTime}
                      onChange={(e) => setNewHabit({ ...newHabit, preferredTime: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {newHabit.frequency === 'custom' && (
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-2">Days of week</label>
                    <div className="flex gap-1">
                      {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => {
                        const selected = newHabit.daysOfWeek.includes(i);
                        return (
                          <button
                            key={i}
                            type="button"
                            onClick={() => {
                              const days = selected
                                ? newHabit.daysOfWeek.filter((d) => d !== i)
                                : [...newHabit.daysOfWeek, i];
                              setNewHabit({ ...newHabit, daysOfWeek: days });
                            }}
                            className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                              selected
                                ? 'text-white'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                            }`}
                            style={selected ? { backgroundColor: newHabit.color } : {}}
                          >
                            {day}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">Category</label>
                    <select
                      value={newHabit.category}
                      onChange={(e) => setNewHabit({ ...newHabit, category: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500"
                    >
                      {['health', 'learning', 'work', 'personal', 'social', 'other'].map((c) => (
                        <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                      ))}
                    </select>
                  </div>

                <button
                  onClick={createHabit}
                  disabled={!newHabit.title.trim() || saving}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium text-sm hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create Habit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </>
  );
};

export default HabitsPage;

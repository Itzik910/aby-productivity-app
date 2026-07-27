import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Navigation, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { useLanguageStore } from '../stores/languageStore';
import { useTaskStore, AgentTask } from '../stores/taskStore';
import HeroInput from '../components/HeroInput';
import TaskCard from '../components/TaskCard';
import FixMyDayModal from '../components/FixMyDayModal';

const DashboardPage: React.FC = () => {
  const { isRtl } = useLanguageStore();
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);
  const [loading, setLoading] = useState(true);
  const [showFixMyDay, setShowFixMyDay] = useState(false);

  const visibleTasks = tasks.filter((t) => t.displayOnMain);

  // Load the user's open tasks into the agentic task store.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/tasks?status=open&limit=50&sortBy=createdAt&sortOrder=desc');
        if (cancelled) return;
        const mapped: AgentTask[] = (res.data?.tasks || []).map((t: any) => ({
          _id: t._id,
          title: t.title,
          description: t.description,
          storedSummary: t.storedSummary,
          category: t.category,
          priority: t.priority,
          tags: t.tags || [],
          actionLinks: t.actionLinks || [],
          displayOnMain: t.displayOnMain !== false,
          status: t.status,
          locationIntent: t.locationIntent,
        }));
        setTasks(mapped);
      } catch {
        // Non-fatal: the Hero input still works without preloaded tasks.
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setTasks]);

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="min-h-screen bg-neutral-50 pt-12 pb-16 dark:bg-neutral-900"
    >
      <div className="mx-auto w-full max-w-2xl px-4 py-6">
        {/* Hero — Prompt-First */}
        <HeroInput />

        {/* Open tasks (Rich Cards) */}
        <div className="mt-8">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-50">
              המשימות הפתוחות שלך
            </h2>
            <span className="text-xs font-medium text-neutral-400">Rich Cards</span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 py-12 text-neutral-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">טוען משימות...</span>
            </div>
          ) : visibleTasks.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              <AnimatePresence mode="popLayout">
                {visibleTasks.map((task) => (
                  <TaskCard key={task._id} task={task} />
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-12 text-center dark:border-neutral-700">
              <Sparkles className="mx-auto mb-3 h-10 w-10 text-primary-400" />
              <p className="font-medium text-neutral-600 dark:text-neutral-300">
                אין משימות פתוחות כרגע
              </p>
              <p className="mt-1 text-sm text-neutral-400">
                כתוב מה בא לך לעשות בשורת הפרומפט למעלה
              </p>
            </div>
          )}
        </div>

        {/* Fix My Day banner */}
        <button
          onClick={() => setShowFixMyDay(true)}
          className="mt-8 flex w-full items-center gap-4 rounded-2xl bg-gradient-to-r from-teal-500 to-green-500 p-4 text-start text-white shadow-soft transition-transform active:scale-[0.99]"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
            <Navigation className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-bold">Fix My Day</h3>
            <p className="text-sm text-white/85">
              נסדר עבורך את המסלול היעיל ביותר ליום — ניווט, זמנים והמלצות
            </p>
          </div>
        </button>
      </div>

      {/* Fix My Day Modal */}
      <FixMyDayModal isOpen={showFixMyDay} onClose={() => setShowFixMyDay(false)} />
    </div>
  );
};

export default DashboardPage;

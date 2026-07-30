import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Sparkles, Navigation, Loader2, Check } from 'lucide-react';
import { api } from '../services/api';
import { useLanguageStore } from '../stores/languageStore';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore, AgentTask } from '../stores/taskStore';
import { useMobileUiStore } from '../stores/mobileUiStore';
import HeroInput from '../components/HeroInput';
import TaskCard from '../components/TaskCard';
import FixMyDayModal from '../components/FixMyDayModal';
import MobileTaskRow from '../components/mobile/MobileTaskRow';
import { MobileTask, isSameDay, priorityBadge, formatTaskTime, isTaskDone } from '../utils/taskDisplay';

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const user = useAuthStore((s) => s.user);
  const tasks = useTaskStore((s) => s.tasks);
  const setTasks = useTaskStore((s) => s.setTasks);
  const [loading, setLoading] = useState(true);
  const [showFixMyDay, setShowFixMyDay] = useState(false);
  const openCompose = useMobileUiStore((s) => s.openCompose);
  const openDetail = useMobileUiStore((s) => s.openDetail);

  // Mobile Today tab needs the classic Task shape (dueDate/steps/priority) —
  // the agentic AgentTask feed below doesn't carry those fields.
  const [mobileTasks, setMobileTasks] = useState<MobileTask[]>([]);
  const [mobileLoading, setMobileLoading] = useState(true);

  const visibleTasks = tasks.filter((t) => t.displayOnMain);

  const fetchMobileTasks = useCallback(async () => {
    try {
      const res = await api.get('/tasks');
      setMobileTasks(res.data?.tasks || []);
    } catch {
      // Non-fatal.
    } finally {
      setMobileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMobileTasks();
    window.addEventListener('taskCreated', fetchMobileTasks);
    return () => window.removeEventListener('taskCreated', fetchMobileTasks);
  }, [fetchMobileTasks]);

  const toggleTask = async (task: MobileTask) => {
    const done = isTaskDone(task);
    setMobileTasks((prev) =>
      prev.map((x) => (x._id === task._id ? { ...x, status: done ? 'pending' : 'completed' } : x))
    );
    try {
      if (done) {
        await api.put(`/tasks/${task._id}`, { status: 'pending' });
      } else {
        await api.patch(`/tasks/${task._id}/complete`);
      }
    } catch {
      fetchMobileTasks();
    }
  };

  // Load the user's open tasks into the agentic task store (desktop feed).
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

  const now = new Date();
  const todayTasks = mobileTasks.filter((mt) => isSameDay(new Date(mt.dueDate), now));
  const doneCount = todayTasks.filter(isTaskDone).length;
  const totalCount = todayTasks.length;
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0;
  const openToday = todayTasks.filter((mt) => !isTaskDone(mt));
  const nowTask = openToday[0];
  const upNext = openToday.slice(1);
  const streak = user?.stats?.currentStreak || 0;
  const nowBadge = nowTask ? priorityBadge(nowTask.priority) : null;

  const dateLine = now
    .toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();
  const hour = now.getHours();
  const greetKey = hour < 12 ? 'greeting_morning' : hour < 18 ? 'greeting_afternoon' : 'greeting_evening';

  return (
    <>
      {/* ---------- Mobile Today tab ---------- */}
      <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
        <div className="px-5 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wide text-aby-muted dark:text-aby-muted-dark">
                {dateLine}
              </div>
              <h1 className="mt-0.5 text-[23px] font-extrabold text-aby-ink dark:text-aby-ink-dark">
                {t(`dashboard.${greetKey}`)}
              </h1>
            </div>
            <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#EDE8FE] text-[15px] font-extrabold text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
              {(user?.name || '?').charAt(0).toUpperCase()}
            </div>
          </div>

          {/* Progress card */}
          <div
            className="mt-4 rounded-[22px] p-[18px] text-white shadow-[0_14px_30px_-14px_rgba(91,75,224,0.7)]"
            style={{ background: 'linear-gradient(135deg,#5B4BE0 0%,#6C4AE4 55%,#4436C6 100%)' }}
          >
            <div className="flex items-center gap-4">
              <div
                className="relative flex h-[74px] w-[74px] shrink-0 items-center justify-center rounded-full"
                style={{ background: `conic-gradient(#7BF1A8 ${Math.round(pct * 3.6)}deg, rgba(255,255,255,.22) 0)` }}
              >
                <div className="flex h-[58px] w-[58px] items-center justify-center rounded-full bg-[#5F4DE2] text-base font-extrabold">
                  {pct}%
                </div>
              </div>
              <div className="min-w-0">
                <div className="text-[17px] font-extrabold leading-tight">
                  {t('mobile.today.doneOf', { done: doneCount, total: totalCount })}
                </div>
                <div className="mt-0.5 text-[13px] font-medium text-white/75">{t('mobile.today.smallSteps')}</div>
                {streak > 0 && (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold">{t('mobile.today.streak', { n: streak })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Ask ABY bar */}
          <button
            data-tour="ask-bar"
            onClick={openCompose}
            className="mt-3.5 flex h-14 w-full items-center gap-3 rounded-[18px] border border-aby-line bg-aby-card px-2.5 shadow-sm dark:border-aby-line-dark dark:bg-aby-card-dark"
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
              <Sparkles className="h-[19px] w-[19px]" />
            </span>
            <span className="flex-1 truncate text-start text-[14.5px] font-medium text-aby-sub dark:text-aby-sub-dark">
              {t('mobile.today.askPlaceholder')}
            </span>
            <span className="shrink-0 rounded-xl bg-aby-ink px-3.5 py-2 text-[12.5px] font-bold text-white dark:bg-white dark:text-aby-ink">
              {t('mobile.today.ask')}
            </span>
          </button>

          {mobileLoading ? (
            <div className="flex items-center justify-center gap-2 py-14 text-aby-muted dark:text-aby-muted-dark">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-between pb-2.5 pt-6">
                <span className="text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
                  {t('mobile.today.upNow')}
                </span>
                <span className="text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">
                  {t('mobile.today.openCount', { n: openToday.length })}
                </span>
              </div>

              {nowTask ? (
                <div
                  data-tour="up-now"
                  className="rounded-[20px] border border-aby-line bg-aby-card p-4 shadow-sm dark:border-aby-line-dark dark:bg-aby-card-dark"
                >
                  <div className="mb-2.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-[9px] w-[9px] rounded-full bg-indigo-500" />
                      <span className="text-xs font-bold text-aby-sub dark:text-aby-sub-dark">{nowTask.category}</span>
                    </div>
                    <span
                      className="rounded-lg px-2.5 py-1 text-[11px] font-bold"
                      style={{ background: nowBadge?.bg, color: nowBadge?.fg }}
                    >
                      {t(`tasks.${nowTask.priority}`)}
                    </span>
                  </div>
                  <h3 className="text-lg font-extrabold leading-tight text-aby-ink dark:text-aby-ink-dark">
                    {nowTask.title}
                  </h3>
                  <p className="mt-1 text-[13px] font-medium text-aby-sub dark:text-aby-sub-dark">
                    {formatTaskTime(nowTask.dueDate)}
                    {nowTask.estimatedDuration ? ` · ${nowTask.estimatedDuration} min` : ''}
                  </p>
                  <div className="mt-3.5 flex gap-2.5">
                    <button
                      onClick={() => openDetail(nowTask._id)}
                      className="h-[50px] flex-1 rounded-2xl bg-aby-violet text-[15px] font-bold text-white"
                    >
                      {t('mobile.today.open')}
                    </button>
                    <button
                      onClick={() => toggleTask(nowTask)}
                      aria-label={t('tasks.complete')}
                      className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-2xl border border-aby-line text-green-500 dark:border-aby-line-dark"
                    >
                      <Check className="h-[22px] w-[22px]" strokeWidth={2.4} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-aby-line py-10 text-center text-sm font-medium text-aby-muted dark:border-aby-line-dark dark:text-aby-muted-dark">
                  {t('mobile.today.empty')}
                </div>
              )}

              {upNext.length > 0 && (
                <div className="pt-5">
                  <div className="mb-2.5 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
                    {t('mobile.today.then')}
                  </div>
                  <div className="flex flex-col gap-2.5">
                    {upNext.map((mt) => (
                      <MobileTaskRow
                        key={mt._id}
                        task={mt}
                        onToggle={() => toggleTask(mt)}
                        onOpen={() => openDetail(mt._id)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          <button
            onClick={() => setShowFixMyDay(true)}
            className="mt-7 mb-7 flex w-full items-center gap-3.5 rounded-2xl p-4 text-start text-white"
            style={{ background: 'linear-gradient(100deg,#0EA5A0,#22C55E)' }}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur">
              <Navigation className="h-[22px] w-[22px]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold">{t('mobile.today.fixTitle')}</h3>
              <p className="mt-0.5 text-xs font-medium text-white/85">{t('mobile.today.fixSub')}</p>
            </div>
          </button>
        </div>
      </div>

      {/* ---------- Desktop / agentic feed (unchanged) ---------- */}
      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        className="hidden min-h-screen bg-neutral-50 pt-12 pb-16 dark:bg-neutral-900 md:block"
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
      </div>

      {/* Fix My Day Modal — shared trigger for both layouts */}
      <FixMyDayModal isOpen={showFixMyDay} onClose={() => setShowFixMyDay(false)} />
    </>
  );
};

export default DashboardPage;

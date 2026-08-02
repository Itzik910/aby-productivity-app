import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Check, Loader2, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguageStore } from '../../stores/languageStore';
import { useMobileUiStore } from '../../stores/mobileUiStore';
import BottomSheet from './BottomSheet';
import AbyItModal from '../AbyItModal';
import { MobileTask, categoryColor, priorityBadge, formatTaskTime, isTaskDone } from '../../utils/taskDisplay';

/**
 * Global task-detail bottom sheet shared by the mobile Today, Tasks and
 * Calendar tabs. Self-fetches the task by id (rather than requiring the
 * opening page to pass one in) so any of those tabs can open it the same
 * way via mobileUiStore.openDetail(id).
 */
const TaskDetailSheet: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const isOpen = useMobileUiStore((s) => s.sheet === 'detail');
  const taskId = useMobileUiStore((s) => s.detailTaskId);
  const closeSheet = useMobileUiStore((s) => s.closeSheet);
  const [task, setTask] = useState<MobileTask | null>(null);
  const [loading, setLoading] = useState(false);
  const [showAbyIt, setShowAbyIt] = useState(false);

  useEffect(() => {
    setShowAbyIt(false);
    if (!isOpen || !taskId) {
      setTask(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api
      .get(`/tasks/${taskId}`)
      .then((res) => {
        if (!cancelled) setTask(res.data);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, taskId]);

  const refresh = () => window.dispatchEvent(new CustomEvent('taskCreated'));

  const toggleStep = async (index: number) => {
    if (!task) return;
    const step = task.steps[index];
    const path = step.isCompleted ? 'uncomplete' : 'complete';
    try {
      const res = await api.patch(`/tasks/${task._id}/steps/${index}/${path}`);
      setTask(res.data);
      refresh();
    } catch {
      // Non-fatal — the sheet just keeps its previous state.
    }
  };

  const markDone = async () => {
    if (!task) return;
    try {
      const res = await api.patch(`/tasks/${task._id}/complete`);
      setTask(res.data);
      refresh();
      closeSheet();
    } catch {
      // Non-fatal.
    }
  };

  const done = task ? isTaskDone(task) : false;
  const badge = task ? priorityBadge(task.priority) : null;

  const abyItSummary = (() => {
    if (!task?.abyIt || task.abyIt.status === 'idle') return null;
    if (task.abyIt.status === 'awaiting_answer') return t('mobile.abyIt.askedTitle');
    if (task.abyIt.mode === 'location') return task.abyIt.locationSuggestion?.summary || t('mobile.abyIt.locationTitle');
    return t('mobile.abyIt.breakdownTitle');
  })();

  return (
    <BottomSheet isOpen={isOpen} onClose={closeSheet} maxHeight="80vh">
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {loading || !task ? (
          <div className="flex items-center justify-center py-16 text-aby-muted dark:text-aby-muted-dark">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-start gap-3">
              <span
                className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl"
                style={{ background: `${categoryColor(task.category)}1F` }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: categoryColor(task.category) }} />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="text-[19px] font-extrabold leading-tight text-aby-ink dark:text-aby-ink-dark">{task.title}</h2>
                <p className="mt-1 text-xs font-medium text-aby-muted dark:text-aby-muted-dark">
                  {formatTaskTime(task.dueDate)}
                  {task.estimatedDuration ? ` · ${task.estimatedDuration} min` : ''}
                </p>
              </div>
              <button
                onClick={closeSheet}
                className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[11px] bg-aby-page text-aby-sub dark:bg-aby-page-dark dark:text-aby-sub-dark"
              >
                <X className="h-[17px] w-[17px]" />
              </button>
            </div>

            {task.description && (
              <p className="mt-3 text-sm leading-relaxed text-aby-sub dark:text-aby-sub-dark">{task.description}</p>
            )}

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-aby-line bg-aby-page p-2.5 dark:border-aby-line-dark dark:bg-aby-page-dark">
                <div className="text-[10.5px] font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.sheet.due')}</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-aby-ink dark:text-aby-ink-dark">{formatTaskTime(task.dueDate)}</div>
              </div>
              <div className="rounded-2xl border border-aby-line bg-aby-page p-2.5 dark:border-aby-line-dark dark:bg-aby-page-dark">
                <div className="text-[10.5px] font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.sheet.effort')}</div>
                <div className="mt-0.5 text-[13.5px] font-bold text-aby-ink dark:text-aby-ink-dark">
                  {task.estimatedDuration ? `${task.estimatedDuration} min` : '—'}
                </div>
              </div>
              <div className="rounded-2xl border border-aby-line bg-aby-page p-2.5 dark:border-aby-line-dark dark:bg-aby-page-dark">
                <div className="text-[10.5px] font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.sheet.priority')}</div>
                <div className="mt-0.5 text-[13.5px] font-bold" style={{ color: badge?.fg }}>
                  {t(`tasks.${task.priority}`)}
                </div>
              </div>
            </div>

            <div className="mt-4">
              {abyItSummary ? (
                <button
                  onClick={() => setShowAbyIt(true)}
                  className="flex w-full items-start gap-2.5 rounded-2xl border border-aby-violet/30 bg-[#EDE8FE]/60 p-3 text-start dark:bg-[#2E2A4A]/60"
                >
                  <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-aby-violet dark:text-aby-violet-dark" />
                  <span className="line-clamp-2 min-w-0 flex-1 text-xs font-semibold leading-relaxed text-aby-ink dark:text-aby-ink-dark">
                    {abyItSummary}
                  </span>
                </button>
              ) : (
                <button
                  onClick={() => setShowAbyIt(true)}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-aby-violet/40 text-sm font-bold text-aby-violet dark:text-aby-violet-dark"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('mobile.abyIt.button')}
                </button>
              )}
            </div>

            {task.steps.length > 0 && (
              <>
                <div className="mb-2.5 mt-5 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
                  {t('mobile.sheet.steps')}
                </div>
                <div className="flex flex-col gap-3">
                  {task.steps.map((step, i) => (
                    <div key={step._id || i} className="flex items-center gap-2.5">
                      <button
                        onClick={() => toggleStep(i)}
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${
                          step.isCompleted ? 'bg-aby-green' : 'border-2 border-aby-line bg-white dark:border-aby-line-dark dark:bg-transparent'
                        }`}
                      >
                        {step.isCompleted && <Check className="h-3 w-3 text-white" strokeWidth={3.4} />}
                      </button>
                      <span
                        className={`flex items-center gap-1 text-sm font-medium ${
                          step.isCompleted ? 'text-aby-muted line-through dark:text-aby-muted-dark' : 'text-[#3B3552] dark:text-aby-ink-dark'
                        }`}
                      >
                        {step.source === 'aby' && <Sparkles className="h-3 w-3 shrink-0 text-aby-violet dark:text-aby-violet-dark" />}
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-6 flex gap-2.5">
              <button
                onClick={markDone}
                disabled={done}
                className={`h-[52px] flex-1 rounded-2xl text-[15px] font-bold text-white ${
                  done ? 'cursor-not-allowed bg-aby-line text-aby-muted dark:bg-aby-line-dark' : 'bg-aby-violet'
                }`}
              >
                {t('mobile.sheet.markDone')}
              </button>
            </div>
          </>
        )}
      </div>
      {showAbyIt && task && (
        <AbyItModal
          taskId={task._id}
          initial={task.abyIt}
          onClose={() => setShowAbyIt(false)}
          onResult={({ abyIt, steps }) => {
            setTask((prev) => (prev ? { ...prev, abyIt, ...(steps ? { steps } : {}) } : prev));
            refresh();
          }}
        />
      )}
    </BottomSheet>
  );
};

export default TaskDetailSheet;

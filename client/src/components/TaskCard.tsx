import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { ExternalLink, Phone, MapPin, Clock } from 'lucide-react';
import { AgentTask, useTaskStore, TaskCategory } from '../stores/taskStore';
import { useLanguageStore } from '../stores/languageStore';

const SWIPE_THRESHOLD = 80;

const CATEGORY_STYLES: Record<
  TaskCategory,
  { label: string; badge: string; accent: string }
> = {
  ACTIONABLE: {
    label: 'Actionable',
    badge: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
    accent: 'bg-green-500',
  },
  FOCUS: {
    label: 'Focus',
    badge: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
    accent: 'bg-slate-500',
  },
  OUTING: {
    label: 'Plan & Navigate',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    accent: 'bg-teal-500',
  },
  ADMIN: {
    label: 'Admin',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    accent: 'bg-amber-500',
  },
};

function linkIcon(url: string) {
  if (url.startsWith('tel:')) return Phone;
  if (/maps|waze|google\.com\/maps/i.test(url)) return MapPin;
  return ExternalLink;
}

interface TaskCardProps {
  task: AgentTask;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const { isRtl } = useLanguageStore();
  const swipeOut = useTaskStore((s) => s.swipeOut);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  const dismissHintOpacity = useTransform(x, [0, 60, 120], [0, 0.6, 1]);
  const category = CATEGORY_STYLES[task.category] || CATEGORY_STYLES.ACTIONABLE;

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      swipeOut(task._id);
    }
  };

  return (
    <div className="relative">
      {/* "Not now" hint revealed while dragging right */}
      <motion.div
        style={{ opacity: dismissHintOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center rounded-2xl bg-neutral-100 ps-5 dark:bg-neutral-700/60"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-neutral-500 dark:text-neutral-300">
          <Clock className="h-4 w-4" />
          לא עכשיו
        </span>
      </motion.div>

      <motion.div
        layout
        dir={isRtl ? 'rtl' : 'ltr'}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x, opacity }}
        onDragEnd={handleDragEnd}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ x: 340, opacity: 0, transition: { duration: 0.25 } }}
        whileTap={{ cursor: 'grabbing' }}
        className="relative cursor-grab select-none overflow-hidden rounded-2xl border border-neutral-100 bg-white shadow-soft dark:border-neutral-700 dark:bg-neutral-800"
      >
        {/* Colored accent bar on the leading edge */}
        <div className={`absolute inset-y-0 start-0 w-1.5 ${category.accent}`} />

        <div className="p-4 ps-5">
          {/* Header: category tag (LTR) on the left, title on the right */}
          <div className="flex items-start justify-between gap-3">
            <span
              className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${category.badge}`}
              dir="ltr"
            >
              {category.label}
            </span>
            <div className="min-w-0 flex-1 text-end">
              <h3 className="truncate text-base font-bold text-neutral-900 dark:text-neutral-50">
                {task.title}
              </h3>
              {task.storedSummary && (
                <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                  {task.storedSummary}
                </p>
              )}
            </div>
          </div>

          {/* Detail / CTA rows */}
          {task.actionLinks?.length > 0 && (
            <div className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-700">
              {task.actionLinks.map((link, idx) => {
                const Icon = linkIcon(link.deepLink);
                return (
                  <div
                    key={`${link.deepLink}-${idx}`}
                    className="flex items-center justify-between gap-3 py-2"
                  >
                    <a
                      href={link.deepLink}
                      target={link.deepLink.startsWith('tel:') ? undefined : '_blank'}
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      onPointerDownCapture={(e) => e.stopPropagation()}
                      className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-700 transition-colors hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      Link
                    </a>
                    <div className="flex min-w-0 flex-1 items-center justify-end gap-2 text-end">
                      <span className="truncate text-sm text-neutral-700 dark:text-neutral-200">
                        {link.title}
                      </span>
                      {link.badge && (
                        <span className="shrink-0 rounded-md bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700 dark:bg-green-900/40 dark:text-green-300">
                          {link.badge}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="mt-3 flex flex-wrap justify-end gap-1.5">
              {task.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500 dark:bg-neutral-700 dark:text-neutral-300"
                  dir="ltr"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-3 text-center text-[11px] text-neutral-400">
            החלק ימינה כדי לדחות — "לא עכשיו" (המשימה נשמרת)
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default TaskCard;

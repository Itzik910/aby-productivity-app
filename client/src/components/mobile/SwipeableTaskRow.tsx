import React from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Clock, Check } from 'lucide-react';
import { MobileTask, formatTaskTime } from '../../utils/taskDisplay';

const SWIPE_THRESHOLD = 80;

interface SwipeableTaskRowProps {
  task: MobileTask;
  onPostpone: () => void;
  onComplete: () => void;
  onOpen: () => void;
}

/**
 * Today-tab task row: tap opens the detail sheet, swipe right postpones the
 * task to tomorrow (dueDate + 1 day, so it naturally reappears on tomorrow's
 * Today/Calendar views), swipe left marks it done. Mirrors the visual
 * language of the existing desktop TaskCard's swipe-to-postpone gesture.
 */
const SwipeableTaskRow: React.FC<SwipeableTaskRowProps> = ({ task, onPostpone, onComplete, onOpen }) => {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-160, 0, 160], [0.4, 1, 0.4]);
  const rightHintOpacity = useTransform(x, [0, 50, 100], [0, 0.7, 1]);
  const leftHintOpacity = useTransform(x, [-100, -50, 0], [1, 0.7, 0]);

  const handleDragEnd = (_e: unknown, info: PanInfo) => {
    if (info.offset.x > SWIPE_THRESHOLD) {
      onPostpone();
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      onComplete();
    }
  };

  const metaBits = [formatTaskTime(task.dueDate), task.estimatedDuration ? `${task.estimatedDuration} min` : null, task.category].filter(
    Boolean
  );

  return (
    <div className="relative">
      <motion.div
        style={{ opacity: rightHintOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center rounded-2xl bg-[#F3F0FF] ps-4 dark:bg-[#241F3E]"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-aby-violet dark:text-aby-violet-dark">
          <Clock className="h-4 w-4" />
          {t('mobile.today.swipePostpone')}
        </span>
      </motion.div>
      <motion.div
        style={{ opacity: leftHintOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end rounded-2xl bg-[#E7F9EE] pe-4 dark:bg-[#12301F]"
      >
        <span className="flex items-center gap-1.5 text-xs font-bold text-green-600 dark:text-green-400">
          {t('mobile.today.swipeComplete')}
          <Check className="h-4 w-4" />
        </span>
      </motion.div>

      <motion.div
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.6}
        style={{ x, opacity }}
        onDragEnd={handleDragEnd}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        whileTap={{ cursor: 'grabbing' }}
        onClick={onOpen}
        className="relative flex cursor-grab select-none items-center gap-3 rounded-2xl border border-aby-line bg-aby-card px-3.5 py-3.5 text-start dark:border-aby-line-dark dark:bg-aby-card-dark"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-aby-ink dark:text-aby-ink-dark">{task.title}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{metaBits.join(' · ')}</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SwipeableTaskRow;

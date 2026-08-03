import React, { useRef } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Clock, Check } from 'lucide-react';
import { MobileTask, formatTaskTime } from '../../utils/taskDisplay';

// Raw pointer-pixels needed to arm an action. Kept separate from the
// *visual* distance the card travels, since that's compressed by the
// resistance curve below.
const THRESHOLD = 90;
// How far (in visual px) the card sits at the moment the threshold is
// crossed, before the "released" phase takes over.
const VISUAL_AT_THRESHOLD = THRESHOLD * 0.8;
const TAP_SLOP = 6;

/**
 * Maps raw pointer delta -> visual card offset.
 * Below THRESHOLD: an ease-in curve compresses movement, so the card lags
 * further and further behind the finger — it feels "heavier" the closer you
 * get to the activation point — the requested friction.
 * Past THRESHOLD: movement switches to a faster-than-1:1 mapping, so the
 * card visibly "lets go" once the action is confirmed.
 */
function applyResistance(delta: number): number {
  const sign = Math.sign(delta);
  const abs = Math.abs(delta);
  if (abs <= THRESHOLD) {
    const t = abs / THRESHOLD;
    const eased = t * t; // ease-in quad: slow start, resists hardest right before the threshold
    return sign * eased * VISUAL_AT_THRESHOLD;
  }
  const over = abs - THRESHOLD;
  return sign * (VISUAL_AT_THRESHOLD + over * 1.25);
}

function vibrate(ms: number) {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(ms);
  }
}

interface SwipeableTaskRowProps {
  task: MobileTask;
  onPostpone: () => void;
  onComplete: () => void;
  onOpen: () => void;
}

/**
 * Today-tab task row: tap opens the detail sheet, swipe right postpones the
 * task to tomorrow, swipe left marks it done. Pointer handling is fully
 * custom (not framer-motion's `drag` prop) so we can shape the resistance
 * curve and fire haptics exactly at the activation point.
 */
const SwipeableTaskRow: React.FC<SwipeableTaskRowProps> = ({ task, onPostpone, onComplete, onOpen }) => {
  const { t } = useTranslation();
  const x = useMotionValue(0);
  const startX = useRef(0);
  const rawDelta = useRef(0);
  const isDragging = useRef(false);
  const hasArmed = useRef(false);

  const cardOpacity = useTransform(x, [-160, 0, 160], [0.55, 1, 0.55]);

  // Right reveal (postpone) — pale violet tint growing to a solid brand fill.
  const rightBg = useTransform(x, [0, VISUAL_AT_THRESHOLD], ['rgba(124,92,255,0.10)', 'rgba(91,75,224,1)']);
  const rightIconScale = useTransform(x, [0, VISUAL_AT_THRESHOLD * 0.25, VISUAL_AT_THRESHOLD], [0.4, 0.8, 1.15]);
  const rightIconOpacity = useTransform(x, [0, VISUAL_AT_THRESHOLD * 0.2, VISUAL_AT_THRESHOLD], [0, 1, 1]);
  const rightIconColor = useTransform(x, [0, VISUAL_AT_THRESHOLD], ['#5B4BE0', '#FFFFFF']);

  // Left reveal (complete) — pale green tint growing to a solid green fill.
  const leftBg = useTransform(x, [-VISUAL_AT_THRESHOLD, 0], ['rgba(34,197,94,1)', 'rgba(34,197,94,0.10)']);
  const leftIconScale = useTransform(x, [-VISUAL_AT_THRESHOLD, -VISUAL_AT_THRESHOLD * 0.25, 0], [1.15, 0.8, 0.4]);
  const leftIconOpacity = useTransform(x, [-VISUAL_AT_THRESHOLD, -VISUAL_AT_THRESHOLD * 0.2, 0], [1, 1, 0]);
  const leftIconColor = useTransform(x, [-VISUAL_AT_THRESHOLD, 0], ['#FFFFFF', '#16A34A']);

  const handlePointerDown = (e: React.PointerEvent) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nice-to-have (keeps events flowing if the finger leaves
      // the row's bounds mid-drag); its absence shouldn't block the drag.
    }
    startX.current = e.clientX;
    rawDelta.current = 0;
    isDragging.current = true;
    hasArmed.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const delta = e.clientX - startX.current;
    rawDelta.current = delta;
    x.set(applyResistance(delta));

    const armed = Math.abs(delta) >= THRESHOLD;
    if (armed && !hasArmed.current) {
      hasArmed.current = true;
      vibrate(12); // the moment of no-return
    } else if (!armed && hasArmed.current) {
      hasArmed.current = false; // let it re-arm if they pull back out and in again
    }
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const delta = rawDelta.current;

    if (Math.abs(delta) < TAP_SLOP) {
      onOpen();
      return;
    }

    if (delta >= THRESHOLD) {
      // Fire the real action on a fixed timer, not the animation's own
      // completion callback — the fling is decorative, and the task update
      // must still happen even if the animation gets interrupted (e.g. the
      // row unmounts, or the animation subsystem never signals "done").
      animate(x, 420, { type: 'tween', duration: 0.16, ease: 'easeIn' });
      setTimeout(onPostpone, 160);
    } else if (delta <= -THRESHOLD) {
      animate(x, -420, { type: 'tween', duration: 0.16, ease: 'easeIn' });
      setTimeout(onComplete, 160);
    } else {
      animate(x, 0, { type: 'spring', stiffness: 500, damping: 30 });
    }
  };

  const metaBits = [formatTaskTime(task.dueDate), task.estimatedDuration ? `${task.estimatedDuration} min` : null, task.category].filter(
    Boolean
  );

  const stepsTotal = task.steps?.length || 0;
  const stepsDone = task.steps?.filter((s) => s.isCompleted).length || 0;

  return (
    <div className="relative overflow-hidden rounded-2xl">
      <motion.div
        style={{ backgroundColor: rightBg }}
        className="pointer-events-none absolute inset-0 flex items-center ps-5"
      >
        <motion.span style={{ scale: rightIconScale, opacity: rightIconOpacity, color: rightIconColor }}>
          <Clock className="h-5 w-5" />
        </motion.span>
      </motion.div>
      <motion.div
        style={{ backgroundColor: leftBg }}
        className="pointer-events-none absolute inset-0 flex items-center justify-end pe-5"
      >
        <motion.span style={{ scale: leftIconScale, opacity: leftIconOpacity, color: leftIconColor }}>
          <Check className="h-5 w-5" />
        </motion.span>
      </motion.div>

      <motion.div
        style={{ x, opacity: cardOpacity, touchAction: 'pan-y' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        exit={{ opacity: 0, transition: { duration: 0.2 } }}
        className="relative flex cursor-grab select-none items-center gap-3 rounded-2xl border border-aby-line bg-aby-card px-3.5 py-3.5 text-start dark:border-aby-line-dark dark:bg-aby-card-dark"
      >
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-aby-ink dark:text-aby-ink-dark">{task.title}</p>
          <p className="mt-0.5 truncate text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{metaBits.join(' · ')}</p>
        </div>
        {stepsTotal > 0 && (
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-aby-page px-2 py-1 dark:bg-aby-page-dark">
            <div className="flex items-center gap-[3px]">
              {Array.from({ length: Math.min(stepsTotal, 4) }).map((_, i) => (
                <span
                  key={i}
                  className={`h-[5px] w-[5px] rounded-full ${
                    i < Math.round((stepsDone / stepsTotal) * Math.min(stepsTotal, 4))
                      ? 'bg-aby-violet dark:bg-aby-violet-dark'
                      : 'bg-aby-line dark:bg-aby-line-dark'
                  }`}
                />
              ))}
            </div>
            <span className="text-[10.5px] font-bold text-aby-sub dark:text-aby-sub-dark">
              {stepsDone}/{stepsTotal}
            </span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default SwipeableTaskRow;

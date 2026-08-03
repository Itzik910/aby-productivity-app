import React, { useEffect, useRef } from 'react';

const SIZE = 74;
const RADIUS = 33;
const STROKE = 7;
const GAP_FRACTION = 0.09;

interface DailyRingProps {
  completed: number;
  total: number;
  onRingClosed?: () => void;
}

/**
 * Floating segmented ring — mirrors MobileProfileAvatar on the opposite side
 * of the header row. Each segment is one of today's tasks; it fills in as
 * that task is completed. The center shows the raw completed count, not a
 * fraction or percent. Closing every segment fires onRingClosed once per
 * "not all filled" -> "all filled" transition (the caller/server is the
 * source of truth for not re-granting the same day's achievement twice).
 */
const DailyRing: React.FC<DailyRingProps> = ({ completed, total, onRingClosed }) => {
  const segmentCount = Math.max(total, 1);
  const filled = Math.min(Math.max(completed, 0), segmentCount);
  const wasClosed = useRef(false);

  useEffect(() => {
    const isClosed = total > 0 && completed >= total;
    if (isClosed && !wasClosed.current) {
      onRingClosed?.();
    }
    wasClosed.current = isClosed;
  }, [completed, total, onRingClosed]);

  const segLen = 1 / segmentCount;
  const dash = segLen * (1 - GAP_FRACTION);
  const gap = segLen - dash;

  return (
    <div
      className="relative flex shrink-0 items-center justify-center"
      style={{ height: SIZE, width: SIZE }}
      role="img"
      aria-label={`${completed} tasks completed today`}
    >
      <svg width={SIZE} height={SIZE} viewBox="0 0 100 100" className="-rotate-90">
        {Array.from({ length: segmentCount }).map((_, i) => (
          <circle
            key={i}
            cx={50}
            cy={50}
            r={RADIUS}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="butt"
            pathLength={1}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-(i / segmentCount)}
            className={i < filled ? 'text-aby-violet dark:text-aby-violet-dark' : 'text-aby-line dark:text-aby-line-dark'}
            stroke="currentColor"
          />
        ))}
      </svg>
      <div className="absolute flex flex-col items-center justify-center">
        <span className="text-[22px] font-extrabold leading-none text-aby-ink dark:text-aby-ink-dark">{completed}</span>
      </div>
    </div>
  );
};

export default DailyRing;

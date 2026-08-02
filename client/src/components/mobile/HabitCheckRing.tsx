import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface HabitCheckRingProps {
  done: boolean;
  color: string;
  disabled?: boolean;
  onToggle: () => void;
}

const SIZE = 46;
const STROKE = 2;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const DASH = '2.5 4';

/**
 * The habit "mark done" button. Toggling from not-done to done plays a
 * three-beat celebration: the dashed ring sweeps clockwise to full, then the
 * button pops and glows to land on the solid filled state.
 */
const HabitCheckRing: React.FC<HabitCheckRingProps> = ({ done, color, disabled, onToggle }) => {
  const [phase, setPhase] = useState<'idle' | 'ring' | 'pop'>('idle');
  const wasDone = useRef(done);

  useEffect(() => {
    if (done && !wasDone.current) {
      setPhase('ring');
      const toPop = setTimeout(() => setPhase('pop'), 500);
      const toIdle = setTimeout(() => setPhase('idle'), 1100);
      wasDone.current = done;
      return () => {
        clearTimeout(toPop);
        clearTimeout(toIdle);
      };
    }
    wasDone.current = done;
  }, [done]);

  const filled = done && phase !== 'ring';
  const showPop = phase === 'pop';

  return (
    <motion.button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      animate={showPop ? { scale: [1, 1.22, 0.92, 1.06, 1] } : { scale: 1 }}
      transition={showPop ? { duration: 0.5, times: [0, 0.35, 0.55, 0.8, 1], ease: 'easeOut' } : undefined}
      className="relative flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full"
      style={{ background: filled ? color : 'transparent', color: filled ? '#fff' : '#C9C2E0' }}
    >
      {showPop && (
        <motion.span
          className="pointer-events-none absolute inset-[-4px] rounded-full"
          initial={{ boxShadow: `0 0 0 0px ${color}00` }}
          animate={{ boxShadow: [`0 0 0 0px ${color}00`, `0 0 18px 6px ${color}80`, `0 0 0 0px ${color}00`] }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      )}
      {!filled && (
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="absolute inset-0 -rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="#DDD8EC" strokeWidth={STROKE} strokeDasharray={DASH} />
          {phase === 'ring' && (
            <motion.circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeDasharray={DASH}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: 0 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          )}
        </svg>
      )}
      <Check className="relative h-5 w-5" strokeWidth={3} />
    </motion.button>
  );
};

export default HabitCheckRing;

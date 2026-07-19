import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, RotateCcw, X, Coffee, Focus } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

type Mode = 'focus' | 'short_break' | 'long_break';

const DURATIONS: Record<Mode, number> = {
  focus: 25 * 60,
  short_break: 5 * 60,
  long_break: 15 * 60,
};

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  short_break: 'Short Break',
  long_break: 'Long Break',
};

interface PomodoroTimerProps {
  taskId?: string;
  taskTitle?: string;
  isOpen: boolean;
  onClose: () => void;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ taskId, taskTitle, isOpen, onClose }) => {
  const [mode, setMode] = useState<Mode>('focus');
  const [secondsLeft, setSecondsLeft] = useState(DURATIONS.focus);
  const [running, setRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const focusSecondsRef = useRef(0);

  const reset = useCallback((newMode: Mode = mode) => {
    setRunning(false);
    setSecondsLeft(DURATIONS[newMode]);
    if (intervalRef.current) clearInterval(intervalRef.current);
    focusSecondsRef.current = 0;
  }, [mode]);

  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    reset(newMode);
  };

  // Save time spent when a focus session ends
  const saveTimeSpent = useCallback(async (minutes: number) => {
    if (!taskId || minutes < 1) return;
    try {
      await api.patch(`/tasks/${taskId}`, {
        $inc: { 'analytics.timeSpent': minutes },
      });
    } catch {
      // silently fail
    }
  }, [taskId]);

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (mode === 'focus') focusSecondsRef.current += 1;

        if (prev <= 1) {
          clearInterval(intervalRef.current!);
          setRunning(false);

          if (mode === 'focus') {
            const minsSpent = Math.round(focusSecondsRef.current / 60);
            saveTimeSpent(minsSpent);
            focusSecondsRef.current = 0;
            setSessionsCompleted((s) => s + 1);
            toast.success('Focus session complete! Take a break.');

            // Auto-switch to break
            const newMode = sessionsCompleted % 4 === 3 ? 'long_break' : 'short_break';
            setMode(newMode);
            return DURATIONS[newMode];
          } else {
            toast('Break over! Ready to focus?');
            setMode('focus');
            return DURATIONS.focus;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, mode, sessionsCompleted, saveTimeSpent]);

  // Clean up on close
  useEffect(() => {
    if (!isOpen) {
      setRunning(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [isOpen]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  const totalSeconds = DURATIONS[mode];
  const progress = (totalSeconds - secondsLeft) / totalSeconds;

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - progress);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Focus className="w-5 h-5 text-purple-600" />
                <h2 className="font-bold text-gray-900 dark:text-white">Focus Timer</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Task name */}
            {taskTitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4 truncate">
                Focusing on: <span className="font-medium text-gray-900 dark:text-white">{taskTitle}</span>
              </p>
            )}

            {/* Mode tabs */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              {(['focus', 'short_break', 'long_break'] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => switchMode(m)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    mode === m
                      ? 'bg-white dark:bg-gray-700 text-purple-700 dark:text-purple-300 shadow-sm'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {m === 'focus' ? 'Focus' : m === 'short_break' ? 'Short' : 'Long'}
                </button>
              ))}
            </div>

            {/* Circle timer */}
            <div className="flex flex-col items-center gap-6">
              <div className="relative">
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle cx="70" cy="70" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
                  <circle
                    cx="70"
                    cy="70"
                    r={radius}
                    fill="none"
                    stroke={mode === 'focus' ? '#7c3aed' : '#059669'}
                    strokeWidth="8"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-gray-900 dark:text-white font-mono">
                    {pad(minutes)}:{pad(seconds)}
                  </div>
                  <div className="text-xs text-gray-500">{MODE_LABELS[mode]}</div>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => reset()}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setRunning(!running)}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white transition-all ${
                    running
                      ? 'bg-gray-400 hover:bg-gray-500'
                      : mode === 'focus' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {running ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                </button>
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Coffee className="w-4 h-4" />
                  <span>{sessionsCompleted}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PomodoroTimer;

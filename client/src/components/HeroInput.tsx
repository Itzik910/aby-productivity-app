import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, ArrowUp, Loader2 } from 'lucide-react';
import { useLanguageStore } from '../stores/languageStore';
import { useTaskStore } from '../stores/taskStore';
import { useTaskStream } from '../hooks/useTaskStream';

const HeroInput: React.FC = () => {
  const { isRtl } = useLanguageStore();
  const { isStreaming, streamMessage, error } = useTaskStore();
  const { submit } = useTaskStream();
  const [value, setValue] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value.trim() || isStreaming) return;
    const prompt = value;
    setValue('');
    submit(prompt);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e);
    }
  };

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="w-full rounded-3xl bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 p-5 shadow-glow"
    >
      {/* Header row: bot avatar + heading + subtitle */}
      <div className="mb-4 flex items-center gap-3 text-white">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          <Bot className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <h2 className="text-xl font-extrabold leading-tight">מה נסגור היום?</h2>
          <p className="text-sm text-white/80">הזן משימה או קבוצת משימות ואבי יסדר לך הכל</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {isStreaming ? (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl bg-white/95 p-4 dark:bg-neutral-800/95"
          >
            <div className="flex items-center gap-3 text-primary-600 dark:text-primary-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              <motion.span
                key={streamMessage}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-sm font-medium"
              >
                {streamMessage || 'מעבד משימות...'}
              </motion.span>
            </div>

            <div className="mt-4 space-y-3">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="animate-pulse rounded-xl border border-neutral-100 p-3 dark:border-neutral-700"
                >
                  <div className="h-3.5 w-1/3 rounded bg-neutral-200 dark:bg-neutral-700" />
                  <div className="mt-2.5 h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-700/70" />
                  <div className="mt-3 flex gap-2">
                    <div className="h-7 w-20 rounded-lg bg-neutral-100 dark:bg-neutral-700/70" />
                    <div className="h-7 w-20 rounded-lg bg-neutral-100 dark:bg-neutral-700/70" />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.form
            key="input"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            onSubmit={handleSubmit}
          >
            <div className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-inner dark:bg-neutral-800">
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="הזן משימה או קבוצת משימות..."
                className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-base text-neutral-800 placeholder-neutral-400 focus:outline-none dark:text-neutral-100"
              />
              <button
                type="submit"
                disabled={!value.trim()}
                aria-label="שלח"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 text-white transition-transform hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
              >
                <ArrowUp className="h-5 w-5" />
              </button>
            </div>
            {error && <p className="mt-2 text-sm font-medium text-white">{error}</p>}
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
};

export default HeroInput;

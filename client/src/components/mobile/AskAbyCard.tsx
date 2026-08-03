import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowUp, Layers, CheckSquare, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useLanguageStore } from '../../stores/languageStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTaskStream } from '../../hooks/useTaskStream';
import motivationLines from '../../data/motivationLines';

const ROTATE_MS = 4200;
const MAX_TEXTAREA_HEIGHT = 200;

/**
 * Inline, always-editable ABY composer replacing the old pill-button ->
 * bottom-sheet flow: typing happens directly in this card, which grows with
 * the text (like a chat composer) instead of opening a modal.
 */
const AskAbyCard: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl, language } = useLanguageStore();
  const { isStreaming, streamMessage, error } = useTaskStore();
  const { submit } = useTaskStream();
  const [value, setValue] = useState('');
  const [mode, setMode] = useState<'single' | 'multiple'>('single');
  const [abySplit, setAbySplit] = useState(false);
  const [motivIndex, setMotivIndex] = useState(() => Math.floor(Math.random() * 97));
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isStreaming) return;
    const id = setInterval(() => setMotivIndex((i) => i + 1), ROTATE_MS);
    return () => clearInterval(id);
  }, [isStreaming]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  }, [value]);

  const motivSet = motivationLines[language];
  const placeholder = motivSet && motivSet.length ? motivSet[motivIndex % motivSet.length] : (t('mobile.today.askPlaceholder') as string);

  const toggleMultiple = () => {
    setMode((m) => (m === 'multiple' ? 'single' : 'multiple'));
    setAbySplit(false);
  };

  const toggleAbySplit = () => {
    if (mode === 'multiple') return;
    setAbySplit((s) => !s);
  };

  const handleSubmit = async () => {
    if (value.trim().length <= 2 || isStreaming) return;
    const shouldSplit = abySplit;
    const created = await submit(value, { forceMultiple: mode === 'multiple' });
    setValue('');
    setMode('single');
    setAbySplit(false);
    if (shouldSplit && created && created.length) {
      Promise.all(created.map((task) => api.post(`/tasks/${task._id}/breakdown`).catch(() => null))).then(() => {
        window.dispatchEvent(new CustomEvent('taskCreated'));
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const canSend = value.trim().length > 2 && !isStreaming;

  const toggleClass = (active: boolean, disabled?: boolean) =>
    `flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12.5px] font-bold transition-colors ${
      disabled
        ? 'cursor-not-allowed opacity-40 bg-aby-page text-aby-muted dark:bg-aby-page-dark dark:text-aby-muted-dark'
        : active
        ? 'bg-aby-violet text-white'
        : 'border border-aby-line bg-aby-page text-aby-sub dark:border-aby-line-dark dark:bg-aby-page-dark dark:text-aby-sub-dark'
    }`;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      data-tour="ask-bar"
      className="mt-3.5 rounded-[22px] border border-aby-line bg-aby-card p-3.5 shadow-sm dark:border-aby-line-dark dark:bg-aby-card-dark"
    >
      {isStreaming ? (
        <div className="flex items-center gap-2.5 py-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
            <Loader2 className="h-[18px] w-[18px] animate-spin" />
          </span>
          <span className="text-sm font-semibold text-aby-ink dark:text-aby-ink-dark">{streamMessage}</span>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
              <Sparkles className="h-[18px] w-[18px]" />
            </span>
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="max-h-[200px] flex-1 resize-none overflow-y-auto bg-transparent py-1 text-[15px] font-medium text-aby-ink placeholder-aby-muted outline-none dark:text-aby-ink-dark dark:placeholder-aby-muted-dark"
            />
          </div>

          {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleMultiple} className={toggleClass(mode === 'multiple')}>
                <Layers className="h-4 w-4" />
                {mode === 'multiple' ? t('mobile.today.modeMultiple') : t('mobile.today.modeSingle')}
              </button>
              <button
                type="button"
                onClick={toggleAbySplit}
                disabled={mode === 'multiple'}
                className={toggleClass(abySplit, mode === 'multiple')}
              >
                <CheckSquare className="h-4 w-4" />
                {t('mobile.today.abySplit')}
              </button>
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              aria-label={t('mobile.today.ask') as string}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white transition-transform ${
                canSend ? 'bg-aby-violet hover:scale-105' : 'cursor-not-allowed bg-aby-line text-aby-muted dark:bg-aby-line-dark'
              }`}
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default AskAbyCard;

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, X, Loader2, Check } from 'lucide-react';
import { useLanguageStore } from '../../stores/languageStore';
import { useTaskStore } from '../../stores/taskStore';
import { useTaskStream } from '../../hooks/useTaskStream';
import { useMobileUiStore } from '../../stores/mobileUiStore';
import BottomSheet from './BottomSheet';

/**
 * "Ask ABY" quick-add sheet. Drives its streaming-progress UI off the real
 * NLP pipeline (useTaskStream -> POST /tasks/ai-parse SSE) instead of a
 * fake simulated delay, so this is genuinely wired, not just styled.
 */
const ComposeSheet: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const isOpen = useMobileUiStore((s) => s.sheet === 'compose');
  const closeSheet = useMobileUiStore((s) => s.closeSheet);
  const { isStreaming, streamMessage, error } = useTaskStore();
  const { submit } = useTaskStream();
  const [value, setValue] = useState('');
  const wasStreaming = useRef(false);

  useEffect(() => {
    if (wasStreaming.current && !isStreaming && !error) {
      setValue('');
      closeSheet();
    }
    wasStreaming.current = isStreaming;
  }, [isStreaming, error, closeSheet]);

  const handleSubmit = () => {
    if (value.trim().length <= 2 || isStreaming) return;
    submit(value);
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={() => (!isStreaming ? closeSheet() : undefined)}>
      <div dir={isRtl ? 'rtl' : 'ltr'}>
        {isStreaming ? (
          <div>
            <div className="mb-1.5 flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-xl bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
                <Sparkles className="h-[18px] w-[18px]" />
              </span>
              <span className="text-base font-extrabold text-aby-ink dark:text-aby-ink-dark">
                {t('mobile.sheet.abyOn')}
              </span>
            </div>
            <div className="flex items-center gap-2.5 py-3">
              <Loader2 className="h-5 w-5 shrink-0 animate-spin text-aby-violet dark:text-aby-violet-dark" />
              <span className="text-sm font-semibold text-aby-ink dark:text-aby-ink-dark">{streamMessage}</span>
            </div>
            <div className="mt-1.5 flex flex-col gap-2.5">
              {[0, 1].map((i) => (
                <div key={i} className="animate-pulse rounded-2xl border border-aby-line bg-aby-page p-3.5 dark:border-aby-line-dark dark:bg-aby-page-dark">
                  <div className="h-2.5 w-1/2 rounded-md bg-aby-line dark:bg-aby-line-dark" />
                  <div className="mt-2 h-2 w-3/4 rounded-md bg-aby-line/70 dark:bg-aby-line-dark/70" />
                </div>
              ))}
            </div>
            <p className="mt-3.5 text-center text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">
              {t('mobile.sheet.bgNote')}
            </p>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[19px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.sheet.askTitle')}</h2>
              <button
                onClick={closeSheet}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-aby-page text-aby-sub dark:bg-aby-page-dark dark:text-aby-sub-dark"
              >
                <X className="h-[17px] w-[17px]" />
              </button>
            </div>
            <textarea
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={t('mobile.today.askPlaceholder') as string}
              rows={3}
              className="w-full resize-none rounded-2xl border border-aby-line bg-aby-page p-3.5 text-[15px] font-medium text-aby-ink outline-none dark:border-aby-line-dark dark:bg-aby-page-dark dark:text-aby-ink-dark"
            />
            {error && <p className="mt-2 text-sm font-medium text-red-500">{error}</p>}
            <div className="my-3 flex flex-wrap gap-2">
              <button
                onClick={() => setValue(t('mobile.sheet.exampleText') as string)}
                className="rounded-[11px] border border-aby-line bg-white px-3 py-2 text-xs font-semibold text-aby-violet dark:border-aby-line-dark dark:bg-transparent dark:text-aby-violet-dark"
              >
                {t('mobile.sheet.tryExample')}
              </button>
            </div>
            <button
              onClick={handleSubmit}
              disabled={value.trim().length <= 2}
              className={`flex h-[52px] w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-bold text-white ${
                value.trim().length > 2 ? 'bg-aby-violet cursor-pointer' : 'cursor-not-allowed bg-aby-line text-aby-muted dark:bg-aby-line-dark'
              }`}
            >
              <Check className="h-4 w-4" />
              {t('mobile.sheet.askTitle')}
            </button>
          </div>
        )}
      </div>
    </BottomSheet>
  );
};

export default ComposeSheet;

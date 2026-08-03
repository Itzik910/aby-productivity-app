import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X, Send, MapPin, ExternalLink, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import { useLanguageStore } from '../stores/languageStore';
import { AbyItState, AbyItStep } from '../types/abyIt';

interface AbyItModalProps {
  taskId: string;
  initial?: AbyItState;
  onClose: () => void;
  onResult: (result: { abyIt: AbyItState; steps?: AbyItStep[] }) => void;
}

/**
 * The "ABY it" conversation: asks up to two clarifying questions (server
 * decides if/when needed), then finalizes into either a location
 * recommendation or a step breakdown. Reopening with an `initial` state that
 * isn't 'idle' resumes exactly where the conversation left off instead of
 * restarting it.
 */
const AbyItModal: React.FC<AbyItModalProps> = ({ taskId, initial, onClose, onResult }) => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const [abyIt, setAbyIt] = useState<AbyItState | null>(initial && initial.status !== 'idle' ? initial : null);
  const [loading, setLoading] = useState(!initial || initial.status === 'idle');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState(false);
  const lastBody = useRef<{ answer: string } | undefined>(undefined);

  const call = async (body?: { answer: string }) => {
    lastBody.current = body;
    setLoading(true);
    setError(false);
    try {
      const res = await api.post(`/tasks/${taskId}/aby-it`, body || {});
      setAbyIt(res.data.abyIt);
      onResult(res.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initial || initial.status === 'idle') call();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submitAnswer = () => {
    if (!answer.trim()) return;
    const text = answer.trim();
    setAnswer('');
    call({ answer: text });
  };

  const pendingQuestion =
    abyIt?.status === 'awaiting_answer' ? abyIt.conversation[abyIt.conversation.length - 1] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          dir={isRtl ? 'rtl' : 'ltr'}
          className="max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl dark:bg-aby-card-dark"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-aby-violet dark:text-aby-violet-dark">
              <Sparkles className="h-5 w-5" />
              <span className="font-bold">{t('mobile.abyIt.button')}</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center gap-2 py-8 text-sm text-aby-muted dark:text-aby-muted-dark">
              <Loader2 className="h-6 w-6 animate-spin text-aby-violet" />
              <span>{t('mobile.abyIt.thinking')}</span>
            </div>
          )}

          {!loading && error && (
            <div className="py-6 text-center">
              <p className="mb-3 text-sm text-red-500">{t('mobile.abyIt.error')}</p>
              <button
                onClick={() => call(lastBody.current)}
                className="rounded-xl bg-aby-violet px-4 py-2 text-sm font-bold text-white"
              >
                {t('mobile.abyIt.send')}
              </button>
            </div>
          )}

          {!loading && !error && pendingQuestion && (
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-aby-muted dark:text-aby-muted-dark">
                {t('mobile.abyIt.askedTitle')}
              </p>
              <p className="mb-3 text-[15px] font-semibold text-aby-ink dark:text-aby-ink-dark">
                {pendingQuestion.question}
              </p>
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && submitAnswer()}
                  placeholder={t('mobile.abyIt.answerPlaceholder')}
                  className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-aby-violet focus:outline-none dark:border-aby-line-dark dark:bg-transparent"
                />
                <button
                  onClick={submitAnswer}
                  disabled={!answer.trim()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-aby-violet text-white disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {!loading && !error && abyIt?.status === 'completed' && abyIt.mode === 'location' && (
            <div>
              <p className="mb-3 text-[15px] font-semibold text-aby-ink dark:text-aby-ink-dark">
                {abyIt.locationSuggestion?.summary || t('mobile.abyIt.locationTitle')}
              </p>
              {abyIt.locationSuggestion?.places?.length ? (
                <div className="flex flex-col gap-2">
                  {abyIt.locationSuggestion.places.map((p, i) => (
                    <a
                      key={i}
                      href={p.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 rounded-xl border border-gray-200 p-3 text-sm hover:border-aby-violet dark:border-aby-line-dark"
                    >
                      <MapPin className="h-4 w-4 shrink-0 text-aby-violet" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-aby-ink dark:text-aby-ink-dark">{p.name}</span>
                        <span className="block truncate text-xs text-aby-muted dark:text-aby-muted-dark">{p.address}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-aby-muted dark:text-aby-muted-dark" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-aby-muted dark:text-aby-muted-dark">{t('mobile.abyIt.noPlaces')}</p>
              )}
              <button onClick={onClose} className="mt-4 h-11 w-full rounded-xl bg-aby-violet text-sm font-bold text-white">
                {t('mobile.abyIt.done')}
              </button>
            </div>
          )}

          {!loading && !error && abyIt?.status === 'completed' && abyIt.mode === 'breakdown' && (
            <div>
              <p className="mb-1 text-[15px] font-semibold text-aby-ink dark:text-aby-ink-dark">
                {t('mobile.abyIt.breakdownTitle')}
              </p>
              <p className="mb-3 text-sm text-aby-muted dark:text-aby-muted-dark">{t('mobile.abyIt.breakdownBody')}</p>
              <button onClick={onClose} className="h-11 w-full rounded-xl bg-aby-violet text-sm font-bold text-white">
                {t('mobile.abyIt.done')}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AbyItModal;

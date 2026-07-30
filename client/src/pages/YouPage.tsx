import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Settings, ChevronRight, Sprout, Trophy, Target, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useLanguageStore } from '../stores/languageStore';
import { useOnboardingStore } from '../stores/onboardingStore';
import { Habit, isDoneToday, last7Days } from '../utils/habitDisplay';

const YouPage: React.FC = () => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const startTour = useOnboardingStore((s) => s.start);
  const [habits, setHabits] = useState<Habit[]>([]);

  useEffect(() => {
    api
      .get('/habits')
      .then((res) => setHabits(res.data?.habits || []))
      .catch(() => {});
  }, []);

  const stats = user?.stats;
  const weekPct = stats && stats.totalTasks ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0;
  const habitsOnTrack = habits.filter(isDoneToday).length;

  const moreItems = [
    { key: 'habits', label: t('mobile.you.habits'), icon: <Sprout className="h-[17px] w-[17px]" />, bg: 'bg-[#E9F9F0] dark:bg-[#12301F]', path: '/habits' },
    { key: 'achievements', label: t('mobile.you.achievements'), icon: <Trophy className="h-[17px] w-[17px]" />, bg: 'bg-[#FEF3C7] dark:bg-[#3A3016]', path: '/achievements' },
    { key: 'challenges', label: t('mobile.you.challenges'), icon: <Target className="h-[17px] w-[17px]" />, bg: 'bg-[#E6FAF7] dark:bg-[#0F2E2C]', path: '/challenges' },
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
      <div className="px-5 pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-[23px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.you.title')}</h1>
            <p className="mt-1 text-[13px] font-medium text-aby-sub dark:text-aby-sub-dark">{t('mobile.you.subtitle')}</p>
          </div>
          <button
            onClick={() => navigate('/settings')}
            aria-label="Settings"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark"
          >
            <Settings className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="rounded-[18px] border border-aby-line bg-aby-card p-4 dark:border-aby-line-dark dark:bg-aby-card-dark">
            <div className="text-[28px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{stats?.currentStreak ?? 0}</div>
            <div className="mt-0.5 text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.you.statStreak')}</div>
          </div>
          <div className="rounded-[18px] border border-aby-line bg-aby-card p-4 dark:border-aby-line-dark dark:bg-aby-card-dark">
            <div className="text-[28px] font-extrabold text-aby-ink dark:text-aby-ink-dark">
              {weekPct}
              <span className="text-base">%</span>
            </div>
            <div className="mt-0.5 text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.you.statWeek')}</div>
          </div>
          <div className="rounded-[18px] border border-aby-line bg-aby-card p-4 dark:border-aby-line-dark dark:bg-aby-card-dark">
            <div className="text-[28px] font-extrabold text-aby-ink dark:text-aby-ink-dark">—</div>
            <div className="mt-0.5 text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">{t('mobile.you.statFocus')}</div>
          </div>
          <div className="rounded-[18px] bg-aby-ink p-4 dark:bg-black/30">
            <div className="text-[28px] font-extrabold text-white">{habitsOnTrack}</div>
            <div className="mt-0.5 text-xs font-semibold text-[#A79BFF]">{t('mobile.you.statHabits')}</div>
          </div>
        </div>

        {habits.length > 0 && (
          <>
            <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
              {t('mobile.you.sectionHabits')}
            </div>
            <div className="flex flex-col gap-2.5">
              {habits.slice(0, 2).map((h) => (
                <div
                  key={h._id}
                  className="flex items-center gap-3 rounded-2xl border border-aby-line bg-aby-card p-3.5 dark:border-aby-line-dark dark:bg-aby-card-dark"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-bold text-aby-ink dark:text-aby-ink-dark">
                      {h.emoji} {h.title}
                    </p>
                    <p className="mt-0.5 text-xs font-semibold text-aby-muted dark:text-aby-muted-dark">
                      {h.currentStreak}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {last7Days(h).map((done, i) => (
                      <span
                        key={i}
                        className="h-[9px] w-[9px] rounded-[3px]"
                        style={{ background: done ? h.color : '#E4E0F0' }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.you.sectionMore')}
        </div>
        <div className="flex flex-col gap-2.5">
          {moreItems.map((item) => (
            <button
              key={item.key}
              onClick={() => navigate(item.path)}
              className="flex w-full items-center gap-3 rounded-2xl border border-aby-line bg-aby-card p-3.5 text-start dark:border-aby-line-dark dark:bg-aby-card-dark"
            >
              <span className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] ${item.bg}`}>
                {item.icon}
              </span>
              <span className="flex-1 text-[15px] font-bold text-aby-ink dark:text-aby-ink-dark">{item.label}</span>
              <ChevronRight className="rtl-flip h-[18px] w-[18px] text-aby-line dark:text-aby-line-dark" />
            </button>
          ))}
          <button
            onClick={() => navigate('/premium')}
            className="flex w-full items-center gap-3 rounded-2xl bg-aby-ink p-3.5 text-start"
          >
            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] bg-white/10">
              <Sparkles className="h-[17px] w-[17px] text-[#A79BFF]" />
            </span>
            <span className="flex-1 text-[15px] font-bold text-white">{t('mobile.you.unlockEverything')}</span>
            <ChevronRight className="rtl-flip h-[18px] w-[18px] text-[#A79BFF]" />
          </button>
          <button
            onClick={startTour}
            className="w-full py-2 text-center text-[13px] font-bold text-aby-violet dark:text-aby-violet-dark"
          >
            {t('mobile.you.replayTour')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default YouPage;

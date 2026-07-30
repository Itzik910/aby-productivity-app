import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';
import { useLanguageStore } from '../stores/languageStore';

type NotifKey = 'daily' | 'remind' | 'streak' | 'chal' | 'quiet';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useThemeStore();
  const { language, setLanguage, isRtl } = useLanguageStore();

  // No backend field exists yet for per-notification-type preferences, so
  // these toggles are local UI state only (per the "visual layout only"
  // scope for anything without an existing endpoint).
  const [notif, setNotif] = useState<Record<NotifKey, boolean>>({
    daily: true,
    remind: true,
    streak: true,
    chal: false,
    quiet: true,
  });

  const Back = isRtl ? ChevronRight : ChevronLeft;
  const comingSoon = () => toast(t('mobile.settings.comingSoon') as string);

  const notifRows: Array<{ key: NotifKey; label: string; sub: string }> = [
    { key: 'daily', label: t('mobile.settings.dailyPlan'), sub: t('mobile.settings.dailyPlanSub') },
    { key: 'remind', label: t('mobile.settings.taskReminders'), sub: t('mobile.settings.taskRemindersSub') },
    { key: 'streak', label: t('mobile.settings.streakNudges'), sub: t('mobile.settings.streakNudgesSub') },
    { key: 'chal', label: t('mobile.settings.challengeUpdates'), sub: t('mobile.settings.challengeUpdatesSub') },
    { key: 'quiet', label: t('mobile.settings.quietHours'), sub: t('mobile.settings.quietHoursSub') },
  ];

  const themeOpts: Array<{ key: 'light' | 'dark' | 'auto'; label: string }> = [
    { key: 'light', label: t('theme.light') },
    { key: 'dark', label: t('theme.dark') },
    { key: 'auto', label: t('theme.auto') },
  ];

  const langOpts: Array<{ key: 'en' | 'he'; label: string; sample: string; code: string }> = [
    { key: 'en', label: 'English', sample: 'Good morning · Tasks · Habits', code: 'EN' },
    { key: 'he', label: 'עברית', sample: 'בוקר טוב · משימות · הרגלים', code: 'עב' },
  ];

  return (
    <div dir={isRtl ? 'rtl' : 'ltr'} className="min-h-screen bg-aby-page pb-16 dark:bg-aby-page-dark md:hidden">
      <div className="px-5 pt-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark"
          >
            <Back className="h-[18px] w-[18px]" />
          </button>
          <h1 className="text-[21px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.settings.title')}</h1>
        </div>

        {/* Account summary */}
        <div className="mt-4 flex items-center gap-3 rounded-2xl border border-aby-line bg-aby-card p-3.5 dark:border-aby-line-dark dark:bg-aby-card-dark">
          <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full bg-[#EDE8FE] text-lg font-extrabold text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
            {(user?.name || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-aby-ink dark:text-aby-ink-dark">{user?.name}</p>
            <p className="truncate text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{user?.email}</p>
          </div>
          <button
            onClick={comingSoon}
            className="shrink-0 rounded-xl border border-aby-line bg-white px-3.5 py-2 text-[12.5px] font-bold text-aby-violet dark:border-aby-line-dark dark:bg-transparent dark:text-aby-violet-dark"
          >
            {t('mobile.settings.edit')}
          </button>
        </div>

        {/* Notifications */}
        <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.settings.sectionNotifications')}
        </div>
        <div className="flex flex-col gap-2.5">
          {notifRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center gap-3 rounded-2xl border border-aby-line bg-aby-card p-3.5 dark:border-aby-line-dark dark:bg-aby-card-dark"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-bold text-aby-ink dark:text-aby-ink-dark">{row.label}</p>
                <p className="mt-0.5 text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{row.sub}</p>
              </div>
              <button
                onClick={() => setNotif((n) => ({ ...n, [row.key]: !n[row.key] }))}
                className="flex h-7 w-12 shrink-0 items-center rounded-full p-[3px]"
                style={{ background: notif[row.key] ? '#22C55E' : '#DDD8EC', justifyContent: notif[row.key] ? 'flex-end' : 'flex-start' }}
              >
                <span className="h-[22px] w-[22px] rounded-full bg-white shadow" />
              </button>
            </div>
          ))}
        </div>

        {/* Appearance — wired to the real theme store */}
        <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.settings.sectionAppearance')}
        </div>
        <div className="flex gap-1.5 rounded-2xl border border-aby-line bg-aby-card p-1.5 dark:border-aby-line-dark dark:bg-aby-card-dark">
          {themeOpts.map((o) => (
            <button
              key={o.key}
              onClick={() => setTheme(o.key)}
              className={`h-10 flex-1 rounded-xl text-[13px] font-bold ${
                theme === o.key ? 'bg-aby-ink text-white dark:bg-white dark:text-aby-ink' : 'text-aby-sub dark:text-aby-sub-dark'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p className="mt-2 px-0.5 text-xs font-medium text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.settings.appearanceHint')}
        </p>

        {/* Language — wired to the real language store */}
        <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.settings.sectionLanguage')}
        </div>
        <div className="flex flex-col gap-2.5">
          {langOpts.map((o) => {
            const active = language === o.key;
            return (
              <button
                key={o.key}
                onClick={() => setLanguage(o.key)}
                className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start ${
                  active ? 'border-aby-violet bg-[#F3F0FF] dark:bg-[#241F3E]' : 'border-aby-line bg-aby-card dark:border-aby-line-dark dark:bg-aby-card-dark'
                }`}
              >
                <span
                  className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[13px] text-[13px] font-extrabold ${
                    active ? 'bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark' : 'bg-aby-page text-aby-sub dark:bg-aby-page-dark dark:text-aby-sub-dark'
                  }`}
                >
                  {o.code}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-aby-ink dark:text-aby-ink-dark">{o.label}</span>
                  <span className="mt-0.5 block truncate text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{o.sample}</span>
                </span>
                {active && (
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-aby-violet text-white">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Account */}
        <div className="mb-2.5 mt-6 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {t('mobile.settings.sectionAccount')}
        </div>
        <div className="flex flex-col gap-2.5">
          <button
            onClick={comingSoon}
            className="w-full rounded-2xl border border-aby-line bg-aby-card p-3.5 text-start text-[14.5px] font-bold text-aby-ink dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-ink-dark"
          >
            {t('mobile.settings.changePassword')}
          </button>
          <button
            onClick={comingSoon}
            className="w-full rounded-2xl border border-aby-line bg-aby-card p-3.5 text-start dark:border-aby-line-dark dark:bg-aby-card-dark"
          >
            <span className="block text-[14.5px] font-bold text-aby-ink dark:text-aby-ink-dark">{t('mobile.settings.exportData')}</span>
            <span className="mt-0.5 block text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{t('mobile.settings.exportDataSub')}</span>
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/');
            }}
            className="h-[52px] w-full rounded-2xl border border-aby-line bg-aby-card text-[14.5px] font-bold text-aby-ink dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-ink-dark"
          >
            {t('mobile.settings.signOut')}
          </button>
          <button
            onClick={comingSoon}
            className="h-[52px] w-full rounded-2xl border border-red-200 bg-red-50 text-[14.5px] font-bold text-red-600 dark:border-red-900/40 dark:bg-red-950/20"
          >
            {t('mobile.settings.deleteAccount')}
          </button>
          <p className="px-0.5 text-xs font-medium text-aby-muted dark:text-aby-muted-dark">{t('mobile.settings.deleteHint')}</p>
        </div>

        <p className="mt-6 text-center text-[11.5px] font-semibold text-aby-line dark:text-aby-line-dark">
          {t('mobile.settings.version')}
        </p>
      </div>
    </div>
  );
};

export default SettingsPage;

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, ListChecks, CalendarDays, User, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useMobileUiStore } from '../../stores/mobileUiStore';

const YOU_PATHS = ['/you', '/habits', '/achievements', '/challenges', '/premium', '/settings'];

const MobileTabBar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const openCompose = useMobileUiStore((s) => s.openCompose);

  const isActive = (paths: string[]) => paths.includes(location.pathname);

  const tabs: Array<{ key: string; label: string; icon: React.ReactNode; paths: string[] }> = [
    { key: 'today', label: t('mobile.nav.today'), icon: <Home className="h-[21px] w-[21px]" />, paths: ['/dashboard'] },
    { key: 'tasks', label: t('mobile.nav.tasks'), icon: <ListChecks className="h-[21px] w-[21px]" />, paths: ['/tasks'] },
  ];
  const tabsRight: Array<{ key: string; label: string; icon: React.ReactNode; paths: string[] }> = [
    { key: 'calendar', label: t('mobile.nav.calendar'), icon: <CalendarDays className="h-[21px] w-[21px]" />, paths: ['/calendar'] },
    { key: 'you', label: t('mobile.nav.you'), icon: <User className="h-[21px] w-[21px]" />, paths: YOU_PATHS },
  ];

  const tabClass = (active: boolean) =>
    `flex flex-1 flex-col items-center justify-center gap-1 h-14 bg-transparent border-0 cursor-pointer ${
      active ? 'text-aby-violet dark:text-aby-violet-dark' : 'text-aby-muted dark:text-aby-muted-dark'
    }`;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex items-start gap-0 border-t border-aby-line bg-white/[.97] pt-1.5 dark:border-aby-line-dark dark:bg-aby-card-dark/[.97]" style={{ height: 72 }}>
      {tabs.map((tab) => (
        <button key={tab.key} onClick={() => navigate(tab.paths[0])} className={tabClass(isActive(tab.paths))}>
          {tab.icon}
          <span className="text-[10.5px] font-bold">{tab.label}</span>
        </button>
      ))}

      <div className="flex flex-1 justify-center">
        <button
          data-tour="add-fab"
          onClick={openCompose}
          aria-label={t('mobile.sheet.askTitle')}
          className="-mt-5 flex h-[58px] w-[58px] cursor-pointer items-center justify-center rounded-[20px] border-4 border-aby-page bg-gradient-to-br from-[#6C4AE4] to-[#4436C6] text-white shadow-[0_12px_24px_-10px_rgba(91,75,224,0.85)] dark:border-aby-page-dark"
        >
          <Plus className="h-[26px] w-[26px]" strokeWidth={2.4} />
        </button>
      </div>

      {tabsRight.map((tab) => (
        <button
          key={tab.key}
          data-tour={tab.key === 'you' ? 'you-tab' : undefined}
          onClick={() => navigate(tab.paths[0])}
          className={tabClass(isActive(tab.paths))}
        >
          {tab.icon}
          <span className="text-[10.5px] font-bold">{tab.label}</span>
        </button>
      ))}
    </div>
  );
};

export default MobileTabBar;

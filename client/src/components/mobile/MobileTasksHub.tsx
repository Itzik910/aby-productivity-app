import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { List, CalendarDays } from 'lucide-react';
import { MobileTask } from '../../utils/taskDisplay';
import MobileProfileAvatar from './MobileProfileAvatar';
import MobileTasksView from './MobileTasksView';
import MobileCalendarView from './MobileCalendarView';

interface MobileTasksHubProps {
  tasks: MobileTask[];
  onToggle: (task: MobileTask) => void;
}

type View = 'list' | 'calendar';

/**
 * Tasks and Calendar used to be two separate bottom-nav tabs that both just
 * showed the same tasks in a different shape. They're now one tab with a
 * toggle up top, freeing a nav slot instead of splitting attention across
 * two screens with the same underlying data.
 */
const MobileTasksHub: React.FC<MobileTasksHubProps> = ({ tasks, onToggle }) => {
  const { t } = useTranslation();
  const [view, setView] = useState<View>('list');

  return (
    <div className="bg-aby-page dark:bg-aby-page-dark md:hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <MobileProfileAvatar />
        <div className="flex gap-1 rounded-2xl border border-aby-line bg-aby-card p-1 dark:border-aby-line-dark dark:bg-aby-card-dark">
          <button
            onClick={() => setView('list')}
            className={`flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold ${
              view === 'list' ? 'bg-aby-ink text-white dark:bg-white dark:text-aby-ink' : 'text-aby-sub dark:text-aby-sub-dark'
            }`}
          >
            <List className="h-3.5 w-3.5" />
            {t('mobile.tasks.viewList')}
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex h-8 items-center gap-1.5 rounded-xl px-3 text-[12.5px] font-bold ${
              view === 'calendar' ? 'bg-aby-ink text-white dark:bg-white dark:text-aby-ink' : 'text-aby-sub dark:text-aby-sub-dark'
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            {t('mobile.tasks.viewCalendar')}
          </button>
        </div>
      </div>

      {view === 'list' ? (
        <MobileTasksView tasks={tasks} onToggle={onToggle} />
      ) : (
        <MobileCalendarView tasks={tasks} onToggle={onToggle} />
      )}
    </div>
  );
};

export default MobileTasksHub;

import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search } from 'lucide-react';
import { useMobileUiStore } from '../../stores/mobileUiStore';
import { MobileTask, taskBucket, isTaskDone } from '../../utils/taskDisplay';
import MobileTaskRow from './MobileTaskRow';

type Filter = 'today' | 'overdue' | 'week' | 'all' | 'done';

interface MobileTasksViewProps {
  tasks: MobileTask[];
  onToggle: (task: MobileTask) => void;
}

const MobileTasksView: React.FC<MobileTasksViewProps> = ({ tasks, onToggle }) => {
  const { t } = useTranslation();
  const openDetail = useMobileUiStore((s) => s.openDetail);
  const [filter, setFilter] = useState<Filter>('today');

  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    if (filter === 'done') return tasks.filter(isTaskDone);
    if (filter === 'week') return tasks.filter((t) => !isTaskDone(t) && taskBucket(t) !== 'overdue');
    return tasks.filter((t) => !isTaskDone(t) && taskBucket(t) === filter);
  }, [tasks, filter]);

  const groups = useMemo(() => {
    const order: Array<{ key: 'overdue' | 'today' | 'later'; label: string }> = [
      { key: 'overdue', label: t('mobile.tasks.groupOverdue') },
      { key: 'today', label: t('mobile.tasks.groupToday') },
      { key: 'later', label: t('mobile.tasks.groupLater') },
    ];
    return order
      .map((g) => ({ ...g, items: filtered.filter((task) => taskBucket(task) === g.key) }))
      .filter((g) => g.items.length > 0);
  }, [filtered, t]);

  const chips: Array<{ key: Filter; label: string }> = [
    { key: 'today', label: t('mobile.tasks.chipToday') },
    { key: 'overdue', label: t('mobile.tasks.chipOverdue') },
    { key: 'week', label: t('mobile.tasks.chipWeek') },
    { key: 'all', label: t('mobile.tasks.chipAll') },
    { key: 'done', label: t('mobile.tasks.chipDone') },
  ];

  return (
    <div className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h1 className="text-[23px] font-extrabold text-aby-ink dark:text-aby-ink-dark">{t('mobile.tasks.title')}</h1>
        <button className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark">
          <Search className="h-[19px] w-[19px]" />
        </button>
      </div>

      <div className="aby-scroll flex gap-2 overflow-x-auto px-5 pb-1 pt-3.5" style={{ scrollbarWidth: 'none' }}>
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`h-[38px] shrink-0 rounded-xl px-4 text-[13px] font-bold ${
              filter === c.key
                ? 'bg-aby-ink text-white dark:bg-white dark:text-aby-ink'
                : 'border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-4.5 px-5 pb-7 pt-2.5">
        {groups.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-aby-line py-10 text-center text-sm font-medium text-aby-muted dark:border-aby-line-dark dark:text-aby-muted-dark">
            {t('mobile.tasks.empty')}
          </div>
        ) : (
          groups.map((g) => (
            <div key={g.key} className="mt-2.5">
              <div className="mb-2.5 text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
                {g.label}
              </div>
              <div className="flex flex-col gap-2.5">
                {g.items.map((task) => (
                  <MobileTaskRow
                    key={task._id}
                    task={task}
                    onToggle={() => onToggle(task)}
                    onOpen={() => openDetail(task._id)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MobileTasksView;

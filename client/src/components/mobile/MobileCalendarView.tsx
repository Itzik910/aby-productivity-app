import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguageStore } from '../../stores/languageStore';
import { useTaskModalStore } from '../../stores/taskModalStore';
import { useMobileUiStore } from '../../stores/mobileUiStore';
import { MobileTask, isSameDay } from '../../utils/taskDisplay';
import MobileTaskRow from './MobileTaskRow';

interface MobileCalendarViewProps {
  tasks: MobileTask[];
  onToggle: (task: MobileTask) => void;
}

function startOfWeek(date: Date): Date {
  const start = new Date(date);
  start.setDate(start.getDate() - start.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

const MobileCalendarView: React.FC<MobileCalendarViewProps> = ({ tasks, onToggle }) => {
  const { t } = useTranslation();
  const { isRtl } = useLanguageStore();
  const openTaskModal = useTaskModalStore((s) => s.openModal);
  const openDetail = useMobileUiStore((s) => s.openDetail);
  const [weekAnchor, setWeekAnchor] = useState(() => startOfWeek(new Date()));
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekAnchor);
      d.setDate(weekAnchor.getDate() + i);
      return d;
    }),
    [weekAnchor]
  );

  const dayHasTasks = (day: Date) => tasks.some((task) => isSameDay(new Date(task.dueDate), day));

  const agenda = tasks
    .filter((task) => isSameDay(new Date(task.dueDate), selectedDate))
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const monthLabel = weekAnchor.toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { month: 'long' });
  const dateLabel = selectedDate
    .toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { weekday: 'long', day: 'numeric', month: 'long' })
    .toUpperCase();

  const shiftWeek = (dir: 1 | -1) => {
    const next = new Date(weekAnchor);
    next.setDate(next.getDate() + dir * 7);
    setWeekAnchor(next);
  };

  return (
    <div className="min-h-screen bg-aby-page pb-24 dark:bg-aby-page-dark md:hidden">
      <div className="flex items-center justify-between px-5 pt-4">
        <h1 className="text-[23px] font-extrabold capitalize text-aby-ink dark:text-aby-ink-dark">{monthLabel}</h1>
        <div className="flex gap-2">
          <button
            onClick={() => shiftWeek(isRtl ? 1 : -1)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark"
          >
            <ChevronLeft className="rtl-flip h-[18px] w-[18px]" />
          </button>
          <button
            onClick={() => shiftWeek(isRtl ? -1 : 1)}
            className="flex h-[42px] w-[42px] items-center justify-center rounded-2xl border border-aby-line bg-aby-card text-aby-sub dark:border-aby-line-dark dark:bg-aby-card-dark dark:text-aby-sub-dark"
          >
            <ChevronRight className="rtl-flip h-[18px] w-[18px]" />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 px-5 pt-3.5">
        {weekDays.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const hasTasks = dayHasTasks(day);
          return (
            <button
              key={day.toISOString()}
              onClick={() => setSelectedDate(day)}
              className={`flex flex-1 flex-col items-center gap-1 rounded-2xl py-2.5 ${
                selected ? 'bg-aby-violet' : 'border border-aby-line bg-aby-card dark:border-aby-line-dark dark:bg-aby-card-dark'
              }`}
            >
              <span
                className={`text-[10px] font-bold tracking-wide ${
                  selected ? 'text-white/70' : 'text-aby-muted dark:text-aby-muted-dark'
                }`}
              >
                {day.toLocaleDateString(isRtl ? 'he-IL' : 'en-US', { weekday: 'narrow' })}
              </span>
              <span className={`text-base font-extrabold ${selected ? 'text-white' : 'text-aby-ink dark:text-aby-ink-dark'}`}>
                {day.getDate()}
              </span>
              <span
                className={`h-[5px] w-[5px] rounded-full ${
                  hasTasks ? (selected ? 'bg-white/85' : 'bg-aby-violet') : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>

      <div className="flex items-baseline justify-between px-5 pb-2.5 pt-6">
        <span className="text-[11px] font-extrabold tracking-wide text-aby-muted dark:text-aby-muted-dark">
          {dateLabel}
        </span>
        <button
          onClick={() => openTaskModal(selectedDate)}
          className="text-[12.5px] font-bold text-aby-violet dark:text-aby-violet-dark"
        >
          {t('mobile.calendar.addToDay')}
        </button>
      </div>

      <div className="flex flex-col gap-2.5 px-5 pb-7">
        {agenda.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-aby-line py-10 text-center text-sm font-medium text-aby-muted dark:border-aby-line-dark dark:text-aby-muted-dark">
            {t('calendar.noTasks')}
          </div>
        ) : (
          agenda.map((task) => (
            <MobileTaskRow
              key={task._id}
              task={task}
              onToggle={() => onToggle(task)}
              onOpen={() => openDetail(task._id)}
            />
          ))
        )}
      </div>
    </div>
  );
};

export default MobileCalendarView;

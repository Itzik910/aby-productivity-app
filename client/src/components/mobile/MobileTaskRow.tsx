import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronRight } from 'lucide-react';
import { MobileTask, formatTaskTime, isTaskDone } from '../../utils/taskDisplay';

interface MobileTaskRowProps {
  task: MobileTask;
  onToggle: () => void;
  onOpen: () => void;
  fresh?: boolean;
}

const MobileTaskRow: React.FC<MobileTaskRowProps> = ({ task, onToggle, onOpen, fresh }) => {
  const { t } = useTranslation();
  const done = isTaskDone(task);

  const metaBits = [
    done ? t('tasks.completedStatus') : formatTaskTime(task.dueDate),
    task.estimatedDuration ? `${task.estimatedDuration} min` : null,
    task.category,
  ].filter(Boolean);

  return (
    <div
      onClick={onOpen}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3.5 text-start ${
        fresh
          ? 'border-[#D9CFFF] bg-[#F3F0FF] dark:border-[#3D3468] dark:bg-[#241F3E]'
          : 'border-aby-line bg-aby-card dark:border-aby-line-dark dark:bg-aby-card-dark'
      }`}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        aria-label={t('tasks.complete')}
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] ${
          done ? 'bg-aby-green' : 'border-2 border-aby-line bg-white dark:border-aby-line-dark dark:bg-transparent'
        }`}
      >
        {done && <Check className="h-4 w-4 text-white" strokeWidth={3} />}
      </button>
      <div className="min-w-0 flex-1">
        <p
          className={`truncate text-[15px] font-semibold ${
            done ? 'text-aby-muted line-through dark:text-aby-muted-dark' : 'text-aby-ink dark:text-aby-ink-dark'
          }`}
        >
          {task.title}
        </p>
        <p className="mt-0.5 truncate text-xs font-medium text-aby-muted dark:text-aby-muted-dark">
          {metaBits.join(' · ')}
        </p>
      </div>
      <ChevronRight className="rtl-flip h-[18px] w-[18px] shrink-0 text-aby-line dark:text-aby-line-dark" />
    </div>
  );
};

export default MobileTaskRow;

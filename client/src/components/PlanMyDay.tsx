import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Sparkles, Clock, X, Loader2, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface ScheduleItem {
  taskId: string;
  title: string;
  order: number;
  reason: string;
  suggestedTime: string;
  estimatedMinutes: number;
}

interface PlanResult {
  morningBriefing: string;
  schedule: ScheduleItem[];
}

interface PlanMyDayProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlanMyDay: React.FC<PlanMyDayProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<PlanResult | null>(null);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/tasks/plan-my-day');
      setPlan(res.data);
    } catch {
      toast.error('Failed to generate plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPlan(null);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Plan My Day</h2>
              </div>
              <button onClick={handleClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {!plan && !loading && (
                <div className="text-center py-8">
                  <Calendar className="w-16 h-16 text-purple-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    Let ABY plan your day
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">
                    ABY will analyze your pending tasks and build an optimized schedule for today,
                    considering priority, deadlines, and location.
                  </p>
                  <button
                    onClick={handleGenerate}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                  >
                    Generate My Schedule
                  </button>
                </div>
              )}

              {loading && (
                <div className="text-center py-12">
                  <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">ABY is planning your perfect day...</p>
                </div>
              )}

              {plan && !loading && (
                <div className="space-y-4">
                  {/* Morning briefing */}
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 rounded-xl p-4">
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {plan.morningBriefing}
                      </p>
                    </div>
                  </div>

                  {/* Schedule items */}
                  <div className="space-y-2">
                    <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Today's Schedule
                    </div>
                    {plan.schedule.map((item) => (
                      <div
                        key={item.order}
                        className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                      >
                        <div className="flex-shrink-0 w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center text-sm font-bold text-purple-700 dark:text-purple-300">
                          {item.order}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                            {item.title}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            {item.suggestedTime && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {item.suggestedTime}
                              </span>
                            )}
                            {item.estimatedMinutes && (
                              <span className="text-xs text-gray-400">{item.estimatedMinutes}min</span>
                            )}
                          </div>
                          {item.reason && (
                            <div className="text-xs text-purple-600 dark:text-purple-400 mt-1 flex items-center gap-1">
                              <ChevronRight className="w-3 h-3" />
                              {item.reason}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="w-full py-2 text-sm text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    Regenerate
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PlanMyDay;

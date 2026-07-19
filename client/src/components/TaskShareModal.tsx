import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, UserPlus, Trash2, Loader2, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Collaborator {
  user: string;
  role: 'viewer' | 'editor';
  invitedAt: string;
  name?: string;
}

interface TaskShareModalProps {
  taskId: string;
  taskTitle: string;
  collaborators: Collaborator[];
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (collaborators: Collaborator[]) => void;
}

const TaskShareModal: React.FC<TaskShareModalProps> = ({
  taskId,
  taskTitle,
  collaborators,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'viewer' | 'editor'>('viewer');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await api.post(`/tasks/${taskId}/collaborators`, { email, role });
      toast.success(`${res.data.collaboratorName} added as ${role}`);
      onUpdate(res.data.collaborators);
      setEmail('');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to invite collaborator');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    try {
      const res = await api.delete(`/tasks/${taskId}/collaborators/${userId}`);
      toast.success('Collaborator removed');
      onUpdate(res.data.collaborators);
    } catch {
      toast.error('Failed to remove collaborator');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[110] bg-black/50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t('tasks.shareTask')}</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Sharing: <span className="font-medium text-gray-900 dark:text-white">{taskTitle}</span>
              </p>

              {/* Invite form */}
              <div className="flex gap-2">
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
                  placeholder="Collaborator email"
                  type="email"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'viewer' | 'editor')}
                  className="px-2 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={!email.trim() || loading}
                  className="p-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-40"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </button>
              </div>

              {/* Collaborators list */}
              {collaborators.length > 0 ? (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Collaborators ({collaborators.length})
                  </div>
                  {collaborators.map((collab) => (
                    <div
                      key={collab.user}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                          <Users className="w-4 h-4 text-purple-600" />
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {collab.name || collab.user}
                          </div>
                          <div className="text-xs text-gray-500">{collab.role}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(collab.user)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">No collaborators yet</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TaskShareModal;

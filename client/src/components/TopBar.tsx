import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bell, Moon, Sun, Monitor, Search, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { io as socketio, Socket } from 'socket.io-client';
import { useThemeStore } from '../stores/themeStore';
import { useLanguageStore } from '../stores/languageStore';
import { useNotificationStore, AppNotification } from '../stores/notificationStore';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';

interface TopBarProps {
  onOpenCommandPalette: () => void;
}

const AUTH_PATHS = ['/login', '/register', '/forgot-password', '/'];

const TopBar: React.FC<TopBarProps> = ({ onOpenCommandPalette }) => {
  const { t } = useTranslation();
  const { theme, setTheme } = useThemeStore();
  const { language, toggleLanguage, isRtl } = useLanguageStore();
  const { notifications, unreadCount, markAllAsRead, setNotifications, addNotification } = useNotificationStore();
  const { isAuthenticated, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const isAuthPage = AUTH_PATHS.includes(location.pathname);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch initial notifications
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        const data: AppNotification[] = (res.data.notifications || res.data || []).map((n: any) => ({
          id: String(n.id || n._id),
          type: n.type,
          title: n.title,
          message: n.message,
          read: n.read,
          createdAt: n.createdAt,
          data: n.data,
        }));
        setNotifications(data);
      } catch {
        // silently fail
      }
    };
    fetchNotifications();
  }, [isAuthenticated, setNotifications]);

  // Socket.IO real-time notification listener
  useEffect(() => {
    const { user, token } = useAuthStore.getState();
    if (!user || !token) return;

    const serverUrl = process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = socketio(serverUrl, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-room', user._id);
    });

    socket.on('notification', (notif: AppNotification) => {
      addNotification({ ...notif, id: String(notif.id) });
    });

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, addNotification]);

  if (isAuthPage) return null;

  const themeIcon = theme === 'dark' ? <Moon className="w-4 h-4" /> : theme === 'light' ? <Sun className="w-4 h-4" /> : <Monitor className="w-4 h-4" />;
  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 h-12 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center px-4 gap-2 shadow-sm"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {/* Spacer — leaves room for DashboardButton on the opposite side */}
      <div className="flex-1" />

      {/* Search / Command Palette */}
      <button
        onClick={onOpenCommandPalette}
        title={`${t('commandPalette.placeholder')} (Ctrl+K)`}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Ctrl+K</span>
      </button>

      {/* Language toggle */}
      <button
        onClick={toggleLanguage}
        title={language === 'en' ? 'Switch to Hebrew' : 'עבור לאנגלית'}
        className="px-2 py-1.5 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[36px] text-center"
      >
        {language === 'en' ? 'עב' : 'EN'}
      </button>

      {/* Theme toggle */}
      <button
        onClick={() => setTheme(nextTheme as 'light' | 'dark' | 'auto')}
        title={`Theme: ${t(`theme.${theme}`)}`}
        className="p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        {themeIcon}
      </button>

      {/* Notification bell */}
      {isAuthenticated && (
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications((v) => !v)}
            className="relative p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            title={t('notifications.title')}
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`absolute top-10 ${isRtl ? 'left-0' : 'right-0'} w-80 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50`}
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">{t('notifications.title')}</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => {
                        markAllAsRead();
                        api.post('/notifications/mark-read', { markAll: true }).catch(() => {});
                      }}
                      className="text-xs text-purple-600 hover:text-purple-800 transition-colors"
                    >
                      {t('notifications.markAllRead')}
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                      {t('notifications.noNotifications')}
                    </div>
                  ) : (
                    notifications.slice(0, 20).map((n) => (
                      <div
                        key={n.id}
                        className={`px-4 py-3 border-b border-gray-50 dark:border-gray-800 last:border-0 ${
                          !n.read ? 'bg-purple-50 dark:bg-purple-900/20' : ''
                        }`}
                      >
                        <div className="text-sm font-medium text-gray-900 dark:text-white">{n.title}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{n.message}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* User menu */}
      {isAuthenticated && (
        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu((v) => !v)}
            className="p-1.5 text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <User className="w-4 h-4" />
          </button>
          <AnimatePresence>
            {showUserMenu && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`absolute top-10 ${isRtl ? 'left-0' : 'right-0'} w-40 bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50`}
              >
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                    navigate('/login');
                  }}
                  className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  {t('nav.logout')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default TopBar;

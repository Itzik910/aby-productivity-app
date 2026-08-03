import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster, toast } from 'react-hot-toast';

// i18n — must be imported before any component that uses translations
import './i18n';

// Pages
import WelcomePage from './pages/WelcomePage';
import PremiumUpgradePage from './pages/PremiumUpgradePage';
import TasksPage from './pages/TasksPage';
import DashboardPage from './pages/DashboardPage';
import ChallengesPage from './pages/ChallengesPage';
import UserChallengesPage from './pages/UserChallengesPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import CalendarPage from './pages/CalendarPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AchievementsPage from './pages/AchievementsPage';
import HabitsPage from './pages/HabitsPage';

// Components
import DashboardButton from './components/DashboardButton';
import CreateTaskModal from './components/CreateTaskModal';
import TopBar from './components/TopBar';
import CommandPalette from './components/CommandPalette';
import NLPTaskModal from './components/NLPTaskModal';
import MobileTabBar from './components/mobile/MobileTabBar';
import ComposeSheet from './components/mobile/ComposeSheet';
import TaskDetailSheet from './components/mobile/TaskDetailSheet';
import OnboardingTour from './components/mobile/OnboardingTour';
import YouPage from './pages/YouPage';
import SettingsPage from './pages/SettingsPage';

// Stores
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { useTaskModalStore } from './stores/taskModalStore';
import { useLanguageStore } from './stores/languageStore';

// Simple loading component
const LoadingSpinner = ({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  
  return (
    <div className={`animate-spin rounded-full border-b-2 border-purple-600 ${sizeClasses[size]}`}></div>
  );
};

// Simple protected route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  console.log('[PROTECTED ROUTE] Auth check:', { isAuthenticated, isLoading });
 
  // Show loading while auth state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }
 
  if (!isAuthenticated) {
    console.log('[PROTECTED ROUTE] Not authenticated, showing login prompt');
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">🔐 Login Required</h1>
          <p className="text-xl text-gray-600 mb-8">Please log in to access this feature</p>
          <Link
            to="/login" 
            className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    );
  }
  
  console.log('[PROTECTED ROUTE] Authenticated, rendering protected content');
  return <>{children}</>;
};

function App() {
  const { isLoading, logout, isAuthenticated } = useAuthStore();
  const { theme } = useThemeStore();
  const { isOpen: isTaskModalOpen, initialDate, closeModal } = useTaskModalStore();
  const { isRtl } = useLanguageStore();
  const [showCommandPalette, setShowCommandPalette] = React.useState(false);
  const [showNLPModal, setShowNLPModal] = React.useState(false);

  // Listen for force-logout events fired by the API interceptor when the
  // refresh token is expired, so the in-memory Zustand state is also cleared.
  React.useEffect(() => {
    const handler = () => logout();
    window.addEventListener('aby:force-logout', handler);
    return () => window.removeEventListener('aby:force-logout', handler);
  }, [logout]);

  // The API interceptor fires this when a request timed out with no response
  // at all — almost always our free-tier host waking up from sleep — right
  // before it silently retries with a longer timeout. Let the user know
  // rather than leaving them staring at a stuck spinner.
  React.useEffect(() => {
    const handler = () => toast('מעיר את השרת… זה יכול לקחת עד דקה', { icon: '⏳', duration: 6000 });
    window.addEventListener('aby:server-waking', handler);
    return () => window.removeEventListener('aby:server-waking', handler);
  }, []);

  // Apply theme to document (supports 'auto' via prefers-color-scheme)
  React.useEffect(() => {
    const applyTheme = () => {
      if (theme === 'auto') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.classList.toggle('dark', prefersDark);
      } else {
        document.documentElement.classList.toggle('dark', theme === 'dark');
      }
    };
    applyTheme();
    if (theme === 'auto') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      mq.addEventListener('change', applyTheme);
      return () => mq.removeEventListener('change', applyTheme);
    }
  }, [theme]);

  // Ctrl+K / Cmd+K global shortcut for Command Palette
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Router>
      <div className="App">
        <TopBar onOpenCommandPalette={() => setShowCommandPalette(true)} />
        <DashboardButton />
        <CreateTaskModal
          isOpen={isTaskModalOpen}
          onClose={closeModal}
          initialDate={initialDate}
        />
        <CommandPalette
          isOpen={showCommandPalette}
          onClose={() => setShowCommandPalette(false)}
          onOpenNLP={() => { setShowCommandPalette(false); setShowNLPModal(true); }}
        />
        <NLPTaskModal
          isOpen={showNLPModal}
          onClose={() => setShowNLPModal(false)}
        />

        {/* Mobile-only bottom nav + global sheets + onboarding tour */}
        {isAuthenticated && (
          <div className="md:hidden">
            <MobileTabBar />
            <ComposeSheet />
            <TaskDetailSheet />
            <OnboardingTour />
          </div>
        )}

        <Routes>
          {/* Public Routes */}
          <Route path="/" element={<WelcomePage />} />
          
          {/* Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          
          {/* Main App Routes */}
          <Route path="/tasks" element={<ProtectedRoute><TasksPage /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
          <Route path="/challenges" element={<ProtectedRoute><ChallengesPage /></ProtectedRoute>} />
          <Route path="/my-challenges" element={<ProtectedRoute><UserChallengesPage /></ProtectedRoute>} />
          <Route path="/premium" element={<ProtectedRoute><PremiumUpgradePage /></ProtectedRoute>} />
          
          {/* Other routes */}
          <Route path="/calendar" element={<ProtectedRoute><CalendarPage /></ProtectedRoute>} />
          <Route path="/analytics" element={<ProtectedRoute><AnalyticsPage /></ProtectedRoute>} />
          <Route path="/achievements" element={<ProtectedRoute><AchievementsPage /></ProtectedRoute>} />
          <Route path="/habits" element={<ProtectedRoute><HabitsPage /></ProtectedRoute>} />
          <Route path="/you" element={<ProtectedRoute><YouPage /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
          
          {/* Catch all route */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">🚀 ABY Productivity</h1>
                <p className="text-xl text-gray-600 mb-8">Page not found</p>
                <a 
                  href="/" 
                  className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Go Home
                </a>
              </div>
            </div>
          } />
        </Routes>

        {/* Global Toaster */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: theme === 'dark' ? '#1a1a2e' : '#ffffff',
              color: theme === 'dark' ? '#ffffff' : '#1f2937',
              border: `1px solid ${theme === 'dark' ? '#374151' : '#e5e7eb'}`,
            },
            success: {
              iconTheme: {
                primary: '#22c55e',
                secondary: '#ffffff',
              },
            },
          }}
        />
      </div>
    </Router>
  );
}

export default App; 
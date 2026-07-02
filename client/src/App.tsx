import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';

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

// Components
import DashboardButton from './components/DashboardButton';
import CreateTaskModal from './components/CreateTaskModal';

// Stores
import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { useTaskModalStore } from './stores/taskModalStore';

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
  const { isLoading } = useAuthStore();
  const { theme } = useThemeStore();
  const { isOpen: isTaskModalOpen, initialDate, closeModal } = useTaskModalStore();

  // Apply theme to document
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

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
        <DashboardButton />
        <CreateTaskModal 
          isOpen={isTaskModalOpen} 
          onClose={closeModal}
          initialDate={initialDate}
        />
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
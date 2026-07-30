import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home } from 'lucide-react';

const DashboardButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Don't show on dashboard or auth pages
  if (location.pathname === '/' || location.pathname === '/dashboard' || 
      location.pathname === '/login' || location.pathname === '/register' ||
      location.pathname === '/forgot-password') {
    return null;
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate('/dashboard')}
      className="fixed top-14 left-6 z-40 hidden md:flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
      title="Return to Dashboard"
    >
      <Home className="w-4 h-4" />
      <span className="text-sm font-medium">Dashboard</span>
    </motion.button>
  );
};

export default DashboardButton; 
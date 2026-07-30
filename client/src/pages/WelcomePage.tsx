import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle,
  Brain,
  MapPin,
  Calendar,
  TrendingUp,
  Trophy,
  Bell,
  Users,
  ArrowRight
} from 'lucide-react';
import MobileAuthShell from '../components/mobile/MobileAuthShell';

const WelcomePage: React.FC = () => {
  const { t } = useTranslation();
  const features = [
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'AI-Powered Suggestions',
      description: 'Get personalized task completion suggestions based on your context and preferences.'
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Location-Based Tasks',
      description: 'Receive contextual suggestions when you\'re near relevant locations.'
    },
    {
      icon: <Calendar className="w-6 h-6" />,
      title: 'Smart Calendar',
      description: 'Interactive annual view with drag-and-drop task management.'
    },
    {
      icon: <TrendingUp className="w-6 h-6" />,
      title: 'Analytics & Insights',
      description: 'Track your productivity patterns and get actionable insights.'
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: 'Achievements & Rewards',
      description: 'Earn badges and rewards for your productivity milestones.'
    },
    {
      icon: <Bell className="w-6 h-6" />,
      title: 'Smart Notifications',
      description: 'Intelligent reminders and location-triggered alerts.'
    }
  ];

  const stats = [
    { number: '10K+', label: 'Active Users' },
    { number: '500K+', label: 'Tasks Completed' },
    { number: '95%', label: 'Satisfaction Rate' },
    { number: '24/7', label: 'AI Support' }
  ];

  return (
    <>
      <MobileAuthShell>
        <div className="flex flex-1 flex-col justify-center py-6">
          <div className="text-[11px] font-extrabold tracking-[.14em] text-[#A79BFF]">{t('mobile.auth.eyebrow')}</div>
          <h1 className="mt-3 text-[33px] font-extrabold leading-[1.14] text-white">{t('mobile.auth.headline')}</h1>
          <p className="mt-3.5 text-[15px] leading-relaxed text-white/70">{t('mobile.auth.sub')}</p>
          <div className="mt-6 flex flex-col gap-3">
            {[t('mobile.auth.proof1'), t('mobile.auth.proof2'), t('mobile.auth.proof3')].map((p) => (
              <div key={p} className="flex items-center gap-3">
                <span className="flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full bg-[rgba(124,92,255,.24)] text-[#C9BEFF]">
                  <CheckCircle className="h-3.5 w-3.5" />
                </span>
                <span className="text-sm font-semibold leading-snug text-white/90">{p}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Link
            to="/register"
            className="flex h-14 w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-white shadow-[0_16px_34px_-16px_rgba(124,92,255,.9)]"
            style={{ background: 'linear-gradient(135deg,#7C5CFF,#4436C6)' }}
          >
            {t('mobile.auth.startCta')}
          </Link>
          <Link to="/login" className="flex h-[46px] w-full items-center justify-center text-sm font-bold text-white/70">
            {t('mobile.auth.haveAccount')}
          </Link>
          <p className="text-center text-xs font-semibold text-white/40">{t('mobile.auth.footer')}</p>
        </div>
      </MobileAuthShell>

      <div className="hidden min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 md:block">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-2"
          >
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">A</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              ABY
            </span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center space-x-6"
          >
            <Link
              to="/login"
              className="text-gray-600 hover:text-purple-600 font-medium transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Get Started
            </Link>
          </motion.div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-20">
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-5xl md:text-7xl font-bold mb-6"
          >
            <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
              Transform Your
            </span>
            <br />
            <span className="text-gray-800">
              Productivity
            </span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto"
          >
            An emotionally engaging, AI-powered task assistant that helps you organize, 
            optimize, and achieve more with intelligent suggestions and location-aware features.
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6"
          >
            <Link
              to="/register"
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold flex items-center space-x-2 transition-all transform hover:scale-105 shadow-lg"
            >
              <span>Let's Begin</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto"
        >
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-2">
                {stat.number}
              </div>
              <div className="text-gray-600">
                {stat.label}
              </div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Why Choose ABY?
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Our AI-powered platform combines cutting-edge technology with intuitive design 
            to help you achieve your productivity goals.
          </p>
        </motion.div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: index * 0.1 }}
              className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-2"
            >
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-blue-500 rounded-xl flex items-center justify-center text-white mb-6">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-4xl mx-auto"
        >
          <h2 className="text-4xl font-bold text-gray-800 mb-6">
            Ready to Get Started?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join thousands of users who have transformed their productivity with ABY.
          </p>
          <Link
            to="/register"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-xl text-lg font-semibold inline-flex items-center space-x-2 transition-all transform hover:scale-105 shadow-lg"
          >
            <span>Start Your Journey</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </section>
      </div>
    </>
  );
};

export default WelcomePage;
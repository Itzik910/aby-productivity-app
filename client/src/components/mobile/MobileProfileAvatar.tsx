import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

/**
 * The "אני" (You) entry point now lives here instead of a bottom-nav tab —
 * every mobile screen carries this circle so profile/habits/achievements
 * stay one tap away. Keeps the data-tour="you-tab" hook so the onboarding
 * tour (which always runs from /dashboard) still finds it.
 */
const MobileProfileAvatar: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  return (
    <button
      data-tour="you-tab"
      onClick={() => navigate('/you')}
      aria-label="Profile"
      className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[#EDE8FE] text-[15px] font-extrabold text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark"
    >
      {(user?.name || '?').charAt(0).toUpperCase()}
    </button>
  );
};

export default MobileProfileAvatar;

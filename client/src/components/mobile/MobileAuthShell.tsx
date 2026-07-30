import React from 'react';
import { useLanguageStore } from '../../stores/languageStore';

interface MobileAuthShellProps {
  children: React.ReactNode;
}

/**
 * Full-bleed violet-gradient screen shared by the mobile landing, sign-up
 * and sign-in screens. Always dark regardless of theme — the mobile
 * equivalent of the existing `.auth-page` class, which already forces a
 * fixed light look on the desktop auth pages regardless of dark mode.
 */
const MobileAuthShell: React.FC<MobileAuthShellProps> = ({ children }) => {
  const { language, setLanguage, isRtl } = useLanguageStore();

  const langOpts: Array<{ key: 'en' | 'he'; code: string }> = [
    { key: 'en', code: 'EN' },
    { key: 'he', code: 'עב' },
  ];

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="md:hidden fixed inset-0 z-10 flex flex-col overflow-hidden"
      style={{ background: 'radial-gradient(125% 68% at 12% 0%,#4A34A8 0%,#241B4D 48%,#100E1B 100%)' }}
    >
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-2">
          <span
            className="flex h-[30px] w-[30px] items-center justify-center rounded-[10px] text-[15px] font-extrabold text-white"
            style={{ background: 'linear-gradient(135deg,#7C5CFF,#4436C6)' }}
          >
            ✦
          </span>
          <span className="text-[15px] font-extrabold tracking-wide text-white">ABY</span>
        </div>
        <div className="flex gap-1 rounded-xl bg-white/[.09] p-1">
          {langOpts.map((o) => (
            <button
              key={o.key}
              onClick={() => setLanguage(o.key)}
              className={`rounded-[9px] px-2.5 py-1.5 text-xs font-bold ${
                language === o.key ? 'bg-white text-aby-ink' : 'text-white/70'
              }`}
            >
              {o.code}
            </button>
          ))}
        </div>
      </div>
      <div className="aby-scroll flex flex-1 flex-col overflow-y-auto px-6 pb-7">{children}</div>
    </div>
  );
};

export default MobileAuthShell;

import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Sparkles } from 'lucide-react';
import { useOnboardingStore, TOUR_STEPS } from '../../stores/onboardingStore';

const TOUR_TARGETS = ['ask-bar', 'up-now', 'add-fab', 'you-tab'];

/**
 * Welcome sheet + 4-step spotlight overlay. Targets are found at runtime via
 * data-tour="..." attributes on the real Today screen / bottom nav elements
 * (getBoundingClientRect), rather than hard-coded pixel offsets — our layout
 * doesn't match the original design mock's exact geometry.
 */
const OnboardingTour: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const stage = useOnboardingStore((s) => s.stage);
  const next = useOnboardingStore((s) => s.next);
  const end = useOnboardingStore((s) => s.end);
  const [rect, setRect] = useState<DOMRect | null>(null);

  // The tour's targets only exist on the Today screen / bottom nav.
  useEffect(() => {
    if (stage !== null && location.pathname !== '/dashboard') {
      navigate('/dashboard');
    }
  }, [stage, location.pathname, navigate]);

  useEffect(() => {
    if (typeof stage !== 'number') {
      setRect(null);
      return;
    }
    // Stale rect from the previous step must never linger while we look for
    // the new target - it would spotlight the wrong element for a frame.
    setRect(null);
    let raf = 0;
    let attempts = 0;
    const measure = () => {
      const el = document.querySelector(`[data-tour="${TOUR_TARGETS[stage]}"]`);
      if (el) {
        setRect(el.getBoundingClientRect());
      } else if (attempts++ < 30) {
        raf = requestAnimationFrame(measure);
      }
    };
    raf = requestAnimationFrame(measure);

    // Mobile browsers (notably iOS Safari) resize the visual viewport as
    // their address bar/toolbar collapses or expands - which happens mid-tour
    // as the user taps around. getBoundingClientRect() is only accurate for
    // the instant it's called, so without re-measuring on these events the
    // spotlight and tooltip drift away from the real target position.
    const remeasure = () => raf = requestAnimationFrame(measure);
    window.addEventListener('resize', remeasure);
    window.addEventListener('scroll', remeasure, true);
    window.visualViewport?.addEventListener('resize', remeasure);
    window.visualViewport?.addEventListener('scroll', remeasure);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', remeasure);
      window.removeEventListener('scroll', remeasure, true);
      window.visualViewport?.removeEventListener('resize', remeasure);
      window.visualViewport?.removeEventListener('scroll', remeasure);
    };
  }, [stage]);

  if (stage === null) return null;

  if (stage === 'welcome') {
    return (
      <div className="fixed inset-0 z-[70] flex items-end bg-[rgba(15,13,26,.78)] p-5">
        <div className="w-full rounded-[26px] bg-white p-6 dark:bg-aby-card-dark">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#EDE8FE] text-aby-violet dark:bg-[#2E2A4A] dark:text-aby-violet-dark">
            <Sparkles className="h-[26px] w-[26px]" />
          </div>
          <h2 className="mt-4 text-2xl font-extrabold leading-tight text-aby-ink dark:text-aby-ink-dark">
            {t('mobile.tour.welcomeTitle')}
          </h2>
          <p className="mt-2.5 text-sm leading-relaxed text-aby-sub dark:text-aby-sub-dark">
            {t('mobile.tour.welcomeBody')}
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button onClick={next} className="h-[54px] w-full rounded-2xl bg-aby-violet text-[15px] font-bold text-white">
              {t('mobile.tour.showAround')}
            </button>
            <button onClick={end} className="h-12 w-full rounded-2xl text-sm font-bold text-aby-muted dark:text-aby-muted-dark">
              {t('mobile.tour.exploreSelf')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!rect) return null;

  const steps = t('mobile.tour.steps', { returnObjects: true }) as Array<{ title: string; body: string }>;
  const step = steps[stage];
  const isLast = stage === TOUR_STEPS - 1;
  const pad = 6;
  const spaceBelow = window.innerHeight - rect.bottom;
  const tipTop = spaceBelow > 220 ? rect.bottom + 16 : Math.max(16, rect.top - 190);

  return (
    <div className="fixed inset-0 z-[70]">
      <button onClick={next} className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent" aria-label="Next" />
      <div
        className="pointer-events-none absolute rounded-[20px]"
        style={{
          top: rect.top - pad,
          left: rect.left - pad,
          width: rect.width + pad * 2,
          height: rect.height + pad * 2,
          boxShadow: '0 0 0 9999px rgba(15,13,26,.78)',
        }}
      />
      <div
        className="absolute mx-5 rounded-[20px] bg-white p-4 shadow-2xl dark:bg-aby-card-dark"
        style={{ top: tipTop, left: 0, right: 0, maxWidth: 340, marginInline: 'auto' }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-extrabold tracking-wide text-aby-violet dark:text-aby-violet-dark">
            {t('mobile.tour.ofCount', { n: stage + 1, total: TOUR_STEPS })}
          </span>
          <button onClick={end} className="text-xs font-bold text-aby-muted dark:text-aby-muted-dark">
            {t('mobile.tour.skip')}
          </button>
        </div>
        <h3 className="mt-2 text-[17px] font-extrabold leading-tight text-aby-ink dark:text-aby-ink-dark">{step.title}</h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-aby-sub dark:text-aby-sub-dark">{step.body}</p>
        <button onClick={next} className="mt-3.5 h-[46px] w-full rounded-2xl bg-aby-ink text-sm font-bold text-white dark:bg-white dark:text-aby-ink">
          {isLast ? t('mobile.tour.start') : t('mobile.tour.next')}
        </button>
      </div>
    </div>
  );
};

export default OnboardingTour;

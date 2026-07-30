import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TourStage = 'welcome' | number | null;

export const TOUR_STEPS = 4;

interface OnboardingState {
  stage: TourStage;
  hasSeenTour: boolean;
  start: () => void;
  next: () => void;
  end: () => void;
  maybeAutoStart: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      stage: null,
      hasSeenTour: false,

      start: () => set({ stage: 'welcome' }),

      next: () =>
        set((s) => {
          if (typeof s.stage !== 'number') return { stage: 0 };
          if (s.stage >= TOUR_STEPS - 1) return { stage: null, hasSeenTour: true };
          return { stage: s.stage + 1 };
        }),

      end: () => set({ stage: null, hasSeenTour: true }),

      maybeAutoStart: () => {
        if (!get().hasSeenTour) set({ stage: 'welcome' });
      },
    }),
    {
      name: 'aby-onboarding',
      partialize: (state) => ({ hasSeenTour: state.hasSeenTour }),
    }
  )
);

import { create } from 'zustand';

export type MobileSheet = 'compose' | 'detail' | 'fix' | null;

interface MobileUiState {
  sheet: MobileSheet;
  detailTaskId: string | null;
  openCompose: () => void;
  openDetail: (taskId: string) => void;
  openFix: () => void;
  closeSheet: () => void;
}

export const useMobileUiStore = create<MobileUiState>((set) => ({
  sheet: null,
  detailTaskId: null,
  openCompose: () => set({ sheet: 'compose', detailTaskId: null }),
  openDetail: (taskId) => set({ sheet: 'detail', detailTaskId: taskId }),
  openFix: () => set({ sheet: 'fix', detailTaskId: null }),
  closeSheet: () => set({ sheet: null, detailTaskId: null }),
}));

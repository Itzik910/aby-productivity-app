import { create } from 'zustand';

interface TaskModalStore {
  isOpen: boolean;
  initialDate?: Date;
  openModal: (initialDate?: Date) => void;
  closeModal: () => void;
}

export const useTaskModalStore = create<TaskModalStore>((set) => ({
  isOpen: false,
  initialDate: undefined,
  openModal: (initialDate) => set({ isOpen: true, initialDate }),
  closeModal: () => set({ isOpen: false, initialDate: undefined }),
})); 
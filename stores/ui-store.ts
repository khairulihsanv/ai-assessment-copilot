import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  activeModal: string | null;
  openModal: (id: string) => void;
  closeModal: () => void;

  activeFilter: string;
  setActiveFilter: (filter: string) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeModal: null,
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  activeFilter: "all",
  setActiveFilter: (filter) => set({ activeFilter: filter }),
}));

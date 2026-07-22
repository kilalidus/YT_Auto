'use client'

import { create } from 'zustand'

export type ViewKey =
  | 'dashboard'
  | 'channels'
  | 'analysis'
  | 'recommendations'
  | 'idea-lab'
  | 'script'
  | 'workflow'
  | 'planner'
  | 'notes'
  | 'analytics'
  | 'files'
  | 'community'
  | 'notifications'
  | 'settings'

interface AppState {
  view: ViewKey
  setView: (v: ViewKey) => void
  searchOpen: boolean
  setSearchOpen: (b: boolean) => void
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  // optional context payload passed to a view (e.g. open note id)
  viewParams: Record<string, unknown>
  setViewParams: (p: Record<string, unknown>) => void
  navigate: (v: ViewKey, params?: Record<string, unknown>) => void
}

export const useAppStore = create<AppState>((set) => ({
  view: 'dashboard',
  setView: (view) => set({ view }),
  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),
  sidebarCollapsed: false,
  toggleSidebar: () =>
    set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  viewParams: {},
  setViewParams: (viewParams) => set({ viewParams }),
  navigate: (view, params = {}) =>
    set({ view, viewParams: params, searchOpen: false }),
}))

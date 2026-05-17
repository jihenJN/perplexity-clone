import { create } from "zustand"

export const useSearchStore = create((set) => ({
  pendingSearch: null,   // consumed once on DisplayResult mount
  currentQuery:  "",     // persists so Header can always read the title

  setPendingSearch: (query, type) =>
    set({ pendingSearch: { query, type }, currentQuery: query }),

  clearPendingSearch: () =>
    set({ pendingSearch: null }),          // currentQuery intentionally kept

  setCurrentQuery: (query) =>
    set({ currentQuery: query }),          // used by DisplayResult on revisits
}))

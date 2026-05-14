import { create } from "zustand"
import { DEFAULT_MODEL_ID } from "@/lib/ai/models"

export const useModelStore = create((set) => ({
  selectedModelId: DEFAULT_MODEL_ID,
  setModel: (id) => set({ selectedModelId: id }),
}))
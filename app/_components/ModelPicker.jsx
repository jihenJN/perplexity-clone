"use client"

import { Cpu, Check } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MODELS } from "@/lib/ai/models"
import { useModelStore } from "@/lib/stores/modelStore"

/**
 * ModelPicker
 *
 * A self-contained dropdown that reads from and writes to the global
 * modelStore. Drop it anywhere — no props required.
 *
 * Optional:
 *   @prop {string} className  Extra classes on the trigger button.
 *   @prop {"sm"|"default"} size  Button size variant (default: "sm").
 */
export function ModelPicker({ className = "", size = "sm" }) {
  const { selectedModelId, setModel } = useModelStore()
  const activeModel = MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={`${buttonVariants({ variant: "ghost", size })} ${className}`}
        aria-label={`Selected model: ${activeModel.label}. Click to change.`}
      >
        <Cpu className="text-gray-500 h-4 w-4 mr-1 shrink-0" aria-hidden="true" />
        <span className="text-xs text-gray-600 hidden sm:inline truncate max-w-[120px]">
          {activeModel.label}
        </span>
        <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hidden sm:inline shrink-0">
          {activeModel.badge}
        </span>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-64" align="start">
        {MODELS.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onClick={() => setModel(model.id)}
            className="flex flex-col items-start gap-0.5 cursor-pointer"
            // Announce the selected state to screen readers
            aria-selected={selectedModelId === model.id}
          >
            <div className="flex items-center gap-2 w-full">
              <span className="text-sm font-medium">{model.label}</span>
              <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded shrink-0">
                {model.badge}
              </span>
              {selectedModelId === model.id && (
                <Check className="h-3.5 w-3.5 text-green-600 shrink-0" aria-hidden="true" />
              )}
            </div>
            <p className="text-xs text-gray-400 leading-snug">{model.desc}</p>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

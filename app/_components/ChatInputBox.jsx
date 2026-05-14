"use client"
import Image from "next/image"
import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Atom, AudioLines, Cpu, Globe, Mic, Paperclip, SearchCheck } from "lucide-react"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser } from "@clerk/nextjs"
import { supabase } from "../services/Supabase"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"


import { MODELS } from "@/lib/ai/models"
import { useModelStore } from "@/lib/stores/modelStore"

function ChatInputBox() {
  const [userSearchInput, setUserSearchInput] = useState("")
  const [searchType, setSearchType]           = useState("search")
  const [loading, setLoading]                 = useState(false)
  const { user }                              = useUser()
  const router                                = useRouter()

  // ── model selection ────────────────────────────────────────────────────────
  const { selectedModelId, setModel } = useModelStore()
  const activeModel = MODELS.find((m) => m.id === selectedModelId) ?? MODELS[0]

  const onSearchQuery = async () => {
    if (!userSearchInput.trim()) return
    setLoading(true)
    const libId = uuidv4()
    await supabase.from("Library").insert([{
      searchInput:  userSearchInput,
      userEmail:    user?.primaryEmailAddress?.emailAddress,
      type:         searchType,
      libId,
    }])
    setLoading(false)
    router.push("/search/" + libId)
  }

  return (
    <div className="flex flex-col items-center min-h-screen justify-center px-4">
      <Image
        src="/Perplexity_AI_logo.svg"
        alt="logo"
        width={180}
        height={150}
        className="w-36 sm:w-48 md:w-64 h-auto"
      />

      <div className="p-4 sm:p-5 w-full max-w-2xl border rounded-2xl mt-8 sm:mt-10">
        <Tabs defaultValue="search" className="w-full">

          <TabsContent value="search">
            <input
              type="text"
              placeholder="Ask Anything..."
              onChange={(e) => setUserSearchInput(e.target.value)}
              className="w-full text-base sm:text-xl p-2 outline-none"
            />
          </TabsContent>
          <TabsContent value="research">
            <input
              type="text"
              placeholder="Research Anything..."
              onChange={(e) => setUserSearchInput(e.target.value)}
              className="w-full text-base sm:text-xl p-2 outline-none"
            />
          </TabsContent>

          <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
            <TabsList className="shrink-0">
              <TabsTrigger value="search"   onClick={() => setSearchType("search")}>
                <SearchCheck className="h-4 w-4 mr-1" /><span className="hidden xs:inline">Search</span>
              </TabsTrigger>
              <TabsTrigger value="research" onClick={() => setSearchType("research")}>
                <Atom className="h-4 w-4 mr-1" /><span className="hidden xs:inline">Research</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* ── Model picker ──────────────────────────────────────────── */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  <Cpu className="text-gray-500 h-4 w-4 mr-1" />
                  {/* Show active model label */}
                  <span className="text-xs text-gray-600 hidden sm:inline">
                    {activeModel.label}
                  </span>
                  {/* Badge */}
                  <span className="ml-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hidden sm:inline">
                    {activeModel.badge}
                  </span>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="w-64">
                  {MODELS.map((model) => (
                    <DropdownMenuItem
                      key={model.id}
                      onClick={() => setModel(model.id)}
                      className={`flex flex-col items-start gap-0.5 cursor-pointer ${
                        selectedModelId === model.id ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className="text-sm font-medium">{model.label}</span>
                        <span className="ml-auto text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          {model.badge}
                        </span>
                        {/* Checkmark for active model */}
                        {selectedModelId === model.id && (
                          <span className="text-xs text-green-600 font-bold">✓</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">{model.desc}</p>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Globe className="text-gray-500 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant="ghost" size="icon" className="hidden sm:flex">
                <Paperclip className="text-gray-500 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <Mic className="text-gray-500 h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button
                size="icon"
                disabled={loading}
                onClick={onSearchQuery}
              >
                {!userSearchInput
                  ? <AudioLines className="text-white h-4 w-4 sm:h-5 sm:w-5" />
                  : <ArrowRight className="text-white h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>
            </div>
          </div>
        </Tabs>
      </div>
    </div>
  )
}

export default ChatInputBox
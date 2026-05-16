"use client"

import Image from "next/image"
import React, { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowRight, Atom, AudioLines, Globe, Mic, Paperclip, SearchCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useUser } from "@clerk/nextjs"
import { supabase } from "../services/Supabase"
import { v4 as uuidv4 } from "uuid"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ModelPicker } from "./ModelPicker"



function ChatInputBox() {
  const [userSearchInput, setUserSearchInput] = useState("")
  const [searchType, setSearchType]           = useState("search")
  const [loading, setLoading]                 = useState(false)
  const { user }                              = useUser()
  const router                                = useRouter()
  const [, startTransition]                   = useTransition()

  const onSearchQuery = async () => {
    const trimmed = userSearchInput.trim()
    if (!trimmed) return

    setLoading(true)
    const libId = uuidv4()

    const { error } = await supabase.from("Library").insert([{
      searchInput: trimmed,
      userEmail:   user?.primaryEmailAddress?.emailAddress,
      type:        searchType,
      libId,
    }])

    if (error) {
      console.error("Failed to save search:", error)
      setLoading(false)
      return
    }

    // Navigate inside a transition so the button stays disabled until the
    // route change is committed — no flicker back to active state.
    startTransition(() => {
      router.push("/search/" + libId)
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSearchQuery()
    }
  }

  return (
    <div className="flex flex-col items-center min-h-screen justify-center px-4">
      <Image
        src="/Perplexity_AI_logo.svg"
        alt="Perplexity clone logo"
        width={180}
        height={150}
        className="w-36 sm:w-48 md:w-64 h-auto"
        priority
      />

      <div className="p-4 sm:p-5 w-full max-w-2xl border rounded-2xl mt-8 sm:mt-10">
        <Tabs defaultValue="search" className="w-full">

          <TabsContent value="search">
            <input
              type="text"
              value={userSearchInput}
              placeholder="Ask Anything..."
              onChange={(e) => setUserSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-base sm:text-xl p-2 outline-none"
            />
          </TabsContent>

          <TabsContent value="research">
            <input
              type="text"
              value={userSearchInput}
              placeholder="Research Anything..."
              onChange={(e) => setUserSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full text-base sm:text-xl p-2 outline-none"
            />
          </TabsContent>

          <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
            <TabsList className="shrink-0">
              <TabsTrigger value="search"   onClick={() => setSearchType("search")}>
                <SearchCheck className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Search</span>
              </TabsTrigger>
              <TabsTrigger value="research" onClick={() => setSearchType("research")}>
                <Atom className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Research</span>
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              {/* ← Shared component, reads/writes modelStore internally */}
              <ModelPicker />

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
                disabled={loading || !userSearchInput.trim()}
                onClick={onSearchQuery}
                aria-label="Submit search"
              >
                {!userSearchInput.trim()
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

"use client";
import Image from "next/image";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight, Atom, AudioLines, Cpu, Globe, Mic, Paperclip, SearchCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIModelsOptions } from "../services/Shared";
import { useUser } from "@clerk/nextjs";
import { supabase } from "../services/Supabase";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";

function ChatInputBox() {
  const [userSearchInput, setUserSearchInput] = useState("");
  const [searchType, setSearchType] = useState("search");
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSearchQuery = async () => {
    setLoading(true);
    const libId = uuidv4();
    const { data } = await supabase.from("Library").insert([{
      searchInput: userSearchInput,
      userEmail: user?.primaryEmailAddress?.emailAddress,
      type: searchType,
      libId,
    }]).select();
    setLoading(false);
    router.push("/search/" + libId);
    console.log(data?.[0]);
  };

  return (
    <div className="flex flex-col items-center min-h-screen justify-center px-4">
      {/* Logo — scales down on mobile */}
      <Image
        src="/Perplexity_AI_logo.svg"
        alt="logo"
        width={180}
        height={150}
        className="w-36 sm:w-48 md:w-64 h-auto"
      />

      {/* Card */}
      <div className="p-4 sm:p-5 w-full max-w-2xl border rounded-2xl mt-8 sm:mt-10">
        <Tabs defaultValue="search" className="w-full">

          {/* Input area */}
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

          {/* Bottom row: tabs left, icons right */}
          <div className="flex flex-wrap justify-between items-center gap-2 mt-2">
            <TabsList className="shrink-0">
              <TabsTrigger value="search" onClick={() => setSearchType("search")}>
                <SearchCheck className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Search</span>
              </TabsTrigger>
              <TabsTrigger value="research" onClick={() => setSearchType("research")}>
                <Atom className="h-4 w-4 mr-1" />
                <span className="hidden xs:inline">Research</span>
              </TabsTrigger>
            </TabsList>

            {/* Icon buttons */}
            <div className="flex items-center gap-1 sm:gap-2 shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger className={buttonVariants({ variant: "ghost", size: "icon" })}>
                  <Cpu className="text-gray-500 h-4 w-4 sm:h-5 sm:w-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {AIModelsOptions.map((model, index) => (
                    <DropdownMenuItem key={index}>
                      <div className="mb-1">
                        <h2 className="text-sm">{model.name}</h2>
                        <p className="text-xs">{model.desc}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Hide less-critical icons on very small screens */}
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
                onClick={() => userSearchInput && onSearchQuery()}
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
  );
}

export default ChatInputBox;
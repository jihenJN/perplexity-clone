"use client";
import Image from "next/image";
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  Atom,
  AudioLines,
  Cpu,
  Globe,
  Mic,
  Paperclip,
  SearchCheck,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AIModelsOptions } from "../services/Shared";
import { useUser } from "@clerk/nextjs";
import { supabase } from "../services/Supabase";
import { v4 as uuidv4 } from 'uuid';
function ChatInputBox() {
  const [userSearchInput, setUserSearchInput] = useState();
  const [searchType, setSearchType] = useState();
  const { user } = useUser();
  const [loading,setLoading]=useState(false);
  const onSearchQuery = async () => {
     setLoading(true);
    const libId=uuidv4();
     
    const {data} = await supabase.from('Library').insert([
      {
        searchInput: userSearchInput,
        userEmail: user?.primaryEmailAddress?.emailAddress,
        type: searchType,
        libId:libId,
      },
    ]).select();
    setLoading(false);
    //redirect to new screen
    console.log(data[0]);
  };
  return (
    <div className=" flex flex-col items-center h-screen justify-center ">
      <Image
        src={"/Perplexity_AI_logo.svg"}
        alt="logo"
        width={250}
        height={200}
      />
      <div className="p-5 w-full max-w-2xl border rounded-2xl mt-10">
        <div className="flex  justify-between items-end ">
          <Tabs defaultValue="search" className="w-[400px]">
            <TabsContent value="search">
              <input
                type="text"
                placeholder="Ask Anything..."
                onChange={(e) => setUserSearchInput(e.target.value)}
                className="w-full p-2 outline-none"
              />
            </TabsContent>
            <TabsContent value="research">
              <input
                type="text"
                placeholder="Research Anything..."
                onChange={(e) => setUserSearchInput(e.target.value)}
                className="w-full p-2 outline-none"
              />
            </TabsContent>
            <TabsList>
              <TabsTrigger
                value="search"
                onClick={() => setSearchType("search")}
              >
                {" "}
                <SearchCheck />
                Search
              </TabsTrigger>
              <TabsTrigger
                value="research"
                onClick={() => setSearchType("research")}
              >
                <Atom />
                Research
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-4 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger
                className={buttonVariants({ variant: "ghost" })}
              >
                <Cpu className="text-gray-500 h-5 w-5" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {/* <DropdownMenuLabel ropdownMenuLabel>My Account</DropdownMenuLabel> */}
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
            <Button variant="ghost">
              <Globe className="text-gray-500 h-5 w-5" />
            </Button>
            <Button variant="ghost">
              <Paperclip className="text-gray-500 h-5 w-5" />
            </Button>
            <Button variant="ghost">
              <Mic className="text-gray-500 h-5 w-5" />
            </Button>
            <Button onClick={()=>{userSearchInput ? onSearchQuery(): null}}>
              {!userSearchInput ? (
                <AudioLines className="text-white h-5 w-5" />
              ) : (
                <ArrowRight className="text-white h-5 w-5" disabled={loading}/>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatInputBox;

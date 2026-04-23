"use client";
import { supabase } from "@/app/services/Supabase";
import { useUser } from "@clerk/nextjs";
import { SquareArrowOutUpRight } from "lucide-react";
import moment from "moment/moment";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function Library() {
  const { user } = useUser();
  const [libraryHistory, setLibraryHistory] = useState();
  const router = useRouter();
  useEffect(() => {
    user && GetLibraryHistory();
  }, [user]);

  const GetLibraryHistory = async () => {
    let { data: Library, error } = await supabase
      .from("Library")
      .select("*")
      .eq("userEmail", user?.primaryEmailAddress?.emailAddress)
      .order("id", { ascending: false });
    setLibraryHistory(Library);
    console.log(Library);
  };
  return (
    <div className="mt-20px-10 md:px-20 lg:px-36 xl:px-56 mt-20">
      <h2 className="font-bold text-2xl">Library</h2>
      <div className="mt-7">
        {libraryHistory?.map((item, index) => (
          <div key={index} className="cursor-pointer" onClick={()=> router.push('/search/'+ item.libId)}>
            <div className="flex justify-between">
              <div>
                <h2 className="font-bold">{item.searchInput}</h2>
                <p className="text-xs text-gray-500">
                  {moment(item.created_at).fromNow()}
                </p>
              </div>
            <SquareArrowOutUpRight className='h-4 w-4'/>
            </div>
            <hr className="my-4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Library;

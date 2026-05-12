"use client";
import { supabase } from "@/app/services/Supabase";
import { useUser } from "@clerk/nextjs";
import { SquareArrowOutUpRight, BookOpen, Clock } from "lucide-react";
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
  };

  return (
    <div className="px-4 sm:px-6 md:px-20 lg:px-36 xl:px-56 mt-16 sm:mt-20 pb-10">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <BookOpen className="h-6 w-6 text-primary" />
        <h2 className="font-bold text-xl sm:text-2xl">Library</h2>
      </div>

      {/* Empty state */}
      {libraryHistory?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400">
          <BookOpen className="h-12 w-12 mb-3 opacity-30" />
          <p className="text-sm">No searches saved yet.</p>
        </div>
      )}

      {/* List */}
      <div className="mt-2 space-y-1">
        {libraryHistory?.map((item, index) => (
          <div
            key={index}
            className="cursor-pointer group rounded-xl px-3 py-3 sm:px-4 sm:py-4 hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150"
            onClick={() => router.push("/search/" + item.libId)}
          >
            <div className="flex items-start justify-between gap-3">
              {/* Text content */}
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm sm:text-base leading-snug truncate group-hover:text-primary transition-colors">
                  {item.searchInput}
                </h2>
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3 text-gray-400 shrink-0" />
                  <p className="text-xs text-gray-400">
                    {moment(item.created_at).fromNow()}
                  </p>
                </div>
              </div>

              {/* Icon */}
              <SquareArrowOutUpRight className="h-4 w-4 shrink-0 text-gray-400 group-hover:text-primary transition-colors mt-0.5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Library;
"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Compass, GalleryHorizontalEnd, Zap, PanelLeftClose, ChevronRight,PanelLeftOpen, Plus } from "lucide-react";
import { usePathname } from "next/navigation";
import { SignInButton, SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";

const PRIMARY = "oklch(0.5161 0.0817 211.9)";
const PRIMARY_LIGHT = "oklch(0.5161 0.0817 211.9 / 0.12)";
const PRIMARY_BORDER = "oklch(0.5161 0.0817 211.9 / 0.5)";

const MenuOptions = [
  { title: "New", icon: Plus, path: "/" },
  { title: "Discover", icon: Compass, path: "/discover" },
  { title: "Library", icon: GalleryHorizontalEnd, path: "/library" },
  // ❌ Removed "Sign in" as a nav item — handled in footer now
];

export default function AppSidebar() {
  const path = usePathname();
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(true);
  const [showUpgrade, setShowUpgrade] = useState(true);
  const isPro = user?.publicMetadata?.plan === "pro";

  if (!isLoaded) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
          style={{ color: PRIMARY, borderColor: PRIMARY_BORDER, backgroundColor: "#f0eeeb" }}
          className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border transition-opacity hover:opacity-80"
        >
          <PanelLeftOpen size={16} strokeWidth={1.5} />
        </button>
      )}

      {open && (
        <div onClick={() => setOpen(false)} className="fixed inset-0 z-30 bg-black/70 sm:hidden" aria-hidden="true" />
      )}

      <aside
        style={{ fontFamily: "'Geist', 'Helvetica Neue', sans-serif", backgroundColor: "#f0eeeb" }}
        className={`fixed inset-y-0 left-0 z-40 flex flex-col border-r border-neutral-200 transition-[width] duration-300 ease-in-out ${open ? "w-[230px]" : "w-0 overflow-hidden"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <Link href="/" className="flex items-center">
            <Image src="/Perplexity_AI_logo.svg" alt="Perplexity" width={112} height={28} style={{ height: 'auto' }} />
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close sidebar" className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-800">
            <PanelLeftClose size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mx-4 border-t border-neutral-300 mb-4" />

        {/* New Thread */}
        {/* <div className="px-4 pt-4 pb-2">
          <button
            style={{ borderColor: PRIMARY_BORDER, color: PRIMARY, backgroundColor: "#f0eeeb" }}
            className="flex w-full items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
          >
            <Plus size={14} strokeWidth={2.5} />
            New thread
          </button>
        </div> */}

        {/* <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Menu</p> */}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {MenuOptions.map((menu) => {
            const Icon = menu.icon;
            const active = path === menu.path;
            return (
              <Link
                key={menu.path}
                href={menu.path}
                style={active ? { backgroundColor: PRIMARY, color: "#fff" } : {}}
                className={`flex items-center gap-3 rounded-full px-4 py-2.5 text-[15px] transition-all ${active ? "font-semibold shadow-sm" : "font-normal text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50"}`}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.6} className="shrink-0" />
                {menu.title}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
      
<div className="px-3 pb-5 pt-2 space-y-3">
 

  {/* Premium card — only for free users */}
 {user && !isPro && (
  <button
    onClick={() => router.push("/upgrade")}
    className="flex w-full items-center gap-2.5 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 transition-colors hover:border-neutral-300 hover:bg-neutral-50"
  >
    <div
      style={{ backgroundColor: PRIMARY }}
      className="flex h-7 w-7 items-center justify-center rounded-lg flex-shrink-0"
    >
      <Zap size={13} className="text-white" />
    </div>
    <div className="flex-1 text-left">
      <p className="text-[12px] font-semibold text-neutral-800">Upgrade to Pro</p>
      <p className="text-[10px] text-neutral-400">More searches, smarter AI</p>
    </div>
    <ChevronRight size={14} className="text-neutral-300 flex-shrink-0" />
  </button>
)}
 <div className="border-t border-neutral-200" />
  {/* User row */}
  {user ? (
    <div className="flex items-center gap-2.5 px-1">
      <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-medium text-neutral-800 truncate">{user.firstName}</p>
        <p className="text-[10px] text-neutral-400">Free plan</p>
      </div>
      <SignOutButton>
        <button className="text-[11px] text-neutral-400 hover:text-neutral-700 transition-colors">
          Log out
        </button>
      </SignOutButton>
    </div>
  ) : (
    <SignInButton mode="modal" appearance={clerkAppearance}>
      <button
        style={{ backgroundColor: PRIMARY }}
        className="w-full rounded-full px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-80 transition-opacity"
      >
        Sign in
      </button>
    </SignInButton>
  )}
</div>
      </aside>

      <div className={`transition-[margin] duration-300 ease-in-out ${open ? "ml-[230px]" : "ml-0"}`} />
    </>
  );
}
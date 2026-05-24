"use client";
import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Compass,
  GalleryHorizontalEnd,
  LogIn,
  Search,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
} from "lucide-react";
import { usePathname } from "next/navigation";
import {
  SignOutButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const PRIMARY = "oklch(0.5161 0.0817 211.9)";
const PRIMARY_LIGHT = "oklch(0.5161 0.0817 211.9 / 0.12)";
const PRIMARY_BORDER = "oklch(0.5161 0.0817 211.9 / 0.5)";

const MenuOptions = [
  { title: "Home",     icon: Search,               path: "/" },
  { title: "Discover", icon: Compass,               path: "/discover" },
  { title: "Library",  icon: GalleryHorizontalEnd,  path: "/library" },
  { title: "Sign in",  icon: LogIn,                 path: "/sign-in" },
];

export default function AppSidebar() {
  const path = usePathname();
  const { user, isLoaded } = useUser();
  const [open, setOpen] = useState(true);

  if (!isLoaded) return null;

  return (
    <>
      {/* ── collapsed toggle ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Open sidebar"
          style={{ color: PRIMARY, borderColor: PRIMARY_BORDER }}
          className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-full border bg-white transition-opacity hover:opacity-70"
        >
          <PanelLeftOpen size={16} strokeWidth={1.5} />
        </button>
      )}

      {/* ── sidebar ── */}
      <aside
        style={{ fontFamily: "'Geist', 'Helvetica Neue', sans-serif" }}
        style={{ backgroundColor: "#f0eeeb" }}
        className={`
          fixed inset-y-0 left-0 z-40 flex flex-col
          border-r border-neutral-200
          transition-[width] duration-300 ease-in-out
          ${open ? "w-[230px]" : "w-0 overflow-hidden"}
        `}
      >
        {/* ─── Header ─────────────────────────── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-4">
          <Link href="/" className="flex items-center">
            <Image
              src="/Perplexity_AI_logo.svg"
              alt="Perplexity"
              width={112}
              height={28}
            />
          </Link>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close sidebar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-300 transition-colors hover:text-neutral-500"
          >
            <PanelLeftClose size={15} strokeWidth={1.5} />
          </button>
        </div>

        <div className="mx-4 border-t border-neutral-200" />

        {/* ─── New thread — pill shape ─────────── */}
        <div className="px-4 pt-4 pb-2">
          <button
            style={{ borderColor: PRIMARY_BORDER, color: PRIMARY, backgroundColor: "#f0eeeb" }}
            className="flex w-full items-center justify-center gap-2 rounded-full border bg-white px-4 py-2.5 text-sm font-medium transition-opacity hover:opacity-70"
          >
            <Plus size={14} strokeWidth={2.5} />
            New thread
          </button>
        </div>

        {/* ─── Section label ───────────────────── */}
        <p className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-300">
          Menu
        </p>

        {/* ─── Nav ─────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-1">
          {MenuOptions.map((menu) => {
            const Icon = menu.icon;
            const active = path === menu.path;
            return (
              <Link
                key={menu.path}
                href={menu.path}
                style={
                  active
                    ? { backgroundColor: PRIMARY, color: "#fff" }
                    : {}
                }
                className={`
                  flex items-center gap-3 rounded-full px-4 py-2.5
                  text-[15px] transition-all
                  ${active
                    ? "font-semibold shadow-sm"
                    : "font-normal text-neutral-500 hover:text-neutral-800 hover:bg-neutral-200/50"
                  }
                `}
              >
                <Icon size={16} strokeWidth={active ? 2.2 : 1.6} className="shrink-0" />
                {menu.title}
              </Link>
            );
          })}
        </nav>

        {/* ─── Footer ──────────────────────────── */}
        <div className="px-4 pb-5 pt-2 space-y-4">
          <div className="border-t border-neutral-200" />

          {/* upgrade card — primary border */}
          <div
            style={{ borderColor: PRIMARY_BORDER, backgroundColor: "#ebe9e5" }}
            className="rounded-2xl border p-4"
          >
            <p
              style={{ color: PRIMARY }}
              className="text-[13px] font-semibold"
            >
              Try Premium
            </p>
            <p className="mt-1 text-[12px] leading-relaxed text-neutral-400">
              Image upload, smarter AI & more.
            </p>
            <button
              style={{ backgroundColor: PRIMARY }}
              className="mt-3 w-full rounded-full py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80"
            >
              Learn more
            </button>
          </div>

          {/* user row */}
          <div className="flex items-center justify-between px-1">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 rounded-full",
                },
              }}
            />
            {user ? (
              <SignOutButton>
                <button className="rounded-full border border-neutral-300 px-3 py-1.5 text-[12px] text-neutral-500 transition-colors hover:border-neutral-400 hover:text-neutral-800">
                  Log out
                </button>
              </SignOutButton>
            ) : (
              <SignUpButton mode="modal">
                <button
                  style={{ backgroundColor: PRIMARY }}
                  className="rounded-full px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-80"
                >
                  Sign up
                </button>
              </SignUpButton>
            )}
          </div>
        </div>
      </aside>

      {/* ── content offset ── */}
      <div className={`transition-[margin] duration-300 ease-in-out ${open ? "ml-[230px]" : "ml-0"}`} />
    </>
  );
}
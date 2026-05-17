"use client";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import Image from "next/image";
import Link from "next/link";
import { Compass, GalleryHorizontalEnd, LogIn, Search } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  SignOutButton,
  SignUpButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";

const MenuOptions = [
  {
    title: "Home",
    icon: Search,
    path: "/",
  },
  {
    title: "Discover",
    icon: Compass,
    path: "/discover",
  },
  {
    title: "Library",
    icon: GalleryHorizontalEnd,
    path: "/library",
  },
  {
    title: "Signin",
    icon: LogIn,
    path: "/sign-in",
  },
];

function AppSidebar() {
  const path = usePathname();
  const {user , isLoaded} = useUser();
  if (!isLoaded) return null; // ← add this

  return (
    <Sidebar>
      <SidebarHeader className="bg-accent flex items-center p-5">
        <Image
          src={"/Perplexity_AI_logo.svg"}
          alt="logo"
          width={150}
          height={100}
        />
      </SidebarHeader>
      <SidebarContent className="bg-accent">
        <SidebarGroup>
          <SidebarContent>
            <SidebarMenu>
              {MenuOptions.map((menu, index) => (
                <SidebarMenuItem key={index}>
                  <SidebarMenuButton className={"p-5 y-5"}>
                    <Link
                      href={menu.path}
                      className={`h-8 w-8 flex gap-5 items-center hover:bg-transparent hover:font-bold ${path === menu.path && "font-bold"}`}
                    >
                      <menu.icon />
                      <span className="text-lg">{menu.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
             
            {user ? (
                <SignOutButton>
                <Button className="rounded-full p-1.5 mx-4 mt-4 text-xl">log out</Button>
              </SignOutButton>
             
            ) : (
               <SignUpButton mode="modal">
                <Button className="rounded-full p-1.5 mx-4 mt-4 text-xl">sign up</Button>
              </SignUpButton>
           
            )}
          </SidebarContent>
        </SidebarGroup>

        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter className="bg-accent">
        <div className="p-5 flex flex-col ">
          <h2 className="text-gray-500">Try premium</h2>
          <p className="text-gray-400">
         
            Upgrade for image Upload, smater Ia and more capilot
          </p>
          <Button variant={"secondary"} className="text-gray-500 mb-3">
            Learn More
          </Button>
        </div>
        <UserButton />
      </SidebarFooter>
    </Sidebar>
  );
}

export default AppSidebar;

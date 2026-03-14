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
import { Compass, GalleryHorizontalEnd, LogIn, Search } from "lucide-react";
import { usePathname } from 'next/navigation';
import { Button } from "@/components/ui/button";



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
    path: "#",
  },
];

function AppSidebar() {
  const path = usePathname();
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
                  {/* <SidebarMenuButton asChild className={"p-5 y-5"}> */}
                    <SidebarMenuButton className={"p-5 y-5"}> 
                    <a
                      href={menu.path}
                      className={
                        `h-8 w-8 flex gap-5 items-center hover:bg-transparent hover:font-bold ${path?.includes(menu.path)&&'font-bold'}`
                      }
                    >
                      <menu.icon />
                      <span className="text-lg">{menu.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
            <Button className="rounded-full mx-4 mt-4" >sign up</Button>
          </SidebarContent>
        </SidebarGroup>

        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter className="bg-accent">
          <div className="p-6">
            <h2 className='text-gray-500'>Try premium</h2>
            <p className='text-gray-400'> Upgrade for image Upload , smater Ia and more capilot</p>
            <Button variant={'secondary'} className='text-gray-500'>Learn More</Button>
          </div>
      </SidebarFooter>

        
      
    </Sidebar>
  );
}

export default AppSidebar;

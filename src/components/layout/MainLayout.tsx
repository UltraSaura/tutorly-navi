import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import SubjectSelector from './SubjectSelector';
import { useTranslation } from "react-i18next";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { useIsMobile } from "@/hooks/use-mobile";
const MainLayout = () => {
  const {
    t
  } = useTranslation();
  const isMobile = useIsMobile();
  return <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
        
        <AppSidebar />
        
        <div className="flex flex-col flex-1 relative">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16">
            
          </header>
          
          {/* Main Content */}
          <main className={`flex-1 p-6 ${isMobile ? 'pb-20' : ''}`}>
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
      
      {/* Mobile Bottom Tabs */}
      <MobileBottomTabs />
    </SidebarProvider>;
};
export default MainLayout;
import React from 'react';
import { Outlet } from 'react-router-dom';
import { HeaderNavigation } from "./HeaderNavigation";
import SubjectSelector from './SubjectSelector';
import { useTranslation } from "react-i18next";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { useIsMobile } from "@/hooks/use-mobile";

const MainLayout = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-gray-950">
      <div className="flex flex-col flex-1 relative">
        {/* Header with Navigation */}
        <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16">
          <HeaderNavigation />
        </header>
        
        {/* Main Content */}
        <main className={`flex-1 px-[5px] py-6 ${isMobile ? 'pb-20' : ''}`}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Tabs */}
      <MobileBottomTabs />
    </div>
  );
};
export default MainLayout;
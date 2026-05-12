import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { HeaderNavigation } from "./HeaderNavigation";
import SubjectSelector from './SubjectSelector';
import { useTranslation } from "react-i18next";
import { MobileBottomTabs } from "./MobileBottomTabs";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminPreviewBanner } from "@/components/admin/AdminPreviewControls";

const MainLayout = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const location = useLocation();
  const isChatRoute = location.pathname.startsWith('/chat');
  const searchParams = new URLSearchParams(location.search);
  const isFocusSession = searchParams.get('focus') === '1';

  const mainClasses = isChatRoute
    ? 'flex-1 px-0'
    : `flex-1 px-[5px] ${isFocusSession ? 'py-0' : 'py-6'} ${isMobile && !isFocusSession ? 'pb-20' : ''}`;

  return (
    <div className="flex min-h-screen w-full bg-white dark:bg-gray-950">
      {!isFocusSession ? (
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
      ) : null}
      
      <div className="flex flex-col flex-1 relative">
        {/* Header with Navigation */}
        {!isFocusSession ? (
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16">
            <HeaderNavigation />
          </header>
        ) : null}
        {!isFocusSession ? <AdminPreviewBanner /> : null}
        
        {/* Main Content */}
        <main className={mainClasses}>
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      </div>
      
      {/* Mobile Bottom Tabs */}
      {!isFocusSession ? <MobileBottomTabs /> : null}
    </div>
  );
};
export default MainLayout;

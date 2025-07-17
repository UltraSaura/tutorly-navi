import React from 'react';
import { Outlet } from 'react-router-dom';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import SubjectSelector from './SubjectSelector';
import { useLanguage } from '@/context/SimpleLanguageContext';
const MainLayout = () => {
  const { t } = useLanguage();
  
  return (
    <SidebarProvider>
      <div className="min-h-screen w-full">
        {/* Background */}
        <div className="fixed inset-0 bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 -z-10"></div>
        <div className="fixed inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none -z-10"></div>
        
        <AppSidebar />
        
        {/* Main content with proper margin */}
        <div className="pl-[--sidebar-width] group-data-[collapsible=icon]:pl-[--sidebar-width-icon]">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 h-16">
            <div className="flex items-center justify-between h-full px-6">
              <div className="hidden md:block">
                <SubjectSelector />
              </div>
            </div>
          </header>
          
          {/* Main Content */}
          <main className="p-6 min-h-[calc(100vh-4rem)]">
            <div className="animate-fade-in">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
export default MainLayout;
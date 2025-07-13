import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import { useLanguage } from '@/context/LanguageContext';
const MainLayout = () => {
  const { t } = useLanguage();
  
  return <div className="flex flex-col min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
      
      <Navbar />
      
      <main className="flex-1 w-full">
        <div className="animate-fade-in studywhiz-container md:py-8 py-[8px]">
          <Outlet />
        </div>
      </main>
      
      <footer className="py-4 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="studywhiz-container">
          <p>© {new Date().getFullYear()} {t('footer.copyright')}</p>
          <p className="text-xs mt-1">{t('footer.subtitle')}</p>
          <Link to="/management" className="text-xs text-primary hover:underline mt-2 inline-block">
            {t('footer.managementDashboard')}
          </Link>
        </div>
      </footer>
    </div>;
};
export default MainLayout;
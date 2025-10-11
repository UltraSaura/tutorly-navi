import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MessageSquare, BookOpen, BarChart3, CheckSquare, User, Settings, Globe, ChevronDown, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { motion } from 'framer-motion';
import SubjectSelector from './SubjectSelector';
import { useLanguage } from '@/context/SimpleLanguageContext';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import MobileLanguageMenuItems from './MobileLanguageMenuItems';
import { useTranslation } from 'react-i18next';

// Language menu items component
const LanguageMenuItems = () => {
  const { i18n, t } = useTranslation();

  const languages = [
    { code: 'en', name: t('language.english'), flag: '🇺🇸' },
    { code: 'fr', name: t('language.french'), flag: '🇫🇷' }
  ];

  const manuallySet = localStorage.getItem('languageManuallySet') === 'true';

  return (
    <>
      {!manuallySet && (
        <>
          <DropdownMenuItem disabled className="text-xs text-muted-foreground">
            {t('language.autoDetected')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}
      {languages.map((lang) => (
        <DropdownMenuItem
          key={lang.code}
          onClick={() => {
            // Sync both language systems
            i18n.changeLanguage(lang.code);
            localStorage.setItem('lang', lang.code);
            localStorage.setItem('languageManuallySet', 'true');
            
            // Reload page to ensure all components pick up the language change
            window.location.reload();
          }}
          className={i18n.resolvedLanguage === lang.code ? 'bg-accent' : ''}
        >
          <span className="mr-2">{lang.flag}</span>
          {lang.name}
          {i18n.resolvedLanguage === lang.code && !manuallySet && (
            <span className="ml-auto text-xs text-muted-foreground">{t('language.auto')}</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
};

const Navbar = () => {
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { toast } = useToast();

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({
        title: t('common.signOutSuccess'),
        description: t('common.signOutSuccessDescription'),
      });
      setMobileMenuOpen(false);
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: t('common.signOutError'),
        description: t('common.signOutErrorDescription'),
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };
  
  const tabs = [
    { path: '/', label: t('nav.home'), icon: <MessageSquare className="w-5 h-5" /> },
    { path: '/dashboard', label: t('nav.roadmap'), icon: <BookOpen className="w-5 h-5" /> },
    { path: '/grades', label: t('nav.grades'), icon: <BarChart3 className="w-5 h-5" /> },
    { path: '/skills', label: t('nav.skills'), icon: <CheckSquare className="w-5 h-5" /> },
  ];
  
  return (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
      <div className="studywhiz-container">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-studywhiz-600 text-white font-bold">
              {t('brand.short')}
            </div>
            <span className="text-lg font-semibold">{t('brand.name')}</span>
            <div className="hidden md:block">
              <SubjectSelector />
            </div>
          </div>
          
          <nav className="hidden md:flex gap-1 p-1.5 rounded-lg bg-gray-100 dark:bg-gray-800/50">
            {tabs.map((tab) => (
              <Link 
                key={tab.path} 
                to={tab.path}
                className={`nav-item ${location.pathname === tab.path ? 'nav-item-active' : 'nav-item-inactive'}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
                {location.pathname === tab.path && (
                  <motion.div
                    layoutId="navIndicator"
                    className="absolute inset-0 rounded-lg bg-white dark:bg-slate-800 -z-10"
                    transition={{ type: 'spring', duration: 0.3 }}
                  />
                )}
              </Link>
            ))}
          </nav>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 h-10 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  aria-label={t('nav.myAccount')}
                >
                  <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
                    <User className="w-4 h-4 text-gray-600 dark:text-gray-300" />
                  </div>
                  <span className="text-sm font-medium">{t('nav.myAccount')}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span>{t('nav.profile')}</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('nav.settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>{t('nav.language')}</DropdownMenuLabel>
                <LanguageMenuItems />
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isSigningOut ? t('common.signingOut') : t('auth.logout')}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 py-2 px-6">
        <div className="flex justify-around items-center">
          {tabs.map((tab) => (
            <Link 
              key={tab.path} 
              to={tab.path}
              className={`flex flex-col items-center p-2 rounded-md ${
                location.pathname === tab.path 
                  ? 'text-studywhiz-600 dark:text-studywhiz-400' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              {tab.icon}
              <span className="text-xs mt-1">{tab.label}</span>
            </Link>
          ))}
          
          {/* Mobile Account Menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button 
                className="flex flex-col items-center p-2 rounded-md text-gray-500 dark:text-gray-400"
                aria-label={t('nav.myAccount')}
              >
                <User className="w-5 h-5" />
                <span className="text-xs mt-1">{t('nav.myAccount')}</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto">
              <SheetHeader>
                <SheetTitle>{t('nav.myAccount')}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-4">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User className="w-5 h-5" />
                  <span>{t('nav.profile')}</span>
                </Link>
                
                <div className="p-3 rounded-lg border">
                  <div className="flex items-center gap-3 mb-3">
                    <Globe className="w-5 h-5" />
                    <span className="font-medium">{t('nav.language')}</span>
                  </div>
                  <MobileLanguageMenuItems />
                </div>
                
                <button 
                  onClick={handleSignOut}
                  disabled={isSigningOut}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent w-full text-left text-red-600 dark:text-red-400 disabled:opacity-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>{isSigningOut ? t('common.signingOut') : t('auth.logout')}</span>
                </button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

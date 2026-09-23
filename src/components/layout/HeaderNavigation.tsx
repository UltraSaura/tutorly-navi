import { useState } from "react";
import { MessageSquare, GraduationCap, HeadphonesIcon, History, User, Globe, LogOut, ChevronDown, Settings, BookOpen, Trophy, Target } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { hardLogout } from "@/lib/logout";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminPreviewSelector } from "@/components/admin/AdminPreviewControls";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

// Desktop navigation
const desktopNavigation = [
  { 
    title: "nav.home", 
    url: "/chat", 
    icon: MessageSquare 
  },
  { 
    title: "nav.learning", 
    url: "/learning", 
    icon: GraduationCap 
  },
  {
    title: "nav.practice",
    url: "/practice",
    icon: Target
  },
  { 
    title: "nav.history", 
    url: "/exercise-history", 
    icon: History 
  },
];

const LanguageMenuItems = () => {
  const { language, changeLanguage, t } = useLanguage();

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
          onClick={() => changeLanguage(lang.code)}
          className={language === lang.code ? 'bg-accent' : ''}
        >
          <span className="mr-2">{lang.flag}</span>
          {lang.name}
          {language === lang.code && !manuallySet && (
            <span className="ml-auto text-xs text-muted-foreground">{t('language.auto')}</span>
          )}
        </DropdownMenuItem>
      ))}
    </>
  );
};

export function HeaderNavigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const { isAdmin } = useAdminAuth();
  const isMobile = useIsMobile();
  
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  const handleSignOut = () => { hardLogout(); };

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex items-center justify-between w-full h-full px-6">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Stuwy Logo" className="w-8 h-8" />
        <span className="text-lg font-semibold text-foreground">Stuwy</span>
      </div>

      {/* Navigation Links - Hidden on mobile as MobileBottomTabs handles it */}
      <nav className="hidden md:flex items-center space-x-1">
          {desktopNavigation.map((item) => {
            const isActiveRoute = isActive(item.url);
            return (
              <NavLink
                key={item.title}
                to={item.url}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActiveRoute
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                <span>{t(item.title)}</span>
              </NavLink>
            );
          })}
        </nav>

      {/* User Account Dropdown - Desktop Only */}
      <div className="hidden md:flex items-center gap-3">
        <AdminPreviewSelector />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-2 h-auto p-2 hover:bg-accent/50"
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-sm">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start text-sm">
                <span className="text-xs text-muted-foreground truncate max-w-32">
                  {user?.email}
                </span>
              </div>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 bg-background border shadow-md">
            <DropdownMenuItem asChild>
              <NavLink to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{t('nav.profile')}</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/my-program" className="flex items-center">
                <BookOpen className="mr-2 h-4 w-4" />
                <span>My Program</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/dashboard" className="flex items-center">
                <Trophy className="mr-2 h-4 w-4" />
                <span>Dashboard</span>
              </NavLink>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <NavLink to="/support" className="flex items-center">
                <HeadphonesIcon className="mr-2 h-4 w-4" />
                <span>{t('nav.support')}</span>
              </NavLink>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem asChild>
                <NavLink to="/admin" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </NavLink>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="flex items-center">
              <Globe className="mr-2 h-4 w-4" />
              {t('nav.language')}
            </DropdownMenuLabel>
            <LanguageMenuItems />
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
    </div>
  );
}

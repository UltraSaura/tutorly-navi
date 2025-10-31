import { useState } from "react";
import { MessageSquare, LayoutDashboard, HeadphonesIcon, History, User, Globe, LogOut, ChevronDown, Settings } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useIsMobile } from "@/hooks/use-mobile";

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
    title: "nav.dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "nav.history", 
    url: "/exercise-history", 
    icon: History 
  },
  { 
    title: "nav.support", 
    url: "/support", 
    icon: HeadphonesIcon 
  },
];

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

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/auth');
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Error signing out",
        description: "There was a problem signing out. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSigningOut(false);
    }
  };

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  return (
    <div className="flex items-center justify-between w-full h-full px-6">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt="Stuwy Logo" className="w-8 h-8" />
        <span className="text-lg font-semibold text-foreground">Stuwy</span>
      </div>

      {/* Navigation Links - Hidden on mobile as MobileBottomTabs handles it */}
      {!isMobile && (
        <nav className="flex items-center space-x-1">
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
      )}

      {/* User Account Dropdown - Desktop Only */}
      {!isMobile && (
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
      )}
    </div>
  );
}
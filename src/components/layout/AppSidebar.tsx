import { useState } from "react";
import { MessageSquare, LayoutDashboard, BarChart3, Award, HeadphonesIcon, User, Globe, LogOut, ChevronDown } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useLanguage } from "@/context/SimpleLanguageContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  { 
    title: "nav.tutor", 
    url: "/chat", 
    icon: MessageSquare 
  },
  { 
    title: "nav.dashboard", 
    url: "/dashboard", 
    icon: LayoutDashboard 
  },
  { 
    title: "nav.grades", 
    url: "/grades", 
    icon: BarChart3 
  },
  { 
    title: "nav.skills", 
    url: "/skills", 
    icon: Award 
  },
  { 
    title: "nav.support", 
    url: "/support", 
    icon: HeadphonesIcon 
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

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const location = useLocation();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isSigningOut, setIsSigningOut] = useState(false);
  
  // Debug: Clear sidebar state cookie on first load
  useState(() => {
    if (typeof window !== 'undefined') {
      // Clear the sidebar state cookie to ensure fresh state
      document.cookie = 'sidebar:state=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    }
  });
  
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-accent text-accent-foreground font-medium" : "hover:bg-accent/50";

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
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
    <TooltipProvider>
      <Sidebar collapsible="icon">
        <SidebarHeader className="border-b border-border/40 p-4 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-bold text-sm transition-all duration-300 hover:scale-105">
                    SW
                  </div>
                </TooltipTrigger>
                {state === "collapsed" && (
                  <TooltipContent side="right">
                    <p>StudyWhiz</p>
                  </TooltipContent>
                )}
              </Tooltip>
              {state !== "collapsed" && (
                <span className="text-lg font-semibold animate-fade-in">StudyWhiz</span>
              )}
            </div>
            <SidebarTrigger className="h-8 w-8 transition-all duration-200 hover:bg-accent rounded-md" />
          </div>
        </SidebarHeader>

        <SidebarContent className="p-4">
          <SidebarGroup>
            <SidebarGroupLabel className={state === "collapsed" ? "sr-only" : "animate-fade-in"}>
              {t('nav.main')}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigation.map((item) => {
                  const isActiveRoute = isActive(item.url);
                  const menuButton = (
                    <SidebarMenuButton asChild>
                      <NavLink 
                        to={item.url} 
                        end 
                        className={`transition-all duration-200 ${getNavCls({ isActive: isActiveRoute })}`}
                      >
                        <item.icon className="h-4 w-4 transition-all duration-200" />
                        {state !== "collapsed" && (
                          <span className="animate-fade-in">{t(item.title)}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  );

                  return (
                    <SidebarMenuItem key={item.title}>
                      {state === "collapsed" ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            {menuButton}
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p>{t(item.title)}</p>
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        menuButton
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-border/40 p-4 transition-all duration-300">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              {state === "collapsed" ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-center p-2 transition-all duration-200 hover:scale-105"
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-sm">
                          {userInitials}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{t('nav.myAccount')}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-auto p-3 transition-all duration-200 hover:bg-accent/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-sm">
                      {userInitials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col items-start text-sm animate-fade-in">
                    <span className="font-medium">{t('nav.myAccount')}</span>
                    <span className="text-xs text-muted-foreground truncate max-w-32">
                      {user?.email}
                    </span>
                  </div>
                  <ChevronDown className="h-4 w-4 ml-auto transition-transform duration-200" />
                </Button>
              )}
            </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{t('nav.myAccount')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <NavLink to="/profile" className="flex items-center">
                <User className="mr-2 h-4 w-4" />
                <span>{t('nav.profile')}</span>
              </NavLink>
            </DropdownMenuItem>
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
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
    </TooltipProvider>
  );
}
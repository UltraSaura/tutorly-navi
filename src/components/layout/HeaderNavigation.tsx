import { FamilyProfileMenu } from '@/features/family/FamilyProfileMenu';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { MessageSquare, GraduationCap, History, Target } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AdminPreviewSelector } from "@/components/admin/AdminPreviewControls";

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

export function HeaderNavigation() {
  const ui = useInterfaceTranslation();
  const location = useLocation();
  const { t } = useTranslation();
  
  const currentPath = location.pathname;
  const isActive = (path: string) => currentPath === path;

  return (
    <div className="flex items-center justify-between w-full h-full px-6">
      {/* Logo and App Name */}
      <div className="flex items-center gap-3">
        <img src="/logo.png" alt={ui("Stuwy Logo")} className="w-8 h-8" />
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
                data-tour={`nav-${item.title.replace('nav.', '')}`}
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

      {/* Compact profile control stays in the header on every viewport. */}
      <div className="flex items-center gap-3">
        <AdminPreviewSelector />
        <FamilyProfileMenu />
        </div>
    </div>
  );
}

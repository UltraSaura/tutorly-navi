import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Home, Users, Settings } from "lucide-react";

const bottomNavItems = [
  { 
    title: "Home", 
    url: "/guardian", 
    icon: Home 
  },
  { 
    title: "Children", 
    url: "/guardian/children", 
    icon: Users 
  },
  { 
    title: "Settings", 
    url: "/guardian/settings", 
    icon: Settings 
  },
];

export function GuardianBottomNav() {
  const location = useLocation();
  const { t } = useTranslation();
  
  const currentPath = location.pathname;
  const isActive = (url: string) => currentPath === url;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/95 backdrop-blur-md border-t border-border" 
         style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
      <div className="flex items-center justify-around h-16 px-2">
        {bottomNavItems.map((item) => {
          const isActiveTab = isActive(item.url);
          
          return (
            <NavLink
              key={item.title}
              to={item.url}
              className={`flex flex-col items-center justify-center h-12 w-20 rounded-xl transition-all ${
                isActiveTab 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              }`}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.title}</span>
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}

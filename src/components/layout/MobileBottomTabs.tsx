import { useState, useEffect } from "react";
import { MessageSquare, LayoutDashboard, User, History } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOverlay } from "@/context/OverlayContext";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AccountTabContent } from "./AccountTabContent";

const bottomTabItems = [
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
    title: "nav.account", 
    url: null, // Special case - opens sheet
    icon: User 
  },
];

export function MobileBottomTabs() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { t } = useTranslation();
  const { registerOverlay, unregisterOverlay } = useOverlay();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Update global overlay state when account sheet opens/closes
  useEffect(() => {
    if (isAccountOpen) {
      registerOverlay('account-sheet');
    } else {
      unregisterOverlay('account-sheet');
    }
  }, [isAccountOpen, registerOverlay, unregisterOverlay]);
  
  if (!isMobile) return null;
  
  const currentPath = location.pathname;
  const isActive = (url: string | null) => url && currentPath === url;

  const handleTabClick = (item: typeof bottomTabItems[0]) => {
    if (item.title === "nav.account") {
      setIsAccountOpen(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/40">
        <div className="flex items-center justify-around h-16 px-2">
          {bottomTabItems.map((item) => {
            const isActiveTab = isActive(item.url);
            
            if (item.url) {
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex flex-col items-center justify-center h-12 w-16 rounded-lg transition-colors ${
                    isActiveTab 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }`}
                >
                  <item.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs font-medium">{t(item.title)}</span>
                </NavLink>
              );
            }

            return (
              <Button
                key={item.title}
                variant="ghost"
                size="sm"
                onClick={() => handleTabClick(item)}
                className="flex flex-col items-center justify-center h-12 w-16 rounded-lg p-0 text-muted-foreground hover:text-foreground hover:bg-accent/50"
              >
                <item.icon className="h-5 w-5 mb-1" />
                <span className="text-xs font-medium">{t(item.title)}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Account Sheet */}
      <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <SheetContent side="bottom" className="h-[80vh] z-[70]">
          <SheetHeader>
            <SheetTitle>{t('nav.account')}</SheetTitle>
          </SheetHeader>
          <AccountTabContent onClose={() => setIsAccountOpen(false)} />
        </SheetContent>
      </Sheet>

    </>
  );
}
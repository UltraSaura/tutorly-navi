import { useState } from "react";
import { MessageSquare, LayoutDashboard, User, Wrench } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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
    title: "nav.account", 
    url: null, // Special case - opens sheet
    icon: User 
  },
  { 
    title: "nav.tools", 
    url: null, // Special case - future tools
    icon: Wrench 
  },
];

export function MobileBottomTabs() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { t } = useTranslation();
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false);
  
  if (!isMobile) return null;
  
  const currentPath = location.pathname;
  const isActive = (url: string | null) => url && currentPath === url;

  const handleTabClick = (item: typeof bottomTabItems[0]) => {
    if (item.title === "nav.account") {
      setIsAccountOpen(true);
    } else if (item.title === "nav.tools") {
      setIsToolsOpen(true);
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
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>{t('nav.account')}</SheetTitle>
          </SheetHeader>
          <AccountTabContent onClose={() => setIsAccountOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Tools Sheet */}
      <Sheet open={isToolsOpen} onOpenChange={setIsToolsOpen}>
        <SheetContent side="bottom" className="h-[50vh]">
          <SheetHeader>
            <SheetTitle>{t('nav.tools')}</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{t('tools.comingSoon')}</h3>
            <p className="text-muted-foreground">{t('tools.description')}</p>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
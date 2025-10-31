import { useState, useEffect } from "react";
import { MessageSquare, Grid, User, Settings } from "lucide-react";
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
    title: "Tutor", 
    url: "/", 
    icon: MessageSquare 
  },
  { 
    title: "Dashboard", 
    url: "/learning", 
    icon: Grid 
  },
  { 
    title: "Account", 
    url: null, // Special case - opens sheet
    icon: User 
  },
  { 
    title: "Tools", 
    url: "/exercise-history", 
    icon: Settings 
  },
];

export function MobileBottomTabs() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { t } = useTranslation();
  const { setHasActiveOverlay } = useOverlay();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  // Update global overlay state when account sheet opens/closes
  useEffect(() => {
    setHasActiveOverlay(isAccountOpen);
  }, [isAccountOpen, setHasActiveOverlay]);
  
  if (!isMobile) return null;
  
  const currentPath = location.pathname;
  const isActive = (url: string | null) => url && currentPath === url;

  const handleTabClick = (item: typeof bottomTabItems[0]) => {
    if (item.title === "Account") {
      setIsAccountOpen(true);
    }
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 h-16 bg-white shadow-2xl rounded-t-xl flex justify-around items-center max-w-xl mx-auto z-50" 
           style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0px)' }}>
        <div className="flex items-center justify-around w-full h-full px-2">
          {bottomTabItems.map((item) => {
            const isActiveTab = isActive(item.url);
            
            if (item.url) {
              return (
                <NavLink
                  key={item.title}
                  to={item.url}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                    isActiveTab 
                      ? "text-indigo-700 font-bold" 
                      : "text-gray-500 hover:text-indigo-600"
                  }`}
                >
                  <item.icon className={`w-6 h-6 ${isActiveTab ? 'fill-indigo-100/50' : ''}`} />
                  <span className="text-xs mt-1">{item.title}</span>
                </NavLink>
              );
            }

            return (
              <Button
                key={item.title}
                variant="ghost"
                onClick={() => handleTabClick(item)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl transition-colors ${
                  isAccountOpen 
                    ? "text-indigo-700 font-bold" 
                    : "text-gray-500 hover:text-indigo-600"
                }`}
              >
                <item.icon className={`w-6 h-6 ${isAccountOpen ? 'fill-indigo-100/50' : ''}`} />
                <span className="text-xs mt-1">{item.title}</span>
              </Button>
            );
          })}
        </div>
      </div>

      {/* Account Sheet */}
      <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}>
        <SheetContent side="bottom" className="h-[80vh] z-[70]">
          <SheetHeader>
            <SheetTitle>Account</SheetTitle>
          </SheetHeader>
          <AccountTabContent onClose={() => setIsAccountOpen(false)} />
        </SheetContent>
      </Sheet>

    </>
  );
}
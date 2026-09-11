import { useState, useEffect } from "react";
import { House, BookOpen, Dumbbell, History, User } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useOverlay } from "@/context/OverlayContext";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AccountTabContent } from "./AccountTabContent";

const bottomTabItems = [
  { title: "nav.home", url: "/home", icon: House },
  { title: "nav.practice", url: "/practice", icon: Dumbbell },
  { title: "nav.learning", url: "/learning", icon: BookOpen },
  { title: "nav.history", url: "/exercise-history", icon: History },
  { title: "nav.account", url: null, icon: User },
];

export function MobileBottomTabs() {
  const isMobile = useIsMobile();
  const location = useLocation();
  const { t } = useTranslation();
  const { setHasActiveOverlay } = useOverlay();
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => { setHasActiveOverlay(isAccountOpen); }, [isAccountOpen, setHasActiveOverlay]);
  const currentPath = location.pathname;
  const isActive = (url: string | null) => url ? (currentPath === url || currentPath.startsWith(url + '/')) : false;
  const handleTabClick = (item: typeof bottomTabItems[0]) => { if (item.title === "nav.account") setIsAccountOpen(true); };

  return <>
    <div data-explanation-hide="mobile-bottom-tabs" className="fixed inset-x-4 z-50 md:hidden" style={{ bottom: 'calc(max(env(safe-area-inset-bottom), 0px) + 12px)' }}>
      <div className="grid h-[72px] grid-cols-5 items-center rounded-[24px] bg-white px-2 shadow-[0_18px_45px_rgba(15,23,42,0.10)]">
        {bottomTabItems.map((item) => {
          const isActiveTab = isActive(item.url);
          const label = t(item.title);
          if (item.url) return <NavLink key={item.title} to={item.url} className={`mx-auto flex h-14 w-[66px] flex-col items-center justify-center rounded-2xl transition-colors ${isActiveTab ? "text-[#12C6A0]" : "text-[#667085] hover:text-[#0F172A]"}`}><item.icon className="mb-1 h-6 w-6 stroke-[2.4]" /><span className="text-[11px] font-bold leading-none">{label}</span></NavLink>;
          return <Button key={item.title} variant="ghost" size="sm" onClick={() => handleTabClick(item)} className={`mx-auto flex h-14 w-[66px] flex-col items-center justify-center rounded-2xl p-0 ${isAccountOpen ? "text-[#12C6A0] hover:text-[#12C6A0]" : "text-[#667085] hover:text-[#0F172A]"}`}><item.icon className="mb-1 h-6 w-6 stroke-[2.4]" /><span className="text-[11px] font-bold leading-none">{label}</span></Button>;
        })}
      </div>
    </div>
    <Sheet open={isAccountOpen} onOpenChange={setIsAccountOpen}><SheetContent side="bottom" className="flex h-[80vh] flex-col overflow-hidden z-[70]"><SheetHeader className="shrink-0"><SheetTitle>{t('nav.account')}</SheetTitle></SheetHeader><div className="min-h-0 flex-1 overflow-y-auto pb-[calc(env(safe-area-inset-bottom)+1rem)]"><AccountTabContent onClose={() => setIsAccountOpen(false)} /></div></SheetContent></Sheet>
  </>;
}

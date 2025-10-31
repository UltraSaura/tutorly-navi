import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, Menu, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface GuardianStickyHeaderProps {
  title: string;
  onMenuClick?: () => void;
  onSignOut?: () => void;
}

export function GuardianStickyHeader({ title, onMenuClick, onSignOut }: GuardianStickyHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  
  const isHomePage = location.pathname === '/guardian' || location.pathname === '/guardian/';
  const showBackButton = !isHomePage;

  const handleBack = () => {
    // Navigate back in history
    navigate(-1);
  };

  return (
    <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-3">
          {showBackButton ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          ) : isMobile && onMenuClick ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="lg:hidden"
            >
              <Menu className="h-6 w-6" />
            </Button>
          ) : null}
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>
        
        {!showBackButton && onSignOut && isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
}

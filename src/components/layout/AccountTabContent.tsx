import { useState } from "react";
import { User, HeadphonesIcon, Globe, LogOut, Settings } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MobileLanguageMenuItems from "./MobileLanguageMenuItems";

interface AccountTabContentProps {
  onClose: () => void;
}

export function AccountTabContent({ onClose }: AccountTabContentProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  const handleSignOut = async () => {
    if (isSigningOut) return;
    
    setIsSigningOut(true);
    try {
      await supabase.auth.signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      onClose();
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

  return (
    <div className="flex flex-col space-y-4 py-4">
      {/* User Profile Section */}
      <div className="flex items-center space-x-3 p-4 bg-accent/20 rounded-lg">
        <Avatar className="h-12 w-12">
          <AvatarFallback className="text-lg font-semibold">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col">
          <span className="font-semibold">{t('nav.myAccount')}</span>
          <span className="text-sm text-muted-foreground truncate">
            {user?.email}
          </span>
        </div>
      </div>

      <Separator />

      {/* Account Actions */}
      <div className="space-y-2">
        <Button
          variant="ghost"
          asChild
          className="w-full justify-start h-12"
          onClick={onClose}
        >
          <NavLink to="/profile" className="flex items-center">
            <User className="mr-3 h-5 w-5" />
            <span>{t('nav.profile')}</span>
          </NavLink>
        </Button>

        <Button
          variant="ghost"
          asChild
          className="w-full justify-start h-12"
          onClick={onClose}
        >
          <NavLink to="/support" className="flex items-center">
            <HeadphonesIcon className="mr-3 h-5 w-5" />
            <span>{t('nav.support')}</span>
          </NavLink>
        </Button>

        {isAdmin && (
          <Button
            variant="ghost"
            asChild
            className="w-full justify-start h-12"
            onClick={onClose}
          >
            <NavLink to="/admin" className="flex items-center">
              <Settings className="mr-3 h-5 w-5" />
              <span>Admin Panel</span>
            </NavLink>
          </Button>
        )}
      </div>

      <Separator />

      {/* Language Section */}
      <div className="space-y-2">
        <div className="flex items-center px-3 py-2">
          <Globe className="mr-3 h-5 w-5" />
          <span className="font-medium">{t('nav.language')}</span>
        </div>
        <MobileLanguageMenuItems />
      </div>

      <Separator />

      {/* Sign Out */}
      <Button
        variant="ghost"
        onClick={handleSignOut}
        disabled={isSigningOut}
        className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
      >
        <LogOut className="mr-3 h-5 w-5" />
        <span>{isSigningOut ? 'Signing out...' : 'Sign Out'}</span>
      </Button>
    </div>
  );
}
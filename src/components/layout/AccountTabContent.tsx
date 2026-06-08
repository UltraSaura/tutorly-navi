import { useState } from "react";
import { User, HeadphonesIcon, Globe, LogOut, Settings, BookOpen, Trophy, Zap } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { hardLogout } from "@/lib/logout";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useStudentStats } from "@/hooks/useStudentStats";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import MobileLanguageMenuItems from "./MobileLanguageMenuItems";
import { AdminPreviewSelector } from "@/components/admin/AdminPreviewControls";

interface AccountTabContentProps {
  onClose: () => void;
}

export function AccountTabContent({ onClose }: AccountTabContentProps) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useAdminAuth();
  const { data: stats } = useStudentStats();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const userInitials = user?.email?.charAt(0).toUpperCase() || 'U';

  const handleSignOut = () => { hardLogout(); };

  return (
    <div className="flex min-h-full flex-col gap-4 py-4">
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

      {stats && (
        <>
          <div style={{ margin: '0 4px', background: '#F2FBF8', borderRadius: 14, padding: '12px 14px', border: '0.5px solid #9FE1CB', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#12C6A0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Zap className="h-5 w-5" style={{ color: '#0F172A' }} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: '#085041', fontFamily: 'Poppins, sans-serif', lineHeight: 1 }}>
                  {stats.totalXp}
                </span>
                <span style={{ fontSize: 12, color: '#0F6E56', fontWeight: 600 }}>XP</span>
                <span style={{ fontSize: 11, color: '#667085', marginLeft: 'auto' }}>Niveau {stats.level}</span>
              </div>
              <div style={{ height: 4, background: '#EAECEF', borderRadius: 999, overflow: 'hidden', marginTop: 6 }}>
                <div style={{ width: `${Math.round(stats.xpProgressInLevel * 100)}%`, height: '100%', background: '#12C6A0', borderRadius: 999, transition: 'width 0.4s ease' }} />
              </div>
              <p style={{ fontSize: 10, color: '#667085', margin: '3px 0 0', fontFamily: 'Poppins, sans-serif' }}>
                {stats.lessonsCompleted} lecon{stats.lessonsCompleted !== 1 ? 's' : ''} terminee{stats.lessonsCompleted !== 1 ? 's' : ''} · encore {stats.xpToNextLevel} XP pour le niveau {stats.level + 1}
              </p>
            </div>
          </div>
          <Separator />
        </>
      )}

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
          <NavLink to="/my-program" className="flex items-center">
            <BookOpen className="mr-3 h-5 w-5" />
            <span>My Program</span>
          </NavLink>
        </Button>

        <Button
          variant="ghost"
          asChild
          className="w-full justify-start h-12"
          onClick={onClose}
        >
          <NavLink to="/dashboard" className="flex items-center">
            <Trophy className="mr-3 h-5 w-5" />
            <span>Dashboard</span>
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

      {isAdmin ? (
        <>
          <div className="space-y-2 px-1">
            <AdminPreviewSelector compact />
          </div>
          <Separator />
        </>
      ) : null}

      {/* Language Section */}
      <div className="space-y-2">
        <div className="flex items-center px-3 py-2">
          <Globe className="mr-3 h-5 w-5" />
          <span className="font-medium">{t('nav.language')}</span>
        </div>
        <MobileLanguageMenuItems />
      </div>

      <Separator />

      {/* Sign Out - at the bottom of all options */}
      <div className="mt-auto">
        <Button
          variant="ghost"
          onClick={handleSignOut}
          disabled={isSigningOut}
          className="w-full justify-start h-12 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="mr-3 h-5 w-5" />
          <span>{isSigningOut ? t('common.signingOut') : t('auth.logout')}</span>
        </Button>
      </div>
    </div>
  );
}

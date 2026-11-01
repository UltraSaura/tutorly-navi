import { useState } from 'react';
import { useFamilyProfile } from '@/context/FamilyProfileContext';
import { useAuth } from '@/context/AuthContext';
import { useInterfaceTranslation } from '@/i18n/useInterfaceTranslation';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { NavLink, useNavigate } from 'react-router-dom';
import { BookOpen, Globe, Headphones, LogOut, Settings, Trophy, UserRound, Users } from 'lucide-react';
import { hardLogout } from '@/lib/logout';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '@/context/SimpleLanguageContext';

export function SwitchFamilyProfile({ onClose }: { onClose?: () => void }) {
  const family = useFamilyProfile();
  const navigate = useNavigate();
  const ui = useInterfaceTranslation();
  const [error, setError] = useState('');
  if (!family.isFamily) return null;
  if (family.children.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-3 text-sm text-muted-foreground" role="status">
        <Users aria-hidden="true" className="h-5 w-5 shrink-0" />
        <span>{ui('family.noLinkedProfiles')}</span>
      </div>
    );
  }
  const childNames = family.children
    .map(child => child.firstName)
    .filter((childName): childName is string => Boolean(childName));
  const switchContext = ui('family.switchContext', { children: childNames.length ? childNames.join(` ${ui('family.or')} `) : ui('family.child') });
  return <div>
    <Button variant="ghost" aria-label={`${ui('family.switch')}. ${switchContext}`} className="w-full justify-start min-h-14 rounded-lg bg-[#E8F8F3] px-3 py-2 text-left text-[#085041] hover:bg-[#D5F2E8] focus-visible:ring-2 focus-visible:ring-[#12C6A0] focus-visible:ring-offset-1 disabled:opacity-100" disabled={family.busy || family.loading} onClick={async () => {
      try { await family.switchProfile(); onClose?.(); navigate('/family'); }
      catch (cause) { setError(ui((cause as Error).message === 'family.busy' ? 'family.busy' : 'family.error')); }
    }}>
      <Users aria-hidden="true" className="mr-2 h-5 w-5 shrink-0 text-[#0F6E56]" />
      <span className="min-w-0"><span className="block font-semibold">{ui('family.switch')}</span><span className="block truncate text-xs font-medium text-[#0F6E56]">{switchContext}</span></span>
    </Button>
    {family.busy && <p className="px-3 text-xs text-muted-foreground">{ui('family.busy')}</p>}
    {error && <p role="alert" className="px-3 text-xs text-destructive">{error}</p>}
  </div>;
}
export function FamilyProfileMenu() {
  const family = useFamilyProfile();
  const ui = useInterfaceTranslation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { language, changeLanguage } = useLanguage();
  const navigate = useNavigate();
  if (!user) return null;

  const isChild = family.activeProfile?.kind === 'child';
  const isParent = family.activeProfile?.kind === 'parent' || family.isLegacyGuardian;
  const linkedChild = isChild
    ? family.children.find(child => child.id === (family.activeProfile as { childId?: string } | null)?.childId)
    : null;
  const name = linkedChild?.firstName || family.selection?.user?.user_metadata?.first_name as string | undefined;
  const avatar = linkedChild?.avatarUrl || family.selection?.user?.user_metadata?.avatar_url as string | undefined;
  const accountName = user.user_metadata?.first_name as string | undefined;
  const label = isChild ? (name || ui('family.child')) : isParent ? ui('family.parent') : (accountName || user.email || ui('Profile'));
  const triggerLabel = isParent ? t('nav.account') : label;
  const initials = label.trim().slice(0, 1).toUpperCase();
  const childNames = family.children
    .map(child => child.firstName)
    .filter((childName): childName is string => Boolean(childName));
  const switchContext = ui('family.switchContext', { children: childNames.length ? childNames.join(` ${ui('family.or')} `) : ui('family.child') });
  const switchProfile = async () => {
    if (!family.isFamily) return;
    try { await family.switchProfile(); navigate('/family'); } catch { /* the chooser remains available for retry */ }
  };

  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" className="h-10 max-w-[13rem] gap-2 px-2 sm:px-3" aria-label={`${triggerLabel}: ${label}`} title={label}>
      {!isParent ? (
        <Avatar className="h-8 w-8"><AvatarImage src={avatar ?? undefined} alt="" /><AvatarFallback>{initials}</AvatarFallback></Avatar>
      ) : <Users aria-hidden="true" className="h-5 w-5 shrink-0" />}
      <span className="hidden max-w-32 truncate font-semibold sm:inline">{triggerLabel}</span>
      <span aria-hidden="true" className="text-xs">▾</span>
    </Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      {family.isFamily && <DropdownMenuItem
        onSelect={() => void switchProfile()}
        disabled={family.busy || family.loading}
        aria-label={`${ui('family.switch')}. ${switchContext}`}
        className="items-start rounded-lg bg-[#E8F8F3] px-3 py-2.5 text-[#085041] hover:bg-[#D5F2E8] focus:bg-[#D5F2E8] focus-visible:ring-2 focus-visible:ring-[#12C6A0] focus-visible:ring-offset-1 data-[disabled]:opacity-100"
      >
        <Users aria-hidden="true" className="mr-2 mt-0.5 h-5 w-5 shrink-0 text-[#0F6E56]" />
        <span className="min-w-0">
          <span className="block font-semibold">{ui('family.switch')}</span>
          <span className="block truncate text-xs font-medium text-[#0F6E56]">{switchContext}</span>
        </span>
      </DropdownMenuItem>}
      {family.isFamily && <DropdownMenuSeparator />}
      {isChild && <DropdownMenuItem asChild>
        <NavLink to="/profile" className="flex items-center"><UserRound className="mr-2 h-4 w-4" />{ui('Profile')}</NavLink>
      </DropdownMenuItem>}
      {!isParent && <>
        <DropdownMenuItem asChild>
          <NavLink to="/my-program" className="flex items-center"><BookOpen className="mr-2 h-4 w-4" />{ui('My Program')}</NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/dashboard" className="flex items-center"><Trophy className="mr-2 h-4 w-4" />{ui('Dashboard')}</NavLink>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <NavLink to="/support" className="flex items-center"><Headphones className="mr-2 h-4 w-4" />{ui('Support')}</NavLink>
        </DropdownMenuItem>
      </>}
      {isParent && <DropdownMenuItem asChild>
        <NavLink to="/guardian/settings" className="flex items-center"><Settings className="mr-2 h-4 w-4" />{ui('Settings')}</NavLink>
      </DropdownMenuItem>}
      <DropdownMenuSeparator />
      <DropdownMenuItem className="font-medium" onSelect={event => event.preventDefault()}>
        <Globe className="mr-2 h-4 w-4" />{t('nav.language')}
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => changeLanguage('fr')} className={language === 'fr' ? 'bg-accent' : ''}>
        <span className="mr-2">🇫🇷</span>Français
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => changeLanguage('en')} className={language === 'en' ? 'bg-accent' : ''}>
        <span className="mr-2">🇺🇸</span>English
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => hardLogout()} className="text-destructive focus:text-destructive">
        <LogOut className="mr-2 h-4 w-4" />{ui('family.signOut')}
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}

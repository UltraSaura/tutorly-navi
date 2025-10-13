import { useState } from 'react';
import { Outlet, Navigate, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useGuardianAuth } from '@/hooks/useGuardianAuth';
import { Home, Users, FileText, Lightbulb, TrendingUp, CreditCard, Settings, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GuardianBottomNav } from './GuardianBottomNav';
import { GuardianStickyHeader } from './GuardianStickyHeader';
import { PrototypeFlowPanel } from './PrototypeFlowPanel';
import { useIsMobile } from '@/hooks/use-mobile';

const guardianNavigation = [
  { title: 'Home', url: '/guardian', icon: Home },
  { title: 'Children', url: '/guardian/children', icon: Users },
  { title: 'Results', url: '/guardian/results', icon: FileText },
  { title: 'Explanations', url: '/guardian/explanations', icon: Lightbulb },
  { title: 'Progress', url: '/guardian/progress', icon: TrendingUp },
  { title: 'Billing', url: '/guardian/billing', icon: CreditCard },
  { title: 'Settings', url: '/guardian/settings', icon: Settings },
];

const GuardianLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { canAccessGuardianPortal, loading } = useGuardianAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const isMobile = useIsMobile();

  // Determine page title based on route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/guardian') return 'Home';
    if (path.includes('/children')) return 'Children';
    if (path.includes('/results')) return 'Results';
    if (path.includes('/explanations')) return 'Explanations';
    if (path.includes('/progress')) return 'Progress';
    if (path.includes('/billing')) return 'Billing';
    if (path.includes('/settings')) return 'Settings';
    if (path.includes('/child/')) {
      if (path.includes('/subject/')) return 'Subject Detail';
      return 'Child Dashboard';
    }
    return 'Guardian Portal';
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({
        title: 'Signed out successfully',
        description: 'You have been logged out of your account.',
      });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({
        title: 'Error signing out',
        description: 'There was an error signing out. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!canAccessGuardianPortal) {
    return <Navigate to="/auth" replace state={{ message: "Please log in as a guardian to access this portal" }} />;
  }

  const Sidebar = ({ mobile = false }) => (
    <div className={cn(
      "flex flex-col h-full bg-card border-r",
      mobile ? "w-full" : "w-64"
    )}>
      <div className="p-6 border-b">
        <h2 className="text-xl font-bold text-foreground">Guardian Portal</h2>
        <p className="text-sm text-muted-foreground">Manage your children</p>
      </div>
      
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {guardianNavigation.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            onClick={() => mobile && setIsMobileMenuOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span className="font-medium">{item.title}</span>
          </NavLink>
        ))}
      </nav>
      
      {/* Logout Button */}
      <div className="p-4 border-t">
        <Button
          variant="ghost"
          onClick={() => {
            handleSignOut();
            if (mobile) setIsMobileMenuOpen(false);
          }}
          className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="font-medium">Sign Out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block">
          <Sidebar />
        </aside>

        {/* Mobile Menu */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar mobile />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {/* Sticky Header (mobile-first) */}
          <GuardianStickyHeader 
            title={getPageTitle()}
            onMenuClick={() => setIsMobileMenuOpen(true)}
            onSignOut={handleSignOut}
          />

          {/* Content Area */}
          <div className={`p-4 md:p-8 max-w-7xl mx-auto ${isMobile ? 'pb-20' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <GuardianBottomNav />

      {/* Prototype Flow Panel (demo only) */}
      <PrototypeFlowPanel />
    </div>
  );
};

export default GuardianLayout;

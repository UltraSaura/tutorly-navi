import { useState } from 'react';
import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { useTeacherAuth } from '@/hooks/useTeacherAuth';
import { Home, Users, BookOpen, BarChart3, Settings, Menu, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const teacherNavigation = [
  { title: 'Home', url: '/teacher', icon: Home },
  { title: 'My Classes', url: '/teacher/classes', icon: Users },
  { title: 'Resources', url: '/teacher/resources', icon: BookOpen },
  { title: 'Analytics', url: '/teacher/analytics', icon: BarChart3 },
  { title: 'Settings', url: '/teacher/settings', icon: Settings },
];

export default function TeacherLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { canAccessTeacherPortal, loading } = useTeacherAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      toast({ title: 'Signed out successfully' });
      navigate('/auth');
    } catch (error) {
      console.error('Error signing out:', error);
      toast({ title: 'Error signing out', variant: 'destructive' });
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }

  if (!canAccessTeacherPortal) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block fixed left-0 top-0 h-full w-64 bg-card border-r">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold">Teacher Portal</h2>
          <p className="text-sm text-muted-foreground">Manage your classes</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {teacherNavigation.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === '/teacher'}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.title}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <Button variant="outline" onClick={handleSignOut} className="w-full">
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden sticky top-0 z-40 bg-card border-b p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold">Teacher Portal</h2>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="w-6 h-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <div className="p-6 border-b">
                <h2 className="text-xl font-bold">Teacher Portal</h2>
                <p className="text-sm text-muted-foreground">Manage your classes</p>
              </div>
              
              <nav className="p-4 space-y-2">
                {teacherNavigation.map((item) => (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === '/teacher'}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )
                    }
                  >
                    <item.icon className="w-5 h-5" />
                    {item.title}
                  </NavLink>
                ))}
              </nav>

              <div className="absolute bottom-4 left-4 right-4">
                <Button variant="outline" onClick={handleSignOut} className="w-full">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="md:ml-64 p-6">
        <Outlet />
      </main>
    </div>
  );
}

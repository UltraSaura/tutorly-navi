
import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Link, useLocation } from 'react-router-dom';
import { Key, Settings, Users, ArrowLeft, MenuIcon, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const AdminLayout = () => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navItems = [
    {
      title: 'API Key Management',
      path: '/admin/api-keys',
      icon: <Key className="mr-2 h-5 w-5" />,
    },
    {
      title: 'Model Selection',
      path: '/admin/models',
      icon: <Settings className="mr-2 h-5 w-5" />,
    },
    {
      title: 'System Prompts',
      path: '/admin/prompts',
      icon: <Settings className="mr-2 h-5 w-5" />,
    },
    {
      title: 'User Management',
      path: '/admin/users',
      icon: <Users className="mr-2 h-5 w-5" />,
    },
  ];
  
  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
      
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-50 glass border-r">
          <div className="flex items-center justify-between h-16 px-6 border-b">
            <Link to="/" className="flex items-center">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-studywhiz-600 text-white font-bold text-sm">
                SW
              </div>
              <span className="ml-2 font-semibold">Admin Panel</span>
            </Link>
          </div>
          
          <nav className="flex-1 overflow-y-auto py-6 px-4">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    location.pathname === item.path
                      ? "bg-studywhiz-100 text-studywhiz-700 dark:bg-studywhiz-900/20 dark:text-studywhiz-400"
                      : "text-gray-600 hover:bg-studywhiz-50 hover:text-studywhiz-600 dark:text-gray-400 dark:hover:bg-studywhiz-900/10 dark:hover:text-studywhiz-400"
                  )}
                >
                  {item.icon}
                  {item.title}
                </Link>
              ))}
            </div>
          </nav>
          
          <div className="p-4 border-t">
            <Link to="/">
              <Button variant="outline" className="w-full justify-start">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to App
              </Button>
            </Link>
          </div>
        </aside>
        
        {/* Mobile menu */}
        <div className="lg:hidden">
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
                <MenuIcon className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64">
              <div className="flex items-center justify-between h-16 px-6 border-b">
                <Link to="/" className="flex items-center">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-studywhiz-600 text-white font-bold text-sm">
                    SW
                  </div>
                  <span className="ml-2 font-semibold">Admin Panel</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={closeMobileMenu}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <nav className="flex-1 overflow-y-auto py-6 px-4">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        location.pathname === item.path
                          ? "bg-studywhiz-100 text-studywhiz-700 dark:bg-studywhiz-900/20 dark:text-studywhiz-400"
                          : "text-gray-600 hover:bg-studywhiz-50 hover:text-studywhiz-600 dark:text-gray-400 dark:hover:bg-studywhiz-900/10 dark:hover:text-studywhiz-400"
                      )}
                      onClick={closeMobileMenu}
                    >
                      {item.icon}
                      {item.title}
                    </Link>
                  ))}
                </div>
              </nav>
              
              <div className="p-4 border-t">
                <Link to="/">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={closeMobileMenu}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to App
                  </Button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto lg:ml-64 p-4 md:p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

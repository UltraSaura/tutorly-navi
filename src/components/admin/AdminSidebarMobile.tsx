
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { adminNavGroups, iconMap } from './adminNavGroups';

interface AdminSidebarMobileProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  closeMenu: () => void;
}

const AdminSidebarMobile = ({ open, onOpenChange, closeMenu }: AdminSidebarMobileProps) => {
  const location = useLocation();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="absolute top-4 left-4 z-50">
          <svg className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64">
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/" className="flex items-center">
            <img src="/logo.png" alt="Stuwy Logo" className="w-8 h-8" />
            <span className="ml-2 font-semibold">Admin Panel</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={closeMenu}>
            <svg className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto py-6 px-4">
          {adminNavGroups.map(group => (
            <div key={group.label} className="mb-6">
              <div className="text-xs font-semibold uppercase text-gray-400 tracking-wide px-1 mb-2">
                {group.label}
              </div>
              <div className="space-y-1">
                {group.items.map(item => {
                  const Icon = iconMap[item.iconName];
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors",
                        location.pathname === item.path
                          ? "bg-stuwy-100 text-stuwy-700 dark:bg-stuwy-900/20 dark:text-stuwy-400"
                          : "text-gray-600 hover:bg-stuwy-50 hover:text-stuwy-600 dark:text-gray-400 dark:hover:bg-stuwy-900/10 dark:hover:text-stuwy-400"
                      )}
                      onClick={closeMenu}
                    >
                      {Icon && <Icon className="mr-2 h-5 w-5" />}
                      {item.title}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="p-4 border-t">
          <Link to="/">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={closeMenu}
            >
              <span className="mr-2">
                <svg className="h-4 w-4" />
              </span>
              Back to App
            </Button>
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AdminSidebarMobile;

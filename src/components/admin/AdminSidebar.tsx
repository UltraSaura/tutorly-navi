
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { adminNavGroups } from './adminNavGroups';

const AdminSidebar = () => {
  const location = useLocation();

  return (
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
        {adminNavGroups.map(group => (
          <div key={group.label} className="mb-6">
            <div className="text-xs font-semibold uppercase text-gray-400 tracking-wide px-1 mb-2">
              {group.label}
            </div>
            <div className="space-y-1">
              {group.items.map(item => (
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
          </div>
        ))}
      </nav>
      <div className="p-4 border-t">
        <Link to="/">
          <Button variant="outline" className="w-full justify-start">
            <span className="mr-2">
              <svg className="h-4 w-4" />
            </span>
            Back to App
          </Button>
        </Link>
      </div>
    </aside>
  );
};

export default AdminSidebar;

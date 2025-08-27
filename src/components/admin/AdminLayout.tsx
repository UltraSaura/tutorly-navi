import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminSidebarMobile from './AdminSidebarMobile';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { canAccessAdmin, isLoading } = useAdminAuth();

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  // Show loading while checking admin status
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  // Redirect non-admin users to login page
  if (!canAccessAdmin) {
    return <Navigate to="/auth" replace state={{ message: "Please log in as an admin to access the admin panel", returnTo: "/admin" }} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white dark:from-gray-950 dark:to-gray-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] dark:[mask-image:linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0))] pointer-events-none"></div>
      <div className="flex h-screen overflow-hidden">
        {/* Desktop sidebar */}
        <AdminSidebar />
        {/* Mobile menu */}
        <div className="lg:hidden">
          <AdminSidebarMobile
            open={isMobileMenuOpen}
            onOpenChange={setIsMobileMenuOpen}
            closeMenu={closeMobileMenu}
          />
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

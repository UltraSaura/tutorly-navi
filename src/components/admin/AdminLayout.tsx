import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminSidebarMobile from './AdminSidebarMobile';

const AdminLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

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

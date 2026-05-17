import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCurrentUser, logout } from '../mock/mockData';
import { usersApi } from '../services/api';
import { LayoutDashboard, Package, FolderTree, Palette, Settings, LogOut, Paintbrush, Tag, Ticket, CreditCard, RotateCcw, BarChart3, ShoppingCart, Users, Shield, Mail, FileText, Bell, Menu, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import NotificationBell from './NotificationBell';
import LanguageSwitcher from './LanguageSwitcher';
import { saveAdminPermissions } from '../hooks/usePermissions';

const AdminLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { t } = useTranslation();
  const [userPermissions, setUserPermissions] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const loadPermissions = async () => {
      if (!user?.email) return;
      try {
        const data = await usersApi.getAll({ role: 'admin' });
        const dbUser = (data.items || []).find(u => u.email === user.email);
        if (dbUser) {
          // super_admin (admin@bestshop.com) gets all permissions
          if (dbUser.email === 'admin@bestshop.com' || dbUser.role === 'super_admin') {
            setUserPermissions('all');
            saveAdminPermissions('all');
          } else {
            setUserPermissions(dbUser.permissions || []);
            saveAdminPermissions(dbUser.permissions || []);
          }
        } else {
          setUserPermissions('all');
          saveAdminPermissions('all');
        }
      } catch {
        setUserPermissions('all');
      }
    };
    loadPermissions();
  }, [user?.email]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const allMenuItems = [
    { path: '/admin', icon: LayoutDashboard, label: t('adminLayout.dashboard'), exact: true, permission: 'dashboard' },
    { path: '/admin/orders', icon: ShoppingCart, label: t('adminLayout.orders'), permission: 'manage_orders' },
    { path: '/admin/sales', icon: BarChart3, label: t('adminLayout.salesStats'), permission: 'view_sales' },
    { path: '/admin/customers', icon: Users, label: t('adminLayout.customers'), permission: 'view_customers' },
    { path: '/admin/products', icon: Package, label: t('adminLayout.products'), permission: 'manage_products' },
    { path: '/admin/inventory', icon: Package, label: t('adminLayout.inventory'), permission: 'manage_inventory' },
    { path: '/admin/categories', icon: FolderTree, label: t('adminLayout.categories'), permission: 'manage_categories' },
    { path: '/admin/attributes', icon: Palette, label: t('adminLayout.attributes'), permission: 'manage_attributes' },
    { path: '/admin/promotions', icon: Tag, label: t('adminLayout.promotions'), permission: 'manage_promotions' },
    { path: '/admin/coupons', icon: Ticket, label: t('adminLayout.coupons'), permission: 'manage_coupons' },
    { path: '/admin/returns', icon: RotateCcw, label: t('adminLayout.returns'), permission: 'manage_returns' },
    { path: '/admin/newsletter', icon: Mail, label: t('adminLayout.newsletter'), permission: 'manage_newsletter' },
    { path: '/admin/notifications-settings', icon: Bell, label: t('adminLayout.notifications'), permission: 'manage_notifications' },
    { path: '/admin/pages', icon: FileText, label: t('adminLayout.pagesMgmt'), permission: 'manage_pages' },
    { path: '/admin/payment', icon: CreditCard, label: t('adminLayout.payment'), permission: 'manage_payment' },
    { path: '/admin/style', icon: Paintbrush, label: t('adminLayout.style'), permission: 'manage_style' },
    { path: '/admin/users', icon: Shield, label: t('adminLayout.administrators'), permission: 'manage_admins' },
    { path: '/admin/2fa', icon: Shield, label: t('adminLayout.twoFA'), permission: null },
    { path: '/admin/settings', icon: Settings, label: t('adminLayout.siteSettings'), permission: 'manage_site_settings' },
  ];

  // Parse permission keys from "key:r"/"key:rw" format (strip level suffix)
  const getPermissionKeys = (perms) => {
    if (!perms || !Array.isArray(perms)) return [];
    return perms.map(p => {
      if (typeof p !== 'string') return p;
      if (p.endsWith(':r')) return p.slice(0, -2);
      if (p.endsWith(':rw')) return p.slice(0, -3);
      return p;
    });
  };

  const menuItems = userPermissions === 'all'
    ? allMenuItems
    : allMenuItems.filter(item => {
        if (item.permission === null) return true;
        const keys = getPermissionKeys(userPermissions);
        return keys.includes(item.permission);
      });

  const isActive = (path, exact) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  const SidebarNav = () => (
    <nav className="p-3 md:p-4 space-y-1">
      {menuItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          className={`flex items-center space-x-3 px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-colors text-sm md:text-base ${
            isActive(item.path, item.exact)
              ? 'bg-black text-white'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
          data-testid={`sidebar-link-${item.path.replace(/\//g, '-')}`}
        >
          <item.icon className="w-5 h-5 flex-shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 gap-2">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-md hover:bg-gray-100"
              aria-label={t('adminLayout.openMenu')}
              data-testid="admin-mobile-menu-btn"
            >
              <Menu className="w-6 h-6" />
            </button>
            <Link to="/" className="text-base md:text-xl font-bold tracking-wider truncate">
              <span className="hidden sm:inline">BEST SHOP {t('adminLayout.adminPanel').toUpperCase()}</span>
              <span className="sm:hidden">BEST SHOP</span>
            </Link>
          </div>
          <div className="flex items-center space-x-2 md:space-x-4">
            <LanguageSwitcher />
            <NotificationBell />
            <span className="hidden md:inline text-sm text-gray-600 truncate max-w-[140px]">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={handleLogout} data-testid="admin-logout-btn">
              <LogOut className="w-4 h-4 md:mr-2" />
              <span className="hidden md:inline">{t('adminLayout.logout')}</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-73px)]">
          <SidebarNav />
        </aside>

        {/* Mobile Drawer + Backdrop */}
        {mobileOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileOpen(false)}
              aria-hidden="true"
            />
            <aside
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 max-w-[85vw] bg-white border-r border-gray-200 z-50 overflow-y-auto shadow-xl"
              data-testid="admin-mobile-drawer"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="font-bold tracking-wider">BEST SHOP {t('adminLayout.adminPanel').toUpperCase()}</span>
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="p-1 rounded-md hover:bg-gray-100"
                  aria-label={t('adminLayout.closeMenu')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <SidebarNav />
            </aside>
          </>
        )}

        {/* Main Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 min-w-0 overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../mock/mockData';
import { usersApi } from '../services/api';

// Permission route mapping
const PERMISSION_ROUTES = {
  dashboard: '/admin',
  manage_orders: '/admin/orders',
  view_sales: '/admin/sales',
  view_customers: '/admin/customers',
  manage_products: '/admin/products',
  manage_categories: '/admin/categories',
  manage_attributes: '/admin/attributes',
  manage_promotions: '/admin/promotions',
  manage_coupons: '/admin/coupons',
  manage_returns: '/admin/returns',
  manage_newsletter: '/admin/newsletter',
  manage_payment: '/admin/payment',
  manage_style: '/admin/style',
  manage_admins: '/admin/users',
  manage_site_settings: '/admin/settings',
};

// Parse permissions from array format "key:r" / "key:rw" / "key" (legacy = rw)
const parsePermissionKeys = (permsArray) => {
  return (permsArray || []).map(p => {
    if (typeof p !== 'string') return p;
    if (p.endsWith(':r') || p.endsWith(':rw')) return p.split(':')[0];
    return p;
  });
};

const PermissionGuard = ({ permission, children }) => {
  const [status, setStatus] = useState('loading');
  const [redirectTo, setRedirectTo] = useState('/admin');
  const user = getCurrentUser();

  useEffect(() => {
    const checkPermission = async () => {
      if (!user?.email) { setStatus('redirect'); return; }
      try {
        const data = await usersApi.getAll({ role: 'admin' });
        const dbUser = (data.items || []).find(u => u.email === user.email);
        if (!dbUser) { setStatus('allowed'); return; }
        if (dbUser.email === 'admin@bestshop.com' || dbUser.role === 'super_admin') { setStatus('allowed'); return; }
        const permKeys = parsePermissionKeys(dbUser.permissions || []);
        if (permKeys.includes(permission)) {
          setStatus('allowed');
        } else {
          const firstAllowed = permKeys.find(p => PERMISSION_ROUTES[p]);
          setRedirectTo(firstAllowed ? PERMISSION_ROUTES[firstAllowed] : '/admin/orders');
          setStatus('redirect');
        }
      } catch {
        setStatus('allowed');
      }
    };
    checkPermission();
  }, [user?.email, permission]);

  if (status === 'loading') return null;
  if (status === 'redirect') return <Navigate to={redirectTo} replace />;
  return children;
};

export default PermissionGuard;

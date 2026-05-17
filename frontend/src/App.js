import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from './components/ui/toaster';
import ThemeProvider from './components/ThemeProvider';
import SiteIdentityProvider from './hooks/useSiteIdentity';
import { initSiteTexts } from './mock/mockData';
import './App.css';

// Layout Components
import Header from './components/Header';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionGuard from './components/PermissionGuard';
import AdminLayout from './components/AdminLayout';
import AuthCallback from './components/AuthCallback';

// Public Pages
import Home from './pages/Home';
import CategoryPage from './pages/CategoryPage';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Wishlist from './pages/Wishlist';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import PromotionsPage from './pages/PromotionsPage';
import NouveautesPage from './pages/NouveautesPage';
import LoadingDemo from './pages/LoadingDemo';
import MyOrders from './pages/MyOrders';
import Profile from './pages/Profile';
import ChangePassword from './pages/ChangePassword';
import Invoice from './pages/Invoice';
import ReturnRequest from './pages/ReturnRequest';
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe';
import StaticPage from './pages/StaticPage';
import VerifyEmail from './pages/VerifyEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminInventory from './pages/admin/AdminInventory';
import AdminPages from './pages/admin/AdminPages';
import AdminCategories from './pages/admin/AdminCategories';
import AdminAttributes from './pages/admin/AdminAttributes';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminPromotions from './pages/admin/AdminPromotions';
import AdminReturns from './pages/admin/AdminReturns';
import AdminSalesStats from './pages/admin/AdminSalesStats';
import AdminOrders from './pages/admin/AdminOrders';
import AdminCustomers from './pages/admin/AdminCustomers';
import AdminUsers from './pages/admin/AdminUsers';
import TwoFactor from './pages/admin/TwoFactor';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import AdminNotifications from './pages/admin/AdminNotifications';
import PaymentSettings from './pages/admin/PaymentSettings';
import SiteSettings from './pages/admin/SiteSettings';
import StyleCustomization from './pages/admin/StyleCustomization';

function AppRouter() {
  const location = useLocation();

  // Handle Google OAuth redirect: ?oauth=success
  // The backend has set httpOnly access_token cookie. We exchange it via /api/auth/session
  // for a JS-readable user object + bearer token, then save to localStorage.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('oauth') === 'success') {
      (async () => {
        try {
          const res = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/session`, {
            credentials: 'include'
          });
          if (!res.ok) throw new Error('OAuth session exchange failed');
          const u = await res.json();
          localStorage.setItem('access_token', u.access_token);
          localStorage.setItem('bestShopUser', JSON.stringify({
            id: u.id, email: u.email, name: u.name, role: u.role, picture: u.picture
          }));
          // Clean URL and reload so all components see the new auth state
          window.history.replaceState({}, '', location.pathname);
          window.location.reload();
        } catch (e) {
          console.error('OAuth session exchange error:', e);
          window.history.replaceState({}, '', location.pathname + '?error=oauth_failed');
        }
      })();
    }
    // Show error toast if OAuth failed upstream
    const err = params.get('error');
    if (err && err.startsWith('oauth') || ['google_auth_denied','missing_code_or_state','token_failed','no_access_token','user_info_failed','network'].includes(err)) {
      console.warn('OAuth error:', err);
    }
  }, [location.search, location.pathname]);

  // CRITICAL: Check for session_id in URL fragment BEFORE rendering other routes
  // This prevents race conditions by processing OAuth callback synchronously
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Admin Routes - Must be before catch-all */}
      <Route element={<ProtectedRoute adminOnly={true} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<PermissionGuard permission="dashboard"><AdminDashboard /></PermissionGuard>} />
          <Route path="products" element={<PermissionGuard permission="manage_products"><AdminProducts /></PermissionGuard>} />
          <Route path="inventory" element={<PermissionGuard permission="manage_inventory"><AdminInventory /></PermissionGuard>} />
          <Route path="categories" element={<PermissionGuard permission="manage_categories"><AdminCategories /></PermissionGuard>} />
          <Route path="attributes" element={<PermissionGuard permission="manage_attributes"><AdminAttributes /></PermissionGuard>} />
          <Route path="promotions" element={<PermissionGuard permission="manage_promotions"><AdminPromotions /></PermissionGuard>} />
          <Route path="coupons" element={<PermissionGuard permission="manage_coupons"><AdminCoupons /></PermissionGuard>} />
          <Route path="returns" element={<PermissionGuard permission="manage_returns"><AdminReturns /></PermissionGuard>} />
          <Route path="sales" element={<PermissionGuard permission="view_sales"><AdminSalesStats /></PermissionGuard>} />
          <Route path="orders" element={<PermissionGuard permission="manage_orders"><AdminOrders /></PermissionGuard>} />
          <Route path="customers" element={<PermissionGuard permission="view_customers"><AdminCustomers /></PermissionGuard>} />
          <Route path="users" element={<PermissionGuard permission="manage_admins"><AdminUsers /></PermissionGuard>} />
          <Route path="2fa" element={<TwoFactor />} />
          <Route path="newsletter" element={<PermissionGuard permission="manage_newsletter"><AdminNewsletter /></PermissionGuard>} />
              <Route path="notifications-settings" element={<AdminNotifications />} />
          <Route path="payment" element={<PermissionGuard permission="manage_payment"><PaymentSettings /></PermissionGuard>} />
          <Route path="style" element={<PermissionGuard permission="manage_style"><StyleCustomization /></PermissionGuard>} />
          <Route path="pages" element={<PermissionGuard permission="manage_pages"><AdminPages /></PermissionGuard>} />
          <Route path="settings" element={<PermissionGuard permission="manage_site_settings"><SiteSettings /></PermissionGuard>} />
        </Route>
      </Route>

      {/* Public Routes with Header/Footer */}
      <Route
        path="/*"
        element={
          <>
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/category/:categorySlug" element={<CategoryPage />} />
              <Route path="/category/:categorySlug/:subcategorySlug" element={<CategoryPage />} />
              <Route path="/category/:categorySlug/:subcategorySlug/:subSubcategorySlug" element={<CategoryPage />} />
              <Route path="/product/:id" element={<ProductDetail />} />
              <Route path="/cart" element={<Cart />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/order-confirmation" element={<OrderConfirmation />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/cookies" element={<PrivacyPage />} />
              <Route path="/promotions" element={<PromotionsPage />} />
              <Route path="/nouveautes" element={<NouveautesPage />} />
              <Route path="/loading-demo" element={<LoadingDemo />} />
              <Route path="/orders" element={<MyOrders />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/change-password" element={<ChangePassword />} />
              <Route path="/order/:orderId/invoice" element={<Invoice />} />
              <Route path="/order/:orderId/return" element={<ReturnRequest />} />
              <Route path="/newsletter/unsubscribe" element={<NewsletterUnsubscribe />} />
              <Route path="/page/:pageId" element={<StaticPage />} />
              <Route path="/verify-email" element={<VerifyEmail />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
            </Routes>
            <Footer />
          </>
        }
      />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    // Sync site texts from backend to local cache at app mount
    initSiteTexts();
  }, []);
  return (
    <ThemeProvider>
      <BrowserRouter>
        <SiteIdentityProvider>
          <div className="App">
            <AppRouter />
            <Toaster />
          </div>
        </SiteIdentityProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
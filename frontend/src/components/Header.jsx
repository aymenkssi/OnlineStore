import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingBag, Heart, User, Menu, X, Loader2, ChevronDown } from 'lucide-react';
import { getSiteTexts, getWishlist, getCart } from '../mock/mockData';
import { getCurrentUser, logout } from '../mock/mockData';
import { useSiteTexts } from '../hooks/useSiteTexts';
import { categoriesApi, settingsApi } from '../services/api';
import AuthModal from './AuthModal';
import LanguageSwitcher from './LanguageSwitcher';
import { tCatName } from '../i18n/entityTranslations';

const Header = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('femme');
  const [wishlistCount, setWishlistCount] = useState(getWishlist().length);
  const [cartCount, setCartCount] = useState(getCart().reduce((sum, item) => sum + item.quantity, 0));
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [bannerSettings, setBannerSettings] = useState({
    enabled: true,
    text: '',
    bgColor: '#F3F4F6',
    textColor: '#1F2937',
    animation: 'none',
    animationSpeed: 30,
    fontSize: 14
  });
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getCurrentUser();
  const t = useSiteTexts();
  const { t: i18nT, i18n } = useTranslation();
  const siteConfig = getSiteTexts();

  // Charger les catégories depuis l'API MongoDB
  const loadCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback vide en cas d'erreur
      setCategories([]);
    }
    setLoadingCategories(false);
  }, []);

  // Charger les paramètres de la bannière
  const loadBannerSettings = useCallback(async () => {
    try {
      const styleSettings = await settingsApi.getStyle();
      setBannerSettings({
        enabled: styleSettings.banner_enabled ?? true,
        text: styleSettings.banner_text || t.topBanner || 'Livraison gratuite à partir de 400€ d\'achat',
        bgColor: styleSettings.banner_bg_color || '#F3F4F6',
        textColor: styleSettings.banner_text_color || '#1F2937',
        animation: styleSettings.banner_animation || 'none',
        animationSpeed: styleSettings.banner_animation_speed || 30,
        fontSize: styleSettings.banner_font_size || 14
      });
    } catch (error) {
      console.error('Error loading banner settings:', error);
    }
  }, [t.topBanner]);

  useEffect(() => {
    loadCategories();
    loadBannerSettings();
  }, [loadCategories, loadBannerSettings]);

  // Mettre à jour le compteur de wishlist et panier
  useEffect(() => {
    const updateCounts = () => {
      setWishlistCount(getWishlist().length);
      setCartCount(getCart().reduce((sum, item) => sum + item.quantity, 0));
    };
    
    window.addEventListener('storage', updateCounts);
    const interval = setInterval(updateCounts, 1000);
    
    return () => {
      window.removeEventListener('storage', updateCounts);
      clearInterval(interval);
    };
  }, []);

  // Détecter la catégorie active depuis l'URL
  useEffect(() => {
    const pathParts = location.pathname.split('/');
    if (pathParts[1] === 'category' && pathParts[2]) {
      setSelectedCategory(pathParts[2]);
    }
  }, [location.pathname]);

  // Obtenir les sous-catégories de la catégorie active
  const activeCategory = categories.find(cat => cat.slug === selectedCategory);
  const mainMenuItems = activeCategory?.subcategories || (categories[0]?.subcategories || []);

  const handleLogout = () => {
    logout();
    navigate('/');
    window.location.reload();
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top Banner - Configurable */}
      {bannerSettings.enabled && bannerSettings.text && (
        <div 
          className="text-center py-2 px-4 overflow-hidden"
          style={{ 
            backgroundColor: bannerSettings.bgColor,
            color: bannerSettings.textColor,
            fontSize: `${bannerSettings.fontSize}px`
          }}
        >
          <p 
            className={`whitespace-nowrap ${
              bannerSettings.animation === 'scroll-left' ? 'animate-marquee-left' :
              bannerSettings.animation === 'scroll-right' ? 'animate-marquee-right' :
              bannerSettings.animation === 'fade' ? 'animate-pulse' : ''
            }`}
            style={{
              animationDuration: bannerSettings.animation !== 'none' ? `${bannerSettings.animationSpeed}s` : undefined
            }}
          >
            {bannerSettings.text}
          </p>
        </div>
      )}

      {/* Top Header - Mode selection & Logo & Icons */}
      <div className="border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 items-center py-4">
            {/* Left: Gender Categories */}
            <nav className="hidden lg:flex items-center space-x-8 justify-self-start">
              {loadingCategories ? (
                <div className="flex items-center text-sm text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {i18nT('common.loading')}
                </div>
              ) : (
                categories.map((category) => (
                  <Link
                    key={category.id || category.slug}
                    to={`/category/${category.slug}`}
                    onClick={() => setSelectedCategory(category.slug)}
                    className={`text-sm hover:opacity-60 transition-opacity ${
                      selectedCategory === category.slug ? 'font-semibold border-b-2 border-black' : ''
                    }`}
                    data-testid={`category-link-${category.slug}`}
                  >
                    {tCatName(category, i18n.language)}
                  </Link>
                ))
              )}
            </nav>

            {/* Center: Logo */}
            <Link to="/" className="text-2xl font-bold tracking-wider flex items-center justify-center space-x-3 justify-self-center">
              {siteConfig.siteLogo && (
                <img 
                  src={siteConfig.siteLogo} 
                  alt={siteConfig.siteName || 'BEST SHOP'} 
                  className="h-8 object-contain"
                />
              )}
              <span>{siteConfig.siteName || 'BEST SHOP'}</span>
            </Link>

            {/* Right: Icons & Search */}
            <div className="flex items-center space-x-6 justify-self-end">
              {/* Language switcher */}
              <LanguageSwitcher />

              {/* Search */}
              <div className="hidden lg:block relative">
                {searchOpen ? (
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder={t.searchPlaceholder}
                      className="w-64 px-3 py-1 border-b border-gray-300 focus:outline-none focus:border-black transition-colors"
                      autoFocus
                    />
                    <button onClick={() => setSearchOpen(false)} className="ml-2">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setSearchOpen(true)} className="hover:opacity-60 transition-opacity">
                    <Search className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* User Menu */}
              <div className="relative group">
                {currentUser ? (
                  <>
                    <button className="hover:opacity-60 transition-opacity">
                      <User className="w-5 h-5" />
                    </button>
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white shadow-lg border border-gray-100 rounded-sm opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                      <div className="py-2">
                        <div className="px-4 py-2 text-sm border-b border-gray-100">
                          <p className="font-medium">{currentUser.name}</p>
                          <p className="text-xs text-gray-500">{currentUser.email}</p>
                        </div>
                        {currentUser.role === 'admin' && (
                          <Link to="/admin" className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                            {t.adminDashboard}
                          </Link>
                        )}
                        <Link to="/orders" className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                          {t.myOrders}
                        </Link>
                        <Link to="/profile" className="block px-4 py-2 text-sm hover:bg-gray-50 transition-colors">
                          Mon Profil
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors"
                        >
                          {t.logout}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <button 
                    onClick={() => setAuthModalOpen(true)}
                    className="hover:opacity-60 transition-opacity"
                  >
                    <User className="w-5 h-5" />
                  </button>
                )}
              </div>

              <Link to="/wishlist" className="hover:opacity-60 transition-opacity relative">
                <Heart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {wishlistCount}
                  </span>
                )}
              </Link>

              <Link to="/cart" className="hover:opacity-60 transition-opacity relative" data-testid="cart-icon">
                <ShoppingBag className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile Menu Toggle */}
              <button
                className="lg:hidden hover:opacity-60 transition-opacity"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation - Subcategories Menu */}
      <div className="hidden lg:block">
        <div className="container mx-auto px-4">
          <nav className="flex items-center justify-center space-x-8 py-3">
            {mainMenuItems.length > 0 ? (
              mainMenuItems.map((item, index) => {
                const hasChildren = item.children && item.children.length > 0;
                return (
                  <div key={item.id || index} className="relative group/sub">
                    <Link
                      to={`/category/${selectedCategory}/${item.slug}`}
                      className={`text-sm hover:opacity-60 transition-opacity inline-flex items-center gap-1 ${
                        item.slug === 'promotions' || item.slug === 'soldes' ? 'text-red-600 font-semibold' : ''
                      }`}
                      data-testid={`subcategory-link-${item.slug}`}
                    >
                      {item.name}
                      {hasChildren && (
                        <ChevronDown className="w-3 h-3 opacity-50" />
                      )}
                    </Link>
                    {/* Dropdown for sub-subcategories */}
                    {hasChildren && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 opacity-0 invisible group-hover/sub:opacity-100 group-hover/sub:visible transition-all duration-200 z-50">
                        <div className="bg-white border border-gray-200 rounded-md shadow-lg py-2 min-w-[180px]">
                          {item.children.map((child, cidx) => (
                            <Link
                              key={child.slug || `child-${cidx}`}
                              to={`/category/${selectedCategory}/${item.slug}/${child.slug}`}
                              className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-black transition-colors"
                              data-testid={`sub-subcategory-link-${child.slug}`}
                            >
                              {child.name}
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <span className="text-sm text-gray-400">Sélectionnez une catégorie</span>
            )}
          </nav>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="container mx-auto px-4 py-4 space-y-4">
            {/* Gender Categories */}
            {loadingCategories ? (
              <div className="flex items-center text-sm text-gray-400 py-2">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Chargement des catégories...
              </div>
            ) : (
              categories.map((category) => (
                <div key={category.id || category.slug}>
                  <Link
                    to={`/category/${category.slug}`}
                    className={`block font-medium py-2 ${
                      selectedCategory === category.slug ? 'text-black' : 'text-gray-600'
                    }`}
                    onClick={() => {
                      setSelectedCategory(category.slug);
                      setMobileMenuOpen(false);
                    }}
                  >
                    {tCatName(category, i18n.language)}
                  </Link>
                  {/* Sous-catégories pour mobile */}
                  {selectedCategory === category.slug && category.subcategories && (
                    <div className="pl-4 space-y-2 mt-2">
                      {category.subcategories.map((sub, idx) => (
                        <div key={sub.id || idx}>
                          <Link
                            to={`/category/${category.slug}/${sub.slug}`}
                            className={`block py-1 text-sm ${
                              sub.slug === 'promotions' || sub.slug === 'soldes' 
                                ? 'text-red-600 font-medium' 
                                : 'text-gray-500 hover:text-black'
                            }`}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            {tCatName(sub, i18n.language)}
                          </Link>
                          {/* Sub-subcategories for mobile */}
                          {sub.children && sub.children.length > 0 && (
                            <div className="pl-4 space-y-1 mt-1">
                              {sub.children.map((child, cidx) => (
                                <Link
                                  key={child.slug || child.id || `mobile-child-${cidx}`}
                                  to={`/category/${category.slug}/${sub.slug}/${child.slug}`}
                                  className="block py-0.5 text-xs text-gray-400 hover:text-black"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {tCatName(child, i18n.language)}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </nav>
        </div>
      )}

      {/* Auth Modal */}
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </header>
  );
};

export default Header;

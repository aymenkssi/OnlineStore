import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Flame, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { useSiteTexts } from '../hooks/useSiteTexts';
import { productsApi, categoriesApi, settingsApi } from '../services/api';
import { enrichProduct } from '../mock/mockData';
import { PersonalizedRecommendations, RecentlyViewed } from '../components/Recommendations';
import LoadingScreen from '../components/LoadingScreen';
import { formatPrice } from '../hooks/usePaymentSettings';
import { tCatName, tProductName } from '../i18n/entityTranslations';

const Home = () => {
  const { t: i18nT, i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPromoIndex, setCurrentPromoIndex] = useState(0);
  const [currentNewArrivalIndex, setCurrentNewArrivalIndex] = useState(0);
  const [categoriesPerRow, setCategoriesPerRow] = useState(3); // Default: 3 categories per row
  const [styleSettings, setStyleSettings] = useState({
    promotionBgColor: '#DC2626',
    promotionBgColorEnd: '#EF4444',
    promotionImageSize: 'large',
    newarrivalsBgColor: '#1E40AF',
    newarrivalsBgColorEnd: '#3B82F6',
    newarrivalsImageSize: 'large'
  });
  const t = useSiteTexts();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsData, categoriesData, styleData, siteSettings] = await Promise.all([
          productsApi.getAll(),
          categoriesApi.getAll(),
          settingsApi.getStyle().catch(() => ({})),
          settingsApi.getSite().catch(() => ({}))
        ]);
        setProducts(productsData);
        setCategories(categoriesData);
        
        // Load categories per row setting
        if (siteSettings && siteSettings.categories_per_row) {
          setCategoriesPerRow(siteSettings.categories_per_row);
        }
        
        if (styleData) {
          setStyleSettings({
            promotionBgColor: styleData.promotion_bg_color || '#DC2626',
            promotionBgColorEnd: styleData.promotion_bg_color_end || '#EF4444',
            promotionImageSize: styleData.promotion_image_size || 'large',
            newarrivalsBgColor: styleData.newarrivals_bg_color || '#1E40AF',
            newarrivalsBgColorEnd: styleData.newarrivals_bg_color_end || '#3B82F6',
            newarrivalsImageSize: styleData.newarrivals_image_size || 'large'
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Get products on promotion (with originalPrice > price)
  const promoProducts = useMemo(() => {
    return products
      .map(enrichProduct)
      .filter(p => p.onPromotion || (p.originalPrice && p.originalPrice > p.price));
  }, [products]);

  // Get 4 most recently added products (sorted by created_at or id)
  const newArrivals = useMemo(() => {
    return [...products]
      .sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB - dateA;
      })
      .slice(0, 4)
      .map(enrichProduct);
  }, [products]);

  // Auto-slide for promotions carousel
  useEffect(() => {
    if (promoProducts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentPromoIndex(prev => prev >= promoProducts.length - 1 ? 0 : prev + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, [promoProducts.length]);

  // Auto-slide for new arrivals carousel
  useEffect(() => {
    if (newArrivals.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentNewArrivalIndex(prev => prev >= newArrivals.length - 1 ? 0 : prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [newArrivals.length]);

  const nextPromo = () => setCurrentPromoIndex(prev => prev >= promoProducts.length - 1 ? 0 : prev + 1);
  const prevPromo = () => setCurrentPromoIndex(prev => prev <= 0 ? promoProducts.length - 1 : prev - 1);
  const nextNewArrival = () => setCurrentNewArrivalIndex(prev => prev >= newArrivals.length - 1 ? 0 : prev + 1);
  const prevNewArrival = () => setCurrentNewArrivalIndex(prev => prev <= 0 ? newArrivals.length - 1 : prev - 1);

  const currentProduct = promoProducts[currentPromoIndex];
  const currentNewArrival = newArrivals[currentNewArrivalIndex];

  // Get image size class based on setting
  const getImageSizeClass = (size) => {
    switch (size) {
      case 'small': return 'max-w-sm';
      case 'medium': return 'max-w-md';
      case 'large': return 'max-w-xl';
      case 'xlarge': return 'max-w-2xl';
      default: return 'max-w-xl';
    }
  };

  // Get zone padding based on image size (auto-adapt)
  const getZonePadding = (size) => {
    switch (size) {
      case 'small': return 'py-6';
      case 'medium': return 'py-8';
      case 'large': return 'py-10';
      case 'xlarge': return 'py-12';
      default: return 'py-10';
    }
  };

  if (loading) {
    return <LoadingScreen message="Chargement de la boutique..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Promotions Section */}
      {promoProducts.length > 0 && currentProduct && (
        <section 
          className={`w-full ${getZonePadding(styleSettings.promotionImageSize)}`}
          style={{
            background: `linear-gradient(to right, ${styleSettings.promotionBgColor}, ${styleSettings.promotionBgColorEnd})`
          }}
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <Flame className="w-8 h-8 text-yellow-300 animate-pulse" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{i18nT('home.promotions')}</h2>
                  <p className="text-white/80 text-sm">{i18nT('home.promotionsSubtitle')}</p>
                </div>
              </div>
              <Link 
                to="/promotions" 
                className="flex items-center gap-2 px-4 py-2 bg-white text-red-600 rounded-full font-semibold hover:bg-red-50 transition-colors"
                data-testid="see-all-promotions"
              >
                {i18nT('home.viewAllPromotions')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="relative flex items-center justify-center">
              {promoProducts.length > 1 && (
                <button 
                  onClick={prevPromo}
                  className="absolute left-4 md:left-8 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-colors"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}

              <div className={`w-full ${getImageSizeClass(styleSettings.promotionImageSize)} mx-auto px-16`}>
                <Link 
                  to={`/product/${currentProduct.id}`} 
                  className="block bg-white rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02]"
                >
                  <div className="relative aspect-[4/5]">
                    <img
                      src={currentProduct.images?.[0] || 'https://via.placeholder.com/600'}
                      alt={currentProduct.name}
                      className="w-full h-full object-cover transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-red-600 text-white px-5 py-2 rounded-full text-xl font-bold shadow-lg">
                      -{currentProduct.discount || Math.round(((currentProduct.originalPrice - currentProduct.price) / currentProduct.originalPrice) * 100)}%
                    </div>
                    {currentProduct.promotionEndDate && (
                      <div className="absolute top-4 right-4 bg-white/90 text-gray-700 px-4 py-2 rounded-full text-sm font-medium">
                        Jusqu'au {new Date(currentProduct.promotionEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </div>
                    )}
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">{currentProduct.brand}</p>
                    <h3 className="text-2xl font-semibold mb-4">{currentProduct.name}</h3>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-3xl font-bold text-red-600">{formatPrice(currentProduct.price)}</span>
                      <span className="text-xl text-gray-400 line-through">{formatPrice(currentProduct.originalPrice)}</span>
                    </div>
                    <p className="text-green-600 font-semibold mt-3 text-lg">
                      Économisez {formatPrice(currentProduct.originalPrice - currentProduct.price)}
                    </p>
                  </div>
                </Link>
              </div>

              {promoProducts.length > 1 && (
                <button 
                  onClick={nextPromo}
                  className="absolute right-4 md:right-8 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-colors"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>

            {promoProducts.length > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {promoProducts.map((p, idx) => (
                  <button
                    key={p.id || `promo-${idx}`}
                    onClick={() => setCurrentPromoIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentPromoIndex === idx ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Produit ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Hero Section - Department Selection */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-center text-3xl font-light mb-12">{t.chooseDepartment}</h1>
          <div className={`grid grid-cols-1 gap-6 ${
            categoriesPerRow === 2 ? 'md:grid-cols-2' :
            categoriesPerRow === 3 ? 'md:grid-cols-3' :
            categoriesPerRow === 4 ? 'md:grid-cols-4' :
            categoriesPerRow === 6 ? 'md:grid-cols-6' :
            'md:grid-cols-3'
          }`}>
            {categories.map((category) => (
              <Link
                key={category.id}
                to={`/category/${category.slug}`}
                className={`group relative overflow-hidden ${
                  categoriesPerRow === 2 ? 'aspect-[3/4]' :
                  categoriesPerRow === 3 ? 'aspect-[3/4]' :
                  categoriesPerRow === 4 ? 'aspect-[4/5]' :
                  categoriesPerRow === 6 ? 'aspect-square' :
                  'aspect-[3/4]'
                }`}
              >
                <img
                  src={category.image}
                  alt={tCatName(category, i18n.language)}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <h2 className={`text-white font-light tracking-wider uppercase ${
                    categoriesPerRow === 2 ? 'text-4xl' :
                    categoriesPerRow === 3 ? 'text-3xl' :
                    categoriesPerRow === 4 ? 'text-2xl' :
                    categoriesPerRow === 6 ? 'text-xl' :
                    'text-3xl'
                  }`}>
                    {tCatName(category, i18n.language)}
                  </h2>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals Section - Configurable like Promotions */}
      {newArrivals.length > 0 && currentNewArrival && (
        <section 
          className={`w-full ${getZonePadding(styleSettings.newarrivalsImageSize)}`}
          style={{
            background: `linear-gradient(to right, ${styleSettings.newarrivalsBgColor}, ${styleSettings.newarrivalsBgColorEnd})`
          }}
        >
          <div className="container mx-auto px-4">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{i18nT('home.newArrivals')}</h2>
                  <p className="text-white/80 text-sm">{i18nT('home.newArrivalsSubtitle')}</p>
                </div>
              </div>
              <Link 
                to="/nouveautes" 
                className="flex items-center gap-2 px-4 py-2 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition-colors"
                data-testid="see-all-newarrivals"
              >
                {i18nT('common.viewAll')} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            
            <div className="relative flex items-center justify-center">
              {newArrivals.length > 1 && (
                <button 
                  onClick={prevNewArrival}
                  className="absolute left-4 md:left-8 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-colors"
                  aria-label="Précédent"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-700" />
                </button>
              )}

              <div className={`w-full ${getImageSizeClass(styleSettings.newarrivalsImageSize)} mx-auto px-16`}>
                <Link 
                  to={`/product/${currentNewArrival.id}`} 
                  className="block bg-white rounded-2xl overflow-hidden shadow-2xl hover:shadow-3xl transition-all transform hover:scale-[1.02]"
                >
                  <div className="relative aspect-[4/5]">
                    <img
                      src={currentNewArrival.images?.[0] || 'https://via.placeholder.com/600'}
                      alt={tProductName(currentNewArrival, i18n.language)}
                      className="w-full h-full object-cover transition-transform duration-500"
                    />
                    <div className="absolute top-4 left-4 bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      {i18nT('home.new')}
                    </div>
                  </div>
                  <div className="p-8 text-center">
                    <p className="text-sm text-gray-500 uppercase tracking-wider mb-2">{currentNewArrival.brand}</p>
                    <h3 className="text-2xl font-semibold mb-4">{tProductName(currentNewArrival, i18n.language)}</h3>
                    <div className="flex items-center justify-center gap-4">
                      <span className="text-3xl font-bold text-gray-900">{formatPrice(currentNewArrival.price)}</span>
                      {currentNewArrival.originalPrice && currentNewArrival.originalPrice > currentNewArrival.price && (
                        <span className="text-xl text-gray-400 line-through">{formatPrice(currentNewArrival.originalPrice)}</span>
                      )}
                    </div>
                  </div>
                </Link>
              </div>

              {newArrivals.length > 1 && (
                <button 
                  onClick={nextNewArrival}
                  className="absolute right-4 md:right-8 z-10 bg-white shadow-lg rounded-full p-3 hover:bg-gray-100 transition-colors"
                  aria-label="Suivant"
                >
                  <ChevronRight className="w-6 h-6 text-gray-700" />
                </button>
              )}
            </div>

            {newArrivals.length > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                {newArrivals.map((p, idx) => (
                  <button
                    key={p.id || `new-${idx}`}
                    onClick={() => setCurrentNewArrivalIndex(idx)}
                    className={`w-3 h-3 rounded-full transition-all ${
                      currentNewArrivalIndex === idx ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/75'
                    }`}
                    aria-label={`Produit ${idx + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Personalized Recommendations */}
      <PersonalizedRecommendations limit={8} />

      {/* Recently Viewed Products */}
      <RecentlyViewed limit={6} />

      {/* CTA Banner */}
      <section className="py-20 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-light mb-4">{t.heroTitle}</h2>
          <p className="text-gray-600 mb-8">{t.heroSubtitle}</p>
          <Link
            to="/category/femme"
            className="inline-block px-8 py-3 bg-black text-white hover:bg-gray-800 transition-colors"
          >
            {t.exploreNow}
          </Link>
        </div>
      </section>
    </div>
  );
};

export default Home;

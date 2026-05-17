import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Sparkles, Clock, TrendingUp, Tag } from 'lucide-react';
import { recommendationsApi, settingsApi } from '../services/api';
import { formatPrice } from '../hooks/usePaymentSettings';
import { tProductName } from '../i18n/entityTranslations';

// Reason icon mapping
const getReasonIcon = (reason) => {
  if (reason.includes('récemment') || reason.includes('Vu')) return <Clock className="w-4 h-4" />;
  if (reason.includes('Populaire') || reason.includes('Basé')) return <TrendingUp className="w-4 h-4" />;
  if (reason.includes('promotion')) return <Tag className="w-4 h-4" />;
  return <Sparkles className="w-4 h-4" />;
};

// Single Product Card Component
const ProductCard = ({ product, showReason = true, imageSize = 'medium' }) => {
  const { i18n } = useTranslation();
  const displayName = tProductName(product, i18n.language);
  const discount = product.originalPrice && product.originalPrice > product.price
    ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
    : 0;

  // Get aspect ratio based on image size
  const getAspectClass = (size) => {
    switch (size) {
      case 'small': return 'aspect-square';
      case 'medium': return 'aspect-[3/4]';
      case 'large': return 'aspect-[2/3]';
      case 'xlarge': return 'aspect-[9/16]';
      default: return 'aspect-[3/4]';
    }
  };

  return (
    <Link 
      to={`/product/${product.id}`}
      className="group block bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all duration-300"
      data-testid={`recommendation-${product.id}`}
    >
      <div className={`relative ${getAspectClass(imageSize)} overflow-hidden`}>
        <img
          src={product.images?.[0] || 'https://via.placeholder.com/400'}
          alt={displayName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {discount > 0 && (
          <div className="absolute top-3 left-3 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            -{discount}%
          </div>
        )}
        {product.newArrival && !discount && (
          <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
            NOUVEAU
          </div>
        )}
      </div>
      <div className="p-4">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">{product.brand}</p>
        <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-2 mb-2">
          <span className="font-bold text-gray-900">{formatPrice(product.price)}</span>
          {product.originalPrice && product.originalPrice > product.price && (
            <span className="text-sm text-gray-400 line-through">{formatPrice(product.originalPrice)}</span>
          )}
        </div>
        {showReason && product.reason && (
          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            {getReasonIcon(product.reason)}
            <span>{product.reason}</span>
          </div>
        )}
      </div>
    </Link>
  );
};

// Carousel Component for Recommendations
export const RecommendationCarousel = ({ 
  title, 
  subtitle,
  products, 
  bgColor = '#7C3AED',
  bgColorEnd = '#6366F1',
  icon: Icon = Sparkles,
  showReason = true,
  imageSize = 'medium'
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const itemsPerView = 4;
  const maxIndex = Math.max(0, products.length - itemsPerView);

  const next = () => setCurrentIndex(prev => Math.min(prev + 1, maxIndex));
  const prev = () => setCurrentIndex(prev => Math.max(prev - 1, 0));

  if (!products || products.length === 0) return null;

  return (
    <section 
      className="py-12"
      style={{ background: `linear-gradient(to right, ${bgColor}, ${bgColorEnd})` }}
    >
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-3">
            <Icon className="w-8 h-8 text-yellow-300 animate-pulse" />
            <div>
              <h2 className="text-2xl font-bold text-white">{title}</h2>
              {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
            </div>
          </div>
          
          {products.length > itemsPerView && (
            <div className="flex gap-2">
              <button
                onClick={prev}
                disabled={currentIndex === 0}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Précédent"
              >
                <ChevronLeft className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={next}
                disabled={currentIndex >= maxIndex}
                className="p-2 bg-white/20 hover:bg-white/30 rounded-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                aria-label="Suivant"
              >
                <ChevronRight className="w-5 h-5 text-white" />
              </button>
            </div>
          )}
        </div>
        
        <div className="overflow-hidden">
          <div 
            className="flex gap-4 transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${currentIndex * (100 / itemsPerView + 1)}%)` }}
          >
            {products.map((product) => (
              <div key={product.id} className="w-full md:w-1/2 lg:w-1/4 flex-shrink-0">
                <ProductCard product={product} showReason={showReason} imageSize={imageSize} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

// Grid Component for Recommendations
export const RecommendationGrid = ({ 
  title, 
  subtitle,
  products, 
  bgColor = '#7C3AED',
  bgColorEnd = '#6366F1',
  icon: Icon = Sparkles,
  showReason = true,
  imageSize = 'medium'
}) => {
  if (!products || products.length === 0) return null;

  return (
    <section 
      className="py-12"
      style={{ background: `linear-gradient(to right, ${bgColor}, ${bgColorEnd})` }}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <Icon className="w-8 h-8 text-yellow-300 animate-pulse" />
          <div>
            <h2 className="text-2xl font-bold text-white">{title}</h2>
            {subtitle && <p className="text-white/80 text-sm">{subtitle}</p>}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showReason={showReason} imageSize={imageSize} />
          ))}
        </div>
      </div>
    </section>
  );
};

// Personalized Recommendations Section
export const PersonalizedRecommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    recommendations_enabled: true,
    recommendations_bg_color: '#7C3AED',
    recommendations_bg_color_end: '#6366F1',
    recommendations_image_size: 'medium',
    recommendations_display_type: 'carousel',
    recommendations_title: 'Recommandations pour vous',
    recommendations_subtitle: 'Basé sur votre historique de navigation',
    recommendations_limit: 8
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch style settings
        const styleData = await settingsApi.getStyle().catch(() => ({}));
        if (styleData) {
          setSettings(prev => ({
            ...prev,
            recommendations_enabled: styleData.recommendations_enabled ?? true,
            recommendations_bg_color: styleData.recommendations_bg_color || '#7C3AED',
            recommendations_bg_color_end: styleData.recommendations_bg_color_end || '#6366F1',
            recommendations_image_size: styleData.recommendations_image_size || 'medium',
            recommendations_display_type: styleData.recommendations_display_type || 'carousel',
            recommendations_title: styleData.recommendations_title || 'Recommandations pour vous',
            recommendations_subtitle: styleData.recommendations_subtitle || 'Basé sur votre historique de navigation',
            recommendations_limit: styleData.recommendations_limit || 8
          }));
          
          // Only fetch recommendations if enabled
          if (styleData.recommendations_enabled !== false) {
            const data = await recommendationsApi.getPersonalized(styleData.recommendations_limit || 8);
            setRecommendations(data);
          }
        } else {
          const data = await recommendationsApi.getPersonalized(8);
          setRecommendations(data);
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Don't render if disabled
  if (!settings.recommendations_enabled) return null;

  if (loading) {
    return (
      <section 
        className="py-12"
        style={{ background: `linear-gradient(to right, ${settings.recommendations_bg_color}, ${settings.recommendations_bg_color_end})` }}
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3 mb-8">
            <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
            <h2 className="text-2xl font-bold text-white">{settings.recommendations_title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white/20 rounded-xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (recommendations.length === 0) return null;

  // Choose display type
  const DisplayComponent = settings.recommendations_display_type === 'grid' ? RecommendationGrid : RecommendationCarousel;

  return (
    <DisplayComponent
      title={settings.recommendations_title}
      subtitle={settings.recommendations_subtitle}
      products={recommendations}
      bgColor={settings.recommendations_bg_color}
      bgColorEnd={settings.recommendations_bg_color_end}
      icon={Sparkles}
      imageSize={settings.recommendations_image_size}
    />
  );
};

// Recently Viewed Products Section
export const RecentlyViewed = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState({
    recently_viewed_enabled: true,
    recently_viewed_bg_color: '#374151',
    recently_viewed_bg_color_end: '#1F2937',
    recently_viewed_title: 'Vus récemment',
    recently_viewed_limit: 6
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const styleData = await settingsApi.getStyle().catch(() => ({}));
        if (styleData) {
          setSettings(prev => ({
            ...prev,
            recently_viewed_enabled: styleData.recently_viewed_enabled ?? true,
            recently_viewed_bg_color: styleData.recently_viewed_bg_color || '#374151',
            recently_viewed_bg_color_end: styleData.recently_viewed_bg_color_end || '#1F2937',
            recently_viewed_title: styleData.recently_viewed_title || 'Vus récemment',
            recently_viewed_limit: styleData.recently_viewed_limit || 6
          }));
          
          if (styleData.recently_viewed_enabled !== false) {
            const data = await recommendationsApi.getRecentlyViewed(styleData.recently_viewed_limit || 6);
            setProducts(data);
          }
        } else {
          const data = await recommendationsApi.getRecentlyViewed(6);
          setProducts(data);
        }
      } catch (error) {
        console.error('Error fetching recently viewed:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (!settings.recently_viewed_enabled || loading || products.length === 0) return null;

  return (
    <RecommendationCarousel
      title={settings.recently_viewed_title}
      subtitle="Reprendre là où vous vous êtes arrêté"
      products={products}
      bgColor={settings.recently_viewed_bg_color}
      bgColorEnd={settings.recently_viewed_bg_color_end}
      icon={Clock}
      showReason={false}
    />
  );
};

// Similar Products Section (for Product Detail page)
export const SimilarProducts = ({ productId, limit = 4 }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSimilar = async () => {
      if (!productId) return;
      setLoading(true);
      try {
        const data = await recommendationsApi.getSimilar(productId, limit);
        setProducts(data);
      } catch (error) {
        console.error('Error fetching similar products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSimilar();
  }, [productId, limit]);

  if (loading) {
    return (
      <section className="py-12 bg-gray-50">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold mb-8">Vous pourriez aussi aimer</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 rounded-xl aspect-[3/4] animate-pulse" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (products.length === 0) return null;

  return (
    <section className="py-12 bg-gray-50" data-testid="similar-products-section">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 mb-8">
          <TrendingUp className="w-7 h-7 text-purple-600" />
          <h2 className="text-2xl font-bold text-gray-900">Vous pourriez aussi aimer</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} showReason={true} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default {
  RecommendationCarousel,
  RecommendationGrid,
  PersonalizedRecommendations,
  RecentlyViewed,
  SimilarProducts,
  ProductCard
};

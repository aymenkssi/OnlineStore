import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { enrichProduct } from '../mock/mockData';
import { productsApi } from '../services/api';
import { Tag, Clock, Loader2 } from 'lucide-react';
import { formatPrice } from '../hooks/usePaymentSettings';
import LoadingScreen from '../components/LoadingScreen';
import { tProductName } from '../i18n/entityTranslations';

const PromotionsPage = () => {
  const { i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('discount-high');

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Filter products on promotion
  let promoProducts = products.map(enrichProduct).filter(p => p.onPromotion || (p.originalPrice && p.originalPrice > p.price));

  // Sort products
  switch (sortBy) {
    case 'discount-high':
      promoProducts.sort((a, b) => (b.discount || 0) - (a.discount || 0));
      break;
    case 'discount-low':
      promoProducts.sort((a, b) => (a.discount || 0) - (b.discount || 0));
      break;
    case 'price-low':
      promoProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      promoProducts.sort((a, b) => b.price - a.price);
      break;
    default:
      break;
  }

  if (loading) {
    return <LoadingScreen message="Chargement des promotions..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <Tag className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-4xl font-light mb-4">Promotions</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Profitez de nos offres exceptionnelles sur une sélection de produits de luxe.
            Réductions jusqu'à -30% sur les plus grandes marques.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="hover:opacity-60 transition-opacity">Accueil</Link>
            <span>/</span>
            <span className="font-medium text-red-600">Promotions</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 space-y-4 lg:space-y-0">
          <div>
            <h2 className="text-2xl font-light mb-2">Tous les produits en promotion</h2>
            <p className="text-gray-600">{promoProducts.length} articles en promotion</p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600">Trier par:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-black"
            >
              <option value="discount-high">Réduction: la plus élevée</option>
              <option value="discount-low">Réduction: la plus faible</option>
              <option value="price-low">Prix: Croissant</option>
              <option value="price-high">Prix: Décroissant</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {promoProducts.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucune promotion disponible pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {promoProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group"
              >
                <div className="relative aspect-[3/4] overflow-hidden mb-3">
                  <img
                    src={product.images[0]}
                    alt={tProductName(product, i18n.language)}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  {product.images[1] && (
                    <img
                      src={product.images[1]}
                      alt={tProductName(product, i18n.language)}
                      className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    />
                  )}
                  {/* Promotion Badge */}
                  <div className="absolute top-3 left-3">
                    <div className="bg-red-600 text-white px-3 py-1 text-sm font-semibold">
                      -{product.discount}%
                    </div>
                  </div>
                  {/* End Date Badge */}
                  {product.promotionEndDate && (
                    <div className="absolute top-3 right-3 bg-white bg-opacity-90 px-2 py-1 rounded text-xs flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-red-600" />
                      <span className="text-gray-700">
                        Jusqu'au {new Date(product.promotionEndDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-gray-500 uppercase">{product.brand}</p>
                  <h3 className="text-sm font-medium group-hover:opacity-60 transition-opacity">
                    {tProductName(product, i18n.language)}
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-semibold text-red-600">{formatPrice(product.price)}</span>
                    {product.originalPrice && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    Économisez {formatPrice(product.originalPrice - product.price)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PromotionsPage;
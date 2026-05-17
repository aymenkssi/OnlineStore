import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { enrichProduct } from '../mock/mockData';
import { productsApi } from '../services/api';
import { Sparkles, Loader2 } from 'lucide-react';
import { formatPrice } from '../hooks/usePaymentSettings';
import LoadingScreen from '../components/LoadingScreen';
import { tProductName } from '../i18n/entityTranslations';

const NouveautesPage = () => {
  const { i18n } = useTranslation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

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

  // Get newest products (sorted by created_at)
  let newProducts = [...products]
    .sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    })
    .slice(0, 4) // Only the 4 most recent products
    .map(enrichProduct);

  // Sort products based on selection
  switch (sortBy) {
    case 'newest':
      // Already sorted by created_at
      break;
    case 'price-low':
      newProducts.sort((a, b) => a.price - b.price);
      break;
    case 'price-high':
      newProducts.sort((a, b) => b.price - a.price);
      break;
    case 'name':
      newProducts.sort((a, b) => a.name.localeCompare(b.name));
      break;
    default:
      break;
  }

  if (loading) {
    return <LoadingScreen message="Chargement des nouveautés..." />;
  }

  return (
    <div className="min-h-screen">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-100">
        <div className="container mx-auto px-4 py-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="w-10 h-10 text-blue-600 animate-pulse" />
          </div>
          <h1 className="text-4xl font-light mb-4">Nouveautés</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Découvrez nos derniers arrivages ! Les 4 produits les plus récemment ajoutés à notre collection.
          </p>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="hover:opacity-60 transition-opacity">Accueil</Link>
            <span>/</span>
            <span className="font-medium text-blue-600">Nouveautés</span>
          </div>
        </div>
      </div>

      {/* Products Section */}
      <div className="container mx-auto px-4 py-8">
        {/* Header with count and sort */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
          <div>
            <h2 className="text-2xl font-light mb-2">Tous les nouveaux produits</h2>
            <p className="text-gray-600">{newProducts.length} article{newProducts.length > 1 ? 's' : ''} récemment ajouté{newProducts.length > 1 ? 's' : ''}</p>
          </div>
          
          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="text-sm text-gray-600">Trier par:</label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">Plus récents</option>
              <option value="price-low">Prix: Croissant</option>
              <option value="price-high">Prix: Décroissant</option>
              <option value="name">Nom (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Products Grid */}
        {newProducts.length === 0 ? (
          <div className="text-center py-16">
            <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">Aucun nouveau produit pour le moment</p>
            <Link to="/" className="text-blue-600 hover:underline mt-4 inline-block">
              Retour à l'accueil
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newProducts.map((product) => (
              <Link
                key={product.id}
                to={`/product/${product.id}`}
                className="group bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
              >
                <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                  <img
                    src={product.images?.[0] || 'https://via.placeholder.com/400'}
                    alt={tProductName(product, i18n.language)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* NEW Badge */}
                  <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    NOUVEAU
                  </div>
                  {/* Discount Badge if applicable */}
                  {product.discount && product.discount > 0 && (
                    <div className="absolute top-3 right-3 bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                      -{product.discount}%
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{product.brand}</p>
                  <h3 className="font-medium text-gray-900 mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
                    {product.name}
                  </h3>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(product.price)}
                    </span>
                    {product.originalPrice && product.originalPrice > product.price && (
                      <span className="text-sm text-gray-400 line-through">
                        {formatPrice(product.originalPrice)}
                      </span>
                    )}
                  </div>

                  {/* Date added */}
                  {product.created_at && (
                    <p className="text-xs text-gray-400 mt-2">
                      Ajouté le {new Date(product.created_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NouveautesPage;

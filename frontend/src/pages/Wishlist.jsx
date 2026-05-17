import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { getWishlist, products, enrichProduct } from '../mock/mockData';
import ProductCard from '../components/ProductCard';
import { Button } from '../components/ui/button';

const Wishlist = () => {
  const wishlistIds = getWishlist();
  const wishlistProducts = products
    .filter(p => wishlistIds.includes(p.id))
    .map(enrichProduct);

  if (wishlistProducts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md px-4">
          <Heart className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-2xl font-light mb-2">Votre liste de favoris est vide</h2>
          <p className="text-gray-600 mb-6">
            Ajoutez des articles à vos favoris pour les retrouver facilement plus tard
          </p>
          <Link to="/">
            <Button>
              <ShoppingBag className="w-4 h-4 mr-2" />
              Continuer mes achats
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light mb-2">Mes Favoris</h1>
          <p className="text-gray-600">{wishlistProducts.length} article{wishlistProducts.length > 1 ? 's' : ''}</p>
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;

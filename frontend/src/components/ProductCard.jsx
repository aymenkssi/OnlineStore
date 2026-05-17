import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';
import { isInWishlist, addToWishlist, removeFromWishlist } from '../mock/mockData';
import { toast } from '../hooks/use-toast';
import { formatPrice } from '../hooks/usePaymentSettings';
import { tProductName } from '../i18n/entityTranslations';

const ProductCard = ({ product }) => {
  const { i18n } = useTranslation();
  const [isFavorite, setIsFavorite] = useState(false);
  const displayName = tProductName(product, i18n.language);

  useEffect(() => {
    setIsFavorite(isInWishlist(product.id));
  }, [product.id]);

  const toggleFavorite = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (isFavorite) {
      removeFromWishlist(product.id);
      setIsFavorite(false);
      toast({
        title: "Retiré des favoris",
        description: `${displayName} a été retiré de vos favoris`
      });
    } else {
      addToWishlist(product.id);
      setIsFavorite(true);
      toast({
        title: "Ajouté aux favoris",
        description: `${product.name} a été ajouté à vos favoris`
      });
    }
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group block"
    >
      <div className="relative aspect-[3/4] overflow-hidden mb-3">
        <img
          src={product.images[0]}
          alt={displayName}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Badge réduction */}
        {product.discount && (
          <div className="absolute top-3 left-3 bg-black text-white px-2 py-1 text-xs">
            -{product.discount}%
          </div>
        )}
        
        {/* Bouton Favori */}
        <button
          onClick={toggleFavorite}
          className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
            isFavorite 
              ? 'bg-red-500 text-white' 
              : 'bg-white/80 text-gray-700 hover:bg-white'
          }`}
          aria-label={isFavorite ? "Retirer des favoris" : "Ajouter aux favoris"}
        >
          <Heart 
            className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`}
          />
        </button>
      </div>
      
      <div className="space-y-1">
        <p className="text-xs text-gray-500 uppercase">{product.brand}</p>
        <h3 className="text-sm font-medium group-hover:opacity-60 transition-opacity line-clamp-2">
          {displayName}
        </h3>
        <div className="flex items-center space-x-2">
          <span className="font-semibold">{formatPrice(product.price)}</span>
          {product.originalPrice && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.originalPrice)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};

export default ProductCard;

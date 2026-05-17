import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCart, saveCart, getVariantStock, enrichProduct } from '../mock/mockData';
import { productsApi, recommendationsApi } from '../services/api';
import { ShoppingBag, Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { SimilarProducts } from '../components/Recommendations';
import { tProductName, tProductDescription } from '../i18n/entityTranslations';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [selectedColor, setSelectedColor] = useState(null);
  const [selectedSize, setSelectedSize] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantité] = useState(1);
  const [variantStock, setVariantStock] = useState(0);

  const displayName = product ? tProductName(product, i18n.language) : '';
  const displayDescription = product ? tProductDescription(product, i18n.language) : '';

  // Fetch product from API
  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true);
      try {
        const productData = await productsApi.getById(id);
        const enrichedProduct = enrichProduct(productData);
        setProduct(enrichedProduct);
        
        // Track product view for recommendations
        recommendationsApi.trackView(id, productData.category, productData.subcategory);
        
        // Initialize selected color and size
        const availableColor = enrichedProduct.colors?.find(c => c.available) || enrichedProduct.colors?.[0] || null;
        setSelectedColor(availableColor);
        
        const availableSize = enrichedProduct.sizes?.find(s => s.stock > 0) || enrichedProduct.sizes?.[0] || null;
        setSelectedSize(availableSize);
      } catch (error) {
        console.error('Error fetching product:', error);
        setProduct(null);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // Get images for selected color or fallback to product images
  const currentImages = selectedColor?.images?.length > 0 ? selectedColor.images : product?.images || [];

  // Update variant stock when color or size changes
  useEffect(() => {
    if (product && selectedSize) {
      const stock = getVariantStock(product, selectedColor?.name || '', selectedSize.size);
      setVariantStock(stock);
    }
  }, [product, selectedColor, selectedSize]);

  // Reset image index when color changes
  const handleColorChange = (color) => {
    setSelectedColor(color);
    setCurrentImageIndex(0);
    
    // Reset size to first available for this color
    if (product?.variants) {
      const availableSizes = product.variants
        .filter(v => v.color === color.name && v.stock > 0)
        .map(v => ({ size: v.size, stock: v.stock }));
      
      if (availableSizes.length > 0) {
        const firstSize = product.sizes?.find(s => s.size === availableSizes[0].size);
        setSelectedSize(firstSize);
      }
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>Produit non trouvé</p>
        <Button onClick={() => navigate('/')} className="mt-4">Retour</Button>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (variantStock === 0) {
      toast({
        title: "Rupture de stock",
        description: "Cette combinaison n'est pas disponible actuellement.",
        variant: "destructive"
      });
      return;
    }

    const cart = getCart();
    const cartItem = {
      productId: product.id,
      name: displayName,
      brand: product.brand,
      price: product.price,
      image: currentImages[0],
      color: selectedColor?.name || 'Default',
      size: selectedSize?.size || 'Default',
      quantity: quantity,
      sku: product.variants?.find(v => v.color === selectedColor?.name && v.size === selectedSize?.size)?.sku
    };

    const existingItemIndex = cart.findIndex(
      item => item.productId === cartItem.productId && 
              item.color === cartItem.color && 
              item.size === cartItem.size
    );

    if (existingItemIndex >= 0) {
      cart[existingItemIndex].quantity += quantity;
    } else {
      cart.push(cartItem);
    }

    saveCart(cart);
    toast({
      title: t('product.addedToCart'),
      description: `${displayName} a été ajouté à votre panier.`
    });
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length);
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center space-x-2 text-sm">
            <Link to="/" className="hover:opacity-60 transition-opacity">Home</Link>
            <span>/</span>
            <Link to={`/category/${product.category}`} className="hover:opacity-60 transition-opacity">
              {product.category}
            </Link>
            <span>/</span>
            <span className="font-medium">{product.name}</span>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Images */}
          <div>
            <div className="relative aspect-[3/4] mb-4">
              <img
                src={currentImages[currentImageIndex]}
                alt={displayName}
                className="w-full h-full object-cover"
              />
              {currentImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-100 transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            {/* Thumbnails */}
            {currentImages.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {currentImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`aspect-square border-2 transition-colors ${
                      currentImageIndex === index ? 'border-black' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <img src={image} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div>
            <p className="text-sm text-gray-500 uppercase mb-2">{product.brand}</p>
            <h1 className="text-3xl font-light mb-4">{displayName}</h1>
            
            <div className="flex items-center space-x-3 mb-6">
              <span className="text-2xl font-semibold">${product.price}</span>
              {product.originalPrice && (
                <>
                  <span className="text-lg text-gray-400 line-through">${product.originalPrice}</span>
                  <span className="text-sm bg-black text-white px-2 py-1">-{product.discount}%</span>
                </>
              )}
            </div>

            <p className="text-gray-600 mb-6">{displayDescription}</p>

            {/* Color Selection */}
            {product.colors && product.colors.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">{t('product.color')}: {selectedColor?.name}</h3>
                <div className="flex space-x-2">
                  {product.colors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => color.available && handleColorChange(color)}
                      disabled={!color.available}
                      className={`w-12 h-12 rounded-full border-2 transition-all ${
                        selectedColor?.name === color.name
                          ? 'border-black scale-110'
                          : 'border-gray-300 hover:border-gray-500'
                      } ${!color.available ? 'opacity-30 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
                {selectedColor?.images?.length > 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    {selectedColor.images.length} photo{selectedColor.images.length > 1 ? 's' : ''} disponible{selectedColor.images.length > 1 ? 's' : ''} pour cette couleur
                  </p>
                )}
              </div>
            )}

            {/* Size Selection */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="mb-6">
                <h3 className="font-semibold mb-3">{t('product.size')}: {selectedSize?.size}</h3>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                  {product.sizes.map((size) => {
                    const sizeStock = getVariantStock(product, selectedColor?.name || '', size.size);
                    return (
                      <button
                        key={size.size}
                        onClick={() => sizeStock > 0 && setSelectedSize(size)}
                        disabled={sizeStock === 0}
                        className={`py-3 text-sm border transition-colors ${
                          selectedSize?.size === size.size
                            ? 'bg-black text-white border-black'
                            : sizeStock === 0
                            ? 'border-gray-200 text-gray-300 cursor-not-allowed line-through'
                            : 'border-gray-300 hover:border-black'
                        }`}
                      >
                        {size.size}
                      </button>
                    );
                  })}
                </div>
                {variantStock > 0 && variantStock < 5 && (
                  <p className="text-sm text-orange-600 mt-2">
                    Plus que {variantStock} en stock pour cette combinaison
                  </p>
                )}
                {variantStock === 0 && (
                  <p className="text-sm text-red-600 mt-2">
                    Cette combinaison n'est pas disponible
                  </p>
                )}
              </div>
            )}

            {/* Quantité */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">{t('product.quantity')}</h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setQuantité(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-gray-300 hover:border-black transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantité(quantity + 1)}
                  className="w-10 h-10 border border-gray-300 hover:border-black transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3 mb-8">
              <Button
                onClick={handleAddToCart}
                className="w-full py-6 text-base"
                disabled={variantStock === 0}
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                {t('product.addToCart')}
              </Button>
              <Button variant="outline" className="w-full py-6 text-base">
                <Heart className="w-5 h-5 mr-2" />
                {t('header.wishlist')}
              </Button>
            </div>

            {/* Détails du Produit */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="font-semibold mb-3">{t('product.details')}</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {product.details.map((detail, index) => (
                  <li key={`${detail.slice(0, 20)}-${index}`}>• {detail}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Similar Products Recommendations */}
      <SimilarProducts productId={id} limit={4} />
    </div>
  );
};

export default ProductDetail;
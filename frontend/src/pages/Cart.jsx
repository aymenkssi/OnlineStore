import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getCart, saveCart } from '../mock/mockData';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { Button } from '../components/ui/button';
import { formatPrice } from '../hooks/usePaymentSettings';

const Cart = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [cartItems, setCartItems] = React.useState(getCart());

  const updateQuantity = (index, newQuantity) => {
    if (newQuantity < 1) return;
    const updatedCart = [...cartItems];
    updatedCart[index].quantity = newQuantity;
    setCartItems(updatedCart);
    saveCart(updatedCart);
  };

  const removeItem = (index) => {
    const updatedCart = cartItems.filter((_, i) => i !== index);
    setCartItems(updatedCart);
    saveCart(updatedCart);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 400 ? 0 : 20;
  const total = subtotal + shipping;

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-light mb-4">{t('cart.empty')}</h2>
          <p className="text-gray-600 mb-6">{t('cart.continueShopping')}</p>
          <Button onClick={() => navigate('/')} data-testid="continue-shopping-btn">
            {t('cart.continueShopping')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-light mb-8">{t('cart.title')}</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item, index) => (
              <div key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}`} className="bg-white p-6 flex gap-6" data-testid={`cart-item-${index}`}>
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-32 h-40 object-cover"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-xs text-gray-500 uppercase">{item.brand}</p>
                      <h3 className="font-medium mb-1">{item.name}</h3>
                      <p className="text-sm text-gray-600">{t('product.color')} : {item.color}</p>
                      <p className="text-sm text-gray-600">{t('product.size')} : {item.size}</p>
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-gray-400 hover:text-black transition-colors"
                      data-testid={`remove-item-${index}`}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex justify-between items-center mt-4">
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => updateQuantity(index, item.quantity - 1)}
                        className="w-8 h-8 border border-gray-300 hover:border-black transition-colors flex items-center justify-center"
                        data-testid={`decrease-qty-${index}`}
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(index, item.quantity + 1)}
                        className="w-8 h-8 border border-gray-300 hover:border-black transition-colors flex items-center justify-center"
                        data-testid={`increase-qty-${index}`}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white p-6 sticky top-24">
              <h2 className="text-xl font-semibold mb-6">{t('cart.subtotal')}</h2>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span>{t('cart.subtotal')}</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>{t('cart.shipping')}</span>
                  <span>{shipping === 0 ? t('cart.free') : formatPrice(shipping)}</span>
                </div>
                {subtotal < 400 && (
                  <p className="text-xs text-gray-600">
                    {t('cart.spendMoreForFreeShipping', { amount: (400 - subtotal).toFixed(2) })}
                  </p>
                )}
                <div className="border-t border-gray-200 pt-3 flex justify-between font-semibold">
                  <span>{t('cart.total')}</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              <Button 
                className="w-full py-6 text-base mb-3"
                onClick={() => navigate('/checkout')}
                data-testid="checkout-btn"
              >
                {t('cart.proceedToCheckout')}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => navigate('/')}
                data-testid="continue-shopping-btn"
              >
                {t('cart.continueShopping')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;

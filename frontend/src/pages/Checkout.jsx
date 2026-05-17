import React, { useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCart, saveCart, getCurrentUser } from '../mock/mockData';
import { ordersApi } from '../services/api';
import { Button } from '../components/ui/button';
import { toast } from '../hooks/use-toast';
import { usePaymentSettings, getEnabledPaymentMethods, formatPrice, calculateShipping, validateCoupon } from '../hooks/usePaymentSettings';
import { ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import ShippingForm from '../components/checkout/ShippingForm';
import PaymentMethodSelector from '../components/checkout/PaymentMethodSelector';
import OrderSummary from '../components/checkout/OrderSummary';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Checkout = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const cartItems = getCart();
  const currentUser = getCurrentUser();
  const enabledPaymentMethods = getEnabledPaymentMethods();
  const cancelled = searchParams.get('cancelled');

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    enabledPaymentMethods.length > 0 ? enabledPaymentMethods[0].key : 'card'
  );

  const [formData, setFormData] = useState({
    email: currentUser?.email || '', firstName: '', lastName: '', address: '', city: '', postalCode: '', country: 'France', phone: '',
    cardNumber: '', cardExpiry: '', cardCvc: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const isSubmittedRef = useRef(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const baseShipping = calculateShipping(subtotal);

  let discount = 0;
  let shipping = baseShipping;
  if (appliedCoupon) {
    if (appliedCoupon.type === 'percent') discount = subtotal * (appliedCoupon.value / 100);
    else if (appliedCoupon.type === 'shipping') shipping = 0;
    else discount = Math.min(appliedCoupon.value, subtotal);
  }
  const total = subtotal - discount + shipping;

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setValidatingCoupon(true);
    const coupon = await validateCoupon(couponCode);
    setValidatingCoupon(false);
    if (coupon) {
      setAppliedCoupon(coupon);
      const desc = coupon.type === 'shipping' ? 'Livraison gratuite appliquée !' : `Réduction de ${coupon.type === 'percent' ? coupon.value + '%' : formatPrice(coupon.value)} appliquée.`;
      toast({ title: "Coupon appliqué", description: desc });
    } else {
      toast({ title: "Coupon invalide", description: "Ce code promo n'existe pas ou a expiré.", variant: "destructive" });
    }
  };

  const handleRemoveCoupon = () => { setAppliedCoupon(null); setCouponCode(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsProcessing(true);
    try {
      const orderData = {
        items: cartItems.map(item => ({
          product_id: String(item.id || item.productId || ''), name: item.name, price: item.price,
          quantity: item.quantity, color: item.color || null, size: item.size || null, image: item.image || null
        })),
        shipping_address: { firstName: formData.firstName, lastName: formData.lastName, address: formData.address, city: formData.city, postalCode: formData.postalCode, country: formData.country, phone: formData.phone },
        subtotal, shipping_cost: shipping, discount, total,
        coupon_code: appliedCoupon?.code || null, payment_method: selectedPaymentMethod,
        customer_email: formData.email, customer_name: `${formData.firstName} ${formData.lastName}`
      };

      // Create order first
      const order = await ordersApi.create(orderData);

      // For card payments, redirect to Stripe Checkout
      if (selectedPaymentMethod === 'card') {
        try {
          const originUrl = window.location.origin;
          const res = await fetch(`${API_URL}/api/payments/checkout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: order.id, origin_url: originUrl }),
          });
          const data = await res.json();
          if (res.ok && data.url) {
            // Save cart clearing for after payment success
            localStorage.setItem('pending_order_cart_clear', 'true');
            localStorage.setItem('pending_order_id', order.id);
            window.location.href = data.url;
            return;
          } else {
            throw new Error(data.detail || "Erreur Stripe");
          }
        } catch (stripeErr) {
          // If Stripe fails, order was still created - go to confirmation
          console.error('Stripe error:', stripeErr);
          toast({ title: "Paiement Stripe indisponible", description: "Votre commande a été créée. Vous pourrez payer ultérieurement.", variant: "destructive" });
        }
      }

      // For non-card payments (cash on delivery, paypal), go directly to confirmation
      isSubmittedRef.current = true;
      saveCart([]);
      toast({ title: "Commande confirmée !", description: `Commande ${order.order_number || order.id} créée.` });
      setIsProcessing(false);
      navigate(`/order-confirmation?order_id=${order.id}`);
    } catch (error) {
      toast({ title: "Erreur", description: error.message || "Impossible de créer la commande", variant: "destructive" });
      setIsProcessing(false);
    }
  };

  if (cartItems.length === 0 && !isSubmittedRef.current && !cancelled) { navigate('/cart'); return null; }

  return (
    <div className="min-h-screen bg-gray-50" data-testid="checkout-page">
      <div className="container mx-auto px-4 py-8">
        {cancelled && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-3" data-testid="payment-cancelled-banner">
            <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
            <p className="text-sm text-yellow-800">Le paiement a été annulé. Vous pouvez réessayer ou choisir un autre mode de paiement.</p>
          </div>
        )}
        <button onClick={() => navigate('/cart')} className="flex items-center text-gray-600 hover:text-black mb-6 transition-colors" data-testid="back-to-cart-btn">
          <ChevronLeft className="w-4 h-4 mr-1" />Retour au panier
        </button>
        <h1 className="text-3xl font-light mb-8">Finaliser la commande</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6" data-testid="checkout-form">
              <ShippingForm formData={formData} handleInputChange={handleInputChange} />
              <PaymentMethodSelector
                enabledPaymentMethods={enabledPaymentMethods}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
                formData={formData}
                handleInputChange={handleInputChange}
              />
              <Button type="submit" className="w-full py-6 text-base" disabled={isProcessing || enabledPaymentMethods.length === 0} data-testid="place-order-btn">
                {isProcessing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Traitement en cours...</>
                ) : selectedPaymentMethod === 'card' ? (
                  `Payer par carte ${formatPrice(total)}`
                ) : (
                  `Confirmer la commande ${formatPrice(total)}`
                )}
              </Button>
            </form>
          </div>

          <div className="lg:col-span-1">
            <OrderSummary
              cartItems={cartItems} subtotal={subtotal} discount={discount} shipping={shipping} total={total}
              appliedCoupon={appliedCoupon} couponCode={couponCode} setCouponCode={setCouponCode}
              onApplyCoupon={handleApplyCoupon} onRemoveCoupon={handleRemoveCoupon} validatingCoupon={validatingCoupon}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;

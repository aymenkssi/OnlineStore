import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ordersApi } from '../services/api';
import { getCurrentUser, saveCart } from '../mock/mockData';
import { formatPrice } from '../hooks/usePaymentSettings';
import { Button } from '../components/ui/button';
import { CheckCircle, Package, Mail, Truck, Heart, ShoppingBag, Loader2, CreditCard } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const OrderConfirmation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pollingDone, setPollingDone] = useState(false);
  const pollCount = useRef(0);

  const sessionId = searchParams.get('session_id');
  const orderId = searchParams.get('order_id');

  // Poll Stripe payment status
  useEffect(() => {
    if (!sessionId || pollingDone) return;

    const pollPaymentStatus = async () => {
      if (pollCount.current >= 10) {
        setPollingDone(true);
        setPaymentStatus('timeout');
        return;
      }
      pollCount.current += 1;
      try {
        const res = await fetch(`${API_URL}/api/payments/status/${sessionId}`);
        const data = await res.json();
        if (data.payment_status === 'paid') {
          setPaymentStatus('paid');
          setPollingDone(true);
          // Clear cart after successful payment
          saveCart([]);
          localStorage.removeItem('pending_order_cart_clear');
          localStorage.removeItem('pending_order_id');
          // Reload order to get updated status
          if (data.order_id || orderId) {
            try {
              const updatedOrder = await ordersApi.getById(data.order_id || orderId);
              setOrder(updatedOrder);
            } catch (e) { /* keep existing order */ }
          }
          return;
        } else if (data.status === 'expired') {
          setPaymentStatus('expired');
          setPollingDone(true);
          return;
        }
        // Keep polling
        setTimeout(pollPaymentStatus, 2000);
      } catch (err) {
        console.error('Error polling payment:', err);
        setTimeout(pollPaymentStatus, 3000);
      }
    };

    setPaymentStatus('processing');
    pollPaymentStatus();
  }, [sessionId, pollingDone, orderId]);

  // Load order data
  useEffect(() => {
    const loadOrder = async () => {
      try {
        if (orderId) {
          const orderData = await ordersApi.getById(orderId);
          setOrder(orderData);
        } else {
          const currentUser = getCurrentUser();
          if (currentUser?.email) {
            const orders = await ordersApi.getByCustomer(currentUser.email);
            if (orders && orders.length > 0) {
              setOrder(orders[0]);
            }
          }
        }
      } catch (error) {
        console.error('Error loading order:', error);
      }
      setLoading(false);
    };

    // Clear cart if returning from Stripe
    if (localStorage.getItem('pending_order_cart_clear')) {
      saveCart([]);
      localStorage.removeItem('pending_order_cart_clear');
      localStorage.removeItem('pending_order_id');
    }

    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white py-12" data-testid="order-confirmation-page">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Payment Processing Banner */}
        {sessionId && paymentStatus === 'processing' && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3" data-testid="payment-processing-banner">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">Vérification du paiement en cours...</p>
              <p className="text-sm text-blue-700">Veuillez patienter quelques secondes.</p>
            </div>
          </div>
        )}

        {/* Payment Confirmed Banner */}
        {sessionId && paymentStatus === 'paid' && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3" data-testid="payment-success-banner">
            <CreditCard className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-green-900">Paiement confirmé par Stripe !</p>
              <p className="text-sm text-green-700">Un email de confirmation vous a été envoyé.</p>
            </div>
          </div>
        )}

        {/* Success Animation */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-6 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle className="w-14 h-14 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3" data-testid="confirmation-title">
            Merci pour votre commande !
          </h1>
          <p className="text-lg text-gray-600">
            Votre commande a été confirmée avec succès.
          </p>
        </div>

        {/* Order Summary Card */}
        {order && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden mb-8" data-testid="order-summary-card">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-green-100 text-sm">Numéro de commande</p>
                  <p className="text-xl font-bold" data-testid="order-number">{order.order_number || order.id}</p>
                </div>
                <div className="text-right">
                  <p className="text-green-100 text-sm">Total</p>
                  <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Articles commandés</h3>
              <div className="space-y-3 mb-6">
                {(order.items || []).map((item, idx) => (
                  <div key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${idx}`} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                    {item.image && <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded" />}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      {(item.color || item.size) && <p className="text-sm text-gray-500">{[item.color, item.size].filter(Boolean).join(' / ')}</p>}
                      <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                    </div>
                    <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Adresse de livraison</p>
                  </div>
                  <p className="text-sm text-blue-800">
                    {order.customer_name || `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`}<br />
                    {order.shipping_address?.address}<br />
                    {order.shipping_address?.postalCode} {order.shipping_address?.city}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    <p className="font-semibold text-purple-900">Paiement</p>
                  </div>
                  <p className="text-sm text-purple-800">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      (order.payment_status === 'paid' || paymentStatus === 'paid') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {(order.payment_status === 'paid' || paymentStatus === 'paid') ? 'Payé' : 'En attente'}
                    </span>
                  </p>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between text-sm mb-2"><span>Sous-total</span><span>{formatPrice(order.subtotal)}</span></div>
                <div className="flex justify-between text-sm mb-2"><span>Livraison</span><span>{(order.shipping_cost || 0) === 0 ? 'Gratuite' : formatPrice(order.shipping_cost)}</span></div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t"><span>Total payé</span><span className="text-green-600">{formatPrice(order.total)}</span></div>
              </div>
            </div>
          </div>
        )}

        {!order && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 text-center">
            <p className="text-gray-500">Votre commande a été enregistrée avec succès.</p>
          </div>
        )}

        {/* Next Steps */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
          <h3 className="font-semibold text-gray-900 mb-4">Prochaines étapes</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><Mail className="w-5 h-5 text-blue-600" /></div>
              <div><p className="font-medium">Email de confirmation</p><p className="text-sm text-gray-600">Un email récapitulatif a été envoyé à votre adresse avec tous les détails.</p></div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0"><Package className="w-5 h-5 text-purple-600" /></div>
              <div><p className="font-medium">Préparation de votre colis</p><p className="text-sm text-gray-600">Notre équipe prépare votre commande avec le plus grand soin.</p></div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0"><Truck className="w-5 h-5 text-green-600" /></div>
              <div><p className="font-medium">Expédition et suivi</p><p className="text-sm text-gray-600">Vous recevrez un numéro de suivi dès l'expédition de votre colis.</p></div>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 mb-8 text-center">
          <Heart className="w-10 h-10 mx-auto mb-3 text-pink-500" />
          <h3 className="font-semibold text-gray-900 mb-2">Merci de nous faire confiance !</h3>
          <p className="text-gray-600">Votre satisfaction est notre priorité. N'hésitez pas à nous contacter si vous avez la moindre question.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button onClick={() => navigate('/orders')} variant="outline" className="flex-1 py-6" data-testid="track-order-btn">
            <Package className="w-5 h-5 mr-2" />Suivre ma commande
          </Button>
          <Button onClick={() => navigate('/')} className="flex-1 py-6" data-testid="back-to-home-btn">
            <ShoppingBag className="w-5 h-5 mr-2" />Continuer mes achats
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmation;

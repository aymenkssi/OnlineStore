import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ORDER_STATUS } from '../utils/ordersManager';
import { getCurrentUser } from '../mock/mockData';
import { ordersApi, returnsApi } from '../services/api';
import { formatPrice } from '../hooks/usePaymentSettings';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { 
  Package, 
  Truck, 
  CheckCircle, 
  Clock, 
  FileText, 
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
  Calendar,
  CreditCard
} from 'lucide-react';

const MyOrders = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrders = async () => {
      setLoading(true);
      try {
        if (currentUser?.email) {
          const userOrders = await ordersApi.getByCustomer(currentUser.email);
          setOrders(userOrders || []);
          // Returns API - try to load if available
          try {
            const { returnsApi } = await import('../services/api');
            const allReturns = await returnsApi.getAll();
            const returnsItems = allReturns?.items || allReturns || [];
            const userReturns = (Array.isArray(returnsItems) ? returnsItems : []).filter(r => 
              r.customer_email === currentUser.email || r.customer?.email === currentUser.email
            );
            setReturns(userReturns);
          } catch (e) {
            setReturns([]);
          }
        } else {
          setOrders([]);
          setReturns([]);
        }
      } catch (error) {
        console.error('Error loading orders:', error);
        setOrders([]);
        setReturns([]);
      }
      setLoading(false);
    };
    loadOrders();
  }, [currentUser?.email]);

  const getStatusInfo = (status) => {
    switch (status) {
      case ORDER_STATUS.PROCESSING:
        return { label: 'En traitement', color: 'bg-orange-100 text-orange-800', icon: Clock };
      case ORDER_STATUS.PENDING:
        return { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock };
      case ORDER_STATUS.CONFIRMED:
        return { label: 'Confirmée', color: 'bg-blue-100 text-blue-800', icon: CheckCircle };
      case ORDER_STATUS.SHIPPED:
        return { label: 'Expédiée', color: 'bg-purple-100 text-purple-800', icon: Truck };
      case ORDER_STATUS.DELIVERED:
        return { label: 'Livrée', color: 'bg-green-100 text-green-800', icon: Package };
      case ORDER_STATUS.RECEIVED:
        return { label: 'Reçue', color: 'bg-green-100 text-green-800', icon: CheckCircle };
      case ORDER_STATUS.CANCELLED:
        return { label: 'Annulée', color: 'bg-red-100 text-red-800', icon: Clock };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: Package };
    }
  };

  const handleConfirmReception = async (orderId) => {
    try {
      await ordersApi.updateStatus(orderId, 'received');
      const userOrders = await ordersApi.getByCustomer(currentUser.email);
      setOrders(userOrders || []);
      toast({
        title: "Réception confirmée",
        description: "Merci d'avoir confirmé la réception de votre commande."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de confirmer la réception",
        variant: "destructive"
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConfirmShipped = async (returnId) => {
    try {
      await returnsApi.updateStatus(returnId, 'shipped');
      // Refresh returns
      const { returnsApi: rApi } = await import('../services/api');
      const allReturns = await rApi.getAll();
      const returnsItems = allReturns?.items || allReturns || [];
      const userReturns = (Array.isArray(returnsItems) ? returnsItems : []).filter(r =>
        r.customer_email === currentUser.email || r.customer?.email === currentUser.email
      );
      setReturns(userReturns);
      toast({
        title: "Envoi confirmé",
        description: "Votre confirmation d'envoi a été enregistrée. Nous vous tiendrons informé à la réception."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de confirmer l'envoi",
        variant: "destructive"
      });
    }
  };

  const getOrderReturn = (orderId) => {
    return returns.find(r => r.order_id === orderId || r.orderId === orderId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-500">Chargement de vos commandes...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h2 className="text-2xl font-light mb-4">Aucune commande</h2>
          <p className="text-gray-600 mb-6">Vous n'avez pas encore passé de commande</p>
          <Button onClick={() => navigate('/')}>
            Découvrir nos produits
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-light mb-8">Mes Commandes</h1>

        <div className="space-y-4">
          {orders.map((order) => {
            const statusInfo = getStatusInfo(order.status);
            const StatusIcon = statusInfo.icon;
            const isExpanded = expandedOrder === order.id;
            const orderReturn = getOrderReturn(order.id);

            return (
              <Card key={order.id} className="overflow-hidden">
                {/* Order Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-gray-100 rounded overflow-hidden">
                        <img 
                          src={order.items[0]?.image} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="font-semibold">{order.order_number || order.id}</p>
                        <p className="text-sm text-gray-500">
                          {formatDate(order.created_at || order.createdAt)} • {order.items?.length || 0} article(s)
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                        <StatusIcon className="w-4 h-4" />
                        {statusInfo.label}
                      </span>
                      <p className="font-semibold text-lg">{formatPrice(order.total)}</p>
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {/* Order Timeline */}
                    <div className="p-4 bg-gray-50">
                      <h3 className="font-semibold mb-3">Suivi de commande</h3>
                      {(() => {
                        const statusOrder = ['pending', 'processing', 'confirmed', 'shipped', 'delivered', 'received'];
                        const currentIdx = statusOrder.indexOf(order.status);
                        const isConfirmed = currentIdx >= 0;
                        const isShipped = currentIdx >= 3;
                        const isDelivered = currentIdx >= 4;
                        const isReceived = currentIdx >= 5;
                        const isCancelled = order.status === 'cancelled';
                        
                        if (isCancelled) {
                          return (
                            <div className="flex items-center gap-2 text-red-600">
                              <Clock className="w-4 h-4" />
                              <span className="font-medium">Commande annulée</span>
                            </div>
                          );
                        }
                        
                        return (
                          <div className="flex items-center gap-2 text-sm">
                            <div className={`flex items-center gap-1 ${isConfirmed ? 'text-green-600' : 'text-gray-400'}`}>
                              <CheckCircle className="w-4 h-4" />
                              <span>Confirmée</span>
                            </div>
                            <div className={`flex-1 h-0.5 ${isShipped ? 'bg-green-400' : 'bg-gray-300'}`} />
                            <div className={`flex items-center gap-1 ${isShipped ? 'text-green-600' : 'text-gray-400'}`}>
                              <Truck className="w-4 h-4" />
                              <span>Expédiée</span>
                            </div>
                            <div className={`flex-1 h-0.5 ${isDelivered ? 'bg-green-400' : 'bg-gray-300'}`} />
                            <div className={`flex items-center gap-1 ${isDelivered ? 'text-green-600' : 'text-gray-400'}`}>
                              <Package className="w-4 h-4" />
                              <span>Livrée</span>
                            </div>
                            <div className={`flex-1 h-0.5 ${isReceived ? 'bg-green-400' : 'bg-gray-300'}`} />
                            <div className={`flex items-center gap-1 ${isReceived ? 'text-green-600' : 'text-gray-400'}`}>
                              <CheckCircle className="w-4 h-4" />
                              <span>Reçue</span>
                            </div>
                          </div>
                        );
                      })()}
                      {order.trackingNumber && (
                        <p className="mt-2 text-sm text-gray-600">
                          N° de suivi : <span className="font-mono font-medium">{order.trackingNumber}</span>
                        </p>
                      )}
                    </div>

                    {/* Order Items */}
                    <div className="p-4">
                      <h3 className="font-semibold mb-3">Articles commandés</h3>
                      <div className="space-y-3">
                        {order.items.map((item, idx) => (
                          <div key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${idx}`} className="flex gap-4">
                            {item.image ? (
                              <img 
                                src={item.image} 
                                alt={item.name}
                                className="w-20 h-24 object-cover rounded"
                              />
                            ) : (
                              <div className="w-20 h-24 bg-gray-200 rounded flex items-center justify-center">
                                <span className="text-gray-400 text-xs text-center px-1">Pas d'image</span>
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-500">{item.brand}</p>
                              <p className="text-sm text-gray-500">
                                {item.color} / {item.size} × {item.quantity}
                              </p>
                              <p className="font-semibold mt-1">{formatPrice(item.price * item.quantity)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="p-4 bg-gray-50 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <MapPin className="w-4 h-4" />
                          Adresse de livraison
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.shipping_address?.firstName || order.customer?.firstName} {order.shipping_address?.lastName || order.customer?.lastName}<br />
                          {order.shipping_address?.address || order.customer?.address}<br />
                          {order.shipping_address?.postalCode || order.customer?.postalCode} {order.shipping_address?.city || order.customer?.city}<br />
                          {order.shipping_address?.country || order.customer?.country}
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          Paiement
                        </h4>
                        <p className="text-sm text-gray-600">
                          {order.payment_method === 'card' && 'Carte bancaire'}
                          {order.payment_method === 'paypal' && 'PayPal'}
                          {order.payment_method === 'cashOnDelivery' && 'Paiement à la livraison'}
                          {order.paymentMethod === 'card' && !order.payment_method && 'Carte bancaire'}
                          {order.paymentMethod === 'paypal' && !order.payment_method && 'PayPal'}
                          {order.paymentMethod === 'cashOnDelivery' && !order.payment_method && 'Paiement à la livraison'}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          Sous-total: {formatPrice(order.subtotal)}<br />
                          Livraison: {(order.shipping_cost || order.shipping) === 0 ? 'Gratuite' : formatPrice(order.shipping_cost || order.shipping)}<br />
                          <span className="font-semibold">Total: {formatPrice(order.total)}</span>
                        </p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Dates
                        </h4>
                        <p className="text-sm text-gray-600">
                          Commande: {formatDate(order.created_at || order.createdAt)}<br />
                          {order.shippedAt && <>Expédition: {formatDate(order.shippedAt)}<br /></>}
                          {order.deliveredAt && <>Livraison: {formatDate(order.deliveredAt)}<br /></>}
                          {order.receivedAt && <>Confirmation: {formatDate(order.receivedAt)}</>}
                        </p>
                      </div>
                    </div>

                    {/* Return Timeline if return exists */}
                    {orderReturn && (
                      <div className="p-4 bg-orange-50 border-t border-orange-200">
                        <h4 className="font-semibold mb-4 text-orange-800 flex items-center gap-2">
                          <RotateCcw className="w-4 h-4" />
                          Suivi de la demande de retour
                        </h4>
                        {(() => {
                          const returnSteps = [
                            { key: 'pending', label: 'Demande envoyée', icon: Clock },
                            { key: 'approved', label: 'Demande approuvée', icon: CheckCircle },
                            { key: 'shipped', label: 'Article envoyé', icon: Truck },
                            { key: 'received', label: 'Article reçu', icon: Package },
                            { key: 'completed', label: 'Remboursement effectué', icon: CreditCard },
                          ];
                          const statusMap = { pending: 0, approved: 1, shipped: 2, received: 3, completed: 4, refunded: 4 };
                          const currentStep = statusMap[orderReturn.status] ?? 0;
                          const isRejected = orderReturn.status === 'rejected';

                          if (isRejected) {
                            return (
                              <div className="flex items-center gap-3 p-3 bg-red-100 rounded-lg">
                                <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                                  <Clock className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                  <p className="font-medium text-red-800">Demande refusée</p>
                                  {orderReturn.reason && <p className="text-sm text-red-600">Motif : {orderReturn.reason}</p>}
                                </div>
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center gap-0" data-testid="return-timeline">
                              {returnSteps.map((step, idx) => {
                                const isActive = idx <= currentStep;
                                const isCurrent = idx === currentStep;
                                const StepIcon = step.icon;
                                return (
                                  <React.Fragment key={step.key}>
                                    <div className="flex flex-col items-center min-w-[80px]">
                                      <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                                        isCurrent ? 'bg-orange-500 text-white ring-4 ring-orange-200' :
                                        isActive ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                                      }`}>
                                        <StepIcon className="w-4 h-4" />
                                      </div>
                                      <span className={`text-xs mt-1.5 text-center leading-tight ${
                                        isCurrent ? 'font-semibold text-orange-700' :
                                        isActive ? 'font-medium text-green-700' : 'text-gray-400'
                                      }`}>
                                        {step.label}
                                      </span>
                                    </div>
                                    {idx < returnSteps.length - 1 && (
                                      <div className={`flex-1 h-0.5 mt-[-18px] min-w-[20px] ${
                                        idx < currentStep ? 'bg-green-400' : 'bg-gray-200'
                                      }`} />
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </div>
                          );
                        })()}
                        <p className="text-xs text-orange-600 mt-3">
                          Motif du retour : {orderReturn.reason}
                        </p>
                        {/* Button for client to confirm article shipped */}
                        {orderReturn.status === 'approved' && (
                          <div className="mt-4 p-3 bg-orange-100 border border-orange-300 rounded-lg">
                            <p className="text-sm text-orange-800 mb-2">
                              Votre demande a été approuvée. Veuillez envoyer le colis et confirmer l'envoi.
                            </p>
                            <Button
                              size="sm"
                              onClick={() => handleConfirmShipped(orderReturn.id)}
                              data-testid={`confirm-shipped-${orderReturn.id}`}
                            >
                              <Truck className="w-4 h-4 mr-2" />
                              J'ai envoyé l'article
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="p-4 border-t border-gray-200 flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        onClick={() => navigate(`/order/${order.id}/invoice`)}
                        data-testid={`view-invoice-${order.id}`}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Voir la facture
                      </Button>
                      
                      {order.status === ORDER_STATUS.DELIVERED && !order.receivedAt && (
                        <Button
                          onClick={() => handleConfirmReception(order.id)}
                          data-testid={`confirm-reception-${order.id}`}
                        >
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Confirmer la réception
                        </Button>
                      )}
                      
                      {(order.status === ORDER_STATUS.DELIVERED || order.status === ORDER_STATUS.RECEIVED) && (
                        orderReturn ? (
                          <Button
                            variant="outline"
                            disabled
                            className="opacity-50 cursor-not-allowed"
                            data-testid={`request-return-${order.id}-disabled`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Retour déjà demandé
                          </Button>
                        ) : !order.hasReturnRequest && (
                          <Button
                            variant="outline"
                            onClick={() => navigate(`/order/${order.id}/return`)}
                            data-testid={`request-return-${order.id}`}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Demander un retour
                          </Button>
                        )
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MyOrders;

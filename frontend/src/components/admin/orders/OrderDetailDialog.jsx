import React from 'react';
import { formatPrice } from '../../../hooks/usePaymentSettings';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../ui/dialog';
import { toast } from '../../../hooks/use-toast';
import { Clock, CheckCircle, Truck, Package, AlertCircle, MapPin } from 'lucide-react';

const ORDER_STATUS = {
  PROCESSING: 'processing', PENDING: 'pending', CONFIRMED: 'confirmed',
  SHIPPED: 'shipped', DELIVERED: 'delivered', RECEIVED: 'received', CANCELLED: 'cancelled'
};

const getStatusInfo = (status) => {
  const map = {
    processing: { label: 'En traitement', color: 'bg-orange-100 text-orange-800', icon: Clock },
    pending: { label: 'En attente', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    confirmed: { label: 'Confirmee', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
    shipped: { label: 'Expediee', color: 'bg-purple-100 text-purple-800', icon: Truck },
    delivered: { label: 'Livree', color: 'bg-green-100 text-green-800', icon: Package },
    received: { label: 'Recue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    cancelled: { label: 'Annulee', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  };
  return map[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: Package };
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const OrderTimeline = ({ order }) => {
  const allSteps = [
    { key: 'processing', label: 'En traitement', icon: Clock, dateField: 'createdAt' },
    { key: 'confirmed', label: 'Confirmee', icon: CheckCircle, dateField: 'updatedAt' },
    { key: 'shipped', label: 'Expediee', icon: Truck, dateField: 'shippedAt' },
    { key: 'delivered', label: 'Livree', icon: Package, dateField: 'deliveredAt' },
    { key: 'received', label: 'Recue', icon: CheckCircle, dateField: 'receivedAt' }
  ];
  const flow = allSteps.map(s => s.key);
  const currentIdx = flow.indexOf(order.status);
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="p-4 bg-gray-50 rounded-lg" data-testid="order-timeline">
      <h3 className="font-semibold mb-4">Suivi de la commande</h3>
      <div className="flex items-start justify-between">
        {allSteps.map((step, idx) => {
          const StepIcon = step.icon;
          const isPast = !isCancelled && idx < currentIdx;
          const isCurrent = !isCancelled && idx === currentIdx;
          const dateVal = order[step.dateField];
          return (
            <div key={step.key} className="flex flex-col items-center flex-1 relative" data-testid={`timeline-step-${step.key}`}>
              {idx > 0 && <div className={`absolute top-4 right-1/2 w-full h-0.5 -translate-y-1/2 ${isPast || isCurrent ? 'bg-green-500' : 'bg-gray-300'}`} style={{ zIndex: 0 }} />}
              <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center ${
                isCancelled ? 'bg-gray-200 text-gray-400' : isPast ? 'bg-green-500 text-white' : isCurrent ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-200 text-gray-400'
              }`}><StepIcon className="w-4 h-4" /></div>
              <p className={`text-xs mt-2 text-center font-medium ${isCancelled ? 'text-gray-400' : isPast ? 'text-green-700' : isCurrent ? 'text-blue-700' : 'text-gray-400'}`}>{step.label}</p>
              {(isPast || isCurrent) && dateVal && <p className="text-[10px] text-gray-500 mt-0.5">{formatDate(dateVal)}</p>}
            </div>
          );
        })}
      </div>
      {isCancelled && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-red-500" /><span className="text-sm text-red-700 font-medium">Commande annulee</span>
        </div>
      )}
    </div>
  );
};

const OrderDetailDialog = ({ open, onOpenChange, order, trackingNumber, setTrackingNumber, onStatusUpdate, canWrite = true }) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="order-detail-dialog">
      <DialogHeader><DialogTitle>Details de la commande</DialogTitle></DialogHeader>
      {order && (
        <div className="space-y-6">
          <OrderTimeline order={order} />

          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
            <div><p className="text-sm text-gray-500">N de commande</p><p className="font-mono font-semibold" data-testid="order-detail-number">{order.order_number || order.id}</p></div>
            <div><p className="text-sm text-gray-500">N de facture</p><p className="font-mono">{order.invoiceNumber || order.order_number}</p></div>
            <div><p className="text-sm text-gray-500">Date</p><p>{formatDate(order.createdAt || order.created_at)}</p></div>
            <div><p className="text-sm text-gray-500">Statut actuel</p><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusInfo(order.status).color}`}>{getStatusInfo(order.status).label}</span></div>
          </div>

          <div>
            <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4" />Client</h3>
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="font-medium">{order.customer_name || `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`}</p>
              <p className="text-sm text-gray-600">{order.customer_email || order.customer?.email}</p>
              <p className="text-sm text-gray-600">{order.shipping_address?.phone}</p>
              <p className="text-sm text-gray-600 mt-2">
                {order.shipping_address?.address}<br />
                {order.shipping_address?.postalCode} {order.shipping_address?.city}<br />
                {order.shipping_address?.country}
              </p>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Articles</h3>
            <div className="space-y-2">
              {order.items?.map((item, idx) => (
                <div key={`${item.product_id || item.name}-${idx}`} className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  {item.image ? <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded" /> : <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center"><span className="text-gray-400 text-xs text-center px-1">Pas d'image</span></div>}
                  <div className="flex-1"><p className="font-medium">{item.name}</p><p className="text-sm text-gray-500">{item.color} / {item.size}</p><p className="text-sm">Qte: {item.quantity}</p></div>
                  <p className="font-semibold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex justify-between items-center">
              <div><p className="font-semibold">Total de la commande</p><p className="text-sm text-gray-600">{order.paymentMethod === 'card' && 'Carte bancaire'}{order.paymentMethod === 'paypal' && 'PayPal'}{order.paymentMethod === 'cashOnDelivery' && 'Paiement a la livraison'}</p></div>
              <p className="text-2xl font-bold text-green-700" data-testid="order-detail-total">{formatPrice(order.total)}</p>
            </div>
          </div>

          {canWrite && (order.status === 'confirmed' || order.status === 'shipped') && (
            <div>
              <Label htmlFor="tracking">Numero de suivi</Label>
              <div className="flex gap-2 mt-1">
                <Input id="tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Entrez le numero de suivi..." data-testid="tracking-number-input" />
                <Button variant="outline" onClick={() => { onStatusUpdate(order.id, order.status, { trackingNumber }); toast({ title: "N de suivi enregistre" }); }} data-testid="save-tracking-btn">Enregistrer</Button>
              </div>
            </div>
          )}

          {canWrite && onStatusUpdate && (
          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-3">Changer le statut</h3>
            <div className="flex flex-wrap gap-2">
              {order.status === 'processing' && <Button onClick={() => onStatusUpdate(order.id, 'confirmed')} className="bg-blue-600 hover:bg-blue-700" data-testid="confirm-order-btn"><CheckCircle className="w-4 h-4 mr-2" />Confirmer</Button>}
              {order.status === 'confirmed' && <Button onClick={() => onStatusUpdate(order.id, 'shipped', { trackingNumber })} className="bg-purple-600 hover:bg-purple-700" data-testid="ship-order-btn"><Truck className="w-4 h-4 mr-2" />Marquer expediee</Button>}
              {order.status === 'shipped' && <Button onClick={() => onStatusUpdate(order.id, 'delivered')} className="bg-green-600 hover:bg-green-700" data-testid="deliver-order-btn"><Package className="w-4 h-4 mr-2" />Marquer livree</Button>}
              {order.status !== 'cancelled' && order.status !== 'received' && <Button variant="destructive" onClick={() => onStatusUpdate(order.id, 'cancelled')} data-testid="cancel-order-btn">Annuler</Button>}
            </div>
          </div>
          )}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export { OrderDetailDialog, OrderTimeline, getStatusInfo, formatDate, ORDER_STATUS };
export default OrderDetailDialog;

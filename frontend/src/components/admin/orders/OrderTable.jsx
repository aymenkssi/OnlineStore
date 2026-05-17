import React from 'react';
import { formatPrice } from '../../../hooks/usePaymentSettings';
import { Button } from '../../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Eye, AlertCircle, ArrowRight, Trash2 } from 'lucide-react';
import { getStatusInfo, formatDate, ORDER_STATUS } from './OrderDetailDialog';

const getNextStatus = (currentStatus) => {
  const flow = [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING, ORDER_STATUS.CONFIRMED, ORDER_STATUS.SHIPPED, ORDER_STATUS.DELIVERED];
  if (currentStatus === ORDER_STATUS.DELIVERED || currentStatus === ORDER_STATUS.RECEIVED || currentStatus === ORDER_STATUS.CANCELLED) return null;
  const idx = flow.indexOf(currentStatus);
  return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
};

const OrderTable = ({ orders, loading, onStatusUpdate, onOpenDetail, onDeleteOrder, currentPage, totalItems, hasMore, setCurrentPage, itemsPerPage, canWrite = true }) => (
  <Card data-testid="order-table-card">
    <CardHeader><CardTitle>Commandes ({orders.length})</CardTitle></CardHeader>
    <CardContent>
      {orders.length === 0 && !loading ? (
        <div className="text-center py-12"><AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" /><p className="text-gray-500">Aucune commande trouvee</p></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" data-testid="orders-table">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">N Commande</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Client</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Articles</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Total</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const statusInfo = getStatusInfo(order.status);
                const StatusIcon = statusInfo.icon;
                const next = getNextStatus(order.status);
                const nextLabel = next ? getStatusInfo(next).label : null;
                return (
                  <tr key={order.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4"><p className="font-mono text-sm font-medium">{order.order_number || order.id}</p></td>
                    <td className="py-4 px-4">
                      <p className="font-medium text-sm">{order.customer_name || `${order.shipping_address?.firstName || ''} ${order.shipping_address?.lastName || ''}`}</p>
                      <p className="text-xs text-gray-500">{order.customer_email || order.customer?.email}</p>
                    </td>
                    <td className="py-4 px-4"><p className="text-sm">{order.items?.length || 0} article(s)</p></td>
                    <td className="py-4 px-4"><p className="font-semibold">{formatPrice(order.total)}</p></td>
                    <td className="py-4 px-4"><p className="text-sm">{formatDate(order.createdAt || order.created_at)}</p></td>
                    <td className="py-4 px-4"><span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}><StatusIcon className="w-3 h-3" />{statusInfo.label}</span></td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canWrite && next && onStatusUpdate && <Button size="sm" variant="outline" onClick={() => onStatusUpdate(order.id, next)} data-testid={`advance-order-${order.id}`}><ArrowRight className="w-4 h-4 mr-1" />{nextLabel}</Button>}
                        <Button variant="ghost" size="sm" onClick={() => onOpenDetail(order)} data-testid={`view-order-${order.id}`}><Eye className="w-4 h-4" /></Button>
                        {canWrite && onDeleteOrder && <Button variant="ghost" size="sm" onClick={() => onDeleteOrder(order)} className="text-red-600 hover:text-red-700 hover:bg-red-50" data-testid={`delete-order-${order.id}`}><Trash2 className="w-4 h-4" /></Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t" data-testid="order-pagination">
            <p className="text-sm text-gray-600">Affichage {Math.min((currentPage - 1) * itemsPerPage + 1, totalItems)} - {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} commandes</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1 || loading}>Precedent</Button>
              <span className="text-sm text-gray-600 px-2">Page {currentPage} / {Math.ceil(totalItems / itemsPerPage) || 1}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => p + 1)} disabled={!hasMore || loading}>Suivant</Button>
            </div>
          </div>
        </div>
      )}
      {loading && <div className="flex items-center justify-center py-12"><div className="w-8 h-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600" /></div>}
    </CardContent>
  </Card>
);

export default OrderTable;

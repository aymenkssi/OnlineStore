import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ordersApi } from '../../services/api';
import { Input } from '../../components/ui/input';
import { toast } from '../../hooks/use-toast';
import { Search } from 'lucide-react';
import { DeleteConfirmationDialog } from '../../components/DeleteConfirmationDialog';
import OrderStatsCards from '../../components/admin/orders/OrderStatsCards';
import OrderTable from '../../components/admin/orders/OrderTable';
import { OrderDetailDialog } from '../../components/admin/orders/OrderDetailDialog';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const AdminOrders = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('manage_orders');
  const [orders, setOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, pending: 0, processing: 0, confirmed: 0, shipped: 0, delivered: 0, received: 0 });
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const itemsPerPage = 10;

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const statusParam = filterStatus !== 'all' ? filterStatus : undefined;
      const response = await ordersApi.getAll({ limit: itemsPerPage, skip, status: statusParam });
      setOrders(response.items || []);
      setTotalItems(response.total || 0);
      setHasMore(response.has_more || false);
      const statsResponse = await ordersApi.getStats();
      setStats(statsResponse);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les commandes", variant: "destructive" });
    }
    setLoading(false);
  }, [currentPage, filterStatus]);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  const filteredOrders = orders.filter(order => {
    const orderId = order.id || order.order_number || '';
    const customerEmail = order.customer_email || order.customer?.email || '';
    const customerName = order.customer_name || `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`;
    return orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleStatusUpdate = async (orderId, newStatus, additionalData = {}) => {
    try {
      await ordersApi.updateStatus(orderId, newStatus);
      loadOrders();
      toast({ title: "Statut mis a jour", description: "La commande a ete mise a jour avec succes." });
      if (selectedOrder?.id === orderId) setSelectedOrder({ ...selectedOrder, status: newStatus, ...additionalData });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre a jour le statut", variant: "destructive" });
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await ordersApi.delete(orderId);
      toast({ title: "Commande supprimee", description: "La commande a ete definitivement supprimee" });
      setConfirmDelete(null);
      if (isDetailOpen && selectedOrder?.id === orderId) setIsDetailOpen(false);
      loadOrders();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de supprimer la commande", variant: "destructive" });
    }
  };

  const openDetail = (order) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setIsDetailOpen(true);
  };

  return (
    <div data-testid="admin-orders-page">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">{i18nT('adminLayout.orders')}</h1>
          <p className="text-gray-600 mt-2">Suivez et gerez toutes les commandes clients</p>
        </div>
      </div>

      <OrderStatsCards stats={stats} filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input placeholder="Rechercher par n commande, email ou nom..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="order-search-input" />
        </div>
      </div>

      <OrderTable
        orders={filteredOrders}
        loading={loading}
        onStatusUpdate={canWrite ? handleStatusUpdate : undefined}
        onOpenDetail={openDetail}
        onDeleteOrder={canWrite ? (order) => setConfirmDelete(order) : undefined}
        currentPage={currentPage}
        totalItems={totalItems}
        hasMore={hasMore}
        setCurrentPage={setCurrentPage}
        itemsPerPage={itemsPerPage}
        canWrite={canWrite}
      />

      <OrderDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        order={selectedOrder}
        trackingNumber={trackingNumber}
        setTrackingNumber={setTrackingNumber}
        onStatusUpdate={canWrite ? handleStatusUpdate : undefined}
        canWrite={canWrite}
      />

      <DeleteConfirmationDialog
        open={!!confirmDelete}
        onOpenChange={() => setConfirmDelete(null)}
        onConfirm={() => handleDeleteOrder(confirmDelete?.id)}
        title="la commande"
        itemInfo={confirmDelete ? { "Numero": confirmDelete.order_number, "Client": confirmDelete.customer_email, "Montant": `${confirmDelete.total}EUR` } : {}}
        warningMessage="Cette commande sera definitivement supprimee de la base de donnees"
      />
    </div>
  );
};

export default AdminOrders;

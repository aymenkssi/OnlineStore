import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { customersApi, ordersApi, usersApi } from '../../services/api';
import { getCurrentUser } from '../../mock/mockData';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { Search, Trash2, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import CustomerStatsCards from '../../components/admin/customers/CustomerStatsCards';
import CustomerTable from '../../components/admin/customers/CustomerTable';
import CustomerDetailDialog from '../../components/admin/customers/CustomerDetailDialog';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const AdminCustomers = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('view_customers');
  const [customers, setCustomers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteCodeError, setDeleteCodeError] = useState('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalCustomers: 0, newThisMonth: 0, avgOrderValue: 0, totalRevenue: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const user = getCurrentUser();
        if (user?.email) {
          const prefs = await usersApi.getPreferences(user.email);
          setItemsPerPage(prefs.customersItemsPerPage || 25);
        }
        setPreferencesLoaded(true);
      } catch (error) {
        const saved = localStorage.getItem('customersItemsPerPage');
        setItemsPerPage(saved ? parseInt(saved) : 25);
        setPreferencesLoaded(true);
      }
    };
    loadPreferences();
  }, []);

  const loadCustomers = useCallback(async () => {
    if (!preferencesLoaded) return;
    setLoading(true);
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const response = await customersApi.getAll({ limit: itemsPerPage, skip });
      setCustomers(response.items || []);
      setTotalItems(response.total || 0);
      setHasMore(response.has_more || false);
      const statsResponse = await customersApi.getStats();
      setStats({
        totalCustomers: statsResponse.total_customers || 0,
        newThisMonth: statsResponse.new_this_month || 0,
        avgOrderValue: statsResponse.average_basket || 0,
        totalRevenue: statsResponse.total_revenue_from_customers || 0
      });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de charger les clients", variant: "destructive" });
    }
    setLoading(false);
  }, [currentPage, itemsPerPage, preferencesLoaded]);

  const handleItemsPerPageChange = async (newValue) => {
    setItemsPerPage(newValue);
    setCurrentPage(1);
    try {
      const user = getCurrentUser();
      if (user?.email) {
        await usersApi.updatePreferences(user.email, { customersItemsPerPage: newValue });
        toast({ title: "Preference sauvegardee", description: `Affichage de ${newValue} clients par page` });
      }
      localStorage.setItem('customersItemsPerPage', newValue.toString());
    } catch (error) {
      localStorage.setItem('customersItemsPerPage', newValue.toString());
    }
  };

  const handleRecalculateStats = async () => {
    try {
      setLoading(true);
      const result = await customersApi.recalculateStats();
      toast({ title: "Statistiques recalculees", description: `${result.stats.customers_updated} clients mis a jour - CA: ${result.stats.total_revenue}EUR` });
      await loadCustomers();
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de recalculer les statistiques", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadCustomers(); }, [loadCustomers]);

  const handleDelete = async (customer) => {
    if (!deleteCode.trim()) { setDeleteCodeError('Veuillez saisir le code de confirmation'); return; }
    try {
      await customersApi.delete(customer.id, deleteCode.trim());
      loadCustomers();
      setConfirmAction(null);
      setIsDetailOpen(false);
      setDeleteCode('');
      setDeleteCodeError('');
      toast({ title: "Client supprime", description: `${customer.name || 'Le client'} a ete supprime.` });
    } catch (error) {
      setDeleteCodeError('Code de securite incorrect');
    }
  };

  const openCustomerDetail = async (customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
    try {
      const profileData = await usersApi.getProfile(customer.email);
      const customerOrders = await ordersApi.getByCustomer(customer.email);
      const orders = customerOrders || [];
      const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
      setSelectedCustomer({
        ...customer, ...profileData, orders,
        total_spent: totalSpent, totalSpent, orderCount: orders.length, total_orders: orders.length,
        firstOrderDate: orders.length > 0 ? orders[orders.length - 1]?.created_at : customer.created_at
      });
    } catch (error) {
      try {
        const customerOrders = await ordersApi.getByCustomer(customer.email);
        const orders = customerOrders || [];
        const totalSpent = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        setSelectedCustomer({ ...customer, orders, total_spent: totalSpent, totalSpent, orderCount: orders.length, total_orders: orders.length });
      } catch (e) { /* keep current data */ }
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const s = searchTerm.toLowerCase();
    return (customer.email || '').toLowerCase().includes(s) || (customer.name || '').toLowerCase().includes(s) || (customer.phone || '').toLowerCase().includes(s);
  });

  return (
    <div data-testid="admin-customers-page">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">{i18nT('adminLayout.customers')}</h1>
          <p className="text-gray-600 mt-2">Statistiques et informations sur vos clients</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRecalculateStats} disabled={loading} className="flex items-center gap-2" data-testid="recalculate-stats-btn">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Recalculer les stats
        </Button>
      </div>

      <CustomerStatsCards stats={stats} />

      <div className="mb-6 flex gap-4 items-end">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input placeholder="Rechercher par nom, email ou telephone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" data-testid="customer-search-input" />
        </div>
        <div className="flex items-center gap-2">
          <label htmlFor="itemsPerPage" className="text-sm text-gray-600 whitespace-nowrap">Afficher :</label>
          <select id="itemsPerPage" value={itemsPerPage} onChange={(e) => handleItemsPerPageChange(parseInt(e.target.value))} className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" data-testid="items-per-page-select">
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          </select>
          <span className="text-sm text-gray-600">clients</span>
        </div>
      </div>

      <CustomerTable customers={filteredCustomers} onViewCustomer={openCustomerDetail} onDeleteCustomer={canWrite ? (c) => setConfirmAction({ type: 'delete', customer: c }) : undefined} canWrite={canWrite} />

      {totalItems > itemsPerPage && (
        <div className="mt-6 flex items-center justify-between" data-testid="customer-pagination">
          <div className="text-sm text-gray-600">Affichage {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} clients</div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" />Precedent
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.ceil(totalItems / itemsPerPage) }, (_, i) => i + 1).map(page => (
                <Button key={page} variant={currentPage === page ? "default" : "outline"} size="sm" onClick={() => setCurrentPage(page)} className="w-10">{page}</Button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(Math.ceil(totalItems / itemsPerPage), p + 1))} disabled={!hasMore} className="flex items-center gap-1">
              Suivant<ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      <CustomerDetailDialog open={isDetailOpen} onOpenChange={setIsDetailOpen} customer={selectedCustomer} onDelete={canWrite ? (c) => setConfirmAction({ type: 'delete', customer: c }) : undefined} canWrite={canWrite} />

      <Dialog open={!!confirmAction} onOpenChange={() => { setConfirmAction(null); setDeleteCode(''); setDeleteCodeError(''); }}>
        <DialogContent data-testid="delete-customer-dialog">
          <DialogHeader>
            <DialogTitle>{confirmAction?.type === 'delete' && 'Supprimer ce client ?'}</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-4">
            {confirmAction?.type === 'delete' && (<>Le client <strong>{confirmAction?.customer?.name}</strong> sera supprime definitivement. Cette action est irreversible.</>)}
          </p>
          {confirmAction?.type === 'delete' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700" htmlFor="delete-code">Code de confirmation</label>
              <Input id="delete-code" data-testid="delete-confirmation-code-input" type="password" placeholder="Saisissez le code de securite" value={deleteCode} onChange={(e) => { setDeleteCode(e.target.value); setDeleteCodeError(''); }} className={deleteCodeError ? 'border-red-500' : ''} />
              {deleteCodeError && <p className="text-sm text-red-600" data-testid="delete-code-error">{deleteCodeError}</p>}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfirmAction(null); setDeleteCode(''); setDeleteCodeError(''); }} data-testid="confirm-cancel-btn">Annuler</Button>
            {confirmAction?.type === 'delete' && (
              <Button variant="destructive" onClick={() => handleDelete(confirmAction.customer)} data-testid="confirm-delete-btn">
                <Trash2 className="w-4 h-4 mr-2" />Supprimer
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomers;

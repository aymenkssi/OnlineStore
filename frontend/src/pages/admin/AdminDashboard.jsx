import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Package, FolderTree, ShoppingCart, DollarSign, Users, RotateCcw, Ticket, TrendingDown, AlertTriangle, CheckCircle, Clock, XCircle, RefreshCw, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Dialog, DialogContent } from '../../components/ui/dialog';
import { formatPrice } from '../../hooks/usePaymentSettings';
import { statsApi, settingsApi } from '../../services/api';
import { toast } from '../../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [showRecalcDialog, setShowRecalcDialog] = useState(false);
  const [securityCode, setSecurityCode] = useState('');
  const [codeError, setCodeError] = useState('');

  const fetchStats = async () => {
      try {
        // Stats/dashboard requires admin auth -> include Bearer token from localStorage
        const token = (() => { try { return localStorage.getItem('access_token'); } catch { return null; } })();
        const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};

        const safeJson = async (p, fallback) => {
          try {
            const res = await p;
            if (!res.ok) return fallback;
            return await res.json();
          } catch {
            return fallback;
          }
        };

        const [dashboardData, inventoryData, products, inventoryDetail] = await Promise.all([
          safeJson(fetch(`${API_URL}/api/stats/dashboard`, { headers: authHeaders }), {}),
          safeJson(fetch(`${API_URL}/api/products/stats/inventory`), {}),
          safeJson(fetch(`${API_URL}/api/products/`), []),
          safeJson(fetch(`${API_URL}/api/products/stats/inventory-detail`), { totals: {} }),
        ]);

        const productsList = Array.isArray(products) ? products : (products?.products || []);

        const lowStock = productsList.filter(p => {
          const stock = p.sizes?.reduce((sum, s) => sum + (s.stock || 0), 0) || 0;
          return stock < 10 && stock > 0;
        });

        setStats({
          totalProducts: dashboardData.products?.total || 0,
          totalCategories: dashboardData.categories?.total || 0,
          initialStock: inventoryDetail.totals?.initial_stock || 0,
          currentStock: inventoryDetail.totals?.current_stock || 0,
          inventoryValue: inventoryData.inventory_value || 0,
          totalOrders: dashboardData.orders?.total || 0,
          grossRevenue: dashboardData.orders?.total_revenue || 0,
          netRevenue: dashboardData.orders?.net_revenue || 0,
          totalCustomers: dashboardData.customers?.total || 0,
          activeCoupons: dashboardData.coupons?.active || 0,
          returns: {
            total: dashboardData.returns?.total || 0,
            pending: dashboardData.returns?.pending || 0,
            approved: dashboardData.returns?.approved || 0,
            completed: dashboardData.returns?.completed || 0,
            totalRefunded: dashboardData.returns?.total_refunded || 0,
            pendingRefundAmount: dashboardData.returns?.pending_refund_amount || 0,
            returnRate: dashboardData.returns?.return_rate || 0
          },
          lowStockProducts: lowStock
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        // Ensure dashboard renders (with zeros) even if a fetch unexpectedly throws
        setStats(prev => prev || {
          totalProducts: 0, totalCategories: 0, initialStock: 0, currentStock: 0,
          inventoryValue: 0, totalOrders: 0, grossRevenue: 0, netRevenue: 0,
          totalCustomers: 0, activeCoupons: 0,
          returns: { total: 0, pending: 0, approved: 0, completed: 0, totalRefunded: 0, pendingRefundAmount: 0, returnRate: 0 },
          lowStockProducts: []
        });
      } finally {
        setLoading(false);
      }
  };

  const handleRecalculate = async () => {
    setCodeError('');
    try {
      const result = await settingsApi.verifyDeletionCode(securityCode);
      if (!result.valid) {
        setCodeError('Code incorrect. Veuillez réessayer.');
        return;
      }
      
      setRecalculating(true);
      setShowRecalcDialog(false);
      setSecurityCode('');
      
      await statsApi.recalculateDashboard();
      await fetchStats();
      
      toast({
        title: "Statistiques recalculées",
        description: "Tous les chiffres du dashboard ont été recalculés avec succès."
      });
    } catch (err) {
      toast({
        title: "Erreur",
        description: "Impossible de recalculer les statistiques",
        variant: "destructive"
      });
    } finally {
      setRecalculating(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  const mainCards = [
    { title: t('adminDashboard.totalProducts'), value: stats.totalProducts, icon: Package },
    { title: t('adminDashboard.totalCategories'), value: stats.totalCategories, icon: FolderTree },
    { title: t('adminDashboard.initialStock'), value: stats.initialStock, icon: ShoppingCart, subtitle: t('adminDashboard.initialStock') },
    { title: t('adminDashboard.currentStock'), value: stats.currentStock, icon: ShoppingCart, highlight: stats.currentStock < stats.initialStock, highlightColor: 'blue', subtitle: '' },
    { title: t('adminDashboard.inventoryValue'), value: formatPrice(stats.inventoryValue), icon: DollarSign },
  ];

  const revenueCards = [
    { title: t('adminDashboard.totalOrders'), value: stats.totalOrders, icon: ShoppingCart },
    { title: t('adminDashboard.grossRevenue'), value: formatPrice(stats.grossRevenue), icon: DollarSign, subtitle: '' },
    {
      title: t('adminDashboard.netRevenue'),
      value: formatPrice(stats.netRevenue),
      icon: DollarSign,
      subtitle: '',
      highlight: true
    },
    { title: t('adminDashboard.totalCustomers'), value: stats.totalCustomers, icon: Users },
  ];

  return (
    <div data-testid="admin-dashboard">
      <h1 className="text-3xl font-light mb-8">{t('adminDashboard.title')}</h1>

      {/* Recalculate Button */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          onClick={() => { setShowRecalcDialog(true); setCodeError(''); setSecurityCode(''); }}
          disabled={recalculating}
          data-testid="recalculate-stats-btn"
        >
          {recalculating ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          {recalculating ? 'Recalcul en cours...' : 'Recalculer les chiffres'}
        </Button>
      </div>

      {/* Recalculate Confirmation Dialog */}
      <Dialog open={showRecalcDialog} onOpenChange={setShowRecalcDialog}>
        <DialogContent className="max-w-md">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Recalculer les statistiques</h3>
                <p className="text-sm text-gray-600">Cette action va recalculer tous les chiffres du dashboard</p>
              </div>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Les statistiques clients, retours et revenus seront recalculés à partir des données brutes des commandes.
              </p>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium">
                <Lock className="w-4 h-4" />
                Code de confirmation requis
              </label>
              <Input
                type="password"
                placeholder="Entrez le code de confirmation"
                value={securityCode}
                onChange={(e) => { setSecurityCode(e.target.value); setCodeError(''); }}
                onKeyPress={(e) => { if (e.key === 'Enter' && securityCode) handleRecalculate(); }}
                className={codeError ? 'border-red-500' : ''}
                autoFocus
                data-testid="recalc-security-code-input"
              />
              {codeError && (
                <p className="text-sm text-red-600">{codeError}</p>
              )}
            </div>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setShowRecalcDialog(false)}>
                Annuler
              </Button>
              <Button 
                onClick={handleRecalculate} 
                disabled={!securityCode}
                data-testid="confirm-recalculate-btn"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recalculer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inventory Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
        {mainCards.map((stat, i) => (
          <Card 
            key={stat.title || `main-card-${i}`} 
            className={stat.highlight ? 'border-blue-200 bg-blue-50' : ''}
            data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.highlight ? 'text-blue-600' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.highlight ? 'text-blue-700' : ''}`}>{stat.value}</div>
              {stat.subtitle && <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Revenue Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {revenueCards.map((stat, i) => (
          <Card key={stat.title || `revenue-card-${i}`} className={stat.highlight ? 'border-green-200 bg-green-50' : ''} data-testid={`stat-card-${stat.title.toLowerCase().replace(/\s+/g, '-')}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.highlight ? 'text-green-600' : 'text-gray-400'}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stat.highlight ? 'text-green-700' : ''}`}>{stat.value}</div>
              {stat.subtitle && <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Returns Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Returns Overview */}
        <Card className="lg:col-span-2" data-testid="returns-overview-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RotateCcw className="h-5 w-5" />
              Retours Produits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg" data-testid="returns-total">
                <div className="text-2xl font-bold">{stats.returns.total}</div>
                <div className="text-xs text-gray-500 mt-1">Total Retours</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg" data-testid="returns-pending">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="h-4 w-4 text-amber-600" />
                  <span className="text-2xl font-bold text-amber-700">{stats.returns.pending}</span>
                </div>
                <div className="text-xs text-amber-600 mt-1">En Attente</div>
              </div>
              <div className="text-center p-3 bg-blue-50 rounded-lg" data-testid="returns-approved">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                  <span className="text-2xl font-bold text-blue-700">{stats.returns.approved}</span>
                </div>
                <div className="text-xs text-blue-600 mt-1">Approuvés</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg" data-testid="returns-completed">
                <div className="flex items-center justify-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold text-green-700">{stats.returns.completed}</span>
                </div>
                <div className="text-xs text-green-600 mt-1">Remboursés</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Returns Financial Impact */}
        <Card data-testid="returns-financial-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              Impact Financier
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-testid="returns-refunded-amount">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remboursé</span>
                <span className="text-lg font-bold text-red-600">
                  -{formatPrice(stats.returns.totalRefunded)}
                </span>
              </div>
            </div>
            <div data-testid="returns-pending-refund-amount">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Remb. en attente</span>
                <span className="text-lg font-bold text-amber-600">
                  {formatPrice(stats.returns.pendingRefundAmount)}
                </span>
              </div>
            </div>
            <div className="border-t pt-3" data-testid="returns-rate">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Taux de retour</span>
                <span className={`text-lg font-bold ${stats.returns.returnRate > 10 ? 'text-red-600' : stats.returns.returnRate > 5 ? 'text-amber-600' : 'text-green-600'}`}>
                  {stats.returns.returnRate}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div 
                  className={`h-2 rounded-full ${stats.returns.returnRate > 10 ? 'bg-red-500' : stats.returns.returnRate > 5 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(stats.returns.returnRate, 100)}%` }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts.length > 0 && (
        <Card data-testid="low-stock-alert">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Alerte Stock Faible
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.lowStockProducts.map((product) => {
                const totalStock = product.sizes?.reduce((sum, size) => sum + (size.stock || 0), 0) || 0;
                return (
                  <div key={product.id} className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <img
                        src={product.images?.[0] || '/placeholder.png'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-gray-500">{product.brand}</p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-orange-600">
                      {totalStock} articles restants
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminDashboard;

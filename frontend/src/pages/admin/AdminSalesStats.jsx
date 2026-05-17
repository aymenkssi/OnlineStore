import React, { useState, useEffect, useRef } from 'react';
import { formatPrice } from '../../hooks/usePaymentSettings';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { 
  ShoppingCart, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Download,
  Filter,
  Loader2,
  FileSpreadsheet
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminSalesStats = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  // Filter states
  const [period, setPeriod] = useState('month');
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  const [showCustomFilter, setShowCustomFilter] = useState(false);

  // Fetch stats from API
  const fetchStats = async (selectedPeriod, startDate, endDate) => {
    setLoading(true);
    try {
      let url = `${API_URL}/api/stats/sales?period=${selectedPeriod}`;
      if (startDate && endDate) {
        url = `${API_URL}/api/stats/sales?start_date=${startDate}&end_date=${endDate}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats(period, null, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    setShowCustomFilter(newPeriod === 'custom');
    if (newPeriod !== 'custom') {
      fetchStats(newPeriod, null, null);
    }
  };

  const handleCustomFilter = () => {
    if (customDateRange.start && customDateRange.end) {
      fetchStats('custom', customDateRange.start, customDateRange.end);
    }
  };

  // Export functions
  const handleExportSales = async () => {
    setExporting(true);
    try {
      let url = `${API_URL}/api/stats/sales/export`;
      if (customDateRange.start && customDateRange.end) {
        url += `?start_date=${customDateRange.start}&end_date=${customDateRange.end}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `ventes_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        toast({ title: "Export réussi", description: "Le fichier CSV a été téléchargé" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter les données", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleExportProducts = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/products/export`);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `produits_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        toast({ title: "Export réussi", description: "Le fichier CSV des produits a été téléchargé" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter les produits", variant: "destructive" });
    }
  };

  const handleExportCustomers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/stats/customers/export`);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `clients_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(downloadUrl);
        toast({ title: "Export réussi", description: "Le fichier CSV des clients a été téléchargé" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible d'exporter les clients", variant: "destructive" });
    }
  };

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const totals = stats?.totals || { orders: 0, revenue: 0, average_order_value: 0 };
  const dailySales = stats?.daily_sales || [];
  const topProducts = stats?.top_products || [];
  const categorySales = stats?.category_sales || [];
  const salesByStatus = stats?.sales_by_status || [];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Statistiques des Ventes</h1>
          <p className="text-gray-600 mt-2">
            Aperçu des performances de votre boutique
            {stats?.date_range && (
              <span className="ml-2 text-sm">
                ({new Date(stats.date_range.start).toLocaleDateString('fr-FR')} - {new Date(stats.date_range.end).toLocaleDateString('fr-FR')})
              </span>
            )}
          </p>
        </div>
        
        {/* Export Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportSales} disabled={exporting}>
            {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
            Exporter ventes
          </Button>
          <Button variant="outline" onClick={handleExportProducts}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Produits
          </Button>
          <Button variant="outline" onClick={handleExportCustomers}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />
            Clients
          </Button>
        </div>
      </div>

      {/* Period Filter */}
      <Card className="mb-6">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium">Période :</span>
            </div>
            
            <div className="flex gap-2">
              {[
                { value: 'week', label: '7 jours' },
                { value: 'month', label: '30 jours' },
                { value: 'quarter', label: '90 jours' },
                { value: 'year', label: '1 an' },
                { value: 'custom', label: 'Personnalisé' }
              ].map((p) => (
                <Button
                  key={p.value}
                  variant={period === p.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handlePeriodChange(p.value)}
                >
                  {p.label}
                </Button>
              ))}
            </div>
            
            {showCustomFilter && (
              <div className="flex items-center gap-2 ml-4">
                <Input
                  type="date"
                  value={customDateRange.start}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, start: e.target.value })}
                  className="w-40"
                />
                <span>à</span>
                <Input
                  type="date"
                  value={customDateRange.end}
                  onChange={(e) => setCustomDateRange({ ...customDateRange, end: e.target.value })}
                  className="w-40"
                />
                <Button onClick={handleCustomFilter} size="sm">
                  Appliquer
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Chiffre d'affaires</p>
                <p className="text-3xl font-bold mt-1">{formatPrice(totals.revenue)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Profit</p>
                <p className="text-2xl font-bold mt-1">{formatPrice(totals.profit || 0)}</p>
                {totals.revenue > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {((totals.profit / totals.revenue) * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                <ArrowUpRight className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Commandes</p>
                <p className="text-3xl font-bold mt-1">{totals.orders}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Panier moyen</p>
                <p className="text-3xl font-bold mt-1">{formatPrice(totals.average_order_value)}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Période</p>
                <p className="text-xl font-bold mt-1">
                  {period === 'week' && '7 derniers jours'}
                  {period === 'month' && '30 derniers jours'}
                  {period === 'quarter' && '90 derniers jours'}
                  {period === 'year' && '365 derniers jours'}
                  {period === 'custom' && 'Personnalisé'}
                </p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Calendar className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Daily Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Évolution des ventes</CardTitle>
            <CardDescription>Chiffre d'affaires par jour</CardDescription>
          </CardHeader>
          <CardContent>
            {dailySales.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune donnée pour cette période</p>
            ) : (
              <div className="h-64 flex items-end justify-between gap-1 overflow-x-auto">
                {dailySales.slice(-30).map((day, idx) => {
                  const maxRevenue = Math.max(...dailySales.map(d => d.revenue));
                  const height = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                  
                  return (
                    <div key={day._id || idx} className="flex-1 min-w-[20px] flex flex-col items-center">
                      <div className="w-full flex flex-col items-center">
                        <div 
                          className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t transition-all hover:from-blue-700 hover:to-blue-500"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${day._id}: ${formatPrice(day.revenue)} (${day.orders_count} cmd)`}
                        />
                      </div>
                      {dailySales.length <= 10 && (
                        <span className="text-xs text-gray-500 mt-1 rotate-45">{day._id.slice(5)}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Commandes par statut</CardTitle>
            <CardDescription>Répartition sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            {salesByStatus.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune commande</p>
            ) : (
              <div className="space-y-4">
                {salesByStatus.map((status, idx) => {
                  const total = salesByStatus.reduce((sum, s) => sum + s.count, 0);
                  const percentage = total > 0 ? (status.count / total * 100).toFixed(0) : 0;
                  
                  const colors = {
                    pending: 'bg-yellow-500',
                    confirmed: 'bg-blue-500',
                    shipped: 'bg-purple-500',
                    delivered: 'bg-green-500',
                    cancelled: 'bg-red-500'
                  };
                  
                  const labels = {
                    pending: 'En attente',
                    confirmed: 'Confirmées',
                    shipped: 'Expédiées',
                    delivered: 'Livrées',
                    cancelled: 'Annulées'
                  };
                  
                  return (
                    <div key={status._id || idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm">{labels[status._id] || status._id}</span>
                        <span className="text-sm font-medium">{status.count} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${colors[status._id] || 'bg-gray-500'} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle>Produits les plus vendus</CardTitle>
            <CardDescription>Top 10 sur la période</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune vente enregistrée</p>
            ) : (
              <div className="space-y-4">
                {topProducts.map((product, idx) => (
                  <div key={product._id || product.name || idx} className="flex items-center gap-4">
                    <span className="text-lg font-bold text-gray-400 w-6">{idx + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name || product._id}</p>
                      <p className="text-sm text-gray-500">{product.quantity_sold} vendus</p>
                    </div>
                    <p className="font-semibold">{formatPrice(product.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Ventes par catégorie</CardTitle>
            <CardDescription>Répartition du chiffre d'affaires</CardDescription>
          </CardHeader>
          <CardContent>
            {categorySales.length === 0 ? (
              <p className="text-center text-gray-500 py-8">Aucune donnée</p>
            ) : (
              <div className="space-y-4">
                {categorySales.map((cat, idx) => {
                  const totalRevenue = categorySales.reduce((sum, c) => sum + c.revenue, 0);
                  const percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue * 100).toFixed(0) : 0;
                  
                  const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500'];
                  
                  return (
                    <div key={cat._id || idx}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm capitalize">{cat._id || 'Non catégorisé'}</span>
                        <span className="text-sm font-medium">{formatPrice(cat.revenue)} ({percentage}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`${colors[idx % colors.length]} h-2 rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminSalesStats;

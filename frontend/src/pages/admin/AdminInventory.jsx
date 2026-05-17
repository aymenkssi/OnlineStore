import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Package, 
  AlertTriangle, 
  TrendingDown,
  RefreshCw,
  Download,
  ShoppingBag,
  ArrowDown,
  Settings2,
  Filter
} from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { categoriesApi } from '../../services/api';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminInventory = () => {
  const canWrite = useCanWrite('manage_inventory');
  const [inventoryData, setInventoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState({});
  const [filterLowStock, setFilterLowStock] = useState(false);
  const [categories, setCategories] = useState([]);

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubSubcategory, setFilterSubSubcategory] = useState('all');

  // Global threshold
  const [globalThreshold, setGlobalThreshold] = useState(10);
  const [editingGlobalThreshold, setEditingGlobalThreshold] = useState(false);
  const [tempGlobalThreshold, setTempGlobalThreshold] = useState(10);

  useEffect(() => {
    fetchInventory();
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/products/stats/inventory-detail`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setInventoryData(data);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({ title: "Erreur", description: "Impossible de charger l'inventaire.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateThreshold = async (productId, newThreshold) => {
    try {
      const response = await fetch(`${API_URL}/api/products/${productId}/threshold`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lowStockThreshold: parseInt(newThreshold) })
      });
      if (!response.ok) throw new Error('Failed');
      
      setInventoryData(prev => ({
        ...prev,
        products: prev.products.map(p => 
          p.id === productId ? { ...p, lowStockThreshold: parseInt(newThreshold) } : p
        )
      }));
      
      setEditingThreshold(prev => { const u = { ...prev }; delete u[productId]; return u; });
      toast({ title: "Seuil mis à jour", description: `Seuil d'alerte défini à ${newThreshold}` });
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le seuil", variant: "destructive" });
    }
  };

  const applyGlobalThreshold = async () => {
    const val = parseInt(tempGlobalThreshold);
    if (isNaN(val) || val < 0) return;
    
    setGlobalThreshold(val);
    setEditingGlobalThreshold(false);

    // Apply to all products
    if (!inventoryData) return;
    let updated = 0;
    for (const product of inventoryData.products) {
      try {
        await fetch(`${API_URL}/api/products/${product.id}/threshold`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ lowStockThreshold: val })
        });
        updated++;
      } catch (e) {
        console.error('AdminInventory: failed to update threshold for product', product.id, e);
      }
    }

    setInventoryData(prev => ({
      ...prev,
      products: prev.products.map(p => ({ ...p, lowStockThreshold: val }))
    }));

    toast({ title: "Seuil global appliqué", description: `Seuil de ${val} appliqué à ${updated} produits` });
  };

  const exportInventory = () => {
    if (!inventoryData) return;
    const csv = [['Produit', 'Marque', 'Catégorie', 'Sous-sous-catégorie', 'Variant', 'SKU', 'Stock Initial', 'Vendus', 'Stock Actuel', 'Prix achat', 'Valeur actuelle']];
    
    inventoryData.products.forEach(product => {
      product.variants.forEach(v => {
        const value = (product.purchasePrice || 0) * v.current_stock;
        csv.push([product.name, product.brand, product.category || '', product.subSubcategory || '', v.label, v.sku, v.initial_stock, v.sold, v.current_stock, product.purchasePrice || 0, value.toFixed(2)]);
      });
    });
    
    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventaire_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast({ title: "Export réussi", description: "Fichier CSV téléchargé" });
  };

  // Build sub-subcategory options based on selected category
  const subSubcategoryOptions = useMemo(() => {
    if (!categories.length) return [];
    const options = [];
    const seen = new Set();
    const relevantCats = filterCategory === 'all' ? categories : categories.filter(c => c.slug === filterCategory);
    relevantCats.forEach(cat => {
      (cat.subcategories || []).forEach(sub => {
        (sub.children || []).forEach(child => {
          const uniqueKey = `${cat.slug}__${sub.slug}__${child.slug}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            options.push({ 
              key: uniqueKey, 
              value: child.slug, 
              label: filterCategory !== 'all' 
                ? `${sub.name} > ${child.name}` 
                : `${cat.name} > ${sub.name} > ${child.name}` 
            });
          }
        });
      });
    });
    return options;
  }, [categories, filterCategory]);

  if (loading || !inventoryData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  const { products, totals } = inventoryData;

  // Apply filters
  const filteredProducts = products.filter(p => {
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterSubSubcategory !== 'all' && p.subSubcategory !== filterSubSubcategory) return false;
    if (filterLowStock) {
      const t = p.lowStockThreshold || globalThreshold;
      return p.variants.some(v => v.current_stock <= t && v.current_stock > 0);
    }
    return true;
  });

  const lowStockCount = products.reduce((sum, p) => {
    const t = p.lowStockThreshold || globalThreshold;
    return sum + p.variants.filter(v => v.current_stock <= t && v.current_stock > 0).length;
  }, 0);

  const outOfStockCount = products.reduce((sum, p) => {
    return sum + p.variants.filter(v => v.current_stock === 0).length;
  }, 0);

  const activeFilters = (filterCategory !== 'all' ? 1 : 0) + (filterSubSubcategory !== 'all' ? 1 : 0) + (filterLowStock ? 1 : 0);

  return (
    <div data-testid="admin-inventory">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Gestion d'Inventaire</h1>
          <p className="text-gray-600 mt-2">Suivi du stock initial, ventes et stock actuel par variant</p>
        </div>
        <div className="flex gap-2 items-center">
          {/* Global Threshold */}
          {editingGlobalThreshold ? (
            <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-3 py-1.5">
              <Settings2 className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600 whitespace-nowrap">Seuil global :</span>
              <Input
                type="number"
                min="0"
                value={tempGlobalThreshold}
                onChange={(e) => setTempGlobalThreshold(e.target.value)}
                className="w-20 h-8 text-sm"
                onKeyDown={(e) => { if (e.key === 'Enter') applyGlobalThreshold(); }}
                autoFocus
                data-testid="global-threshold-input"
              />
              <Button size="sm" className="h-8" onClick={applyGlobalThreshold} data-testid="apply-global-threshold-btn">
                Appliquer
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingGlobalThreshold(false)}>
                Annuler
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              onClick={() => { setTempGlobalThreshold(globalThreshold); setEditingGlobalThreshold(true); }}
              data-testid="edit-global-threshold-btn"
            >
              <Settings2 className="w-4 h-4 mr-2" />
              Seuil : {globalThreshold}
            </Button>
          )}
          <Button variant="outline" onClick={exportInventory} data-testid="export-csv-btn">
            <Download className="w-4 h-4 mr-2" />
            Exporter CSV
          </Button>
          <Button onClick={fetchInventory} data-testid="refresh-btn">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card data-testid="stat-stock-initial">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Initial</p>
                <p className="text-3xl font-bold mt-1">{totals.initial_stock}</p>
              </div>
              <Package className="w-10 h-10 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-total-sold">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Vendus</p>
                <p className="text-3xl font-bold mt-1 text-indigo-600">{totals.total_sold}</p>
              </div>
              <ShoppingBag className="w-10 h-10 text-indigo-500" />
            </div>
          </CardContent>
        </Card>

        <Card data-testid="stat-stock-current">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Actuel</p>
                <p className="text-3xl font-bold mt-1 text-green-600">{totals.current_stock}</p>
              </div>
              <Package className="w-10 h-10 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Stock Faible</p>
                <p className="text-3xl font-bold mt-1 text-orange-600">{lowStockCount}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Rupture</p>
                <p className="text-3xl font-bold mt-1 text-red-600">{outOfStockCount}</p>
              </div>
              <TrendingDown className="w-10 h-10 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex items-center gap-2 mr-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filtres</span>
            {activeFilters > 0 && (
              <span className="bg-black text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilters}
              </span>
            )}
          </div>

          {/* Category filter */}
          <div className="min-w-[180px]">
            <Label className="text-xs text-gray-500 mb-1 block">Catégorie</Label>
            <select 
              value={filterCategory} 
              onChange={(e) => { setFilterCategory(e.target.value); setFilterSubSubcategory('all'); }}
              className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="filter-category-select"
            >
              <option value="all">Toutes les catégories</option>
              {categories.map(cat => (
                <option key={cat.slug} value={cat.slug}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* Sub-subcategory filter */}
          <div className="min-w-[280px]">
            <Label className="text-xs text-gray-500 mb-1 block">Sous-sous-catégorie</Label>
            <select 
              value={filterSubSubcategory} 
              onChange={(e) => setFilterSubSubcategory(e.target.value)}
              className="flex h-9 w-full items-center rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              data-testid="filter-subsubcategory-select"
            >
              <option value="all">Toutes les sous-sous-catégories</option>
              {subSubcategoryOptions.map(opt => (
                <option key={opt.key} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Low stock filter */}
          <Button
            variant={filterLowStock ? "default" : "outline"}
            onClick={() => setFilterLowStock(!filterLowStock)}
            className="h-10"
            data-testid="filter-low-stock-btn"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Stock faible
          </Button>

          {/* Clear filters */}
          {activeFilters > 0 && (
            <Button
              variant="ghost"
              onClick={() => { setFilterCategory('all'); setFilterSubSubcategory('all'); setFilterLowStock(false); }}
              className="h-10 text-gray-500"
              data-testid="clear-filters-btn"
            >
              Effacer les filtres
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            {filteredProducts.length} / {products.length} produits
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="space-y-4">
        {filteredProducts.map(product => {
          const threshold = product.lowStockThreshold || globalThreshold;
          const hasLowStock = product.variants.some(v => v.current_stock <= threshold && v.current_stock > 0);
          
          return (
            <Card key={product.id} className={hasLowStock ? 'border-orange-300' : ''} data-testid={`product-card-${product.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex gap-4">
                    <img
                      src={product.image || '/placeholder.png'}
                      alt={product.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                    <div>
                      <CardTitle className="text-lg">{product.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-gray-500">{product.brand}</p>
                        {product.category && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{product.category}</span>
                        )}
                        {product.subSubcategory && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">{product.subSubcategory}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-6 mt-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Initial</span>
                          <span className="text-sm font-bold" data-testid={`initial-stock-${product.id}`}>{product.initial_stock}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ArrowDown className="w-3 h-3 text-indigo-500" />
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Vendus</span>
                          <span className="text-sm font-bold text-indigo-600" data-testid={`sold-${product.id}`}>{product.total_sold}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-gray-500 uppercase tracking-wide">Actuel</span>
                          <span className="text-sm font-bold text-green-600" data-testid={`current-stock-${product.id}`}>{product.current_stock}</span>
                        </div>
                        <div className="border-l pl-4 flex items-center gap-2">
                          <span className="text-sm text-gray-600">Seuil:</span>
                          {editingThreshold[product.id] !== undefined ? (
                            <div className="flex items-center gap-2">
                              <Input
                                type="number" min="0"
                                value={editingThreshold[product.id]}
                                onChange={(e) => setEditingThreshold({ ...editingThreshold, [product.id]: e.target.value })}
                                className="w-20 h-8 text-sm"
                              />
                              <Button size="sm" onClick={() => updateThreshold(product.id, editingThreshold[product.id])} className="h-8 px-3">OK</Button>
                              <Button size="sm" variant="outline" onClick={() => { const u = { ...editingThreshold }; delete u[product.id]; setEditingThreshold(u); }} className="h-8 px-3">X</Button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setEditingThreshold({ ...editingThreshold, [product.id]: threshold })}
                              className="text-sm font-semibold text-blue-600 hover:underline"
                            >
                              {threshold} (modifier)
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {hasLowStock && (
                    <div className="flex items-center gap-2 bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm">
                      <AlertTriangle className="w-4 h-4" />
                      Stock Faible
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full" data-testid={`variant-table-${product.id}`}>
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Variant</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">SKU</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Stock Initial</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Vendus</th>
                        <th className="px-4 py-2 text-right text-sm font-medium text-gray-600">Stock Actuel</th>
                        <th className="px-4 py-2 text-left text-sm font-medium text-gray-600">Etat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((variant, idx) => {
                        const isLow = variant.current_stock <= threshold && variant.current_stock > 0;
                        return (
                          <tr key={variant.sku || `${variant.label}-${idx}`} className={isLow ? 'bg-orange-50' : variant.current_stock === 0 ? 'bg-red-50' : ''}>
                            <td className="px-4 py-2 text-sm">{variant.label}</td>
                            <td className="px-4 py-2 text-sm text-gray-500">{variant.sku}</td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-gray-700" data-testid={`variant-initial-${idx}`}>
                              {variant.initial_stock}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-medium text-indigo-600" data-testid={`variant-sold-${idx}`}>
                              {variant.sold > 0 ? `-${variant.sold}` : '0'}
                            </td>
                            <td className="px-4 py-2 text-sm text-right font-bold" data-testid={`variant-current-${idx}`}>
                              <span className={variant.current_stock === 0 ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-green-600'}>
                                {variant.current_stock}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm">
                              {variant.current_stock === 0 ? (
                                <span className="text-red-600 font-medium">Rupture</span>
                              ) : isLow ? (
                                <span className="text-orange-600 font-medium">Faible</span>
                              ) : (
                                <span className="text-green-600 font-medium">OK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredProducts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">
              {activeFilters > 0 ? 'Aucun produit ne correspond aux filtres sélectionnés' : 'Aucun produit trouvé'}
            </p>
            {activeFilters > 0 && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => { setFilterCategory('all'); setFilterSubSubcategory('all'); setFilterLowStock(false); }}
              >
                Effacer les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminInventory;

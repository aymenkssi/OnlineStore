import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isProductOnPromotion, calculateDiscount } from '../../mock/mockData';
import { productsApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { formatPrice } from '../../hooks/usePaymentSettings';
import { 
  Tag, 
  Calendar, 
  Percent, 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

const AdminPromotions = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('manage_promotions');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all, active, scheduled, expired
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [promotionData, setPromotionData] = useState({
    originalPrice: '',
    price: '',
    startDate: '',
    endDate: ''
  });

  // Fetch products from API
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const data = await productsApi.getAll();
        setProducts(data);
      } catch (error) {
        console.error('Error fetching products:', error);
        toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // Get all products with promotion info
  const getPromotionProducts = () => {
    return products.map(product => {
      const now = new Date();
      const hasPromotion = product.originalPrice && product.originalPrice > product.price;
      
      let status = 'none';
      if (hasPromotion) {
        const startDate = product.promotionStartDate ? new Date(product.promotionStartDate) : null;
        const endDate = product.promotionEndDate ? new Date(product.promotionEndDate) : null;
        
        if (startDate && now < startDate) {
          status = 'scheduled';
        } else if (endDate && now > endDate) {
          status = 'expired';
        } else {
          status = 'active';
        }
      }
      
      return {
        ...product,
        promotionStatus: status,
        discount: calculateDiscount(product.originalPrice, product.price),
        isOnPromotion: isProductOnPromotion(product)
      };
    }).filter(p => p.promotionStatus !== 'none');
  };

  const promotionProducts = getPromotionProducts();

  // Filter products
  const filteredProducts = promotionProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || product.promotionStatus === filterStatus;
    return matchesSearch && matchesStatus;
  });

  // Stats
  const stats = {
    total: promotionProducts.length,
    active: promotionProducts.filter(p => p.promotionStatus === 'active').length,
    scheduled: promotionProducts.filter(p => p.promotionStatus === 'scheduled').length,
    expired: promotionProducts.filter(p => p.promotionStatus === 'expired').length
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'scheduled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Clock className="w-3 h-3" />
            Programmée
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircle className="w-3 h-3" />
            Expirée
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Non définie';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleEditPromotion = (product) => {
    setSelectedProduct(product);
    setPromotionData({
      originalPrice: product.originalPrice || '',
      price: product.price || '',
      startDate: product.promotionStartDate || '',
      endDate: product.promotionEndDate || ''
    });
    setIsDialogOpen(true);
  };

  const handleSavePromotion = async () => {
    try {
      // Update the product with new promotion data
      const updatedProduct = {
        ...selectedProduct,
        originalPrice: Number(promotionData.originalPrice) || undefined,
        price: Number(promotionData.price),
        promotionStartDate: promotionData.startDate || undefined,
        promotionEndDate: promotionData.endDate || undefined
      };
      
      await productsApi.update(selectedProduct.id, updatedProduct);
      
      // Refresh products list
      const data = await productsApi.getAll();
      setProducts(data);
      
      toast({
        title: "Promotion mise à jour",
        description: `La promotion pour "${selectedProduct.name}" a été modifiée.`
      });
      setIsDialogOpen(false);
      setSelectedProduct(null);
    } catch (error) {
      console.error('Error saving promotion:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la promotion",
        variant: "destructive"
      });
    }
  };

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">{i18nT('adminLayout.promotions')}</h1>
          <p className="text-gray-600 mt-2">Gérez les promotions et réductions sur vos produits</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-500">Chargement des promotions...</span>
        </div>
      ) : (
        <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'all' ? 'ring-2 ring-black' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Promotions</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Tag className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'active' ? 'ring-2 ring-green-500' : ''}`}
          onClick={() => setFilterStatus('active')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Actives</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'scheduled' ? 'ring-2 ring-blue-500' : ''}`}
          onClick={() => setFilterStatus('scheduled')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Programmées</p>
                <p className="text-3xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Clock className="w-10 h-10 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={`cursor-pointer transition-all ${filterStatus === 'expired' ? 'ring-2 ring-gray-500' : ''}`}
          onClick={() => setFilterStatus('expired')}
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expirées</p>
                <p className="text-3xl font-bold text-gray-600">{stats.expired}</p>
              </div>
              <XCircle className="w-10 h-10 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            placeholder="Rechercher un produit..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Produits en Promotion ({filteredProducts.length})</CardTitle>
          <CardDescription>
            Liste de tous les produits avec une réduction de prix
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun produit en promotion trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Produit</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Prix Original</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Prix Promo</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Réduction</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date Début</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Date Fin</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-600">Statut</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={product.images?.[0] || '/placeholder.jpg'}
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div>
                            <p className="font-medium text-sm">{product.name}</p>
                            <p className="text-xs text-gray-500">{product.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-gray-500 line-through">
                          {formatPrice(product.originalPrice)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-green-600">
                          {formatPrice(product.price)}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          <Percent className="w-3 h-3" />
                          -{product.discount}%
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(product.promotionStartDate)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(product.promotionEndDate)}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        {getStatusBadge(product.promotionStatus)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {canWrite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPromotion(product)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Promotion Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Modifier la Promotion</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4 py-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <img
                  src={selectedProduct.images?.[0]}
                  alt={selectedProduct.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <p className="font-medium">{selectedProduct.name}</p>
                  <p className="text-sm text-gray-500">{selectedProduct.brand}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="originalPrice">Prix Original</Label>
                  <Input
                    id="originalPrice"
                    type="number"
                    value={promotionData.originalPrice}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, originalPrice: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Prix Promo</Label>
                  <Input
                    id="price"
                    type="number"
                    value={promotionData.price}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, price: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>

              {promotionData.originalPrice && promotionData.price && (
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-sm text-gray-600">Réduction</p>
                  <p className="text-2xl font-bold text-green-600">
                    -{calculateDiscount(Number(promotionData.originalPrice), Number(promotionData.price))}%
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Date de début</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={promotionData.startDate}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Date de fin</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={promotionData.endDate}
                    onChange={(e) => setPromotionData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Annuler
            </Button>
            {canWrite && (
            <Button onClick={handleSavePromotion}>
              Enregistrer
            </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </>
      )}
    </div>
  );
};

export default AdminPromotions;

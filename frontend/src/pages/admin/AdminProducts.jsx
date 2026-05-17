import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { productsApi, categoriesApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Plus, Edit, Trash2, Search, Loader2, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import ProductForm from '../../components/admin/ProductForm';
import { toast } from '../../hooks/use-toast';
import { DeleteConfirmationDialog } from '../../components/DeleteConfirmationDialog';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const AdminProduits = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('manage_products');
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    productId: null,
    productName: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filters
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterSubSubcategory, setFilterSubSubcategory] = useState('all');

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await productsApi.getAll();
      const data = Array.isArray(response) ? response : (response.items || []);
      setAllProducts(data);
    } catch (error) {
      console.error('Error loading products:', error);
      toast({ title: "Erreur", description: "Impossible de charger les produits", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  const loadCategories = useCallback(async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, [loadProducts, loadCategories]);

  const filteredProduits = allProducts.filter(p => {
    const matchesSearch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    if (!matchesSearch) return false;
    if (filterCategory !== 'all' && p.category !== filterCategory) return false;
    if (filterSubSubcategory !== 'all' && p.subSubcategory !== filterSubSubcategory) return false;
    return true;
  });

  // Build sub-subcategory options
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

  const activeFilters = (filterCategory !== 'all' ? 1 : 0) + (filterSubSubcategory !== 'all' ? 1 : 0);

  // Client-side pagination
  const totalItems = filteredProduits.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedProducts = filteredProduits.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCategory, filterSubSubcategory]);

  const handleEdit = (product) => {
    setSelectedProduct(product);
    setIsDialogOpen(true);
  };

  const handleDelete = async (code) => {
    try {
      await productsApi.delete(deleteDialog.productId, code);
      toast({
        title: 'Produit supprimé',
        description: `${deleteDialog.productName} a été supprimé avec succès`,
      });
      loadProducts();
      setDeleteDialog({ isOpen: false, productId: null, productName: '' });
    } catch (error) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de supprimer le produit',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const openDeleteDialog = (product) => {
    setDeleteDialog({
      isOpen: true,
      productId: product.id,
      productName: product.name
    });
  };

  const handleDialogClose = (refresh = false) => {
    setIsDialogOpen(false);
    setSelectedProduct(null);
    if (refresh) {
      loadProducts();
    }
  };

  // Calculate total stock for a product (variants first, then sizes)
  const getTotalStock = (product) => {
    // Use variants (color × size) if available
    if (product.variants && product.variants.length > 0) {
      return product.variants.reduce((sum, v) => sum + (v.stock || 0), 0);
    }
    // Fallback to sizes
    if (product.sizes && Array.isArray(product.sizes)) {
      return product.sizes.reduce((sum, s) => sum + (s.stock || 0), 0);
    }
    // Final fallback
    return product.stock || 0;
  };

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-light">{i18nT('adminLayout.products')}</h1>
        {canWrite && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen} modal={false}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedProduct(null)} data-testid="add-product-btn">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter un produit
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedProduct ? 'Modifier le produit' : 'Ajouter un nouveau produit'}</DialogTitle>
            </DialogHeader>
            <ProductForm 
              product={selectedProduct} 
              categories={categories}
              onClose={handleDialogClose} 
            />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <Input
            type="text"
            placeholder="Rechercher des produits..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
            data-testid="search-products"
          />
        </div>
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

          {activeFilters > 0 && (
            <Button
              variant="ghost"
              onClick={() => { setFilterCategory('all'); setFilterSubSubcategory('all'); }}
              className="h-10 text-gray-500"
              data-testid="clear-filters-btn"
            >
              Effacer les filtres
            </Button>
          )}

          <div className="ml-auto text-sm text-gray-500">
            {filteredProduits.length} / {allProducts.length} produits
          </div>
        </div>
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Image</TableHead>
                <TableHead>Nom</TableHead>
                <TableHead>Marque</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Prix</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                    Aucun produit trouvé
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <img
                        src={product.images?.[0] || 'https://via.placeholder.com/50'}
                        alt={product.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>{product.brand}</TableCell>
                    <TableCell>{product.category}</TableCell>
                    <TableCell>${product.price}</TableCell>
                    <TableCell>{getTotalStock(product)}</TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                      <>
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(product)} data-testid={`edit-product-${product.id}`}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openDeleteDialog(product)} data-testid={`delete-product-${product.id}`}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                      </>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Affichage {totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalItems)} sur {totalItems} produits
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                data-testid="prev-page-btn"
              >
                <ChevronLeft className="w-4 h-4" />
                Précédent
              </Button>
              <span className="text-sm text-gray-600 px-2">
                Page {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
                data-testid="next-page-btn"
              >
                Suivant
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open, productId: null, productName: '' })}
        onConfirm={handleDelete}
        title={deleteDialog.productName}
        itemInfo={{ name: deleteDialog.productName }}
        warningMessage="Ce produit sera définitivement supprimé"
      />

    </div>
  );
};

export default AdminProduits;

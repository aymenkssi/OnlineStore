import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { categoriesApi } from '../../services/api';
import { Button } from '../../components/ui/button';
import { Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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
import CategoryForm from '../../components/admin/CategoryForm';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const AdminCategories = () => {
  const { t: i18nT } = useTranslation();
  const canWrite = useCanWrite('manage_categories');
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      toast({ title: "Erreur", description: "Impossible de charger les catégories", variant: "destructive" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleEdit = (category) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer cette catégorie? Cela affectera tous les produits associés.')) {
      try {
        await categoriesApi.delete(id);
        toast({ title: "Succès", description: "Catégorie supprimée" });
        loadCategories();
      } catch (error) {
        toast({ title: "Erreur", description: "Impossible de supprimer la catégorie", variant: "destructive" });
      }
    }
  };

  const handleDialogClose = (refresh = false) => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
    if (refresh) {
      loadCategories();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <h1 className="text-3xl font-light">{i18nT('adminLayout.categories')}</h1>
        {canWrite && (
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setSelectedCategory(null)} data-testid="add-category-btn">
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une catégorie
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedCategory ? 'Modifier la catégorie' : 'Ajouter une nouvelle catégorie'}</DialogTitle>
            </DialogHeader>
            <CategoryForm category={selectedCategory} onClose={handleDialogClose} />
          </DialogContent>
        </Dialog>
        )}
      </div>

      {/* Categories Table */}
      <div className="space-y-8">
        {categories.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucune catégorie trouvée
          </div>
        ) : (
          categories.map((category) => (
            <div key={category.id || category.slug} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-4">
                  <img
                    src={category.image || 'https://via.placeholder.com/80'}
                    alt={category.name}
                    className="w-20 h-20 object-cover rounded"
                  />
                  <div>
                    <h2 className="text-xl font-semibold">{category.name}</h2>
                    <p className="text-sm text-gray-500">Slug: {category.slug}</p>
                    <p className="text-sm text-gray-500">
                      {category.subcategories?.length || 0} sous-catégories
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {canWrite && (
                  <>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(category)} data-testid={`edit-category-${category.slug}`}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(category.id || category.slug)} data-testid={`delete-category-${category.slug}`}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                  </>
                  )}
                </div>
              </div>

              {/* Subcategories */}
              {category.subcategories && category.subcategories.length > 0 && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Sous-sous-catégories</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {category.subcategories.map((sub, idx) => (
                      <TableRow key={sub.slug || sub.id || idx}>
                        <TableCell className="font-medium">{sub.name}</TableCell>
                        <TableCell className="text-gray-500">{sub.slug}</TableCell>
                        <TableCell>
                          {sub.children && sub.children.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {sub.children.map((child, cidx) => (
                                <span key={child.slug || child.id || cidx} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">
                                  {child.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">Aucune</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCategories;

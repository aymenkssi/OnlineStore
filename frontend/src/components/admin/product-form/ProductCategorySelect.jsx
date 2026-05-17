import React from 'react';
import { Label } from '../../ui/label';

const ProductCategorySelect = ({ formData, setFormData, categories, loading }) => {
  const selectedCategory = categories.find(c => c.slug === formData.category);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="category">Categorie</Label>
        {loading ? (
          <div className="h-9 flex items-center text-sm text-gray-500">Chargement des categories...</div>
        ) : (
          <select
            id="category"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="category-select"
          >
            <option value="">Selectionner une categorie</option>
            {categories.map((cat) => (
              <option key={cat.id || cat.slug} value={cat.slug}>{cat.name}</option>
            ))}
          </select>
        )}
      </div>
      <div>
        <Label htmlFor="subcategory">Sous-categorie</Label>
        <select
          id="subcategory"
          value={formData.subcategory}
          onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
          disabled={!formData.category}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50 disabled:cursor-not-allowed"
          data-testid="subcategory-select"
        >
          <option value="">Selectionner une sous-categorie</option>
          {selectedCategory?.subcategories?.map((sub, idx) => (
            <option key={sub.id || idx} value={sub.slug}>{sub.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default ProductCategorySelect;

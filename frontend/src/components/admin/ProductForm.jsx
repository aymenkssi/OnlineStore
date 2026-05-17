import React, { useState, useEffect } from 'react';
import { productsApi, categoriesApi, attributesApi } from '../../services/api';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { toast } from '../../hooks/use-toast';
import { Loader2 } from 'lucide-react';
import ImageUploader from '../ImageUploader';
import ProductBasicInfo from './product-form/ProductBasicInfo';
import ProductCategorySelect from './product-form/ProductCategorySelect';
import ProductColorPicker from './product-form/ProductColorPicker';
import ProductSizePicker from './product-form/ProductSizePicker';
import ProductVariants from './product-form/ProductVariants';
import ProductDetails from './product-form/ProductDetails';

const ProduitForm = ({ product, categories: propCategories, onClose }) => {
  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState(propCategories || []);
  const [availableColors, setAvailableColors] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const attrsData = await attributesApi.getAll();
        setBrands(attrsData.brands?.length > 0 ? attrsData.brands : ['Marque de Luxe', 'Cuir Premium', 'Sport Luxe', 'Excellence Sur Mesure']);
        setAvailableColors(attrsData.colors?.length > 0 ? attrsData.colors : [
          { name: 'Noir', hex: '#000000' }, { name: 'Blanc', hex: '#FFFFFF' },
          { name: 'Rouge', hex: '#FF0000' }, { name: 'Bleu', hex: '#0000FF' }
        ]);
        setAvailableSizes(attrsData.sizes?.length > 0 ? attrsData.sizes : ['XS', 'S', 'M', 'L', 'XL', 'XXL']);
        if (!propCategories || propCategories.length === 0) {
          const catsData = await categoriesApi.getAll();
          setCategories(Array.isArray(catsData) ? catsData : []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
      setLoading(false);
    };
    loadData();
  }, [propCategories]);

  const [formData, setFormData] = useState({
    name: product?.name || '',
    brand: product?.brand || '',
    price: product?.price || '',
    purchasePrice: product?.purchasePrice || '',
    originalPrice: product?.originalPrice || '',
    promotionStartDate: product?.promotionStartDate || '',
    promotionEndDate: product?.promotionEndDate || '',
    category: product?.category || '',
    subcategory: product?.subcategory || '',
    description: product?.description || '',
    translations: product?.translations || {
      fr: { name: product?.name || '', description: product?.description || '' },
      en: { name: '', description: '' },
      ar: { name: '', description: '' },
    },
    images: product?.images?.filter(img => img && img.trim() !== '') || [],
    colors: product?.colors?.filter(c => c.name && c.name.trim() !== '') || [],
    sizes: product?.sizes?.filter(s => s.size && s.size.trim() !== '') || [],
    variants: product?.variants || [],
    details: product?.details?.filter(d => d && d.trim() !== '') || [],
    newArrival: product?.newArrival || false,
    featured: product?.featured || false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const discount = formData.originalPrice
        ? Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)
        : undefined;
      const productData = {
        ...formData,
        price: parseFloat(formData.price),
        purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        promotionStartDate: formData.promotionStartDate || undefined,
        promotionEndDate: formData.promotionEndDate || undefined,
        discount,
        images: formData.images.filter(img => img.trim() !== ''),
        colors: formData.colors.filter(c => c.name && c.hex),
        sizes: formData.sizes.filter(s => s.size),
        variants: formData.variants.filter(v => v.color && v.size),
        details: formData.details.filter(d => d.trim() !== '')
      };
      if (product) {
        await productsApi.update(product.id, productData);
        toast({ title: "Produit mis a jour avec succes" });
      } else {
        await productsApi.create(productData);
        toast({ title: "Produit ajoute avec succes" });
      }
      onClose(true);
    } catch (error) {
      console.error('Error saving product:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder le produit", variant: "destructive" });
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="product-form">
      <ProductBasicInfo formData={formData} setFormData={setFormData} brands={brands} loading={loading} />
      <ProductCategorySelect formData={formData} setFormData={setFormData} categories={categories} loading={loading} />

      <div>
        <Label>Images du Produit</Label>
        <ImageUploader images={formData.images} onChange={(newImages) => setFormData({ ...formData, images: newImages })} maxImages={5} />
      </div>

      <ProductColorPicker formData={formData} setFormData={setFormData} availableColors={availableColors} />
      <ProductSizePicker formData={formData} setFormData={setFormData} availableSizes={availableSizes} />
      <ProductVariants formData={formData} setFormData={setFormData} />
      <ProductDetails formData={formData} setFormData={setFormData} />

      <div className="flex gap-4">
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={formData.newArrival} onChange={(e) => setFormData({ ...formData, newArrival: e.target.checked })} />
          <span className="text-sm">Nouvelle arrivee</span>
        </label>
        <label className="flex items-center space-x-2">
          <input type="checkbox" checked={formData.featured} onChange={(e) => setFormData({ ...formData, featured: e.target.checked })} />
          <span className="text-sm">En vedette</span>
        </label>
      </div>

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={submitting} data-testid="product-form-cancel">Annuler</Button>
        <Button type="submit" disabled={submitting || loading} data-testid="product-form-submit">
          {submitting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{product ? 'Mise a jour...' : 'Creation...'}</>
          ) : (
            <>{product ? 'Mettre a jour' : 'Creer'} Produit</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default ProduitForm;

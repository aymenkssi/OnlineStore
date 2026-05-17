import React from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Plus, X } from 'lucide-react';
import { toast } from '../../../hooks/use-toast';

const ProductVariants = ({ formData, setFormData }) => {
  const validColors = formData.colors.filter(c => c.name && c.name.trim() !== '' && c.hex);
  const validSizes = formData.sizes.filter(s => s.size && s.size.trim() !== '');
  const canGenerate = validColors.length > 0 && validSizes.length > 0;

  const addVariant = () => {
    setFormData({ ...formData, variants: [...formData.variants, { color: '', size: '', stock: 0, sku: '' }] });
  };

  const removeVariant = (index) => {
    setFormData({ ...formData, variants: formData.variants.filter((_, i) => i !== index) });
  };

  const updateVariant = (index, field, value) => {
    const newVariants = [...formData.variants];
    newVariants[index][field] = field === 'stock' ? parseInt(value) || 0 : value;
    setFormData({ ...formData, variants: newVariants });
  };

  const generateVariants = () => {
    if (!canGenerate) {
      toast({ title: "Impossible de generer", description: "Ajoutez au moins une couleur ET une taille valides", variant: "destructive" });
      return;
    }
    const newVariants = [];
    validColors.forEach(color => {
      validSizes.forEach(size => {
        const existing = formData.variants.find(v => v.color === color.name && v.size === size.size);
        if (existing) {
          newVariants.push(existing);
        } else {
          newVariants.push({
            color: color.name,
            size: size.size,
            stock: 0,
            sku: `${formData.name.substring(0, 4).toUpperCase()}-${color.name.substring(0, 3).toUpperCase()}-${size.size}`
          });
        }
      });
    });
    setFormData({ ...formData, variants: newVariants });
    toast({ title: "Variants generes", description: `${newVariants.length} variants crees` });
  };

  return (
    <div className="border-t pt-4">
      <div className="flex justify-between items-center mb-3">
        <div>
          <Label>Variants (Couleur x Taille)</Label>
          <p className="text-xs text-gray-500 mt-1">Gerez le stock pour chaque combinaison de couleur et taille</p>
          {!canGenerate && (
            <p className="text-xs text-orange-500 mt-1">
              {validColors.length === 0 ? 'Ajoutez au moins une couleur' : ''}
              {validColors.length === 0 && validSizes.length === 0 ? ' et ' : ''}
              {validSizes.length === 0 ? 'Ajoutez au moins une taille' : ''}
            </p>
          )}
        </div>
        <Button type="button" variant="default" size="sm" onClick={generateVariants} disabled={!canGenerate} data-testid="generate-variants-btn">
          Generer Variants Auto ({validColors.length}x{validSizes.length}={validColors.length * validSizes.length})
        </Button>
      </div>

      {formData.variants.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded p-4 text-center text-sm text-gray-600">
          Aucun variant. Cliquez sur "Generer Variants Auto" pour creer automatiquement les combinaisons.
        </div>
      ) : (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {formData.variants.map((variant, index) => (
            <div key={variant.sku || `${variant.color}-${variant.size}-${index}`} className="grid grid-cols-2 md:grid-cols-4 gap-2 items-center bg-gray-50 p-2 rounded">
              <Input value={variant.color} onChange={(e) => updateVariant(index, 'color', e.target.value)} placeholder="Couleur" className="text-sm" />
              <Input value={variant.size} onChange={(e) => updateVariant(index, 'size', e.target.value)} placeholder="Taille" className="text-sm" />
              <Input type="number" value={variant.stock} onChange={(e) => updateVariant(index, 'stock', e.target.value)} placeholder="Stock" className="text-sm" />
              <div className="flex gap-1">
                <Input value={variant.sku} onChange={(e) => updateVariant(index, 'sku', e.target.value)} placeholder="SKU" className="text-sm flex-1" />
                <Button type="button" variant="outline" size="sm" onClick={() => removeVariant(index)}>
                  <X className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Button type="button" variant="ghost" size="sm" onClick={addVariant} className="mt-2" data-testid="add-variant-manual-btn">
        <Plus className="w-4 h-4 mr-2" /> Ajouter un variant manuellement
      </Button>
    </div>
  );
};

export default ProductVariants;

import React from 'react';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Check, X } from 'lucide-react';
import ImageUploader from '../../ImageUploader';

const ProductColorPicker = ({ formData, setFormData, availableColors }) => {
  const isColorSelected = (colorName) => formData.colors.some(c => c.name === colorName);

  const toggleColor = (color) => {
    const existingIndex = formData.colors.findIndex(c => c.name === color.name);
    if (existingIndex >= 0) {
      const newColors = formData.colors.filter((_, i) => i !== existingIndex);
      setFormData({ ...formData, colors: newColors });
    } else {
      const newColors = [...formData.colors, { name: color.name, hex: color.hex, available: true, images: [] }];
      setFormData({ ...formData, colors: newColors });
    }
  };

  const removeColor = (index) => {
    const newColors = formData.colors.filter((_, i) => i !== index);
    setFormData({ ...formData, colors: newColors });
  };

  const updateColorImages = (index, newImages) => {
    const newColors = [...formData.colors];
    newColors[index].images = newImages;
    setFormData({ ...formData, colors: newColors });
  };

  return (
    <div>
      <Label>Couleurs disponibles</Label>
      <p className="text-xs text-gray-500 mb-3">Selectionnez les couleurs depuis les attributs. Gerez les attributs dans Admin &gt; Attributs</p>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-4 p-3 bg-gray-50 rounded-lg border" data-testid="color-picker-grid">
        {availableColors.map((color) => (
          <button
            key={color.name}
            type="button"
            onClick={() => toggleColor(color)}
            className={`flex items-center gap-2 p-2 rounded-lg border-2 transition-all ${
              isColorSelected(color.name) ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
            data-testid={`color-option-${color.name}`}
          >
            <span className="w-5 h-5 rounded-full border border-gray-300 flex-shrink-0" style={{ backgroundColor: color.hex }} />
            <span className="text-sm truncate">{color.name}</span>
            {isColorSelected(color.name) && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          </button>
        ))}
      </div>

      {formData.colors.length > 0 && (
        <div className="space-y-3">
          <Label className="text-sm">Couleurs selectionnees ({formData.colors.length})</Label>
          {formData.colors.map((color, index) => (
            <div key={color.name || `color-selected-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full border border-gray-300" style={{ backgroundColor: color.hex }} />
                  <span className="font-medium">{color.name}</span>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeColor(index)} className="text-red-500 hover:text-red-700">
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="pl-8">
                <Label className="text-sm text-gray-600">Images specifiques a cette couleur (optionnel)</Label>
                <ImageUploader images={color.images || []} onChange={(newImages) => updateColorImages(index, newImages)} maxImages={3} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductColorPicker;

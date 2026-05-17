import React from 'react';
import { Label } from '../../ui/label';
import { X } from 'lucide-react';

const ProductSizePicker = ({ formData, setFormData, availableSizes }) => {
  const isSizeSelected = (sizeName) => formData.sizes.some(s => s.size === sizeName);

  const toggleSize = (sizeName) => {
    const existingIndex = formData.sizes.findIndex(s => s.size === sizeName);
    if (existingIndex >= 0) {
      const newSizes = formData.sizes.filter((_, i) => i !== existingIndex);
      setFormData({ ...formData, sizes: newSizes });
    } else {
      const newSizes = [...formData.sizes, { size: sizeName }];
      setFormData({ ...formData, sizes: newSizes });
    }
  };

  return (
    <div>
      <Label>Tailles disponibles</Label>
      <p className="text-xs text-gray-500 mb-3">Selectionnez les tailles. Le stock sera gere via les variants (Couleur x Taille)</p>

      <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg border" data-testid="size-picker-grid">
        {availableSizes.map((size) => (
          <button
            key={size}
            type="button"
            onClick={() => toggleSize(size)}
            className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
              isSizeSelected(size) ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
            data-testid={`size-option-${size}`}
          >
            {size}
          </button>
        ))}
      </div>

      {formData.sizes.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="text-sm text-gray-600">Tailles selectionnees:</span>
          {formData.sizes.map((sizeData, index) => (
            <span key={sizeData.size || `size-${index}`} className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
              {sizeData.size}
              <button type="button" onClick={() => toggleSize(sizeData.size)} className="hover:text-red-600">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductSizePicker;

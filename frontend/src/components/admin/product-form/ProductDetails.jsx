import React from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Button } from '../../ui/button';
import { Plus, X } from 'lucide-react';

const ProductDetails = ({ formData, setFormData }) => {
  const addDetail = () => {
    setFormData({ ...formData, details: [...formData.details, ''] });
  };

  const removeDetail = (index) => {
    setFormData({ ...formData, details: formData.details.filter((_, i) => i !== index) });
  };

  const updateDetail = (index, value) => {
    const newDetails = [...formData.details];
    newDetails[index] = value;
    setFormData({ ...formData, details: newDetails });
  };

  return (
    <div>
      <Label>Details du Produit</Label>
      {formData.details.map((detail, index) => (
        <div key={`detail-${index}`} className="flex gap-2 mb-2">
          <Input
            value={detail}
            onChange={(e) => updateDetail(index, e.target.value)}
            placeholder="Detail du produit"
            data-testid={`product-detail-${index}`}
          />
          <Button type="button" variant="outline" size="sm" onClick={() => removeDetail(index)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={addDetail} data-testid="add-detail-btn">
        <Plus className="w-4 h-4 mr-2" /> Ajouter un detail
      </Button>
    </div>
  );
};

export default ProductDetails;

import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../hooks/use-toast';

const AttributeForm = ({ type, onClose }) => {
  const [formData, setFormData] = useState(
    type === 'color'
      ? { name: '', hex: '#000000' }
      : { size: '' }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    toast({
      title: `${type === 'color' ? 'Color' : 'Size'} added successfully`,
      description: `Note: This is mock functionality. Backend integration needed.`
    });
    
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {type === 'color' ? (
        <>
          <div>
            <Label htmlFor="colorName">Color Name</Label>
            <Input
              id="colorName"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Navy Blue"
              required
            />
          </div>
          <div>
            <Label htmlFor="colorHex">Color Code</Label>
            <div className="flex gap-3">
              <Input
                id="colorHex"
                value={formData.hex}
                onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                placeholder="#000000"
                required
              />
              <Input
                type="color"
                value={formData.hex}
                onChange={(e) => setFormData({ ...formData, hex: e.target.value })}
                className="w-20"
              />
            </div>
          </div>
        </>
      ) : (
        <div>
          <Label htmlFor="sizeName">Size</Label>
          <Input
            id="sizeName"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            placeholder="e.g., XL, 42, 10Y"
            required
          />
        </div>
      )}

      <div className="flex justify-end space-x-3">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">
          Add {type === 'color' ? 'Color' : 'Size'}
        </Button>
      </div>
    </form>
  );
};

export default AttributeForm;
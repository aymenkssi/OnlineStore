import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Truck } from 'lucide-react';

const ShippingForm = ({ formData, handleInputChange }) => (
  <>
    <div className="bg-white p-6 rounded-lg" data-testid="contact-info-section">
      <h2 className="text-lg font-semibold mb-4">Informations de contact</h2>
      <div className="space-y-4">
        <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" value={formData.email} onChange={handleInputChange} required className="mt-1" data-testid="checkout-email" /></div>
        <div><Label htmlFor="phone">Telephone</Label><Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} required className="mt-1" placeholder="+33 6 12 34 56 78" data-testid="checkout-phone" /></div>
      </div>
    </div>

    <div className="bg-white p-6 rounded-lg" data-testid="shipping-address-section">
      <h2 className="text-lg font-semibold mb-4 flex items-center"><Truck className="w-5 h-5 mr-2" />Adresse de livraison</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="firstName">Prenom</Label><Input id="firstName" name="firstName" value={formData.firstName} onChange={handleInputChange} required className="mt-1" data-testid="checkout-firstname" /></div>
          <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" name="lastName" value={formData.lastName} onChange={handleInputChange} required className="mt-1" data-testid="checkout-lastname" /></div>
        </div>
        <div><Label htmlFor="address">Adresse</Label><Input id="address" name="address" value={formData.address} onChange={handleInputChange} required className="mt-1" placeholder="123 Rue de la Paix" data-testid="checkout-address" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><Label htmlFor="postalCode">Code postal</Label><Input id="postalCode" name="postalCode" value={formData.postalCode} onChange={handleInputChange} required className="mt-1" placeholder="75001" data-testid="checkout-postalcode" /></div>
          <div><Label htmlFor="city">Ville</Label><Input id="city" name="city" value={formData.city} onChange={handleInputChange} required className="mt-1" placeholder="Paris" data-testid="checkout-city" /></div>
        </div>
        <div><Label htmlFor="country">Pays</Label><Input id="country" name="country" value={formData.country} onChange={handleInputChange} required className="mt-1" data-testid="checkout-country" /></div>
      </div>
    </div>
  </>
);

export default ShippingForm;

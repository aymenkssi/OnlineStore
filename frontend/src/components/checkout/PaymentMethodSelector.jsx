import React from 'react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CreditCard, Wallet, Banknote, ShieldCheck } from 'lucide-react';

const PaymentMethodSelector = ({ enabledPaymentMethods, selectedPaymentMethod, setSelectedPaymentMethod, formData, handleInputChange }) => {
  const getPaymentIcon = (method) => {
    const icons = { card: CreditCard, paypal: Wallet, cashOnDelivery: Banknote };
    const Icon = icons[method] || CreditCard;
    return <Icon className="w-5 h-5" />;
  };

  return (
    <div className="bg-white p-6 rounded-lg" data-testid="payment-method-section">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <CreditCard className="w-5 h-5 mr-2" />Mode de paiement
      </h2>

      {enabledPaymentMethods.length === 0 ? (
        <p className="text-red-500">Aucun mode de paiement disponible</p>
      ) : (
        <div className="space-y-3">
          {enabledPaymentMethods.map((method) => (
            <div
              key={method.key}
              className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedPaymentMethod === method.key ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'}`}
              onClick={() => setSelectedPaymentMethod(method.key)}
              data-testid={`payment-method-${method.key}`}
            >
              <div className={`w-5 h-5 rounded-full border-2 mr-4 flex items-center justify-center ${selectedPaymentMethod === method.key ? 'border-black' : 'border-gray-300'}`}>
                {selectedPaymentMethod === method.key && <div className="w-3 h-3 bg-black rounded-full" />}
              </div>
              <div className="flex items-center gap-3">
                {getPaymentIcon(method.key)}
                <span className="font-medium">{method.label}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPaymentMethod === 'card' && (
        <div className="mt-6 space-y-4 pt-4 border-t">
          <div>
            <Label htmlFor="cardNumber">Numero de carte</Label>
            <Input id="cardNumber" name="cardNumber" value={formData.cardNumber} onChange={handleInputChange} required className="mt-1" placeholder="1234 5678 9012 3456" data-testid="checkout-cardnumber" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><Label htmlFor="cardExpiry">Date d'expiration</Label><Input id="cardExpiry" name="cardExpiry" value={formData.cardExpiry} onChange={handleInputChange} required className="mt-1" placeholder="MM/AA" data-testid="checkout-expiry" /></div>
            <div><Label htmlFor="cardCvc">CVC</Label><Input id="cardCvc" name="cardCvc" value={formData.cardCvc} onChange={handleInputChange} required className="mt-1" placeholder="123" data-testid="checkout-cvc" /></div>
          </div>
        </div>
      )}

      {selectedPaymentMethod === 'paypal' && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800">Vous serez redirige vers PayPal pour finaliser votre paiement de maniere securisee.</p>
        </div>
      )}

      {selectedPaymentMethod === 'cashOnDelivery' && (
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">Vous paierez en especes ou par carte a la livraison de votre commande.</p>
        </div>
      )}

      {selectedPaymentMethod !== 'cashOnDelivery' && (
        <div className="mt-4 flex items-center text-sm text-gray-600">
          <ShieldCheck className="w-4 h-4 mr-2 text-green-600" />Paiement securise par cryptage SSL
        </div>
      )}
    </div>
  );
};

export default PaymentMethodSelector;

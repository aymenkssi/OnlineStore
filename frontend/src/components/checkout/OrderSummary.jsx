import React from 'react';
import { formatPrice } from '../../hooks/usePaymentSettings';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Tag, X, CheckCircle, Loader2 } from 'lucide-react';

const OrderSummary = ({ cartItems, subtotal, discount, shipping, total, appliedCoupon, couponCode, setCouponCode, onApplyCoupon, onRemoveCoupon, validatingCoupon }) => (
  <div className="bg-white p-6 rounded-lg sticky top-24" data-testid="order-summary">
    <h2 className="text-lg font-semibold mb-4">Votre commande</h2>

    <div className="space-y-4 mb-6">
      {cartItems.map((item, index) => (
        <div key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${index}`} className="flex gap-4">
          <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded" />
          <div className="flex-1">
            <p className="text-xs text-gray-500 uppercase">{item.brand}</p>
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs text-gray-600">{item.color} / {item.size} x {item.quantity}</p>
          </div>
          <p className="font-medium">{formatPrice(item.price * item.quantity)}</p>
        </div>
      ))}
    </div>

    <div className="border-t border-gray-200 pt-4 space-y-2">
      <div className="mb-3">
        {appliedCoupon ? (
          <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200" data-testid="applied-coupon">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">{appliedCoupon.code}</span>
              <span className="text-xs text-green-600">(-{appliedCoupon.type === 'percent' ? `${appliedCoupon.value}%` : formatPrice(appliedCoupon.value)})</span>
            </div>
            <button onClick={onRemoveCoupon} className="text-gray-400 hover:text-red-500" data-testid="remove-coupon-btn"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input placeholder="Code promo" value={couponCode} onChange={(e) => setCouponCode(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onApplyCoupon())} className="pl-9" data-testid="coupon-code-input" />
            </div>
            <Button variant="outline" size="sm" onClick={onApplyCoupon} disabled={validatingCoupon} data-testid="apply-coupon-btn">
              {validatingCoupon ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-between text-sm"><span>Sous-total</span><span>{formatPrice(subtotal)}</span></div>
      {discount > 0 && <div className="flex justify-between text-sm text-green-600"><span>Reduction ({appliedCoupon?.code})</span><span>-{formatPrice(discount)}</span></div>}
      <div className="flex justify-between text-sm"><span>Livraison</span><span>{shipping === 0 ? 'Gratuite' : formatPrice(shipping)}</span></div>
      <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold text-lg" data-testid="checkout-total">
        <span>Total</span><span>{formatPrice(total)}</span>
      </div>
    </div>
  </div>
);

export default OrderSummary;

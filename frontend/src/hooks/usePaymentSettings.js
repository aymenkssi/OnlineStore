import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Default settings
const defaultPaymentSettings = {
  paymentMethods: {
    card: { enabled: true, label: 'Carte bancaire' },
    paypal: { enabled: false, label: 'PayPal' },
    cashOnDelivery: { enabled: true, label: 'Paiement à la livraison' }
  },
  currency: 'EUR',
  currencies: {
    EUR: { symbol: '€', name: 'Euro', position: 'after' },
    USD: { symbol: '$', name: 'Dollar US', position: 'before' },
    TND: { symbol: 'DT', name: 'Dinar Tunisien', position: 'after' }
  },
  shipping: {
    defaultPrice: 20,
    freeShippingThreshold: 400
  },
  coupons: []
};

// Internal cache to avoid multiple API calls
let _cachedSettings = null;
let _fetchPromise = null;

// Fetch payment settings from backend and cache in memory
const fetchAndCacheSettings = async () => {
  try {
    const resp = await fetch(`${API_URL}/api/settings/payment`);
    if (!resp.ok) return null;
    const result = await resp.json();
    const data = result?.data || result;
    if (data && data.currency) {
      const local = JSON.parse(JSON.stringify(defaultPaymentSettings));
      local.currency = data.currency;
      if (data.currency_symbol && local.currencies[data.currency]) {
        local.currencies[data.currency].symbol = data.currency_symbol;
      }
      // Convert payment_methods array to object format if needed
      if (data.payment_methods && Array.isArray(data.payment_methods)) {
        Object.keys(local.paymentMethods).forEach(key => {
          local.paymentMethods[key].enabled = data.payment_methods.includes(key);
        });
      }
      if (data.cash_on_delivery !== undefined && local.paymentMethods.cashOnDelivery) {
        local.paymentMethods.cashOnDelivery.enabled = data.cash_on_delivery;
      }
      if (data.shipping_cost !== undefined) local.shipping.defaultPrice = data.shipping_cost;
      if (data.free_shipping_threshold !== undefined) local.shipping.freeShippingThreshold = data.free_shipping_threshold;
      _cachedSettings = local;
      return local;
    }
  } catch (e) {
    // Fallback to default settings
  }
  return null;
};

// Get settings - returns cached from memory or defaults (source of truth = backend)
export const getPaymentSettings = () => {
  if (_cachedSettings) return _cachedSettings;
  return defaultPaymentSettings;
};

// Init: fetch from backend once at app start
if (typeof window !== 'undefined' && !_fetchPromise) {
  _fetchPromise = fetchAndCacheSettings();
}

// Format price according to currency settings
export const formatPrice = (price) => {
  const settings = getPaymentSettings();
  const currency = settings.currencies[settings.currency];
  if (!currency) return `${(price || 0).toFixed(2)} €`;
  const formattedNumber = (price || 0).toFixed(2);
  
  if (currency.position === 'before') {
    return `${currency.symbol}${formattedNumber}`;
  } else {
    return `${formattedNumber} ${currency.symbol}`;
  }
};

// Get enabled payment methods
export const getEnabledPaymentMethods = () => {
  const settings = getPaymentSettings();
  return Object.entries(settings.paymentMethods)
    .filter(([_, method]) => method.enabled)
    .map(([key, method]) => ({ key, ...method }));
};

// Get shipping settings
export const getShippingSettings = () => {
  const settings = getPaymentSettings();
  return settings.shipping || { defaultPrice: 20, freeShippingThreshold: 400 };
};

// Calculate shipping cost
export const calculateShipping = (subtotal) => {
  const { defaultPrice, freeShippingThreshold } = getShippingSettings();
  return subtotal >= freeShippingThreshold ? 0 : defaultPrice;
};

// Get coupons
export const getCoupons = () => {
  const settings = getPaymentSettings();
  return (settings.coupons || []).filter(c => c && c.code);
};

// Validate a coupon code via backend API
export const validateCoupon = async (code) => {
  if (!code) return null;
  try {
    const res = await fetch(`${API_URL}/api/coupons/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: code.trim() })
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      code: data.code,
      type: data.discount_type === 'percentage' ? 'percent' : data.discount_type === 'free_shipping' ? 'shipping' : 'fixed',
      value: data.discount_value,
      active: true
    };
  } catch {
    return null;
  }
};

// Custom hook for payment settings
export const usePaymentSettings = () => {
  const [settings, setSettings] = useState(getPaymentSettings());

  useEffect(() => {
    // Wait for backend fetch to complete, then update
    if (_fetchPromise) {
      _fetchPromise.then((fetched) => {
        if (fetched) setSettings(fetched);
      });
    }

    const handleStorageChange = () => {
      _cachedSettings = null;
      setSettings(getPaymentSettings());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return {
    settings,
    formatPrice,
    getEnabledPaymentMethods,
    currency: settings.currencies[settings.currency],
    currencyCode: settings.currency
  };
};

export default usePaymentSettings;

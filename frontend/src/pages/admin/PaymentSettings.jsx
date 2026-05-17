import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { toast } from '../../hooks/use-toast';
import { Save, CreditCard, Wallet, Truck, DollarSign, Euro, Coins, Eye, EyeOff, AlertTriangle, CheckCircle } from 'lucide-react';
import { settingsApi } from '../../services/api';

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
  // Stripe config
  stripe: {
    mode: 'test',
    testPublicKey: '',
    testSecretKey: '',
    livePublicKey: '',
    liveSecretKey: '',
  },
  // PayPal config
  paypal: {
    mode: 'test',
    testClientId: '',
    testSecret: '',
    liveClientId: '',
    liveSecret: '',
  }
};

// Get settings - defaults only; source of truth is backend (loaded via useEffect)
const getPaymentSettings = () => defaultPaymentSettings;
const savePaymentSettings = () => { /* no-op: backend is the source of truth */ };

// Export for use in other components
export { getPaymentSettings, savePaymentSettings };

const PaymentSettings = () => {
  const [settings, setSettings] = useState(getPaymentSettings());
  const [hasChanges, setHasChanges] = useState(false);
  const [showKeys, setShowKeys] = useState({});

  const toggleShowKey = (key) => {
    setShowKeys(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateStripe = (field, value) => {
    setSettings(prev => ({
      ...prev,
      stripe: { ...defaultPaymentSettings.stripe, ...(prev.stripe || {}), [field]: value }
    }));
    setHasChanges(true);
  };

  const updatePaypal = (field, value) => {
    setSettings(prev => ({
      ...prev,
      paypal: { ...defaultPaymentSettings.paypal, ...(prev.paypal || {}), [field]: value }
    }));
    setHasChanges(true);
  };

  // Load from backend on mount to sync
  useEffect(() => {
    const loadFromBackend = async () => {
      try {
        const backendSettings = await settingsApi.getPayment();
        const data = backendSettings?.data || backendSettings;
        if (data) {
          const merged = { ...defaultPaymentSettings, ...getPaymentSettings() };
          
          // Sync currency
          if (data.currency && merged.currencies[data.currency]) {
            merged.currency = data.currency;
          }
          if (data.currency_symbol) {
            const currKey = merged.currency;
            if (merged.currencies[currKey]) {
              merged.currencies[currKey].symbol = data.currency_symbol;
            }
          }
          
          // Sync payment methods - backend sends array, frontend uses object
          if (data.payment_methods && Array.isArray(data.payment_methods)) {
            // Reset all to disabled, then enable the ones from backend
            Object.keys(merged.paymentMethods).forEach(key => {
              merged.paymentMethods[key].enabled = data.payment_methods.includes(key);
            });
          }
          // Also check individual flags from backend
          if (data.cash_on_delivery !== undefined) {
            merged.paymentMethods.cashOnDelivery.enabled = data.cash_on_delivery;
          }
          
          // Sync shipping
          if (data.shipping_cost !== undefined) merged.shipping.defaultPrice = data.shipping_cost;
          if (data.free_shipping_threshold !== undefined) merged.shipping.freeShippingThreshold = data.free_shipping_threshold;
          
          // Sync Stripe/PayPal configs
          if (data.stripe_config) merged.stripe = { ...defaultPaymentSettings.stripe, ...data.stripe_config };
          if (data.paypal_config) merged.paypal = { ...defaultPaymentSettings.paypal, ...data.paypal_config };
          
          setSettings(merged);
          savePaymentSettings(merged);
        }
      } catch (e) {
        // Fallback to localStorage
        console.error('PaymentSettings: failed to load from backend, falling back to localStorage:', e);
      }
    };
    loadFromBackend();
  }, []);

  const handlePaymentMethodToggle = (method) => {
    setSettings(prev => ({
      ...prev,
      paymentMethods: {
        ...prev.paymentMethods,
        [method]: {
          ...prev.paymentMethods[method],
          enabled: !prev.paymentMethods[method].enabled
        }
      }
    }));
    setHasChanges(true);
  };

  const handleCurrencyChange = (currency) => {
    setSettings(prev => ({ ...prev, currency }));
    setHasChanges(true);
  };

  const handleShippingChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      shipping: { ...prev.shipping, [field]: parseFloat(value) || 0 }
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    // Save to localStorage
    savePaymentSettings(settings);
    
    // Save to backend API
    try {
      const currencyInfo = settings.currencies[settings.currency];
      // Convert paymentMethods object to array for backend
      const enabledMethods = Object.entries(settings.paymentMethods)
        .filter(([_, m]) => m.enabled)
        .map(([key]) => key);
      
      await settingsApi.updatePayment({
        currency: settings.currency,
        currency_symbol: currencyInfo?.symbol || '€',
        payment_methods: enabledMethods,
        cash_on_delivery: settings.paymentMethods.cashOnDelivery?.enabled || false,
        shipping_cost: settings.shipping.defaultPrice,
        free_shipping_threshold: settings.shipping.freeShippingThreshold,
        stripe_config: settings.stripe || {},
        paypal_config: settings.paypal || {}
      });
    } catch (e) {
      console.error('Error saving to backend:', e);
    }
    
    setHasChanges(false);
    toast({
      title: "Paramètres enregistrés",
      description: "Les paramètres de paiement ont été mis à jour avec succès."
    });
    setTimeout(() => window.location.reload(), 1000);
  };

  const getPaymentIcon = (method) => {
    switch (method) {
      case 'card':
        return <CreditCard className="w-6 h-6" />;
      case 'paypal':
        return <Wallet className="w-6 h-6" />;
      case 'cashOnDelivery':
        return <Truck className="w-6 h-6" />;
      default:
        return null;
    }
  };

  const getCurrencyIcon = (currency) => {
    switch (currency) {
      case 'USD':
        return <DollarSign className="w-6 h-6" />;
      case 'EUR':
        return <Euro className="w-6 h-6" />;
      case 'TND':
        return <Coins className="w-6 h-6" />;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Paramètres de Paiement</h1>
          <p className="text-gray-600 mt-2">Gérez les modes de paiement et la devise de votre boutique</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges}>
          <Save className="w-4 h-4 mr-2" />
          Enregistrer les modifications
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Modes de paiement
            </CardTitle>
            <CardDescription>
              Activez ou désactivez les modes de paiement disponibles pour vos clients
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.paymentMethods).map(([key, method]) => (
              <div
                key={key}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  method.enabled 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 bg-gray-50 opacity-60'
                }`}
                onClick={() => handlePaymentMethodToggle(key)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${method.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-200 text-gray-500'}`}>
                    {getPaymentIcon(key)}
                  </div>
                  <div>
                    <p className="font-medium">{method.label}</p>
                    <p className="text-sm text-gray-500">
                      {key === 'card' && 'Visa, Mastercard, etc.'}
                      {key === 'paypal' && 'Paiement sécurisé PayPal'}
                      {key === 'cashOnDelivery' && 'Paiement à la réception'}
                    </p>
                  </div>
                </div>
                <div className={`w-12 h-6 rounded-full transition-all ${method.enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                  <div className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${method.enabled ? 'translate-x-6' : 'translate-x-0.5'} mt-0.5`} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

      {/* Stripe Configuration */}
      {settings.paymentMethods.card?.enabled && (
        <Card className="mt-6 border-purple-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuration Stripe</CardTitle>
                  <CardDescription>Acceptez les paiements par carte via Stripe</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${(settings.stripe?.mode || 'test') === 'test' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {(settings.stripe?.mode || 'test') === 'test' ? 'Mode Test' : 'Mode Production'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode Toggle */}
            <div>
              <Label className="text-sm font-medium">Mode</Label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => updateStripe('mode', 'test')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    (settings.stripe?.mode || 'test') === 'test'
                      ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-800'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-500'
                  }`}
                  data-testid="stripe-mode-test"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Test (Sandbox)
                </button>
                <button
                  type="button"
                  onClick={() => updateStripe('mode', 'live')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    (settings.stripe?.mode || 'test') === 'live'
                      ? 'bg-green-100 border-2 border-green-400 text-green-800'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-500'
                  }`}
                  data-testid="stripe-mode-live"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Production (Live)
                </button>
              </div>
            </div>

            {/* Test Keys */}
            {(settings.stripe?.mode || 'test') === 'test' && (
              <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Clés de test</p>
                <div>
                  <Label htmlFor="stripe-test-pk" className="text-sm">Clé publique (Publishable Key)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="stripe-test-pk"
                      type={showKeys['stripe-test-pk'] ? 'text' : 'password'}
                      placeholder="pk_test_..."
                      value={settings.stripe?.testPublicKey || ''}
                      onChange={(e) => updateStripe('testPublicKey', e.target.value)}
                      className="flex-1"
                      data-testid="stripe-test-public-key"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('stripe-test-pk')}>
                      {showKeys['stripe-test-pk'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="stripe-test-sk" className="text-sm">Clé secrète (Secret Key)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="stripe-test-sk"
                      type={showKeys['stripe-test-sk'] ? 'text' : 'password'}
                      placeholder="sk_test_..."
                      value={settings.stripe?.testSecretKey || ''}
                      onChange={(e) => updateStripe('testSecretKey', e.target.value)}
                      className="flex-1"
                      data-testid="stripe-test-secret-key"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('stripe-test-sk')}>
                      {showKeys['stripe-test-sk'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Keys */}
            {(settings.stripe?.mode || 'test') === 'live' && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Clés de production</p>
                <div>
                  <Label htmlFor="stripe-live-pk" className="text-sm">Clé publique (Publishable Key)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="stripe-live-pk"
                      type={showKeys['stripe-live-pk'] ? 'text' : 'password'}
                      placeholder="pk_live_..."
                      value={settings.stripe?.livePublicKey || ''}
                      onChange={(e) => updateStripe('livePublicKey', e.target.value)}
                      className="flex-1"
                      data-testid="stripe-live-public-key"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('stripe-live-pk')}>
                      {showKeys['stripe-live-pk'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="stripe-live-sk" className="text-sm">Clé secrète (Secret Key)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="stripe-live-sk"
                      type={showKeys['stripe-live-sk'] ? 'text' : 'password'}
                      placeholder="sk_live_..."
                      value={settings.stripe?.liveSecretKey || ''}
                      onChange={(e) => updateStripe('liveSecretKey', e.target.value)}
                      className="flex-1"
                      data-testid="stripe-live-secret-key"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('stripe-live-sk')}>
                      {showKeys['stripe-live-sk'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Obtenez vos clés sur <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">dashboard.stripe.com/apikeys</a>
            </p>
          </CardContent>
        </Card>
      )}

      {/* PayPal Configuration */}
      {settings.paymentMethods.paypal?.enabled && (
        <Card className="mt-6 border-blue-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle className="text-lg">Configuration PayPal</CardTitle>
                  <CardDescription>Acceptez les paiements via PayPal Business</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${(settings.paypal?.mode || 'test') === 'test' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                  {(settings.paypal?.mode || 'test') === 'test' ? 'Mode Sandbox' : 'Mode Production'}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Mode Toggle */}
            <div>
              <Label className="text-sm font-medium">Mode</Label>
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => updatePaypal('mode', 'test')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    (settings.paypal?.mode || 'test') === 'test'
                      ? 'bg-yellow-100 border-2 border-yellow-400 text-yellow-800'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-500'
                  }`}
                  data-testid="paypal-mode-test"
                >
                  <AlertTriangle className="w-4 h-4 inline mr-2" />
                  Sandbox (Test)
                </button>
                <button
                  type="button"
                  onClick={() => updatePaypal('mode', 'live')}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                    (settings.paypal?.mode || 'test') === 'live'
                      ? 'bg-green-100 border-2 border-green-400 text-green-800'
                      : 'bg-gray-50 border-2 border-gray-200 text-gray-500'
                  }`}
                  data-testid="paypal-mode-live"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Production (Live)
                </button>
              </div>
            </div>

            {/* Sandbox Keys */}
            {(settings.paypal?.mode || 'test') === 'test' && (
              <div className="space-y-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-xs font-semibold text-yellow-700 uppercase tracking-wider">Clés Sandbox</p>
                <div>
                  <Label htmlFor="paypal-test-id" className="text-sm">Client ID</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="paypal-test-id"
                      type={showKeys['paypal-test-id'] ? 'text' : 'password'}
                      placeholder="AW..."
                      value={settings.paypal?.testClientId || ''}
                      onChange={(e) => updatePaypal('testClientId', e.target.value)}
                      className="flex-1"
                      data-testid="paypal-test-client-id"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('paypal-test-id')}>
                      {showKeys['paypal-test-id'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="paypal-test-secret" className="text-sm">Client Secret</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="paypal-test-secret"
                      type={showKeys['paypal-test-secret'] ? 'text' : 'password'}
                      placeholder="EM..."
                      value={settings.paypal?.testSecret || ''}
                      onChange={(e) => updatePaypal('testSecret', e.target.value)}
                      className="flex-1"
                      data-testid="paypal-test-secret"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('paypal-test-secret')}>
                      {showKeys['paypal-test-secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Live Keys */}
            {(settings.paypal?.mode || 'test') === 'live' && (
              <div className="space-y-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-semibold text-green-700 uppercase tracking-wider">Clés de production</p>
                <div>
                  <Label htmlFor="paypal-live-id" className="text-sm">Client ID</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="paypal-live-id"
                      type={showKeys['paypal-live-id'] ? 'text' : 'password'}
                      placeholder="AW..."
                      value={settings.paypal?.liveClientId || ''}
                      onChange={(e) => updatePaypal('liveClientId', e.target.value)}
                      className="flex-1"
                      data-testid="paypal-live-client-id"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('paypal-live-id')}>
                      {showKeys['paypal-live-id'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="paypal-live-secret" className="text-sm">Client Secret</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      id="paypal-live-secret"
                      type={showKeys['paypal-live-secret'] ? 'text' : 'password'}
                      placeholder="EM..."
                      value={settings.paypal?.liveSecret || ''}
                      onChange={(e) => updatePaypal('liveSecret', e.target.value)}
                      className="flex-1"
                      data-testid="paypal-live-secret"
                    />
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey('paypal-live-secret')}>
                      {showKeys['paypal-live-secret'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-500">
              Obtenez vos clés sur <a href="https://developer.paypal.com/dashboard/applications" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">developer.paypal.com</a>
            </p>
          </CardContent>
        </Card>
      )}

        {/* Currency Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Devise
            </CardTitle>
            <CardDescription>
              Choisissez la devise utilisée pour afficher les prix
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {Object.entries(settings.currencies).map(([code, currency]) => (
              <div
                key={code}
                className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  settings.currency === code 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleCurrencyChange(code)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-full ${settings.currency === code ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                    {getCurrencyIcon(code)}
                  </div>
                  <div>
                    <p className="font-medium">{currency.name}</p>
                    <p className="text-sm text-gray-500">
                      Exemple: {currency.position === 'before' ? `${currency.symbol}100.00` : `100.00 ${currency.symbol}`}
                    </p>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  settings.currency === code ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                }`}>
                  {settings.currency === code && (
                    <div className="w-2 h-2 bg-white rounded-full" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Shipping Settings */}
      <div className="mt-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Livraison
            </CardTitle>
            <CardDescription>
              Configurez les frais de livraison
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="shippingPrice">Frais de livraison par défaut</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="shippingPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.shipping?.defaultPrice ?? 20}
                  onChange={(e) => handleShippingChange('defaultPrice', e.target.value)}
                  className="w-32"
                  data-testid="shipping-price-input"
                />
                <span className="text-gray-500">{settings.currencies[settings.currency]?.symbol}</span>
              </div>
            </div>
            <div>
              <Label htmlFor="freeThreshold">Livraison gratuite à partir de</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="freeThreshold"
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.shipping?.freeShippingThreshold ?? 400}
                  onChange={(e) => handleShippingChange('freeShippingThreshold', e.target.value)}
                  className="w-32"
                  data-testid="free-shipping-threshold-input"
                />
                <span className="text-gray-500">{settings.currencies[settings.currency]?.symbol}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">Mettre 0 pour désactiver la livraison gratuite</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Aperçu</CardTitle>
          <CardDescription>
            Voici comment vos paramètres seront appliqués
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium mb-3">Modes de paiement actifs</h3>
              <div className="space-y-2">
                {Object.entries(settings.paymentMethods)
                  .filter(([_, method]) => method.enabled)
                  .map(([key, method]) => (
                    <div key={key} className="flex items-center gap-2 text-green-600">
                      <span className="w-2 h-2 bg-green-500 rounded-full" />
                      {method.label}
                    </div>
                  ))}
                {Object.values(settings.paymentMethods).every(m => !m.enabled) && (
                  <p className="text-red-500">Aucun mode de paiement actif !</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-medium mb-3">Format des prix</h3>
              <div className="space-y-2">
                <p className="text-2xl font-semibold">
                  {settings.currencies[settings.currency].position === 'before' 
                    ? `${settings.currencies[settings.currency].symbol}149.99`
                    : `149.99 ${settings.currencies[settings.currency].symbol}`
                  }
                </p>
                <p className="text-gray-500">
                  Devise: {settings.currencies[settings.currency].name} ({settings.currency})
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Vous avez des modifications non enregistrées
        </div>
      )}
    </div>
  );
};

export default PaymentSettings;

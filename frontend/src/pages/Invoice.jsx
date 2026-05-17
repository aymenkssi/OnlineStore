import React, { useRef, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../services/api';
import { getSiteTexts } from '../mock/mockData';
import { formatPrice } from '../hooks/usePaymentSettings';
import { Button } from '../components/ui/button';
import { ChevronLeft, Printer } from 'lucide-react';

const Invoice = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const invoiceRef = useRef();
  const texts = getSiteTexts();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        const data = await ordersApi.getById(orderId);
        setOrder(data);
      } catch (e) {
        console.error('Error loading order:', e);
        setOrder(null);
      } finally {
        setLoading(false);
      }
    };
    loadOrder();
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Chargement...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-light mb-4">Commande non trouvée</h2>
          <Button onClick={() => navigate('/orders')} data-testid="back-to-orders-btn">
            Retour aux commandes
          </Button>
        </div>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const companyFullAddress = [
    texts.companyAddress,
    [texts.companyPostalCode, texts.companyCity].filter(Boolean).join(' '),
    texts.companyCountry
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header - Hidden on print */}
      <div className="no-print bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center text-gray-600 hover:text-black"
            data-testid="invoice-back-btn"
          >
            <ChevronLeft className="w-5 h-5 mr-1" />
            Retour aux commandes
          </button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handlePrint} data-testid="invoice-print-btn">
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="container mx-auto px-4 py-8 print-area">
        <div 
          ref={invoiceRef}
          className="bg-white max-w-3xl mx-auto p-8 shadow-sm"
          id="invoice-content"
        >
          {/* Invoice Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-3xl font-bold">{texts.siteName || 'BEST SHOP'}</h1>
              <p className="text-gray-600 mt-1">{texts.companyDescription || 'Mode & Accessoires de Luxe'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-semibold text-gray-800">FACTURE</h2>
              <p className="text-lg font-mono mt-1">{order.invoiceNumber}</p>
            </div>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-8 mb-8 pb-8 border-b border-gray-200">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-2">Facturé à</h3>
              <p className="font-medium">{order.shipping_address?.firstName || order.customer?.firstName} {order.shipping_address?.lastName || order.customer?.lastName}</p>
              <p className="text-gray-600">{order.shipping_address?.address || order.customer?.address}</p>
              <p className="text-gray-600">{order.shipping_address?.postalCode || order.customer?.postalCode} {order.shipping_address?.city || order.customer?.city}</p>
              <p className="text-gray-600">{order.shipping_address?.country || order.customer?.country}</p>
              <p className="text-gray-600 mt-2">{order.shipping_address?.email || order.customer_email || order.customer?.email}</p>
              <p className="text-gray-600">{order.shipping_address?.phone || order.customer?.phone}</p>
            </div>
            <div className="text-right">
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Émis par</h3>
                <p className="font-medium">{texts.companyLegalName}</p>
                <p className="text-gray-600 text-sm">{companyFullAddress}</p>
                <p className="text-gray-600 text-sm">{texts.companyEmail}</p>
                <p className="text-gray-600 text-sm">{texts.companyPhone}</p>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">N° de commande</h3>
                <p className="font-mono">{order.order_number || order.id}</p>
              </div>
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Date de facturation</h3>
                <p>{formatDate(order.created_at || order.createdAt)}</p>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase mb-1">Mode de paiement</h3>
                <p>
                  {(order.payment_method || order.paymentMethod) === 'card' && 'Carte bancaire'}
                  {(order.payment_method || order.paymentMethod) === 'paypal' && 'PayPal'}
                  {(order.payment_method || order.paymentMethod) === 'cashOnDelivery' && 'Paiement à la livraison'}
                </p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 text-sm font-semibold text-gray-500 uppercase">Article</th>
                <th className="text-center py-3 text-sm font-semibold text-gray-500 uppercase">Qté</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">Prix unitaire</th>
                <th className="text-right py-3 text-sm font-semibold text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item, idx) => (
                <tr key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${idx}`} className="border-b border-gray-100">
                  <td className="py-4">
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.brand}</p>
                    <p className="text-sm text-gray-500">{item.color} / Taille: {item.size}</p>
                  </td>
                  <td className="py-4 text-center">{item.quantity}</td>
                  <td className="py-4 text-right">{formatPrice(item.price)}</td>
                  <td className="py-4 text-right font-medium">{formatPrice(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-64">
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Sous-total HT</span>
                <span>{formatPrice(order.subtotal * 0.8)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">TVA (20%)</span>
                <span>{formatPrice(order.subtotal * 0.2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Sous-total TTC</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Livraison</span>
                <span>{(order.shipping_cost || order.shipping || 0) === 0 ? 'Gratuite' : formatPrice(order.shipping_cost || order.shipping)}</span>
              </div>
              <div className="flex justify-between py-3 border-t border-gray-200 font-semibold text-lg">
                <span>Total TTC</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer with dynamic company info */}
          <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
            <p className="font-semibold text-gray-700 mb-2">{texts.companyLegalName}</p>
            <p>{companyFullAddress}</p>
            <p>SIRET: {texts.companySiret} &bull; TVA: {texts.companyTva}</p>
            <p className="mt-2">{texts.companyEmail} &bull; {texts.companyPhone}</p>
            <p className="mt-4 text-xs">
              Cette facture a été générée automatiquement et fait foi de document comptable.
            </p>
          </div>
        </div>
      </div>

      {/* Print Styles - Fixed to properly show invoice content */}
      <style>{`
        @media print {
          /* Hide the site header, footer, and nav bar */
          header, footer, nav,
          .no-print {
            display: none !important;
          }
          /* Reset page */
          body, html {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
          }
          .min-h-screen {
            min-height: auto !important;
          }
          .bg-gray-100 {
            background: white !important;
          }
          /* Make invoice the only visible content */
          .print-area {
            padding: 0 !important;
            margin: 0 !important;
          }
          #invoice-content {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: 20px !important;
          }
          /* Ensure text is black for print */
          * {
            color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            margin: 10mm;
            size: A4;
          }
        }
      `}</style>
    </div>
  );
};

export default Invoice;

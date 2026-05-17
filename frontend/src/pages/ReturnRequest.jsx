import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi, returnsApi } from '../services/api';
import { getCurrentUser } from '../mock/mockData';
import { formatPrice } from '../hooks/usePaymentSettings';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { ChevronLeft, RotateCcw, AlertCircle } from 'lucide-react';

const RETURN_REASONS = [
  { value: 'wrong_size', label: 'Taille incorrecte' },
  { value: 'wrong_color', label: 'Couleur différente de la photo' },
  { value: 'defective', label: 'Article défectueux' },
  { value: 'not_as_described', label: 'Ne correspond pas à la description' },
  { value: 'changed_mind', label: 'Je ne veux plus cet article' },
  { value: 'other', label: 'Autre raison' }
];

const ReturnRequest = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState([]);
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <Button onClick={() => navigate('/orders')}>
            Retour aux commandes
          </Button>
        </div>
      </div>
    );
  }

  if (order.hasReturnRequest) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 mx-auto mb-4 text-orange-500" />
          <h2 className="text-2xl font-light mb-4">Demande déjà soumise</h2>
          <p className="text-gray-600 mb-6">
            Une demande de retour a déjà été soumise pour cette commande.
            Vous pouvez suivre son statut dans vos commandes.
          </p>
          <Button onClick={() => navigate('/orders')}>
            Voir mes commandes
          </Button>
        </div>
      </div>
    );
  }

  const handleItemToggle = (item, checked) => {
    if (checked) {
      setSelectedItems([...selectedItems, item]);
    } else {
      setSelectedItems(selectedItems.filter(i => i.name !== item.name));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedItems.length === 0) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner au moins un article à retourner.",
        variant: "destructive"
      });
      return;
    }

    if (!reason) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une raison de retour.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const returnData = {
        order_id: orderId,
        order_number: order.order_number || order.id,
        customer_email: currentUser?.email || order.customer_email || '',
        customer_name: currentUser?.name || order.customer_name || '',
        items: selectedItems.map(item => ({
          product_id: item.product_id || item.id || '',
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image || null,
          color: item.color || null,
          size: item.size || null,
          reason: RETURN_REASONS.find(r => r.value === reason)?.label || reason
        })),
        reason: RETURN_REASONS.find(r => r.value === reason)?.label || reason,
        description: description,
        refund_amount: refundAmount
      };
      
      await returnsApi.create(returnData);
      
      toast({
        title: "Demande envoyée",
        description: "Votre demande de retour a été soumise avec succès. Nous vous répondrons sous 48h."
      });
      navigate('/orders');
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive"
      });
    }

    setIsSubmitting(false);
  };

  const refundAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Back Button */}
        <button 
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-black mb-6"
        >
          <ChevronLeft className="w-5 h-5 mr-1" />
          Retour aux commandes
        </button>

        <div className="flex items-center gap-3 mb-8">
          <RotateCcw className="w-8 h-8" />
          <div>
            <h1 className="text-3xl font-light">Demande de retour</h1>
            <p className="text-gray-600">Commande {order.id}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Select Items */}
          <Card>
            <CardHeader>
              <CardTitle>Articles à retourner</CardTitle>
              <CardDescription>
                Sélectionnez les articles que vous souhaitez retourner
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {order.items.map((item, idx) => {
                const isSelected = selectedItems.some(i => i.name === item.name);
                return (
                  <label 
                    key={`${item.product_id || item.name}-${item.color || ''}-${item.size || ''}-${idx}`}
                    className={`flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all ${
                      isSelected ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    htmlFor={`return-item-${idx}`}
                  >
                    <input
                      type="checkbox"
                      id={`return-item-${idx}`}
                      checked={isSelected}
                      onChange={(e) => handleItemToggle(item, e.target.checked)}
                      className="w-4 h-4 accent-black"
                      data-testid={`return-item-checkbox-${idx}`}
                    />
                    {item.image ? (
                      <img 
                        src={item.image} 
                        alt={item.name}
                        className="w-16 h-20 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-20 bg-gray-200 rounded flex items-center justify-center">
                        <span className="text-gray-400 text-xs text-center px-1">Pas d'image</span>
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">{item.brand}</p>
                      <p className="text-sm text-gray-500">{item.color} / {item.size}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatPrice(item.price)}</p>
                      <p className="text-sm text-gray-500">Qté: {item.quantity}</p>
                    </div>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          {/* Reason */}
          <Card>
            <CardHeader>
              <CardTitle>Raison du retour</CardTitle>
              <CardDescription>
                Indiquez pourquoi vous souhaitez retourner ces articles
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RETURN_REASONS.map((r) => (
                  <div
                    key={r.value}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      reason === r.value ? 'border-black bg-gray-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setReason(r.value)}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        reason === r.value ? 'border-black' : 'border-gray-300'
                      }`}>
                        {reason === r.value && <div className="w-2 h-2 bg-black rounded-full" />}
                      </div>
                      <span className="text-sm">{r.label}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <Label htmlFor="description">Description (optionnel)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez plus en détail la raison de votre retour..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* Refund Summary */}
          {selectedItems.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-green-800">Montant du remboursement estimé</p>
                    <p className="text-sm text-green-600">
                      {selectedItems.length} article(s) sélectionné(s)
                    </p>
                  </div>
                  <p className="text-2xl font-bold text-green-800">
                    {formatPrice(refundAmount)}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Info */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Conditions de retour</p>
                  <ul className="list-disc list-inside space-y-1 text-blue-700">
                    <li>Les articles doivent être retournés dans leur état d'origine</li>
                    <li>Les étiquettes doivent être attachées</li>
                    <li>Le délai de retour est de 30 jours après réception</li>
                    <li>Le remboursement sera effectué sous 5-7 jours ouvrés après réception</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/orders')}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || selectedItems.length === 0}
              className="flex-1"
              data-testid="submit-return-request"
            >
              {isSubmitting ? 'Envoi en cours...' : 'Soumettre la demande'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnRequest;

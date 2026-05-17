import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { Edit, Trash2, Plus, Tag, Percent, Truck, Banknote, Loader2 } from 'lucide-react';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { formatPrice } from '../../hooks/usePaymentSettings';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const emptyForm = {
  code: '',
  discount_type: 'percentage',
  discount_value: '',
  min_purchase: '',
  max_discount: '',
  valid_from: '',
  valid_until: '',
  usage_limit: '1000',
  active: true,
  description: ''
};

const AdminCoupons = () => {
  const canWrite = useCanWrite('manage_coupons');
  const [couponsList, setCouponsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchCoupons = async () => {
    try {
      const res = await fetch(`${API_URL}/api/coupons/`);
      if (res.ok) {
        const data = await res.json();
        setCouponsList(data);
      }
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de charger les coupons", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  const openCreate = () => {
    setEditingCoupon(null);
    setFormData(emptyForm);
    setShowForm(true);
  };

  const openEdit = (coupon) => {
    setEditingCoupon(coupon);
    setFormData({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value: String(coupon.discount_value),
      min_purchase: String(coupon.min_purchase || ''),
      max_discount: String(coupon.max_discount || ''),
      valid_from: coupon.valid_from || '',
      valid_until: coupon.valid_until || '',
      usage_limit: String(coupon.usage_limit || '1000'),
      active: coupon.active,
      description: coupon.description || ''
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.code.trim() || (!formData.discount_value && formData.discount_type !== 'free_shipping')) {
      toast({ title: "Erreur", description: "Code et valeur sont obligatoires.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const body = {
        code: formData.code,
        discount_type: formData.discount_type,
        discount_value: parseFloat(formData.discount_value) || 0,
        min_purchase: parseFloat(formData.min_purchase) || 0,
        max_discount: parseFloat(formData.max_discount) || 0,
        valid_from: formData.valid_from,
        valid_until: formData.valid_until,
        usage_limit: parseInt(formData.usage_limit) || 1000,
        active: formData.active,
        description: formData.description
      };

      let res;
      if (editingCoupon) {
        res = await fetch(`${API_URL}/api/coupons/${editingCoupon.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      } else {
        res = await fetch(`${API_URL}/api/coupons/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
      }

      if (res.ok) {
        toast({ title: editingCoupon ? "Coupon mis à jour" : "Coupon créé avec succès" });
        setShowForm(false);
        setEditingCoupon(null);
        fetchCoupons();
      } else {
        const err = await res.json();
        toast({ title: "Erreur", description: err.detail || "Erreur serveur", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`${API_URL}/api/coupons/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast({ title: "Coupon supprimé" });
        setDeleteTarget(null);
        fetchCoupons();
      }
    } catch {
      toast({ title: "Erreur", description: "Erreur de connexion", variant: "destructive" });
    }
  };

  const toggleActive = async (coupon) => {
    try {
      const res = await fetch(`${API_URL}/api/coupons/${coupon.id}/toggle`, { method: 'POST' });
      if (res.ok) {
        fetchCoupons();
      }
    } catch {
      toast({ title: "Erreur", variant: "destructive" });
    }
  };

  const getDiscountLabel = (coupon) => {
    switch (coupon.discount_type) {
      case 'percentage': return `${coupon.discount_value}%`;
      case 'fixed': return formatPrice(coupon.discount_value);
      case 'free_shipping': return 'Livraison gratuite';
      default: return '';
    }
  };

  const getDiscountIcon = (type) => {
    switch (type) {
      case 'percentage': return <Percent className="w-5 h-5" />;
      case 'fixed': return <Banknote className="w-5 h-5" />;
      case 'free_shipping': return <Truck className="w-5 h-5" />;
      default: return <Tag className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light">Gestion des Coupons</h1>
          <p className="text-gray-600 mt-1">{couponsList.length} coupon{couponsList.length !== 1 ? 's' : ''} configuré{couponsList.length !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && (
        <Button onClick={openCreate} data-testid="create-coupon-btn">
          <Plus className="w-4 h-4 mr-2" />
          Créer un Coupon
        </Button>
        )}
      </div>

      {couponsList.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Tag className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">Aucun coupon créé</p>
          <p className="text-sm mt-1">Créez votre premier code promo</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {couponsList.map((coupon) => (
            <div
              key={coupon.id}
              className={`border rounded-lg p-5 space-y-3 transition-opacity ${!coupon.active ? 'opacity-50' : ''}`}
              data-testid={`coupon-card-${coupon.id}`}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-full ${coupon.active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                    {getDiscountIcon(coupon.discount_type)}
                  </div>
                  <div>
                    <span className="font-mono font-bold text-lg block">{coupon.code}</span>
                    <span className="text-sm font-semibold text-green-600">{getDiscountLabel(coupon)}</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  {canWrite && (
                  <>
                  <button
                    onClick={() => openEdit(coupon)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    data-testid={`edit-coupon-${coupon.id}`}
                  >
                    <Edit className="w-4 h-4 text-gray-500" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(coupon)}
                    className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                    data-testid={`delete-coupon-${coupon.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                  </>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm">
                {coupon.min_purchase > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Achat minimum</span>
                    <span>{formatPrice(coupon.min_purchase)}</span>
                  </div>
                )}
                {coupon.valid_until && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Expire le</span>
                    <span>{new Date(coupon.valid_until).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Utilisations</span>
                  <span>{coupon.usage_count || 0} / {coupon.usage_limit}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2 border-t">
                <button
                  onClick={() => toggleActive(coupon)}
                  className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer transition-colors ${
                    coupon.active
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                  data-testid={`toggle-coupon-${coupon.id}`}
                >
                  {coupon.active ? 'Actif' : 'Inactif'}
                </button>
                {coupon.description && (
                  <p className="text-xs text-gray-400 truncate ml-2 max-w-[150px]" title={coupon.description}>
                    {coupon.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingCoupon(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingCoupon ? 'Modifier le Coupon' : 'Créer un Coupon'}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="coupon-code">Code Promo *</Label>
              <Input
                id="coupon-code"
                value={formData.code}
                onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                placeholder="SOLDES20"
                required
                data-testid="form-coupon-code"
              />
            </div>

            <div>
              <Label>Type de Réduction *</Label>
              <div className="flex gap-2 mt-1.5">
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm rounded-md border-2 transition-all ${
                    formData.discount_type === 'percentage'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: 'percentage' }))}
                  data-testid="form-type-percentage"
                >
                  <Percent className="w-4 h-4" />
                  Pourcentage
                </button>
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm rounded-md border-2 transition-all ${
                    formData.discount_type === 'fixed'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: 'fixed' }))}
                  data-testid="form-type-fixed"
                >
                  <Banknote className="w-4 h-4" />
                  Montant fixe
                </button>
                <button
                  type="button"
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 text-sm rounded-md border-2 transition-all ${
                    formData.discount_type === 'free_shipping'
                      ? 'border-black bg-black text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                  onClick={() => setFormData(prev => ({ ...prev, discount_type: 'free_shipping' }))}
                  data-testid="form-type-shipping"
                >
                  <Truck className="w-4 h-4" />
                  Livraison gratuite
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {formData.discount_type !== 'free_shipping' && (
                <div>
                  <Label htmlFor="coupon-value">Valeur *</Label>
                  <Input
                    id="coupon-value"
                    inputMode="decimal"
                    value={formData.discount_value}
                    onChange={(e) => setFormData(prev => ({ ...prev, discount_value: e.target.value }))}
                    placeholder={formData.discount_type === 'percentage' ? '20' : '10'}
                    required
                    data-testid="form-coupon-value"
                  />
                </div>
              )}
              <div>
                <Label htmlFor="coupon-min">Montant Minimum d'achat</Label>
                <Input
                  id="coupon-min"
                  inputMode="decimal"
                  value={formData.min_purchase}
                  onChange={(e) => setFormData(prev => ({ ...prev, min_purchase: e.target.value }))}
                  placeholder="50"
                  data-testid="form-coupon-min"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="coupon-expires">Date d'Expiration</Label>
                <Input
                  id="coupon-expires"
                  type="date"
                  value={formData.valid_until}
                  onChange={(e) => setFormData(prev => ({ ...prev, valid_until: e.target.value }))}
                  data-testid="form-coupon-expires"
                />
              </div>
              <div>
                <Label htmlFor="coupon-limit">Limite d'utilisations</Label>
                <Input
                  id="coupon-limit"
                  inputMode="numeric"
                  value={formData.usage_limit}
                  onChange={(e) => setFormData(prev => ({ ...prev, usage_limit: e.target.value }))}
                  placeholder="1000"
                  data-testid="form-coupon-limit"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="coupon-active"
                checked={formData.active}
                onChange={(e) => setFormData(prev => ({ ...prev, active: e.target.checked }))}
                className="w-4 h-4 rounded"
              />
              <Label htmlFor="coupon-active" className="cursor-pointer">Coupon Actif</Label>
            </div>

            <div>
              <Label htmlFor="coupon-desc">Description</Label>
              <Textarea
                id="coupon-desc"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description du coupon"
                rows={2}
                data-testid="form-coupon-desc"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditingCoupon(null); }}>
                Annuler
              </Button>
              <Button type="submit" disabled={submitting} data-testid="form-coupon-submit">
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingCoupon ? 'Mettre à jour' : 'Créer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer ce coupon ?</DialogTitle>
          </DialogHeader>
          <p className="text-gray-600 py-2">
            Le coupon <strong className="font-mono">{deleteTarget?.code}</strong> sera supprimé définitivement.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Annuler</Button>
            <Button variant="destructive" onClick={handleDelete} data-testid="confirm-delete-coupon">
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCoupons;

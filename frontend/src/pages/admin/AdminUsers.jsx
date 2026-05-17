import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import { toast } from '../../hooks/use-toast';
import { usersApi, settingsApi } from '../../services/api';
import {
  UserPlus, Users, Shield, Edit, Trash2, Eye, EyeOff, Package,
  ShoppingCart, BarChart3, Settings, AlertCircle, Lock, Save, BookOpen, Pencil
} from 'lucide-react';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

// Permissions available
const PERMISSIONS = [
  { key: 'dashboard', label: 'Tableau de bord', icon: BarChart3, description: 'Accéder au tableau de bord principal' },
  { key: 'manage_orders', label: 'Commandes', icon: ShoppingCart, description: 'Commandes clients' },
  { key: 'view_sales', label: 'Statistiques Ventes', icon: BarChart3, description: 'Statistiques de ventes' },
  { key: 'view_customers', label: 'Clients', icon: Users, description: 'Informations clients' },
  { key: 'manage_products', label: 'Produits', icon: Package, description: 'Gestion des produits' },
  { key: 'manage_inventory', label: "Gestion d'Inventaire", icon: Package, description: 'Stock par variants' },
  { key: 'manage_categories', label: 'Catégories', icon: Package, description: 'Catégories de produits' },
  { key: 'manage_attributes', label: 'Attributs', icon: Settings, description: 'Couleurs, tailles, marques' },
  { key: 'manage_promotions', label: 'Promotions', icon: ShoppingCart, description: 'Gestion des promotions' },
  { key: 'manage_coupons', label: 'Coupons', icon: ShoppingCart, description: 'Codes promo' },
  { key: 'manage_returns', label: 'Retours', icon: Package, description: 'Retours et remboursements' },
  { key: 'manage_newsletter', label: 'Newsletter', icon: Users, description: 'Abonnés et envois' },
  { key: 'manage_notifications', label: 'Notifications', icon: Settings, description: 'Telegram et WhatsApp' },
  { key: 'manage_payment', label: 'Paiement & Devise', icon: Settings, description: 'Méthodes de paiement' },
  { key: 'manage_style', label: 'Style & Apparence', icon: Settings, description: 'Apparence du site' },
  { key: 'manage_pages', label: 'Gestion des Pages', icon: Settings, description: 'Pages statiques' },
  { key: 'manage_admins', label: 'Administrateurs', icon: Shield, description: 'Comptes admin' },
  { key: 'manage_site_settings', label: 'Paramètres du Site', icon: Settings, description: 'Identité et paramètres' },
];

// --- Permission helpers ---
// Format: "key:rw" or "key:r". Old format "key" = full access (rw).
const parsePermissions = (permsArray) => {
  const map = {};
  (permsArray || []).forEach(p => {
    if (typeof p !== 'string') return;
    if (p.endsWith(':r')) map[p.slice(0, -2)] = 'r';
    else if (p.endsWith(':rw')) map[p.slice(0, -3)] = 'rw';
    else map[p] = 'rw'; // old format = full access
  });
  return map;
};

const serializePermissions = (map) => {
  return Object.entries(map).map(([key, level]) => `${key}:${level}`);
};

// Check if user has a permission (with optional level)
export const checkAdminPermission = (permission, requiredLevel = 'r') => {
  const currentUser = JSON.parse(localStorage.getItem('bestShopUser') || '{}');
  if (!currentUser || !['admin', 'super_admin'].includes(currentUser.role)) return false;
  if (currentUser.email === 'admin@bestshop.com') return true;
  const perms = parsePermissions(currentUser.permissions || []);
  const level = perms[permission];
  if (!level) return false;
  if (requiredLevel === 'r') return true; // has at least read
  return level === 'rw'; // needs write
};

export const hasWritePermission = (permission) => checkAdminPermission(permission, 'rw');

// --- Level badge component ---
const LevelBadge = ({ level }) => {
  if (level === 'rw') return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-700" data-testid="badge-rw">
      <Pencil className="w-2.5 h-2.5" />Lecture+Écriture
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700" data-testid="badge-r">
      <BookOpen className="w-2.5 h-2.5" />Lecture seule
    </span>
  );
};

// --- Permission selector with level ---
const PermissionSelector = ({ permissionsMap, onChange }) => {
  const toggle = (key) => {
    const next = { ...permissionsMap };
    if (next[key]) { delete next[key]; }
    else { next[key] = 'rw'; }
    onChange(next);
  };

  const setLevel = (key, level) => {
    onChange({ ...permissionsMap, [key]: level });
  };

  return (
    <div className="space-y-1.5 max-h-[340px] overflow-y-auto pr-1" data-testid="permission-selector">
      {PERMISSIONS.map(perm => {
        const Icon = perm.icon;
        const active = !!permissionsMap[perm.key];
        const level = permissionsMap[perm.key] || 'rw';
        return (
          <div key={perm.key} className={`border rounded-lg transition-all ${active ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200'}`}>
            <div
              className="flex items-center gap-2 p-2 cursor-pointer"
              onClick={() => toggle(perm.key)}
              data-testid={`perm-toggle-${perm.key}`}
            >
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${active ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                {active && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>}
              </div>
              <Icon className={`w-4 h-4 flex-shrink-0 ${active ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{perm.label}</p>
                <p className="text-[10px] text-gray-400 truncate">{perm.description}</p>
              </div>
            </div>
            {active && (
              <div className="flex gap-2 px-2 pb-2 pl-8" data-testid={`perm-level-${perm.key}`}>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLevel(perm.key, 'r'); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    level === 'r' ? 'bg-amber-200 text-amber-800 ring-1 ring-amber-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  data-testid={`perm-${perm.key}-read`}
                >
                  <BookOpen className="w-3 h-3" />Lecture
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLevel(perm.key, 'rw'); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium transition-all ${
                    level === 'rw' ? 'bg-emerald-200 text-emerald-800 ring-1 ring-emerald-400' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  data-testid={`perm-${perm.key}-readwrite`}
                >
                  <Pencil className="w-3 h-3" />Lecture + Écriture
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const AdminUsers = () => {
  const canWrite = useCanWrite('manage_admins');
  const [admins, setAdmins] = useState([]);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [securitySettings, setSecuritySettings] = useState({ deletion_code: '0000', require_code_for_deletion: true });
  const [newDeletionCode, setNewDeletionCode] = useState('');
  const [confirmNewCode, setConfirmNewCode] = useState('');
  const [isEditingCode, setIsEditingCode] = useState(false);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({ email: '', password: '', firstName: '', lastName: '', permissionsMap: {} });

  const loadAdmins = async () => {
    try {
      const data = await usersApi.getAll({ role: 'admin' });
      const dbAdmins = (data.items || []).map(u => ({
        id: u.id,
        email: u.email,
        firstName: u.name?.split(' ')[0] || u.name || '',
        lastName: u.name?.split(' ').slice(1).join(' ') || '',
        role: u.email === 'admin@bestshop.com' ? 'super_admin' : (u.role || 'admin'),
        permissions: u.permissions || [],
        permissionsMap: parsePermissions(u.permissions || []),
        createdAt: u.created_at,
        isActive: u.status === 'active'
      }));
      setAdmins(dbAdmins);
    } catch (error) {
      console.error('Error loading admins:', error);
    }
    setLoading(false);
  };

  useEffect(() => { loadAdmins(); loadSecuritySettings(); }, []);

  const loadSecuritySettings = async () => {
    try { const s = await settingsApi.getSecurity(); setSecuritySettings(s); } catch (e) { /* fallback */ }
  };

  const handleUpdateDeletionCode = async () => {
    if (!newDeletionCode || newDeletionCode.length < 4) {
      toast({ title: "Code invalide", description: "Le code doit contenir au moins 4 caractères", variant: "destructive" });
      return;
    }
    if (newDeletionCode !== confirmNewCode) {
      toast({ title: "Codes différents", description: "Les deux codes ne correspondent pas", variant: "destructive" });
      return;
    }
    try {
      await settingsApi.updateSecurity({ deletion_code: newDeletionCode, require_code_for_deletion: true });
      toast({ title: "Code mis à jour", description: "Le code de confirmation a été modifié avec succès" });
      setSecuritySettings({ ...securitySettings, deletion_code: newDeletionCode });
      setNewDeletionCode(''); setConfirmNewCode(''); setIsEditingCode(false);
    } catch (error) {
      toast({ title: "Erreur", description: "Impossible de mettre à jour le code", variant: "destructive" });
    }
  };

  const resetForm = () => { setFormData({ email: '', password: '', firstName: '', lastName: '', permissionsMap: {} }); setShowPassword(false); };

  const handleCreate = async () => {
    if (!formData.email || !formData.password || !formData.firstName) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires.", variant: "destructive" });
      return;
    }
    try {
      await usersApi.createAdmin({
        email: formData.email, password: formData.password,
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        permissions: serializePermissions(formData.permissionsMap)
      });
      toast({ title: "Compte créé", description: `Le compte admin pour ${formData.firstName} a été créé avec succès.` });
      setIsCreateOpen(false); resetForm(); loadAdmins();
    } catch (error) {
      toast({ title: "Erreur", description: error.message || "Impossible de créer le compte.", variant: "destructive" });
    }
  };

  const handleEdit = async () => {
    if (!selectedAdmin) return;
    try {
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        permissions: serializePermissions(formData.permissionsMap)
      };
      if (formData.password) updateData.password = formData.password;
      await usersApi.update(selectedAdmin.id, updateData);
      toast({ title: "Compte modifié", description: "Les modifications ont été enregistrées." });
      setIsEditOpen(false); setSelectedAdmin(null); resetForm(); loadAdmins();
    } catch (error) {
      toast({ title: "Erreur", description: error.message || "Impossible de modifier le compte.", variant: "destructive" });
    }
  };

  const handleDelete = async (admin) => {
    if (admin.role === 'super_admin') { toast({ title: "Action impossible", description: "Vous ne pouvez pas supprimer le super admin.", variant: "destructive" }); return; }
    try {
      await usersApi.delete(admin.id);
      toast({ title: "Compte supprimé", description: `Le compte de ${admin.firstName} a été supprimé.` });
      loadAdmins();
    } catch (error) {
      toast({ title: "Erreur", description: error.message || "Impossible de supprimer le compte.", variant: "destructive" });
    }
  };

  const handleToggleActive = async (admin) => {
    if (admin.role === 'super_admin') { toast({ title: "Action impossible", description: "Vous ne pouvez pas désactiver le super admin.", variant: "destructive" }); return; }
    try {
      const newStatus = admin.isActive ? 'inactive' : 'active';
      await usersApi.update(admin.id, { status: newStatus });
      toast({ title: admin.isActive ? "Compte désactivé" : "Compte activé" });
      loadAdmins();
    } catch (error) {
      toast({ title: "Erreur", description: error.message || "Impossible de modifier le statut.", variant: "destructive" });
    }
  };

  const openEdit = (admin) => {
    setSelectedAdmin(admin);
    setFormData({ email: admin.email, password: '', firstName: admin.firstName, lastName: admin.lastName, permissionsMap: parsePermissions(admin.permissions) });
    setIsEditOpen(true);
  };

  const formatDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div data-testid="admin-users-page">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Gestion des Administrateurs</h1>
          <p className="text-gray-600 mt-2">Créez et gérez les comptes administrateurs avec différents privilèges</p>
        </div>
        {canWrite && (
          <Button onClick={() => { resetForm(); setIsCreateOpen(true); }} data-testid="create-admin-btn">
            <UserPlus className="w-4 h-4 mr-2" />Nouvel Admin
          </Button>
        )}
      </div>

      {/* Privileges info card */}
      <Card className="mb-8 bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Shield className="w-6 h-6 text-blue-600 flex-shrink-0 mt-1" />
            <div>
              <p className="font-semibold text-blue-900 mb-1">Privilèges disponibles</p>
              <p className="text-xs text-blue-700 mb-3">Chaque privilège peut être attribué en <span className="font-semibold text-amber-700">Lecture seule</span> ou en <span className="font-semibold text-emerald-700">Lecture + Écriture</span>.</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {PERMISSIONS.map(perm => {
                  const Icon = perm.icon;
                  return (
                    <div key={perm.key} className="flex items-center gap-2 text-sm text-blue-800">
                      <Icon className="w-4 h-4" /><span>{perm.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security Settings */}
      <Card className="mb-8 border-orange-200">
        <CardHeader className="bg-orange-50">
          <div className="flex items-center gap-3">
            <Lock className="w-6 h-6 text-orange-600" />
            <div>
              <CardTitle>Paramètres de Sécurité</CardTitle>
              <p className="text-sm text-gray-600 mt-1">Code de confirmation pour les suppressions</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {!isEditingCode ? (
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium">Code de confirmation actuel</p>
                <p className="text-sm text-gray-600 mt-1">Requis pour toutes les suppressions dans l'interface admin</p>
                <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />Masqué : {securitySettings.deletion_code?.replace(/./g, '\u2022') || '\u2022\u2022\u2022\u2022'}
                </p>
              </div>
              <Button onClick={() => setIsEditingCode(true)} variant="outline" disabled={!canWrite}><Edit className="w-4 h-4 mr-2" />Modifier</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 flex items-center gap-2"><AlertCircle className="w-4 h-4" /><strong>Important :</strong> Conservez ce code en lieu sûr.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><Label>Nouveau code (min. 4 caractères)</Label><Input type="password" placeholder="Entrez le nouveau code" value={newDeletionCode} onChange={(e) => setNewDeletionCode(e.target.value)} className="mt-1" /></div>
                <div><Label>Confirmer le nouveau code</Label><Input type="password" placeholder="Confirmez le code" value={confirmNewCode} onChange={(e) => setConfirmNewCode(e.target.value)} className="mt-1" /></div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setIsEditingCode(false); setNewDeletionCode(''); setConfirmNewCode(''); }}>Annuler</Button>
                <Button onClick={handleUpdateDeletionCode} disabled={!newDeletionCode || !confirmNewCode} className="bg-orange-600 hover:bg-orange-700"><Save className="w-4 h-4 mr-2" />Enregistrer</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Admins List */}
      <Card>
        <CardHeader><CardTitle>Comptes Administrateurs ({admins.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-4" data-testid="admins-list">
            {admins.map((admin) => {
              const pMap = parsePermissions(admin.permissions);
              return (
                <div key={admin.id} className={`p-4 border rounded-lg ${admin.isActive ? 'bg-white' : 'bg-gray-100 opacity-60'}`} data-testid={`admin-card-${admin.email}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${admin.role === 'super_admin' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                        <Shield className={`w-6 h-6 ${admin.role === 'super_admin' ? 'text-purple-600' : 'text-blue-600'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{admin.firstName} {admin.lastName}</p>
                          {admin.role === 'super_admin' && <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded-full">Super Admin</span>}
                          {!admin.isActive && <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs rounded-full">Désactivé</span>}
                        </div>
                        <p className="text-sm text-gray-500">{admin.email}</p>
                        <p className="text-xs text-gray-400">Créé le {formatDate(admin.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {admin.role !== 'super_admin' && canWrite && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => handleToggleActive(admin)} data-testid={`toggle-active-${admin.email}`}>{admin.isActive ? 'Désactiver' : 'Activer'}</Button>
                          <Button variant="ghost" size="sm" onClick={() => openEdit(admin)} data-testid={`edit-admin-${admin.email}`}><Edit className="w-4 h-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDelete(admin)} className="text-red-500 hover:text-red-700" data-testid={`delete-admin-${admin.email}`}><Trash2 className="w-4 h-4" /></Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Privilèges :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {admin.role === 'super_admin' ? (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">Tous les privilèges (Lecture + Écriture)</span>
                      ) : (
                        Object.entries(pMap).length > 0 ? Object.entries(pMap).map(([key, level]) => {
                          const perm = PERMISSIONS.find(p => p.key === key);
                          if (!perm) return null;
                          const Icon = perm.icon;
                          return (
                            <span key={key} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded" data-testid={`perm-badge-${key}`}>
                              <Icon className="w-3 h-3" />{perm.label} <LevelBadge level={level} />
                            </span>
                          );
                        }) : <span className="text-xs text-gray-400 italic">Aucun privilège</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="create-admin-dialog">
          <DialogHeader><DialogTitle>Créer un compte administrateur</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label htmlFor="firstName">Prénom *</Label><Input id="firstName" value={formData.firstName} onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))} className="mt-1" data-testid="create-firstname" /></div>
              <div><Label htmlFor="lastName">Nom</Label><Input id="lastName" value={formData.lastName} onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))} className="mt-1" data-testid="create-lastname" /></div>
            </div>
            <div><Label htmlFor="email">Email *</Label><Input id="email" type="email" value={formData.email} onChange={(e) => setFormData(p => ({ ...p, email: e.target.value }))} className="mt-1" data-testid="create-email" /></div>
            <div>
              <Label htmlFor="password">Mot de passe *</Label>
              <div className="relative"><Input id="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} className="mt-1 pr-10" data-testid="create-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Privilèges <span className="text-xs text-gray-400 ml-1">— sélectionnez le niveau d'accès pour chaque module</span></Label>
              <PermissionSelector permissionsMap={formData.permissionsMap} onChange={(m) => setFormData(p => ({ ...p, permissionsMap: m }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Annuler</Button>
            <Button onClick={handleCreate} data-testid="confirm-create-admin-btn">Créer le compte</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="edit-admin-dialog">
          <DialogHeader><DialogTitle>Modifier le compte</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div><Label>Prénom</Label><Input value={formData.firstName} onChange={(e) => setFormData(p => ({ ...p, firstName: e.target.value }))} className="mt-1" data-testid="edit-firstname" /></div>
              <div><Label>Nom</Label><Input value={formData.lastName} onChange={(e) => setFormData(p => ({ ...p, lastName: e.target.value }))} className="mt-1" data-testid="edit-lastname" /></div>
            </div>
            <div><Label>Email</Label><Input type="email" value={formData.email} disabled className="mt-1 bg-gray-100" /></div>
            <div>
              <Label>Nouveau mot de passe (optionnel)</Label>
              <div className="relative"><Input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={(e) => setFormData(p => ({ ...p, password: e.target.value }))} placeholder="Laisser vide pour ne pas modifier" className="mt-1 pr-10" data-testid="edit-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">{showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Privilèges <span className="text-xs text-gray-400 ml-1">— sélectionnez le niveau d'accès</span></Label>
              <PermissionSelector permissionsMap={formData.permissionsMap} onChange={(m) => setFormData(p => ({ ...p, permissionsMap: m }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>Annuler</Button>
            <Button onClick={handleEdit} data-testid="confirm-edit-admin-btn">Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;

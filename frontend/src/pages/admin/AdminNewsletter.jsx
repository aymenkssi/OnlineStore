import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { 
  Mail, 
  Users, 
  Send, 
  Settings, 
  Loader2, 
  UserMinus, 
  UserPlus,
  Trash2
} from 'lucide-react';
import { DeleteConfirmationDialog } from '../../components/DeleteConfirmationDialog';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const AdminNewsletter = () => {
  const canWrite = useCanWrite('manage_newsletter');
  const [config, setConfig] = useState({
    subject_new_product: '',
    subject_promotion: '',
    header_text: '',
    footer_text: '',
    primary_color: '#DC2626',
    sender_email: 'onboarding@resend.dev',
    password_reset_sender_email: 'onboarding@resend.dev'
  });
  const [subscribers, setSubscribers] = useState([]);
  const [stats, setStats] = useState({ total: 0, active: 0, unsubscribed: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  
  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    subscriberId: null,
    subscriberEmail: ''
  });
  
  const [newsletter, setNewsletter] = useState({
    subject: '',
    title: '',
    content: '',
    button_text: 'Découvrir',
    button_url: ''
  });

  // Fetch data on load
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [configRes, subscribersRes, statsRes] = await Promise.all([
          fetch(`${API_URL}/api/newsletter/config`),
          fetch(`${API_URL}/api/newsletter/subscribers?active_only=${!showInactive}`),
          fetch(`${API_URL}/api/newsletter/stats`)
        ]);
        
        if (configRes.ok) {
          const configData = await configRes.json();
          setConfig(configData);
        }
        
        if (subscribersRes.ok) {
          const subscribersData = await subscribersRes.json();
          setSubscribers(subscribersData);
        }
        
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [showInactive]);

  const handleSaveConfig = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/newsletter/config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(config)
      });
      
      if (response.ok) {
        toast({ title: "Configuration sauvegardée", description: "Les paramètres de la newsletter ont été mis à jour" });
      } else {
        const err = await response.json().catch(() => ({}));
        toast({ title: "Erreur", description: err.detail || "Impossible de sauvegarder", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    }
  };

  const handleSendNewsletter = async () => {
    if (!newsletter.subject || !newsletter.title || !newsletter.content) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    
    if (!window.confirm(`Envoyer la newsletter à ${stats.active} abonnés ?`)) {
      return;
    }
    
    setSending(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/newsletter/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newsletter)
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast({ 
          title: "Newsletter envoyée", 
          description: `Envoyée à ${data.sent} abonnés${data.failed > 0 ? ` (${data.failed} échecs)` : ''}`
        });
        setNewsletter({ subject: '', title: '', content: '', button_text: 'Découvrir', button_url: '' });
      } else {
        toast({ title: "Erreur", description: data.detail || "Impossible d'envoyer", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Erreur", description: "Une erreur s'est produite", variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleDeleteSubscriber = async (code) => {
    try {
      const response = await fetch(`${API_URL}/api/newsletter/subscribers/${deleteDialog.subscriberId}`, {
        method: 'DELETE',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ code })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Erreur de suppression");
      }
      
      toast({ 
        title: "Abonné supprimé", 
        description: `${deleteDialog.subscriberEmail} a été supprimé avec succès` 
      });
      
      // Refresh page
      window.location.reload();
      
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const openDeleteDialog = (subscriber) => {
    console.log('openDeleteDialog called with:', subscriber);
    setDeleteDialog({
      isOpen: true,
      subscriberId: subscriber.id,
      subscriberEmail: subscriber.email
    });
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-light">Gestion de la Newsletter</h1>
          <p className="text-gray-600 mt-2">Gérez vos abonnés et envoyez des newsletters</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total abonnés</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <UserPlus className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Abonnés actifs</p>
                <p className="text-2xl font-bold">{stats.active}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-full">
                <UserMinus className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Désabonnés</p>
                <p className="text-2xl font-bold">{stats.unsubscribed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Send Newsletter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Envoyer une Newsletter
            </CardTitle>
            <CardDescription>Composez et envoyez une newsletter à tous les abonnés actifs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject">Sujet de l'email *</Label>
              <Input
                id="subject"
                value={newsletter.subject}
                onChange={(e) => setNewsletter({ ...newsletter, subject: e.target.value })}
                placeholder="Ex: Découvrez nos nouveautés !"
              />
            </div>
            
            <div>
              <Label htmlFor="title">Titre principal *</Label>
              <Input
                id="title"
                value={newsletter.title}
                onChange={(e) => setNewsletter({ ...newsletter, title: e.target.value })}
                placeholder="Ex: Nouvelles collections disponibles"
              />
            </div>
            
            <div>
              <Label htmlFor="content">Contenu *</Label>
              <textarea
                id="content"
                value={newsletter.content}
                onChange={(e) => setNewsletter({ ...newsletter, content: e.target.value })}
                placeholder="Écrivez le contenu de votre newsletter..."
                className="w-full px-3 py-2 border border-gray-300 rounded min-h-[120px] focus:outline-none focus:border-black"
              />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="button_text">Texte du bouton</Label>
                <Input
                  id="button_text"
                  value={newsletter.button_text}
                  onChange={(e) => setNewsletter({ ...newsletter, button_text: e.target.value })}
                  placeholder="Découvrir"
                />
              </div>
              <div>
                <Label htmlFor="button_url">URL du bouton</Label>
                <Input
                  id="button_url"
                  value={newsletter.button_url}
                  onChange={(e) => setNewsletter({ ...newsletter, button_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            </div>
            {canWrite && (
            <Button 
              onClick={handleSendNewsletter} 
              disabled={sending || stats.active === 0}
              className="w-full"
            >
              {sending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Envoi en cours...</>
              ) : (
                <><Mail className="w-4 h-4 mr-2" /> Envoyer à {stats.active} abonnés</>
              )}
            </Button>
            )}
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Configuration des emails
            </CardTitle>
            <CardDescription>Personnalisez les emails automatiques (nouveau produit, promotion)</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="subject_new_product">Sujet - Nouveau produit</Label>
              <Input
                id="subject_new_product"
                value={config.subject_new_product}
                onChange={(e) => setConfig({ ...config, subject_new_product: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="subject_promotion">Sujet - Nouvelle promotion</Label>
              <Input
                id="subject_promotion"
                value={config.subject_promotion}
                onChange={(e) => setConfig({ ...config, subject_promotion: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="header_text">Texte d'en-tête</Label>
              <Input
                id="header_text"
                value={config.header_text}
                onChange={(e) => setConfig({ ...config, header_text: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="footer_text">Texte de pied de page</Label>
              <Input
                id="footer_text"
                value={config.footer_text}
                onChange={(e) => setConfig({ ...config, footer_text: e.target.value })}
              />
            </div>
            
            <div>
              <Label htmlFor="primary_color">Couleur principale</Label>
              <div className="flex gap-2">
                <Input
                  id="primary_color"
                  type="color"
                  value={config.primary_color}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={config.primary_color}
                  onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="sender_email">Adresse email émettrice</Label>
              <Input
                id="sender_email"
                type="email"
                value={config.sender_email}
                onChange={(e) => setConfig({ ...config, sender_email: e.target.value })}
                placeholder="votre-email@votredomaine.com"
                data-testid="newsletter-sender-email-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'adresse email qui apparaîtra comme expéditeur des newsletters
              </p>
            </div>

            <div>
              <Label htmlFor="password_reset_sender_email">
                Expéditeur des emails de réinitialisation de mot de passe
              </Label>
              <Input
                id="password_reset_sender_email"
                type="email"
                value={config.password_reset_sender_email || ''}
                onChange={(e) => setConfig({ ...config, password_reset_sender_email: e.target.value })}
                placeholder="no-reply@votredomaine.com"
                data-testid="password-reset-sender-email-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                L'adresse email qui apparaîtra comme expéditeur (from) des emails de réinitialisation de mot de passe
              </p>
            </div>
            
            {/* Preview */}
            <div 
              className="p-4 rounded text-white text-center"
              style={{ backgroundColor: config.primary_color }}
            >
              <p className="font-bold">{config.header_text || 'BEST SHOP'}</p>
              <p className="text-sm opacity-80">{config.footer_text || 'Merci de votre fidélité !'}</p>
            </div>
            {canWrite && (
            <Button onClick={handleSaveConfig} className="w-full">
              Sauvegarder la configuration
            </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscribers List */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Liste des abonnés</CardTitle>
              <CardDescription>Gérez vos abonnés à la newsletter</CardDescription>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Afficher les désabonnés
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {subscribers.length === 0 ? (
            <p className="text-center text-gray-500 py-8">Aucun abonné pour le moment</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Email</th>
                    <th className="text-left py-3 px-4">Nom</th>
                    <th className="text-left py-3 px-4">Date d'inscription</th>
                    <th className="text-left py-3 px-4">Statut</th>
                    <th className="text-left py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{subscriber.email}</td>
                      <td className="py-3 px-4">{subscriber.name || '-'}</td>
                      <td className="py-3 px-4">
                        {subscriber.subscribed_at ? new Date(subscriber.subscribed_at).toLocaleDateString('fr-FR') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          subscriber.active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {subscriber.active ? 'Actif' : 'Désabonné'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {canWrite && (
                        <button
                          onClick={() => openDeleteDialog(subscriber)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Supprimer l'abonné"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) => setDeleteDialog({ isOpen: open, subscriberId: null, subscriberEmail: '' })}
        onConfirm={handleDeleteSubscriber}
        title={deleteDialog.subscriberEmail}
        itemInfo={{ email: deleteDialog.subscriberEmail }}
        warningMessage="Cet abonné sera définitivement supprimé de la liste"
      />
    </div>
  );
};

export default AdminNewsletter;

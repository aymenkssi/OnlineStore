import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, saveCurrentUser, logout } from '../mock/mockData';
import { usersApi } from '../services/api';
import { toast } from '../hooks/use-toast';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, Mail, Phone, MapPin, Calendar, Save, ArrowLeft, Loader2 } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'France',
    created_at: '',
    role: ''
  });
  const [originalEmail, setOriginalEmail] = useState('');

  useEffect(() => {
    if (!currentUser?.email) {
      navigate('/login');
      return;
    }
    const loadProfile = async () => {
      try {
        const data = await usersApi.getProfile(currentUser.email);
        setProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          address: data.address || '',
          city: data.city || '',
          postal_code: data.postal_code || '',
          country: data.country || 'France',
          created_at: data.created_at || '',
          role: data.role || currentUser.role || ''
        });
        setOriginalEmail(data.email);
      } catch (error) {
        console.error('Error loading profile:', error);
      }
      setLoading(false);
    };
    loadProfile();
  }, [currentUser?.email, currentUser?.role, navigate]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const emailChanged = profile.email !== originalEmail;
      
      // Regular profile update via backend API (works for admins and customers)
      await usersApi.updateProfile(originalEmail, {
        name: profile.name,
        phone: profile.phone || null,
        address: profile.address || null,
        city: profile.city || null,
        postal_code: profile.postal_code || null,
        country: profile.country || null,
        ...(emailChanged ? { email: profile.email } : {})
      });

      // Update cached user (localStorage)
      saveCurrentUser({ ...currentUser, name: profile.name, email: profile.email });

      if (emailChanged) {
        toast({
          title: "Email mis à jour",
          description: "Votre adresse email a été modifiée avec succès. Veuillez vous reconnecter.",
          duration: 3000
        });
        setTimeout(() => {
          logout();
          navigate('/');
        }, 2000);
        setSaving(false);
        return;
      }

      toast({
        title: "Profil mis à jour",
        description: "Vos informations ont été enregistrées avec succès."
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || "Impossible de mettre à jour le profil.",
        variant: "destructive"
      });
    }
    setSaving(false);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'long', year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
          data-testid="profile-back-btn"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-black text-white rounded-full flex items-center justify-center text-2xl font-bold">
                {(profile.name || '').split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase() || 'U'}
              </div>
              <div>
                <CardTitle className="text-2xl">Mon Profil</CardTitle>
                <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                  <Calendar className="w-4 h-4" />
                  Membre depuis {formatDate(profile.created_at)}
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Personal Info */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom complet</Label>
                    <Input
                      id="name"
                      value={profile.name}
                      onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                      data-testid="profile-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                      className={(profile.role === 'admin' || currentUser?.role === 'admin') ? '' : 'bg-gray-100'}
                      disabled={profile.role !== 'admin' && currentUser?.role !== 'admin'}
                      data-testid="profile-email"
                    />
                    {(profile.role === 'admin' || currentUser?.role === 'admin') && (
                      <p className="text-xs text-orange-600 mt-1">
                        ⚠️ Modifier l'email nécessitera une reconnexion
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Phone className="w-5 h-5" />
                  Contact
                </h3>
                <div>
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={profile.phone}
                    onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+33 6 XX XX XX XX"
                    data-testid="profile-phone"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Adresse
                </h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                      id="address"
                      value={profile.address}
                      onChange={(e) => setProfile(p => ({ ...p, address: e.target.value }))}
                      placeholder="123 Rue Exemple"
                      data-testid="profile-address"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">Ville</Label>
                      <Input
                        id="city"
                        value={profile.city}
                        onChange={(e) => setProfile(p => ({ ...p, city: e.target.value }))}
                        placeholder="Paris"
                        data-testid="profile-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="postal_code">Code postal</Label>
                      <Input
                        id="postal_code"
                        value={profile.postal_code}
                        onChange={(e) => setProfile(p => ({ ...p, postal_code: e.target.value }))}
                        placeholder="75001"
                        data-testid="profile-postal-code"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="country">Pays</Label>
                    <Input
                      id="country"
                      value={profile.country}
                      onChange={(e) => setProfile(p => ({ ...p, country: e.target.value }))}
                      data-testid="profile-country"
                    />
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full py-6" disabled={saving} data-testid="profile-save-btn">
                {saving ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enregistrement...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Enregistrer les modifications</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Profile;

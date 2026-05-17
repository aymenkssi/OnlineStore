import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { Lock, CheckCircle, XCircle, Eye, EyeOff, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(token ? 'form' : 'error');
  const [errorMsg, setErrorMsg] = useState(token ? '' : 'Lien de réinitialisation invalide ou manquant.');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: "Erreur", description: "Le mot de passe doit faire au moins 8 caractères", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setStatus('success');
        toast({ title: "Mot de passe réinitialisé", description: data.message });
      } else {
        setStatus('error');
        setErrorMsg(data.detail || "Erreur lors de la réinitialisation.");
      }
    } catch (err) {
      setStatus('error');
      setErrorMsg("Erreur de connexion au serveur.");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="reset-password-page">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
        {status === 'form' && (
          <>
            <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Nouveau mot de passe</h1>
            <p className="text-gray-500">Choisissez un nouveau mot de passe pour votre compte.</p>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <Label htmlFor="new-password">Nouveau mot de passe</Label>
                <div className="relative mt-1">
                  <Input id="new-password" type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 caractères" required minLength={8} className="pr-10" data-testid="reset-new-password" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirm-password">Confirmer le mot de passe</Label>
                <Input id="confirm-password" type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Retapez le mot de passe" required minLength={8} className="mt-1" data-testid="reset-confirm-password" />
              </div>
              <p className="text-xs text-gray-400">Le mot de passe ne doit pas être identique aux 5 derniers utilisés.</p>
              <Button type="submit" className="w-full" disabled={loading} data-testid="reset-submit-btn">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Réinitialisation...</> : 'Réinitialiser le mot de passe'}
              </Button>
            </form>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800" data-testid="reset-success-title">Mot de passe réinitialisé !</h1>
            <p className="text-gray-500">Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter.</p>
            <Button onClick={() => navigate('/')} className="w-full" data-testid="reset-go-home-btn">Retour à l'accueil</Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800" data-testid="reset-error-title">Erreur</h1>
            <p className="text-gray-500" data-testid="reset-error-message">{errorMsg}</p>
            <div className="space-y-2">
              <Button onClick={() => navigate('/forgot-password')} className="w-full" data-testid="reset-retry-btn">Demander un nouveau lien</Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full">Retour à l'accueil</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;

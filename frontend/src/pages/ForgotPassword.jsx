import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { Mail, ArrowLeft, CheckCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/users/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        toast({ title: "Email envoyé", description: data.message });
      } else {
        toast({ title: "Erreur", description: data.detail || "Une erreur est survenue", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Erreur", description: "Erreur de connexion au serveur", variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="forgot-password-page">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {!sent ? (
          <>
            <button onClick={() => navigate(-1)} className="flex items-center text-gray-500 hover:text-black mb-6 text-sm transition-colors" data-testid="back-btn">
              <ArrowLeft className="w-4 h-4 mr-1" />Retour
            </button>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-800">Mot de passe oublié ?</h1>
              <p className="text-gray-500 mt-2">Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Adresse email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" required className="mt-1" data-testid="forgot-email-input" />
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="forgot-submit-btn">
                {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Envoi en cours...</> : 'Envoyer le lien de réinitialisation'}
              </Button>
            </form>
          </>
        ) : (
          <div className="text-center space-y-4" data-testid="forgot-success">
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800">Email envoyé !</h1>
            <p className="text-gray-500">Si un compte existe avec l'adresse <strong>{email}</strong>, vous recevrez un email avec un lien de réinitialisation.</p>
            <p className="text-sm text-gray-400">Le lien est valable 1 heure. Vérifiez aussi vos spams.</p>
            <div className="pt-4 space-y-2">
              <Button onClick={() => { setSent(false); setEmail(''); }} variant="outline" className="w-full" data-testid="forgot-retry-btn">Renvoyer un email</Button>
              <Button onClick={() => navigate('/')} className="w-full" data-testid="forgot-home-btn">Retour à l'accueil</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

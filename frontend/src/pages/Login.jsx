import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveCurrentUser } from '../mock/mockData';
import { usersApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      const user = await usersApi.login({
        email: formData.email,
        password: formData.password
      });

      // Store JWT for authenticated API calls (admin endpoints require Bearer token)
      if (user.access_token) {
        try { localStorage.setItem('access_token', user.access_token); } catch { /* ignore */ }
      }

      // Save user to localStorage for frontend auth
      saveCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      });
      
      toast({
        title: "Connexion réussie",
        description: `Bon retour, ${user.name} !`
      });
      
      if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Échec de la connexion",
        description: error.message || "Email ou mot de passe invalide",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white p-8 shadow-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-light mb-2">Bon Retour</h1>
          <p className="text-sm text-gray-600">Connectez-vous à votre compte</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="votre@email.com"
              required
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>

          <Button type="submit" className="w-full py-6" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connexion en cours...
              </>
            ) : (
              'Se connecter'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Pas encore de compte ?{' '}
            <Link to="/register" className="font-medium hover:opacity-60 transition-opacity">
              S'inscrire
            </Link>
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-2">Identifiants de démonstration :</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p><strong>Admin:</strong> admin@bestshop.com / admin123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
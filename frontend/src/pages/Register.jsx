import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { saveCurrentUser } from '../mock/mockData';
import { usersApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from '../hooks/use-toast';
import { Loader2 } from 'lucide-react';

const Register = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    subscribeNewsletter: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caractères",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newUser = await usersApi.register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        subscribe_newsletter: formData.subscribeNewsletter
      });

      // Save user to localStorage for frontend auth
      saveCurrentUser({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      });
      
      toast({
        title: "Inscription réussie",
        description: `Bienvenue, ${newUser.name} !`
      });
      
      navigate('/');
    } catch (error) {
      console.error('Registration error:', error);
      toast({
        title: "Erreur d'inscription",
        description: error.message || "Une erreur s'est produite lors de l'inscription",
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
          <h1 className="text-2xl font-light mb-2">Créer un compte</h1>
          <p className="text-sm text-gray-600">Join Best Shop today</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="John Doe"
              required
              className="mt-1"
            />
          </div>

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

          <div>
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="••••••••"
              required
              className="mt-1"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="newsletter"
              checked={formData.subscribeNewsletter}
              onChange={(e) => setFormData({ ...formData, subscribeNewsletter: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 focus:ring-2 focus:ring-black"
            />
            <Label htmlFor="newsletter" className="text-sm font-normal cursor-pointer">
              S'abonner à la newsletter pour recevoir nos offres et nouveautés
            </Label>
          </div>

          <Button type="submit" className="w-full py-6" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer un compte'
            )}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:opacity-60 transition-opacity">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
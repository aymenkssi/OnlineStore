import React, { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from '../hooks/use-toast';

const AuthCallback = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent double execution (React StrictMode)
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const processSession = async () => {
      try {
        // Extract session_id from URL fragment
        const hash = location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const sessionId = params.get('session_id');

        if (!sessionId) {
          throw new Error('No session_id found');
        }

        // Exchange session_id for user data via backend
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/auth/google/callback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ session_id: sessionId })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.detail || 'Authentication failed');
        }

        const userData = await response.json();

        toast({
          title: "Connexion réussie",
          description: `Bienvenue ${userData.name} !`
        });

        // Redirect to home page with user data
        navigate('/', { 
          replace: true,
          state: { user: userData }
        });
        
        // Reload to update auth state
        window.location.reload();

      } catch (error) {
        console.error('Auth callback error:', error);
        toast({
          title: "Erreur de connexion",
          description: error.message || "Une erreur s'est produite lors de la connexion",
          variant: "destructive"
        });
        navigate('/');
      }
    };

    processSession();
  }, [location, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
        <p className="mt-4 text-gray-600">Authentification en cours...</p>
      </div>
    </div>
  );
};

export default AuthCallback;

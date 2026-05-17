import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const NewsletterUnsubscribe = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading'); // loading, success, error
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = async () => {
      const email = searchParams.get('email');
      const token = searchParams.get('token');

      if (!email || !token) {
        setStatus('error');
        setMessage('Lien de désabonnement invalide');
        return;
      }

      try {
        const response = await fetch(
          `${API_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`
        );
        
        const data = await response.json();
        
        if (response.ok) {
          setStatus('success');
          setMessage(data.message || 'Vous avez été désinscrit de notre newsletter');
        } else {
          setStatus('error');
          setMessage(data.detail || 'Une erreur s\'est produite');
        }
      } catch (error) {
        setStatus('error');
        setMessage('Impossible de traiter votre demande');
      }
    };

    unsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 text-gray-400 animate-spin mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Traitement en cours...</h1>
            <p className="text-gray-600">Veuillez patienter</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Désabonnement réussi</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <p className="text-sm text-gray-500 mb-6">
              Vous ne recevrez plus d'emails de notre part concernant les nouveaux produits et promotions.
            </p>
            <Link 
              to="/" 
              className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Retour à la boutique
            </Link>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-semibold mb-2">Erreur</h1>
            <p className="text-gray-600 mb-6">{message}</p>
            <Link 
              to="/" 
              className="inline-block px-6 py-3 bg-black text-white rounded hover:bg-gray-800 transition-colors"
            >
              Retour à la boutique
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default NewsletterUnsubscribe;

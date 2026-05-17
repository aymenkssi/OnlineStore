import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | already | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Lien de verification invalide ou manquant.');
      return;
    }

    const verify = async () => {
      try {
        const res = await fetch(`${API_URL}/api/users/verify-email?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (res.ok) {
          if (data.already_verified) {
            setStatus('already');
            setMessage('Votre email a deja ete verifie.');
          } else {
            setStatus('success');
            setMessage('Votre email a ete verifie avec succes !');
          }
        } else {
          setStatus('error');
          setMessage(data.detail || 'Erreur lors de la verification.');
        }
      } catch (err) {
        setStatus('error');
        setMessage('Erreur de connexion au serveur.');
      }
    };

    verify();
  }, [token]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4" data-testid="verify-email-page">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center space-y-6">
        {status === 'loading' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-blue-500 animate-spin" />
            <h1 className="text-2xl font-semibold text-gray-800">Verification en cours...</h1>
            <p className="text-gray-500">Veuillez patienter pendant que nous verifions votre email.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-20 h-20 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800" data-testid="verify-success-title">Email verifie !</h1>
            <p className="text-gray-500" data-testid="verify-success-message">{message}</p>
            <p className="text-gray-500">Vous pouvez maintenant vous connecter a votre compte.</p>
            <Button onClick={() => navigate('/')} className="w-full" data-testid="verify-go-home-btn">Retour a l'accueil</Button>
          </>
        )}

        {status === 'already' && (
          <>
            <div className="w-20 h-20 mx-auto bg-blue-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-blue-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800" data-testid="verify-already-title">Deja verifie</h1>
            <p className="text-gray-500" data-testid="verify-already-message">{message}</p>
            <Button onClick={() => navigate('/')} className="w-full" data-testid="verify-go-home-btn">Retour a l'accueil</Button>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-20 h-20 mx-auto bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-800" data-testid="verify-error-title">Erreur de verification</h1>
            <p className="text-gray-500" data-testid="verify-error-message">{message}</p>
            <Button onClick={() => navigate('/')} variant="outline" className="w-full" data-testid="verify-go-home-btn">Retour a l'accueil</Button>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

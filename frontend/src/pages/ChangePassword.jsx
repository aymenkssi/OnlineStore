import React, { useEffect, useState, useMemo } from 'react';
import zxcvbn from 'zxcvbn';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { usersApi } from '../services/api';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { ShieldAlert, KeyRound, Loader2 } from 'lucide-react';
import { logout as clearLocalUser } from '../mock/mockData';

const strengthLabels = ['Très faible', 'Faible', 'Moyen', 'Fort', 'Excellent'];
const strengthColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a'];

const ChangePassword = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const forced = params.get('forced') === '1';

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const strength = useMemo(() => {
    if (!newPassword) return { score: -1, label: '', feedback: '' };
    const r = zxcvbn(newPassword);
    return {
      score: r.score,
      label: strengthLabels[r.score],
      feedback: r.feedback?.warning || (r.feedback?.suggestions || []).join(' · '),
    };
  }, [newPassword]);

  useEffect(() => {
    // Ensure user is logged in; otherwise redirect home
    const token = localStorage.getItem('access_token');
    if (!token) {
      navigate('/');
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'Erreur', description: '8 caractères minimum', variant: 'destructive' });
      return;
    }
    if (strength.score < 2) {
      toast({
        title: 'Mot de passe trop faible',
        description: strength.feedback || 'Utilisez une combinaison de lettres, chiffres et symboles (min. score "Moyen").',
        variant: 'destructive',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Erreur', description: 'Les mots de passe ne correspondent pas', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await usersApi.changePassword(currentPassword, newPassword);
      toast({ title: 'Mot de passe mis à jour', description: 'Veuillez vous reconnecter' });
      await usersApi.logout();
      localStorage.removeItem('access_token');
      clearLocalUser();
      navigate('/');
      window.location.reload();
    } catch (error) {
      toast({ title: 'Erreur', description: error.message || 'Échec', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4" data-testid="change-password-page">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-3">
            {forced ? (
              <ShieldAlert className="w-6 h-6 text-amber-600" />
            ) : (
              <KeyRound className="w-6 h-6 text-gray-700" />
            )}
            <div>
              <CardTitle>{forced ? 'Changement requis' : 'Changer mon mot de passe'}</CardTitle>
              <CardDescription>
                {forced
                  ? "Pour des raisons de sécurité, vous devez définir un nouveau mot de passe avant d'accéder à l'administration."
                  : 'Choisissez un nouveau mot de passe sécurisé.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label htmlFor="current">Mot de passe actuel</Label>
              <Input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                data-testid="change-pwd-current"
              />
            </div>
            <div>
              <Label htmlFor="new">Nouveau mot de passe (8 caractères min.)</Label>
              <Input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={8}
                data-testid="change-pwd-new"
              />
              {newPassword && (
                <div className="mt-2" data-testid="pwd-strength">
                  <div className="flex h-1.5 gap-1">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="flex-1 rounded-full transition-colors"
                        style={{
                          backgroundColor: i <= strength.score ? strengthColors[strength.score] : '#e5e7eb',
                        }}
                      />
                    ))}
                  </div>
                  <p
                    className="text-xs mt-1"
                    style={{ color: strength.score >= 0 ? strengthColors[strength.score] : '#888' }}
                  >
                    Force : {strength.label}
                    {strength.feedback ? ` — ${strength.feedback}` : ''}
                  </p>
                </div>
              )}
            </div>
            <div>
              <Label htmlFor="confirm">Confirmer le nouveau mot de passe</Label>
              <Input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                data-testid="change-pwd-confirm"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading} data-testid="change-pwd-submit">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Mettre à jour
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangePassword;

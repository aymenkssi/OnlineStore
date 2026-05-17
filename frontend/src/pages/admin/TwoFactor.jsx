import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { usersApi } from '../../services/api';
import { toast } from '../../hooks/use-toast';
import { ShieldCheck, ShieldAlert, Smartphone, Copy, Loader2, Download } from 'lucide-react';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const TwoFactor = () => {
  const canWrite = useCanWrite('manage_admins');
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [setupData, setSetupData] = useState(null); // { secret, qr_code, provisioning_uri }
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = async () => {
    try {
      setLoading(true);
      const s = await usersApi.twoFactorStatus();
      setStatus(s);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    reload();
  }, []);

  const startSetup = async () => {
    setBusy(true);
    try {
      const data = await usersApi.twoFactorSetup();
      setSetupData(data);
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const verifySetup = async () => {
    if (!/^\d{6}$/.test(code)) {
      toast({ title: 'Code invalide', description: '6 chiffres attendus', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const res = await usersApi.twoFactorVerify(code);
      setRecoveryCodes(res.recovery_codes);
      setSetupData(null);
      setCode('');
      await reload();
      toast({ title: '2FA activée', description: 'Conservez précieusement vos codes de secours.' });
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const disable = async () => {
    if (!password) {
      toast({ title: 'Mot de passe requis', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await usersApi.twoFactorDisable(password);
      setPassword('');
      setRecoveryCodes(null);
      await reload();
      toast({ title: '2FA désactivée' });
    } catch (e) {
      toast({ title: 'Erreur', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    toast({ title: 'Copié' });
  };

  const downloadRecoveryCodes = () => {
    if (!recoveryCodes) return;
    const content = `Codes de secours — Best Shop\n\n${recoveryCodes.join('\n')}\n\nCes codes sont à usage unique. Conservez-les en lieu sûr.\n`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bestshop-recovery-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-gray-500">
        <Loader2 className="w-4 h-4 animate-spin" /> Chargement...
      </div>
    );
  }

  return (
    <div className="p-8 max-w-3xl space-y-6" data-testid="admin-2fa-page">
      <ReadOnlyBanner show={!canWrite} />
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" />
          Authentification à deux facteurs (2FA)
        </h1>
        <p className="text-gray-500 mt-1">
          Ajoutez une couche de sécurité supplémentaire à votre compte avec un code généré par votre téléphone.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Statut</CardTitle>
            <CardDescription>
              {status?.totp_enabled
                ? `Activée depuis le ${status.enrolled_at ? new Date(status.enrolled_at).toLocaleDateString('fr-FR') : '—'}`
                : 'Non activée'}
            </CardDescription>
          </div>
          {status?.totp_enabled ? (
            <Badge className="bg-green-600">Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </CardHeader>
        {status?.totp_enabled && (
          <CardContent>
            <p className="text-sm text-gray-600">
              Codes de secours restants : <strong>{status.recovery_codes_remaining}</strong> / 8
            </p>
          </CardContent>
        )}
      </Card>

      {/* Enable flow */}
      {!status?.totp_enabled && !setupData && !recoveryCodes && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Activer la 2FA
            </CardTitle>
            <CardDescription>
              Vous aurez besoin d'une app comme Google Authenticator, Authy ou 1Password.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={startSetup} disabled={busy || !canWrite} data-testid="enable-2fa-btn">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Commencer l'activation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Setup flow: show QR + verify */}
      {setupData && (
        <Card>
          <CardHeader>
            <CardTitle>1. Scannez le QR code</CardTitle>
            <CardDescription>
              Dans votre application d'authentification, ajoutez un nouveau compte en scannant le QR ci-dessous.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <img src={setupData.qr_code} alt="QR 2FA" className="border rounded w-64 h-64" />
            <div>
              <Label>Ou saisissez la clé manuellement :</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-sm bg-gray-100 px-2 py-1 rounded font-mono break-all flex-1">
                  {setupData.secret}
                </code>
                <Button variant="outline" size="icon" onClick={() => copyToClipboard(setupData.secret)}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="pt-4 border-t">
              <Label htmlFor="verify-code">2. Saisissez le code de 6 chiffres</Label>
              <Input
                id="verify-code"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="mt-1 tracking-[0.5em] text-center text-lg font-mono"
                placeholder="••••••"
                data-testid="verify-2fa-code"
              />
              <Button className="mt-3" onClick={verifySetup} disabled={busy || code.length !== 6 || !canWrite} data-testid="verify-2fa-btn">
                {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Vérifier et activer
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recovery codes shown once */}
      {recoveryCodes && (
        <Card className="border-amber-400">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-700">
              <ShieldAlert className="w-5 h-5" /> Codes de secours (affichés UNE SEULE fois)
            </CardTitle>
            <CardDescription>
              Téléchargez-les ou notez-les en lieu sûr. Ils vous permettent de vous connecter si vous perdez votre téléphone.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-sm bg-gray-50 p-3 rounded">
              {recoveryCodes.map((c) => (
                <span key={c}>{c}</span>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={downloadRecoveryCodes}>
                <Download className="w-4 h-4 mr-2" /> Télécharger
              </Button>
              <Button variant="outline" onClick={() => copyToClipboard(recoveryCodes.join('\n'))}>
                <Copy className="w-4 h-4 mr-2" /> Copier
              </Button>
              <Button onClick={() => setRecoveryCodes(null)}>J'ai sauvegardé mes codes</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Disable */}
      {status?.totp_enabled && !recoveryCodes && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <ShieldAlert className="w-5 h-5" /> Désactiver la 2FA
            </CardTitle>
            <CardDescription>
              Cela affaiblira la sécurité de votre compte. Votre mot de passe actuel est requis.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="disable-pwd">Mot de passe</Label>
              <Input
                id="disable-pwd"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                data-testid="disable-2fa-password"
              />
            </div>
            <Button variant="destructive" onClick={disable} disabled={busy || !password || !canWrite} data-testid="disable-2fa-btn">
              {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Désactiver la 2FA
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TwoFactor;

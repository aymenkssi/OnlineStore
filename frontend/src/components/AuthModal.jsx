import React, { useState } from 'react';
import { X, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { saveCurrentUser } from '../mock/mockData';
import { usersApi } from '../services/api';
import { useSiteTexts } from '../hooks/useSiteTexts';
import { toast } from '../hooks/use-toast';

const AuthModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const t = useSiteTexts();
  const { t: tt, i18n } = useTranslation();
  // Bridge: if non-French, prefer i18n translation for the label
  const L = (siteKey, i18nKey) => (i18n.language === 'fr' ? (t?.[siteKey] || '') : tt(i18nKey));
  const [activeTab, setActiveTab] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [totpCode, setTotpCode] = useState('');
  const [totpRequired, setTotpRequired] = useState(false);
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    confirmEmail: '',
    password: '',
    newsletter: false
  });

  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const loginPayload = {
        email: loginData.email,
        password: loginData.password,
      };
      if (totpRequired && totpCode) {
        loginPayload.totp_code = totpCode;
      }
      const user = await usersApi.login(loginPayload);

      // Store JWT for authenticated API calls
      if (user.access_token) {
        try {
          localStorage.setItem('access_token', user.access_token);
        } catch { /* ignore */ }
      }

      saveCurrentUser({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        must_change_password: !!user.must_change_password
      });

      toast({
        title: t.loginSuccessful,
        description: t.welcomeMessage.replace('{name}', user.name)
      });
      
      onClose();
      // Force password change on first admin login
      if (user.must_change_password) {
        window.location.href = '/change-password?forced=1';
        return;
      }
      if (user.role === 'admin') {
        navigate('/admin');
      }
      window.location.reload();
    } catch (error) {
      // Detect TOTP required state from backend error detail
      const msg = typeof error.message === 'string' ? error.message : '';
      if (msg.includes('totp_required') || msg.toLowerCase().includes('2fa')) {
        setTotpRequired(true);
        toast({
          title: 'Code 2FA requis',
          description: 'Saisissez le code à 6 chiffres de votre application d\'authentification.',
        });
      } else if (msg.includes('email_not_verified') || msg.includes('vérifier votre email')) {
        toast({
          title: 'Email non vérifié',
          description: 'Veuillez vérifier votre email avant de vous connecter. Consultez votre boîte de réception.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: t.loginFailed,
          description: msg || t.invalidCredentials,
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!acceptTerms) {
      toast({
        title: "Erreur",
        description: "Vous devez accepter les conditions générales",
        variant: "destructive"
      });
      return;
    }

    // Vérifier que les emails correspondent
    if (registerData.email !== registerData.confirmEmail) {
      toast({
        title: "Erreur",
        description: "Les adresses e-mail ne correspondent pas",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const newUser = await usersApi.register({
        name: registerData.name,
        email: registerData.email,
        password: registerData.password,
        subscribe_newsletter: registerData.newsletter
      });

      toast({
        title: "Inscription réussie !",
        description: "Un email de vérification a été envoyé à votre adresse. Veuillez vérifier votre boîte de réception pour activer votre compte.",
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error.message || t.emailAlreadyExists,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = (provider) => {
    if (provider === 'Google') {
      // Redirige vers l'endpoint backend Google OAuth
      const backendUrl = process.env.REACT_APP_BACKEND_URL;
      window.location.href = `${backendUrl}/api/auth/google/login`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white w-full max-w-md mx-4 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center rounded-t-lg">
          <h2 className="text-2xl font-light">Bienvenue</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login" className="uppercase text-sm font-medium">
                {tt('authModal.login')}
              </TabsTrigger>
              <TabsTrigger value="register" className="uppercase text-sm font-medium">
                {tt('authModal.register')}
              </TabsTrigger>
            </TabsList>

            {/* Login Tab */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <Label htmlFor="login-email" className="text-gray-600">
                    {tt('authModal.email')}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="login-email"
                      type="email"
                      value={loginData.email}
                      onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="login-password" className="text-gray-600">
                    {tt('authModal.password')}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="text-right">
                  <Link
                    to="/forgot-password"
                    onClick={onClose}
                    className="text-sm text-gray-600 hover:text-black underline"
                    data-testid="forgot-password-link"
                  >
                    {tt('auth.forgotPassword')}
                  </Link>
                </div>

                {totpRequired && (
                  <div data-testid="totp-input">
                    <Label htmlFor="login-totp" className="text-gray-600">
                      Code 2FA (6 chiffres)
                    </Label>
                    <Input
                      id="login-totp"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                      autoFocus
                      required
                      className="mt-1 tracking-[0.6em] text-center text-lg font-mono"
                      placeholder="••••••"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Depuis Google Authenticator, Authy ou 1Password.
                    </p>
                  </div>
                )}

                <Button type="submit" className="w-full py-6 bg-black hover:bg-gray-800" disabled={loading} data-testid="login-submit-btn">
                  {loading ? `${tt('authModal.login')}…` : (totpRequired ? 'Vérifier le code 2FA' : tt('authModal.loginButton'))}
                </Button>

              </form>
            </TabsContent>

            {/* Register Tab */}
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <Label htmlFor="register-name" className="text-gray-600">
                    {tt('authModal.fullName')}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="register-name"
                      type="text"
                      value={registerData.name}
                      onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-email" className="text-gray-600">
                    {tt('authModal.email')}
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="register-email"
                      type="email"
                      value={registerData.email}
                      onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-confirm-email" className="text-gray-600">
                    Confirmer l'adresse e-mail
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="register-confirm-email"
                      type="email"
                      value={registerData.confirmEmail}
                      onChange={(e) => setRegisterData({ ...registerData, confirmEmail: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                </div>

                <div>
                  <Label htmlFor="register-password" className="text-gray-600">
                    Mot de passe
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      id="register-password"
                      type={showPassword ? "text" : "password"}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* RGPD */}
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptTerms}
                      onCheckedChange={(checked) => setAcceptTerms(checked)}
                      data-testid="accept-terms-checkbox"
                    />
                    <label htmlFor="accept-terms" className="text-xs leading-relaxed cursor-pointer">
                      J'accepte les{' '}
                      <Link to="/terms" className="underline hover:text-black" onClick={onClose}>
                        Termes & conditions
                      </Link>
                      {' '}et les{' '}
                      <Link to="/privacy" className="underline hover:text-black" onClick={onClose}>
                        Politiques de confidentialité et de gestion des cookies
                      </Link>
                    </label>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="newsletter"
                      checked={registerData.newsletter}
                      onCheckedChange={(checked) => setRegisterData({ ...registerData, newsletter: checked })}
                    />
                    <label htmlFor="newsletter" className="text-xs leading-relaxed cursor-pointer">
                      Inscrivez-vous à notre newsletter pour ne manquer aucune offre exclusive.{' '}
                      <Link to="/privacy" className="underline hover:text-black" onClick={onClose}>
                        En savoir plus
                      </Link>
                    </label>
                  </div>
                </div>

                <Button type="submit" className="w-full py-6 bg-black hover:bg-gray-800" disabled={loading}>
                  {loading ? `${tt('authModal.register')}…` : tt('authModal.registerButton')}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Social Login */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">OU</span>
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <button
                onClick={() => handleSocialLogin('Google')}
                className="w-full flex items-center justify-center space-x-3 px-4 py-3 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                data-testid="google-login-btn"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium">{tt('authModal.signInGoogle')}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
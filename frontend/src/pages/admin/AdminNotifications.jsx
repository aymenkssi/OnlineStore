import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { notificationsApi } from '../../services/api';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { Bell, Send, MessageCircle, CheckCircle, XCircle, Loader2, ExternalLink, AlertCircle } from 'lucide-react';

const AdminNotifications = () => {
  const canWrite = useCanWrite('manage_notifications');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingWhatsapp, setTestingWhatsapp] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await notificationsApi.getSettings();
      setSettings(data);
    } catch (err) {
      setSettings({
        telegram_enabled: false, telegram_bot_token: '', telegram_chat_id: '',
        whatsapp_enabled: false, whatsapp_phone: '', whatsapp_api_key: '',
        events: { new_order: true, new_return: true, new_customer: true, low_stock: true }
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await notificationsApi.updateSettings(settings);
      toast({ title: "Paramètres sauvegardés", description: "Les notifications ont été mises à jour." });
    } catch (err) {
      toast({ title: "Erreur", description: "Impossible de sauvegarder les paramètres.", variant: "destructive" });
    }
    setSaving(false);
  };

  const handleTestTelegram = async () => {
    setTestingTelegram(true);
    try {
      await notificationsApi.testChannel('telegram');
      toast({ title: "Test Telegram réussi", description: "Le message a été envoyé sur Telegram." });
    } catch (err) {
      toast({ title: "Échec du test", description: err.message || "Vérifiez le token et le chat ID.", variant: "destructive" });
    }
    setTestingTelegram(false);
  };

  const handleTestWhatsapp = async () => {
    setTestingWhatsapp(true);
    try {
      await notificationsApi.testChannel('whatsapp');
      toast({ title: "Test WhatsApp réussi", description: "Le message a été envoyé sur WhatsApp." });
    } catch (err) {
      toast({ title: "Échec du test", description: err.message || "Vérifiez le numéro et la clé API.", variant: "destructive" });
    }
    setTestingWhatsapp(false);
  };

  const updateField = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const toggleEvent = (event) => {
    setSettings(prev => ({
      ...prev,
      events: { ...prev.events, [event]: !prev.events[event] }
    }));
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const events = [
    { key: 'new_order', label: 'Nouvelle commande', description: 'Quand un client passe une commande' },
    { key: 'new_return', label: 'Nouvelle demande de retour', description: 'Quand un client demande un retour' },
    { key: 'new_customer', label: 'Nouveau client', description: 'Quand un nouveau client s\'inscrit' },
    { key: 'low_stock', label: 'Stock faible', description: 'Quand un produit atteint le seuil de stock faible' },
  ];

  return (
    <div data-testid="admin-notifications">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Notifications</h1>
          <p className="text-gray-600 mt-2">Configurez les notifications Telegram et WhatsApp pour les événements importants</p>
        </div>
        {canWrite && (
        <Button onClick={handleSave} disabled={saving} data-testid="save-notification-settings-btn">
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
          {saving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Telegram Card */}
        <Card className={settings.telegram_enabled ? 'border-blue-300 bg-blue-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Send className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">Telegram</CardTitle>
                  <CardDescription>Notifications via bot Telegram</CardDescription>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.telegram_enabled}
                  onChange={(e) => updateField('telegram_enabled', e.target.checked)}
                  className="sr-only peer"
                  data-testid="telegram-toggle"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup Guide */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-800 mb-2">Comment configurer :</p>
              <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
                <li>Ouvrez Telegram et cherchez <strong>@BotFather</strong></li>
                <li>Envoyez <code>/newbot</code> et suivez les instructions</li>
                <li>Copiez le <strong>token</strong> fourni par BotFather</li>
                <li>Envoyez un message à votre bot, puis visitez :<br />
                  <code className="bg-blue-100 px-1 rounded">https://api.telegram.org/bot&lt;TOKEN&gt;/getUpdates</code>
                </li>
                <li>Trouvez votre <strong>Chat ID</strong> dans la réponse</li>
              </ol>
              <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Ouvrir BotFather
              </a>
            </div>

            <div>
              <Label htmlFor="tg-token">Bot Token</Label>
              <Input
                id="tg-token"
                type="password"
                placeholder="123456789:ABCdefGhIjKlMnOpQrStUvWxYz"
                value={settings.telegram_bot_token}
                onChange={(e) => updateField('telegram_bot_token', e.target.value)}
                data-testid="telegram-bot-token-input"
              />
            </div>
            <div>
              <Label htmlFor="tg-chatid">Chat ID</Label>
              <Input
                id="tg-chatid"
                placeholder="-1001234567890"
                value={settings.telegram_chat_id}
                onChange={(e) => updateField('telegram_chat_id', e.target.value)}
                data-testid="telegram-chat-id-input"
              />
            </div>
            {canWrite && (
            <Button
              variant="outline"
              onClick={handleTestTelegram}
              disabled={testingTelegram || !settings.telegram_bot_token || !settings.telegram_chat_id}
              className="w-full"
              data-testid="test-telegram-btn"
            >
              {testingTelegram ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Envoyer un test
            </Button>
            )}
          </CardContent>
        </Card>

        {/* WhatsApp Card */}
        <Card className={settings.whatsapp_enabled ? 'border-green-300 bg-green-50/30' : ''}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-lg">WhatsApp</CardTitle>
                  <CardDescription>Notifications via CallMeBot (gratuit)</CardDescription>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.whatsapp_enabled}
                  onChange={(e) => updateField('whatsapp_enabled', e.target.checked)}
                  className="sr-only peer"
                  data-testid="whatsapp-toggle"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
              </label>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Setup Guide */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-medium text-green-800 mb-2">Comment configurer (gratuit) :</p>
              <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside">
                <li>Ajoutez <strong>+34 644 71 83 97</strong> à vos contacts WhatsApp</li>
                <li>Envoyez le message : <code className="bg-green-100 px-1 rounded">I allow callmebot to send me messages</code></li>
                <li>Vous recevrez une <strong>clé API</strong> en réponse</li>
                <li>Entrez votre numéro (format international) et la clé ci-dessous</li>
              </ol>
              <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/" target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs text-green-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> Documentation CallMeBot
              </a>
            </div>

            <div>
              <Label htmlFor="wa-phone">Numéro de téléphone (international)</Label>
              <Input
                id="wa-phone"
                placeholder="+33612345678"
                value={settings.whatsapp_phone}
                onChange={(e) => updateField('whatsapp_phone', e.target.value)}
                data-testid="whatsapp-phone-input"
              />
            </div>
            <div>
              <Label htmlFor="wa-key">Clé API CallMeBot</Label>
              <Input
                id="wa-key"
                type="password"
                placeholder="123456"
                value={settings.whatsapp_api_key}
                onChange={(e) => updateField('whatsapp_api_key', e.target.value)}
                data-testid="whatsapp-api-key-input"
              />
            </div>
            {canWrite && (
            <Button
              variant="outline"
              onClick={handleTestWhatsapp}
              disabled={testingWhatsapp || !settings.whatsapp_phone || !settings.whatsapp_api_key}
              className="w-full"
              data-testid="test-whatsapp-btn"
            >
              {testingWhatsapp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <MessageCircle className="w-4 h-4 mr-2" />}
              Envoyer un test
            </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Events Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5" />
            <div>
              <CardTitle>Événements</CardTitle>
              <CardDescription>Choisissez les événements qui déclenchent une notification</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {events.map(event => (
              <div key={event.key} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                <div>
                  <p className="font-medium text-sm">{event.label}</p>
                  <p className="text-xs text-gray-500">{event.description}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.events?.[event.key] ?? true}
                    onChange={() => toggleEvent(event.key)}
                    className="sr-only peer"
                    data-testid={`event-toggle-${event.key}`}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-black/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-black"></div>
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <div className="mt-6 flex gap-4">
        <div className={`flex items-center gap-2 text-sm ${settings.telegram_enabled ? 'text-blue-600' : 'text-gray-400'}`}>
          {settings.telegram_enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          Telegram {settings.telegram_enabled ? 'actif' : 'inactif'}
        </div>
        <div className={`flex items-center gap-2 text-sm ${settings.whatsapp_enabled ? 'text-green-600' : 'text-gray-400'}`}>
          {settings.whatsapp_enabled ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          WhatsApp {settings.whatsapp_enabled ? 'actif' : 'inactif'}
        </div>
        <div className="text-sm text-gray-500">
          {Object.values(settings.events || {}).filter(Boolean).length} / {events.length} événements activés
        </div>
      </div>
    </div>
  );
};

export default AdminNotifications;

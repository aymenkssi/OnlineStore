import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { toast } from '../../hooks/use-toast';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';
import { Save, FileText, Loader2, Globe, CheckCircle2, Wand2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { autoTranslateBatch } from '../../services/translate';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const PAGES = [
  { id: 'contact', label: 'Contactez-nous', hasEmail: true },
  { id: 'faq', label: 'FAQ', hasEmail: false },
  { id: 'shipping', label: 'Livraison & Expédition', hasEmail: false },
  { id: 'returns', label: 'Retours', hasEmail: false },
  { id: 'about', label: 'À propos', hasEmail: false },
  { id: 'careers', label: 'Carrières', hasEmail: false },
  { id: 'sustainability', label: 'Durabilité', hasEmail: false },
  { id: 'terms', label: 'Conditions Générales', hasEmail: false },
  { id: 'privacy', label: 'Politique de Confidentialité', hasEmail: false },
  { id: 'cookies', label: 'Politique des Cookies', hasEmail: false },
];

const emptyTranslations = () => ({
  fr: { title: '', content: '' },
  en: { title: '', content: '' },
  ar: { title: '', content: '' },
});

const AdminPages = () => {
  const { t } = useTranslation();
  const canWrite = useCanWrite('manage_pages');
  const [selectedPage, setSelectedPage] = useState('contact');
  const [activeLang, setActiveLang] = useState('fr');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translations, setTranslations] = useState(emptyTranslations());
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (selectedPage) loadPageContent(selectedPage);
  }, [selectedPage]);

  const loadPageContent = async (pageId) => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/pages/${pageId}`);
      if (response.ok) {
        const data = await response.json();
        const next = emptyTranslations();
        if (data.translations) {
          for (const lang of Object.keys(next)) {
            next[lang] = {
              title: data.translations[lang]?.title || '',
              content: data.translations[lang]?.content || '',
            };
          }
        } else {
          // Legacy doc — put the existing fields into FR
          next.fr = { title: data.title || '', content: data.content || '' };
        }
        setTranslations(next);
        setContactEmail(data.contactEmail || '');
      } else {
        const page = PAGES.find(p => p.id === pageId);
        const next = emptyTranslations();
        next.fr.title = page?.label || '';
        setTranslations(next);
        setContactEmail('');
      }
    } catch (e) {
      console.error('Error loading page:', e);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(`${API_URL}/api/pages/${selectedPage}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ translations, contactEmail }),
      });
      if (response.ok) {
        toast({ title: t('admin.pages.saved'), description: t('admin.pages.savedDescription') });
      } else {
        throw new Error('Save failed');
      }
    } catch (e) {
      toast({ title: t('common.error'), description: t('admin.pages.saveError'), variant: 'destructive' });
    }
    setSaving(false);
  };

  const updateField = (lang, field, value) => {
    setTranslations(prev => ({ ...prev, [lang]: { ...prev[lang], [field]: value } }));
  };

  const currentPage = PAGES.find(p => p.id === selectedPage);
  const langDef = SUPPORTED_LANGUAGES.find(l => l.code === activeLang);
  const current = translations[activeLang] || { title: '', content: '' };
  const isFilled = (lang) =>
    Boolean((translations[lang]?.title || '').trim() || (translations[lang]?.content || '').trim());

  return (
    <div data-testid="admin-pages">
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">{t('admin.pages.title')}</h1>
          <p className="text-gray-600 mt-2">{t('admin.pages.subtitle')}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t('admin.pages.selectPage')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <Label htmlFor="page-select">{t('admin.pages.pageToEdit')}</Label>
              <select
                id="page-select"
                data-testid="page-select"
                value={selectedPage}
                onChange={(e) => setSelectedPage(e.target.value)}
                className="mt-1 flex h-10 w-full items-center justify-between rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2"
              >
                {PAGES.map(page => (
                  <option key={page.id} value={page.id}>{page.label}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Language tabs */}
                <div>
                  <Label className="flex items-center gap-2 mb-2">
                    <Globe className="w-4 h-4" />
                    {t('admin.pages.language')}
                  </Label>
                  <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
                    {SUPPORTED_LANGUAGES.map(l => (
                      <button
                        key={l.code}
                        type="button"
                        data-testid={`lang-tab-${l.code}`}
                        onClick={() => setActiveLang(l.code)}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          activeLang === l.code
                            ? 'bg-black text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        <span>{l.flag}</span>
                        <span>{l.label}</span>
                        {isFilled(l.code) && (
                          <CheckCircle2 className={`w-3.5 h-3.5 ${activeLang === l.code ? 'text-green-300' : 'text-green-600'}`} />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">{t('admin.pages.languageHint')}</p>
                </div>

                {/* Auto-translate button */}
                {canWrite && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAutoTranslate}
                    disabled={translating}
                    data-testid="auto-translate-btn"
                    className="w-full sm:w-auto"
                  >
                    {translating ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Traduction…</>
                    ) : (
                      <><Wand2 className="w-4 h-4 mr-2" /> Traduire automatiquement FR → EN + AR</>
                    )}
                  </Button>
                )}

                {/* Title */}
                <div>
                  <Label htmlFor="page-title">{t('admin.pages.pageTitle')}</Label>
                  <Input
                    id="page-title"
                    data-testid={`page-title-${activeLang}`}
                    value={current.title}
                    onChange={(e) => updateField(activeLang, 'title', e.target.value)}
                    placeholder={`${currentPage?.label || ''} (${langDef?.label})`}
                    className="mt-1"
                    dir={langDef?.dir || 'ltr'}
                  />
                </div>

                {/* Contact email */}
                {currentPage?.hasEmail && (
                  <div>
                    <Label htmlFor="contact-email">{t('admin.pages.contactEmail')}</Label>
                    <Input
                      id="contact-email"
                      type="email"
                      data-testid="contact-email-input"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="contact@example.com"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">{t('admin.pages.contactEmailHint')}</p>
                  </div>
                )}

                {/* Content */}
                <div>
                  <Label htmlFor="page-content">{t('admin.pages.pageContent')}</Label>
                  <Textarea
                    id="page-content"
                    data-testid={`page-content-${activeLang}`}
                    value={current.content}
                    onChange={(e) => updateField(activeLang, 'content', e.target.value)}
                    placeholder="…"
                    className="mt-1 min-h-[400px] font-mono text-sm"
                    dir={langDef?.dir || 'ltr'}
                  />
                  <p className="text-xs text-gray-500 mt-1">{t('admin.pages.htmlHint')}</p>
                </div>

                {canWrite && (
                  <Button onClick={handleSave} disabled={saving} className="w-full" data-testid="save-page-btn">
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {t('admin.pages.saving')}
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        {t('admin.pages.savePage')}
                      </>
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview of the active language */}
      {!loading && current.content && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {t('admin.pages.preview')}
              <span className="text-xs text-gray-500 font-normal">
                · {langDef?.flag} {langDef?.label}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose max-w-none" dir={langDef?.dir || 'ltr'}>
              <h1>{current.title}</h1>
              <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(current.content) }} />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminPages;

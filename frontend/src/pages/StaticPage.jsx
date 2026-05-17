import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import DOMPurify from 'dompurify';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { toast } from '../hooks/use-toast';
import { ArrowLeft, Send, Loader2, Mail, User, MessageSquare } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StaticPage = () => {
  const { pageId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [pageData, setPageData] = useState(null);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId, i18n.language]);

  const loadPage = async () => {
    setLoading(true);
    try {
      // Request the content for the user's current language (FR fallback handled server-side)
      const response = await fetch(`${API_URL}/api/pages/${pageId}?lang=${i18n.language}`);
      if (response.ok) {
        const data = await response.json();
        setPageData(data);
      } else {
        setPageData({
          title: t('common.error'),
          content: '<p>' + t('common.error') + '</p>'
        });
      }
    } catch (error) {
      console.error('Error loading page:', error);
      setPageData({ title: t('common.error'), content: '' });
    }
    setLoading(false);
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    setSending(true);

    try {
      const response = await fetch(`${API_URL}/api/pages/contact/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm),
      });

      if (response.ok) {
        toast({
          title: "Message envoyé",
          description: "Nous avons bien reçu votre message et vous répondrons dans les plus brefs délais.",
        });
        setContactForm({ name: '', email: '', subject: '', message: '' });
      } else {
        throw new Error('Erreur lors de l\'envoi');
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible d'envoyer le message. Veuillez réessayer.",
        variant: "destructive"
      });
    }
    setSending(false);
  };

  if (loading) {
    return <LoadingScreen message="Chargement..." />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <h1 className="text-4xl font-light">{pageData?.title}</h1>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div 
              className="prose max-w-none"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(pageData?.content || '') }}
            />

            {/* Contact Form (only for contact page) */}
            {pageId === 'contact' && (
              <div className="mt-12 pt-8 border-t">
                <h2 className="text-2xl font-semibold mb-6">Envoyez-nous un message</h2>
                <form onSubmit={handleContactSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="name" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Nom complet
                      </Label>
                      <Input
                        id="name"
                        value={contactForm.name}
                        onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                        required
                        className="mt-1"
                        placeholder="Votre nom"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="flex items-center gap-2">
                        <Mail className="w-4 h-4" />
                        Email
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        value={contactForm.email}
                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                        required
                        className="mt-1"
                        placeholder="votre@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Sujet
                    </Label>
                    <Input
                      id="subject"
                      value={contactForm.subject}
                      onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                      required
                      className="mt-1"
                      placeholder="Objet de votre message"
                    />
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      value={contactForm.message}
                      onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                      required
                      className="mt-1 min-h-[150px]"
                      placeholder="Écrivez votre message ici..."
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Envoyer le message
                      </>
                    )}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticPage;

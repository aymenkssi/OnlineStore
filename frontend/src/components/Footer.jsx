import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Loader2, CheckCircle, Facebook, Instagram, Twitter, Linkedin, Youtube, Music, Hash } from 'lucide-react';
import { useSiteTexts } from '../hooks/useSiteTexts';
import { toast } from '../hooks/use-toast';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const Footer = () => {
  const t = useSiteTexts();
  const { t: i18nT, i18n } = useTranslation();
  // For non-FR languages, prefer the i18n translations over the admin-customizable site texts.
  const ft = (siteKey, i18nKey) => i18n.language === 'fr' ? t[siteKey] : i18nT(i18nKey);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/newsletter/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setSubscribed(true);
        setEmail('');
        toast({
          title: "Inscription réussie !",
          description: data.message || "Vous recevrez nos dernières nouveautés par email."
        });
      } else {
        toast({
          title: "Erreur",
          description: data.detail || "Une erreur s'est produite",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de s'inscrire à la newsletter",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <footer className="bg-white border-t border-gray-200 mt-20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Customer Service */}
          <div>
            <h3 className="font-semibold mb-4">{ft('customerService', 'footer.customerService')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/page/contact" className="hover:text-black transition-colors">{ft('contactUs', 'footer.contactUs')}</Link></li>
              <li><Link to="/page/faq" className="hover:text-black transition-colors">{ft('faqs', 'footer.faqs')}</Link></li>
              <li><Link to="/page/shipping" className="hover:text-black transition-colors">{ft('shippingDelivery', 'footer.shippingDelivery')}</Link></li>
              <li><Link to="/page/returns" className="hover:text-black transition-colors">{ft('returns', 'footer.returns')}</Link></li>
            </ul>
          </div>

          {/* About */}
          <div>
            <h3 className="font-semibold mb-4">{ft('aboutBestShop', 'footer.aboutBestShop')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/page/about" className="hover:text-black transition-colors">{ft('aboutUs', 'footer.aboutUs')}</Link></li>
              <li><Link to="/page/careers" className="hover:text-black transition-colors">{ft('careers', 'footer.careers')}</Link></li>
              <li><Link to="/page/sustainability" className="hover:text-black transition-colors">{ft('sustainability', 'footer.sustainability')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">{ft('legal', 'footer.legal')}</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/page/terms" className="hover:text-black transition-colors">{ft('termsConditions', 'footer.termsConditions')}</Link></li>
              <li><Link to="/page/privacy" className="hover:text-black transition-colors">{ft('privacyPolicy', 'footer.privacyPolicy')}</Link></li>
              <li><Link to="/page/cookies" className="hover:text-black transition-colors">{ft('cookiePolicy', 'footer.cookiePolicy')}</Link></li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="font-semibold mb-4">{ft('newsletter', 'footer.newsletter')}</h3>
            <p className="text-sm text-gray-600 mb-4">{ft('newsletterText', 'footer.newsletterText')}</p>
            {subscribed ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle className="w-5 h-5" />
                <span className="text-sm">Merci pour votre inscription !</span>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={ft('emailAddress', 'footer.emailAddress')}
                  className="flex-1 px-3 py-2 border border-gray-300 focus:outline-none focus:border-black transition-colors text-sm"
                  required
                  disabled={loading}
                />
                <button 
                  type="submit"
                  className="px-4 py-2 bg-black text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                </button>
              </form>
            )}

            {/* Social Media */}
            {(t.socialFacebook || t.socialInstagram || t.socialTwitter || t.socialLinkedin || t.socialYoutube || t.socialTiktok || t.socialPinterest) && (
              <div className="mt-6">
                <h3 className="font-semibold mb-4">{i18nT('footer.followUs')}</h3>
                <div className="flex gap-3">
                  {t.socialFacebook && (
                    <a 
                      href={t.socialFacebook} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialInstagram && (
                    <a 
                      href={t.socialInstagram} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialTwitter && (
                    <a 
                      href={t.socialTwitter} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Twitter"
                    >
                      <Twitter className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialLinkedin && (
                    <a 
                      href={t.socialLinkedin} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="LinkedIn"
                    >
                      <Linkedin className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialYoutube && (
                    <a 
                      href={t.socialYoutube} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="YouTube"
                    >
                      <Youtube className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialTiktok && (
                    <a 
                      href={t.socialTiktok} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="TikTok"
                    >
                      <Music className="w-5 h-5" />
                    </a>
                  )}
                  {t.socialPinterest && (
                    <a 
                      href={t.socialPinterest} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full bg-gray-100 hover:bg-black hover:text-white flex items-center justify-center transition-colors"
                      aria-label="Pinterest"
                    >
                      <Hash className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>&copy; 2024 Best Shop. {ft('allRightsReserved', 'footer.allRightsReserved')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
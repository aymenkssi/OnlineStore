import React, { useState } from 'react';
import { getSiteTexts, saveSiteTexts } from '../../mock/mockData';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { toast } from '../../hooks/use-toast';
import { Save, RotateCcw } from 'lucide-react';
import ImageUploader from '../../components/ImageUploader';
import { useCanWrite } from '../../hooks/usePermissions';
import ReadOnlyBanner from '../../components/admin/ReadOnlyBanner';

const SiteSettings = () => {
  const canWrite = useCanWrite('manage_site_settings');
  const [texts, setTexts] = useState(getSiteTexts());
  const [hasChanges, setHasChanges] = useState(false);

  const handleTextChange = (key, value) => {
    setTexts({ ...texts, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    await saveSiteTexts(texts);
    setHasChanges(false);
    toast({
      title: "Modifications enregistrées",
      description: "Les textes du site ont été mis à jour avec succès."
    });
    // Reload to apply changes
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleReset = async () => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les textes aux valeurs par défaut?')) {
      // Clear backend + cache by saving empty object
      await saveSiteTexts({});
      localStorage.removeItem('bestShopTexts');
      window.location.reload();
    }
  };

  // Separate image fields from text fields
  const imageFields = ['siteLogo', 'siteFavicon'];

  const sections = [
    {
      name: 'Contact & Entreprise',
      fields: [
        { key: 'companyLegalName', label: 'Raison sociale' },
        { key: 'companyDescription', label: 'Description de l\'entreprise' },
        { key: 'companyAddress', label: 'Adresse' },
        { key: 'companyPostalCode', label: 'Code postal' },
        { key: 'companyCity', label: 'Ville' },
        { key: 'companyCountry', label: 'Pays' },
        { key: 'companyEmail', label: 'Email de contact' },
        { key: 'companyPhone', label: 'Téléphone' },
        { key: 'companySiret', label: 'Numéro SIRET' },
        { key: 'companyTva', label: 'Numéro de TVA intracommunautaire' },
      ]
    },
    {
      name: 'Réseaux Sociaux',
      fields: [
        { key: 'socialFacebook', label: 'Facebook URL', placeholder: 'https://facebook.com/votrepage' },
        { key: 'socialInstagram', label: 'Instagram URL', placeholder: 'https://instagram.com/votrepage' },
        { key: 'socialTwitter', label: 'Twitter/X URL', placeholder: 'https://twitter.com/votrepage' },
        { key: 'socialLinkedin', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/company/votrepage' },
        { key: 'socialYoutube', label: 'YouTube URL', placeholder: 'https://youtube.com/@votrepage' },
        { key: 'socialTiktok', label: 'TikTok URL', placeholder: 'https://tiktok.com/@votrepage' },
        { key: 'socialPinterest', label: 'Pinterest URL', placeholder: 'https://pinterest.com/votrepage' },
      ]
    },
    {
      name: 'Identit\u00e9 du Site',
      fields: [
        { key: 'siteName', label: 'Nom du site (affiché dans l\'onglet navigateur)' },
        { key: 'siteLogo', label: 'Logo du site (header)', type: 'image' },
        { key: 'siteFavicon', label: 'Favicon (icône onglet navigateur)', type: 'image' },
        { key: 'metaDescription', label: 'Meta description (SEO)', type: 'textarea' },
        { key: 'searchPlaceholder', label: 'Placeholder de recherche' },
      ]
    },
    {
      name: 'Navigation',
      fields: [
        { key: 'signIn', label: 'Se connecter' },
        { key: 'register', label: 'S\'inscrire' },
        { key: 'myOrders', label: 'Mes commandes' },
        { key: 'logout', label: 'Déconnexion' },
        { key: 'adminDashboard', label: 'Tableau de bord Admin' },
      ]
    },
    {
      name: 'Page d\'accueil',
      fields: [
        { key: 'chooseDepartment', label: 'Choisissez un rayon' },
        { key: 'newArrivals', label: 'Nouveautés' },
        { key: 'viewAll', label: 'Voir tout' },
        { key: 'featuredSelection', label: 'Sélection en vedette' },
        { key: 'shopNow', label: 'Acheter maintenant' },
        { key: 'heroTitle', label: 'Titre hero' },
        { key: 'heroSubtitle', label: 'Sous-titre hero', type: 'textarea' },
        { key: 'exploreNow', label: 'Découvrir maintenant' },
      ]
    },
    {
      name: 'Page catégorie',
      fields: [
        { key: 'home', label: 'Accueil' },
        { key: 'items', label: 'Articles' },
        { key: 'filters', label: 'Filtres' },
        { key: 'sortBy', label: 'Trier par' },
        { key: 'featured', label: 'En vedette' },
        { key: 'newest', label: 'Nouveautés' },
        { key: 'priceLowToHigh', label: 'Prix: Croissant' },
        { key: 'priceHighToLow', label: 'Prix: Décroissant' },
        { key: 'color', label: 'Couleur' },
        { key: 'size', label: 'Taille' },
        { key: 'clearAllFilters', label: 'Effacer tous les filtres' },
        { key: 'noProductsFound', label: 'Aucun produit trouvé', type: 'textarea' },
      ]
    },
    {
      name: 'Page produit',
      fields: [
        { key: 'addToCart', label: 'Ajouter au panier' },
        { key: 'addToWishlist', label: 'Ajouter à la liste de souhaits' },
        { key: 'productDetails', label: 'Détails du produit' },
        { key: 'quantity', label: 'Quantité' },
        { key: 'outOfStock', label: 'Rupture de stock' },
        { key: 'thisSize', label: 'Message rupture de stock' },
        { key: 'addedToCart', label: 'Ajouté au panier' },
      ]
    },
    {
      name: 'Panier',
      fields: [
        { key: 'shoppingCart', label: 'Panier' },
        { key: 'cartEmpty', label: 'Panier vide' },
        { key: 'startShopping', label: 'Message panier vide', type: 'textarea' },
        { key: 'continueShopping', label: 'Continuer vos achats' },
        { key: 'orderSummary', label: 'Résumé de la commande' },
        { key: 'subtotal', label: 'Sous-total' },
        { key: 'shipping', label: 'Livraison' },
        { key: 'free', label: 'Gratuit' },
        { key: 'total', label: 'Total' },
        { key: 'proceedToCheckout', label: 'Passer à la caisse' },
      ]
    },
    {
      name: 'Authentification',
      fields: [
        { key: 'welcomeBack', label: 'Bon retour' },
        { key: 'signInToAccount', label: 'Se connecter à votre compte' },
        { key: 'email', label: 'Email' },
        { key: 'password', label: 'Mot de passe' },
        { key: 'dontHaveAccount', label: 'Pas de compte?' },
        { key: 'alreadyHaveAccount', label: 'Déjà un compte?' },
        { key: 'createAccount', label: 'Créer un compte' },
        { key: 'joinBestShop', label: 'Rejoindre Best Shop' },
        { key: 'fullName', label: 'Nom complet' },
        { key: 'confirmPassword', label: 'Confirmer le mot de passe' },
        { key: 'demoCredentials', label: 'Identifiants de démonstration' },
      ]
    },
    {
      name: 'Footer',
      fields: [
        { key: 'customerService', label: 'Service Client' },
        { key: 'contactUs', label: 'Contactez-nous' },
        { key: 'faqs', label: 'FAQ' },
        { key: 'shippingDelivery', label: 'Livraison & Expédition' },
        { key: 'returns', label: 'Retours' },
        { key: 'aboutBestShop', label: 'À propos de Best Shop' },
        { key: 'aboutUs', label: 'À propos' },
        { key: 'careers', label: 'Carrières' },
        { key: 'sustainability', label: 'Durabilité' },
        { key: 'press', label: 'Presse' },
        { key: 'legal', label: 'Légal' },
        { key: 'termsConditions', label: 'Conditions Générales' },
        { key: 'privacyPolicy', label: 'Politique de Confidentialité' },
        { key: 'cookiePolicy', label: 'Politique des Cookies' },
        { key: 'newsletter', label: 'Newsletter' },
        { key: 'newsletterText', label: 'Texte newsletter', type: 'textarea' },
        { key: 'emailAddress', label: 'Adresse email' },
        { key: 'allRightsReserved', label: 'Tous droits réservés' },
      ]
    }
  ];

  // Render field based on type
  const renderField = (field) => {
    if (field.type === 'image') {
      return (
        <div key={field.key}>
          <Label>{field.label}</Label>
          <div className="mt-2">
            <ImageUploader
              images={texts[field.key] || ''}
              onChange={(url) => handleTextChange(field.key, url)}
              singleMode={true}
              disabled={!canWrite}
            />
          </div>
        </div>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key}>
          <Label htmlFor={field.key}>{field.label}</Label>
          <Textarea
            id={field.key}
            value={texts[field.key] || ''}
            onChange={(e) => handleTextChange(field.key, e.target.value)}
            className="mt-1"
            rows={3}
            disabled={!canWrite}
          />
        </div>
      );
    }

    return (
      <div key={field.key}>
        <Label htmlFor={field.key}>{field.label}</Label>
        <Input
          id={field.key}
          value={texts[field.key] || ''}
          onChange={(e) => handleTextChange(field.key, e.target.value)}
          className="mt-1"
          disabled={!canWrite}
        />
      </div>
    );
  };

  return (
    <div>
      <ReadOnlyBanner show={!canWrite} />
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-3xl font-light">Paramètres du Site</h1>
          <p className="text-gray-600 mt-2">Gérez tous les textes affichés sur votre site</p>
        </div>
        {canWrite && (
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleReset} data-testid="site-settings-reset-btn">
              <RotateCcw className="w-4 h-4 mr-2" />
              Réinitialiser
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges} data-testid="site-settings-save-btn">
              <Save className="w-4 h-4 mr-2" />
              Enregistrer les modifications
            </Button>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Textes du site</CardTitle>
          <CardDescription>
            Personnalisez tous les textes affichés sur votre site e-commerce.
            Les modifications seront visibles immédiatement après enregistrement.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="Header" className="w-full">
            <TabsList className="flex-wrap h-auto">
              {sections.map((section) => (
                <TabsTrigger key={section.name} value={section.name}>
                  {section.name}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.name} value={section.name} className="space-y-4 mt-6">
                {section.fields.map((field) => renderField(field))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {hasChanges && (
        <div className="fixed bottom-6 right-6 bg-orange-500 text-white px-6 py-3 rounded-lg shadow-lg">
          Vous avez des modifications non enregistrées
        </div>
      )}
    </div>
  );
};

export default SiteSettings;
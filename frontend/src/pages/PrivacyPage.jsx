import React from 'react';
import { useSiteTexts } from '../hooks/useSiteTexts';

const PrivacyPage = () => {
  const t = useSiteTexts();
  const siteName = t.siteName || 'Best Shop';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-light mb-6">Politique de Confidentialité et Gestion des Cookies</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
              <p>
                {siteName} s'engage à protéger votre vie privée et vos données personnelles conformément au Règlement Général sur la Protection des Données (RGPD).
                Cette politique explique comment nous collectons, utilisons et protégeons vos informations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Données collectées</h2>
              <p>Nous collectons les informations suivantes :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Informations d'identification : nom, prénom, adresse email</li>
                <li>Informations de livraison : adresse postale, numéro de téléphone</li>
                <li>Informations de paiement : détails de transaction (sécurisés)</li>
                <li>Données de navigation : cookies, adresse IP, type de navigateur</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Utilisation des données</h2>
              <p>Vos données sont utilisées pour :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Traiter vos commandes et assurer la livraison</li>
                <li>Gérer votre compte client</li>
                <li>Vous envoyer des communications marketing (avec votre consentement)</li>
                <li>Améliorer nos services et votre expérience d'achat</li>
                <li>Respecter nos obligations légales</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Cookies</h2>
              <p>
                Notre site utilise des cookies pour améliorer votre expérience. Les cookies sont de petits fichiers stockés sur votre appareil.
              </p>
              <div className="mt-3 space-y-2">
                <p><strong>Cookies essentiels :</strong> Nécessaires au fonctionnement du site (panier, authentification)</p>
                <p><strong>Cookies analytiques :</strong> Nous aident à comprendre comment vous utilisez notre site</p>
                <p><strong>Cookies marketing :</strong> Utilisés pour personnaliser les publicités (avec votre consentement)</p>
              </div>
              <p className="mt-3">
                Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Partage des données</h2>
              <p>
                Nous ne vendons jamais vos données personnelles. Nous pouvons partager vos informations avec :
              </p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li>Nos prestataires de services (livraison, paiement)</li>
                <li>Les autorités légales si requis par la loi</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Vos droits (RGPD)</h2>
              <p>Vous disposez des droits suivants :</p>
              <ul className="list-disc pl-6 mt-2 space-y-1">
                <li><strong>Droit d'accès :</strong> Consulter vos données personnelles</li>
                <li><strong>Droit de rectification :</strong> Corriger vos données inexactes</li>
                <li><strong>Droit à l'effacement :</strong> Supprimer vos données</li>
                <li><strong>Droit à la portabilité :</strong> Récupérer vos données</li>
                <li><strong>Droit d'opposition :</strong> Refuser le traitement de vos données</li>
                <li><strong>Droit de limitation :</strong> Limiter l'utilisation de vos données</li>
              </ul>
              <p className="mt-3">
                Pour exercer vos droits, contactez-nous à : privacy@bestshop.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Sécurité</h2>
              <p>
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données contre
                tout accès non autorisé, perte ou destruction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">8. Conservation des données</h2>
              <p>
                Vos données sont conservées pendant la durée nécessaire aux finalités pour lesquelles elles ont été collectées,
                conformément aux obligations légales.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">9. Modifications</h2>
              <p>
                Nous pouvons modifier cette politique de confidentialité. Les modifications seront publiées sur cette page
                avec la date de mise à jour.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">10. Contact</h2>
              <p>
                Pour toute question concernant cette politique :
                <br />
                Email : privacy@bestshop.com
                <br />
                Délégué à la Protection des Données (DPO) : dpo@bestshop.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;
import React from 'react';
import { useSiteTexts } from '../hooks/useSiteTexts';

const TermsPage = () => {
  const t = useSiteTexts();
  const siteName = t.siteName || 'Best Shop';

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-light mb-6">Conditions Générales d'Utilisation</h1>
          <p className="text-sm text-gray-500 mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')}</p>

          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Présentation du site</h2>
              <p>
                Le site {siteName} est une plateforme de commerce électronique permettant l'achat de produits de mode et d'accessoires.
                En utilisant notre site, vous acceptez les présentes conditions générales d'utilisation.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">2. Création de compte</h2>
              <p>
                Pour effectuer des achats sur {siteName}, vous devez créer un compte en fournissant des informations exactes et à jour.
                Vous êtes responsable de la confidentialité de votre mot de passe et de toutes les activités effectuées sous votre compte.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">3. Commandes et paiement</h2>
              <p>
                Toutes les commandes passées sur {siteName} sont soumises à acceptation et à la disponibilité des produits.
                Les prix sont indiqués en euros TTC. Nous acceptons les paiements par carte bancaire et autres moyens de paiement sécurisés.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">4. Livraison</h2>
              <p>
                Les délais de livraison sont indiqués lors de la commande. {siteName} s'engage à livrer les produits dans les meilleurs délais.
                La livraison est gratuite pour les commandes supérieures à 400€.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">5. Droit de rétractation</h2>
              <p>
                Conformément à la législation en vigueur, vous disposez d'un délai de 30 jours à compter de la réception de votre commande
                pour exercer votre droit de rétractation. Les retours sont gratuits.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">6. Propriété intellectuelle</h2>
              <p>
                Tous les contenus présents sur {siteName} (textes, images, logos) sont protégés par le droit d'auteur.
                Toute reproduction sans autorisation est interdite.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
              <p>
                Pour toute question concernant ces conditions générales, vous pouvez nous contacter à :
                <br />
                Email : contact@bestshop.com
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsPage;
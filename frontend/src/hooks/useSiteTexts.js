import { useState, useEffect } from 'react';
import { getSiteTexts } from '../mock/mockData';

// Hook pour utiliser les textes du site
export const useSiteTexts = () => {
  const [texts, setTexts] = useState(getSiteTexts());

  useEffect(() => {
    // Écouter les changements de textes
    const handleStorageChange = () => {
      setTexts(getSiteTexts());
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  return texts;
};

// Fonction utilitaire pour remplacer les variables dans les textes
export const replaceVars = (text, vars) => {
  if (!text || !vars) return text;
  let result = text;
  Object.keys(vars).forEach(key => {
    result = result.replace(`{${key}}`, vars[key]);
  });
  return result;
};
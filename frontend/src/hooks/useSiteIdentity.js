import { useEffect, useState } from 'react';
import { settingsApi } from '../services/api';
import { getSiteTexts } from '../mock/mockData';

// Hook to manage document title and favicon dynamically
export const useSiteIdentity = () => {
  const [siteSettings, setSiteSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        // First try API settings
        const settings = await settingsApi.getSite().catch(() => null);
        
        // Get local texts (includes siteName, siteLogo, siteFavicon)
        const localTexts = getSiteTexts();
        
        const mergedSettings = {
          ...settings,
          site_name: localTexts.siteName || settings?.site_name || 'BEST SHOP',
          meta_description: localTexts.metaDescription || settings?.meta_description,
          site_logo: localTexts.siteLogo || settings?.logo_url,
          site_favicon: localTexts.siteFavicon || settings?.favicon_url
        };
        
        setSiteSettings(mergedSettings);
        
        // Update document title
        if (mergedSettings.site_name) {
          document.title = mergedSettings.site_name;
        }
        
        // Update meta description
        if (mergedSettings.meta_description) {
          let metaDesc = document.querySelector('meta[name="description"]');
          if (!metaDesc) {
            metaDesc = document.createElement('meta');
            metaDesc.name = 'description';
            document.head.appendChild(metaDesc);
          }
          metaDesc.setAttribute('content', mergedSettings.meta_description);
        }
        
        // Update favicon
        if (mergedSettings.site_favicon) {
          let link = document.querySelector("link[rel*='icon']");
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.head.appendChild(link);
          }
          link.href = mergedSettings.site_favicon;
        }
      } catch (error) {
        console.error('Error fetching site settings:', error);
        // Fallback to local texts
        const localTexts = getSiteTexts();
        if (localTexts.siteName) {
          document.title = localTexts.siteName;
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
    
    // Listen for storage changes (when admin updates settings)
    const handleStorageChange = () => {
      fetchSettings();
    };
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return { siteSettings, loading };
};

// Hook to get style settings including logo and favicon
export const useSiteStyle = () => {
  const [styleSettings, setStyleSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const settings = await settingsApi.getStyle();
        setStyleSettings(settings);
      } catch (error) {
        console.error('Error fetching style settings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  return { styleSettings, loading };
};

// Component to initialize site identity (place in App.js)
const SiteIdentityProvider = ({ children }) => {
  useSiteIdentity();
  useSiteStyle();
  return children;
};

export default SiteIdentityProvider;

import { useEffect } from 'react';
import { getSiteTexts } from '../mock/mockData';

const ThemeProvider = ({ children }) => {
  useEffect(() => {
    const applyTheme = () => {
      const config = getSiteTexts();
      
      // Apply CSS variables
      document.documentElement.style.setProperty('--primary-color', config.primaryColor || '#000000');
      document.documentElement.style.setProperty('--secondary-color', config.secondaryColor || '#DC2626');
      document.documentElement.style.setProperty('--bg-color', config.backgroundColor || '#FFFFFF');
      document.documentElement.style.setProperty('--text-color', config.textColor || '#000000');
      document.documentElement.style.setProperty('--text-secondary-color', config.textSecondaryColor || '#6B7280');
      document.documentElement.style.setProperty('--font-family', config.fontFamily || 'sans-serif');
      document.documentElement.style.setProperty('--font-size', config.fontSize || '16px');
      document.documentElement.style.setProperty('--heading-font-size', config.headingFontSize || '24px');
      document.documentElement.style.setProperty('--button-radius', config.buttonRadius || '0px');
    };

    applyTheme();

    // Listen for storage changes (when admin updates settings)
    window.addEventListener('storage', applyTheme);
    
    return () => window.removeEventListener('storage', applyTheme);
  }, []);

  return children;
};

export default ThemeProvider;

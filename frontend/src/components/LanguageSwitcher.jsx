import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, Check } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../i18n';

const LanguageSwitcher = ({ compact = false }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const current = SUPPORTED_LANGUAGES.find(l => l.code === i18n.language) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    const onClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const onEsc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  const change = (code) => {
    i18n.changeLanguage(code);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        data-testid="language-switcher-trigger"
        onClick={() => setOpen(o => !o)}
        className="inline-flex items-center gap-1.5 px-2 py-1.5 rounded-md text-sm hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1"
        aria-label="Change language"
        aria-expanded={open}
      >
        <Globe className="w-4 h-4" />
        {!compact && <span className="hidden sm:inline">{current.flag}</span>}
        <span className="text-xs font-medium uppercase">{current.code}</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 min-w-[170px] bg-white border border-gray-200 rounded-md shadow-lg z-50 py-1"
          data-testid="language-switcher-menu"
        >
          {SUPPORTED_LANGUAGES.map(l => {
            const active = i18n.language === l.code;
            return (
              <button
                key={l.code}
                type="button"
                data-testid={`language-option-${l.code}`}
                onClick={() => change(l.code)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-gray-100 transition-colors ${active ? 'font-semibold bg-gray-50' : ''}`}
                role="menuitem"
              >
                <span className="text-base">{l.flag}</span>
                <span className="flex-1">{l.label}</span>
                {active && <Check className="w-4 h-4 text-green-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;

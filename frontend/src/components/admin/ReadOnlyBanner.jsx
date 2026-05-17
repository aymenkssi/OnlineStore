import React from 'react';
import { useTranslation } from 'react-i18next';
import { BookOpen, ShieldAlert } from 'lucide-react';

const ReadOnlyBanner = ({ show }) => {
  const { t } = useTranslation();
  if (!show) return null;
  return (
    <div className="mb-6 px-4 py-3 bg-amber-50 border border-amber-300 rounded-lg flex items-center gap-3" data-testid="read-only-banner">
      <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-5 h-5 text-amber-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-amber-800 flex items-center gap-1">
          <ShieldAlert className="w-4 h-4" />
          {t('adminLayout.readOnlyMode')}
        </p>
        <p className="text-xs text-amber-700">{t('adminLayout.readOnlyHint')}</p>
      </div>
    </div>
  );
};

export default ReadOnlyBanner;

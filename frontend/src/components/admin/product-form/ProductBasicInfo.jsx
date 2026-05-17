import React, { useState } from 'react';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Textarea } from '../../ui/textarea';
import { Globe, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_LANGUAGES } from '../../../i18n';

const ProductBasicInfo = ({ formData, setFormData, brands, loading }) => {
  const [activeLang, setActiveLang] = useState('fr');

  // Initialize translations object if missing (legacy products)
  const translations = formData.translations || {
    fr: { name: formData.name || '', description: formData.description || '' },
    en: { name: '', description: '' },
    ar: { name: '', description: '' },
  };

  const updateTranslation = (lang, field, value) => {
    const next = {
      ...translations,
      [lang]: { ...(translations[lang] || {}), [field]: value },
    };
    const update = { ...formData, translations: next };
    // FR is mirrored to top-level fields for backwards compatibility
    if (lang === 'fr') {
      if (field === 'name') update.name = value;
      if (field === 'description') update.description = value;
    }
    setFormData(update);
  };

  const isFilled = (lang) =>
    Boolean((translations[lang]?.name || '').trim() || (translations[lang]?.description || '').trim());

  const handleAutoTranslate = async () => {
    const fr = translations.fr || {};
    if (!(fr.name || '').trim() && !(fr.description || '').trim()) {
      toast({ title: 'Erreur', description: 'Remplissez d\'abord le nom et/ou la description en français.', variant: 'destructive' });
      return;
    }
    setTranslating(true);
    try {
      const res = await autoTranslateBatch([
        { key: 'name', text: fr.name || '' },
        { key: 'description', text: fr.description || '' },
      ], ['en', 'ar'], 'fr');
      setFormData({
        ...formData,
        translations: {
          fr: translations.fr,
          en: { name: res.en?.name || translations.en?.name || '', description: res.en?.description || translations.en?.description || '' },
          ar: { name: res.ar?.name || translations.ar?.name || '', description: res.ar?.description || translations.ar?.description || '' },
        },
      });
      toast({ title: 'Traduction terminée', description: 'EN et AR pré-remplis.' });
    } catch (e) {
      toast({ title: 'Erreur', description: String(e.message || e), variant: 'destructive' });
    }
    setTranslating(false);
  };

  const langDef = SUPPORTED_LANGUAGES.find(l => l.code === activeLang);
  const current = translations[activeLang] || { name: '', description: '' };

  return (
  <>
    {/* Multilingual name + description editor */}
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <Label className="flex items-center gap-2 mb-2 font-semibold">
        <Globe className="w-4 h-4" /> Contenu produit (multilingue)
      </Label>
      <div className="flex flex-wrap gap-2 mb-3">
        {SUPPORTED_LANGUAGES.map(l => (
          <button
            key={l.code}
            type="button"
            data-testid={`product-lang-tab-${l.code}`}
            onClick={() => setActiveLang(l.code)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeLang === l.code ? 'bg-black text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span>{l.flag}</span>
            <span>{l.label}</span>
            {isFilled(l.code) && (
              <CheckCircle2 className={`w-3.5 h-3.5 ${activeLang === l.code ? 'text-green-300' : 'text-green-600'}`} />
            )}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <Label htmlFor={`name-${activeLang}`}>Nom du produit ({langDef?.label})</Label>
          <Input
            id={`name-${activeLang}`}
            data-testid={`product-name-input-${activeLang}`}
            value={current.name || ''}
            onChange={(e) => updateTranslation(activeLang, 'name', e.target.value)}
            placeholder={activeLang === 'fr' ? 'Ex : T-shirt classique' : activeLang === 'en' ? 'e.g. Classic T-shirt' : 'مثال: تيشيرت كلاسيكي'}
            dir={langDef?.dir || 'ltr'}
            required={activeLang === 'fr'}
          />
        </div>
        <div>
          <Label htmlFor={`description-${activeLang}`}>Description ({langDef?.label})</Label>
          <Textarea
            id={`description-${activeLang}`}
            data-testid={`product-description-${activeLang}`}
            value={current.description || ''}
            onChange={(e) => updateTranslation(activeLang, 'description', e.target.value)}
            rows={3}
            dir={langDef?.dir || 'ltr'}
            required={activeLang === 'fr'}
          />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Le français est obligatoire. Les autres langues utilisent le français comme repli si vides.
      </p>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleAutoTranslate}
        disabled={translating}
        className="mt-2"
        data-testid="product-auto-translate-btn"
      >
        {translating ? (
          <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Traduction…</>
        ) : (
          <><Wand2 className="w-3.5 h-3.5 mr-2" /> Traduire FR → EN + AR</>
        )}
      </Button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="brand">Marque</Label>
        {loading ? (
          <div className="h-9 flex items-center text-sm text-gray-500">Chargement des marques...</div>
        ) : (
          <select
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            data-testid="brand-select"
          >
            <option value="">Selectionner une marque</option>
            {brands.map((brand) => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>
        )}
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div>
        <Label htmlFor="purchasePrice">Prix d'achat (EUR)</Label>
        <Input
          id="purchasePrice"
          data-testid="purchase-price-input"
          type="number"
          step="0.01"
          value={formData.purchasePrice}
          onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
          placeholder="0.00"
        />
        <p className="text-xs text-gray-500 mt-1">Cout d'achat du produit</p>
      </div>
      <div>
        <Label htmlFor="price">Prix de vente (EUR)</Label>
        <Input
          id="price"
          data-testid="sale-price-input"
          type="number"
          step="0.01"
          value={formData.price}
          onChange={(e) => setFormData({ ...formData, price: e.target.value })}
          required
        />
      </div>
      <div>
        <Label htmlFor="originalPrice">Prix Original (Optionnel)</Label>
        <Input
          id="originalPrice"
          data-testid="original-price-input"
          type="number"
          step="0.01"
          value={formData.originalPrice}
          onChange={(e) => setFormData({ ...formData, originalPrice: e.target.value })}
        />
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor="promotionStartDate">Date Debut Promotion (Optionnel)</Label>
        <Input
          id="promotionStartDate"
          data-testid="promo-start-date"
          type="date"
          value={formData.promotionStartDate}
          onChange={(e) => setFormData({ ...formData, promotionStartDate: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">La promotion commence a cette date</p>
      </div>
      <div>
        <Label htmlFor="promotionEndDate">Date Fin Promotion (Optionnel)</Label>
        <Input
          id="promotionEndDate"
          data-testid="promo-end-date"
          type="date"
          value={formData.promotionEndDate}
          onChange={(e) => setFormData({ ...formData, promotionEndDate: e.target.value })}
        />
        <p className="text-xs text-gray-500 mt-1">La promotion se termine a cette date</p>
      </div>
    </div>
  </>
  );
};

export default ProductBasicInfo;

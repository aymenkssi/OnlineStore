import React, { useState } from 'react';
import { categoriesApi } from '../../services/api';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from '../../hooks/use-toast';
import { Plus, X, Loader2, ChevronDown, ChevronRight, Globe, CheckCircle2, Wand2 } from 'lucide-react';
import ImageUploader from '../ImageUploader';
import { SUPPORTED_LANGUAGES } from '../../i18n';
import { autoTranslate } from '../../services/translate';

const buildInitialTranslations = (category) => {
  const t = category?.translations || {};
  return {
    fr: { name: t.fr?.name || category?.name || '' },
    en: { name: t.en?.name || '' },
    ar: { name: t.ar?.name || '' },
  };
};

const CategoryForm = ({ category, onClose }) => {
  const [submitting, setSubmitting] = useState(false);
  const [expandedSubs, setExpandedSubs] = useState({});
  const [activeLang, setActiveLang] = useState('fr');
  const [translations, setTranslations] = useState(buildInitialTranslations(category));
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    image: category?.image || '',
    subcategories: category?.subcategories?.map(sub => ({
      ...sub,
      children: sub.children || []
    })) || [{ name: '', slug: '', children: [] }]
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const categoryData = {
        ...formData,
        // Top-level category translations (FR is also mirrored to legacy `name` field)
        translations: {
          fr: { name: translations.fr.name || formData.name },
          en: { name: translations.en.name || '' },
          ar: { name: translations.ar.name || '' },
        },
        name: translations.fr.name || formData.name,
        subcategories: formData.subcategories
          .filter(sub => sub.name && sub.slug)
          .map((sub, index) => ({
            id: sub.id || index + 1,
            name: sub.name,
            slug: sub.slug,
            isPromotion: sub.isPromotion || false,
            translations: sub.translations || { fr: { name: sub.name }, en: { name: '' }, ar: { name: '' } },
            children: (sub.children || [])
              .filter(child => child.name && child.slug)
              .map((child, cidx) => ({
                id: child.id || cidx + 1,
                name: child.name,
                slug: child.slug,
                translations: child.translations || { fr: { name: child.name }, en: { name: '' }, ar: { name: '' } }
              }))
          }))
      };

      if (category) {
        await categoriesApi.update(category.id || category.slug, categoryData);
        toast({ title: "Catégorie mise à jour avec succès" });
      } else {
        await categoriesApi.create(categoryData);
        toast({ title: "Catégorie ajoutée avec succès" });
      }

      onClose(true);
    } catch (error) {
      console.error('Error saving category:', error);
      toast({ title: "Erreur", description: error.message || "Impossible de sauvegarder la catégorie", variant: "destructive" });
    }
    setSubmitting(false);
  };

  const addSubcategory = () => {
    setFormData({
      ...formData,
      subcategories: [...formData.subcategories, { name: '', slug: '', children: [] }]
    });
  };

  const removeSubcategory = (index) => {
    const newSubcategories = formData.subcategories.filter((_, i) => i !== index);
    setFormData({ ...formData, subcategories: newSubcategories });
  };

  const updateSubcategory = (index, field, value) => {
    const newSubcategories = [...formData.subcategories];
    newSubcategories[index] = { ...newSubcategories[index], [field]: value };
    
    if (field === 'name') {
      newSubcategories[index].slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    setFormData({ ...formData, subcategories: newSubcategories });
  };

  // Sub-subcategory (children) management
  const addChild = (subIndex) => {
    const newSubcategories = [...formData.subcategories];
    newSubcategories[subIndex] = {
      ...newSubcategories[subIndex],
      children: [...(newSubcategories[subIndex].children || []), { name: '', slug: '' }]
    };
    setFormData({ ...formData, subcategories: newSubcategories });
    setExpandedSubs({ ...expandedSubs, [subIndex]: true });
  };

  const removeChild = (subIndex, childIndex) => {
    const newSubcategories = [...formData.subcategories];
    newSubcategories[subIndex] = {
      ...newSubcategories[subIndex],
      children: newSubcategories[subIndex].children.filter((_, i) => i !== childIndex)
    };
    setFormData({ ...formData, subcategories: newSubcategories });
  };

  const updateChild = (subIndex, childIndex, field, value) => {
    const newSubcategories = [...formData.subcategories];
    const newChildren = [...newSubcategories[subIndex].children];
    newChildren[childIndex] = { ...newChildren[childIndex], [field]: value };
    
    if (field === 'name') {
      newChildren[childIndex].slug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    }
    
    newSubcategories[subIndex] = { ...newSubcategories[subIndex], children: newChildren };
    setFormData({ ...formData, subcategories: newSubcategories });
  };

  const toggleExpanded = (index) => {
    setExpandedSubs({ ...expandedSubs, [index]: !expandedSubs[index] });
  };

  const [translating, setTranslating] = useState(false);

  const handleAutoTranslate = async () => {
    const fr = translations.fr?.name || formData.name || '';
    if (!fr.trim()) {
      toast({ title: 'Erreur', description: 'Saisissez d\'abord le nom en français.', variant: 'destructive' });
      return;
    }
    setTranslating(true);
    try {
      const res = await autoTranslate(fr, ['en', 'ar'], 'fr');
      setTranslations(prev => ({
        fr: prev.fr,
        en: { name: res.en || prev.en?.name || '' },
        ar: { name: res.ar || prev.ar?.name || '' },
      }));
      toast({ title: 'Traduction terminée', description: 'EN et AR pré-remplis.' });
    } catch (e) {
      toast({ title: 'Erreur', description: String(e.message || e), variant: 'destructive' });
    }
    setTranslating(false);
  };

  const handleNameChange = (value) => {
    setFormData({
      ...formData,
      name: value,
      slug: value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
    });
    setTranslations(prev => ({ ...prev, fr: { name: value } }));
  };

  const updateTranslation = (lang, value) => {
    setTranslations(prev => ({ ...prev, [lang]: { name: value } }));
    if (lang === 'fr') {
      setFormData(prev => ({
        ...prev,
        name: value,
        slug: prev.slug || value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      }));
    }
  };

  const langDef = SUPPORTED_LANGUAGES.find(l => l.code === activeLang);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
      {/* Multilingual name editor */}
      <div>
        <Label className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4" /> Nom de la catégorie (multilingue)
        </Label>
        <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-3 mb-3">
          {SUPPORTED_LANGUAGES.map(l => (
            <button
              key={l.code}
              type="button"
              data-testid={`cat-lang-tab-${l.code}`}
              onClick={() => setActiveLang(l.code)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeLang === l.code ? 'bg-black text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.label}</span>
              {translations[l.code]?.name?.trim() && (
                <CheckCircle2 className={`w-3.5 h-3.5 ${activeLang === l.code ? 'text-green-300' : 'text-green-600'}`} />
              )}
            </button>
          ))}
        </div>
        <Input
          id="name"
          value={translations[activeLang]?.name || ''}
          onChange={(e) => updateTranslation(activeLang, e.target.value)}
          placeholder={activeLang === 'fr' ? 'ex: Mode Femme' : activeLang === 'en' ? 'e.g. Women fashion' : 'مثال: أزياء نسائية'}
          required={activeLang === 'fr'}
          data-testid={`category-name-input-${activeLang}`}
          dir={langDef?.dir || 'ltr'}
        />
        <p className="text-xs text-gray-500 mt-1">
          La langue française est obligatoire. Les autres langues utiliseront le français comme repli si elles sont vides.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAutoTranslate}
          disabled={translating}
          className="mt-2"
          data-testid="cat-auto-translate-btn"
        >
          {translating ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Traduction…</>
          ) : (
            <><Wand2 className="w-3.5 h-3.5 mr-2" /> Traduire FR → EN + AR</>
          )}
        </Button>
      </div>

      <div>
        <Label htmlFor="slug">Slug (URL)</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          placeholder="ex: mode-femme"
          required
          data-testid="category-slug-input"
        />
      </div>

      <div>
        <Label>Image de la catégorie</Label>
        <ImageUploader
          images={formData.image}
          onChange={(url) => setFormData({ ...formData, image: url })}
          singleMode={true}
        />
      </div>

      {/* Subcategories with nested children */}
      <div>
        <Label className="text-base font-semibold">Sous-catégories</Label>
        <div className="space-y-4 mt-3">
          {formData.subcategories.map((sub, index) => (
            <div key={sub.id || sub.slug || `new-sub-${index}`} className="border border-gray-200 rounded-lg p-3">
              {/* Subcategory row */}
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={() => toggleExpanded(index)}
                  className="p-1 hover:bg-gray-100 rounded"
                  data-testid={`toggle-sub-${index}`}
                >
                  {expandedSubs[index] ? (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                <Input
                  value={sub.name}
                  onChange={(e) => updateSubcategory(index, 'name', e.target.value)}
                  placeholder="Nom de la sous-catégorie"
                  className="flex-1"
                  data-testid={`subcategory-name-${index}`}
                />
                <Input
                  value={sub.slug}
                  onChange={(e) => updateSubcategory(index, 'slug', e.target.value)}
                  placeholder="slug"
                  className="w-36"
                  data-testid={`subcategory-slug-${index}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addChild(index)}
                  title="Ajouter sous-sous-catégorie"
                  data-testid={`add-child-${index}`}
                >
                  <Plus className="w-3 h-3" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => removeSubcategory(index)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {/* Children (sub-subcategories) */}
              {expandedSubs[index] && sub.children && sub.children.length > 0 && (
                <div className="ml-8 mt-3 space-y-2 border-l-2 border-gray-200 pl-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sous-sous-catégories</p>
                  {sub.children.map((child, cidx) => (
                    <div key={child.id || child.slug || `new-child-${index}-${cidx}`} className="flex gap-2 items-center">
                      <Input
                        value={child.name}
                        onChange={(e) => updateChild(index, cidx, 'name', e.target.value)}
                        placeholder="Nom"
                        className="flex-1 h-8 text-sm"
                        data-testid={`child-name-${index}-${cidx}`}
                      />
                      <Input
                        value={child.slug}
                        onChange={(e) => updateChild(index, cidx, 'slug', e.target.value)}
                        placeholder="slug"
                        className="w-32 h-8 text-sm"
                        data-testid={`child-slug-${index}-${cidx}`}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeChild(index, cidx)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="w-3 h-3 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Show children count badge */}
              {sub.children && sub.children.length > 0 && !expandedSubs[index] && (
                <p className="ml-8 mt-1 text-xs text-gray-400">
                  {sub.children.length} sous-sous-catégorie(s)
                </p>
              )}
            </div>
          ))}
        </div>
        <Button type="button" variant="outline" size="sm" onClick={addSubcategory} className="mt-3">
          <Plus className="w-4 h-4 mr-2" /> Ajouter une sous-catégorie
        </Button>
      </div>

      <div className="flex justify-end space-x-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => onClose(false)} disabled={submitting}>
          Annuler
        </Button>
        <Button type="submit" disabled={submitting} data-testid="submit-category-btn">
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {category ? 'Mise à jour...' : 'Création...'}
            </>
          ) : (
            <>{category ? 'Mettre à jour' : 'Créer'} la catégorie</>
          )}
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;

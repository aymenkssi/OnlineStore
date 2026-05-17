/**
 * Translation helpers for multilingual entities (categories, products, etc.)
 * Each entity has an optional `translations: {fr, en, ar}` object.
 * If the requested language is empty, fallback to French (which always has a value).
 */

export const FALLBACK_LANG = 'fr';

/**
 * Returns the translated value of a field for the given language, with FR fallback.
 *
 *   tField(category, 'name', 'en')      → "Women" or "Femme" (fallback)
 *   tField(product, 'description', 'ar') → Arabic if set, else French, else ''
 */
export const tField = (entity, field, lang) => {
  if (!entity) return '';
  const translations = entity.translations || {};
  const requested = translations[lang]?.[field];
  if (requested && String(requested).trim()) return requested;
  // Fallback to FR translations
  const french = translations[FALLBACK_LANG]?.[field];
  if (french && String(french).trim()) return french;
  // Last resort: top-level field (legacy data)
  return entity[field] || '';
};

/** Convenience for category name. */
export const tCatName = (category, lang) => tField(category, 'name', lang);

/** Convenience for product name + description. */
export const tProductName = (product, lang) => tField(product, 'name', lang);
export const tProductDescription = (product, lang) => tField(product, 'description', lang);

/** Build an empty translations object (for forms initial state). */
export const emptyEntityTranslations = (fields = ['name']) => {
  const empty = Object.fromEntries(fields.map(f => [f, '']));
  return { fr: { ...empty }, en: { ...empty }, ar: { ...empty } };
};

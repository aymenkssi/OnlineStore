/**
 * Auto-translation helper using the backend /api/translate proxy (MyMemory).
 * The backend requires admin auth (Bearer token in localStorage).
 */
const API_URL = process.env.REACT_APP_BACKEND_URL;

const _authHeaders = () => {
  const token = (() => { try { return localStorage.getItem('access_token'); } catch { return null; } })();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

/** Translate a single string from `source` (default fr) into multiple target languages. */
export const autoTranslate = async (text, targetLangs = ['en', 'ar'], source = 'fr') => {
  if (!text || !text.trim()) return Object.fromEntries(targetLangs.map(l => [l, '']));
  const res = await fetch(`${API_URL}/api/translate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ text, source_lang: source, target_langs: targetLangs }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Translation failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.translations || {};
};

/**
 * Translate multiple fields at once.
 * items: [{ key: 'name', text: '...' }, { key: 'description', text: '...' }]
 * Returns: { en: { name: '...', description: '...' }, ar: { ... } }
 */
export const autoTranslateBatch = async (items, targetLangs = ['en', 'ar'], source = 'fr') => {
  const filtered = items.filter(it => it.text && it.text.trim());
  if (!filtered.length) return Object.fromEntries(targetLangs.map(l => [l, {}]));
  const res = await fetch(`${API_URL}/api/translate/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ..._authHeaders() },
    body: JSON.stringify({ items: filtered, source_lang: source, target_langs: targetLangs }),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`Batch translation failed: ${res.status} ${err}`);
  }
  const data = await res.json();
  return data.results || {};
};

/**
 * Permission level utilities for admin pages.
 *
 * Format stored in DB: ["dashboard:r", "manage_orders:rw", "view_customers:r"]
 *   :r  = read only   (can view, cannot modify/create/delete)
 *   :rw = read + write (full access)
 *   no suffix (legacy) = treated as :rw
 *
 * Usage in components:
 *   import { useCanWrite } from '../../hooks/usePermissions';
 *   const canWrite = useCanWrite('manage_orders');
 *   <Button disabled={!canWrite}>Supprimer</Button>
 */
import { useState, useEffect } from 'react';

const STORAGE_KEY = 'adminPermissions';

// Saved by AdminLayout when it loads the DB permissions
export const saveAdminPermissions = (permsArrayOrAll) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(permsArrayOrAll));
};

export const clearAdminPermissions = () => {
  localStorage.removeItem(STORAGE_KEY);
};

// Parse raw array into { key: 'r'|'rw' } map
const buildMap = (raw) => {
  if (raw === 'all') return 'all';
  const map = {};
  (raw || []).forEach(p => {
    if (typeof p !== 'string') return;
    if (p.endsWith(':r')) map[p.slice(0, -2)] = 'r';
    else if (p.endsWith(':rw')) map[p.slice(0, -3)] = 'rw';
    else map[p] = 'rw';
  });
  return map;
};

const getStoredMap = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return buildMap(raw);
  } catch {
    return 'all';
  }
};

/** Returns true if current admin can write (create/update/delete) for this permission key */
export const canWrite = (permissionKey) => {
  const map = getStoredMap();
  if (map === 'all') return true;
  return map[permissionKey] === 'rw';
};

/** Returns true if current admin has at least read access */
export const canRead = (permissionKey) => {
  const map = getStoredMap();
  if (map === 'all') return true;
  return !!map[permissionKey];
};

/** React hook version — triggers re-render on mount */
export const useCanWrite = (permissionKey) => {
  const [writable, setWritable] = useState(true);
  useEffect(() => { setWritable(canWrite(permissionKey)); }, [permissionKey]);
  return writable;
};

export const useCanRead = (permissionKey) => {
  const [readable, setReadable] = useState(true);
  useEffect(() => { setReadable(canRead(permissionKey)); }, [permissionKey]);
  return readable;
};

export default { canWrite, canRead, useCanWrite, useCanRead, saveAdminPermissions, clearAdminPermissions };

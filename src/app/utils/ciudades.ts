import { Ciudad, CiudadCatalogo } from '../types';

export const normalizeCiudad = (value: unknown) => {
  const v =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object'
        ? (value as any).codigo || (value as any).ciudad || ''
        : String(value ?? '');
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
};

export const labelCiudad = (codigo: Ciudad, catalogo?: CiudadCatalogo[]) => {
  const key = String(codigo || '').trim();
  if (!key) return '';
  const found = (catalogo || []).find((c) => c.codigo === key);
  if (found?.nombre) return found.nombre;
  return key.replaceAll('_', ' ');
};

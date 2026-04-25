import { Ciudad, CiudadCatalogo } from '../types';

export const labelCiudad = (codigo: Ciudad, catalogo?: CiudadCatalogo[]) => {
  const key = String(codigo || '').trim();
  if (!key) return '';
  const found = (catalogo || []).find((c) => c.codigo === key);
  if (found?.nombre) return found.nombre;
  return key.replaceAll('_', ' ');
};


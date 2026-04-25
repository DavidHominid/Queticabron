import { Especialidad, EspecialidadCatalogo } from '../types';

export const labelEspecialidad = (codigo: Especialidad, catalogo?: EspecialidadCatalogo[]) => {
  const key = String(codigo || '').trim();
  if (!key) return '';
  const found = (catalogo || []).find((e) => e.codigo === key);
  if (found?.nombre) return found.nombre;
  return key.replaceAll('_', ' ');
};


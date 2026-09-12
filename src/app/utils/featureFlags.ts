export const FEATURES = {
  POOL_MULTI_MEDICO: true,
  BLOQUES_N_M: false,
  TRIAGE_OPCIONAL: true,
  CHECKIN_RECEPCION: true,
  EDITABLE_INFO_MEDICA: true,
} as const;

export type FeatureKey = keyof typeof FEATURES;

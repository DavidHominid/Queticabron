const STORAGE_KEY = 'app.nowOverride';
const QUERY_KEY = 'now';

const canUseDom = () => typeof window !== 'undefined' && typeof window.document !== 'undefined';

const parseOverride = (raw: string | null | undefined) => {
  const s = String(raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isFinite(d.getTime())) return null;
  return d;
};

export const getNowOverride = () => {
  if (!canUseDom()) return null;
  const fromQuery = (() => {
    try {
      const v = new URLSearchParams(window.location.search).get(QUERY_KEY);
      return v;
    } catch {
      return null;
    }
  })();
  const parsedQuery = parseOverride(fromQuery);
  if (parsedQuery) return parsedQuery;
  return parseOverride(window.localStorage.getItem(STORAGE_KEY));
};

export const setNowOverride = (isoOrNull: string | null) => {
  if (!canUseDom()) return;
  const s = String(isoOrNull || '').trim();
  if (!s) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  const parsed = parseOverride(s);
  if (!parsed) return;
  window.localStorage.setItem(STORAGE_KEY, s);
};

export const now = () => getNowOverride() || new Date();

export const nowMs = () => now().getTime();

export const nowIso = () => now().toISOString();

export const todayYmd = () => {
  const d = now();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export const formatDateYmd = (ymd: string | null | undefined): string => {
  if (!ymd) return '';
  const clean = String(ymd).trim();
  if (!clean) return '';
  const parts = clean.split('T')[0].split('-');
  if (parts.length === 3) {
    const [y, m, d] = parts;
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      return `${d}/${m}/${y}`;
    }
  }
  return clean;
};

import { useEffect, useId, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { User as AppUser } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AppLogo } from './AppLogo';
import {
  AlertCircle,
  CalendarCheck,
  CalendarRange,
  Loader2,
  Lock,
  ShieldCheck,
  Stethoscope,
  User,
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { getNowOverride, setNowOverride } from '../utils/clock';

const isAppUser = (v: unknown): v is AppUser => {
  if (!v || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  const rol = obj.rol;
  const rolOk = rol === 'recepcion' || rol === 'triage' || rol === 'medico' || rol === 'administrador';
  return typeof obj.id === 'string' && typeof obj.nombre === 'string' && rolOk && typeof obj.ciudad === 'string';
};

export function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { t } = useLanguage();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clockOpen, setClockOpen] = useState(false);
  const [clockDate, setClockDate] = useState('');
  const [clockTime, setClockTime] = useState('08:00');
  const errorId = useId();
  const errorRef = useRef<HTMLDivElement | null>(null);
  const showTestHints = Boolean((import.meta as any)?.env?.DEV);
  const [clockPreview, setClockPreview] = useState<string | null>(() => {
    const d = getNowOverride();
    if (!d) return null;
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  });

  const handleSubmit: React.FormEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, password }),
      });

      let data: unknown = null;
      try {
        data = await res.json();
      } catch {
        data = null;
      }

      if (res.ok) {
        if (!isAppUser(data)) {
          setError(t('login.error.invalid_response'));
          return;
        }
        login(data);
        navigate('/dashboard');
      } else {
        const backendError =
          typeof data === 'object' && data && 'error' in data && typeof (data as any).error === 'string'
            ? (data as any).error
            : '';
        
        if (backendError === 'Usuario no activo') {
          setError(t('login.error.inactive_user'));
        } else if (backendError === 'Credenciales inválidas' || res.status === 401) {
          setError(t('login.error.incorrect_credentials'));
        } else {
          setError(t('login.error.generic'));
        }
      }
    } catch (err) {
      setError(t('login.error.connection'));
    } finally {
      setLoading(false);
    }
  };

  const openClock = () => {
    const d = getNowOverride() || new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    setClockDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setClockTime(`${pad(d.getHours())}:${pad(d.getMinutes())}`);
    setClockOpen(true);
  };

  const clearClock = () => {
    setNowOverride(null);
    setClockPreview(null);
  };

  const saveClock = () => {
    const date = String(clockDate || '').trim();
    const time = String(clockTime || '').trim();
    if (!date || !time) return;
    setNowOverride(`${date}T${time}:00`);
    setClockPreview(`${date} ${time}`);
    setClockOpen(false);
  };

  useEffect(() => {
    if (!error) return;
    errorRef.current?.focus();
  }, [error]);

  const shellStyle: React.CSSProperties = {
    backgroundColor: 'var(--background)',
    backgroundImage:
      'radial-gradient(900px circle at 12% 12%, color-mix(in oklab, var(--primary) 16%, transparent), transparent 60%),' +
      'radial-gradient(850px circle at 88% 18%, color-mix(in oklab, var(--secondary) 14%, transparent), transparent 55%),' +
      'radial-gradient(900px circle at 84% 88%, color-mix(in oklab, var(--brand-soft-peach) 55%, transparent), transparent 62%)',
  };

  return (
    <div className="min-h-screen px-4 py-10 sm:px-6 lg:px-8" style={shellStyle}>
      <div className="mx-auto flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border bg-card shadow-sm lg:min-h-[640px] 2xl:max-w-7xl">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-secondary to-[color:var(--brand-tertiary)]" />
        <div className="grid w-full flex-1 grid-cols-1 lg:grid-cols-2">
          <aside className="relative hidden overflow-hidden border-b bg-accent px-10 py-12 lg:block lg:border-b-0 lg:border-r xl:px-14">
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <AppLogo className="h-7 w-7" inverted alt="Logo" />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-foreground">{t('login.brand_title')}</div>
                  <div className="truncate text-xs text-muted-foreground">{t('login.brand_subtitle')}</div>
                </div>
              </div>

              <div className="mt-10">
                <h2 className="mt-4 text-balance text-3xl font-semibold leading-tight text-foreground">
                  {t('login.side_title')}
                </h2>
                <p className="mt-3 text-pretty text-sm text-muted-foreground">
                  {t('login.side_desc')}
                </p>
              </div>

              <div className="mt-10 grid grid-cols-6 gap-3">
                <div className="col-span-6 rounded-xl border bg-card/70 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                      <CalendarCheck aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{t('login.side_agenda_title')}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t('login.side_agenda_desc')}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card/60 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-[color:var(--brand-soft-peach)] text-[color:var(--accent-foreground)]">
                      <Stethoscope aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{t('login.side_triage_title')}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t('login.side_triage_desc')}</div>
                    </div>
                  </div>
                </div>
                <div className="col-span-3 rounded-xl border bg-card/60 px-4 py-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/15 text-[color:var(--brand-secondary-strong)]">
                      <ShieldCheck aria-hidden="true" className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{t('login.side_consultation_title')}</div>
                      <div className="mt-1 text-sm text-muted-foreground">{t('login.side_consultation_desc')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <svg
              aria-hidden="true"
              className="pointer-events-none absolute -left-24 top-8 h-[520px] w-[520px] text-primary/15"
              viewBox="0 0 600 600"
              fill="none"
            >
              <path
                d="M74 206c66-74 154-111 264-111 110 0 198 37 264 111"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M64 286c72-64 163-96 274-96 112 0 203 32 274 96"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M78 364c72-52 159-78 260-78 101 0 188 26 260 78"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M108 438c62-38 139-57 230-57 91 0 168 19 230 57"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>

            <div className="pointer-events-none absolute -right-16 top-10 h-72 w-72 rounded-full bg-primary/18 blur-3xl" />
            <div className="pointer-events-none absolute -left-14 bottom-8 h-72 w-72 rounded-full bg-secondary/14 blur-3xl" />
          </aside>

          <section className="flex flex-col justify-center px-6 py-10 sm:px-10 xl:px-14">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-3 lg:hidden">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <AppLogo className="h-6 w-6" inverted alt="Logo" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{t('login.brand_title')}</div>
                    <div className="truncate text-xs text-muted-foreground">{t('login.brand_subtitle')}</div>
                  </div>
                </div>
                <h1 className="text-balance text-3xl font-semibold leading-tight sm:text-4xl">{t('login.welcome')}</h1>
                <p className="mt-2 text-pretty text-sm text-muted-foreground sm:text-base">
                  {t('login.subtitle')}
                </p>
              </div>
            </div>

            {error && (
              <div
                id={errorId}
                ref={errorRef}
                role="alert"
                aria-live="assertive"
                tabIndex={-1}
                className="mt-6 flex items-start gap-3 rounded-xl border border-[color:var(--brand-tertiary)] bg-[color:var(--brand-soft-peach)] px-4 py-3 text-[color:var(--accent-foreground)]"
              >
                <AlertCircle aria-hidden="true" className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-sm font-semibold">{t('login.review_data')}</div>
                  <div className="mt-1 break-words text-sm leading-relaxed">{error}</div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-8 space-y-5" aria-busy={loading}>
              <div className="space-y-2">
                <Label htmlFor="usuario">{t('login.user')}</Label>
                <div className="relative">
                  <User aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="usuario"
                    name="usuario"
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="recepcion"
                    className="pl-10"
                    value={usuario}
                    onChange={(e) => setUsuario(e.target.value)}
                    required
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">{t('login.password')}</Label>
                <div className="relative">
                  <Lock aria-hidden="true" className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    placeholder="••••••••"
                    className="pl-10"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    aria-describedby={error ? errorId : undefined}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Button
                  type="submit"
                  className="min-h-11 w-full gap-2"
                  disabled={loading}
                  aria-busy={loading}
                >
                  {loading && <Loader2 aria-hidden="true" className="h-5 w-5 animate-spin" />}
                  <span>{loading ? t('login.loading') : t('login.submit')}</span>
                </Button>

                <Button type="button" variant="outline" className="min-h-11 w-full gap-2" onClick={openClock}>
                  <CalendarRange aria-hidden="true" />
                  {t('login.simulate_clock')}
                </Button>
              </div>

              {clockPreview && (
                <div className="flex flex-col gap-3 rounded-xl border bg-accent px-4 py-3 text-sm text-accent-foreground sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 truncate">{t('login.clock_preview').replace('{0}', clockPreview)}</div>
                  <Button type="button" variant="outline" size="sm" className="min-h-11 px-3" onClick={clearClock}>
                    {t('login.clear_clock')}
                  </Button>
                </div>
              )}

              {showTestHints && (
                <div className="rounded-xl border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                  <div className="font-semibold text-foreground">{t('login.test_hints')}</div>
                  <div className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                    <div>recepcion / 123</div>
                    <div>triage / 123</div>
                    <div>medico / 123</div>
                    <div>admin / 123</div>
                  </div>
                </div>
              )}
            </form>
          </section>
        </div>
      </div>

      <Dialog open={clockOpen} onOpenChange={setClockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('login.dialog.title')}</DialogTitle>
            <DialogDescription>
              {t('login.dialog.desc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="clockDate">{t('login.dialog.date')}</Label>
              <Input id="clockDate" type="date" value={clockDate} onChange={(e) => setClockDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clockTime">{t('login.dialog.time')}</Label>
              <Input id="clockTime" type="time" value={clockTime} onChange={(e) => setClockTime(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={clearClock}>
              {t('login.dialog.remove')}
            </Button>
            <Button type="button" onClick={saveClock}>
              {t('login.dialog.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

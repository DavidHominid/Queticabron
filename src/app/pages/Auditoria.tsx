import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, User, Activity, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { RegistroAuditoria, UserRole } from '../types';

export function Auditoria() {
  const { usuarios } = useData();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [rol, setRol] = useState<UserRole | ''>('');
  const [usuarioId, setUsuarioId] = useState('');
  const [pageInput, setPageInput] = useState('1');
  const [registrosAuditoria, setRegistrosAuditoria] = useState<RegistroAuditoria[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const h = setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => clearTimeout(h);
  }, [query]);

  const fetchAuditoriaPage = async (pageToFetch: number) => {
    const offset = (pageToFetch - 1) * pageSize;
    const params = new URLSearchParams();
    params.set('paged', '1');
    params.set('limit', String(pageSize));
    params.set('offset', String(offset));
    if (debouncedQuery) params.set('q', debouncedQuery);
    if (rol) params.set('rol', rol);
    if (usuarioId) params.set('usuarioId', usuarioId);

    setLoading(true);
    try {
      const res = await fetch(`/api/auditoria?${params.toString()}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo cargar auditoría.');
      }
      const data = await res.json();
      setTotal(Number(data?.total || 0));
      setRegistrosAuditoria(Array.isArray(data?.data) ? data.data : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage((prev) => {
      if (prev === 1) fetchAuditoriaPage(1);
      return 1;
    });
  }, [debouncedQuery, rol, usuarioId]);

  useEffect(() => {
    fetchAuditoriaPage(page);
  }, [page]);

  useEffect(() => {
    setPageInput(String(page));
  }, [page]);

  const handleRefresh = async () => {
    await fetchAuditoriaPage(page);
  };

  const accionBadgeStyle = (accion: string) => {
    if (!accion) return { variant: 'outline' as const, className: 'bg-background' };
    const acc = accion.toLowerCase();
    if (acc.includes('cancelar') || acc.includes('eliminar')) return { variant: 'destructive' as const, className: '' };
    if (acc.includes('crear')) return { variant: 'default' as const, className: '' };
    if (acc.includes('actualizar') || acc.includes('completar')) return { variant: 'secondary' as const, className: '' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  const pages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [pageSize, total]);
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);
  const visiblePages = useMemo(() => {
    const totalPages = pages;
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);

    let start = page - 2;
    let end = page + 2;
    if (start < 1) {
      end += 1 - start;
      start = 1;
    }
    if (end > totalPages) {
      start -= end - totalPages;
      end = totalPages;
    }
    start = Math.max(1, start);
    end = Math.min(totalPages, end);

    const out: number[] = [];
    for (let p = start; p <= end; p += 1) out.push(p);
    return out;
  }, [page, pages]);

  const goToPage = (nextPage: number) => {
    const safe = Math.min(Math.max(1, nextPage), pages);
    setPage(safe);
  };

  const usuariosOptions = useMemo(() => {
    const list = Array.isArray(usuarios) ? [...usuarios] : [];
    const filtered = rol ? list.filter((u: any) => String(u?.rol || '').trim() === rol) : list;
    filtered.sort((a: any, b: any) => String(a?.nombre || '').localeCompare(String(b?.nombre || '')));
    return filtered.filter((u: any) => u && u.id);
  }, [rol, usuarios]);

  useEffect(() => {
    if (!usuarioId) return;
    const exists = usuariosOptions.some((u: any) => String(u.id) === String(usuarioId));
    if (!exists) setUsuarioId('');
  }, [usuarioId, usuariosOptions]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('audit.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('audit.subtitle')}</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('audit.refreshing') : t('audit.refresh')}
          </Button>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <CardTitle>{t('audit.log')}</CardTitle>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="inline-flex h-10 items-center rounded-md border border-input bg-muted/20 px-3 text-sm text-muted-foreground">
                  {t('audit.total')}: <span className="ml-2 font-semibold text-foreground">{total}</span>
                </div>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-44"
                  value={rol}
                  onChange={(e) => {
                    setRol((e.target.value as any) || '');
                    setPage(1);
                  }}
                >
                  <option value="">{t('audit.all_roles')}</option>
                  <option value="recepcion">{t('audit.role_recepcion')}</option>
                  <option value="triage">{t('audit.role_triage')}</option>
                  <option value="medico">{t('audit.role_medico')}</option>
                  <option value="administrador">{t('audit.role_admin')}</option>
                </select>
                <select
                  className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground sm:w-56"
                  value={usuarioId}
                  onChange={(e) => {
                    setUsuarioId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">{t('audit.all_users')}</option>
                  {usuariosOptions.map((u: any) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      {String(u.nombre || u.id)}
                    </option>
                  ))}
                </select>
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t('audit.search_placeholder')}
                  className="sm:w-80"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {registrosAuditoria.slice().map((registro) => (
                <div key={registro.id} className="p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={accionBadgeStyle(registro.accion).variant} className={accionBadgeStyle(registro.accion).className}>
                          {registro.accion}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(registro.fechaHora).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-1">{registro.detalles}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {registro.nombreUsuario}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{registro.rol}</span>
                        <span>•</span>
                        <span className="capitalize">{registro.ciudad.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t px-4 py-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                  <div>{t('audit.showing').replace('{0}', String(startIdx)).replace('{1}', String(endIdx)).replace('{2}', String(total))}</div>
                  <div>{t('audit.page_of').replace('{0}', String(page)).replace('{1}', String(pages))}</div>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Button type="button" size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => goToPage(page - 1)}>
                    {t('audit.prev')}
                  </Button>
                  <div className="flex flex-wrap items-center gap-2">
                    {visiblePages.map((p) => (
                      <Button
                        key={p}
                        type="button"
                        size="sm"
                        variant={p === page ? 'default' : 'outline'}
                        disabled={loading}
                        onClick={() => goToPage(p)}
                      >
                        {p}
                      </Button>
                    ))}
                    <Input
                      value={pageInput}
                      onChange={(e) => setPageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== 'Enter') return;
                        const n = Number.parseInt(pageInput, 10);
                        if (Number.isFinite(n)) goToPage(n);
                      }}
                      onBlur={() => {
                        const n = Number.parseInt(pageInput, 10);
                        if (Number.isFinite(n)) goToPage(n);
                        else setPageInput(String(page));
                      }}
                      inputMode="numeric"
                      className="h-10 w-20"
                      placeholder={t('audit.go_to_page')}
                    />
                  </div>
                  <Button type="button" size="sm" variant="outline" disabled={page >= pages || loading} onClick={() => goToPage(page + 1)}>
                    {t('audit.next')}
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {registrosAuditoria.length === 0 && !loading && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('audit.no_records')}</h3>
              <p className="text-muted-foreground">{t('audit.will_appear')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

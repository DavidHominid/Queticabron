import React, { useMemo, useState } from 'react';
import { Check, Pencil, Plus, RefreshCw, Trash2, X, Building2, CalendarRange, ChevronDown, ChevronUp } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { CiudadAutocomplete } from '../components/CiudadAutocomplete';

export function Variables() {
  const {
    especialidadesCatalogo,
    addEspecialidadCatalogo,
    deleteEspecialidadCatalogo,
    updateEspecialidadCatalogo,
    ciudadesCatalogo,
    addCiudadCatalogo,
    deleteCiudadCatalogo,
    updateCiudadCatalogo,
    sedesQuirurgicas,
    addSedeQuirurgica,
    updateSedeQuirurgica,
    deleteSedeQuirurgica,
    fetchPeriodosSede,
    addPeriodoSede,
    deletePeriodoSede,
  } = useData();
  const { t } = useLanguage();

  const [codigoEspecialidad, setCodigoEspecialidad] = useState('');
  const [nombreEspecialidad, setNombreEspecialidad] = useState('');
  const [loadingEspecialidad, setLoadingEspecialidad] = useState(false);

  const [codigoCiudad, setCodigoCiudad] = useState('');
  const [nombreCiudad, setNombreCiudad] = useState('');
  const [loadingCiudad, setLoadingCiudad] = useState(false);
  const [editando, setEditando] = useState<{ tipo: 'especialidad' | 'ciudad'; codigo: string; nombre: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // Sedes state
  const [sedeName, setSedeName] = useState('');
  const [sedeTipo, setSedeTipo] = useState<'propia' | 'subrogada'>('subrogada');
  const [sedeCosto, setSedeCosto] = useState('');
  const [sedeCiudad, setSedeCiudad] = useState('');
  const [loadingSede, setLoadingSede] = useState(false);
  const [editandoSede, setEditandoSede] = useState<{ id: string; nombre: string } | null>(null);

  // Periodos state
  const [expandedSedeId, setExpandedSedeId] = useState<string | null>(null);
  const [loadingPeriodos, setLoadingPeriodos] = useState<Record<string, boolean>>({});
  const [periodoFechaInicio, setPeriodoFechaInicio] = useState('');
  const [periodoFechaFin, setPeriodoFechaFin] = useState('');
  const [periodoNotas, setPeriodoNotas] = useState('');
  const [addingPeriodo, setAddingPeriodo] = useState(false);
  const [periodoError, setPeriodoError] = useState<string | null>(null);

  const todayStr = new Date().toISOString().slice(0, 10);

  const handleExpandSede = async (sedeId: string) => {
    if (expandedSedeId === sedeId) {
      setExpandedSedeId(null);
      return;
    }
    setExpandedSedeId(sedeId);
    // Fetch periods if not already loaded
    const sede = sedesQuirurgicas.find(s => s.id === sedeId);
    if (!sede?.periodos) {
      setLoadingPeriodos(prev => ({ ...prev, [sedeId]: true }));
      try { await fetchPeriodosSede(sedeId); } finally {
        setLoadingPeriodos(prev => ({ ...prev, [sedeId]: false }));
      }
    }
  };

  const handleAddPeriodo = async (sedeId: string) => {
    setPeriodoError(null);
    if (!periodoFechaInicio || !periodoFechaFin) { setPeriodoError('Fechas requeridas.'); return; }
    if (periodoFechaFin < periodoFechaInicio) { setPeriodoError('La fecha fin debe ser igual o posterior al inicio.'); return; }
    setAddingPeriodo(true);
    try {
      await addPeriodoSede(sedeId, { fechaInicio: periodoFechaInicio, fechaFin: periodoFechaFin, notas: periodoNotas || undefined });
      // Refresh periods for this sede
      await fetchPeriodosSede(sedeId);
      setPeriodoFechaInicio(''); setPeriodoFechaFin(''); setPeriodoNotas('');
    } catch (err: any) { setPeriodoError(err.message); }
    finally { setAddingPeriodo(false); }
  };

  const getDisponibilidadBadge = (sede: any) => {
    if (sede.disponibleHoy) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">Disponible hoy</span>;
    }
    // Check if there's an upcoming period
    const now = todayStr;
    const upcoming = (sede.periodos || []).find((p: any) => p.fechaInicio > now);
    if (upcoming) {
      return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">Desde {upcoming.fechaInicio}</span>;
    }
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">Sin disponibilidad</span>;
  };

  const especialidadesOrdenadas = useMemo(() => {
    return [...(especialidadesCatalogo || [])].sort((a, b) => {
      if (a.activa !== b.activa) return a.activa ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [especialidadesCatalogo]);

  const ciudadesOrdenadas = useMemo(() => {
    return [...(ciudadesCatalogo || [])].sort((a, b) => {
      if (a.activa !== b.activa) return a.activa ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [ciudadesCatalogo]);

  const onCrearEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEspecialidad(true);
    try {
      await addEspecialidadCatalogo({ codigo: codigoEspecialidad, nombre: nombreEspecialidad });
      setCodigoEspecialidad('');
      setNombreEspecialidad('');
    } finally {
      setLoadingEspecialidad(false);
    }
  };

  const onCrearCiudad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCiudad(true);
    try {
      await addCiudadCatalogo({ codigo: codigoCiudad, nombre: nombreCiudad });
      setCodigoCiudad('');
      setNombreCiudad('');
    } finally {
      setLoadingCiudad(false);
    }
  };

  const TablaCatalogo = ({
    rows,
    tipo,
    onEditarNombre,
    onDesactivar,
    onReactivar,
  }: {
    rows: { codigo: string; nombre: string; activa: boolean }[];
    tipo: 'especialidad' | 'ciudad';
    onEditarNombre: (codigo: string, nombre: string) => Promise<void>;
    onDesactivar: (codigo: string, nombre: string) => Promise<void>;
    onReactivar: (codigo: string) => Promise<void>;
  }) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_name')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_code')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_status')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.codigo} className="border-b border-border hover:bg-muted/40">
                <td className="p-4 text-sm text-foreground">
                  {editando?.tipo === tipo && editando?.codigo === r.codigo ? (
                    <Input
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      className="max-w-sm"
                    />
                  ) : (
                    r.nombre
                  )}
                </td>
                <td className="p-4 text-sm font-mono text-muted-foreground">{r.codigo}</td>
                <td className="p-4">
                  {r.activa ? (
                    <Badge>{t('var.active')}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-background">
                      {t('var.inactive')}
                    </Badge>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!r.activa || savingEdit}
                      onClick={async () => {
                        if (editando?.tipo === tipo && editando?.codigo === r.codigo) return;
                        setEditando({ tipo, codigo: r.codigo, nombre: r.nombre });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {editando?.tipo === tipo && editando?.codigo === r.codigo && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          disabled={savingEdit}
                          onClick={async () => {
                            const nombre = String(editando?.nombre || '').trim();
                            if (!nombre) return;
                            setSavingEdit(true);
                            try {
                              await onEditarNombre(r.codigo, nombre);
                              setEditando(null);
                            } finally {
                              setSavingEdit(false);
                            }
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingEdit}
                          onClick={() => setEditando(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {r.activa ? (
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={savingEdit}
                        onClick={async () => {
                          if (!confirm(t('var.deactivate_confirm').replace('{0}', r.nombre))) return;
                          await onDesactivar(r.codigo, r.nombre);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={savingEdit}
                        onClick={async () => {
                          await onReactivar(r.codigo);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && <div className="p-12 text-center text-muted-foreground">{t('var.no_records')}</div>}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('var.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('var.subtitle')}</p>
        </div>

        <Tabs defaultValue="especialidades">
          <TabsList>
            <TabsTrigger value="especialidades">{t('var.tabs_specialties')}</TabsTrigger>
            <TabsTrigger value="ciudades">{t('var.tabs_cities')}</TabsTrigger>
            <TabsTrigger value="sedes" className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Sedes Quirúrgicas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="especialidades" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.add_specialty')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearEspecialidad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoEspecialidad">{t('var.code')}</Label>
                    <Input
                      id="codigoEspecialidad"
                      value={codigoEspecialidad}
                      onChange={(e) => setCodigoEspecialidad(e.target.value)}
                      placeholder={t('var.code_placeholder_esp')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreEspecialidad">{t('var.name')}</Label>
                    <Input
                      id="nombreEspecialidad"
                      value={nombreEspecialidad}
                      onChange={(e) => setNombreEspecialidad(e.target.value)}
                      placeholder={t('var.name_placeholder_esp')}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={loadingEspecialidad}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('var.create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.list')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TablaCatalogo
                  rows={especialidadesOrdenadas}
                  tipo="especialidad"
                  onEditarNombre={async (codigo, nombre) => {
                    await updateEspecialidadCatalogo(codigo, { nombre });
                  }}
                  onDesactivar={async (codigo) => {
                    await deleteEspecialidadCatalogo(codigo);
                  }}
                  onReactivar={async (codigo) => {
                    await updateEspecialidadCatalogo(codigo, { activa: true });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ciudades" className="space-y-6">
            <Card className="shadow-sm !overflow-visible">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.add_city')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearCiudad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoCiudad">{t('var.code')}</Label>
                    <Input
                      id="codigoCiudad"
                      value={codigoCiudad}
                      onChange={(e) => setCodigoCiudad(e.target.value)}
                      placeholder={t('var.code_placeholder_city')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreCiudad">{t('var.name')}</Label>
                    <CiudadAutocomplete
                      id="nombreCiudad"
                      value={nombreCiudad}
                      onChange={setNombreCiudad}
                      placeholder={t('var.name_placeholder_city')}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={loadingCiudad}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('var.create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.list')}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TablaCatalogo
                  rows={ciudadesOrdenadas}
                  tipo="ciudad"
                  onEditarNombre={async (codigo, nombre) => {
                    await updateCiudadCatalogo(codigo, { nombre });
                  }}
                  onDesactivar={async (codigo) => {
                    await deleteCiudadCatalogo(codigo);
                  }}
                  onReactivar={async (codigo) => {
                    await updateCiudadCatalogo(codigo, { activa: true });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─────────────── SEDES QUIRÚRGICAS ─────────────── */}
          <TabsContent value="sedes" className="space-y-6">
            {/* ── Formulario nueva sede ── */}
            <Card className="shadow-sm !overflow-visible">
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Nueva Sede Quirúrgica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <p className="text-xs text-muted-foreground mb-4">
                  Las sedes se registran <strong>sin disponibilidad</strong> hasta que se les asigne un periodo de fechas.
                </p>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setLoadingSede(true);
                    try {
                      await addSedeQuirurgica({
                        nombre: sedeName,
                        tipo: sedeTipo,
                        costoRentaEstimado: sedeCosto ? Number(sedeCosto) : undefined,
                        ciudad: sedeCiudad,
                      });
                      setSedeName(''); setSedeTipo('subrogada'); setSedeCosto(''); setSedeCiudad('');
                    } finally { setLoadingSede(false); }
                  }}
                  className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="sedeName">Nombre de la Sede *</Label>
                    <Input id="sedeName" value={sedeName} onChange={(e) => setSedeName(e.target.value)} placeholder="Ej. Clínica San José" required />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipo</Label>
                    <Select value={sedeTipo} onValueChange={(v: any) => setSedeTipo(v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="propia">Propia</SelectItem>
                        <SelectItem value="subrogada">Subrogada / Renta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sedeCosto">Costo estimado ($)</Label>
                    <Input id="sedeCosto" type="number" min="0" step="0.01" value={sedeCosto} onChange={(e) => setSedeCosto(e.target.value)} placeholder="0.00" />
                  </div>
                  <div className="space-y-2 flex flex-col">
                    <Label htmlFor="sedeCiudad">Ciudad</Label>
                    <div className="flex gap-2 items-end w-full">
                      <CiudadAutocomplete id="sedeCiudad" value={sedeCiudad} onChange={setSedeCiudad} placeholder="Sonoyta" />
                      <Button type="submit" disabled={loadingSede}>
                        <Plus className="mr-1 h-4 w-4" /> Agregar
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* ── Catálogo de sedes con periodos ── */}
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Catálogo de Sedes</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/30 border-b border-border">
                      <tr>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Nombre</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Tipo</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Costo Est.</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Ciudad</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Disponibilidad</th>
                        <th className="text-left p-4 text-sm font-medium text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sedesQuirurgicas.map((sede) => (
                        <React.Fragment key={sede.id}>
                          {/* ── Fila principal de la sede ── */}
                          <tr key={sede.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                            <td className="p-4 text-sm">
                              {editandoSede?.id === sede.id ? (
                                <Input
                                  value={editandoSede.nombre}
                                  onChange={(e) => setEditandoSede({ ...editandoSede, nombre: e.target.value })}
                                  className="max-w-xs"
                                />
                              ) : (
                                <span className="font-medium">{sede.nombre}</span>
                              )}
                            </td>
                            <td className="p-4 text-sm">
                              <Badge variant={sede.tipo === 'propia' ? 'default' : 'outline'}>
                                {sede.tipo === 'propia' ? 'Propia' : 'Subrogada'}
                              </Badge>
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {sede.costoRentaEstimado ? `$${sede.costoRentaEstimado.toLocaleString()}` : '—'}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">{sede.ciudad || '—'}</td>
                            <td className="p-4">{getDisponibilidadBadge(sede)}</td>
                            <td className="p-4">
                              <div className="flex gap-2">
                                {/* Periodos button */}
                                <Button
                                  variant="outline" size="sm"
                                  className="gap-1"
                                  onClick={() => handleExpandSede(sede.id)}
                                  title="Gestionar periodos de disponibilidad"
                                >
                                  <CalendarRange className="h-3.5 w-3.5" />
                                  {expandedSedeId === sede.id
                                    ? <ChevronUp className="h-3 w-3" />
                                    : <ChevronDown className="h-3 w-3" />}
                                </Button>
                                {/* Edit name */}
                                <Button
                                  variant="outline" size="sm"
                                  onClick={() => setEditandoSede(editandoSede?.id === sede.id ? null : { id: sede.id, nombre: sede.nombre })}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                {editandoSede?.id === sede.id && (
                                  <>
                                    <Button variant="default" size="sm" onClick={async () => {
                                      if (!editandoSede.nombre.trim()) return;
                                      await updateSedeQuirurgica(sede.id, { nombre: editandoSede.nombre.trim() });
                                      setEditandoSede(null);
                                    }}><Check className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="sm" onClick={() => setEditandoSede(null)}><X className="h-4 w-4" /></Button>
                                  </>
                                )}
                                {/* Remove from catalog */}
                                <Button variant="destructive" size="sm" onClick={async () => {
                                  if (!confirm(`¿Eliminar "${sede.nombre}" del catálogo? Esta acción no se puede deshacer.`)) return;
                                  await deleteSedeQuirurgica(sede.id);
                                }}><Trash2 className="h-4 w-4" /></Button>
                              </div>
                            </td>
                          </tr>

                          {/* ── Panel expandible de periodos ── */}
                          {expandedSedeId === sede.id && (
                            <tr key={`${sede.id}-periodos`} className="border-b border-border bg-muted/10">
                              <td colSpan={6} className="p-4">
                                <div className="flex items-center gap-2 mb-3">
                                  <CalendarRange className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-semibold text-foreground">Periodos de Disponibilidad — {sede.nombre}</span>
                                </div>

                                {loadingPeriodos[sede.id] ? (
                                  <p className="text-xs text-muted-foreground animate-pulse">Cargando periodos...</p>
                                ) : (
                                  <>
                                    {/* Lista de periodos */}
                                    {(sede.periodos || []).length === 0 ? (
                                      <p className="text-xs text-muted-foreground mb-3">Sin periodos registrados. Agrega uno para habilitar esta sede.</p>
                                    ) : (
                                      <table className="w-full mb-3 text-sm">
                                        <thead>
                                          <tr className="border-b border-border">
                                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Inicio</th>
                                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Fin</th>
                                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Notas</th>
                                            <th className="text-left p-2 text-xs font-medium text-muted-foreground">Estatus</th>
                                            <th className="p-2"></th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(sede.periodos || []).map((p: any) => {
                                            const hoy = todayStr;
                                            const vigente = p.fechaInicio <= hoy && p.fechaFin >= hoy;
                                            const futuro  = p.fechaInicio > hoy;
                                            const pasado  = p.fechaFin < hoy;
                                            return (
                                              <tr key={p.id} className="border-b border-border/50">
                                                <td className="p-2 font-mono text-xs">{p.fechaInicio}</td>
                                                <td className="p-2 font-mono text-xs">{p.fechaFin}</td>
                                                <td className="p-2 text-xs text-muted-foreground">{p.notas || '—'}</td>
                                                <td className="p-2">
                                                  {vigente && <span className="text-xs px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-medium">Vigente</span>}
                                                  {futuro  && <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">Futuro</span>}
                                                  {pasado  && <span className="text-xs px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">Vencido</span>}
                                                </td>
                                                <td className="p-2">
                                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={async () => {
                                                    if (!confirm('Eliminar este periodo?')) return;
                                                    await deletePeriodoSede(p.id);
                                                    await fetchPeriodosSede(sede.id);
                                                  }}>
                                                    <X className="h-3.5 w-3.5" />
                                                  </Button>
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    )}

                                    {/* Formulario nuevo periodo */}
                                    <div className="bg-card border border-border rounded-lg p-3">
                                      <p className="text-xs font-semibold text-foreground mb-2">Agregar periodo de disponibilidad</p>
                                      {periodoError && <p className="text-xs text-destructive mb-2">{periodoError}</p>}
                                      <div className="flex flex-wrap gap-3 items-end">
                                        <div className="space-y-1">
                                          <Label className="text-xs">Fecha inicio *</Label>
                                          <Input type="date" value={periodoFechaInicio} onChange={e => setPeriodoFechaInicio(e.target.value)} className="h-8 text-xs w-36" />
                                        </div>
                                        <div className="space-y-1">
                                          <Label className="text-xs">Fecha fin *</Label>
                                          <Input type="date" value={periodoFechaFin} onChange={e => setPeriodoFechaFin(e.target.value)} min={periodoFechaInicio} className="h-8 text-xs w-36" />
                                        </div>
                                        <div className="space-y-1 flex-1 min-w-[140px]">
                                          <Label className="text-xs">Notas (opcional)</Label>
                                          <Input value={periodoNotas} onChange={e => setPeriodoNotas(e.target.value)} placeholder="Ej. Convenio junio" className="h-8 text-xs" />
                                        </div>
                                        <Button size="sm" className="h-8" disabled={addingPeriodo} onClick={() => handleAddPeriodo(sede.id)}>
                                          <Plus className="h-3.5 w-3.5 mr-1" /> Agregar periodo
                                        </Button>
                                      </div>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                  {sedesQuirurgicas.length === 0 && (
                    <div className="p-12 text-center text-muted-foreground">
                      No hay sedes registradas. Agrega la primera sede quirúrgica.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

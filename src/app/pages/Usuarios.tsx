import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, Edit, Trash2, X, UserPlus, Users, Shield, Key, Power, Filter, ArrowUpDown, RotateCcw, CalendarRange } from 'lucide-react';
import { Usuario, Rol, Ciudad, Especialidad } from '../types';
import { labelEspecialidad } from '../utils/especialidades';
import { labelCiudad } from '../utils/ciudades';
import { nowIso, todayYmd } from '../utils/clock';

export function Usuarios() {
  const { usuarios, especialidadesCatalogo, ciudadesCatalogo, addUsuario, updateUsuario, deleteUsuario, addRegistroAuditoria } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [vigenciaHabilitada, setVigenciaHabilitada] = useState(false);
  const [filtroRol, setFiltroRol] = useState<'todos' | 'administrador' | 'recepcion' | 'triage' | 'medico'>('todos');
  const [filtroCiudad, setFiltroCiudad] = useState<'todas' | Ciudad>('todas');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'activos' | 'inactivos' | 'fuera_vigencia' | 'inactivos_manual'>('todos');
  const [orden, setOrden] = useState<'nombre_asc' | 'nombre_desc' | 'rol' | 'ciudad'>('nombre_asc');
  const hoy = todayYmd();
  const showColCiudad = filtroRol === 'recepcion';
  const showColCiudades = filtroRol === 'medico' || filtroRol === 'triage';
  const showColEspecialidades = filtroRol === 'medico';
  const showColVigencia = filtroRol === 'triage';
  const esActivoEfectivo = (u: Usuario) => {
    if (!u.activo) return false;
    const desde = u.activoDesde ? String(u.activoDesde) : '';
    const hasta = u.activoHasta ? String(u.activoHasta) : '';
    if (desde && desde > hoy) return false;
    if (hasta && hasta < hoy) return false;
    return true;
  };
  const estadoUsuario = (u: Usuario) => {
    if (!u.activo) return 'inactivos_manual';
    if (!esActivoEfectivo(u)) return 'fuera_vigencia';
    return 'activos';
  };
  const formatYmd = (ymd?: string | null) => {
    const v = String(ymd || '').trim();
    if (!v) return '';
    return v;
  };

  const ciudadDefault = (user?.ciudad || (Array.isArray((user as any)?.ciudades) ? (user as any).ciudades[0] : null) || 'sonoyta') as Ciudad;

  const [formData, setFormData] = useState<Partial<Usuario>>({
    nombre: '',
    email: '',
    password: '',
    rol: 'recepcion',
    ciudad: ciudadDefault,
    ciudades: [ciudadDefault],
    especialidad: undefined,
    especialidades: [],
    activo: true,
    activoDesde: null,
    activoHasta: null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = Array.isArray(formData.especialidades) ? formData.especialidades : [];
    const especialidades = Array.from(new Set(raw.map((x) => String(x || '').trim()).filter(Boolean)));
    if (formData.rol === 'medico' && especialidades.length === 0) {
      alert(t('usuarios.select_at_least_one_specialty'));
      return;
    }
    const rawCiudades = Array.isArray(formData.ciudades)
      ? formData.ciudades
      : formData.ciudad
        ? [formData.ciudad]
        : [];
    const ciudades = Array.from(new Set(rawCiudades.map((x) => String(x || '').trim()).filter(Boolean)));
    if (formData.rol === 'recepcion' && !ciudades[0]) {
      alert(t('usuarios.select_at_least_one_city'));
      return;
    }
    if ((formData.rol === 'medico' || formData.rol === 'triage') && ciudades.length === 0) {
      alert(t('usuarios.select_at_least_one_city'));
      return;
    }
    if (formData.rol === 'triage') {
      if (vigenciaHabilitada) {
        if (!formData.activoDesde || !formData.activoHasta) {
          alert('Selecciona fecha de inicio y fin para la vigencia.');
          return;
        }
        if (String(formData.activoDesde) > String(formData.activoHasta)) {
          alert('La fecha de inicio no puede ser mayor a la fecha de fin.');
          return;
        }
      }
    }

    if (editingUser) {
      // Actualizar usuario
      updateUsuario(editingUser.id, {
        ...formData,
        ciudad: (ciudades[0] as any) || '',
        ciudades: formData.rol === 'medico' || formData.rol === 'triage' ? (ciudades as any) : (formData.rol === 'recepcion' ? [ciudades[0]] : []),
        especialidades: formData.rol === 'medico' ? especialidades : [],
        especialidad: formData.rol === 'medico' ? (especialidades[0] as Especialidad | undefined) : undefined,
        activoDesde: formData.rol === 'triage' && vigenciaHabilitada ? (formData.activoDesde as any) : null,
        activoHasta: formData.rol === 'triage' && vigenciaHabilitada ? (formData.activoHasta as any) : null,
      });
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'administrador',
        accion: 'Actualizar Usuario',
        detalles: `Actualizó usuario: ${formData.nombre} (${formData.email})`,
        fechaHora: nowIso(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    } else {
      // Crear nuevo usuario
      const nuevoUsuario: Usuario = {
        id: `usr${Date.now()}`,
        nombre: formData.nombre || '',
        email: formData.email || '',
        password: formData.password || '',
        rol: (formData.rol as Rol) || 'recepcion',
        ciudad: (ciudades[0] as Ciudad) || ciudadDefault,
        ciudades: formData.rol === 'medico' || formData.rol === 'triage' ? (ciudades as any) : (formData.rol === 'recepcion' ? ([ciudades[0]] as any) : []),
        especialidades: formData.rol === 'medico' ? especialidades : [],
        especialidad: formData.rol === 'medico' ? (especialidades[0] as Especialidad | undefined) : undefined,
        activo: formData.activo ?? true,
        activoDesde: formData.rol === 'triage' && vigenciaHabilitada ? (formData.activoDesde as any) : null,
        activoHasta: formData.rol === 'triage' && vigenciaHabilitada ? (formData.activoHasta as any) : null,
      };

      addUsuario(nuevoUsuario);
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'administrador',
        accion: 'Crear Usuario',
        detalles: `Creó nuevo usuario: ${nuevoUsuario.nombre} - Rol: ${nuevoUsuario.rol}`,
        fechaHora: nowIso(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    const especialidadesActuales = Array.isArray(usuario.especialidades)
      ? usuario.especialidades
      : usuario.especialidad
        ? [usuario.especialidad]
        : [];
    const tieneVigencia = Boolean(usuario.activoDesde || usuario.activoHasta);
    setVigenciaHabilitada(tieneVigencia);
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
      ciudad: usuario.ciudad,
      ciudades: Array.isArray((usuario as any).ciudades) && (usuario as any).ciudades.length ? (usuario as any).ciudades : usuario.ciudad ? ([usuario.ciudad] as any) : [],
      especialidad: usuario.especialidad,
      especialidades: especialidadesActuales,
      activo: usuario.activo,
      activoDesde: usuario.activoDesde || null,
      activoHasta: usuario.activoHasta || null,
    });
    setShowModal(true);
  };

  const handleDelete = (usuario: Usuario) => {
    if (confirm(`¿Estás seguro de eliminar al usuario ${usuario.nombre}?`)) {
      deleteUsuario(usuario.id);
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'administrador',
        accion: 'Eliminar Usuario',
        detalles: `Eliminó usuario: ${usuario.nombre} (${usuario.email})`,
        fechaHora: nowIso(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    }
  };

  const toggleEstado = (usuario: Usuario) => {
    const hoy = todayYmd();
    const hasta = usuario.activoHasta ? String(usuario.activoHasta) : null;
    const activar = !usuario.activo;
    const clearVigencia = activar && hasta && hasta < hoy;
    updateUsuario(usuario.id, {
      activo: activar,
      ...(clearVigencia ? { activoDesde: null, activoHasta: null } : {}),
    });
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'administrador',
      accion: usuario.activo ? 'Desactivar Usuario' : 'Activar Usuario',
      detalles: `${usuario.activo ? 'Desactivó' : 'Activó'} usuario: ${usuario.nombre}`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    });
  };

  const resetForm = () => {
    setVigenciaHabilitada(false);
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'recepcion',
      ciudad: ciudadDefault,
      ciudades: [ciudadDefault],
      especialidad: undefined,
      especialidades: [],
      activo: true,
      activoDesde: null,
      activoHasta: null,
    });
    setEditingUser(null);
  };

  const rolBadgeColor = (rol: string) => {
    if (rol === 'administrador') return { variant: 'outline' as const, className: 'bg-accent text-accent-foreground border-transparent capitalize' };
    if (rol === 'medico') return { variant: 'outline' as const, className: 'bg-primary text-primary-foreground border-transparent capitalize' };
    if (rol === 'triage') return { variant: 'outline' as const, className: 'bg-secondary text-secondary-foreground border-transparent capitalize' };
    return { variant: 'outline' as const, className: 'bg-background capitalize' };
  };

  const filteredUsuarios = [...usuarios]
    .filter((u) => {
      if (filtroRol !== 'todos' && u.rol !== filtroRol) return false;
      if (filtroCiudad !== 'todas') {
        const ciudadesUsuario = Array.isArray(u.ciudades) && u.ciudades.length ? u.ciudades : u.ciudad ? [u.ciudad] : [];
        if (!ciudadesUsuario.includes(filtroCiudad)) return false;
      }
      if (filtroEstado !== 'todos') {
        const estado = estadoUsuario(u);
        if (filtroEstado === 'inactivos') {
          if (estado === 'activos') return false;
        } else if (estado !== filtroEstado) {
          return false;
        }
      }
      const q = searchTerm.trim().toLowerCase();
      if (!q) return true;
      const especialidadesUsuario = Array.isArray(u.especialidades) ? u.especialidades : u.especialidad ? [u.especialidad] : [];
      const ciudadesUsuario = Array.isArray(u.ciudades) ? u.ciudades : u.ciudad ? [u.ciudad] : [];
      const blob = [
        u.nombre,
        u.email,
        u.rol,
        ...ciudadesUsuario.map((c) => labelCiudad(c, ciudadesCatalogo)),
        ...especialidadesUsuario.map((e) => labelEspecialidad(e, especialidadesCatalogo)),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return blob.includes(q);
    })
    .sort((a, b) => {
      if (orden === 'rol') return a.rol.localeCompare(b.rol) || a.nombre.localeCompare(b.nombre);
      if (orden === 'ciudad') return String(a.ciudad || '').localeCompare(String(b.ciudad || '')) || a.nombre.localeCompare(b.nombre);
      if (orden === 'nombre_desc') return b.nombre.localeCompare(a.nombre);
      return a.nombre.localeCompare(b.nombre);
    });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('usuarios.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('usuarios.subtitle')}</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            {t('usuarios.create')}
          </Button>
        </div>

        {/* Filtros */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <Filter className="h-4 w-4" />
              {t('usuarios.filters')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <Label htmlFor="buscarUsuarios">{t('usuarios.search_label')}</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="buscarUsuarios"
                  placeholder={t('usuarios.search_placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filtroRol">{t('usuarios.role_label')}</Label>
              <select
                id="filtroRol"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                value={filtroRol}
                onChange={(e) => setFiltroRol(e.target.value as any)}
              >
                <option value="todos">{t('usuarios.role_all')}</option>
                <option value="administrador">{t('usuarios.role_admin')}</option>
                <option value="recepcion">{t('usuarios.role_reception')}</option>
                <option value="triage">{t('usuarios.role_triage')}</option>
                <option value="medico">{t('usuarios.role_doctor')}</option>
              </select>
            </div>

            <div>
              <Label htmlFor="filtroCiudad">{t('usuarios.city_label')}</Label>
              <select
                id="filtroCiudad"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                value={filtroCiudad}
                onChange={(e) => setFiltroCiudad(e.target.value as any)}
              >
                <option value="todas">{t('usuarios.city_all')}</option>
                {(ciudadesCatalogo || [])
                  .filter((c) => c.activa)
                  .map((c) => (
                    <option key={c.codigo} value={c.codigo}>
                      {c.nombre}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <Label htmlFor="filtroEstado">{t('usuarios.status_label')}</Label>
              <select
                id="filtroEstado"
                className="mt-2 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as any)}
              >
                <option value="todos">{t('usuarios.status_all')}</option>
                <option value="activos">{t('usuarios.status_active')}</option>
                <option value="inactivos">{t('usuarios.status_inactive')}</option>
                <option value="inactivos_manual">{t('usuarios.status_inactive_manual')}</option>
                <option value="fuera_vigencia">{t('usuarios.status_out_of_date')}</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <Label htmlFor="ordenUsuarios">{t('usuarios.order_label')}</Label>
              <div className="mt-2 flex gap-2">
                <select
                  id="ordenUsuarios"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                  value={orden}
                  onChange={(e) => setOrden(e.target.value as any)}
                >
                  <option value="nombre_asc">{t('usuarios.order_name_asc')}</option>
                  <option value="nombre_desc">{t('usuarios.order_name_desc')}</option>
                  <option value="rol">{t('usuarios.order_role')}</option>
                  <option value="ciudad">{t('usuarios.order_city')}</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFiltroRol('todos');
                    setFiltroCiudad('todas');
                    setFiltroEstado('todos');
                    setOrden('nombre_asc');
                  }}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {t('usuarios.clear')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <ArrowUpDown className="h-4 w-4" />
                {t('usuarios.users_title')}
              </CardTitle>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{t('usuarios.showing')} {filteredUsuarios.length}</Badge>
                <Badge>{t('usuarios.active')} {usuarios.filter(esActivoEfectivo).length}</Badge>
                <Badge variant="outline" className="bg-background">
                  {t('usuarios.inactive')} {usuarios.length - usuarios.filter(esActivoEfectivo).length}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative max-h-[70vh] overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10 bg-muted border-b border-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_user')}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_email')}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_role')}</th>
                    {showColCiudad && <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_city')}</th>}
                    {showColCiudades && <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_cities')}</th>}
                    {showColEspecialidades && (
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_specialty')}</th>
                    )}
                    {showColVigencia && (
                      <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_validity')}</th>
                    )}
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_status')}</th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('usuarios.col_actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario, idx) => (
                    <tr
                      key={usuario.id}
                      className={`border-b border-border ${idx % 2 === 0 ? 'bg-background' : 'bg-muted/20'} hover:bg-muted/40`}
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <span className="text-secondary-foreground font-semibold">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{usuario.nombre}</p>
                            <p className="text-xs text-muted-foreground/70">ID: {usuario.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-foreground">{usuario.email}</td>
                      <td className="p-4">
                        <Badge variant={rolBadgeColor(usuario.rol).variant} className={rolBadgeColor(usuario.rol).className}>
                          {usuario.rol}
                        </Badge>
                      </td>
                      {showColCiudad && (
                        <td className="p-4 text-sm text-foreground">
                          {labelCiudad(usuario.ciudad, ciudadesCatalogo) || <span className="text-muted-foreground/40">—</span>}
                        </td>
                      )}
                      {showColCiudades && (
                        <td className="p-4 text-sm text-foreground">
                          {Array.isArray((usuario as any).ciudades) && (usuario as any).ciudades.length ? (
                            <div className="flex flex-wrap gap-1">
                              {(usuario as any).ciudades.map((c: string) => (
                                <Badge key={c} variant="outline" className="bg-background">
                                  {labelCiudad(c, ciudadesCatalogo)}
                                </Badge>
                              ))}
                            </div>
                          ) : usuario.ciudad ? (
                            <Badge variant="outline" className="bg-background">
                              {labelCiudad(usuario.ciudad, ciudadesCatalogo)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )}
                      {showColEspecialidades && (
                        <td className="p-4 text-sm text-foreground">
                          {Array.isArray(usuario.especialidades) && usuario.especialidades.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {usuario.especialidades.map((e) => (
                                <Badge key={e} variant="outline" className="bg-background">
                                  {labelEspecialidad(e, especialidadesCatalogo)}
                                </Badge>
                              ))}
                            </div>
                          ) : usuario.especialidad ? (
                            <span className="capitalize">{labelEspecialidad(usuario.especialidad, especialidadesCatalogo)}</span>
                          ) : (
                            <span className="text-muted-foreground/40">N/A</span>
                          )}
                        </td>
                      )}
                      {showColVigencia && (
                        <td className="p-4 text-sm text-muted-foreground">
                          {usuario.activoDesde || usuario.activoHasta ? (
                            <div className="flex items-center gap-2">
                              <CalendarRange className="h-4 w-4 text-muted-foreground" />
                              <span className="whitespace-nowrap">
                                {formatYmd(usuario.activoDesde) || '—'} → {formatYmd(usuario.activoHasta) || '—'}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                      )}
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <Button
                            type="button"
                            variant={esActivoEfectivo(usuario) ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => toggleEstado(usuario)}
                            className="min-w-28 justify-center gap-2"
                          >
                            <Power className="h-4 w-4" />
                            {esActivoEfectivo(usuario) ? t('usuarios.active_btn') : t('usuarios.inactive_btn')}
                          </Button>
                          {usuario.activo && !esActivoEfectivo(usuario) && (
                            <span className="text-xs text-muted-foreground">{t('usuarios.out_of_date_msg')}</span>
                          )}
                          {!usuario.activo && (usuario.activoDesde || usuario.activoHasta) && (
                            <span className="text-xs text-muted-foreground/70">{t('usuarios.inactive_manual_msg')}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(usuario)}
                            disabled={usuario.id === user?.id}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDelete(usuario)}
                            disabled={usuario.id === user?.id}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredUsuarios.length === 0 && (
                <div className="p-12 text-center">
                  <Users className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
                  <p className="text-foreground font-medium">{t('usuarios.not_found')}</p>
                  <p className="text-muted-foreground mt-1">{t('usuarios.adjust_filters')}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal para crear/editar usuario */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>{editingUser ? t('usuarios.edit_user') : t('usuarios.create_new_user')}</CardTitle>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">{t('usuarios.full_name')}</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder={t('usuarios.full_name_placeholder')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">{t('usuarios.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('usuarios.email_placeholder')}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">
                    {t('usuarios.password')} {editingUser ? t('usuarios.password_edit') : t('usuarios.password_new')}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={t('usuarios.password_placeholder')}
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rol">{t('usuarios.role_label')} *</Label>
                    <select
                      id="rol"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.rol}
                      onChange={(e) => {
                        const nuevoRol = e.target.value as Rol;
                        const firstEsp = (especialidadesCatalogo || []).find((x) => x.activa)?.codigo;
                        const firstCiudad = (ciudadesCatalogo || []).find((x) => x.activa)?.codigo || ciudadDefault;
                        const nextVigencia = nuevoRol === 'triage' ? vigenciaHabilitada : false;
                        setFormData({
                          ...formData,
                          rol: nuevoRol,
                          especialidades: nuevoRol === 'medico' && firstEsp ? [firstEsp] : [],
                          especialidad: nuevoRol === 'medico' && firstEsp ? (firstEsp as Especialidad) : undefined,
                          ciudad: firstCiudad as any,
                          ciudades:
                            nuevoRol === 'medico' || nuevoRol === 'triage'
                              ? ([firstCiudad] as any)
                              : nuevoRol === 'recepcion'
                                ? ([firstCiudad] as any)
                                : ([] as any),
                          activo: formData.activo ?? true,
                          activoDesde: nuevoRol === 'triage' && nextVigencia ? formData.activoDesde : null,
                          activoHasta: nuevoRol === 'triage' && nextVigencia ? formData.activoHasta : null,
                        });
                        setVigenciaHabilitada(nuevoRol === 'triage' ? nextVigencia : false);
                      }}
                      required
                    >
                      <option value="administrador">{t('usuarios.role_admin')}</option>
                      <option value="recepcion">{t('usuarios.role_reception')}</option>
                      <option value="triage">{t('usuarios.role_triage')}</option>
                      <option value="medico">{t('usuarios.role_doctor')}</option>
                    </select>
                  </div>

                  <div>
                    <Label>{t('usuarios.city_label')}</Label>
                    {formData.rol === 'recepcion' && (
                      <select
                        id="ciudad"
                        className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                        value={formData.ciudad}
                        onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad, ciudades: [e.target.value as any] })}
                        required
                      >
                        {(ciudadesCatalogo || [])
                          .filter((c) => c.activa)
                          .map((c) => (
                            <option key={c.codigo} value={c.codigo}>
                              {c.nombre}
                            </option>
                          ))}
                      </select>
                    )}

                    {(formData.rol === 'medico' || formData.rol === 'triage') && (
                      <div className="rounded-lg border border-border bg-muted/20 p-3">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {(ciudadesCatalogo || [])
                            .filter((c) => c.activa)
                            .map((c) => {
                              const base = Array.isArray((formData as any).ciudades) ? ((formData as any).ciudades as any[]) : [];
                              const selected = base.includes(c.codigo);
                              return (
                                <label key={c.codigo} className="flex items-center gap-2 text-sm text-foreground">
                                  <Checkbox
                                    checked={selected}
                                    onCheckedChange={(next) => {
                                      const isOn = Boolean(next);
                                      const updated = isOn ? Array.from(new Set([...base, c.codigo])) : base.filter((x) => x !== c.codigo);
                                      setFormData({
                                        ...formData,
                                        ciudades: updated as any,
                                        ciudad: (updated[0] as any) || '',
                                      });
                                    }}
                                  />
                                  <span>{c.nombre}</span>
                                </label>
                              );
                            })}
                        </div>
                        {Array.isArray((formData as any).ciudades) && (formData as any).ciudades.length === 0 && (
                          <div className="mt-2 text-sm text-destructive">{t('usuarios.select_at_least_one_city')}</div>
                        )}
                      </div>
                    )}

                    {formData.rol === 'administrador' && <div className="mt-2 text-sm text-muted-foreground">{t('usuarios.city_not_apply')}</div>}
                  </div>
                </div>

                {formData.rol === 'medico' && (
                  <div>
                    <Label htmlFor="especialidad">{t('usuarios.col_specialty')} *</Label>
                    <div className="rounded-lg border border-border bg-muted/20 p-3">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {(especialidadesCatalogo || [])
                          .filter((x) => x.activa)
                          .map((esp) => {
                            const selected = Array.isArray(formData.especialidades) ? formData.especialidades.includes(esp.codigo) : false;
                            return (
                              <label key={esp.codigo} className="flex items-center gap-2 text-sm text-foreground">
                                <Checkbox
                                  checked={selected}
                                  onCheckedChange={(next) => {
                                    const isOn = Boolean(next);
                                    const base = Array.isArray(formData.especialidades) ? formData.especialidades : [];
                                    const updated = isOn
                                      ? Array.from(new Set([...base, esp.codigo]))
                                      : base.filter((x) => x !== esp.codigo);
                                    setFormData({
                                      ...formData,
                                      especialidades: updated,
                                      especialidad: (updated[0] as Especialidad | undefined) || undefined,
                                    });
                                  }}
                                />
                                <span>{esp.nombre}</span>
                              </label>
                            );
                          })}
                      </div>
                      {Array.isArray(formData.especialidades) && formData.especialidades.length === 0 && (
                        <div className="mt-2 text-sm text-destructive">{t('usuarios.select_at_least_one_specialty')}</div>
                      )}
                    </div>
                  </div>
                )}

                {formData.rol === 'triage' && (
                  <div className="space-y-4 rounded-lg border border-border bg-muted/20 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-medium text-foreground">{t('usuarios.active_user')}</div>
                      <Button
                        type="button"
                        variant={formData.activo ?? true ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFormData({ ...formData, activo: !(formData.activo ?? true) })}
                        className="min-w-28 justify-center gap-2"
                      >
                        <Power className="h-4 w-4" />
                        {formData.activo ?? true ? t('usuarios.active_btn') : t('usuarios.inactive_btn')}
                      </Button>
                    </div>

                    <label className="flex items-center gap-2 text-sm text-foreground">
                      <Checkbox
                        checked={vigenciaHabilitada}
                        onCheckedChange={(next) => {
                          const on = Boolean(next);
                          setVigenciaHabilitada(on);
                          if (!on) {
                            setFormData({ ...formData, activoDesde: null, activoHasta: null });
                          }
                        }}
                      />
                      <span>{t('usuarios.validity_temp')}</span>
                    </label>

                    {vigenciaHabilitada && (
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="activoDesde">{t('usuarios.active_from')}</Label>
                          <Input
                            id="activoDesde"
                            type="date"
                            value={String(formData.activoDesde || '')}
                            onChange={(e) => setFormData({ ...formData, activoDesde: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="activoHasta">{t('usuarios.active_until')}</Label>
                          <Input
                            id="activoHasta"
                            type="date"
                            value={String(formData.activoHasta || '')}
                            onChange={(e) => setFormData({ ...formData, activoHasta: e.target.value })}
                            required
                          />
                        </div>
                      </div>
                    )}
                    <div className="text-xs text-muted-foreground/70">
                      {t('usuarios.auto_deactivate')}
                    </div>
                  </div>
                )}

                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">{t('usuarios.role_permissions')}</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {formData.rol === 'administrador' && (
                      <>
                        <li>• Acceso completo a todas las funcionalidades</li>
                        <li>• Gestión de usuarios</li>
                        <li>• Auditoría de movimientos</li>
                        <li>• Gestión de eventos y todas las secciones</li>
                      </>
                    )}
                    {formData.rol === 'recepcion' && (
                      <>
                        <li>• Inscripción de pacientes a eventos</li>
                        <li>• Creación de expedientes</li>
                        <li>• Agendación de citas</li>
                        <li>• Cobro de servicios</li>
                        <li>• Estudios socioeconómicos para cirugías</li>
                      </>
                    )}
                    {formData.rol === 'triage' && (
                      <>
                        <li>• Captura de signos vitales</li>
                        <li>• Solo para personas inscritas con cita</li>
                        <li>• Visualización de historial de signos vitales</li>
                      </>
                    )}
                    {formData.rol === 'medico' && (
                      <>
                        <li>• Ver expedientes de su especialidad</li>
                        <li>• Realizar consultas médicas</li>
                        <li>• Terminar citas</li>
                        <li>• Agendar seguimientos</li>
                        <li>• Iniciar procesos de cirugía</li>
                      </>
                    )}
                  </ul>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowModal(false);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    {t('usuarios.cancel')}
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingUser ? t('usuarios.update_user') : t('usuarios.create')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </DashboardLayout>
  );
}

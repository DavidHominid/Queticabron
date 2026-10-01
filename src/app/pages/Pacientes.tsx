import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { PacienteCard } from '../components/PacienteCard';
import { ModalNuevaCirugia } from '../components/cirugias/ModalNuevaCirugia';
import { AgendarCitaGeneralDialog } from '../components/eventos/AgendarCitaGeneralDialog';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { formatDateSafe } from '../components/ui/utils';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, User, Phone, MapPin, FileText, X, Heart, Calendar, Trash2, Upload } from 'lucide-react';
import { Paciente, Ciudad } from '../types';
import { now, nowIso, todayYmd } from '../utils/clock';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

export function Pacientes() {
  const navigate = useNavigate();
  const { pacientes, citas, eventos, consultasMedicas, addPaciente, updatePaciente, deletePaciente, addCita, addRegistroAuditoria, addCirugia, ciudadesCatalogo, especialidadesCatalogo } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showCirugiaModal, setShowCirugiaModal] = useState(false);
  const [showAgendarGeneralModal, setShowAgendarGeneralModal] = useState(false);
  const [filterType, setFilterType] = useState<'todos' | 'agendados' | 'atendidos'>('todos');
  const ciudadDefault =
    (user?.ciudad || '') ||
    (Array.isArray((user as any)?.ciudades) ? (user as any).ciudades[0] : '') ||
    (ciudadesCatalogo || []).find((c) => c.activa)?.codigo ||
    'Puerto Peñasco';
  const initialFormData: Partial<Paciente> = {
    nombre: '',
    numeroExpediente: '',
    fechaNacimiento: '',
    sexo: 'Masculino',
    telefono: '',
    ciudad: ciudadDefault,
  };

  const [formData, setFormData] = useState<Partial<Paciente>>(initialFormData);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedPaciente(null);
  };

  const isMedico = user?.rol === 'medico';
  const isAdmin = user?.rol === 'administrador';
  const esCitaDelMedico = (c: any) => c?.medicoEncargado && (c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre);



  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento + 'T12:00:00'); // Forzar mediodía para evitar saltos de día
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const getPacienteStats = (pacienteId: string) => {
    const citasDelPaciente = citas.filter((c) => c.pacienteId === pacienteId);
    const consultasDelPaciente = consultasMedicas.filter((cm) => cm.pacienteId === pacienteId);

    const citasPendientes = citasDelPaciente.filter(
      (c) => c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta'
    );

    return {
      totalCitas: citasDelPaciente.length,
      consultasCompletadas: consultasDelPaciente.length,
      citasPendientes: citasPendientes.length,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setSaving(true);

    // Este formulario usa un solo campo "nombre" con el nombre completo.
    // El backend espera nombre y apellido separados → los separamos aquí
    
const nombreRaw = (formData.nombre || '').trim();
const palabras = nombreRaw ? nombreRaw.split(/\s+/) : [];

let nombreParte = '';
let apellidoParte = '';

if (palabras.length === 4) {
  // Caso de 4 palabras (Ej: "Juan Carlos Pérez Gómez")
  // Primeros dos = Nombres, Últimos dos = Apellidos
  nombreParte = palabras.slice(0, 2).join(' ');
  apellidoParte = palabras.slice(2).join(' ');

} else if (palabras.length === 3) {
  // Caso de 3 palabras (Ej: "María López García" o "John David Smith")
  // Tomamos la primera palabra como Nombre y las otras dos como Apellido
  nombreParte = palabras[0];
  apellidoParte = palabras.slice(1).join(' ');

} else if (palabras.length === 2) {
  // Caso de 2 palabras (Ej: "Ana Torres" o "John Smith")
  nombreParte = palabras[0];
  apellidoParte = palabras[1];

} else {
  // Caso de 1 sola palabra o cadena vacía
  nombreParte = nombreRaw;
  apellidoParte = '';
}

    // Generar número de expediente si no se proporcionó:
    // formato por defecto → "Nombre Completo dd/mm/yyyy" fue una correccion a la version anterior
    // donde se creia que el expediente se registraba como "EXP-YYYY-NNN" pero ahora se hace con el nombre y fecha de nacimiento
    let numeroExpediente = formData.numeroExpediente?.trim();
    if (!numeroExpediente) {
      const fn = formData.fechaNacimiento || '';
      // fn viene como "yyyy-mm-dd" → convertir a "dd/mm/yyyy"
      let fechaFormato = '';
      if (fn && /^\d{4}-\d{2}-\d{2}$/.test(fn)) {
        const [yyyy, mm, dd] = fn.split('-');
        fechaFormato = `${dd}/${mm}/${yyyy}`;
      }
      numeroExpediente = nombreRaw && fechaFormato
        ? `${nombreRaw} ${fechaFormato}`
        : nombreRaw || fechaFormato || `EXP-${now().getFullYear()}-${String(pacientes.length + 1).padStart(3, '0')}`;
    }

    const expedienteDuplicado = pacientes.some((p) => 
  p.numeroExpediente?.trim().toLowerCase() === numeroExpediente.toLowerCase() &&
  p.id !== selectedPaciente?.id // Permite guardar si sólo estás editando el mismo paciente
);

if (expedienteDuplicado) {
  alert(`El número de expediente "${numeroExpediente}" ya está registrado.`);
  return; // Detiene la ejecución sin activar setSaving
}

    const nuevoPaciente: Paciente = {
      id: `pac${Date.now()}`,
      numeroExpediente,
      nombre: nombreParte,
      apellido: apellidoParte,
      edad: calcularEdad(formData.fechaNacimiento || ''),
      fechaNacimiento: formData.fechaNacimiento || '',
      sexo: formData.sexo || 'Masculino',
      telefono: formData.telefono || '',
      ciudad: (formData.ciudad as Ciudad) || user?.ciudad || 'Puerto Peñasco',
      fechaRegistro: todayYmd(),
    } as any;

    let res;
    if (selectedPaciente) {
      // Estamos editando
      res = await updatePaciente(selectedPaciente.id, {
        ...formData,
      });
    } else {
      // Estamos registrando nuevo
      res = await addPaciente({
        ...nuevoPaciente,
        rol_solicitante: user?.rol,
        usuario_solicitante: user?.nombre
      } as any);
    }

    setSaving(false);

    if (res && !res.success) {
      alert(res.error || 'Hubo un error al guardar el paciente.');
      return;
    }

    setShowModal(false);
    resetForm();
  };

  const handleIniciarCirugia = (data: any) => {
    if (!selectedPaciente) return;
    addCirugia({
      id: `cir${Date.now()}`,
      pacienteId: data.pacienteId || selectedPaciente.id,
      diagnostico: data.diagnostico || '',
      medicoACargo: data.medicoACargo || user?.nombre || '',
      especialidad: data.especialidad || 'medicina_familiar',
      fechaCirugia: data.fechaCirugia || '',
      horaEstimada: data.horaEstimada || '',
      lugarCirugia: data.lugarCirugia || '',
      costoEstimado: data.costoEstimado || 0,
      estado: 'pendiente_estudio',
      notas: data.notas,
      fechaRegistro: todayYmd(),
    } as any);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Iniciar Proceso de Cirugía',
      detalles: `Inició proceso de cirugía para ${(selectedPaciente.nombre || '').trim()}${selectedPaciente.apellido ? ' ' + String(selectedPaciente.apellido).trim() : ''} - Diagnóstico: ${data.diagnostico || ''}`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    } as any);

    setShowCirugiaModal(false);
  };

  const handleAgendarGeneral = async (payload: { paciente: Paciente; fecha: string; hora: string; especialidad: string; consultorio: string; costo: number }) => {
    const nueva = {
      id: `cit${Date.now()}`,
      eventoId: 'general',
      pacienteId: payload.paciente.id,
      especialidad: payload.especialidad as any,
      fecha: payload.fecha,
      hora: payload.hora,
      consultorio: payload.consultorio,
      estado: 'programada',
      costoPagado: payload.costo,
      duracionMinutos: 30,
      fechaCreacion: todayYmd(),
    };

    await addCita(nueva as any);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'recepcion',
      accion: 'Agendar Cita General',
      detalles: `Agendó cita general para ${(payload.paciente.nombre || '').trim()}${payload.paciente.apellido ? ' ' + String(payload.paciente.apellido).trim() : ''} (${payload.paciente.numeroExpediente}) · Especialidad: ${payload.especialidad} · ${payload.fecha} ${payload.hora} (cita ID: ${nueva.id})`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    } as any);

    setShowAgendarGeneralModal(false);
  };

  const pacienteStatsById = useMemo(() => {
    const map = new Map<string, { totalCitas: number; consultasCompletadas: number; citasPendientes: number }>();
    for (const p of pacientes) {
      map.set(p.id, { totalCitas: 0, consultasCompletadas: 0, citasPendientes: 0 });
    }

    for (const c of citas) {
      const id = c?.pacienteId;
      if (!id || !map.has(id)) continue;
      const s = map.get(id)!;
      s.totalCitas += 1;
      if (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta') s.citasPendientes += 1;
    }

    for (const cm of consultasMedicas) {
      const id = (cm as any)?.pacienteId;
      if (!id || !map.has(id)) continue;
      const s = map.get(id)!;
      s.consultasCompletadas += 1;
    }

    return map;
  }, [citas, consultasMedicas, pacientes]);

  const pacientesFiltrados = useMemo(() => {
    const termLower = searchTerm.trim().toLowerCase();
    const termRaw = searchTerm.trim();

    return pacientes.filter((p) => {
      const nombreCompleto = `${(p.nombre || '').trim()}${p.apellido ? ' ' + String(p.apellido).trim() : ''}`.toLowerCase();
      const matchSearch =
        nombreCompleto.includes(termLower) ||
        (p.id || '').toLowerCase().includes(termLower) ||
        (p.numeroExpediente || '').toLowerCase().includes(termLower) ||
        (p.telefono || '').includes(termRaw);

      if (!matchSearch) return false;
      if (p.eliminado) return false;
      if (!isMedico) return true;

      if (filterType === 'agendados') {
        return citas.some(
          (c) =>
            c.pacienteId === p.id &&
            esCitaDelMedico(c) &&
            (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta'),
        );
      }

      if (filterType === 'atendidos') {
        return citas.some((c) => c.pacienteId === p.id && esCitaDelMedico(c) && c.estado === 'completada');
      }

      return citas.some((c) => c.pacienteId === p.id && esCitaDelMedico(c));
    });
  }, [citas, esCitaDelMedico, filterType, isMedico, pacientes, searchTerm]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isMedico ? t('pac.title_medico') : t('pac.title_recepcion')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isMedico 
                ? t('pac.subtitle_medico')
                : t('pac.subtitle_recepcion')}
            </p>
          </div>
          {!isMedico && (
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => navigate('/importar-expediente')}>
                <Upload className="w-4 h-4 mr-2" />
                Importar Expediente
              </Button>
              <Button onClick={() => { resetForm(); setShowModal(true); }}>
                <Plus className="w-4 h-4 mr-2" />
                {t('pac.new')}
              </Button>
            </div>
          )}
        </div>

        {/* Barra de búsqueda y Filtros */}
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder={t('pac.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {isMedico && (
              <div className="flex gap-2">
                {(['todos', 'agendados', 'atendidos'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="capitalize"
                  >
                    {t(`pac.${type}`)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de pacientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientesFiltrados.map((paciente) => (
            <div key={paciente.id} className="relative group">
              <PacienteCard
                paciente={paciente}
                onClick={() => {
                  setSelectedPaciente(paciente);
                }}
              />
              {isMedico && (
                <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none">
                  <Badge variant="secondary">
                  {(pacienteStatsById.get(paciente.id)?.totalCitas ?? 0)} {t('pac.citas')}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {pacientesFiltrados.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('pac.not_found')}</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? t('pac.try_another') : t('pac.start_registering')}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('pac.register_first')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-auto p-0">
          <DialogHeader className="border-b px-6 py-5">
            <DialogTitle>{t('pac.register_new')}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">{t('pac.full_name')}</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: María González López"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="numeroExpediente">Número de Expediente (Físico)</Label>
                  <Input
                    id="numeroExpediente"
                    value={formData.numeroExpediente || ''}
                    onChange={(e) => setFormData({ ...formData, numeroExpediente: e.target.value })}
                    placeholder="Ej: EXP-2023-001 (Dejar vacío para auto-generar)"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fechaNacimiento">{t('pac.dob')}</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="sexo">{t('pac.sex')}</Label>
                    <select
                      id="sexo"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.sexo}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value as 'Masculino' | 'Femenino' })}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefono">{t('pac.phone')}</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="638-555-0101"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="ciudad">{t('pac.city')}</Label>
                    <select
                      id="ciudad"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad })}
                    >
                      {(ciudadesCatalogo || [])
                        .filter((c) => c.activa)
                        .map((c) => (
                          <option key={c.codigo} value={c.codigo}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    <strong>{t('pac.note')}</strong> {t('pac.auto_id')}
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                    {t('pac.cancel')}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? t('pac.saving') : t('pac.register')}
                  </Button>
                </DialogFooter>
              </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer de detalles del paciente */}
      <Sheet
        open={!!selectedPaciente}
        onOpenChange={(open) => {
          if (!open) setSelectedPaciente(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
          {selectedPaciente && (
            <>
              <SheetHeader className="border-b border-border bg-muted/20 pb-6 pt-6 px-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border shadow-sm flex-shrink-0">
                      <User className="w-8 h-8 text-secondary-foreground" />
                    </div>
                    <div className="text-left">
                      <SheetTitle className="text-xl">
                        {(selectedPaciente.nombre || '').trim()}
                        {selectedPaciente.apellido ? ` ${String(selectedPaciente.apellido).trim()}` : ''}
                      </SheetTitle>
                      <div className="mt-2 text-left">
                         <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-6 bg-card p-5 rounded-xl border border-border shadow-sm">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.age')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.edad} {t('pac.years')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.sex')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.sexo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.birth')}</p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDateSafe(selectedPaciente.fechaNacimiento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.phone')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.city')}</p>
                    <p className="text-base font-semibold text-foreground capitalize">
                      {selectedPaciente.ciudad.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.registration')}</p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDateSafe(selectedPaciente.fechaRegistro)}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button
                    className="w-full h-11"
                    onClick={() => {
                      navigate(`/expediente/${selectedPaciente.id}`);
                      setSelectedPaciente(null);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t('pac.full_record')}
                  </Button>

                  {(user?.rol === 'recepcion' || user?.rol === 'administrador') && (
                    <div className="flex flex-col gap-2 w-full mt-2">
                      <Button
                        variant="secondary"
                        className="w-full h-11"
                        onClick={() => navigate('/citas', { state: { preselectPacienteId: selectedPaciente.id } })}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Ver Calendario y Eventos
                      </Button>
                      {/* Por mientras se elimina la opción de crear citas fuera de eventos
                      <Button
                        variant="outline"
                        className="w-full h-11 border-blue-200 hover:bg-blue-50 text-blue-700"
                        onClick={() => setShowAgendarGeneralModal(true)}
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Agendar Cita Rápida (Libre)
                      </Button>
                      */}
                    </div>
                  )}

                  {isAdmin && (
                    <div className="flex flex-col gap-2 w-full mt-2">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" className="w-full h-11">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Eliminar Paciente
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar paciente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esto solo lo eliminará de la lista de pacientes. Las citas, triage, consultas y cirugías seguirán existiendo.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await deletePaciente(selectedPaciente.id, {
                                    rol_solicitante: user?.rol,
                                    usuario_solicitante: user?.nombre,
                                    ciudad: user?.ciudad,
                                  });
                                  setSelectedPaciente(null);
                                } catch (err: any) {
                                  alert(err?.message || 'No se pudo eliminar el paciente.');
                                }
                              }}
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de expediente completo */}
      {showCirugiaModal && selectedPaciente && (
        <ModalNuevaCirugia
          pacientes={[selectedPaciente]}
          initialPacienteId={selectedPaciente.id}
          initialMedicoACargo={user?.nombre || ''}
          onClose={() => setShowCirugiaModal(false)}
          onSubmit={handleIniciarCirugia}
        />
      )}

      {/* Modal para agendar cita libre */}
      {showAgendarGeneralModal && selectedPaciente && (
        <AgendarCitaGeneralDialog
          open={showAgendarGeneralModal}
          onOpenChange={setShowAgendarGeneralModal}
          paciente={selectedPaciente}
          citas={citas}
          eventos={eventos}
          especialidadesCatalogo={especialidadesCatalogo || []}
          defaultFecha={todayYmd()}
          defaultHora="08:00"
          onAgendar={handleAgendarGeneral}
        />
      )}
    </DashboardLayout>
  );
}

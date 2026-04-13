import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ExpedienteCompleto } from '../components/ExpedienteCompleto';
import { PacienteCard } from '../components/PacienteCard';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar as CalendarUI } from '../components/ui/calendar';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn, formatDateSafe } from '../components/ui/utils';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, User, Phone, Calendar as CalendarIcon, MapPin, FileText, X, Activity } from 'lucide-react';
import { Paciente, Ciudad } from '../types';

export function Pacientes() {
  const { pacientes, citas, consultasMedicas, addPaciente, updatePaciente, addRegistroAuditoria, addCita, eventos } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showExpediente, setShowExpediente] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [showCalendarUI, setShowCalendarUI] = useState(false);
  const [citaForm, setCitaForm] = useState({ fecha: '', hora: '08:00' });
  const [filterType, setFilterType] = useState<'todos' | 'agendados' | 'atendidos'>('todos');
  const initialFormData: Partial<Paciente> = {
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Masculino',
    telefono: '',
    ciudad: user?.ciudad || 'sonoyta',
    imagen: '',
    nacionalidad: 'Mexicana',
    identificacion: '',
  };

  const [formData, setFormData] = useState<Partial<Paciente>>(initialFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const resetForm = () => {
    setFormData(initialFormData);
    setImageFile(null);
    setSelectedPaciente(null);
  };

  const isMedico = user?.rol === 'medico';



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

    // Validaciones de formato
    const idValue = (formData.identificacion || '').replace(/\s/g, '').toUpperCase();
    if (formData.nacionalidad === 'Mexicana') {
      const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{1}[0-9]{1}$/;
      if (!curpRegex.test(idValue)) {
        alert("La CURP ingresada no tiene un formato válido (18 caracteres).");
        return;
      }
    } else if (formData.nacionalidad === 'Americana') {
      const passportRegex = /^[0-9]{9}$/;
      if (!passportRegex.test(idValue)) {
        alert("El pasaporte americano debe tener 9 dígitos numéricos.");
        return;
      }
    }

    setSaving(true);

    let uploadedUrl = formData.imagen || '';
    if (imageFile) {
       const fd = new FormData();
       fd.append('imagen', imageFile);
       try {
           const res = await fetch('/api/upload', { method: 'POST', body: fd });
           if (res.ok) {
              const data = await res.json();
              uploadedUrl = data.url;
           }
       } catch(err) {
           console.error("Error uploading image", err);
       }
    }

    // Generar número de expediente
    const año = new Date().getFullYear();
    const numeroSecuencial = String(pacientes.length + 1).padStart(3, '0');
    const numeroExpediente = `EXP-${año}-${numeroSecuencial}`;

    const nuevoPaciente: Paciente = {
      id: `pac${Date.now()}`,
      numeroExpediente,
      nombre: formData.nombre || '',
      edad: calcularEdad(formData.fechaNacimiento || ''),
      fechaNacimiento: formData.fechaNacimiento || '',
      sexo: formData.sexo || 'Masculino',
      telefono: formData.telefono || '',
      ciudad: (formData.ciudad as Ciudad) || user?.ciudad || 'sonoyta',
      fechaRegistro: new Date().toISOString().split('T')[0],
      imagen: uploadedUrl,
      nacionalidad: formData.nacionalidad || 'Mexicana',
      identificacion: idValue,
    };

    let res;
    if (selectedPaciente) {
      // Estamos editando
      res = await updatePaciente(selectedPaciente.id, {
        ...formData,
        imagen: uploadedUrl,
        nacionalidad: formData.nacionalidad || 'Mexicana',
        identificacion: idValue,
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

  const handleAgendarCita = async () => {
    if (!selectedPaciente || !citaForm.fecha) return;
    const eventoActivo = eventos.find(e => e.estado === 'activo' && e.ciudad === user?.ciudad);
    if (!eventoActivo) {
      alert("No hay un evento activo para esta cita.");
      return;
    }

    try {
      await addCita({
        id: `cita${Date.now()}`,
        eventoId: eventoActivo.id,
        pacienteId: selectedPaciente.id,
        fecha: citaForm.fecha,
        hora: citaForm.hora,
        estado: 'programada',
        especialidad: 'medicina_familiar',
        consultorio: 'Consultorio 1',
        costoPagado: 0,
        fechaCreacion: new Date().toISOString()
      } as any);

      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'recepcion',
        accion: 'Agendó Cita',
        detalles: `Agendó cita para ${selectedPaciente.nombre} el día ${citaForm.fecha}`,
        fechaHora: new Date().toISOString(),
        ciudad: user?.ciudad || 'sonoyta',
      } as any);

      setShowAgendarModal(false);
      setSelectedPaciente(null);
      setCitaForm({ fecha: '', hora: '08:00' });
    } catch (err) {
      console.error('Error al agendar cita:', err);
    }
  };

  // Filtrar pacientes según rol y búsqueda
  const pacientesFiltrados = pacientes.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      (p.nombre || '').toLowerCase().includes(term) ||
      (p.id || '').toLowerCase().includes(term) ||
      (p.numeroExpediente || '').toLowerCase().includes(term) ||
      (p.telefono || '').includes(searchTerm);

    if (!isMedico) return matchSearch;

    let matchFilter = true;
    if (filterType === 'agendados') {
      matchFilter = citas.some(c => c.pacienteId === p.id && (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta'));
    } else if (filterType === 'atendidos') {
      matchFilter = consultasMedicas.some(cm => cm.pacienteId === p.id);
    }
    // Si filterType === 'todos', matchFilter sigue siendo true

    return matchSearch && matchFilter;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              {isMedico ? 'Mis Pacientes' : 'Gestión de Pacientes'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isMedico 
                ? 'Pacientes que han asistido o están agendados en el sistema' 
                : 'Registra y administra los expedientes de pacientes'}
            </p>
          </div>
          {!isMedico && (
            <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Paciente
            </Button>
          )}
        </div>

        {/* Barra de búsqueda y Filtros */}
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                placeholder="Buscar por nombre, expediente o teléfono..."
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
                    {type}
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
                  setShowExpediente(false);
                  setShowAgendarModal(false);
                }}
              />
              {isMedico && (
                <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {getPacienteStats(paciente.id).totalCitas} citas
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {pacientesFiltrados.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron pacientes</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm ? 'Intenta con otro término de búsqueda' : 'Comienza registrando tu primer paciente'}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowModal(true); }} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Registrar Primer Paciente
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal para crear paciente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto text-black">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Registrar Nuevo Paciente</CardTitle>
                <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre Completo</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: María González López"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fechaNacimiento">Fecha de Nacimiento</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="sexo">Sexo</Label>
                    <select
                      id="sexo"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    <Label htmlFor="telefono">Teléfono</Label>
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
                    <Label htmlFor="ciudad">Ciudad</Label>
                    <select
                      id="ciudad"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad })}
                    >
                      <option value="sonoyta">Sonoyta</option>
                      <option value="puerto_penasco">Puerto Peñasco</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nacionalidad">Nacionalidad</Label>
                    <select
                      id="nacionalidad"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.nacionalidad || 'Mexicana'}
                      onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    >
                      <option value="Mexicana">Mexicana</option>
                      <option value="Americana">Americana</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="identificacion">
                      {formData.nacionalidad === 'Americana' ? 'Pasaporte Americano' : 'CURP'}
                    </Label>
                    <Input
                      id="identificacion"
                      type="text"
                      value={formData.identificacion || ''}
                      onChange={(e) => setFormData({ ...formData, identificacion: e.target.value.toUpperCase() })}
                      placeholder={formData.nacionalidad === 'Americana' ? 'Ej. 123456789' : 'Ej. VENG920101HSRLRRA0'}
                    />
                  </div>
                </div>

                <div>
                  <Label>Fotografía del Paciente (Opcional)</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {imageFile && (
                      <img
                        src={URL.createObjectURL(imageFile)}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border border-gray-200"
                      />
                    )}
                    {!imageFile && formData.imagen && (
                      <img
                        src={formData.imagen}
                        alt="Current"
                        className="w-16 h-16 object-cover rounded-full border border-gray-200"
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="imagen"
                        className="cursor-pointer bg-blue-50 text-blue-700 hover:bg-blue-100 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-blue-200 inline-flex items-center justify-center"
                      >
                        Seleccionar Imagen
                      </Label>
                      <input
                        id="imagen"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500">
                        {imageFile ? imageFile.name : 'Ningún archivo seleccionado'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Nota:</strong> Se generará automáticamente un número de expediente único para este paciente.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1" disabled={saving}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={saving}>
                    {saving ? 'Guardando...' : 'Registrar Paciente'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Drawer de detalles del paciente */}
      <Sheet open={!!selectedPaciente && !showExpediente} onOpenChange={(open) => {
        if (!open && !showExpediente) setSelectedPaciente(null);
      }}>
        <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-md p-0 flex flex-col h-full bg-slate-50 border-l border-gray-200">
          {selectedPaciente && (
            <>
              <SheetHeader className="border-b bg-gradient-to-r from-blue-50 to-white pb-6 pt-6 px-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedPaciente.imagen ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-white">
                        <img src={selectedPaciente.imagen} alt={selectedPaciente.nombre} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
                        <User className="w-8 h-8 text-blue-600" />
                      </div>
                    )}
                    <div className="text-left">
                      <SheetTitle className="text-xl">{selectedPaciente.nombre}</SheetTitle>
                      <div className="mt-2 text-left">
                         <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-6 bg-white p-5 rounded-xl border border-gray-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
                  <div>
                    <p className="text-sm text-gray-500">Edad</p>
                    <p className="text-base font-semibold text-gray-900">{selectedPaciente.edad} años</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sexo</p>
                    <p className="text-base font-semibold text-gray-900">{selectedPaciente.sexo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Nacimiento</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDateSafe(selectedPaciente.fechaNacimiento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Teléfono</p>
                    <p className="text-base font-semibold text-gray-900">{selectedPaciente.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ciudad</p>
                    <p className="text-base font-semibold text-gray-900 capitalize">
                      {selectedPaciente.ciudad.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Registro</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDateSafe(selectedPaciente.fechaRegistro)}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 h-11" onClick={() => setShowExpediente(true)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Ver Expediente Completo
                  </Button>
                  {user?.rol === 'recepcion' && citas.some(c => c.pacienteId === selectedPaciente.id && c.fecha && c.fecha.startsWith(new Date().toISOString().split('T')[0]) && ['programada', 'en_triage', 'en_consulta'].includes(c.estado)) ? (
                    <Button className="w-full bg-gray-400 cursor-not-allowed h-11" disabled>
                      <Activity className="w-4 h-4 mr-2" />
                      Paciente ya en fila (hoy)
                    </Button>
                  ) : (user?.rol === 'recepcion' || user?.rol === 'administrador') && (
                    <div className="w-full">
                      {!showAgendarModal ? (
                        <Button className="w-full bg-green-600 hover:bg-green-700 h-11" onClick={() => setShowAgendarModal(true)}>
                          <CalendarIcon className="w-4 h-4 mr-2" />
                          Agendar Cita
                        </Button>
                      ) : (
                        <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 space-y-4 shadow-sm animate-in fade-in slide-in-from-top-2">
                          <h4 className="font-semibold text-blue-900 border-b border-blue-100 pb-2">Programar Nueva Cita</h4>
                          <div className="relative">
                            <Label htmlFor="fechaCita" className="text-blue-800">Fecha de Cita</Label>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal mt-1 border-white bg-white shadow-sm",
                                !citaForm.fecha && "text-muted-foreground"
                              )}
                              onClick={() => setShowCalendarUI(!showCalendarUI)}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {citaForm.fecha ? format(new Date(citaForm.fecha + 'T12:00:00'), "dd/MM/yyyy") : <span>Seleccionar día...</span>}
                            </Button>

                            {showCalendarUI && (
                              <div className="absolute top-[65px] left-0 right-0 max-w-max mx-auto md:mx-0 z-[1000] bg-white border border-gray-200 rounded-lg shadow-2xl animate-in fade-in zoom-in-95">
                                <CalendarUI
                                  mode="single"
                                  selected={citaForm.fecha ? new Date(citaForm.fecha + 'T12:00:00') : undefined}
                                  onSelect={(date) => { 
                                    setCitaForm({ ...citaForm, fecha: date ? format(date, "yyyy-MM-dd") : '' });
                                    setShowCalendarUI(false);
                                  }}
                                  initialFocus
                                  locale={es}
                                  className="p-3 pointer-events-auto"
                                />
                              </div>
                            )}
                          </div>
                          <div>
                            <Label htmlFor="horaCita" className="text-blue-800">Hora de Cita</Label>
                            <Input 
                              type="time" 
                              id="horaCita" 
                              value={citaForm.hora} 
                              onChange={(e) => setCitaForm({ ...citaForm, hora: e.target.value })}
                              className="mt-1 border-white bg-white shadow-sm"
                            />
                          </div>
                          <div className="flex gap-3 pt-2">
                            <Button variant="outline" onClick={() => setShowAgendarModal(false)} className="flex-1 bg-white hover:bg-gray-50 border-gray-200">
                              Cancelar
                            </Button>
                            <Button onClick={handleAgendarCita} className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={!citaForm.fecha}>
                              Confirmar
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de expediente completo */}
      {showExpediente && selectedPaciente && (
        <ExpedienteCompleto paciente={selectedPaciente} onClose={() => {
          setShowExpediente(false);
        }} />
      )}
    </DashboardLayout>
  );
}
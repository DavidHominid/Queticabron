import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { ExpedienteCompleto } from '../components/ExpedienteCompleto';
import { PacienteCard } from '../components/PacienteCard';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, User, Phone, Calendar, MapPin, FileText, X } from 'lucide-react';
import { Paciente, Ciudad } from '../types';

export function Pacientes() {
  const { pacientes, citas, consultasMedicas, addPaciente, addRegistroAuditoria } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showExpediente, setShowExpediente] = useState(false);
  const [filterType, setFilterType] = useState<'todos' | 'agendados' | 'atendidos'>('todos');
  const [formData, setFormData] = useState<Partial<Paciente>>({
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Masculino',
    telefono: '',
    ciudad: user?.ciudad || 'sonoyta',
    imagen: '',
  });

  const isMedico = user?.rol === 'medico';

  const calcularEdad = (fechaNacimiento: string) => {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      imagen: formData.imagen || '',
    };

    addPaciente({
      ...nuevoPaciente,
      rol_solicitante: user?.rol,
      usuario_solicitante: user?.nombre
    } as any);

    setShowModal(false);
    setFormData({
      nombre: '',
      fechaNacimiento: '',
      sexo: 'Masculino',
      telefono: '',
      ciudad: user?.ciudad || 'sonoyta',
      imagen: '',
    });
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
            <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
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
                onClick={() => setSelectedPaciente(paciente)}
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
                <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
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

                <div>
                  <Label htmlFor="imagen">URL de Fotografía (Opcional)</Label>
                  <Input
                    id="imagen"
                    type="url"
                    value={formData.imagen || ''}
                    onChange={(e) => setFormData({ ...formData, imagen: e.target.value })}
                    placeholder="https://ejemplo.com/foto.jpg"
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-900">
                    <strong>Nota:</strong> Se generará automáticamente un número de expediente único para este paciente.
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} className="flex-1">
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    Registrar Paciente
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de detalles del paciente */}
      {selectedPaciente && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <Card className="w-full max-w-2xl my-8">
            <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white pb-6 pt-6">
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
                  <div>
                    <CardTitle className="text-xl">{selectedPaciente.nombre}</CardTitle>
                    <div className="mt-2">
                       <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedPaciente(null)} className="p-2 bg-white rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 shadow-sm transition-colors -mt-2 -mr-2">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-600">Edad</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPaciente.edad} años</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Sexo</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPaciente.sexo}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedPaciente.fechaNacimiento).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Teléfono</p>
                  <p className="text-lg font-semibold text-gray-900">{selectedPaciente.telefono}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Ciudad</p>
                  <p className="text-lg font-semibold text-gray-900 capitalize">
                    {selectedPaciente.ciudad.replace('_', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Fecha de Registro</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {new Date(selectedPaciente.fechaRegistro).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t">
                <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={() => setShowExpediente(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Expediente Completo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de expediente completo */}
      {showExpediente && selectedPaciente && (
        <ExpedienteCompleto paciente={selectedPaciente} onClose={() => {
          setShowExpediente(false);
          setSelectedPaciente(null);
        }} />
      )}
    </DashboardLayout>
  );
}
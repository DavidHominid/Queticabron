import { useState } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Plus, Search, Edit, Trash2, X, UserPlus, Users, Shield, Key } from 'lucide-react';
import { Usuario, Rol, Ciudad, Especialidad } from '../types';

export function Usuarios() {
  const { usuarios, addUsuario, updateUsuario, deleteUsuario, addRegistroAuditoria } = useData();
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<Usuario | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState<Partial<Usuario>>({
    nombre: '',
    email: '',
    password: '',
    rol: 'recepcion',
    ciudad: user?.ciudad || 'sonoyta',
    especialidad: undefined,
    activo: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingUser) {
      // Actualizar usuario
      updateUsuario(editingUser.id, formData);
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'administrador',
        accion: 'Actualizar Usuario',
        detalles: `Actualizó usuario: ${formData.nombre} (${formData.email})`,
        fechaHora: new Date().toISOString(),
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
        ciudad: (formData.ciudad as Ciudad) || 'sonoyta',
        especialidad: formData.especialidad as Especialidad,
        activo: true,
      };

      addUsuario(nuevoUsuario);
      addRegistroAuditoria({
        id: `aud${Date.now()}`,
        usuarioId: user?.id || '',
        nombreUsuario: user?.nombre || '',
        rol: user?.rol || 'administrador',
        accion: 'Crear Usuario',
        detalles: `Creó nuevo usuario: ${nuevoUsuario.nombre} - Rol: ${nuevoUsuario.rol}`,
        fechaHora: new Date().toISOString(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    }

    setShowModal(false);
    resetForm();
  };

  const handleEdit = (usuario: Usuario) => {
    setEditingUser(usuario);
    setFormData({
      nombre: usuario.nombre,
      email: usuario.email,
      password: '',
      rol: usuario.rol,
      ciudad: usuario.ciudad,
      especialidad: usuario.especialidad,
      activo: usuario.activo,
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
        fechaHora: new Date().toISOString(),
        ciudad: user?.ciudad || 'sonoyta',
      });
    }
  };

  const toggleEstado = (usuario: Usuario) => {
    updateUsuario(usuario.id, { activo: !usuario.activo });
    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'administrador',
      accion: usuario.activo ? 'Desactivar Usuario' : 'Activar Usuario',
      detalles: `${usuario.activo ? 'Desactivó' : 'Activó'} usuario: ${usuario.nombre}`,
      fechaHora: new Date().toISOString(),
      ciudad: user?.ciudad || 'sonoyta',
    });
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      email: '',
      password: '',
      rol: 'recepcion',
      ciudad: user?.ciudad || 'sonoyta',
      especialidad: undefined,
      activo: true,
    });
    setEditingUser(null);
  };

  const rolBadgeColor = (rol: string) => {
    const colores: { [key: string]: string } = {
      administrador: 'bg-purple-100 text-purple-700',
      recepcion: 'bg-blue-100 text-blue-700',
      triage: 'bg-green-100 text-green-700',
      medico: 'bg-orange-100 text-orange-700',
    };
    return colores[rol] || 'bg-gray-100 text-gray-700';
  };

  const filteredUsuarios = usuarios.filter(
    (u) =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.rol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-1">Administra los usuarios del sistema</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Crear Usuario
          </Button>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total</p>
                  <p className="text-2xl font-semibold text-gray-900">{usuarios.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Administradores</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {usuarios.filter((u) => u.rol === 'administrador').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Médicos</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {usuarios.filter((u) => u.rol === 'medico').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Recepción</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {usuarios.filter((u) => u.rol === 'recepcion').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Triage</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {usuarios.filter((u) => u.rol === 'triage').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Búsqueda */}
        <Card className="shadow-sm">
          <CardContent className="p-4">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre, email o rol..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de usuarios */}
        <Card className="shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Usuario</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Email</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Rol</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">
                      Especialidad
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Ciudad</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Estado</th>
                    <th className="text-left p-4 text-sm font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsuarios.map((usuario) => (
                    <tr key={usuario.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {usuario.nombre.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{usuario.nombre}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-900">{usuario.email}</td>
                      <td className="p-4">
                        <Badge className={rolBadgeColor(usuario.rol)}>{usuario.rol}</Badge>
                      </td>
                      <td className="p-4 text-sm text-gray-900">
                        {usuario.especialidad ? (
                          <span className="capitalize">{usuario.especialidad.replace('_', ' ')}</span>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="p-4 text-sm text-gray-900 capitalize">
                        {usuario.ciudad.replace('_', ' ')}
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleEstado(usuario)}
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            usuario.activo
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {usuario.activo ? 'Activo' : 'Inactivo'}
                        </button>
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
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(usuario)}
                            className="border-red-300 text-red-700 hover:bg-red-50"
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
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No se encontraron usuarios</p>
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
                <CardTitle>{editingUser ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</CardTitle>
                <button
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">Nombre Completo *</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: Juan Pérez García"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="email">Correo Electrónico *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="usuario@ejemplo.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">
                    Contraseña {editingUser ? '(dejar en blanco para no cambiar)' : '*'}
                  </Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      className="pl-10"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="••••••••"
                      required={!editingUser}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="rol">Rol *</Label>
                    <select
                      id="rol"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.rol}
                      onChange={(e) => {
                        const nuevoRol = e.target.value as Rol;
                        setFormData({
                          ...formData,
                          rol: nuevoRol,
                          especialidad:
                            nuevoRol === 'medico' ? 'medicina_familiar' : undefined,
                        });
                      }}
                      required
                    >
                      <option value="administrador">Administrador</option>
                      <option value="recepcion">Recepción</option>
                      <option value="triage">Triage</option>
                      <option value="medico">Médico</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="ciudad">Ciudad *</Label>
                    <select
                      id="ciudad"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad })}
                      required
                    >
                      <option value="sonoyta">Sonoyta</option>
                      <option value="puerto_penasco">Puerto Peñasco</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                </div>

                {formData.rol === 'medico' && (
                  <div>
                    <Label htmlFor="especialidad">Especialidad *</Label>
                    <select
                      id="especialidad"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.especialidad}
                      onChange={(e) =>
                        setFormData({ ...formData, especialidad: e.target.value as Especialidad })
                      }
                      required
                    >
                      <option value="medicina_familiar">Medicina Familiar</option>
                      <option value="pediatria">Pediatría</option>
                      <option value="fisioterapia">Fisioterapia</option>
                      <option value="vacunas">Vacunas</option>
                      <option value="deteccion_cancer">Detección Oportuna de Cáncer</option>
                      <option value="dentista">Dentista</option>
                    </select>
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2">Permisos del Rol</h4>
                  <ul className="text-sm text-blue-800 space-y-1">
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
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                    {editingUser ? 'Actualizar Usuario' : 'Crear Usuario'}
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

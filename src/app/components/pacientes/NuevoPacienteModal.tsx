import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X } from 'lucide-react';
import { Paciente, Ciudad } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';

interface NuevoPacienteModalProps {
  onClose: () => void;
}

export function NuevoPacienteModal({ onClose }: NuevoPacienteModalProps) {
  const { pacientes, addPaciente } = useData();
  const { user } = useAuth();

  const [formData, setFormData] = useState<Partial<Paciente>>({
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Masculino',
    telefono: '',
    ciudad: user?.ciudad || 'puerto_penasco',
    imagen: '',
  });

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

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto text-black">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Registrar Nuevo Paciente</CardTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
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
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
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
  );
}

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, AlertCircle, DollarSign } from 'lucide-react';
import { Paciente, Especialidad, Cirugia } from '../../types';

interface ModalNuevaCirugiaProps {
  pacientes: Paciente[];
  onClose: () => void;
  onSubmit: (nuevaCirugia: Partial<Cirugia>) => void;
}

export function ModalNuevaCirugia({ pacientes, onClose, onSubmit }: ModalNuevaCirugiaProps) {
  const [pacienteId, setPacienteId] = useState('');
  const [formData, setFormData] = useState<Partial<Cirugia>>({
    diagnostico: '',
    medicoACargo: '',
    especialidad: 'medicina_familiar',
    fechaCirugia: '',
    horaEstimada: '',
    lugarCirugia: '',
    costoEstimado: 0,
    notas: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      pacienteId,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-2xl my-8">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle>Iniciar Proceso de Cirugía</CardTitle>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="paciente">Paciente *</Label>
              <select
                id="paciente"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={pacienteId}
                onChange={(e) => setPacienteId(e.target.value)}
                required
              >
                <option value="">Selecciona un paciente</option>
                {pacientes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre} - {p.numeroExpediente}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="diagnostico">Diagnóstico / Tipo de Cirugía *</Label>
              <Input
                id="diagnostico"
                value={formData.diagnostico}
                onChange={(e) => setFormData({ ...formData, diagnostico: e.target.value })}
                placeholder="Ej: Apendicectomía, Cesárea, etc."
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="medico">Médico a Cargo *</Label>
                <Input
                  id="medico"
                  value={formData.medicoACargo}
                  onChange={(e) => setFormData({ ...formData, medicoACargo: e.target.value })}
                  placeholder="Dr. Juan Pérez"
                  required
                />
              </div>
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
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaCirugia">Fecha Tentativa</Label>
                <Input
                  id="fechaCirugia"
                  type="date"
                  value={formData.fechaCirugia}
                  onChange={(e) => setFormData({ ...formData, fechaCirugia: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="hora">Hora Estimada</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.horaEstimada}
                  onChange={(e) => setFormData({ ...formData, horaEstimada: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lugar">Lugar de Cirugía *</Label>
                <Input
                  id="lugar"
                  value={formData.lugarCirugia}
                  onChange={(e) => setFormData({ ...formData, lugarCirugia: e.target.value })}
                  placeholder="Hospital General"
                  required
                />
              </div>
              <div>
                <Label htmlFor="costo">Costo Estimado *</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="costo"
                    type="number"
                    className="pl-10"
                    value={formData.costoEstimado}
                    onChange={(e) =>
                      setFormData({ ...formData, costoEstimado: Number(e.target.value) })
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <Label htmlFor="notas">Notas Adicionales</Label>
              <textarea
                id="notas"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                value={formData.notas}
                onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                placeholder="Información adicional relevante..."
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-medium mb-1">Próximo Paso</p>
                  <p>
                    Después de iniciar el proceso, se deberá realizar un estudio socioeconómico
                    del paciente antes de programar la cirugía.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                Iniciar Proceso
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

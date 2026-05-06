import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, ClipboardList } from 'lucide-react';
import { Paciente, Seguimiento, Cirugia } from '../../types';
import { todayYmd } from '../../utils/clock';

interface ModalSeguimientoProps {
  cirugia: Cirugia;
  paciente?: Paciente;
  onClose: () => void;
  onSubmit: (seguimiento: Partial<Seguimiento>) => void;
}

export function ModalSeguimiento({ cirugia, paciente, onClose, onSubmit }: ModalSeguimientoProps) {
  const [seguimientoForm, setSeguimientoForm] = useState<Partial<Seguimiento>>({
    cirugiaId: cirugia.id,
    fecha: todayYmd(),
    medicoEncargado: '',
    estadoPaciente: '',
    observaciones: '',
    proximoSeguimiento: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(seguimientoForm);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registrar Seguimiento</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {cirugia.diagnostico} - {paciente?.nombre || 'Desconocido'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fechaSeg">Fecha del Seguimiento *</Label>
                <Input
                  id="fechaSeg"
                  type="date"
                  className="text-gray-900"
                  value={seguimientoForm.fecha}
                  onChange={(e) =>
                    setSeguimientoForm({ ...seguimientoForm, fecha: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="medicoSeg">Médico Encargado *</Label>
                <Input
                  id="medicoSeg"
                  className="text-gray-900"
                  value={seguimientoForm.medicoEncargado}
                  onChange={(e) =>
                    setSeguimientoForm({ ...seguimientoForm, medicoEncargado: e.target.value })
                  }
                  placeholder="Dr. Juan Pérez"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="estado">Estado del Paciente *</Label>
              <textarea
                id="estado"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={3}
                value={seguimientoForm.estadoPaciente}
                onChange={(e) =>
                  setSeguimientoForm({ ...seguimientoForm, estadoPaciente: e.target.value })
                }
                placeholder="Describe el estado actual del paciente, evolución, etc."
                required
              />
            </div>

            <div>
              <Label htmlFor="observacionesSeg">Observaciones *</Label>
              <textarea
                id="observacionesSeg"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                rows={3}
                value={seguimientoForm.observaciones}
                onChange={(e) =>
                  setSeguimientoForm({ ...seguimientoForm, observaciones: e.target.value })
                }
                placeholder="Notas adicionales, recomendaciones, etc."
                required
              />
            </div>

            <div>
              <Label htmlFor="proximoSeg">Próximo Seguimiento</Label>
              <Input
                id="proximoSeg"
                type="date"
                className="text-gray-900"
                value={seguimientoForm.proximoSeguimiento}
                onChange={(e) =>
                  setSeguimientoForm({ ...seguimientoForm, proximoSeguimiento: e.target.value })
                }
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
                <ClipboardList className="w-4 h-4 mr-2" />
                Registrar Seguimiento
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

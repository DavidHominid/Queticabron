import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, DollarSign, Eye } from 'lucide-react';
import { Cita } from '../../types';

interface ExpedienteAppointmentHistoryProps {
  citas: Cita[];
  onVerConsulta: (citaId: string) => void;
  obtenerDatosCompletoCita: (citaId: string) => any;
}

export function ExpedienteAppointmentHistory({ 
  citas, 
  onVerConsulta, 
  obtenerDatosCompletoCita 
}: ExpedienteAppointmentHistoryProps) {
  const estadoCitaBadge = (estado: string) => {
    const colores: { [key: string]: string } = {
      programada: 'bg-blue-100 text-blue-700 border-blue-200',
      en_triage: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      en_consulta: 'bg-purple-100 text-purple-700 border-purple-200',
      completada: 'bg-green-100 text-green-700 border-green-200',
      cancelada: 'bg-red-100 text-red-700 border-red-200',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg text-gray-900">Historial de Citas ({citas.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {citas.slice().reverse().map((cita) => {
            const tieneConsulta = obtenerDatosCompletoCita(cita.id) !== null && cita.estado === 'completada';
            return (
              <div key={cita.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors bg-white">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 capitalize text-base">
                      {cita.especialidad.replace('_', ' ')}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{new Date(cita.fecha).toLocaleDateString('es-MX')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{cita.hora}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span>${cita.costoPagado}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={estadoCitaBadge(cita.estado)}>
                      {cita.estado.replace('_', ' ')}
                    </Badge>
                    {tieneConsulta && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onVerConsulta(cita.id)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Consulta
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-600">Consultorio: {cita.consultorio}</p>
              </div>
            );
          })}
          {citas.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500">No hay citas registradas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

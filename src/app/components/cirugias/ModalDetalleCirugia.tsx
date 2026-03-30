import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';
import { Paciente, Cirugia, EstudioSocioeconomico, Seguimiento } from '../../types';

interface ModalDetalleCirugiaProps {
  cirugia: Cirugia;
  paciente?: Paciente;
  estudio?: EstudioSocioeconomico;
  seguimientos: Seguimiento[];
  onClose: () => void;
}

export function ModalDetalleCirugia({ 
  cirugia, 
  paciente, 
  estudio, 
  seguimientos, 
  onClose 
}: ModalDetalleCirugiaProps) {
  
  const estadoBadgeColor = (estado: string) => {
    const colores: { [key: string]: string } = {
      pendiente_estudio: 'bg-yellow-100 text-yellow-700',
      estudio_completado: 'bg-blue-100 text-blue-700',
      programada: 'bg-purple-100 text-purple-700',
      realizada: 'bg-green-100 text-green-700',
      cancelada: 'bg-red-100 text-red-700',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700';
  };

  const estadoTexto = (estado: string) => {
    const textos: { [key: string]: string } = {
      pendiente_estudio: 'Pendiente de Estudio',
      estudio_completado: 'Estudio Completado',
      programada: 'Programada',
      realizada: 'Realizada',
      cancelada: 'Cancelada',
    };
    return textos[estado] || estado;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="border-b bg-gradient-to-r from-orange-50 to-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{cirugia.diagnostico}</CardTitle>
              <Badge className={`mt-2 ${estadoBadgeColor(cirugia.estado)}`}>
                {estadoTexto(cirugia.estado)}
              </Badge>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Información del paciente y cirugía */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base text-gray-900">Información del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="font-medium text-gray-900">{paciente?.nombre || 'Desconocido'}</p>
                <p className="text-sm text-gray-600">{paciente?.numeroExpediente || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base text-gray-900">Médico a Cargo</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="font-medium text-gray-900">Dr. {cirugia.medicoACargo}</p>
                <p className="text-sm text-gray-600 capitalize">
                  {cirugia.especialidad?.replace('_', ' ') || 'No especificada'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detalles de la cirugía */}
          <Card>
            <CardHeader className="bg-gray-50">
              <CardTitle className="text-base text-gray-900">Detalles de la Cirugía</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Fecha Programada</p>
                  <p className="font-medium text-gray-900">
                    {cirugia.fechaCirugia
                      ? new Date(cirugia.fechaCirugia).toLocaleDateString('es-MX')
                      : 'No programada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Hora</p>
                  <p className="font-medium text-gray-900">
                    {cirugia.horaEstimada || 'No especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Costo Estimado</p>
                  <p className="font-medium text-gray-900">
                    ${cirugia.costoEstimado?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-gray-900">
                <p className="text-sm text-gray-600">Lugar</p>
                <p className="font-medium">{cirugia.lugarCirugia}</p>
              </div>
              {cirugia.notas && (
                <div className="mt-4 text-gray-900">
                  <p className="text-sm text-gray-600">Notas</p>
                  <p>{cirugia.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estudio socioeconómico */}
          {estudio && (
            <Card className="border-2 border-blue-200">
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-base text-gray-900">Estudio Socioeconómico</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Nivel Socioeconómico</p>
                      <Badge
                        className={
                          estudio.nivelSocioeconomico === 'bajo'
                            ? 'bg-red-100 text-red-700'
                            : estudio.nivelSocioeconomico === 'medio'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }
                      >
                        {estudio.nivelSocioeconomico?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ingreso Mensual</p>
                      <p className="font-medium text-gray-900">
                        ${estudio.ingresoMensual?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Dependientes</p>
                      <p className="font-medium text-gray-900">
                        {estudio.numeroPersonasDependientes || 0}
                      </p>
                    </div>
                  </div>
                  {estudio.observaciones && (
                    <div className="text-gray-900">
                      <p className="text-sm text-gray-600">Observaciones</p>
                      <p className="text-sm">{estudio.observaciones}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Seguimientos */}
          {seguimientos.length > 0 && (
            <Card>
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-base text-gray-900">
                  Seguimientos ({seguimientos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {seguimientos.map((seg) => (
                    <div key={seg.id} className="p-3 border rounded-lg bg-purple-50 text-gray-900">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-gray-900">{seg.medicoEncargado}</p>
                          <p className="text-sm text-gray-600">
                            {seg.fecha ? new Date(seg.fecha).toLocaleDateString('es-MX') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-gray-700">Estado:</p>
                          <p className="text-sm">{seg.estadoPaciente}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-700">Observaciones:</p>
                          <p className="text-sm">{seg.observaciones}</p>
                        </div>
                        {seg.proximoSeguimiento && (
                          <div>
                            <p className="text-sm font-medium text-gray-700">
                              Próximo seguimiento:
                            </p>
                            <p className="text-sm">
                              {seg.proximoSeguimiento ? new Date(seg.proximoSeguimiento).toLocaleDateString('es-MX') : 'N/A'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

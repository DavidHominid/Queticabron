import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  X, Activity, Thermometer, Heart, Droplet, Stethoscope, Pill, FileText, Calendar 
} from 'lucide-react';
import { Paciente, Cita } from '../../types';

interface ModalDetalleConsultaProps {
  cita: Cita;
  paciente: Paciente;
  triageData: any;
  consultaData: any;
  onClose: () => void;
}

export function ModalDetalleConsulta({ 
  cita, 
  paciente, 
  triageData, 
  consultaData, 
  onClose 
}: ModalDetalleConsultaProps) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">Detalle de Consulta Médica</CardTitle>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="text-sm capitalize text-gray-900 border-gray-300">
                  {cita.especialidad.replace('_', ' ')}
                </Badge>
                <Badge className="bg-blue-100 text-blue-700 text-sm">
                  {new Date(cita.fecha).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })} - {cita.hora}
                </Badge>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Información del Paciente */}
          <Card className="bg-gray-50">
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Paciente</p>
                  <p className="font-medium text-gray-900">{paciente.nombre}</p>
                </div>
                <div>
                  <p className="text-gray-600">Expediente</p>
                  <p className="font-medium text-gray-900">{paciente.numeroExpediente}</p>
                </div>
                <div>
                  <p className="text-gray-600">Consultorio</p>
                  <p className="font-medium text-gray-900">{cita.consultorio}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signos Vitales */}
          <Card>
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
                <Activity className="w-5 h-5" />
                Signos Vitales
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3 bg-red-50 rounded-lg text-center">
                  <Thermometer className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Temperatura</p>
                  <p className="font-semibold text-gray-900">{triageData.temperatura}°C</p>
                </div>
                <div className="p-3 bg-pink-50 rounded-lg text-center">
                  <Heart className="w-5 h-5 text-pink-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Presión Arterial</p>
                  <p className="font-semibold text-gray-900">{triageData.presionArterial}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg text-center">
                  <Activity className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Ritmo Cardíaco</p>
                  <p className="font-semibold text-gray-900">{triageData.ritmoCardiaco} bpm</p>
                </div>
                <div className="p-3 bg-purple-50 rounded-lg text-center">
                  <Droplet className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                  <p className="text-xs text-gray-600">Glucosa</p>
                  <p className="font-semibold text-gray-900">{triageData.azucarEnSangre} mg/dL</p>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-4 mt-3">
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Peso</p>
                  <p className="font-semibold text-gray-900">{triageData.peso} kg</p>
                </div>
                <div className="p-3 bg-green-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Altura</p>
                  <p className="font-semibold text-gray-900">{triageData.altura} cm</p>
                </div>
                <div className="p-3 bg-orange-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Frecuencia Respiratoria</p>
                  <p className="font-semibold text-gray-900">{triageData.frecuenciaRespiratoria} rpm</p>
                </div>
                <div className="p-3 bg-cyan-50 rounded-lg text-center">
                  <p className="text-xs text-gray-600">Saturación O₂</p>
                  <p className="font-semibold text-gray-900">{triageData.saturacionOxigeno}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consulta Médica */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-base text-gray-900">Motivo de Consulta</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-900">{consultaData.motivoConsulta}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-base text-gray-900">Padecimiento Actual</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-900">{consultaData.padecimientoActual}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-blue-50">
                <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                  <Stethoscope className="w-5 h-5" />
                  Exploración Física
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-900">{consultaData.exploracionFisica}</p>
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-purple-50">
                <CardTitle className="text-base text-purple-900">Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-lg font-semibold text-purple-900">{consultaData.diagnostico}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-green-50">
                <CardTitle className="text-base text-gray-900">Tratamiento</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-gray-900">{consultaData.tratamiento}</p>
              </CardContent>
            </Card>

            {consultaData.medicamentosRecetados && consultaData.medicamentosRecetados.length > 0 && (
              <Card>
                <CardHeader className="bg-orange-50">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                    <Pill className="w-5 h-5" />
                    Medicamentos Recetados
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {consultaData.medicamentosRecetados.map((med: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-orange-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900">{med.nombre}</p>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                              <div>
                                <p className="text-gray-600">Dosis</p>
                                <p className="text-gray-900">{med.dosis}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Frecuencia</p>
                                <p className="text-gray-900">{med.frecuencia}</p>
                              </div>
                              <div>
                                <p className="text-gray-600">Duración</p>
                                <p className="text-gray-900">{med.duracion}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {consultaData.estudiosIndicados && consultaData.estudiosIndicados.length > 0 && (
              <Card>
                <CardHeader className="bg-cyan-50">
                  <CardTitle className="text-base flex items-center gap-2 text-gray-900">
                    <FileText className="w-5 h-5" />
                    Estudios de Laboratorio / Gabinete
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {consultaData.estudiosIndicados.map((estudio: any, idx: number) => (
                      <div key={idx} className="p-3 bg-white border border-cyan-200 rounded-lg text-gray-900">
                        <p className="font-semibold text-gray-900">{estudio.tipo}</p>
                        <p className="text-sm text-gray-600 mt-1">{estudio.indicaciones}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {consultaData.recomendaciones && (
              <Card>
                <CardHeader className="bg-yellow-50">
                  <CardTitle className="text-base text-gray-900">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <p className="text-gray-900">{consultaData.recomendaciones}</p>
                </CardContent>
              </Card>
            )}

            {consultaData.proximaConsulta && (
              <Card className="bg-indigo-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-indigo-600" />
                    <div>
                      <p className="text-sm text-gray-600">Próxima Consulta</p>
                      <p className="font-medium text-gray-900">{consultaData.proximaConsulta}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="text-gray-900">
              Cerrar
            </Button>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <FileText className="w-4 h-4 mr-2" />
              Imprimir Consulta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

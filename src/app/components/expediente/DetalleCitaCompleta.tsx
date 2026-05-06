import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Thermometer, Heart, Droplet, Stethoscope, Pill, FileText, Calendar, ArrowLeft } from 'lucide-react';
import { Cita, Paciente } from '../../types';
import { formatDateSafe } from '../ui/utils';
import { labelEspecialidad } from '../../utils/especialidades';

interface DetalleCitaCompletaProps {
  cita: Cita;
  paciente: Paciente;
  triageData: any;
  consultaData: any;
  especialidadesCatalogo?: any[];
  onBack: () => void;
}

export function DetalleCitaCompleta({
  cita,
  triageData,
  consultaData,
  especialidadesCatalogo,
  onBack,
}: DetalleCitaCompletaProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-semibold text-gray-900">Detalle de Cita</h2>
            <Badge className="bg-blue-100 text-blue-700 text-sm">
              {formatDateSafe(cita.fecha)} - {cita.hora}
            </Badge>
            <Badge variant="outline" className="text-sm border-gray-300">
              {labelEspecialidad(cita.especialidad, especialidadesCatalogo as any)}
            </Badge>
            <Badge variant="outline" className="text-sm border-gray-300">
              {String(cita.tipoCitaNombre || '').trim() || 'Sin tipo de cita'}
            </Badge>
            <Badge variant="outline" className="text-sm border-gray-300">
              ${cita.costoPagado}
            </Badge>
          </div>
          <p className="text-sm text-gray-600 mt-1">Consultorio: {cita.consultorio}</p>
        </div>
        <Button variant="outline" onClick={onBack} className="text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a citas
        </Button>
      </div>

      {triageData ? (
        <Card>
          <CardHeader className="bg-purple-50">
            <CardTitle className="text-lg flex items-center gap-2 text-purple-900">
              <Activity className="w-5 h-5" />
              Signos Vitales
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
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
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center text-gray-600">
            No hay signos vitales (triage) registrados para esta cita.
          </CardContent>
        </Card>
      )}

      {consultaData ? (
        <div className="space-y-4">
          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-base text-gray-900">Motivo de Consulta</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{consultaData.motivoConsulta}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-base text-gray-900">Padecimiento Actual</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{consultaData.padecimientoActual}</p>
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
              <p className="text-gray-900 whitespace-pre-wrap">{consultaData.exploracionFisica}</p>
            </CardContent>
          </Card>

          <Card className="border-2 border-purple-200">
            <CardHeader className="bg-purple-50">
              <CardTitle className="text-base text-purple-900">Diagnóstico</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-lg font-semibold text-purple-900 whitespace-pre-wrap">{consultaData.diagnostico}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="bg-green-50">
              <CardTitle className="text-base text-gray-900">Tratamiento</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <p className="text-gray-900 whitespace-pre-wrap">{consultaData.tratamiento}</p>
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
                    <p className="font-semibold text-gray-900">{med.nombre}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm">
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
                    <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{estudio.indicaciones}</p>
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
              <p className="text-gray-900 whitespace-pre-wrap">{consultaData.recomendaciones}</p>
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
      ) : (
        <Card className="shadow-sm">
          <CardContent className="p-6 text-center text-gray-600">
            No hay nota médica (consulta) registrada para esta cita.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

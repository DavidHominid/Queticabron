import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  X, Activity, Thermometer, Heart, Droplet, Stethoscope, Pill, FileText, Calendar 
} from 'lucide-react';
import { Paciente, Cita } from '../../types';
import { formatDateSafe } from '../ui/utils';

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
  const texto = (value: any) => String(value ?? '').trim();

  const vitals = triageData
    ? [
        {
          label: 'Temperatura',
          icon: Thermometer,
          value: Number.isFinite(Number(triageData.temperatura)) ? `${triageData.temperatura} °C` : 'N/A',
        },
        {
          label: 'Presión arterial',
          icon: Heart,
          value: texto(triageData.presionArterial) || 'N/A',
        },
        {
          label: 'Ritmo cardíaco',
          icon: Activity,
          value: Number.isFinite(Number(triageData.ritmoCardiaco)) ? `${triageData.ritmoCardiaco} bpm` : 'N/A',
        },
        {
          label: 'Glucosa',
          icon: Droplet,
          value: Number.isFinite(Number(triageData.azucarEnSangre)) ? `${triageData.azucarEnSangre} mg/dL` : 'N/A',
        },
        {
          label: 'Peso',
          icon: Activity,
          value: Number.isFinite(Number(triageData.peso)) ? `${triageData.peso} kg` : 'N/A',
        },
        {
          label: 'Altura',
          icon: Activity,
          value: Number.isFinite(Number(triageData.altura)) ? `${triageData.altura} cm` : 'N/A',
        },
        {
          label: 'Frecuencia resp.',
          icon: Activity,
          value: Number.isFinite(Number(triageData.frecuenciaRespiratoria)) ? `${triageData.frecuenciaRespiratoria} rpm` : 'N/A',
        },
        {
          label: 'Saturación O₂',
          icon: Activity,
          value: Number.isFinite(Number(triageData.saturacionOxigeno)) ? `${triageData.saturacionOxigeno}%` : 'N/A',
        },
      ]
    : [];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl my-8 max-h-[90vh] overflow-y-auto">
        <CardHeader className="sticky top-0 z-10 border-b bg-card">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl text-foreground">Detalle de consulta médica</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-accent text-[color:var(--accent-foreground)] capitalize">
                  {cita.especialidad.replace('_', ' ')}
                </Badge>
                <Badge variant="outline" className="bg-card text-muted-foreground">
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {formatDateSafe(cita.fecha)} · {cita.hora}
                </Badge>
                <Badge variant="outline" className="bg-card text-muted-foreground">
                  Consultorio: {texto(cita.consultorio) || 'Sin asignar'}
                </Badge>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-[0_2px_8px_rgba(121,201,197,0.08)] transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base text-foreground">Paciente</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                <div className="rounded-xl border bg-accent p-3">
                  <p className="text-xs font-medium text-muted-foreground">Nombre</p>
                  <p className="mt-1 font-semibold text-foreground">{paciente.nombre}</p>
                </div>
                <div className="rounded-xl border bg-accent p-3">
                  <p className="text-xs font-medium text-muted-foreground">Expediente</p>
                  <p className="mt-1 font-semibold text-foreground">{paciente.numeroExpediente}</p>
                </div>
                <div className="rounded-xl border bg-accent p-3">
                  <p className="text-xs font-medium text-muted-foreground">Consultorio</p>
                  <p className="mt-1 font-semibold text-foreground">{texto(cita.consultorio) || 'N/A'}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b gap-2">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Activity className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
                Triage
              </CardTitle>
              <p className="text-sm text-muted-foreground">Signos vitales y observaciones del ingreso.</p>
            </CardHeader>
            <CardContent className="pt-5">
              {triageData ? (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {vitals.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="rounded-xl border bg-accent p-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                          <Icon className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">{item.value}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No hay triage registrado para esta cita.</p>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base text-foreground">Motivo de consulta</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-foreground whitespace-pre-wrap">{texto(consultaData.motivoConsulta) || 'No registrado.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base text-foreground">Padecimiento actual</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-foreground whitespace-pre-wrap">{texto(consultaData.padecimientoActual) || 'No registrado.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base flex items-center gap-2 text-foreground">
                  <Stethoscope className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
                  Exploración Física
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-foreground whitespace-pre-wrap">{texto(consultaData.exploracionFisica) || 'No registrado.'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base text-foreground">Diagnóstico</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                  <p className="text-sm font-semibold text-[color:var(--brand-primary-strong)]">Diagnóstico</p>
                  <p className="mt-2 text-sm font-semibold text-foreground whitespace-pre-wrap">{texto(consultaData.diagnostico) || 'No registrado.'}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base text-foreground">Tratamiento</CardTitle>
              </CardHeader>
              <CardContent className="pt-5">
                <p className="text-sm text-foreground whitespace-pre-wrap">{texto(consultaData.tratamiento) || 'No registrado.'}</p>
              </CardContent>
            </Card>

            {consultaData.medicamentosRecetados && consultaData.medicamentosRecetados.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <Pill className="h-5 w-5 text-[color:var(--brand-tertiary)]" />
                    Medicamentos Recetados
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    {consultaData.medicamentosRecetados.map((med: any, idx: number) => (
                      <div key={idx} className="rounded-xl border bg-accent p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-semibold text-foreground">{texto(med.nombre) || 'Medicamento'}</p>
                            <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                              <div>
                                <p className="text-xs text-muted-foreground">Dosis</p>
                                <p className="text-sm text-foreground">{texto(med.dosis) || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Frecuencia</p>
                                <p className="text-sm text-foreground">{texto(med.frecuencia) || 'N/A'}</p>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground">Duración</p>
                                <p className="text-sm text-foreground">{texto(med.duracion) || 'N/A'}</p>
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
                <CardHeader className="border-b">
                  <CardTitle className="text-base flex items-center gap-2 text-foreground">
                    <FileText className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
                    Estudios de Laboratorio / Gabinete
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="space-y-3">
                    {consultaData.estudiosIndicados.map((estudio: any, idx: number) => (
                      <div key={idx} className="rounded-xl border bg-accent p-3">
                        <p className="font-semibold text-foreground">{texto(estudio.tipo) || 'Estudio'}</p>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{texto(estudio.indicaciones) || 'Sin indicaciones.'}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {consultaData.recomendaciones && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base text-foreground">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-foreground whitespace-pre-wrap">{consultaData.recomendaciones}</p>
                </CardContent>
              </Card>
            )}

            {consultaData.proximaConsulta && (
              <div className="rounded-xl border border-secondary/20 bg-secondary/10 p-4">
                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Próxima consulta</p>
                    <p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{consultaData.proximaConsulta}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
            <Button variant="secondary">
              <FileText className="w-4 h-4 mr-2" />
              Imprimir Consulta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

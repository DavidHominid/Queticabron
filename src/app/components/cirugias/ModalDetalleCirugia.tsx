import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { X } from 'lucide-react';
import { Paciente, Cirugia, EstudioSocioeconomico, Seguimiento } from '../../types';
import { formatDateYmd } from '../../utils/clock';

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
  
  const estadoBadgeStyle = (estado: string) => {
    if (estado === 'cancelada') return { variant: 'destructive' as const, className: '' };
    if (estado === 'realizada') return { variant: 'default' as const, className: '' };
    if (estado === 'programada' || estado === 'estudio_completado') return { variant: 'secondary' as const, className: '' };
    if (estado === 'pendiente_estudio') return { variant: 'outline' as const, className: 'bg-accent text-accent-foreground border-transparent' };
    return { variant: 'outline' as const, className: 'bg-background' };
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
        <CardHeader className="border-b border-border bg-muted/20">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{cirugia.diagnostico}</CardTitle>
              <Badge variant={estadoBadgeStyle(cirugia.estado).variant} className={`mt-2 ${estadoBadgeStyle(cirugia.estado).className}`}>
                {estadoTexto(cirugia.estado)}
              </Badge>
            </div>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Información del paciente y cirugía */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-base text-foreground">Información del Paciente</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="font-medium text-foreground">{paciente?.nombre || 'Desconocido'}</p>
                <p className="text-sm text-muted-foreground">{paciente?.numeroExpediente || 'N/A'}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-base text-foreground">Médico a Cargo</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="font-medium text-foreground">Dr. {cirugia.medicoACargo}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {cirugia.especialidad?.replace('_', ' ') || 'No especificada'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Detalles de la cirugía */}
          <Card>
            <CardHeader className="bg-muted/20">
              <CardTitle className="text-base text-foreground">Detalles de la Cirugía</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Fecha Programada</p>
                  <p className="font-medium text-foreground">
                    {cirugia.fechaCirugia
                      ? formatDateYmd(cirugia.fechaCirugia)
                      : 'No programada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Hora</p>
                  <p className="font-medium text-foreground">
                    {cirugia.horaEstimada || 'No especificada'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Costo Estimado</p>
                  <p className="font-medium text-foreground">
                    ${cirugia.costoEstimado?.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
              <div className="mt-4 text-foreground">
                <p className="text-sm text-muted-foreground">Lugar</p>
                <p className="font-medium">{cirugia.lugarCirugia}</p>
              </div>
              {cirugia.notas && (
                <div className="mt-4 text-foreground">
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p>{cirugia.notas}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Estudio socioeconómico */}
          {estudio && (
            <Card className="border border-border">
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-base text-foreground">Estudio Socioeconómico</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Nivel Socioeconómico</p>
                      <Badge
                        variant={
                          estudio.nivelSocioeconomico === 'bajo'
                            ? 'destructive'
                            : estudio.nivelSocioeconomico === 'medio'
                              ? 'secondary'
                              : 'default'
                        }
                      >
                        {estudio.nivelSocioeconomico?.toUpperCase() || 'N/A'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Ingreso Mensual</p>
                      <p className="font-medium text-foreground">
                        ${estudio.ingresoMensual?.toLocaleString() || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Dependientes</p>
                      <p className="font-medium text-foreground">
                        {estudio.numeroPersonasDependientes || 0}
                      </p>
                    </div>
                  </div>
                  {estudio.observaciones && (
                    <div className="text-foreground">
                      <p className="text-sm text-muted-foreground">Observaciones</p>
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
              <CardHeader className="bg-muted/20">
                <CardTitle className="text-base text-foreground">
                  Seguimientos ({seguimientos.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {seguimientos.map((seg) => (
                    <div key={seg.id} className="p-3 border border-border rounded-lg bg-muted/20 text-foreground">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium text-foreground">{seg.medicoEncargado}</p>
                          <p className="text-sm text-muted-foreground">
                            {seg.fecha ? formatDateYmd(seg.fecha) : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Estado:</p>
                          <p className="text-sm">{seg.estadoPaciente}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Observaciones:</p>
                          <p className="text-sm">{seg.observaciones}</p>
                        </div>
                        {seg.proximoSeguimiento && (
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Próximo seguimiento:
                            </p>
                            <p className="text-sm">
                              {seg.proximoSeguimiento ? formatDateYmd(seg.proximoSeguimiento) : 'N/A'}
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

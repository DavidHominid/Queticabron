import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Calendar, Clock, DollarSign, Eye } from 'lucide-react';
import { Cita } from '../../types';
import { formatDateSafe } from '../ui/utils';

interface ExpedienteAppointmentHistoryProps {
  citas: Cita[];
  onVerConsulta: (citaId: string) => void;
  obtenerDatosCompletoCita: (citaId: string) => any;
  selectedCitaId?: string | null;
  maxHeightClassName?: string;
}

export function ExpedienteAppointmentHistory({ 
  citas, 
  onVerConsulta, 
  obtenerDatosCompletoCita,
  selectedCitaId,
  maxHeightClassName
}: ExpedienteAppointmentHistoryProps) {
  const estadoCitaBadge = (estado: string) => {
    const colores: { [key: string]: string } = {
      programada: 'bg-secondary/15 text-[color:var(--brand-secondary-strong)] border-secondary/25',
      en_triage: 'bg-secondary/10 text-[color:var(--brand-secondary-strong)] border-secondary/25',
      en_consulta: 'bg-[color:var(--brand-tertiary)] text-primary-foreground border-[color:var(--brand-tertiary)]',
      completada: 'bg-[color:var(--brand-primary-strong)] text-primary-foreground border-[color:var(--brand-primary-strong)]',
      cancelada: 'bg-[color:var(--chart-4)] text-primary-foreground border-[color:var(--chart-4)]',
      cedida: 'bg-[color:var(--chart-5)] text-primary-foreground border-[color:var(--chart-5)]',
      no_asistio: 'bg-[color:var(--outline)] text-primary-foreground border-[color:var(--outline)]',
    };
    return colores[estado] || 'bg-muted text-muted-foreground border-border';
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base text-foreground">Historial de citas ({citas.length})</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className={`space-y-3 overflow-y-auto pr-2 custom-scrollbar ${maxHeightClassName ?? 'max-h-96'}`}>
          {citas.slice().reverse().map((cita) => {
            const tieneRegistro = obtenerDatosCompletoCita(cita.id) !== null;
            const selected = String(selectedCitaId || '') === String(cita.id);
            return (
              <div
                key={cita.id}
                className={`cursor-pointer rounded-xl border p-4 transition-colors ${
                  selected ? 'border-primary/30 bg-primary/10' : 'bg-card hover:bg-accent'
                }`}
                onClick={() => onVerConsulta(cita.id)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="text-base font-semibold text-foreground capitalize">
                      {cita.especialidad.replace('_', ' ')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDateSafe(cita.fecha)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{cita.hora}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-[color:var(--brand-primary-strong)]" />
                        {Number(cita.costoPagado) > 0 ? (
                          <span>${Number(cita.costoPagado).toFixed(2)}</span>
                        ) : (
                          <span>Pago pendiente</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`border ${estadoCitaBadge(cita.estado)}`}>
                      {cita.estado.replace('_', ' ')}
                    </Badge>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        onVerConsulta(cita.id);
                      }}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      {tieneRegistro ? 'Ver detalle' : 'Ver'}
                    </Button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Consultorio: {cita.consultorio}</p>
              </div>
            );
          })}
          {citas.length === 0 && (
            <div className="py-12 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-[color:var(--brand-secondary-strong)]">
                <Calendar className="h-7 w-7" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">No hay citas registradas</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

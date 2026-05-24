import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Thermometer, Heart, Droplet, Stethoscope, Pill, FileText, Calendar, ArrowLeft, User } from 'lucide-react';
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
  backLabel?: string;
}

export function DetalleCitaCompleta({
  cita,
  paciente,
  triageData,
  consultaData,
  especialidadesCatalogo,
  onBack,
  backLabel,
}: DetalleCitaCompletaProps) {
  const nombrePaciente = `${String(paciente?.nombre || '').trim()} ${String(paciente?.apellido || '').trim()}`.trim();

  const texto = (value: any) => String(value ?? '').trim();

  const etiquetaEstado = (estado: Cita['estado']) => {
    switch (estado) {
      case 'programada':
        return 'Programada';
      case 'en_triage':
        return 'En triage';
      case 'en_consulta':
        return 'En consulta';
      case 'completada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      case 'cedida':
        return 'Cedida';
      case 'no_asistio':
        return 'No asistió';
      default:
        return String(estado);
    }
  };

  const claseEstado = (estado: Cita['estado']) => {
    switch (estado) {
      case 'programada':
        return 'bg-secondary text-secondary-foreground';
      case 'en_triage':
        return 'bg-[color:var(--brand-soft-peach)] text-[color:var(--accent-foreground)]';
      case 'en_consulta':
        return 'bg-[color:var(--brand-tertiary)] text-primary-foreground';
      case 'completada':
        return 'bg-[color:var(--brand-primary-strong)] text-primary-foreground';
      case 'cancelada':
        return 'bg-[color:var(--chart-4)] text-primary-foreground';
      case 'cedida':
        return 'bg-[color:var(--chart-5)] text-primary-foreground';
      case 'no_asistio':
        return 'bg-[color:var(--outline)] text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const formatoNumero = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const formatoMoneda = (() => {
    const costo = Number(cita.costoPagado ?? 0);
    if (!Number.isFinite(costo) || !(costo > 0)) return 'Pago pendiente';
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(costo);
    } catch {
      return `$${costo}`;
    }
  })();

  const vitals = triageData
    ? [
        {
          label: 'Temperatura',
          icon: Thermometer,
          value: formatoNumero(triageData.temperatura),
          suffix: '°C',
        },
        {
          label: 'Presión arterial',
          icon: Heart,
          value: texto(triageData.presionArterial) || null,
          suffix: '',
        },
        {
          label: 'Ritmo cardíaco',
          icon: Activity,
          value: formatoNumero(triageData.ritmoCardiaco),
          suffix: 'bpm',
        },
        {
          label: 'Glucosa',
          icon: Droplet,
          value: formatoNumero(triageData.azucarEnSangre),
          suffix: 'mg/dL',
        },
        {
          label: 'Peso',
          icon: Activity,
          value: formatoNumero(triageData.peso),
          suffix: 'kg',
        },
        {
          label: 'Altura',
          icon: Activity,
          value: formatoNumero(triageData.altura),
          suffix: 'cm',
        },
        {
          label: 'Frecuencia respiratoria',
          icon: Activity,
          value: formatoNumero(triageData.frecuenciaRespiratoria),
          suffix: 'rpm',
        },
        {
          label: 'Saturación O₂',
          icon: Activity,
          value: formatoNumero(triageData.saturacionOxigeno),
          suffix: '%',
        },
      ]
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <CardTitle className="text-[22px] text-foreground">Detalle de cita</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-accent text-[color:var(--accent-foreground)]"
                >
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {formatDateSafe(cita.fecha)} · {cita.hora}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-card text-muted-foreground"
                >
                  Consultorio: {texto(cita.consultorio) || 'Sin asignar'}
                </Badge>
                <Badge
                  className={claseEstado(cita.estado)}
                >
                  {etiquetaEstado(cita.estado)}
                </Badge>
              </div>
            </div>

            <Button variant="outline" onClick={onBack} className="shrink-0">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {backLabel || 'Volver'}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 text-[color:var(--brand-primary-strong)]">
                  <User className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">Paciente</p>
                  <p className="mt-0.5 truncate text-base font-semibold text-foreground">{nombrePaciente || 'Sin nombre'}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Expediente {texto(paciente.numeroExpediente) || 'N/A'} · {paciente.edad ?? 'N/A'} años · {texto(paciente.sexo) || 'N/A'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <Badge
                variant="outline"
                className="bg-card text-foreground"
              >
                {labelEspecialidad(cita.especialidad, especialidadesCatalogo as any)}
              </Badge>
              <Badge
                variant="outline"
                className="bg-card text-muted-foreground"
              >
                {texto(cita.tipoCitaNombre) || 'Sin tipo de cita'}
              </Badge>
              <Badge
                variant="outline"
                className="bg-card text-muted-foreground"
              >
                {formatoMoneda}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {triageData ? (
        <Card>
          <CardHeader className="border-b gap-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
              Triage
            </CardTitle>
            <p className="text-sm text-muted-foreground">Signos vitales y observaciones del ingreso.</p>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {vitals.map((item) => {
                const Icon = item.icon;
                const valor = item.value;
                const valorTexto =
                  valor === null || valor === undefined || (typeof valor === 'string' && !texto(valor))
                    ? 'N/A'
                    : typeof valor === 'number'
                      ? `${valor}${item.suffix ? ` ${item.suffix}` : ''}`
                      : `${valor}${item.suffix ? ` ${item.suffix}` : ''}`;

                return (
                  <div key={item.label} className="rounded-xl border bg-accent p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                      <Icon className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                    </div>
                    <p className="mt-2 text-sm font-semibold text-foreground">{valorTexto}</p>
                  </div>
                );
              })}
            </div>
            {(triageData.observaciones || triageData.realizadoPor || triageData.fechaHora) && (
              <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
                {triageData.realizadoPor ? (
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Realizado por</p>
                    <p className="mt-1 font-medium text-foreground">{triageData.realizadoPor}</p>
                  </div>
                ) : null}
                {triageData.fechaHora ? (
                  <div className="rounded-xl border bg-card p-3">
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="mt-1 font-medium text-foreground">{formatDateSafe(String(triageData.fechaHora).substring(0, 10))}</p>
                  </div>
                ) : null}
                {triageData.observaciones ? (
                  <div className="rounded-xl border bg-card p-3 md:col-span-3">
                    <p className="text-xs text-muted-foreground">Observaciones</p>
                    <p className="mt-1 font-medium text-foreground whitespace-pre-wrap">{triageData.observaciones}</p>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b gap-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Activity className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
              Triage
            </CardTitle>
            <p className="text-sm text-muted-foreground">Signos vitales y observaciones del ingreso.</p>
          </CardHeader>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No hay triage registrado para esta cita.
          </CardContent>
        </Card>
      )}

      {consultaData ? (
        <Card>
          <CardHeader className="border-b gap-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Stethoscope className="h-5 w-5 text-[color:var(--brand-primary-strong)]" />
              Nota médica
            </CardTitle>
            <p className="text-sm text-muted-foreground">Registro clínico de la consulta.</p>
          </CardHeader>

          <CardContent className="pt-5">
            <div className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Motivo de consulta</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {texto(consultaData.motivoConsulta) || <span className="text-muted-foreground">No registrado.</span>}
                  </p>
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Padecimiento actual</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                    {texto(consultaData.padecimientoActual) || <span className="text-muted-foreground">No registrado.</span>}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                  <p className="text-sm font-semibold text-foreground">Exploración física</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {texto(consultaData.exploracionFisica) || <span className="text-muted-foreground">No registrado.</span>}
                </p>
              </div>

              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-sm font-semibold text-[color:var(--brand-primary-strong)]">Diagnóstico</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-foreground">
                  {texto(consultaData.diagnostico) || <span className="text-muted-foreground font-normal">No registrado.</span>}
                </p>
              </div>

              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Tratamiento</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                  {texto(consultaData.tratamiento) || <span className="text-muted-foreground">No registrado.</span>}
                </p>
              </div>

              {consultaData.medicamentosRecetados && consultaData.medicamentosRecetados.length > 0 ? (
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <Pill className="h-4 w-4 text-[color:var(--brand-tertiary)]" />
                    <p className="text-sm font-semibold text-foreground">Medicamentos recetados</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {consultaData.medicamentosRecetados.map((med: any, idx: number) => (
                      <div key={idx} className="rounded-xl border bg-accent p-3">
                        <p className="font-semibold text-foreground">{texto(med.nombre) || 'Medicamento'}</p>
                        <div className="mt-2 grid gap-2 text-sm text-foreground md:grid-cols-3">
                          <div>
                            <p className="text-xs text-muted-foreground">Dosis</p>
                            <p className="mt-0.5">{texto(med.dosis) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Frecuencia</p>
                            <p className="mt-0.5">{texto(med.frecuencia) || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Duración</p>
                            <p className="mt-0.5">{texto(med.duracion) || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {consultaData.estudiosIndicados && consultaData.estudiosIndicados.length > 0 ? (
                <div className="rounded-xl border bg-card p-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                    <p className="text-sm font-semibold text-foreground">Estudios indicados</p>
                  </div>
                  <div className="mt-3 space-y-3">
                    {consultaData.estudiosIndicados.map((estudio: any, idx: number) => (
                      <div key={idx} className="rounded-xl border bg-accent p-3">
                        <p className="font-semibold text-foreground">{texto(estudio.tipo) || 'Estudio'}</p>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{texto(estudio.indicaciones) || 'Sin indicaciones.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {texto(consultaData.recomendaciones) ? (
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-sm font-semibold text-foreground">Recomendaciones</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{consultaData.recomendaciones}</p>
                </div>
              ) : null}

              {texto(consultaData.proximaConsulta) ? (
                <div className="rounded-xl border bg-[color:var(--brand-soft-peach)] p-4 text-[color:var(--accent-foreground)]">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">Próxima consulta</p>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{consultaData.proximaConsulta}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b gap-2">
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Stethoscope className="h-5 w-5 text-[color:var(--brand-primary-strong)]" />
              Nota médica
            </CardTitle>
            <p className="text-sm text-muted-foreground">Registro clínico de la consulta.</p>
          </CardHeader>
          <CardContent className="pt-5 text-sm text-muted-foreground">
            No hay nota médica registrada para esta cita.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

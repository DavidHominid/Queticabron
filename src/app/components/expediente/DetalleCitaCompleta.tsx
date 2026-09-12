import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Activity, Thermometer, Heart, Droplet, Stethoscope, Pill, FileText, Calendar, ArrowLeft, User, UserCheck } from 'lucide-react';
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

const parseFallbackMedicamentosDetalle = (consulta: any): string[] => {
  if (consulta?.medicamentosRecetados && Array.isArray(consulta.medicamentosRecetados) && consulta.medicamentosRecetados.length > 0) {
    return consulta.medicamentosRecetados
      .filter((m: any) => m?.nombre?.trim() || m?.dosis?.trim())
      .map((m: any) => {
        const parts = [m.nombre || '', m.dosis || '', m.frecuencia || '', m.duracion || ''].filter(Boolean);
        return parts.join(' · ').trim();
      })
      .filter(Boolean);
  }
  const raw = String(consulta?.medicamentos || consulta?.medicamentosTexto || '').trim();
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.map(String).map((s) => s.trim()).filter(Boolean);
    }
  } catch {
    /* ignore */
  }
  return raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
};

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

  const esHistorico = String(cita.origen || 'sistema') === 'captura_fisica';
  const fechaValida =
    cita.fecha &&
    String(cita.fecha) !== '' &&
    String(cita.fecha).toLowerCase() !== 'invalid date' &&
    String(cita.fecha).substring(0, 4) !== '0000' &&
    formatDateSafe(cita.fecha) !== '' &&
    formatDateSafe(cita.fecha) !== 'dd/mm/aaaa';

  const doctorFallback = texto(
    cita.medicoEncargado ||
    consultaData?.idDoctor ||
    consultaData?.medicoUsuarioId ||
    consultaData?.medicoEncargado,
  );

  const encargadoTriage = texto(
    cita.encargadoTriage ||
    triageData?.realizadoPor ||
    triageData?.encargadoTriaje ||
    triageData?.encargadoTriage,
  );

  const obsHpi = texto(
    consultaData?.observaciones ||
    triageData?.observaciones ||
    consultaData?.razonConsulta ||
    triageData?.razonConsulta,
  );
  const obsHpiFuente = texto(consultaData?.observaciones)
    ? 'Nota médica'
    : texto(triageData?.observaciones)
      ? 'Triage'
      : '';

  const motivoConsulta = texto(
    consultaData?.motivoConsulta ||
    consultaData?.razonConsulta ||
    triageData?.razonConsulta,
  );
  const padecimientoActual = texto(consultaData?.padecimientoActual);
  const tratamiento = texto(consultaData?.tratamiento);
  const planRaw = texto(consultaData?.planTratamiento || consultaData?.planSeguimiento);

  const medsFallback = parseFallbackMedicamentosDetalle(consultaData);
  const medsEstruct =
    consultaData?.medicamentosRecetados &&
    Array.isArray(consultaData.medicamentosRecetados) &&
    consultaData.medicamentosRecetados.length > 0
      ? consultaData.medicamentosRecetados
      : null;
  const tieneMeds = !!medsEstruct || medsFallback.length > 0;

  const signosFlat = (() => {
    const t = triageData || {};
    return [
      { label: 'Temp (°C)', value: formatoNumero(t.temperatura), suffix: '' },
      { label: 'PA (mmHg)', value: texto(t.presionArterial) || null, suffix: '' },
      { label: 'FC (lpm)', value: formatoNumero(t.ritmoCardiaco ?? t.frecuenciaCardiaca), suffix: '' },
      { label: 'FR (rpm)', value: formatoNumero(t.frecuenciaRespiratoria ?? t.frec_respiratoria ?? t.respiraciones), suffix: '' },
      { label: 'O2 Sat (%)', value: formatoNumero(t.saturacionOxigeno ?? t.oxigenoSaturacion ?? t.satO2), suffix: '' },
      { label: 'Glucosa', value: formatoNumero(t.azucarEnSangre ?? t.glucosa), suffix: '' },
      { label: 'Altura (cm)', value: formatoNumero(t.altura), suffix: '' },
      { label: 'Peso (kg)', value: formatoNumero(t.peso), suffix: '' },
    ];
  })();
  const hayAlgunSigno = signosFlat.some(s => s.value !== null && String(s.value ?? '').trim() !== '');

  return (
    <div className="space-y-5">
      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="border-b gap-3">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-[22px] text-foreground">
                  {esHistorico ? `Cita Histórica` : `Detalle de cita`}
                </CardTitle>
                {!fechaValida ? (
                  <Badge variant="outline" className="bg-yellow-50 border-yellow-300 text-yellow-700">
                    Falta fecha
                  </Badge>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge
                  variant="outline"
                  className="bg-accent text-[color:var(--accent-foreground)]"
                >
                  <Calendar className="mr-1 h-3.5 w-3.5" />
                  {fechaValida ? `${formatDateSafe(cita.fecha)} · ${cita.hora || ''}`.trim() : 'dd/mm/aaaa'}
                </Badge>
                <Badge
                  variant="outline"
                  className="bg-card text-muted-foreground"
                >
                  Consultorio: {texto(cita.consultorio) || 'Sin asignar'}
                </Badge>
                <Badge className={claseEstado(cita.estado)}>
                  {etiquetaEstado(cita.estado)}
                </Badge>
                {esHistorico ? (
                  <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-500/10 text-[11px]">
                    Histórico
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[11px] text-muted-foreground">
                    Sistema
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Badge variant="outline" className="text-[11px] text-muted-foreground">
                {esHistorico ? 'Exclusiva de esta cita' : 'Cita del sistema'}
              </Badge>
              <Button variant="outline" onClick={onBack} className="shrink-0">
                <ArrowLeft className="mr-2 h-4 w-4" />
                {backLabel || 'Volver'}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Badge variant="outline" className="bg-card text-foreground">
                {labelEspecialidad(cita.especialidad, especialidadesCatalogo as any)}
              </Badge>
              {texto(cita.especialidadOtra) ? (
                <p className="w-full text-right text-xs text-muted-foreground italic md:mt-[-4px]">
                  {texto(cita.especialidadOtra)}
                </p>
              ) : null}
              <Badge variant="outline" className="bg-card text-muted-foreground">
                {texto(cita.tipoCitaNombre) || 'Sin tipo de cita'}
              </Badge>
              <Badge variant="outline" className="bg-card text-muted-foreground">
                {formatoMoneda}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Fecha de la Cita <span className="text-red-500">*</span></p>
              <p className="mt-1 text-sm text-foreground tabular-nums">
                {fechaValida ? `${formatDateSafe(cita.fecha)}${cita.hora ? ` · ${cita.hora}` : ''}` : <span className="text-muted-foreground italic">dd/mm/aaaa</span>}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Especialidad</p>
              <p className="mt-1 text-sm text-foreground">
                {labelEspecialidad(cita.especialidad, especialidadesCatalogo as any)}
                {texto(cita.especialidadOtra) ? (
                  <span className="block text-muted-foreground italic text-xs mt-0.5">{texto(cita.especialidadOtra)}</span>
                ) : null}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-foreground">Doctor / Proveedor / Encargado <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <p className="mt-1 text-sm text-foreground">
                {doctorFallback || <span className="text-muted-foreground italic">Ej. Dr. Fernando Pérez</span>}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-sm font-semibold text-foreground">Encargado de Triage / Enfermería <span className="text-muted-foreground font-normal">(opcional)</span></p>
              <p className="mt-1 text-sm text-foreground">
                {encargadoTriage || <span className="text-muted-foreground italic">Nombre de quien realizó la toma de signos vitales o triaje</span>}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-xl overflow-hidden">
        <div className="flex items-end justify-between gap-2 px-5 pt-4 flex-wrap">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="border-[color:var(--brand-secondary-strong)]/40 bg-[color:var(--brand-secondary-strong)]/10 text-[color:var(--brand-secondary-strong)] text-[11px]"
            >
              Triage de esta cita
            </Badge>
            <p className="text-sm font-bold tracking-wider text-foreground uppercase">
              Signos vitales
            </p>
          </div>
          <p className="text-xs text-muted-foreground">
            Todos opcionales para expedientes antiguos
          </p>
        </div>
        <CardContent className="pt-3">
          {hayAlgunSigno ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
              {signosFlat.map((s) => {
                const val = s.value;
                const vacio = val === null || String(val ?? '').trim() === '';
                return (
                  <div key={s.label} className="rounded-xl border bg-accent/50 p-3 flex flex-col justify-between min-h-[82px]">
                    <p className="text-[11px] font-medium text-muted-foreground leading-tight">{s.label}</p>
                    <p className={`mt-2 text-base font-semibold tabular-nums ${vacio ? 'text-muted-foreground italic' : 'text-foreground'}`}>
                      {vacio ? '—' : `${val}${s.suffix ? ` ${s.suffix}` : ''}`}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic py-2">No hay signos vitales registrados para esta cita.</p>
          )}
          {(triageData?.observaciones || triageData?.fechaHora) && hayAlgunSigno ? (
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm md:grid-cols-3">
              {triageData.fechaHora ? (
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Fecha toma</p>
                  <p className="mt-1 font-medium text-foreground tabular-nums">
                    {formatDateSafe(String(triageData.fechaHora).substring(0, 10))}
                  </p>
                </div>
              ) : null}
              {triageData.realizadoPor ? (
                <div className="rounded-xl border bg-card p-3">
                  <p className="text-xs text-muted-foreground">Realizado por</p>
                  <p className="mt-1 font-medium text-foreground">{triageData.realizadoPor}</p>
                </div>
              ) : null}
              {triageData.observaciones ? (
                <div className="rounded-xl border bg-card p-3 md:col-span-2">
                  <p className="text-xs text-muted-foreground">Observaciones del triage</p>
                  <p className="mt-1 font-medium text-foreground whitespace-pre-wrap text-sm">{triageData.observaciones}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card className="rounded-xl overflow-hidden">
        <CardHeader className="border-b pb-3">
          <div>
            <CardTitle className="text-base font-bold text-foreground">Nota clínica de la cita</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Motivo de Consulta (CC)</p>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Queja principal del paciente en esta cita
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {motivoConsulta || <span className="text-muted-foreground italic">Sin registrar.</span>}
              </p>
            </div>
            <div className="rounded-xl border border-secondary/30 bg-secondary/10 p-4">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-foreground">
                  Observaciones / Historia del Padecimiento (HPI)
                </p>
                {obsHpiFuente ? (
                  <Badge variant="outline" className="text-[10px] bg-card">
                    {obsHpiFuente}
                  </Badge>
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Descripción del padecimiento actual en esta consulta
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {obsHpi || <span className="text-muted-foreground italic">Sin registrar.</span>}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Padecimiento Actual (PE - detalle)</p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Examen físico relevante, impresión diagnóstica o padecimiento actual documentado
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {padecimientoActual || <span className="text-muted-foreground italic">Sin registrar.</span>}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <Pill className="h-4 w-4 text-[color:var(--brand-tertiary)]" />
                <p className="text-sm font-semibold text-foreground">Medicamentos Recetados (RX)</p>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Medicinas recetadas en esta cita, dosis y duración. Un fármaco por línea o texto libre.
              </p>
              {tieneMeds ? (
                <div className="mt-3 space-y-3">
                  {medsEstruct ? medsEstruct.map((med: any, idx: number) => (
                    <div key={idx} className="rounded-xl border bg-accent p-3">
                      <p className="font-semibold text-foreground text-sm">{texto(med.nombre) || 'Medicamento'}</p>
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
                  )) : null}
                  {!medsEstruct && medsFallback.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {medsFallback.map((m, idx) => (
                        <Badge
                          key={idx}
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-amber-800"
                        >
                          {m}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground italic">Sin medicamentos recetados registrados.</p>
              )}
            </div>

            <div className="rounded-xl border bg-card p-4">
              <p className="text-sm font-semibold text-foreground">Tratamiento / Procedimientos (PT)</p>
              <p className="text-xs text-muted-foreground mt-0.5 italic">
                Tratamiento indicado, procedimientos realizados, curaciones, etc.
              </p>
              <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
                {tratamiento || <span className="text-muted-foreground italic">Sin registrar.</span>}
              </p>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-4">
            <p className="text-sm font-semibold text-foreground">Plan y Seguimiento (A/P)</p>
            <p className="text-xs text-muted-foreground mt-0.5 italic">
              Plan terapéutico, estudios a realizar, cita de seguimiento, recomendaciones.
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">
              {planRaw || <span className="text-muted-foreground italic">Sin registrar.</span>}
            </p>
          </div>

          <div className="border-t pt-5 space-y-5">
            {texto(consultaData?.exploracionFisica) ? (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                  <p className="text-sm font-semibold text-foreground">Exploración física</p>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{consultaData.exploracionFisica}</p>
              </div>
            ) : null}

            {texto(consultaData?.diagnostico) ? (
              <div className="rounded-xl border border-primary/30 bg-primary/10 p-4">
                <p className="text-sm font-semibold text-[color:var(--brand-primary-strong)]">Diagnóstico</p>
                <p className="mt-2 whitespace-pre-wrap text-sm font-semibold text-foreground">
                  {consultaData.diagnostico}
                </p>
              </div>
            ) : null}

            {consultaData?.estudiosIndicados && consultaData.estudiosIndicados.length > 0 ? (
              <div className="rounded-xl border bg-card p-4">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
                  <p className="text-sm font-semibold text-foreground">Estudios indicados</p>
                </div>
                <div className="mt-3 space-y-3">
                  {consultaData.estudiosIndicados.map((estudio: any, idx: number) => (
                    <div key={idx} className="rounded-xl border bg-accent p-3">
                      <p className="font-semibold text-foreground text-sm">{texto(estudio.tipo) || 'Estudio'}</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {texto(estudio.indicaciones) || 'Sin indicaciones.'}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {texto(consultaData?.recomendaciones) ? (
              <div className="rounded-xl border bg-card p-4">
                <p className="text-sm font-semibold text-foreground">Recomendaciones</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{consultaData.recomendaciones}</p>
              </div>
            ) : null}

            {texto(consultaData?.proximaConsulta) ? (
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

            {!consultaData &&
             !motivoConsulta &&
             !obsHpi &&
             !padecimientoActual &&
             !tratamiento &&
             !planRaw &&
             !tieneMeds ? (
              <p className="text-sm text-muted-foreground italic pt-2">No hay nota médica registrada para esta cita.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

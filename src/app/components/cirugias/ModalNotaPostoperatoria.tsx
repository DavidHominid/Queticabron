import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import { Badge } from '../../components/ui/badge';
import { AlertCircle, Clock, Stethoscope, Activity, Shield, Package } from 'lucide-react';
import { Cirugia, Paciente } from '../../types';

interface ModalNotaPostoperatoriaProps {
  cirugia: Cirugia;
  paciente?: Paciente;
  onClose: () => void;
  onSubmit: (data: Partial<Cirugia>) => void;
}

type AldreteKey = 'aldreteActividad' | 'aldreteRespiracion' | 'aldreteCirculacion' | 'aldreteConciencia' | 'aldreteSaturacion';

const ALDRETE_CRITERIA: { key: AldreteKey; label: string; }[] = [
  { key: 'aldreteActividad',    label: 'Actividad motora' },
  { key: 'aldreteRespiracion',  label: 'Respiración' },
  { key: 'aldreteCirculacion',  label: 'Circulación / PA' },
  { key: 'aldreteConciencia',   label: 'Conciencia' },
  { key: 'aldreteSaturacion',   label: 'Saturación O₂' },
];

const ANESTESIA_OPTIONS = ['General', 'Local', 'Sedación consciente', 'Epidural', 'Raquídea', 'Regional'];

export function ModalNotaPostoperatoria({ cirugia, paciente, onClose, onSubmit }: ModalNotaPostoperatoriaProps) {
  const prev = cirugia.notaPostoperatoria;

  const [form, setForm] = useState({
    // Tiempos reales
    horaInicioReal:          prev?.horaInicioReal          || cirugia.horaEstimada || '',
    horaTerminoReal:         prev?.horaTerminoReal         || '',
    // Diagnósticos
    diagnosticoPreoperatorio: prev?.diagnosticoPreoperatorio || cirugia.diagnostico || '',
    diagnosticoPostoperatorio: prev?.diagnosticoPostoperatorio || '',
    // Responsables
    cirujanoPrincipal:       prev?.cirujanoPrincipal       || cirugia.medicoACargo || '',
    anestesiologo:           prev?.anestesiologo           || '',
    tipoAnestesia:           prev?.tipoAnestesia           || '',
    tecnicaQuirurgica:       prev?.tecnicaQuirurgica       || '',
    // Hallazgos y seguridad
    hallazgos:               prev?.hallazgos               || '',
    sangradoEstimado:        prev?.sangradoEstimado        || '',
    incidentes:              prev?.incidentes              || '',
    sinIncidentes:           prev?.sinIncidentes           ?? false,
    // Insumos
    insumosConsumidos:       prev?.insumosConsumidos       || '',
    // Aldrete
    aldreteActividad:        prev?.aldreteActividad        ?? 2,
    aldreteRespiracion:      prev?.aldreteRespiracion      ?? 2,
    aldreteCirculacion:      prev?.aldreteCirculacion      ?? 2,
    aldreteConciencia:       prev?.aldreteConciencia       ?? 2,
    aldreteSaturacion:       prev?.aldreteSaturacion       ?? 2,
  });

  const aldreteTotal =
    form.aldreteActividad + form.aldreteRespiracion +
    form.aldreteCirculacion + form.aldreteConciencia + form.aldreteSaturacion;

  const incidentesValido = form.sinIncidentes || form.incidentes.trim().length > 0;

  const isFormValid =
    form.horaInicioReal.trim() !== '' &&
    form.horaTerminoReal.trim() !== '' &&
    form.diagnosticoPostoperatorio.trim() !== '' &&
    form.tipoAnestesia.trim() !== '' &&
    form.anestesiologo.trim() !== '' &&
    incidentesValido;

  const set = (key: string, value: string | boolean | number) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;
    onSubmit({
      ...cirugia,
      estado: 'postoperatorio',
      notaPostoperatoria: { ...form },
    });
  };

  // Section header helper
  const Section = ({ icon, title, accent }: { icon: React.ReactNode; title: string; accent?: string }) => (
    <div className={`flex items-center gap-2 border-b pb-2 mb-4 ${accent || 'border-slate-200'}`}>
      <span className="text-slate-600">{icon}</span>
      <h3 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">{title}</h3>
    </div>
  );

  const aldreteColor = aldreteTotal >= 9 ? 'bg-green-100 text-green-800 border-green-200'
    : aldreteTotal >= 7 ? 'bg-amber-100 text-amber-800 border-amber-200'
    : 'bg-red-100 text-red-800 border-red-200';

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden flex flex-col bg-white rounded-2xl border-0 shadow-2xl [&>button]:hidden" style={{ maxHeight: '92vh' }}>
        {/* ── Header fijo ── */}
        <div className="shrink-0 bg-gradient-to-r from-slate-800 to-slate-700 text-white px-6 py-4 rounded-t-2xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-300" />
              Nota Quirúrgica — Salida a Recuperación
            </DialogTitle>
            <p className="text-slate-300 text-sm mt-1">
              {paciente?.nombre} {paciente?.apellido}
              {cirugia.lugarCirugia ? ` · ${cirugia.lugarCirugia}` : ''}
            </p>
          </DialogHeader>
        </div>

        {/* ── Cuerpo con scroll interno ── */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-8">

          {/* ── 1. TIEMPOS REALES ── */}
          <div>
            <Section icon={<Clock className="h-4 w-4" />} title="1 · Tiempos Reales de Quirófano" />
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="horaInicioReal" className="text-xs font-semibold text-slate-600">
                  Hora de Inicio Real *
                </Label>
                <Input
                  id="horaInicioReal"
                  type="time"
                  value={form.horaInicioReal}
                  onChange={(e) => set('horaInicioReal', e.target.value)}
                  required
                  className="text-slate-900"
                />
                <p className="text-xs text-slate-400">Agendada: {cirugia.horaEstimada || '—'}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="horaTerminoReal" className="text-xs font-semibold text-slate-600">
                  Hora de Término Real *
                </Label>
                <Input
                  id="horaTerminoReal"
                  type="time"
                  value={form.horaTerminoReal}
                  onChange={(e) => set('horaTerminoReal', e.target.value)}
                  required
                  className="text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Duración Real</Label>
                <div className="flex items-center h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-slate-700 text-sm font-medium">
                  {form.horaInicioReal && form.horaTerminoReal
                    ? (() => {
                        const [sh, sm] = form.horaInicioReal.split(':').map(Number);
                        const [eh, em] = form.horaTerminoReal.split(':').map(Number);
                        const diff = (eh * 60 + em) - (sh * 60 + sm);
                        if (diff <= 0) return '—';
                        return `${Math.floor(diff / 60)}h ${diff % 60}min`;
                      })()
                    : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* ── 2. DIAGNÓSTICOS ── */}
          <div>
            <Section icon={<Stethoscope className="h-4 w-4" />} title="2 · Contraste de Diagnósticos" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="diagnosticoPreoperatorio" className="text-xs font-semibold text-slate-600">
                  Diagnóstico Preoperatorio
                  {!cirugia.diagnostico && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {cirugia.diagnostico ? (
                  <>
                    <div className="flex items-center min-h-10 px-3 py-2 rounded-md border border-slate-200 bg-slate-50 text-slate-600 text-sm">
                      {form.diagnosticoPreoperatorio}
                    </div>
                    <p className="text-xs text-slate-400">Campo fijo — traído de la fase 1</p>
                  </>
                ) : (
                  <>
                    <Input
                      id="diagnosticoPreoperatorio"
                      value={form.diagnosticoPreoperatorio}
                      onChange={(e) => set('diagnosticoPreoperatorio', e.target.value)}
                      placeholder="Escribe el diagnóstico previo a la cirugía..."
                      className="text-slate-900"
                    />
                    <p className="text-xs text-amber-600">⚠ No se encontró diagnóstico previo — ingrésalo manualmente</p>
                  </>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="diagnosticoPostoperatorio" className="text-xs font-semibold text-slate-600">
                  Diagnóstico Postoperatorio <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="diagnosticoPostoperatorio"
                  value={form.diagnosticoPostoperatorio}
                  onChange={(e) => set('diagnosticoPostoperatorio', e.target.value)}
                  placeholder="Diagnóstico definitivo tras la intervención"
                  required
                  className="text-slate-900"
                />
                <p className="text-xs text-slate-400">Si es idéntico al previo, confírmelo escribiéndolo nuevamente</p>
              </div>
            </div>
          </div>

          {/* ── 3. RESPONSABLES ── */}
          <div>
            <Section icon={<Shield className="h-4 w-4" />} title="3 · Equipo Médico Responsable" />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="cirujanoPrincipal" className="text-xs font-semibold text-slate-600">
                  Cirujano Principal *
                </Label>
                <Input
                  id="cirujanoPrincipal"
                  value={form.cirujanoPrincipal}
                  onChange={(e) => set('cirujanoPrincipal', e.target.value)}
                  placeholder="Nombre del cirujano responsable"
                  required
                  className="text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="anestesiologo" className="text-xs font-semibold text-slate-600">
                  Anestesiólogo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="anestesiologo"
                  value={form.anestesiologo}
                  onChange={(e) => set('anestesiologo', e.target.value)}
                  placeholder="Nombre del anestesiólogo"
                  required
                  className="text-slate-900"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">
                  Tipo de Anestesia <span className="text-red-500">*</span>
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ANESTESIA_OPTIONS.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => set('tipoAnestesia', opt)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        form.tipoAnestesia === opt
                          ? 'bg-teal-600 text-white border-teal-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-teal-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tecnicaQuirurgica" className="text-xs font-semibold text-slate-600">
                  Técnica Quirúrgica
                </Label>
                <Input
                  id="tecnicaQuirurgica"
                  value={form.tecnicaQuirurgica}
                  onChange={(e) => set('tecnicaQuirurgica', e.target.value)}
                  placeholder="Ej. Laparoscopia, Abierta, Artroscopia..."
                  className="text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* ── 4. SEGURIDAD ── */}
          <div>
            <Section icon={<AlertCircle className="h-4 w-4" />} title="4 · Registro de Seguridad" />
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-1.5">
                <Label htmlFor="hallazgos" className="text-xs font-semibold text-slate-600">
                  Hallazgos Intraoperatorios
                </Label>
                <Textarea
                  id="hallazgos"
                  value={form.hallazgos}
                  onChange={(e) => set('hallazgos', e.target.value)}
                  placeholder="Describa los hallazgos relevantes encontrados durante el procedimiento..."
                  className="min-h-[80px] text-slate-900 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="insumosConsumidos" className="text-xs font-semibold text-slate-600">
                  Insumos Consumidos
                </Label>
                <Textarea
                  id="insumosConsumidos"
                  value={form.insumosConsumidos}
                  onChange={(e) => set('insumosConsumidos', e.target.value)}
                  placeholder="Ej. 2 suturas Vicryl, malla de polipropileno, guantes, compresas..."
                  className="min-h-[80px] text-slate-900 resize-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 items-start">
              <div className="space-y-1.5">
                <Label htmlFor="sangradoEstimado" className="text-xs font-semibold text-slate-600">
                  Sangrado Estimado (ml)
                </Label>
                <Input
                  id="sangradoEstimado"
                  type="number"
                  min={0}
                  value={form.sangradoEstimado}
                  onChange={(e) => set('sangradoEstimado', e.target.value)}
                  placeholder="Ej. 50, 200, 800"
                  className="text-slate-900"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="incidentes" className="text-xs font-semibold text-slate-600">
                    Complicaciones / Incidentes <span className="text-red-500">*</span>
                  </Label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                    <Checkbox
                      id="sinIncidentes"
                      checked={form.sinIncidentes}
                      onCheckedChange={(v) => {
                        set('sinIncidentes', Boolean(v));
                        if (v) set('incidentes', '');
                      }}
                    />
                    <span className="font-medium">Sin incidentes</span>
                  </label>
                </div>
                <Textarea
                  id="incidentes"
                  value={form.incidentes}
                  onChange={(e) => set('incidentes', e.target.value)}
                  disabled={form.sinIncidentes}
                  placeholder={form.sinIncidentes ? 'Marcado como sin incidentes' : 'Describa cualquier evento adverso, complicación o situación inesperada...'}
                  className={`min-h-[80px] text-slate-900 resize-none ${form.sinIncidentes ? 'opacity-50' : ''}`}
                />
                {!incidentesValido && (
                  <p className="flex items-center gap-1 text-xs text-red-600">
                    <AlertCircle className="h-3 w-3" />
                    Marque "Sin incidentes" o describa las complicaciones
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── 5. ESCALA DE ALDRETE ── */}
          <div>
            <Section icon={<Activity className="h-4 w-4" />} title="5 · Escala de Aldrete — Alta de Quirófano" />
            <p className="text-xs text-slate-500 mb-4">
              Puntaje ≥ 9 indica que el paciente es apto para ser trasladado a recuperación. Cada criterio se califica de 0 a 2.
            </p>
            <div className="space-y-3">
              {ALDRETE_CRITERIA.map(({ key, label }) => (
                <div key={key} className="flex items-center gap-4">
                  <span className="text-sm text-slate-700 w-40 shrink-0">{label}</span>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => set(key, v)}
                        className={`w-10 h-9 rounded-lg text-sm font-bold border transition-colors ${
                          form[key] === v
                            ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-teal-300'
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className={`mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-semibold ${aldreteColor}`}>
              <Activity className="h-4 w-4" />
              Total Aldrete: {aldreteTotal} / 10
              {aldreteTotal >= 9 ? ' — Apto para recuperación ✓' : aldreteTotal >= 7 ? ' — Requiere evaluación adicional' : ' — No apto para traslado'}
            </div>
          </div>

          {/* Bloque de validación global */}
          {!isFormValid && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <span>
                Para pasar el paciente a Recuperación debes completar los campos marcados con{' '}
                <span className="text-red-600 font-bold">*</span>: horas reales, diagnóstico postoperatorio,
                anestesiólogo, tipo de anestesia e incidentes.
              </span>
            </div>
          )}

          <DialogFooter className="pt-2 flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-700">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold disabled:opacity-40"
            >
              <Shield className="mr-2 h-4 w-4" />
              Guardar Nota y Pasar a Recuperación
            </Button>
          </DialogFooter>
        </form>
        </div>{/* fin scroll body */}
      </DialogContent>
    </Dialog>
  );
}

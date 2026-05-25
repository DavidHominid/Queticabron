import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, AlertTriangle } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { useLanguage } from '../context/LanguageContext';

const START_HOUR = 0; // 00:00
const END_HOUR = 23; // 23:00
const MINUTE_STEP = 30; // Granularidad de 30 mins para las filas

export function AgendaQuirofanos() {
  const { t, language } = useLanguage();
  const { cirugias, pacientes, sedesQuirurgicas } = useData();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const dateStr = format(currentDate, 'yyyy-MM-dd');

  // For non-today dates we need periodos loaded: fetch them lazily
  const [sedesConPeriodosParaFecha, setSedesConPeriodosParaFecha] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (dateStr === todayStr) {
      // For today, the server already sends disponibleHoy
      setSedesConPeriodosParaFecha({});
      return;
    }
    // Fetch periodos for all active sedes to evaluate availability on dateStr
    let cancelled = false;
    Promise.all(
      sedesQuirurgicas
        .filter(s => s.activa && !s.periodos)
        .map(async (s) => {
          try {
            const res = await fetch(`/api/sedes/${s.id}/periodos`);
            if (!res.ok) return { id: s.id, disponible: false };
            const periodos: Array<{ fechaInicio: string; fechaFin: string }> = await res.json();
            const disponible = periodos.some(p => p.fechaInicio <= dateStr && p.fechaFin >= dateStr);
            return { id: s.id, disponible };
          } catch { return { id: s.id, disponible: false }; }
        })
    ).then(results => {
      if (cancelled) return;
      const map: Record<string, boolean> = {};
      results.forEach(r => { map[r.id] = r.disponible; });
      // Also check already-loaded periodos
      sedesQuirurgicas.filter(s => s.activa && s.periodos).forEach(s => {
        map[s.id] = (s.periodos || []).some(
          (p: any) => p.fechaInicio <= dateStr && p.fechaFin >= dateStr
        );
      });
      setSedesConPeriodosParaFecha(map);
    });
    return () => { cancelled = true; };
  }, [dateStr, todayStr, sedesQuirurgicas]);

  // Sedes disponibles para la fecha seleccionada
  const columnasSedes = useMemo(() => {
    const sedesDisponibles = sedesQuirurgicas.filter(s => {
      if (!s.activa) return false;
      if (dateStr === todayStr) {
        // Use server-computed flag for today
        return s.disponibleHoy;
      }
      // For other dates: check loaded periodos or the lazy-fetched map
      const fromPeriodos = (s.periodos || []).some(
        (p: any) => p.fechaInicio <= dateStr && p.fechaFin >= dateStr
      );
      return fromPeriodos || !!sedesConPeriodosParaFecha[s.id];
    });

    // Also include sedes referenced in surgeries that may not be in the catalog (historical)
    const sedesDeCirugiasSueltas = cirugias
      .filter(c => c.fechaCirugia === dateStr && ['programada', 'en_procedimiento'].includes(c.estado))
      .map(c => c.lugarCirugia)
      .filter((nombre): nombre is string => !!nombre && !sedesDisponibles.find(s => s.nombre === nombre));

    const nombresDisponibles = sedesDisponibles.map(s => s.nombre);
    return Array.from(new Set([...nombresDisponibles, ...sedesDeCirugiasSueltas]));
  }, [sedesQuirurgicas, cirugias, dateStr, todayStr, sedesConPeriodosParaFecha]);

  // Filtrar cirugías del día actual que estén programadas o en procedimiento
  const cirugiasDelDia = useMemo(() => {
    return cirugias.filter(c => 
      c.fechaCirugia === dateStr && 
      ['programada', 'en_procedimiento'].includes(c.estado) &&
      columnasSedes.includes(c.lugarCirugia || '')
    );
  }, [cirugias, dateStr, columnasSedes]);

  // Generar las franjas horarias
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      slots.push(`${h.toString().padStart(2, '0')}:00`);
      if (h !== END_HOUR) {
        slots.push(`${h.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, []);

  const getCirugiaColor = (estado: string) => {
    switch (estado) {
      case 'programada': return 'bg-indigo-100 border-indigo-300 text-indigo-900';
      case 'en_procedimiento': return 'bg-orange-100 border-orange-300 text-orange-900';
      default: return 'bg-slate-100 border-slate-300 text-slate-900';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 h-[calc(100vh-100px)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between shrink-0 bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('quirofanos.title')}</h1>
            <p className="text-sm text-slate-500 mt-1">
              {t('quirofanos.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 hover:bg-white rounded-md">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={handleToday} className="h-8 hover:bg-white rounded-md text-sm font-medium px-4">
                {t('quirofanos.today')}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 hover:bg-white rounded-md">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-700 capitalize">
                {format(currentDate, language === 'es' ? "EEEE, d 'de' MMMM yyyy" : "EEEE, MMMM d, yyyy", { 
                  locale: language === 'es' ? es : enUS 
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Tablero Kanban / Grilla de Calendario */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-x-auto flex flex-col relative">
          
          {/* Cabecera de Columnas (Quirófanos) */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20 min-w-max">
            <div className="w-24 shrink-0 border-r border-slate-200 flex items-center justify-center font-medium text-xs text-slate-500 bg-slate-100/50 sticky left-0 z-30">
              {t('quirofanos.hour')}
            </div>
            {columnasSedes.map((quirofano, idx) => (
              <div key={idx} className="flex-1 py-3 px-4 border-r border-slate-200 last:border-r-0 text-center font-bold text-slate-700 bg-white shadow-sm min-w-[200px]">
                {quirofano}
              </div>
            ))}
          </div>

          {/* Grilla de Horarios */}
          <div className="flex-1 overflow-y-auto relative bg-slate-50/30">
            <div className="flex relative min-w-max">
              {/* Columna de Horas */}
              <div className="w-24 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-10">
                {timeSlots.map((time, idx) => (
                  <div key={idx} className="h-16 border-b border-slate-100 flex items-start justify-center py-2">
                    <span className="text-xs font-medium text-slate-400">
                      {time}
                    </span>
                  </div>
                ))}
              </div>

              {/* Columnas de Quirófanos (Celdas) */}
              <div className="flex flex-1 relative">
                {/* Rejilla de fondo */}
                <div className="absolute inset-0 flex">
                  {columnasSedes.map((_, idx) => (
                    <div key={idx} className="flex-1 border-r border-slate-200 last:border-r-0 min-w-[200px]">
                      {timeSlots.map((_, i) => (
                        <div key={i} className="h-16 border-b border-slate-100/50" />
                      ))}
                    </div>
                  ))}
                </div>

                {/* Eventos (Cirugías) renderizados por posición absoluta */}
                {columnasSedes.map((quirofano, qIdx) => {
                  const cirugiasQ = cirugiasDelDia.filter(c => c.lugarCirugia === quirofano);
                  
                  return (
                    <div key={qIdx} className="flex-1 relative min-w-[200px]">
                      {cirugiasQ.map((cirugia) => {
                        const [h, m] = (cirugia.horaEstimada || '00:00').split(':').map(Number);
                        
                        // Calcular top en base a las horas (cada bloque de 30 mins es h-16 o 64px)
                        // 1 hora = 128px
                        const diffHours = h - START_HOUR;
                        const topPixels = (diffHours * 128) + (m / 60) * 128;
                        
                        // Calcular alto en base a la duración
                        const durationMins = cirugia.duracionEstimada || 60;
                        const heightPixels = (durationMins / 60) * 128;
                        
                        const paciente = pacientes.find(p => p.id === cirugia.pacienteId);
                        const isPendienteSede = cirugia.requiereRentaExterna && cirugia.estatusRentaSede === 'pendiente_confirmar';

                        return (
                          <div 
                            key={cirugia.id}
                            className={`absolute left-1 right-2 rounded-lg border shadow-sm p-2 overflow-hidden transition-all hover:shadow-md z-10 ${getCirugiaColor(cirugia.estado)} ${isPendienteSede ? 'border-orange-500 border-2' : ''}`}
                            style={{ 
                              top: `${topPixels}px`, 
                              height: `${heightPixels}px`,
                              minHeight: '40px' 
                            }}
                          >
                            <div className="flex flex-col h-full relative">
                              <div className="font-semibold text-xs leading-tight line-clamp-2 mb-0.5 pr-5">
                                {cirugia.diagnostico}
                              </div>
                              {isPendienteSede && (
                                <div className="absolute top-0 right-0 text-orange-500" title={t('quirofanos.unconfirmed_warning')}>
                                  <AlertTriangle className="w-3 h-3" />
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs opacity-80 mb-0.5">
                                <User className="w-3 h-3 shrink-0" />
                                <span className="truncate">{paciente?.nombre} {paciente?.apellido}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-medium opacity-70 mt-auto">
                                <Clock className="w-3 h-3 shrink-0" />
                                <span>{cirugia.horaEstimada} ({durationMins} min)</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

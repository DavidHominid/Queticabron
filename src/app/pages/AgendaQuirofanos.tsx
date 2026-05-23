import React, { useState, useMemo } from 'react';
import { DashboardLayout } from '../components/DashboardLayout';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, User, AlertTriangle } from 'lucide-react';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';

const QUIROFANOS_BASE = ['Quirófano 1', 'Quirófano 2', 'Quirófano Ambulatorio'];
const START_HOUR = 7; // 07:00
const END_HOUR = 19; // 19:00
const MINUTE_STEP = 30; // Granularidad de 30 mins para las filas

export function AgendaQuirofanos() {
  const { cirugias, pacientes } = useData();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const handlePrevDay = () => setCurrentDate(prev => subDays(prev, 1));
  const handleNextDay = () => setCurrentDate(prev => addDays(prev, 1));
  const handleToday = () => setCurrentDate(new Date());

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  // Obtener sedes dinámicas del día
  const columnasSedes = useMemo(() => {
    const sedesDia = cirugias
      .filter(c => c.fechaCirugia === dateStr && ['programada', 'en_procedimiento'].includes(c.estado))
      .map(c => c.lugarCirugia)
      .filter((sede): sede is string => !!sede && sede.trim() !== '');
      
    // Combinar bases con las del día (asegurar que las base siempre estén al principio)
    return Array.from(new Set([...QUIROFANOS_BASE, ...sedesDia]));
  }, [cirugias, dateStr]);

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
            <h1 className="text-2xl font-bold text-slate-800">Agenda de Quirófanos</h1>
            <p className="text-sm text-slate-500 mt-1">
              Visualización y asignación de espacios quirúrgicos.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
              <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-8 w-8 hover:bg-white rounded-md">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" onClick={handleToday} className="h-8 hover:bg-white rounded-md text-sm font-medium px-4">
                Hoy
              </Button>
              <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-8 w-8 hover:bg-white rounded-md">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200">
              <CalendarIcon className="w-5 h-5 text-indigo-600" />
              <span className="font-semibold text-slate-700 capitalize">
                {format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: es })}
              </span>
            </div>
          </div>
        </div>

        {/* Tablero Kanban / Grilla de Calendario */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col relative">
          
          {/* Cabecera de Columnas (Quirófanos) */}
          <div className="flex border-b border-slate-200 bg-slate-50 sticky top-0 z-20">
            <div className="w-24 shrink-0 border-r border-slate-200 flex items-center justify-center font-medium text-xs text-slate-500 bg-slate-100/50">
              Hora
            </div>
            {columnasSedes.map((quirofano, idx) => (
              <div key={idx} className="flex-1 py-3 px-4 border-r border-slate-200 last:border-r-0 text-center font-bold text-slate-700 bg-white shadow-sm min-w-[200px]">
                {quirofano}
              </div>
            ))}
          </div>

          {/* Grilla de Horarios */}
          <div className="flex-1 overflow-y-auto relative bg-slate-50/30">
            <div className="flex relative">
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
                    <div key={qIdx} className="flex-1 relative">
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
                            className={`absolute left-1 right-2 rounded-lg border shadow-sm p-3 overflow-hidden transition-all hover:shadow-md z-10 ${getCirugiaColor(cirugia.estado)} ${isPendienteSede ? 'border-orange-500 border-2' : ''}`}
                            style={{ 
                              top: `${topPixels}px`, 
                              height: `${heightPixels}px`,
                              minHeight: '40px' 
                            }}
                          >
                            <div className="flex flex-col h-full relative">
                              <div className="font-bold text-sm leading-tight line-clamp-1 mb-1 pr-6">
                                {cirugia.diagnostico}
                              </div>
                              {isPendienteSede && (
                                <div className="absolute top-0 right-0 text-orange-500" title="Alerta: Sede sin confirmar">
                                  <AlertTriangle className="w-4 h-4" />
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs opacity-90 mb-1">
                                <User className="w-3 h-3" />
                                <span className="truncate">{paciente?.nombre} {paciente?.apellido}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs font-medium opacity-80 mt-auto">
                                <Clock className="w-3 h-3" />
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

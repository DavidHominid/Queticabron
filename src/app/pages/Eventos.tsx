import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { CalendarDays, MapPin, Pencil, Plus } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useData } from '../context/DataContext';
import { Especialidad, Evento } from '../types';

const especialidadLabel = (e: Especialidad) =>
  ({
    medicina_familiar: 'Medicina Familiar',
    pediatria: 'Pediatría',
    fisioterapia: 'Fisioterapia',
    vacunas: 'Vacunas',
    deteccion_cancer: 'Detección Oportuna de Cáncer',
    dentista: 'Dentista',
  })[e];

const formatDate = (value?: string | null) => {
  if (!value) return 'Sin fecha';
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
};

export function Eventos() {
  const navigate = useNavigate();
  const { eventos, isInitialized } = useData();

  const sortedEventos = useMemo(
    () =>
      [...eventos].sort((a, b) => {
        const dateA = a.fechaInicio || '';
        const dateB = b.fechaInicio || '';
        return dateB.localeCompare(dateA);
      }),
    [eventos],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Agenda de eventos</h1>
            <p className="text-gray-600 mt-1">Visualiza los eventos como tarjetas y entra a su detalle para consultar información, especialidades y agenda.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/eventos/nuevo')}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo evento
            </Button>
          </div>
        </div>

        {!isInitialized && (
          <Card className="shadow-sm">
            <CardContent className="p-8">
              <div className="animate-pulse h-6 w-40 bg-gray-200 rounded" />
              <div className="mt-4 animate-pulse h-24 bg-gray-100 rounded" />
            </CardContent>
          </Card>
        )}

        {isInitialized && eventos.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay eventos registrados</h3>
              <p className="text-gray-600 mb-6">Crea un evento para habilitar horarios y cupos.</p>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/eventos/nuevo')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear evento
              </Button>
            </CardContent>
          </Card>
        )}

        {isInitialized && eventos.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedEventos.map((evento: Evento) => {
              const especialidades = (evento.especialidades || []).map((esp) => especialidadLabel(esp.especialidad as Especialidad));
              const totalHorarios = (evento.especialidades || []).reduce((acc, esp) => acc + (esp.horarios?.length || 0), 0);

              return (
                <button
                  key={evento.id}
                  type="button"
                  onClick={() => navigate(`/eventos/${evento.id}`)}
                  className="text-left"
                >
                  <Card className="h-full overflow-hidden border-gray-200 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md">
                    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{evento.nombre}</CardTitle>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-4 w-4" />
                            <span>{evento.ciudad}</span>
                          </div>
                        </div>
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {evento.estado}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 p-6">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">Inscripciones</div>
                          <div className="font-medium text-gray-900">
                            {formatDate(evento.fechaInicioInscripcion)} - {formatDate(evento.fechaFinInscripcion || evento.fechaLimiteInscripcion)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Evento</div>
                          <div className="font-medium text-gray-900">
                            {formatDate(evento.fechaInicio)} - {formatDate(evento.fechaFin)}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {especialidades.length > 0 ? (
                          especialidades.map((item) => (
                            <span key={item} className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                              {item}
                            </span>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">Sin especialidades registradas</span>
                        )}
                      </div>

                      <div className="flex items-center justify-between border-t pt-4 text-sm text-gray-600">
                        <span>{evento.especialidades.length} especialidades</span>
                        <span>{totalHorarios} horarios</span>
                      </div>

                      <div className="flex gap-2 pt-1">
                        <Button
                          type="button"
                          className="flex-1 bg-blue-600 hover:bg-blue-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/eventos/${evento.id}`);
                          }}
                        >
                          Ver evento
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/eventos/${evento.id}/editar`);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

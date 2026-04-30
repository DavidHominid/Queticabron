import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { CalendarDays, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Button } from '../components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Especialidad, Evento } from '../types';
import { labelCiudad } from '../utils/ciudades';
import { labelEspecialidad } from '../utils/especialidades';

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

const isEventoFinalizado = (fechaFin?: string | null) => {
  if (!fechaFin) return false;
  const end = new Date(`${fechaFin}T23:59:59`);
  if (Number.isNaN(end.getTime())) return false;
  return Date.now() > end.getTime();
};

const normCiudad = (value: unknown) => {
  const v = typeof value === 'string' ? value : value && typeof value === 'object' ? (value as any).codigo || (value as any).ciudad || '' : String(value ?? '');
  return String(v ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_');
};

export function Eventos() {
  const navigate = useNavigate();
  const { eventos, especialidadesCatalogo, ciudadesCatalogo, deleteEvento, addRegistroAuditoria, isInitialized } = useData();
  const { user } = useAuth();
  const modoPruebas = String((import.meta as any).env?.VITE_EVENTOS_MODO_PRUEBAS || '')
    .trim()
    .toLowerCase() === 'true';

  const ciudadesUsuario = useMemo(() => {
    const ciudadesExtra = Array.isArray((user as any)?.ciudades) ? ((user as any).ciudades as unknown[]) : [];
    const base = ciudadesExtra.length ? ciudadesExtra : user?.ciudad ? [user.ciudad] : [];
    const normalized = base.map(normCiudad).filter(Boolean);
    return Array.from(new Set(normalized));
  }, [user?.ciudad, (user as any)?.ciudades]);

  const sortedEventos = useMemo(
    () =>
      [...eventos]
        .filter((e) => {
          if (user?.rol === 'administrador') return true;
          if (ciudadesUsuario.length === 0) return false;
          return ciudadesUsuario.includes(normCiudad(e.ciudad));
        })
        .sort((a, b) => {
        const dateA = a.fechaInicio || '';
        const dateB = b.fechaInicio || '';
        return dateB.localeCompare(dateA);
        }),
    [ciudadesUsuario, eventos, user?.rol],
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

        {isInitialized && user?.rol !== 'administrador' && ciudadesUsuario.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-4 text-sm text-amber-800 border border-amber-200 bg-amber-50 rounded-2xl">
              Tu usuario no tiene ciudad asignada. Asigna una ciudad (o ciudades) al usuario para poder ver eventos.
            </CardContent>
          </Card>
        )}

        {isInitialized && sortedEventos.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <CalendarDays className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {user?.rol === 'administrador' ? 'No hay eventos registrados' : 'No hay eventos para tu ciudad'}
              </h3>
              <p className="text-gray-600 mb-6">
                {user?.rol === 'administrador'
                  ? 'Crea un evento para habilitar horarios y cupos.'
                  : `Ciudad asignada: ${(Array.isArray((user as any)?.ciudades) && (user as any).ciudades.length ? (user as any).ciudades : user?.ciudad) || '---'}`}
              </p>
              <Button type="button" className="bg-blue-600 hover:bg-blue-700" onClick={() => navigate('/eventos/nuevo')}>
                <Plus className="h-4 w-4 mr-2" />
                Crear evento
              </Button>
            </CardContent>
          </Card>
        )}

        {isInitialized && sortedEventos.length > 0 && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {sortedEventos.map((evento: Evento) => {
              const especialidades = (evento.especialidades || []).map((esp) =>
                labelEspecialidad(esp.especialidad as Especialidad, especialidadesCatalogo),
              );
              const totalHorarios = (evento.especialidades || []).reduce((acc, esp) => acc + (esp.horarios?.length || 0), 0);
              const bloqueado = isEventoFinalizado(evento.fechaFin);

              return (
                <Card
                  key={evento.id}
                  onClick={() => navigate(`/eventos/${evento.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      navigate(`/eventos/${evento.id}`);
                    }
                  }}
                  className="h-full cursor-pointer overflow-hidden border-gray-200 text-left shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                >
                  <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{evento.nombre}</CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <MapPin className="h-4 w-4" />
                          <span>{labelCiudad(evento.ciudad, ciudadesCatalogo)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                          {evento.estado}
                        </span>
                        {bloqueado && (
                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            Solo lectura
                          </span>
                        )}
                      </div>
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
                        {!bloqueado && (
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
                        )}
                        {user?.rol === 'administrador' && !bloqueado && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar evento</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Se eliminará el evento "{evento.nombre}" y también especialidades, horarios, practicantes, citas, triage y notas médicas relacionadas.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await deleteEvento(evento.id);
                                      addRegistroAuditoria({
                                        id: `aud${Date.now()}`,
                                        usuarioId: user?.id || '',
                                        nombreUsuario: user?.nombre || '',
                                        rol: user?.rol || 'administrador',
                                        accion: 'Eliminar Evento',
                                        detalles: `Eliminó evento: ${evento.nombre} (${evento.id})`,
                                        fechaHora: new Date().toISOString(),
                                        ciudad: (user?.ciudad || 'sonoyta') as any,
                                      });
                                    } catch (err: any) {
                                      alert(err?.message || 'No se pudo eliminar el evento.');
                                    }
                                  }}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        {user?.rol === 'administrador' && bloqueado && modoPruebas && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                className="border-red-300 text-red-700 hover:bg-red-50"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Eliminar (pruebas)
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Eliminar evento (modo pruebas)</AlertDialogTitle>
                                <AlertDialogDescription>
                                  El evento ya finalizó y normalmente es de solo lectura. En modo pruebas se permite eliminarlo de forma forzada.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-red-600 hover:bg-red-700"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      await deleteEvento(evento.id, { force: true });
                                      addRegistroAuditoria({
                                        id: `aud${Date.now()}`,
                                        usuarioId: user?.id || '',
                                        nombreUsuario: user?.nombre || '',
                                        rol: user?.rol || 'administrador',
                                        accion: 'Eliminar Evento (Pruebas)',
                                        detalles: `Eliminó evento (pruebas): ${evento.nombre} (${evento.id})`,
                                        fechaHora: new Date().toISOString(),
                                        ciudad: (user?.ciudad || 'sonoyta') as any,
                                      });
                                    } catch (err: any) {
                                      alert(err?.message || 'No se pudo eliminar el evento.');
                                    }
                                  }}
                                >
                                  Eliminar
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

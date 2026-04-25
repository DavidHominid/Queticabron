import { useMemo, useState } from 'react';
import { Check, Pencil, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { useData } from '../context/DataContext';

export function Variables() {
  const {
    especialidadesCatalogo,
    addEspecialidadCatalogo,
    deleteEspecialidadCatalogo,
    updateEspecialidadCatalogo,
    ciudadesCatalogo,
    addCiudadCatalogo,
    deleteCiudadCatalogo,
    updateCiudadCatalogo,
  } = useData();

  const [codigoEspecialidad, setCodigoEspecialidad] = useState('');
  const [nombreEspecialidad, setNombreEspecialidad] = useState('');
  const [loadingEspecialidad, setLoadingEspecialidad] = useState(false);

  const [codigoCiudad, setCodigoCiudad] = useState('');
  const [nombreCiudad, setNombreCiudad] = useState('');
  const [loadingCiudad, setLoadingCiudad] = useState(false);
  const [editando, setEditando] = useState<{ tipo: 'especialidad' | 'ciudad'; codigo: string; nombre: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const especialidadesOrdenadas = useMemo(() => {
    return [...(especialidadesCatalogo || [])].sort((a, b) => {
      if (a.activa !== b.activa) return a.activa ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [especialidadesCatalogo]);

  const ciudadesOrdenadas = useMemo(() => {
    return [...(ciudadesCatalogo || [])].sort((a, b) => {
      if (a.activa !== b.activa) return a.activa ? -1 : 1;
      return a.nombre.localeCompare(b.nombre);
    });
  }, [ciudadesCatalogo]);

  const onCrearEspecialidad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingEspecialidad(true);
    try {
      await addEspecialidadCatalogo({ codigo: codigoEspecialidad, nombre: nombreEspecialidad });
      setCodigoEspecialidad('');
      setNombreEspecialidad('');
    } finally {
      setLoadingEspecialidad(false);
    }
  };

  const onCrearCiudad = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingCiudad(true);
    try {
      await addCiudadCatalogo({ codigo: codigoCiudad, nombre: nombreCiudad });
      setCodigoCiudad('');
      setNombreCiudad('');
    } finally {
      setLoadingCiudad(false);
    }
  };

  const TablaCatalogo = ({
    rows,
    tipo,
    onEditarNombre,
    onDesactivar,
    onReactivar,
  }: {
    rows: { codigo: string; nombre: string; activa: boolean }[];
    tipo: 'especialidad' | 'ciudad';
    onEditarNombre: (codigo: string, nombre: string) => Promise<void>;
    onDesactivar: (codigo: string, nombre: string) => Promise<void>;
    onReactivar: (codigo: string) => Promise<void>;
  }) => {
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Nombre</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Código</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Estado</th>
              <th className="text-left p-4 text-sm font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.codigo} className="border-b hover:bg-gray-50">
                <td className="p-4 text-sm text-gray-900">
                  {editando?.tipo === tipo && editando?.codigo === r.codigo ? (
                    <Input
                      value={editando.nombre}
                      onChange={(e) => setEditando({ ...editando, nombre: e.target.value })}
                      className="max-w-sm"
                    />
                  ) : (
                    r.nombre
                  )}
                </td>
                <td className="p-4 text-sm font-mono text-gray-700">{r.codigo}</td>
                <td className="p-4">
                  {r.activa ? (
                    <Badge className="bg-green-100 text-green-700">Activa</Badge>
                  ) : (
                    <Badge className="bg-gray-100 text-gray-700">Inactiva</Badge>
                  )}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!r.activa || savingEdit}
                      onClick={async () => {
                        if (editando?.tipo === tipo && editando?.codigo === r.codigo) return;
                        setEditando({ tipo, codigo: r.codigo, nombre: r.nombre });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {editando?.tipo === tipo && editando?.codigo === r.codigo && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          disabled={savingEdit}
                          onClick={async () => {
                            const nombre = String(editando?.nombre || '').trim();
                            if (!nombre) return;
                            setSavingEdit(true);
                            try {
                              await onEditarNombre(r.codigo, nombre);
                              setEditando(null);
                            } finally {
                              setSavingEdit(false);
                            }
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={savingEdit}
                          onClick={() => setEditando(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {r.activa ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        disabled={savingEdit}
                        onClick={async () => {
                          if (!confirm(`¿Desactivar "${r.nombre}"?`)) return;
                          await onDesactivar(r.codigo, r.nombre);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={savingEdit}
                        onClick={async () => {
                          await onReactivar(r.codigo);
                        }}
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {rows.length === 0 && <div className="p-12 text-center text-gray-600">No hay registros.</div>}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Variables</h1>
          <p className="mt-1 text-gray-600">Administra catálogos como especialidades y ciudades.</p>
        </div>

        <Tabs defaultValue="especialidades">
          <TabsList>
            <TabsTrigger value="especialidades">Especialidades</TabsTrigger>
            <TabsTrigger value="ciudades">Ciudades</TabsTrigger>
          </TabsList>

          <TabsContent value="especialidades" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Agregar especialidad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearEspecialidad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoEspecialidad">Código *</Label>
                    <Input
                      id="codigoEspecialidad"
                      value={codigoEspecialidad}
                      onChange={(e) => setCodigoEspecialidad(e.target.value)}
                      placeholder="ej: medicina_familiar"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreEspecialidad">Nombre *</Label>
                    <Input
                      id="nombreEspecialidad"
                      value={nombreEspecialidad}
                      onChange={(e) => setNombreEspecialidad(e.target.value)}
                      placeholder="ej: Medicina Familiar"
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loadingEspecialidad}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Listado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TablaCatalogo
                  rows={especialidadesOrdenadas}
                  tipo="especialidad"
                  onEditarNombre={async (codigo, nombre) => {
                    await updateEspecialidadCatalogo(codigo, { nombre });
                  }}
                  onDesactivar={async (codigo) => {
                    await deleteEspecialidadCatalogo(codigo);
                  }}
                  onReactivar={async (codigo) => {
                    await updateEspecialidadCatalogo(codigo, { activa: true });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ciudades" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Agregar ciudad</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearCiudad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoCiudad">Código *</Label>
                    <Input
                      id="codigoCiudad"
                      value={codigoCiudad}
                      onChange={(e) => setCodigoCiudad(e.target.value)}
                      placeholder="ej: puerto_penasco"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreCiudad">Nombre *</Label>
                    <Input
                      id="nombreCiudad"
                      value={nombreCiudad}
                      onChange={(e) => setNombreCiudad(e.target.value)}
                      placeholder="ej: Puerto Peñasco"
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loadingCiudad}>
                      <Plus className="mr-2 h-4 w-4" />
                      Crear
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">Listado</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <TablaCatalogo
                  rows={ciudadesOrdenadas}
                  tipo="ciudad"
                  onEditarNombre={async (codigo, nombre) => {
                    await updateCiudadCatalogo(codigo, { nombre });
                  }}
                  onDesactivar={async (codigo) => {
                    await deleteCiudadCatalogo(codigo);
                  }}
                  onReactivar={async (codigo) => {
                    await updateCiudadCatalogo(codigo, { activa: true });
                  }}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

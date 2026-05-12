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
import { useLanguage } from '../context/LanguageContext';

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
  const { t } = useLanguage();

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
          <thead className="bg-muted/30 border-b border-border">
            <tr>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_name')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_code')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_status')}</th>
              <th className="text-left p-4 text-sm font-medium text-muted-foreground">{t('var.col_actions')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.codigo} className="border-b border-border hover:bg-muted/40">
                <td className="p-4 text-sm text-foreground">
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
                <td className="p-4 text-sm font-mono text-muted-foreground">{r.codigo}</td>
                <td className="p-4">
                  {r.activa ? (
                    <Badge>{t('var.active')}</Badge>
                  ) : (
                    <Badge variant="outline" className="bg-background">
                      {t('var.inactive')}
                    </Badge>
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
                          variant="default"
                          size="sm"
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
                        variant="destructive"
                        size="sm"
                        disabled={savingEdit}
                        onClick={async () => {
                          if (!confirm(t('var.deactivate_confirm').replace('{0}', r.nombre))) return;
                          await onDesactivar(r.codigo, r.nombre);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        variant="secondary"
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

        {rows.length === 0 && <div className="p-12 text-center text-muted-foreground">{t('var.no_records')}</div>}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t('var.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('var.subtitle')}</p>
        </div>

        <Tabs defaultValue="especialidades">
          <TabsList>
            <TabsTrigger value="especialidades">{t('var.tabs_specialties')}</TabsTrigger>
            <TabsTrigger value="ciudades">{t('var.tabs_cities')}</TabsTrigger>
          </TabsList>

          <TabsContent value="especialidades" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.add_specialty')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearEspecialidad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoEspecialidad">{t('var.code')}</Label>
                    <Input
                      id="codigoEspecialidad"
                      value={codigoEspecialidad}
                      onChange={(e) => setCodigoEspecialidad(e.target.value)}
                      placeholder={t('var.code_placeholder_esp')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreEspecialidad">{t('var.name')}</Label>
                    <Input
                      id="nombreEspecialidad"
                      value={nombreEspecialidad}
                      onChange={(e) => setNombreEspecialidad(e.target.value)}
                      placeholder={t('var.name_placeholder_esp')}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={loadingEspecialidad}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('var.create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.list')}</CardTitle>
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
                <CardTitle className="text-base">{t('var.add_city')}</CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <form onSubmit={onCrearCiudad} className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="codigoCiudad">{t('var.code')}</Label>
                    <Input
                      id="codigoCiudad"
                      value={codigoCiudad}
                      onChange={(e) => setCodigoCiudad(e.target.value)}
                      placeholder={t('var.code_placeholder_city')}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="nombreCiudad">{t('var.name')}</Label>
                    <Input
                      id="nombreCiudad"
                      value={nombreCiudad}
                      onChange={(e) => setNombreCiudad(e.target.value)}
                      placeholder={t('var.name_placeholder_city')}
                      required
                    />
                  </div>
                  <div className="flex items-end gap-2">
                    <Button type="submit" disabled={loadingCiudad}>
                      <Plus className="mr-2 h-4 w-4" />
                      {t('var.create')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="text-base">{t('var.list')}</CardTitle>
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

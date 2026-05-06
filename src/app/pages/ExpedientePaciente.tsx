import { useMemo } from 'react';
import { Outlet, useLocation, useNavigate, useParams } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { FileText } from 'lucide-react';
import { useData } from '../context/DataContext';
import { ExpedienteHeader } from '../components/expediente/ExpedienteHeader';

export function ExpedientePaciente() {
  const { pacienteId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { pacientes } = useData();

  const paciente = useMemo(() => {
    const id = String(pacienteId || '').trim();
    if (!id) return null;
    return pacientes.find((p) => String(p.id) === id) || null;
  }, [pacienteId, pacientes]);

  const tab = location.pathname.includes('/citas') ? 'citas' : 'paciente';

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {paciente ? (
          <div className="w-full">
            <Card className="w-full shadow-sm overflow-hidden flex flex-col">
              <ExpedienteHeader
                paciente={paciente}
                onClose={() => {
                  navigate(-1);
                }}
              />

              <CardContent className="p-6">
                <Tabs
                  value={tab}
                  onValueChange={(v) => {
                    const base = `/expediente/${paciente.id}`;
                    if (v === 'citas') navigate(`${base}/citas`);
                    else navigate(base);
                  }}
                  className="w-full"
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                    <TabsList className="w-full md:w-auto">
                      <TabsTrigger value="paciente">Paciente</TabsTrigger>
                      <TabsTrigger value="citas">Citas</TabsTrigger>
                    </TabsList>
                  </div>
                </Tabs>

                <Outlet context={{ paciente }} />

                <div className="mt-8 pt-6 border-t flex justify-end gap-3">
                  <Button variant="outline" onClick={() => navigate(-1)} className="text-gray-900 border-gray-300">
                    Cerrar
                  </Button>
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <FileText className="w-4 h-4 mr-2" />
                    Imprimir Expediente
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="shadow-sm">
            <CardContent className="p-10 text-center text-gray-600">
              No se encontró el paciente solicitado.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

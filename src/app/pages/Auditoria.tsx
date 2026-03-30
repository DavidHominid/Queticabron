import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useData } from '../context/DataContext';
import { Shield, Calendar, User, Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function Auditoria() {
  const { registrosAuditoria, fetchAllData } = useData();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAllData();
    setTimeout(() => setLoading(false), 500);
  };

  const accionBadgeColor = (accion: string) => {
    if (!accion) return 'bg-gray-100 text-gray-700';
    const acc = accion.toLowerCase();
    if (acc.includes('crear')) return 'bg-green-100 text-green-700';
    if (acc.includes('actualizar') || acc.includes('completar')) return 'bg-blue-100 text-blue-700';
    if (acc.includes('cancelar') || acc.includes('eliminar')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Auditoría del Sistema</h1>
            <p className="text-gray-600 mt-1">Registro completo de todas las acciones realizadas</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Actualizando...' : 'Actualizar'}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Registros</p>
                  <p className="text-2xl font-semibold text-gray-900">{registrosAuditoria.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle>Registro de Actividades</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {registrosAuditoria.slice().map((registro) => (
                <div key={registro.id} className="p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-orange-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={accionBadgeColor(registro.accion)}>
                          {registro.accion}
                        </Badge>
                        <span className="text-sm text-gray-600">
                          {new Date(registro.fechaHora).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 mb-1">{registro.detalles}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {registro.nombreUsuario}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{registro.rol}</span>
                        <span>•</span>
                        <span className="capitalize">{registro.ciudad.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {registrosAuditoria.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay registros de auditoría</h3>
              <p className="text-gray-600">Los registros aparecerán aquí cuando se realicen acciones</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

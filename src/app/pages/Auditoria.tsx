import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { useData } from '../context/DataContext';
import { useLanguage } from '../context/LanguageContext';
import { Shield, User, Activity, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export function Auditoria() {
  const { registrosAuditoria, fetchAllData } = useData();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    await fetchAllData();
    setTimeout(() => setLoading(false), 500);
  };

  const accionBadgeStyle = (accion: string) => {
    if (!accion) return { variant: 'outline' as const, className: 'bg-background' };
    const acc = accion.toLowerCase();
    if (acc.includes('cancelar') || acc.includes('eliminar')) return { variant: 'destructive' as const, className: '' };
    if (acc.includes('crear')) return { variant: 'default' as const, className: '' };
    if (acc.includes('actualizar') || acc.includes('completar')) return { variant: 'secondary' as const, className: '' };
    return { variant: 'outline' as const, className: 'bg-background' };
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{t('audit.title')}</h1>
            <p className="text-muted-foreground mt-1">{t('audit.subtitle')}</p>
          </div>
          <Button 
            onClick={handleRefresh} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? t('audit.refreshing') : t('audit.refresh')}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center">
                  <Activity className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('audit.total')}</p>
                  <p className="text-2xl font-semibold text-foreground">{registrosAuditoria.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm">
          <CardHeader className="border-b">
            <CardTitle>{t('audit.log')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {registrosAuditoria.slice().map((registro) => (
                <div key={registro.id} className="p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                      <Shield className="w-5 h-5 text-secondary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={accionBadgeStyle(registro.accion).variant} className={accionBadgeStyle(registro.accion).className}>
                          {registro.accion}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(registro.fechaHora).toLocaleString('es-MX')}
                        </span>
                      </div>
                      <p className="text-sm text-foreground mb-1">{registro.detalles}</p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/70">
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
              <Shield className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('audit.no_records')}</h3>
              <p className="text-muted-foreground">{t('audit.will_appear')}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

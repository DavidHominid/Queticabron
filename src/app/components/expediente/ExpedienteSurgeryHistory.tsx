import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Heart, Calendar, Clock, Eye } from 'lucide-react';
import { Cirugia } from '../../types';

interface ExpedienteSurgeryHistoryProps {
  cirugias: Cirugia[];
  onVerDetalle: (cirugiaId: string) => void;
}

export function ExpedienteSurgeryHistory({ 
  cirugias, 
  onVerDetalle 
}: ExpedienteSurgeryHistoryProps) {
  const getEstadoBadge = (estado: string) => {
    const colores: { [key: string]: string } = {
      realizada: 'bg-green-100 text-green-700 border-green-200',
      programada: 'bg-blue-100 text-blue-700 border-blue-200',
      en_proceso: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      cancelada: 'bg-red-100 text-red-700 border-red-200',
    };
    return colores[estado] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (cirugias.length === 0) return null;

  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <Heart className="w-5 h-5 text-gray-700" />
          Historial de Cirugías ({cirugias.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          {cirugias.map((cirugia) => (
            <div 
              key={cirugia.id} 
              className="p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer bg-white"
              onClick={() => onVerDetalle(cirugia.id)}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-base">{cirugia.diagnostico}</p>
                  <p className="text-sm text-gray-600">Dr. {cirugia.medicoACargo}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getEstadoBadge(cirugia.estado)}>
                    {cirugia.estado.replace('_', ' ')}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVerDetalle(cirugia.id);
                    }}
                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Ver Detalles
                  </Button>
                </div>
              </div>
              {cirugia.fechaCirugia && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(cirugia.fechaCirugia).toLocaleDateString('es-MX')}</span>
                  </div>
                  {cirugia.horaCirugia && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{cirugia.horaCirugia}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

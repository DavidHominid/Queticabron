import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Activity, Thermometer, Heart, Droplet } from 'lucide-react';
import { RegistroTriage } from '../../types';

interface ExpedienteVitalSignsProps {
  triages: RegistroTriage[];
  calcularIMC: () => string;
}

export function ExpedienteVitalSigns({ triages, calcularIMC }: ExpedienteVitalSignsProps) {
  if (triages.length === 0) return null;
  
  const ultimoTriage = triages[triages.length - 1];
  
  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <Activity className="w-5 h-5 text-gray-700" />
          Últimos Signos Vitales
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-red-50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Thermometer className="w-4 h-4 text-red-600" />
              <p className="text-xs text-gray-600">Temperatura</p>
            </div>
            <p className="font-semibold text-gray-900">
              {ultimoTriage.signosVitales.temperatura}°C
            </p>
          </div>
          <div className="p-3 bg-pink-50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Heart className="w-4 h-4 text-pink-600" />
              <p className="text-xs text-gray-600">Presión</p>
            </div>
            <p className="font-semibold text-gray-900">
              {ultimoTriage.signosVitales.presionArterial}
            </p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-gray-600">Ritmo Cardíaco</p>
            </div>
            <p className="font-semibold text-gray-900">
              {ultimoTriage.signosVitales.ritmoCardiaco} bpm
            </p>
          </div>
          <div className="p-3 bg-purple-50 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <Droplet className="w-4 h-4 text-purple-600" />
              <p className="text-xs text-gray-600">Glucosa</p>
            </div>
            <p className="font-semibold text-gray-900">
              {ultimoTriage.signosVitales.azucarEnSangre} mg/dL
            </p>
          </div>
        </div>
        <div className="pt-3 border-t">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-gray-600">Peso</p>
              <p className="font-medium text-gray-900">{ultimoTriage.signosVitales.peso} kg</p>
            </div>
            <div>
              <p className="text-gray-600">Altura</p>
              <p className="font-medium text-gray-900">{ultimoTriage.signosVitales.altura} cm</p>
            </div>
            <div>
              <p className="text-gray-600">IMC</p>
              <p className="font-medium text-gray-900">{calcularIMC()}</p>
            </div>
          </div>
        </div>
        <div className="pt-2 text-xs text-gray-500">
          Actualizado: {new Date(ultimoTriage.fechaHora).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </CardContent>
    </Card>
  );
}

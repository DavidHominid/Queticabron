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
      <CardHeader className="border-b gap-2">
        <CardTitle className="flex items-center gap-2 text-foreground">
          <Activity className="h-5 w-5 text-[color:var(--brand-secondary-strong)]" />
          Signos vitales
        </CardTitle>
        <p className="text-sm text-muted-foreground">Último triage registrado.</p>
      </CardHeader>
      <CardContent className="pt-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border bg-accent p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Temperatura</p>
              <Thermometer className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {Number.isFinite(Number(ultimoTriage.signosVitales.temperatura)) ? `${ultimoTriage.signosVitales.temperatura} °C` : 'N/A'}
            </p>
          </div>

          <div className="rounded-xl border bg-accent p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Presión arterial</p>
              <Heart className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">{String(ultimoTriage.signosVitales.presionArterial || 'N/A')}</p>
          </div>

          <div className="rounded-xl border bg-accent p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Ritmo cardíaco</p>
              <Activity className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {Number.isFinite(Number(ultimoTriage.signosVitales.ritmoCardiaco)) ? `${ultimoTriage.signosVitales.ritmoCardiaco} bpm` : 'N/A'}
            </p>
          </div>

          <div className="rounded-xl border bg-accent p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Glucosa</p>
              <Droplet className="h-4 w-4 text-[color:var(--brand-secondary-strong)]" />
            </div>
            <p className="mt-2 text-sm font-semibold text-foreground">
              {Number.isFinite(Number(ultimoTriage.signosVitales.azucarEnSangre))
                ? `${ultimoTriage.signosVitales.azucarEnSangre} mg/dL`
                : 'N/A'}
            </p>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Peso</p>
              <p className="mt-1 font-semibold text-foreground">
                {Number.isFinite(Number(ultimoTriage.signosVitales.peso)) ? `${ultimoTriage.signosVitales.peso} kg` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Altura</p>
              <p className="mt-1 font-semibold text-foreground">
                {Number.isFinite(Number(ultimoTriage.signosVitales.altura)) ? `${ultimoTriage.signosVitales.altura} cm` : 'N/A'}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">IMC</p>
              <p className="mt-1 font-semibold text-foreground">{String(calcularIMC() || '').trim() || 'N/A'}</p>
            </div>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Actualizado: {new Date(ultimoTriage.fechaHora).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </div>
      </CardContent>
    </Card>
  );
}

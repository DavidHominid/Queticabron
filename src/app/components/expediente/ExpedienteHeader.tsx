import React from 'react';
import { CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { X, User } from 'lucide-react';
import { Paciente } from '../../types';

interface ExpedienteHeaderProps {
  paciente: Paciente;
  onClose: () => void;
}

export function ExpedienteHeader({ paciente, onClose }: ExpedienteHeaderProps) {
  return (
    <CardHeader className="sticky top-0 z-10 border-b bg-card pb-6 pt-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {paciente.imagen ? (
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl border bg-card shadow-[0_2px_8px_rgba(121,201,197,0.08)]">
              <img src={paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border bg-accent text-[color:var(--brand-primary-strong)] shadow-[0_2px_8px_rgba(121,201,197,0.08)]">
              <User className="h-8 w-8" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl text-foreground">{paciente.nombre}</CardTitle>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="bg-accent text-muted-foreground">
                {paciente.numeroExpediente}
              </Badge>
              <Badge variant="outline" className="bg-card text-muted-foreground">
                {paciente.edad} años
              </Badge>
              <Badge variant="outline" className="bg-card text-muted-foreground">{paciente.sexo}</Badge>
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className=" -mr-2 -mt-2 inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-card text-muted-foreground shadow-[0_2px_8px_rgba(121,201,197,0.08)] transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </CardHeader>
  );
}

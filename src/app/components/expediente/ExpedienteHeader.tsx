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
    <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10 pb-6 pt-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          {paciente.imagen ? (
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-white shadow-sm flex-shrink-0 bg-white">
              <img src={paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-white shadow-sm flex-shrink-0">
              <User className="w-8 h-8 text-blue-600" />
            </div>
          )}
          <div>
            <CardTitle className="text-2xl text-gray-900">{paciente.nombre}</CardTitle>
            <div className="flex items-center gap-3 mt-2">
              <Badge variant="outline" className="text-sm border-gray-300 text-gray-700">
                {paciente.numeroExpediente}
              </Badge>
              <Badge className="bg-purple-100 text-purple-700 text-sm">
                {paciente.edad} años
              </Badge>
              <Badge className="bg-blue-100 text-blue-700 text-sm">{paciente.sexo}</Badge>
            </div>
          </div>
        </div>
        <button onClick={onClose} className="p-2 bg-white rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 shadow-sm transition-colors -mr-2 -mt-2">
          <X className="w-5 h-5" />
        </button>
      </div>
    </CardHeader>
  );
}

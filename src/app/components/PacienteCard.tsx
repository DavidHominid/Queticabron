import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { User, Phone, Calendar, MapPin } from 'lucide-react';
import { Paciente } from '../types';

interface PacienteCardProps {
  paciente: Paciente;
  onClick?: (paciente: Paciente) => void;
  className?: string;
}

export function PacienteCard({ paciente, onClick, className = '' }: PacienteCardProps) {
  return (
    <Card
      className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${className}`}
      onClick={() => onClick?.(paciente)}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center overflow-hidden flex-shrink-0">
            {paciente.imagen ? (
              <img src={paciente.imagen} alt={paciente.nombre} className="w-full h-full object-cover" />
            ) : (
              <User className="w-6 h-6 text-blue-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{paciente.nombre}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-xs">
                {paciente.numeroExpediente}
              </Badge>
              <Badge className="text-xs bg-purple-100 text-purple-700">
                {paciente.edad} años
              </Badge>
            </div>
            <div className="mt-3 space-y-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{paciente.telefono}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{new Date(paciente.fechaNacimiento).toLocaleDateString('es-MX')}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span className="capitalize">{paciente.ciudad.replace('_', ' ')}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

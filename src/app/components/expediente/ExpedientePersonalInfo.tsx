import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { User, Phone, MapPin, IdCard } from 'lucide-react';
import { Paciente } from '../../types';
import { formatDateSafe } from '../ui/utils';

interface ExpedientePersonalInfoProps {
  paciente: Paciente;
}

export function ExpedientePersonalInfo({ paciente }: ExpedientePersonalInfoProps) {
  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <User className="w-5 h-5 text-gray-700" />
          Datos Personales
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <div>
          <p className="text-sm text-gray-600">Identificación</p>
          <div className="flex items-center gap-2">
            <IdCard className="w-4 h-4 text-gray-500" />
            <p className="font-medium text-gray-900">{paciente.identificacion || '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Fecha de Nacimiento</p>
          <p className="font-medium text-gray-900">
            {formatDateSafe(paciente.fechaNacimiento)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Teléfono</p>
          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-gray-500" />
            <p className="font-medium text-gray-900">{paciente.telefono}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Ciudad</p>
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <p className="font-medium text-gray-900 capitalize">
              {paciente.ciudad.replace('_', ' ')}
            </p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-600">Fecha de Registro</p>
          <p className="font-medium text-gray-900">
            {formatDateSafe(paciente.fechaRegistro)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

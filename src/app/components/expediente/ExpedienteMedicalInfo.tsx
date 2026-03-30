import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { FileText } from 'lucide-react';
import { InformacionMedica } from '../../types';

interface ExpedienteMedicalInfoProps {
  infoMedica?: InformacionMedica;
}

export function ExpedienteMedicalInfo({ infoMedica }: ExpedienteMedicalInfoProps) {
  if (!infoMedica) return null;
  
  return (
    <Card>
      <CardHeader className="bg-gray-50">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <FileText className="w-5 h-5 text-gray-700" />
          Información Médica
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {infoMedica.alergias && infoMedica.alergias.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2">Alergias</p>
            <div className="flex flex-wrap gap-2">
              {infoMedica.alergias.map((alergia, idx) => (
                <Badge key={idx} className="bg-red-100 text-red-700 border-red-200">
                  {alergia}
                </Badge>
              ))}
            </div>
          </div>
        )}
        {infoMedica.notas && (
          <div>
            <p className="text-sm text-gray-600">Notas</p>
            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">{infoMedica.notas}</p>
          </div>
        )}
        {infoMedica.antecedentesPsicosociales && (
          <div>
            <p className="text-sm text-gray-600">Antecedentes Psicosociales</p>
            <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
              {infoMedica.antecedentesPsicosociales}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

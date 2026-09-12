import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { FileText, Pill, ClipboardList as ClipboardListIcon } from 'lucide-react';
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
      <CardContent className="p-4 space-y-4">
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

        {/* 1. Medicamentos actuales (chips ámbar outline) */}
        {infoMedica.medicamentosActuales && infoMedica.medicamentosActuales.length > 0 && (
          <div>
            <p className="text-sm text-gray-600 mb-2 flex items-center gap-1.5">
              <Pill className="w-3.5 h-3.5" />
              Medicamentos actuales
            </p>
            <div className="flex flex-wrap gap-2">
              {infoMedica.medicamentosActuales.map((med, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className="border-amber-300 bg-amber-50 text-amber-800"
                >
                  {med}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* 2. Antecedentes Patológicos (textarea disabled solo lectura) */}
        <div>
          <p className="text-sm text-gray-600 mb-1.5 flex items-center gap-1.5">
            <ClipboardListIcon className="w-3.5 h-3.5" />
            Antecedentes Patológicos
          </p>
          <Textarea
            rows={3}
            disabled
            readOnly
            value={infoMedica.antecedentes?.patologicos?.trim() || ''}
            placeholder="Sin antecedentes patológicos registrados."
            className="resize-none text-xs bg-gray-50"
          />
        </div>

        {/* 3. Antecedentes Heredofamiliares (textarea disabled solo lectura) */}
        <div>
          <p className="text-sm text-gray-600 mb-1.5 flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Antecedentes Heredofamiliares
          </p>
          <Textarea
            rows={3}
            disabled
            readOnly
            value={infoMedica.antecedentes?.familiares?.trim() || ''}
            placeholder="Sin antecedentes heredofamiliares registrados."
            className="resize-none text-xs bg-gray-50"
          />
        </div>

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

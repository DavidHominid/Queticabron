import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Cirugia, ConsultaMedica } from '../../types';

interface ModalValidarEstudiosProps {
  cirugia: Cirugia;
  consultaRelacionada?: ConsultaMedica; // Recibimos la consulta para ver qué estudios pidió el doctor
  onClose: () => void;
  onValidar: () => void;
}

export function ModalValidarEstudios({ cirugia, consultaRelacionada, onClose, onValidar }: ModalValidarEstudiosProps) {
  // Extraemos los estudios de la consulta (si existen)
  const estudiosSolicitados = consultaRelacionada?.estudiosIndicados || [];

  // Estado para llevar el control de cuáles ya nos entregó el paciente
  const [estudiosRecibidos, setEstudiosRecibidos] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState('');

  const handleCheckboxChange = (estudioTipo: string) => {
    if (estudiosRecibidos.includes(estudioTipo)) {
      setEstudiosRecibidos(estudiosRecibidos.filter(e => e !== estudioTipo));
    } else {
      setEstudiosRecibidos([...estudiosRecibidos, estudioTipo]);
    }
  };

  // Validamos si ya entregó todos los solicitados
  const todosRecibidos = estudiosSolicitados.length > 0
    ? estudiosSolicitados.every(e => estudiosRecibidos.includes(e.tipo))
    : true; // Si no pidió nada, está listo por defecto

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900 border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-slate-900">Validar Estudios Preoperatorios</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Diagnóstico: <span className="font-semibold text-slate-700">{cirugia.diagnostico}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm font-semibold text-slate-800">Estudios solicitados por el médico:</p>

          {estudiosSolicitados.length === 0 ? (
            <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-500 italic">
              El médico no registró estudios específicos en la consulta.
            </div>
          ) : (
            <div className="space-y-2.5">
              {estudiosSolicitados.map((estudio, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-lg transition-colors">
                  <div className="pt-0.5">
                    <Checkbox
                      id={`estudio-${index}`}
                      checked={estudiosRecibidos.includes(estudio.tipo)}
                      onCheckedChange={() => handleCheckboxChange(estudio.tipo)}
                      className="border-slate-350 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                  </div>
                  <div className="grid gap-1.5 leading-none">
                    <label htmlFor={`estudio-${index}`} className="text-sm font-semibold text-slate-800 cursor-pointer select-none">
                      {estudio.tipo}
                    </label>
                    {estudio.indicaciones && (
                      <p className="text-xs text-slate-500 leading-normal">{estudio.indicaciones}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Opcional: Campo para notas de los resultados */}
          <div className="mt-4 space-y-1.5">
            <label className="text-sm font-semibold text-slate-850">Notas / Resultados (Opcional):</label>
            <textarea
              className="w-full p-3 border border-slate-200 rounded-lg text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              rows={3}
              placeholder="Ej. Riesgo quirúrgico nivel II, laboratorios dentro de parámetros..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose} className="border-slate-200 text-slate-700 hover:bg-slate-50">
            Cancelar
          </Button>
          <Button
            onClick={onValidar}
            disabled={!todosRecibidos && estudiosSolicitados.length > 0}
            className={`bg-blue-600 hover:bg-blue-750 text-white font-medium ${!todosRecibidos && estudiosSolicitados.length > 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Aprobar Cirugía
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Cirugia } from '../../types';

interface ModalProgramarCirugiaProps {
  cirugia: Cirugia;
  onClose: () => void;
  onSubmit: (datos: { fechaCirugia: string; horaEstimada: string; lugarCirugia: string }) => void;
}

export function ModalProgramarCirugia({ cirugia, onClose, onSubmit }: ModalProgramarCirugiaProps) {
  const [fechaCirugia, setFechaCirugia] = useState(cirugia.fechaCirugia || '');
  const [horaEstimada, setHoraEstimada] = useState(cirugia.horaEstimada || '');
  const [lugarCirugia, setLugarCirugia] = useState(cirugia.lugarCirugia || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaCirugia || !horaEstimada || !lugarCirugia) return;
    
    onSubmit({ fechaCirugia, horaEstimada, lugarCirugia });
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white text-gray-900 border border-slate-200 shadow-xl rounded-xl">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-xl font-bold text-slate-900">Programar Cirugía</DialogTitle>
          <DialogDescription className="text-sm text-slate-500">
            Diagnóstico: <span className="font-semibold text-slate-700">{cirugia.diagnostico}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="py-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fechaCirugia" className="text-sm font-semibold text-slate-800">Fecha de la Cirugía *</Label>
            <Input 
              id="fechaCirugia" 
              type="date" 
              value={fechaCirugia} 
              onChange={(e) => setFechaCirugia(e.target.value)} 
              required
              className="w-full text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="horaEstimada" className="text-sm font-semibold text-slate-800">Hora Estimada *</Label>
            <Input 
              id="horaEstimada" 
              type="time" 
              value={horaEstimada} 
              onChange={(e) => setHoraEstimada(e.target.value)} 
              required
              className="w-full text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lugarCirugia" className="text-sm font-semibold text-slate-800">Lugar (Quirófano / Hospital) *</Label>
            <Input 
              id="lugarCirugia" 
              type="text" 
              placeholder="Ej. Quirófano 1, Hospital Central..."
              value={lugarCirugia} 
              onChange={(e) => setLugarCirugia(e.target.value)} 
              required
              className="w-full text-slate-900 placeholder:text-slate-400"
            />
          </div>

          <DialogFooter className="pt-4 flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!fechaCirugia || !horaEstimada || !lugarCirugia}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
            >
              Confirmar Programación
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Cirugia } from '../../types';

interface ModalProgramarCirugiaProps {
  cirugia: Cirugia;
  onClose: () => void;
  onSubmit: (datos: { fechaCirugia: string; horaEstimada: string; lugarCirugia: string; duracionEstimada: number }) => void;
}

export function ModalProgramarCirugia({ cirugia, onClose, onSubmit }: ModalProgramarCirugiaProps) {
  const [fechaCirugia, setFechaCirugia] = useState(cirugia.fechaCirugia || '');
  const [horaEstimada, setHoraEstimada] = useState(cirugia.horaEstimada || '');
  const [lugarCirugia, setLugarCirugia] = useState(cirugia.lugarCirugia || '');
  const [duracionEstimada, setDuracionEstimada] = useState<string>(cirugia.duracionEstimada ? String(cirugia.duracionEstimada) : '60');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaCirugia || !horaEstimada || !lugarCirugia || !duracionEstimada) return;
    
    onSubmit({ fechaCirugia, horaEstimada, lugarCirugia, duracionEstimada: parseInt(duracionEstimada) });
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
            <Label className="text-sm font-semibold text-slate-800">Duración Estimada *</Label>
            <Select value={duracionEstimada} onValueChange={setDuracionEstimada} required>
              <SelectTrigger className="w-full text-slate-900">
                <SelectValue placeholder="Seleccione duración" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1 hora 30 minutos</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="150">2 horas 30 minutos</SelectItem>
                <SelectItem value="180">3 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-800">Lugar (Quirófano) *</Label>
            <Select value={lugarCirugia} onValueChange={setLugarCirugia} required>
              <SelectTrigger className="w-full text-slate-900">
                <SelectValue placeholder="Seleccione quirófano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quirófano 1">Quirófano 1</SelectItem>
                <SelectItem value="Quirófano 2">Quirófano 2</SelectItem>
                <SelectItem value="Quirófano Ambulatorio">Quirófano Ambulatorio</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter className="pt-4 flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!fechaCirugia || !horaEstimada || !lugarCirugia || !duracionEstimada}
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

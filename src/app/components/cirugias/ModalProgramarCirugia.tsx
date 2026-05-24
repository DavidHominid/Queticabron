import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { AlertCircle } from 'lucide-react';
import { Cirugia } from '../../types';
import { useData } from '../../context/DataContext';

interface ModalProgramarCirugiaProps {
  cirugia: Cirugia;
  onClose: () => void;
  onSubmit: (datos: { 
    fechaCirugia: string; 
    horaEstimada: string; 
    lugarCirugia: string; 
    duracionEstimada: number;
    requiereRentaExterna: boolean;
    estatusRentaSede: 'no_aplica' | 'pendiente_confirmar' | 'confirmada';
  }) => Promise<void>;
}

export function ModalProgramarCirugia({ cirugia, onClose, onSubmit }: ModalProgramarCirugiaProps) {
  const [fechaCirugia, setFechaCirugia] = useState(cirugia.fechaCirugia || '');
  const [horaEstimada, setHoraEstimada] = useState(cirugia.horaEstimada || '');
  const [lugarCirugia, setLugarCirugia] = useState(cirugia.lugarCirugia || '');
  const [duracionEstimada, setDuracionEstimada] = useState<string>(cirugia.duracionEstimada ? String(cirugia.duracionEstimada) : '60');
  const [requiereRentaExterna, setRequiereRentaExterna] = useState<boolean>(cirugia.requiereRentaExterna || false);
  const [estatusRentaSede, setEstatusRentaSede] = useState<'no_aplica' | 'pendiente_confirmar' | 'confirmada'>(
    cirugia.estatusRentaSede || 'no_aplica'
  );
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { sedesQuirurgicas } = useData();
  const sedesActivas = sedesQuirurgicas.filter(s => s.activa);
  const sedesInactivas = sedesQuirurgicas.filter(s => !s.activa);
  const todasLasSedes = [...sedesActivas, ...sedesInactivas];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fechaCirugia || !horaEstimada || !duracionEstimada) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      await onSubmit({ 
        fechaCirugia, 
        horaEstimada, 
        lugarCirugia, 
        duracionEstimada: parseInt(duracionEstimada),
        requiereRentaExterna,
        estatusRentaSede: requiereRentaExterna && estatusRentaSede === 'no_aplica' ? 'pendiente_confirmar' : 
                          !requiereRentaExterna ? 'no_aplica' : estatusRentaSede
      });
      // onSubmit closes the modal on success — nothing else to do here
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocurrió un error al programar la cirugía.');
    } finally {
      setLoading(false);
    }
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

          {/* ── Mensaje de error inline ── */}
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fechaCirugia" className="text-sm font-semibold text-slate-800">Fecha de la Cirugía *</Label>
            <Input
              id="fechaCirugia"
              type="date"
              value={fechaCirugia}
              onChange={(e) => { setFechaCirugia(e.target.value); setErrorMsg(null); }}
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
              onChange={(e) => { setHoraEstimada(e.target.value); setErrorMsg(null); }}
              required
              className="w-full text-slate-900"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-slate-800">Duración Estimada *</Label>
            <Select value={duracionEstimada} onValueChange={(v) => { setDuracionEstimada(v); setErrorMsg(null); }} required>
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
            <Label className="text-sm font-semibold text-slate-800">Lugar (Sede o Quirófano)</Label>
            <select
              value={lugarCirugia}
              onChange={(e) => { setLugarCirugia(e.target.value); setErrorMsg(null); }}
              className="w-full px-3 py-2 border border-input bg-background text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
            >
              <option value="">-- Sin asignar --</option>
              {todasLasSedes.length === 0 && (
                <option disabled>No hay sedes registradas en Variables</option>
              )}
              {sedesActivas.length > 0 && (
                <optgroup label="Activas">
                  {sedesActivas.map(s => (
                    <option key={s.id} value={s.nombre}>
                      {s.nombre}{s.ciudad ? ` — ${s.ciudad}` : ''} ({s.tipo === 'propia' ? 'Propia' : 'Subrogada'})
                    </option>
                  ))}
                </optgroup>
              )}
              {sedesInactivas.length > 0 && (
                <optgroup label="Inactivas" style={{ color: '#9ca3af' }}>
                  {sedesInactivas.map(s => (
                    <option key={s.id} value={s.nombre} style={{ color: '#9ca3af' }}>
                      {s.nombre} (inactiva)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {lugarCirugia && sedesActivas.find(s => s.nombre === lugarCirugia)?.tipo === 'subrogada' && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                ⚠️ Sede subrogada — recuerda confirmar la renta con el administrador.
              </p>
            )}

            <div className="flex items-center space-x-2 mt-3 p-2 bg-slate-50 border border-slate-100 rounded-lg">
              <Checkbox
                id="renta"
                checked={requiereRentaExterna}
                onCheckedChange={(checked) => setRequiereRentaExterna(checked as boolean)}
              />
              <label htmlFor="renta" className="text-sm cursor-pointer text-slate-700 font-medium">
                Esta sede externa requiere pago/renta por este evento
              </label>
            </div>

            {requiereRentaExterna && (
              <div className="mt-3 ml-6">
                <Label className="text-sm font-semibold text-slate-800">Estatus de la Renta</Label>
                <Select value={estatusRentaSede !== 'no_aplica' ? estatusRentaSede : 'pendiente_confirmar'} onValueChange={(v: any) => { setEstatusRentaSede(v); }}>
                  <SelectTrigger className="w-full text-slate-900 mt-1">
                    <SelectValue placeholder="Seleccione estatus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendiente_confirmar">Pendiente de confirmar</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4 flex gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading} className="border-slate-200 text-slate-700 hover:bg-slate-50">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!fechaCirugia || !horaEstimada || !duracionEstimada || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Confirmar Programación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


import { useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Ciudad, Paciente } from '../../types';
import { now, todayYmd } from '../../utils/clock';

const calcularEdad = (fechaNacimiento: string) => {
  const birth = new Date(`${fechaNacimiento}T12:00:00`);
  if (Number.isNaN(birth.getTime())) return 0;
  const today = now();
  let edad = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) edad--;
  return Math.max(0, edad);
};

export function CrearPacienteDialog({
  open,
  onOpenChange,
  ciudadDefault,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  ciudadDefault?: Ciudad;
  onCreated: (paciente: Paciente) => void;
}) {
  const { user } = useAuth();
  const { pacientes, addPaciente } = useData();
  const ciudad = (ciudadDefault || user?.ciudad || 'sonoyta') as Ciudad;

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [sexo, setSexo] = useState<'Masculino' | 'Femenino'>('Masculino');
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [identificacion, setIdentificacion] = useState('');
  const [nacionalidad, setNacionalidad] = useState('Mexicana');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const numeroExpediente = useMemo(() => {
    const año = now().getFullYear();
    const numeroSecuencial = String((pacientes || []).length + 1).padStart(3, '0');
    return `EXP-${año}-${numeroSecuencial}`;
  }, [pacientes]);

  const reset = () => {
    setNombre('');
    setTelefono('');
    setSexo('Masculino');
    setFechaNacimiento('');
    setIdentificacion('');
    setNacionalidad('Mexicana');
    setError('');
    setGuardando(false);
  };

  const submit = async () => {
    const n = String(nombre || '').trim();
    const t = String(telefono || '').trim();
    const fn = String(fechaNacimiento || '').trim();
    if (!n) {
      setError('Ingresa el nombre.');
      return;
    }
    if (!t) {
      setError('Ingresa el teléfono.');
      return;
    }
    if (!fn) {
      setError('Selecciona la fecha de nacimiento.');
      return;
    }

    setError('');
    setGuardando(true);
    const nuevoPaciente: Paciente = {
      id: `pac${Date.now()}`,
      numeroExpediente,
      nombre: n,
      edad: calcularEdad(fn),
      fechaNacimiento: fn,
      sexo,
      telefono: t,
      ciudad,
      fechaRegistro: todayYmd(),
      nacionalidad,
      identificacion: String(identificacion || '').trim() || undefined,
    };

    try {
      const res = await addPaciente(nuevoPaciente);
      if (!(res as any)?.success) {
        const msg = (res as any)?.error || 'No se pudo registrar el paciente.';
        setError(msg);
        return;
      }
      const created = ((res as any)?.data as Paciente) || nuevoPaciente;
      onCreated(created);
      onOpenChange(false);
      reset();
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Registrar paciente</DialogTitle>
          <DialogDescription>Se creará un expediente automáticamente: {numeroExpediente}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="nuevoPacienteNombre">Nombre *</Label>
            <Input id="nuevoPacienteNombre" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="nuevoPacienteTelefono">Teléfono *</Label>
            <Input id="nuevoPacienteTelefono" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
          </div>

          <div>
            <Label htmlFor="nuevoPacienteSexo">Sexo *</Label>
            <select
              id="nuevoPacienteSexo"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
              value={sexo}
              onChange={(e) => setSexo(e.target.value as any)}
            >
              <option value="Masculino">Masculino</option>
              <option value="Femenino">Femenino</option>
            </select>
          </div>

          <div>
            <Label htmlFor="nuevoPacienteNacimiento">Fecha de nacimiento *</Label>
            <Input
              id="nuevoPacienteNacimiento"
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="nuevoPacienteNacionalidad">Nacionalidad</Label>
            <select
              id="nuevoPacienteNacionalidad"
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
              value={nacionalidad}
              onChange={(e) => setNacionalidad(e.target.value)}
            >
              <option value="Mexicana">Mexicana</option>
              <option value="Americana">Americana</option>
              <option value="Otra">Otra</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="nuevoPacienteId">Identificación</Label>
            <Input id="nuevoPacienteId" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
          </div>
        </div>

        {error && <div className="text-sm text-destructive">{error}</div>}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={submit} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


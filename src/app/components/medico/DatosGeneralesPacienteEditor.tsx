import { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  User,
  Edit3,
  Save,
  X,
  Phone,
  Calendar,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { Paciente } from '../../types';
import { toast } from 'sonner';
import { CiudadAutocomplete } from '../CiudadAutocomplete';
import { formatDateSafe } from '../ui/utils';

interface DatosGeneralesPacienteEditorProps {
  paciente: Paciente;
  onSaved?: (actualizado: Paciente) => void;
  usuario?: { id?: string | number; nombre?: string; rol?: string };
  className?: string;
}

interface DatosDraft {
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  sexo: 'Masculino' | 'Femenino' | '';
  telefono: string;
  ciudad: string;
}

const draftFromPaciente = (p: Paciente): DatosDraft => ({
  nombre: p.nombre || '',
  apellido: p.apellido || '',
  fechaNacimiento: p.fechaNacimiento ? String(p.fechaNacimiento).substring(0, 10) : '',
  sexo: p.sexo || '',
  telefono: p.telefono || '',
  ciudad: String(p.ciudad || ''),
});

export function DatosGeneralesPacienteEditor({
  paciente,
  onSaved,
  usuario,
  className,
}: DatosGeneralesPacienteEditorProps) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<DatosDraft>(() => draftFromPaciente(paciente));

  const dirty = useMemo(() => {
    const orig = draftFromPaciente(paciente);
    return (
      orig.nombre.trim() !== draft.nombre.trim() ||
      orig.apellido.trim() !== draft.apellido.trim() ||
      orig.fechaNacimiento !== draft.fechaNacimiento ||
      orig.sexo !== draft.sexo ||
      orig.telefono.trim() !== draft.telefono.trim() ||
      orig.ciudad.trim().toLowerCase() !== draft.ciudad.trim().toLowerCase()
    );
  }, [draft, paciente]);

  // Sincronizar draft cuando cambia la prop paciente externa SOLO si NO estamos en edición.
  // useState initializer solo se ejecuta 1 vez al mount; después SSE/contexto
  // actualiza paciente pero el draft se quedaba con valor obsoleto → dirty falso.
  useEffect(() => {
    if (editing || saving) return;
    setDraft(draftFromPaciente(paciente));
  }, [paciente, editing, saving]);

  const habilitarEdicion = () => {
    setDraft(draftFromPaciente(paciente));
    setEditing(true);
  };

  const cancelar = () => {
    setDraft(draftFromPaciente(paciente));
    setEditing(false);
  };

  const guardar = async () => {
    if (!draft.nombre.trim()) {
      toast.error('El nombre es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (usuario?.id) headers['x-usuario'] = String(usuario.id);
      const res = await fetch(`/api/pacientes/${paciente.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nombre: draft.nombre.trim(),
          apellido: draft.apellido.trim(),
          fechaNacimiento: draft.fechaNacimiento || null,
          sexo: draft.sexo || null,
          telefono: draft.telefono.trim() || null,
          ciudad: draft.ciudad.trim() || 'Puerto Peñasco',
          usuario_solicitante: usuario?.nombre || 'Médico',
          rol_solicitante: usuario?.rol || 'medico',
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'No se pudo guardar la información del paciente.');
      toast.success('Datos del paciente actualizados ✅');
      onSaved?.(data as Paciente);
      setEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Error desconocido al guardar.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={className}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <User className="w-4 h-4 text-muted-foreground" />
            Datos Generales del Paciente
          </h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {editing
              ? 'Actualiza campos relevantes y guarda.'
              : 'Modo visualización. Haz clic en Editar para corregir información.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {paciente.numeroExpediente ? (
            <Badge variant="outline" className="text-xs">
              Exp. {paciente.numeroExpediente}
            </Badge>
          ) : null}
          {!editing ? (
            <Button type="button" size="sm" variant="outline" onClick={habilitarEdicion}>
              <Edit3 className="w-3.5 h-3.5 mr-1.5" /> Editar
            </Button>
          ) : (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={cancelar} disabled={saving}>
                <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={guardar}
                disabled={saving || !dirty}
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                {saving ? 'Guardando…' : dirty ? 'Guardar cambios' : 'Sin cambios'}
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="dg-nombre">Nombre(s) *</Label>
          {editing ? (
            <Input
              id="dg-nombre"
              value={draft.nombre}
              onChange={(e) => setDraft({ ...draft, nombre: e.target.value })}
              placeholder="Nombre(s)"
              required
              className="mt-1"
            />
          ) : (
            <p className="mt-1 font-medium text-foreground">
              {paciente.nombre} {paciente.apellido || ''}
            </p>
          )}
        </div>

        {editing ? (
          <div className="sm:col-span-2">
            <Label htmlFor="dg-apellido">Apellidos</Label>
            <Input
              id="dg-apellido"
              value={draft.apellido}
              onChange={(e) => setDraft({ ...draft, apellido: e.target.value })}
              placeholder="Apellido paterno y materno"
              className="mt-1"
            />
          </div>
        ) : null}

        <div>
          <Label className="inline-flex items-center gap-1.5" htmlFor="dg-telefono">
            <Phone className="w-3.5 h-3.5 text-muted-foreground" /> Teléfono
          </Label>
          {editing ? (
            <Input
              id="dg-telefono"
              value={draft.telefono}
              onChange={(e) => setDraft({ ...draft, telefono: e.target.value })}
              placeholder="(638) 123 4567"
              className="mt-1"
            />
          ) : (
            <p className="mt-1 font-medium">{paciente.telefono || '-'}</p>
          )}
        </div>

        <div>
          <Label className="inline-flex items-center gap-1.5" htmlFor="dg-fecha-nac">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Fecha de nacimiento
          </Label>
          {editing ? (
            <Input
              id="dg-fecha-nac"
              type="date"
              value={draft.fechaNacimiento}
              onChange={(e) => setDraft({ ...draft, fechaNacimiento: e.target.value })}
              className="mt-1"
            />
          ) : (
            <p className="mt-1 font-medium">{formatDateSafe(paciente.fechaNacimiento) || '-'}</p>
          )}
        </div>

        <div>
          <Label htmlFor="dg-sexo">Sexo</Label>
          {editing ? (
            <Select
              value={draft.sexo}
              onValueChange={(v) => setDraft({ ...draft, sexo: v as any })}
            >
              <SelectTrigger id="dg-sexo" className="mt-1 w-full">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Masculino">Masculino</SelectItem>
                <SelectItem value="Femenino">Femenino</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <p className="mt-1 font-medium">{paciente.sexo || '-'}</p>
          )}
        </div>

        <div>
          <Label className="inline-flex items-center gap-1.5" htmlFor="dg-ciudad">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground" /> Ciudad
          </Label>
          {editing ? (
            <div className="mt-1">
              <CiudadAutocomplete
                id="dg-ciudad"
                value={draft.ciudad}
                onChange={(v) => setDraft({ ...draft, ciudad: v })}
                placeholder="Puerto Peñasco, Sonoyta, Tucson…"
              />
            </div>
          ) : (
            <p className="mt-1 font-medium capitalize">
              {String(paciente.ciudad || '-').replace(/_/g, ' ')}
            </p>
          )}
        </div>
      </div>

      {editing && dirty ? (
        <div className="mt-4 flex items-center gap-2 rounded-md border border-amber-200/60 bg-amber-50/60 px-3 py-2 text-xs text-amber-900">
          <CheckCircle2 className="w-4 h-4 text-amber-700" />
          <span>
            Tienes cambios sin guardar. Haz clic en <b>Guardar cambios</b> para persistir la
            actualización en el expediente.
          </span>
        </div>
      ) : null}
    </div>
  );
}

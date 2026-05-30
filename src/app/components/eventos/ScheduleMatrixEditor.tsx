import { Trash2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export type ScheduleRow = {
  id: string;
  horaInicio: string;
  horaFin: string;
  intervalo: number;
  cupos: Record<string, number>;
};

const makeId = () => `row_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

export function ScheduleMatrixEditor({
  days,
  rows,
  onChange,
}: {
  days: string[];
  rows: ScheduleRow[];
  onChange: (rows: ScheduleRow[]) => void;
}) {
  const addRow = () => {
    const next: ScheduleRow = {
      id: makeId(),
      horaInicio: '08:00',
      horaFin: '12:00',
      intervalo: 15,
      cupos: {},
    };
    onChange([...rows, next]);
  };

  const updateRow = (id: string, patch: Partial<ScheduleRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const removeRow = (id: string) => {
    onChange(rows.filter((r) => r.id !== id));
  };

  const updateCupo = (id: string, day: string, raw: string) => {
    const v = raw === '' ? 0 : Number(raw);
    const safe = Number.isFinite(v) ? Math.max(0, Math.floor(v)) : 0;
    onChange(
      rows.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          cupos: {
            ...r.cupos,
            [day]: safe,
          },
        };
      })
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium text-gray-900">Horario y cupos</div>
        <Button type="button" variant="outline" onClick={addRow}>
          Agregar fila
        </Button>
      </div>
      <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px]">Inicio</TableHead>
              <TableHead className="min-w-[120px]">Fin</TableHead>
              <TableHead className="min-w-[120px]">Intervalo</TableHead>
              {days.map((d) => (
                <TableHead key={d} className="min-w-[110px]">
                  {new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit' })}
                </TableHead>
              ))}
              <TableHead className="w-[52px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Input
                    type="time"
                    value={r.horaInicio}
                    onChange={(e) => updateRow(r.id, { horaInicio: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <Input type="time" value={r.horaFin} onChange={(e) => updateRow(r.id, { horaFin: e.target.value })} />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    value={r.intervalo}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      updateRow(r.id, { intervalo: Number.isFinite(v) ? Math.max(1, Math.floor(v)) : 15 });
                    }}
                  />
                </TableCell>
                {days.map((day) => (
                  <TableCell key={`${r.id}|${day}`}>
                    <Input
                      type="number"
                      min={0}
                      step={1}
                      value={r.cupos[day] ?? 0}
                      onChange={(e) => updateCupo(r.id, day, e.target.value)}
                    />
                  </TableCell>
                ))}
                <TableCell>
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={days.length + 4} className="py-8 text-center text-sm text-gray-600">
                  Agrega al menos una fila de horario.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="text-xs text-gray-600">
        Ingresa cupos por día. Si un día queda en 0, no se habilitan citas para ese bloque.
      </div>
    </div>
  );
}


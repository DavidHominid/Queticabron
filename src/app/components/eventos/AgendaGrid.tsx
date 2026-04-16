import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export type AgendaSlotRow = {
  key: string;
  horaInicio: string;
  horaFin: string;
  intervalo: number;
};

export type AgendaCell = {
  cupoTotal: number;
  cupoOcupado: number;
};

export function AgendaGrid({
  days,
  slotRows,
  cells,
  onCreateOrEdit,
}: {
  days: string[];
  slotRows: AgendaSlotRow[];
  cells: Record<string, AgendaCell | undefined>;
  onCreateOrEdit: (day: string, slotKey: string) => void;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-white min-w-[180px]">Horario</TableHead>
            {days.map((d) => (
              <TableHead key={d} className="min-w-[160px]">
                {new Date(d).toLocaleDateString('es-MX', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                })}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {slotRows.map((row) => (
            <TableRow key={row.key}>
              <TableCell className="sticky left-0 z-10 bg-white align-top">
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">{row.horaInicio}–{row.horaFin}</span>
                  <span className="text-xs text-gray-500">Intervalo: {row.intervalo} min</span>
                </div>
              </TableCell>
              {days.map((day) => {
                const cellKey = `${day}|${row.key}`;
                const cell = cells[cellKey];
                if (!cell) {
                  return (
                    <TableCell key={cellKey} className="align-top">
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full justify-center"
                        onClick={() => onCreateOrEdit(day, row.key)}
                      >
                        Crear
                      </Button>
                    </TableCell>
                  );
                }

                const disponible = Math.max(0, cell.cupoTotal - cell.cupoOcupado);
                const full = disponible <= 0;

                return (
                  <TableCell key={cellKey} className="align-top">
                    <button
                      type="button"
                      onClick={() => onCreateOrEdit(day, row.key)}
                      className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                        full
                          ? 'border-red-200 bg-red-50 hover:bg-red-100'
                          : 'border-green-200 bg-green-50 hover:bg-green-100'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={full ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}>
                          {cell.cupoOcupado}/{cell.cupoTotal}
                        </Badge>
                        <span className="text-xs text-gray-700">Disp: {disponible}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-600">Editar en evento</div>
                    </button>
                  </TableCell>
                );
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}


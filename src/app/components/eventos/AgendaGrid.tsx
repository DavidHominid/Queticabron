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
    <div className="w-full overflow-x-auto rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="sticky left-0 z-10 bg-card min-w-[180px]">Horario</TableHead>
            {days.map((d) => (
              <TableHead key={d} className="min-w-[160px]">
                {new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
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
              <TableCell className="sticky left-0 z-10 bg-card align-top">
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">{row.horaInicio}–{row.horaFin}</span>
                  <span className="text-xs text-muted-foreground">Intervalo: {row.intervalo} min</span>
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
                          ? 'border-destructive/20 bg-destructive/10 hover:bg-destructive/15'
                          : 'border-border bg-muted/20 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Badge variant={full ? 'destructive' : 'secondary'}>
                          {cell.cupoOcupado}/{cell.cupoTotal}
                        </Badge>
                        <span className="text-xs text-muted-foreground">Disp: {disponible}</span>
                      </div>
                      <div className="mt-2 text-xs text-muted-foreground">Editar en evento</div>
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

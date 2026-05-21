import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../components/ui/dialog';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Cirugia, Paciente } from '../../types';
import { useLanguage } from '../../context/LanguageContext';

interface ModalNotaPostoperatoriaProps {
  cirugia: Cirugia;
  paciente?: Paciente;
  onClose: () => void;
  onSubmit: (data: Partial<Cirugia>) => void;
}

export function ModalNotaPostoperatoria({ cirugia, paciente, onClose, onSubmit }: ModalNotaPostoperatoriaProps) {
  const { t } = useLanguage();
  const [formData, setFormData] = useState({
    diagnosticoPreoperatorio: cirugia.notaPostoperatoria?.diagnosticoPreoperatorio || cirugia.diagnostico || '',
    diagnosticoPostoperatorio: cirugia.notaPostoperatoria?.diagnosticoPostoperatorio || '',
    tipoAnestesia: cirugia.notaPostoperatoria?.tipoAnestesia || '',
    tecnicaQuirurgica: cirugia.notaPostoperatoria?.tecnicaQuirurgica || '',
    hallazgos: cirugia.notaPostoperatoria?.hallazgos || '',
    insumosConsumidos: cirugia.notaPostoperatoria?.insumosConsumidos || '',
    incidentes: cirugia.notaPostoperatoria?.incidentes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...cirugia,
      estado: 'postoperatorio', // Force state transition
      notaPostoperatoria: formData
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('cirugias.postop_note') || 'Nota Postoperatoria'}</DialogTitle>
          <div className="text-sm text-muted-foreground">
            Paciente: {paciente?.nombre} {paciente?.apellido} • Cirugía: {cirugia.diagnostico}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="diagnosticoPreoperatorio">Diagnóstico Preoperatorio</Label>
              <Input 
                id="diagnosticoPreoperatorio" 
                name="diagnosticoPreoperatorio" 
                value={formData.diagnosticoPreoperatorio} 
                onChange={handleChange} 
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diagnosticoPostoperatorio">Diagnóstico Postoperatorio</Label>
              <Input 
                id="diagnosticoPostoperatorio" 
                name="diagnosticoPostoperatorio" 
                value={formData.diagnosticoPostoperatorio} 
                onChange={handleChange} 
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoAnestesia">Tipo de Anestesia</Label>
              <Input 
                id="tipoAnestesia" 
                name="tipoAnestesia" 
                value={formData.tipoAnestesia} 
                onChange={handleChange} 
                placeholder="Ej. General, Local, Epidural..."
                required 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tecnicaQuirurgica">Técnica Quirúrgica</Label>
              <Input 
                id="tecnicaQuirurgica" 
                name="tecnicaQuirurgica" 
                value={formData.tecnicaQuirurgica} 
                onChange={handleChange} 
                placeholder="Ej. Laparoscopia, Abierta..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hallazgos">Hallazgos Quirúrgicos</Label>
            <Textarea 
              id="hallazgos" 
              name="hallazgos" 
              value={formData.hallazgos} 
              onChange={handleChange} 
              placeholder="Describa los hallazgos relevantes durante el procedimiento"
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="insumosConsumidos">Insumos Consumidos (Prótesis, Suturas, Medicamentos)</Label>
            <Textarea 
              id="insumosConsumidos" 
              name="insumosConsumidos" 
              value={formData.insumosConsumidos} 
              onChange={handleChange} 
              placeholder="Ej. 2 suturas vicryl, 1 malla de polipropileno, anestésicos locales..."
              className="min-h-[80px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="incidentes">Incidentes o Complicaciones</Label>
            <Textarea 
              id="incidentes" 
              name="incidentes" 
              value={formData.incidentes} 
              onChange={handleChange} 
              placeholder="Si hubo algún incidente, descríbalo aquí. Si no, deje en blanco o ponga 'Ninguno'."
              className="min-h-[80px]"
            />
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel') || 'Cancelar'}
            </Button>
            <Button type="submit">
              {t('common.save') || 'Guardar Nota y Pasar a Recuperación'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

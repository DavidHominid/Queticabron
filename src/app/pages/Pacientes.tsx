import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { DashboardLayout } from '../components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { PacienteCard } from '../components/PacienteCard';
import { ModalNuevaCirugia } from '../components/cirugias/ModalNuevaCirugia';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { formatDateSafe } from '../components/ui/utils';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Plus, Search, User, Phone, MapPin, FileText, X, Heart } from 'lucide-react';
import { Paciente, Ciudad } from '../types';
import { now, nowIso, todayYmd } from '../utils/clock';

export function Pacientes() {
  const navigate = useNavigate();
  const { pacientes, citas, consultasMedicas, addPaciente, updatePaciente, addRegistroAuditoria, addCirugia, ciudadesCatalogo } = useData();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaciente, setSelectedPaciente] = useState<Paciente | null>(null);
  const [showCirugiaModal, setShowCirugiaModal] = useState(false);
  const [filterType, setFilterType] = useState<'todos' | 'agendados' | 'atendidos'>('todos');
  const ciudadDefault =
    (user?.ciudad || '') ||
    (Array.isArray((user as any)?.ciudades) ? (user as any).ciudades[0] : '') ||
    (ciudadesCatalogo || []).find((c) => c.activa)?.codigo ||
    'sonoyta';
  const initialFormData: Partial<Paciente> = {
    nombre: '',
    fechaNacimiento: '',
    sexo: 'Masculino',
    telefono: '',
    ciudad: ciudadDefault,
    imagen: '',
    nacionalidad: 'Mexicana',
    identificacion: '',
  };

  const [formData, setFormData] = useState<Partial<Paciente>>(initialFormData);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string>('');

  const resetForm = () => {
    setFormData(initialFormData);
    setImageFile(null);
    setSelectedPaciente(null);
  };

  const isMedico = user?.rol === 'medico';
  const esCitaDelMedico = (c: any) => c?.medicoEncargado && (c.medicoEncargado === user?.id || c.medicoEncargado === user?.nombre);

  useEffect(() => {
    if (!imageFile) {
      setImagePreviewUrl('');
      return;
    }
    const url = URL.createObjectURL(imageFile);
    setImagePreviewUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);



  const calcularEdad = (fechaNacimiento: string) => {
    if (!fechaNacimiento) return 0;
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento + 'T12:00:00'); // Forzar mediodía para evitar saltos de día
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
      edad--;
    }
    return edad;
  };

  const getPacienteStats = (pacienteId: string) => {
    const citasDelPaciente = citas.filter((c) => c.pacienteId === pacienteId);
    const consultasDelPaciente = consultasMedicas.filter((cm) => cm.pacienteId === pacienteId);

    const citasPendientes = citasDelPaciente.filter(
      (c) => c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta'
    );

    return {
      totalCitas: citasDelPaciente.length,
      consultasCompletadas: consultasDelPaciente.length,
      citasPendientes: citasPendientes.length,
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones de formato
    const idValue = (formData.identificacion || '').replace(/\s/g, '').toUpperCase();
    if (formData.nacionalidad === 'Mexicana') {
      const curpRegex = /^[A-Z]{4}[0-9]{6}[HM][A-Z]{5}[A-Z0-9]{1}[0-9]{1}$/;
      if (!curpRegex.test(idValue)) {
        alert("La CURP ingresada no tiene un formato válido (18 caracteres).");
        return;
      }
    } else if (formData.nacionalidad === 'Americana') {
      const passportRegex = /^[0-9]{9}$/;
      if (!passportRegex.test(idValue)) {
        alert("El pasaporte americano debe tener 9 dígitos numéricos.");
        return;
      }
    }

    setSaving(true);

    let uploadedUrl = formData.imagen || '';
    if (imageFile) {
       const fd = new FormData();
       fd.append('imagen', imageFile);
       try {
           const res = await fetch('/api/upload', { method: 'POST', body: fd });
           if (res.ok) {
              const data = await res.json();
              uploadedUrl = data.url;
           }
       } catch(err) {
           console.error("Error uploading image", err);
       }
    }

    // Generar número de expediente
    const año = now().getFullYear();
    const numeroSecuencial = String(pacientes.length + 1).padStart(3, '0');
    const numeroExpediente = `EXP-${año}-${numeroSecuencial}`;

    const nuevoPaciente: Paciente = {
      id: `pac${Date.now()}`,
      numeroExpediente,
      nombre: formData.nombre || '',
      edad: calcularEdad(formData.fechaNacimiento || ''),
      fechaNacimiento: formData.fechaNacimiento || '',
      sexo: formData.sexo || 'Masculino',
      telefono: formData.telefono || '',
      ciudad: (formData.ciudad as Ciudad) || user?.ciudad || 'sonoyta',
      fechaRegistro: todayYmd(),
      imagen: uploadedUrl,
      nacionalidad: formData.nacionalidad || 'Mexicana',
      identificacion: idValue,
    };

    let res;
    if (selectedPaciente) {
      // Estamos editando
      res = await updatePaciente(selectedPaciente.id, {
        ...formData,
        imagen: uploadedUrl,
        nacionalidad: formData.nacionalidad || 'Mexicana',
        identificacion: idValue,
      });
    } else {
      // Estamos registrando nuevo
      res = await addPaciente({
        ...nuevoPaciente,
        rol_solicitante: user?.rol,
        usuario_solicitante: user?.nombre
      } as any);
    }

    setSaving(false);

    if (res && !res.success) {
      alert(res.error || 'Hubo un error al guardar el paciente.');
      return;
    }

    setShowModal(false);
    resetForm();
  };

  const handleIniciarCirugia = (data: any) => {
    if (!selectedPaciente) return;
    addCirugia({
      id: `cir${Date.now()}`,
      pacienteId: data.pacienteId || selectedPaciente.id,
      diagnostico: data.diagnostico || '',
      medicoACargo: data.medicoACargo || user?.nombre || '',
      especialidad: data.especialidad || 'medicina_familiar',
      fechaCirugia: data.fechaCirugia || '',
      horaEstimada: data.horaEstimada || '',
      lugarCirugia: data.lugarCirugia || '',
      costoEstimado: data.costoEstimado || 0,
      estado: 'pendiente_estudio',
      notas: data.notas,
      fechaRegistro: todayYmd(),
    } as any);

    addRegistroAuditoria({
      id: `aud${Date.now()}`,
      usuarioId: user?.id || '',
      nombreUsuario: user?.nombre || '',
      rol: user?.rol || 'medico',
      accion: 'Iniciar Proceso de Cirugía',
      detalles: `Inició proceso de cirugía para ${selectedPaciente.nombre} - Diagnóstico: ${data.diagnostico || ''}`,
      fechaHora: nowIso(),
      ciudad: user?.ciudad || 'sonoyta',
    } as any);

    setShowCirugiaModal(false);
  };

  const pacienteStatsById = useMemo(() => {
    const map = new Map<string, { totalCitas: number; consultasCompletadas: number; citasPendientes: number }>();
    for (const p of pacientes) {
      map.set(p.id, { totalCitas: 0, consultasCompletadas: 0, citasPendientes: 0 });
    }

    for (const c of citas) {
      const id = c?.pacienteId;
      if (!id || !map.has(id)) continue;
      const s = map.get(id)!;
      s.totalCitas += 1;
      if (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta') s.citasPendientes += 1;
    }

    for (const cm of consultasMedicas) {
      const id = (cm as any)?.pacienteId;
      if (!id || !map.has(id)) continue;
      const s = map.get(id)!;
      s.consultasCompletadas += 1;
    }

    return map;
  }, [citas, consultasMedicas, pacientes]);

  const pacientesFiltrados = useMemo(() => {
    const termLower = searchTerm.trim().toLowerCase();
    const termRaw = searchTerm.trim();

    return pacientes.filter((p) => {
      const matchSearch =
        (p.nombre || '').toLowerCase().includes(termLower) ||
        (p.id || '').toLowerCase().includes(termLower) ||
        (p.numeroExpediente || '').toLowerCase().includes(termLower) ||
        (p.telefono || '').includes(termRaw);

      if (!matchSearch) return false;
      if (!isMedico) return true;

      if (filterType === 'agendados') {
        return citas.some(
          (c) =>
            c.pacienteId === p.id &&
            esCitaDelMedico(c) &&
            (c.estado === 'programada' || c.estado === 'en_triage' || c.estado === 'en_consulta'),
        );
      }

      if (filterType === 'atendidos') {
        return citas.some((c) => c.pacienteId === p.id && esCitaDelMedico(c) && c.estado === 'completada');
      }

      return citas.some((c) => c.pacienteId === p.id && esCitaDelMedico(c));
    });
  }, [citas, esCitaDelMedico, filterType, isMedico, pacientes, searchTerm]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              {isMedico ? t('pac.title_medico') : t('pac.title_recepcion')}
            </h1>
            <p className="text-muted-foreground mt-1">
              {isMedico 
                ? t('pac.subtitle_medico')
                : t('pac.subtitle_recepcion')}
            </p>
          </div>
          {!isMedico && (
            <Button onClick={() => { resetForm(); setShowModal(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              {t('pac.new')}
            </Button>
          )}
        </div>

        {/* Barra de búsqueda y Filtros */}
        <Card className="shadow-sm">
          <CardContent className="p-4 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                placeholder={t('pac.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            {isMedico && (
              <div className="flex gap-2">
                {(['todos', 'agendados', 'atendidos'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={filterType === type ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterType(type)}
                    className="capitalize"
                  >
                    {t(`pac.${type}`)}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de pacientes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {pacientesFiltrados.map((paciente) => (
            <div key={paciente.id} className="relative group">
              <PacienteCard
                paciente={paciente}
                onClick={() => {
                  setSelectedPaciente(paciente);
                }}
              />
              {isMedico && (
                <div className="absolute bottom-4 right-4 flex gap-2 pointer-events-none">
                  <Badge variant="secondary">
                  {(pacienteStatsById.get(paciente.id)?.totalCitas ?? 0)} {t('pac.citas')}
                  </Badge>
                </div>
              )}
            </div>
          ))}
        </div>

        {pacientesFiltrados.length === 0 && (
          <Card className="shadow-sm">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-muted-foreground/40 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('pac.not_found')}</h3>
              <p className="text-muted-foreground mb-6">
                {searchTerm ? t('pac.try_another') : t('pac.start_registering')}
              </p>
              {!searchTerm && (
                <Button onClick={() => { resetForm(); setShowModal(true); }}>
                  <Plus className="w-4 h-4 mr-2" />
                  {t('pac.register_first')}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[85vh] w-[calc(100vw-2rem)] max-w-2xl overflow-auto p-0">
          <DialogHeader className="border-b px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{t('pac.register_new')}</DialogTitle>
              <button type="button" onClick={() => setShowModal(false)} aria-label={t('pac.cancel')} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>
          <div className="px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nombre">{t('pac.full_name')}</Label>
                  <Input
                    id="nombre"
                    value={formData.nombre}
                    onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                    placeholder="Ej: María González López"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fechaNacimiento">{t('pac.dob')}</Label>
                    <Input
                      id="fechaNacimiento"
                      type="date"
                      value={formData.fechaNacimiento}
                      onChange={(e) => setFormData({ ...formData, fechaNacimiento: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="sexo">{t('pac.sex')}</Label>
                    <select
                      id="sexo"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.sexo}
                      onChange={(e) => setFormData({ ...formData, sexo: e.target.value as 'Masculino' | 'Femenino' })}
                    >
                      <option value="Masculino">Masculino</option>
                      <option value="Femenino">Femenino</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="telefono">{t('pac.phone')}</Label>
                    <Input
                      id="telefono"
                      type="tel"
                      value={formData.telefono}
                      onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                      placeholder="638-555-0101"
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="ciudad">{t('pac.city')}</Label>
                    <select
                      id="ciudad"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.ciudad}
                      onChange={(e) => setFormData({ ...formData, ciudad: e.target.value as Ciudad })}
                    >
                      {(ciudadesCatalogo || [])
                        .filter((c) => c.activa)
                        .map((c) => (
                          <option key={c.codigo} value={c.codigo}>
                            {c.nombre}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nacionalidad">{t('pac.nationality')}</Label>
                    <select
                      id="nacionalidad"
                      className="w-full px-3 py-2 border border-input bg-background text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-ring/50 focus:border-ring"
                      value={formData.nacionalidad || 'Mexicana'}
                      onChange={(e) => setFormData({ ...formData, nacionalidad: e.target.value })}
                    >
                      <option value="Mexicana">{t('pac.mexican')}</option>
                      <option value="Americana">{t('pac.american')}</option>
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="identificacion">
                      {formData.nacionalidad === 'Americana' ? t('pac.passport') : t('pac.curp')}
                    </Label>
                    <Input
                      id="identificacion"
                      type="text"
                      value={formData.identificacion || ''}
                      onChange={(e) => setFormData({ ...formData, identificacion: e.target.value.toUpperCase() })}
                      placeholder={formData.nacionalidad === 'Americana' ? 'Ej. 123456789' : 'Ej. VENG920101HSRLRRA0'}
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('pac.photo')}</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {imageFile && (
                      <img
                        src={imagePreviewUrl}
                        alt="Preview"
                        className="w-16 h-16 object-cover rounded-full border border-border"
                      />
                    )}
                    {!imageFile && formData.imagen && (
                      <img
                        src={formData.imagen}
                        alt="Current"
                        className="w-16 h-16 object-cover rounded-full border border-border"
                      />
                    )}
                    <div className="flex flex-col gap-1">
                      <Label
                        htmlFor="imagen"
                        className="cursor-pointer bg-muted/20 text-foreground hover:bg-muted/30 px-4 py-2 rounded-lg font-semibold text-sm transition-colors border border-border inline-flex items-center justify-center"
                      >
                        {t('pac.select_image')}
                      </Label>
                      <input
                        id="imagen"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            setImageFile(e.target.files[0]);
                          }
                        }}
                      />
                      <span className="text-xs text-muted-foreground/70">
                        {imageFile ? imageFile.name : t('pac.no_file')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/20 border border-border rounded-lg p-4">
                  <p className="text-sm text-foreground">
                    <strong>{t('pac.note')}</strong> {t('pac.auto_id')}
                  </p>
                </div>

                <DialogFooter className="pt-4">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
                    {t('pac.cancel')}
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving ? t('pac.saving') : t('pac.register')}
                  </Button>
                </DialogFooter>
              </form>
          </div>
        </DialogContent>
      </Dialog>

      {/* Drawer de detalles del paciente */}
      <Sheet
        open={!!selectedPaciente}
        onOpenChange={(open) => {
          if (!open) setSelectedPaciente(null);
        }}
      >
        <SheetContent side="right" className="w-full sm:w-[500px] sm:max-w-md p-0 flex flex-col h-full bg-background border-l border-border">
          {selectedPaciente && (
            <>
              <SheetHeader className="border-b border-border bg-muted/20 pb-6 pt-6 px-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    {selectedPaciente.imagen ? (
                      <div className="w-16 h-16 rounded-full overflow-hidden border border-border shadow-sm flex-shrink-0 bg-card">
                        <img src={selectedPaciente.imagen} alt={selectedPaciente.nombre} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border border-border shadow-sm flex-shrink-0">
                        <User className="w-8 h-8 text-secondary-foreground" />
                      </div>
                    )}
                    <div className="text-left">
                      <SheetTitle className="text-xl">{selectedPaciente.nombre}</SheetTitle>
                      <div className="mt-2 text-left">
                         <Badge variant="outline">{selectedPaciente.numeroExpediente}</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto p-6">
                <div className="grid grid-cols-2 gap-6 bg-card p-5 rounded-xl border border-border shadow-sm">
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.age')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.edad} {t('pac.years')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.sex')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.sexo}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.birth')}</p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDateSafe(selectedPaciente.fechaNacimiento)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.phone')}</p>
                    <p className="text-base font-semibold text-foreground">{selectedPaciente.telefono}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.city')}</p>
                    <p className="text-base font-semibold text-foreground capitalize">
                      {selectedPaciente.ciudad.replace('_', ' ')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t('pac.registration')}</p>
                    <p className="text-base font-semibold text-foreground">
                      {formatDateSafe(selectedPaciente.fechaRegistro)}
                    </p>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-3">
                  <Button
                    className="w-full h-11"
                    onClick={() => {
                      navigate(`/expediente/${selectedPaciente.id}`);
                      setSelectedPaciente(null);
                    }}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    {t('pac.full_record')}
                  </Button>
                  {(user?.rol === 'medico' || user?.rol === 'administrador') && (
                    <Button
                      variant="secondary"
                      className="w-full h-11"
                      onClick={() => setShowCirugiaModal(true)}
                    >
                      <Heart className="w-4 h-4 mr-2" />
                      {t('pac.start_surgery')}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal de expediente completo */}
      {showCirugiaModal && selectedPaciente && (
        <ModalNuevaCirugia
          pacientes={[selectedPaciente]}
          initialPacienteId={selectedPaciente.id}
          initialMedicoACargo={user?.nombre || ''}
          onClose={() => setShowCirugiaModal(false)}
          onSubmit={handleIniciarCirugia}
        />
      )}
    </DashboardLayout>
  );
}

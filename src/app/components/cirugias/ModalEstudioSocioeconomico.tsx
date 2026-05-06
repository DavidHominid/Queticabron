import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { X, DollarSign, Home, Users, Briefcase, CheckCircle2 } from 'lucide-react';
import { Paciente, EstudioSocioeconomico, Cirugia } from '../../types';
import { todayYmd } from '../../utils/clock';

interface ModalEstudioSocioeconomicoProps {
  cirugia: Cirugia;
  paciente?: Paciente;
  onClose: () => void;
  onSubmit: (estudio: Partial<EstudioSocioeconomico>) => void;
}

export function ModalEstudioSocioeconomico({ 
  cirugia, 
  paciente, 
  onClose, 
  onSubmit 
}: ModalEstudioSocioeconomicoProps) {
  const [estudioForm, setEstudioForm] = useState<Partial<EstudioSocioeconomico>>({
    fechaEstudio: todayYmd(),
    ingresoMensual: 0,
    numeroPersonasDependientes: 1,
    vivienda: {
      tipo: 'propia',
      numeroCuartos: 1,
      servicios: [],
    },
    ocupacion: '',
    situacionFamiliar: '',
    necesidadesEspeciales: '',
    apoyosGubernamentales: [],
    nivelSocioeconomico: 'medio',
    observaciones: '',
  });

  const toggleServicio = (servicio: string) => {
    const servicios = estudioForm.vivienda?.servicios || [];
    const newServicios = servicios.includes(servicio)
      ? servicios.filter((s) => s !== servicio)
      : [...servicios, servicio];

    setEstudioForm({
      ...estudioForm,
      vivienda: {
        ...estudioForm.vivienda!,
        servicios: newServicios,
      },
    });
  };

  const toggleApoyo = (apoyo: string) => {
    const apoyos = estudioForm.apoyosGubernamentales || [];
    const newApoyos = apoyos.includes(apoyo)
      ? apoyos.filter((a) => a !== apoyo)
      : [...apoyos, apoyo];

    setEstudioForm({
      ...estudioForm,
      apoyosGubernamentales: newApoyos,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(estudioForm);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl my-8">
        <CardHeader className="border-b bg-gradient-to-r from-blue-50 to-white sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Estudio Socioeconómico</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Paciente: {paciente?.nombre || 'Desconocido'}
              </p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Información Económica */}
            <Card className="border-2 text-gray-900">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Información Económica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ingreso">Ingreso Mensual *</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        id="ingreso"
                        type="number"
                        className="pl-10 text-gray-900"
                        value={estudioForm.ingresoMensual}
                        onChange={(e) =>
                          setEstudioForm({
                            ...estudioForm,
                            ingresoMensual: Number(e.target.value),
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="dependientes">Personas Dependientes *</Label>
                    <Input
                      id="dependientes"
                      type="number"
                      className="text-gray-900"
                      value={estudioForm.numeroPersonasDependientes}
                      onChange={(e) =>
                        setEstudioForm({
                          ...estudioForm,
                          numeroPersonasDependientes: Number(e.target.value),
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="ocupacion">Ocupación *</Label>
                  <Input
                    id="ocupacion"
                    className="text-gray-900"
                    value={estudioForm.ocupacion}
                    onChange={(e) =>
                      setEstudioForm({ ...estudioForm, ocupacion: e.target.value })
                    }
                    placeholder="Ej: Empleado, Comerciante, Estudiante..."
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Información de Vivienda */}
            <Card className="border-2 text-gray-900">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Home className="w-5 h-5" />
                  Información de Vivienda
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="tipoVivienda">Tipo de Vivienda *</Label>
                    <select
                      id="tipoVivienda"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      value={estudioForm.vivienda?.tipo}
                      onChange={(e) =>
                        setEstudioForm({
                          ...estudioForm,
                          vivienda: {
                            ...estudioForm.vivienda!,
                            tipo: e.target.value as any,
                          },
                        })
                      }
                      required
                    >
                      <option value="propia">Propia</option>
                      <option value="rentada">Rentada</option>
                      <option value="prestada">Prestada</option>
                      <option value="otra">Otra</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="cuartos">Número de Cuartos *</Label>
                    <Input
                      id="cuartos"
                      type="number"
                      className="text-gray-900"
                      value={estudioForm.vivienda?.numeroCuartos}
                      onChange={(e) =>
                        setEstudioForm({
                          ...estudioForm,
                          vivienda: {
                            ...estudioForm.vivienda!,
                            numeroCuartos: Number(e.target.value),
                          },
                        })
                      }
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>Servicios con los que cuenta</Label>
                  <div className="grid grid-cols-3 gap-3 mt-2">
                    {['Agua', 'Luz', 'Gas', 'Internet', 'Teléfono', 'Drenaje'].map(
                      (servicio) => (
                        <label
                          key={servicio}
                          className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                        >
                          <input
                            type="checkbox"
                            checked={estudioForm.vivienda?.servicios.includes(servicio)}
                            onChange={() => toggleServicio(servicio)}
                            className="w-4 h-4 text-blue-600"
                          />
                          <span className="text-sm">{servicio}</span>
                        </label>
                      )
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Situación Familiar */}
            <Card className="border-2 text-gray-900">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Situación Familiar y Social
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="situacionFamiliar">Situación Familiar *</Label>
                  <textarea
                    id="situacionFamiliar"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={3}
                    value={estudioForm.situacionFamiliar}
                    onChange={(e) =>
                      setEstudioForm({ ...estudioForm, situacionFamiliar: e.target.value })
                    }
                    placeholder="Describe la estructura familiar, relaciones, etc."
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="necesidades">Necesidades Especiales</Label>
                  <textarea
                    id="necesidades"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={2}
                    value={estudioForm.necesidadesEspeciales}
                    onChange={(e) =>
                      setEstudioForm({ ...estudioForm, necesidadesEspeciales: e.target.value })
                    }
                    placeholder="Alguna necesidad especial del paciente o familia"
                  />
                </div>

                <div>
                  <Label>Apoyos Gubernamentales</Label>
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    {['IMSS', 'ISSSTE', 'Seguro Popular', 'Prospera', 'Otro'].map((apoyo) => (
                      <label
                        key={apoyo}
                        className="flex items-center gap-2 p-2 border rounded-lg cursor-pointer hover:bg-gray-50"
                      >
                        <input
                          type="checkbox"
                          checked={estudioForm.apoyosGubernamentales?.includes(apoyo)}
                          onChange={() => toggleApoyo(apoyo)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm">{apoyo}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Evaluación */}
            <Card className="border-2 text-gray-900">
              <CardHeader className="bg-gray-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Evaluación Socioeconómica
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="nivel">Nivel Socioeconómico *</Label>
                  <select
                    id="nivel"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    value={estudioForm.nivelSocioeconomico}
                    onChange={(e) =>
                      setEstudioForm({
                        ...estudioForm,
                        nivelSocioeconomico: e.target.value as any,
                      })
                    }
                    required
                  >
                    <option value="bajo">Bajo</option>
                    <option value="medio">Medio</option>
                    <option value="alto">Alto</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="observaciones">Observaciones del Estudio</Label>
                  <textarea
                    id="observaciones"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    rows={3}
                    value={estudioForm.observaciones}
                    onChange={(e) =>
                      setEstudioForm({ ...estudioForm, observaciones: e.target.value })
                    }
                    placeholder="Conclusiones y recomendaciones del estudio socioeconómico"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Completar Estudio
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

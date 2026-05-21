import React, { forwardRef } from 'react';
import { Cirugia, Paciente } from '../../types';

interface VistaImpresionAltaProps {
  cirugia: Cirugia;
  paciente?: Paciente;
}

export const VistaImpresionAlta = forwardRef<HTMLDivElement, VistaImpresionAltaProps>(
  ({ cirugia, paciente }, ref) => {
    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans hidden print:block max-w-4xl mx-auto">
        <div className="text-center mb-8 border-b-2 border-black pb-4">
          <h1 className="text-3xl font-bold uppercase">Clínica Nueva Esperanza</h1>
          <h2 className="text-xl mt-2">Indicaciones de Alta Postoperatoria</h2>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div>
            <p><strong>Paciente:</strong> {paciente?.nombre} {paciente?.apellido}</p>
            <p><strong>Expediente:</strong> {paciente?.numeroExpediente}</p>
            <p><strong>Fecha de Cirugía:</strong> {cirugia.fechaCirugia}</p>
          </div>
          <div>
            <p><strong>Cirujano Responsable:</strong> Dr. {cirugia.medicoACargo}</p>
            <p><strong>Procedimiento:</strong> {cirugia.diagnostico}</p>
            <p><strong>Tipo de Anestesia:</strong> {cirugia.notaPostoperatoria?.tipoAnestesia || 'No especificado'}</p>
          </div>
        </div>

        <div className="mb-8 border border-gray-300 p-4 rounded-md">
          <h3 className="text-lg font-bold mb-2 uppercase">Instrucciones de Cuidados en Casa</h3>
          <ul className="list-disc pl-5 space-y-2">
            <li>Mantener el área de la herida limpia y seca. Lavar suavemente con agua y jabón neutro sin tallar.</li>
            <li>No levantar objetos pesados (más de 5 kg) ni realizar esfuerzos físicos intensos durante al menos 15 días.</li>
            <li>Mantener una dieta balanceada, evitando grasas irritantes, picantes y alcohol.</li>
            <li>Tomar los medicamentos exactamente como se indica a continuación.</li>
          </ul>
        </div>

        <div className="mb-8 border border-gray-300 p-4 rounded-md">
          <h3 className="text-lg font-bold mb-2 uppercase">Medicamentos Postoperatorios</h3>
          <div className="min-h-[100px] border-b border-dashed border-gray-400 mb-2 p-2">
             {/* Espacio en blanco para que el médico escriba o para llenado automático si existiera el campo */}
             <p className="text-gray-500 italic">Escriba aquí los medicamentos, dosis y horarios prescritos...</p>
          </div>
        </div>

        <div className="mb-8 border-2 border-red-500 p-4 rounded-md bg-red-50 text-red-900">
          <h3 className="text-lg font-bold mb-2 uppercase text-red-700">¡Signos de Alarma!</h3>
          <p className="mb-2"><strong>Acuda inmediatamente a URGENCIAS si presenta alguno de los siguientes síntomas:</strong></p>
          <ul className="list-disc pl-5 font-bold">
            <li>Fiebre mayor a 38°C o escalofríos persistentes.</li>
            <li>Sangrado abundante que empapa los vendajes.</li>
            <li>Enrojecimiento excesivo, calor, hinchazón o secreción de pus en la herida.</li>
            <li>Dolor intenso y repentino que no se alivia con los analgésicos recetados.</li>
            <li>Dificultad para respirar o dolor en el pecho.</li>
          </ul>
        </div>

        <div className="mt-16 text-center grid grid-cols-2 gap-8">
          <div>
             <div className="border-t border-black pt-2 mx-8">
               <p className="font-bold">Firma del Médico</p>
               <p>Dr. {cirugia.medicoACargo}</p>
             </div>
          </div>
          <div>
             <div className="border-t border-black pt-2 mx-8">
               <p className="font-bold">Firma del Paciente / Familiar</p>
               <p>Acepto indicaciones</p>
             </div>
          </div>
        </div>
      </div>
    );
  }
);
VistaImpresionAlta.displayName = 'VistaImpresionAlta';

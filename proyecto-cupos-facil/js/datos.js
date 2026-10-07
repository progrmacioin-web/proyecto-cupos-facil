/* */
"use strict";

const CONFIG = {
  lugar: "Hospital Regional del Cusco · Admisión",
  totalPasos: 3,
  diasVisibles: 5,
  horas: ["7:00", "7:30", "8:00", "8:30", "9:00", "9:30"],
  duracionOcrMs: 1200,
};

const DIAS_CORTOS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const DIAS_LARGOS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

/* ---------- Reglas de validación ---------- */
const Validar = {
  dni: (valor) => /^\d{8}$/.test(valor),
  texto: (valor) => valor.length >= 2,
};

/* ---------- Documentos que se escanean ----------
    */
const DOCUMENTOS = [
  {
    titulo: "Escanea tu DNI",
    instruccion: "Pon el DNI dentro del marco, con buena luz",
    campos: [
      { id: "dni", etiqueta: "Número de DNI", validar: Validar.dni, error: "Escribe 8 números.", soloNumeros: true },
      { id: "nombre", etiqueta: "Nombres y apellidos", validar: Validar.texto, error: "Escribe tu nombre." },
    ],
    lecturaSimulada: { dni: "00000000", nombre: "Nombres Apellidos" },
  },
  {
    titulo: "Escanea tu hoja de referencia",
    instruccion: "Pon la hoja dentro del marco, con buena luz",
    campos: [
      // Validación cruzada de identidad (informe 5.5): debe ser igual al DNI escaneado
      {
        id: "dniHoja", etiqueta: "DNI que figura en la hoja", soloNumeros: true,
        validar: (valor, datos) => Validar.dni(valor) && valor === datos.dni,
        error: "El DNI de la hoja debe ser igual al de tu DNI.",
      },
      { id: "codigoReferencia", etiqueta: "Código de la hoja de referencia", validar: Validar.texto, error: "Escribe el código de la hoja." },
      { id: "origen", etiqueta: "Establecimiento de origen", validar: Validar.texto, error: "Escribe el establecimiento." },
      { id: "especialidad", etiqueta: "Especialidad solicitada", validar: Validar.texto, error: "Escribe la especialidad." },
      { id: "diagnostico", etiqueta: "Diagnóstico", validar: Validar.texto, error: "Escribe el diagnóstico." },
    ],
    lecturaSimulada: {
      dniHoja: "00000000",
      codigoReferencia: "REF-00000",
      origen: "Establecimiento de prueba",
      especialidad: "Especialidad de prueba",
      diagnostico: "Diagnóstico de prueba",
    },
  },
];

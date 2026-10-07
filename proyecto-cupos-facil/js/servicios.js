
"use strict";

/* ---------- Cámara (API Media Devices) ---------- */
const Camara = {
  flujo: null,

  get activa() {
    return this.flujo !== null;
  },

  async abrir(video) {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      throw new Error("La cámara solo funciona desde localhost o https. Puedes escribir los datos a mano.");
    }
    this.flujo = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment" },
      audio: false,
    });
    video.srcObject = this.flujo;
    await video.play();
  },

  detener(video) {
    if (this.flujo) this.flujo.getTracks().forEach((pista) => pista.stop());
    this.flujo = null;
    video.srcObject = null;
  },

  /** Copia el cuadro actual del video al lienzo. */
  capturar(video, lienzo) {
    lienzo.width = video.videoWidth;
    lienzo.height = video.videoHeight;
    lienzo.getContext("2d").drawImage(video, 0, 0);
  },

  /** Privacidad: la foto solo vive en memoria y se borra al terminar. */
  borrar(lienzo) {
    lienzo.getContext("2d").clearRect(0, 0, lienzo.width, lienzo.height);
    lienzo.width = 0;
    lienzo.height = 0;
  },
};

/* ---------- OCR simulado ---------- */
const Ocr = {
  /** Devuelve (después de una pausa) los datos de prueba del documento. */
  leer(documento) {
    return new Promise((resolver) => {
      setTimeout(() => resolver(documento.lecturaSimulada), CONFIG.duracionOcrMs);
    });
  },
};

/* ---------- Agenda de cupos (datos de prueba) ---------- */
const Agenda = {
  /** Próximos días hábiles; algunas horas ya vienen ocupadas. */
  crear() {
    const dias = [];
    const fecha = new Date();

    while (dias.length < CONFIG.diasVisibles) {
      fecha.setDate(fecha.getDate() + 1);
      const finDeSemana = fecha.getDay() === 0 || fecha.getDay() === 6;
      if (finDeSemana) continue;

      const numeroDia = dias.length;
      const ocupadas = new Set(
        CONFIG.horas.filter((hora, indiceHora) => (numeroDia + indiceHora) % 4 === 0)
      );
      dias.push({ fecha: new Date(fecha), ocupadas });
    }
    return dias;
  },

  texto(dia, hora) {
    return `${DIAS_LARGOS[dia.fecha.getDay()]} ${dia.fecha.getDate()} · ${hora} a. m.`;
  },
};

/* ---------- Ficha FUA en PDF (jsPDF) ---------- */
const Fua = {
  /** Genera una FUA de muestra. No tiene validez oficial. */
  descargar(datos, textoCita) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF();

    pdf.setFontSize(16);
    pdf.text("FORMATO ÚNICO DE ATENCIÓN (FUA) - MUESTRA", 105, 20, { align: "center" });
    pdf.setFontSize(9);
    pdf.text("Documento de simulación académica. No tiene validez oficial.", 105, 27, { align: "center" });

    const filas = [
      ["DNI", datos.dni],
      ["Paciente", datos.nombre],
      ["Código de referencia", datos.codigoReferencia],
      ["Establecimiento de origen", datos.origen],
      ["Diagnóstico", datos.diagnostico],
      ["Especialidad", datos.especialidad],
      ["Cita", textoCita],
      ["Lugar", CONFIG.lugar],
    ];

    pdf.setFontSize(12);
    filas.forEach(([etiqueta, valor], i) => pdf.text(`${etiqueta}: ${valor}`, 20, 45 + i * 10));

    pdf.line(20, 160, 90, 160);
    pdf.text("Firma del paciente", 20, 167);
    pdf.line(120, 160, 190, 160);
    pdf.text("Firma del profesional", 120, 167);

    pdf.save(`FUA_muestra_${datos.dni}.pdf`);
  },
};

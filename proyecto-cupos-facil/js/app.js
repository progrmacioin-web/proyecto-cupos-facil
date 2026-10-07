
"use strict";

/* 
   1. ESTADO
    */
const estado = {
  indiceDocumento: 0,   // 0 = DNI, 1 = hoja de referencia
  datos: {},            // datos confirmados por la persona
  leyendo: false,       // true mientras el OCR trabaja
  agenda: [],           // días con sus horas ocupadas
  diaElegido: 0,        // posición dentro de la agenda
  horaElegida: null,    // por ejemplo "8:00"
  citaTexto: null,      // cita reservada, por ejemplo "Martes 13 · 8:00 a. m."
};

/* 
   2. UTILIDADES
    */
const $ = (selector) => document.querySelector(selector);

/** Escribe un texto en todos los elementos con data-texto="nombre". */
function ponerTexto(nombre, valor) {
  document.querySelectorAll(`[data-texto="${nombre}"]`).forEach((elemento) => {
    elemento.textContent = valor; // textContent evita inyectar HTML (XSS)
  });
}

/* 
   3. NAVEGACIÓN
    */
const PANTALLAS_CON_CABECERA = ["escaneo", "cupo"];

function mostrarPantalla(nombre) {
  document.querySelectorAll("[data-pantalla]").forEach((pantalla) => {
    pantalla.hidden = pantalla.dataset.pantalla !== nombre;
  });
  $("#cabecera").hidden = !PANTALLAS_CON_CABECERA.includes(nombre);
  window.scrollTo({ top: 0 });
}

function pintarCabecera(paso, titulo) {
  $("#cabecera-paso").textContent = `Paso ${paso} de ${CONFIG.totalPasos}`;
  $("#cabecera-titulo").textContent = titulo;

  let tramos = "";
  for (let i = 1; i <= CONFIG.totalPasos; i++) {
    tramos += `<span class="segmentos__tramo ${i <= paso ? "segmentos__tramo--activo" : ""}"></span>`;
  }
  $("#segmentos").innerHTML = tramos;
}

function alPulsarVolver() {
  estado.leyendo = false; // cancela una lectura en curso
  Camara.detener($("#video"));

  const enCupo = !$('[data-pantalla="cupo"]').hidden;
  if (enCupo) {
    abrirEscaneo(DOCUMENTOS.length - 1);
  } else if (estado.indiceDocumento > 0) {
    abrirEscaneo(estado.indiceDocumento - 1);
  } else {
    mostrarPantalla("inicio");
  }
}

/* 
   4. ESCANEO
    */
function abrirEscaneo(indice) {
  const documento = DOCUMENTOS[indice];
  estado.indiceDocumento = indice;
  estado.leyendo = false;

  pintarCabecera(indice + 1, documento.titulo);
  pintarCampos(documento);

  $("#camara-aviso").textContent = documento.instruccion;
  $("#chip-leido").hidden = true;
  $("#video").hidden = true;
  $("#lienzo").hidden = true;
  pintarBotonCamara();

  mostrarPantalla("escaneo");
}

/** Crea los campos del formulario según el documento actual. */
function pintarCampos(documento) {
  const formulario = $("#form-documento");
  formulario.innerHTML = "";

  documento.campos.forEach((campo) => {
    const contenedor = document.createElement("div");
    contenedor.className = "campo";
    contenedor.innerHTML = `
      <label for="campo-${campo.id}">${campo.etiqueta}</label>
      <input class="form-control" id="campo-${campo.id}" autocomplete="off"
             ${campo.soloNumeros ? 'inputmode="numeric" maxlength="8"' : ""}>
      <div class="invalid-feedback">${campo.error}</div>`;
    formulario.appendChild(contenedor);

    const entrada = contenedor.querySelector("input");
    entrada.value = estado.datos[campo.id] || ""; // recupera lo ya escrito
    entrada.addEventListener("input", () => {
      if (campo.soloNumeros) entrada.value = entrada.value.replace(/\D/g, "");
      entrada.classList.remove("is-invalid");
    });
  });
}

/** El botón de cámara cambia de icono según esté abierta o no. */
function pintarBotonCamara() {
  const boton = $("#btn-camara");
  boton.innerHTML = Camara.activa
    ? '<i class="bi bi-record-circle"></i>'
    : '<i class="bi bi-camera"></i>';
  boton.setAttribute("aria-label", Camara.activa ? "Tomar foto" : "Abrir cámara");
}

/** Primer toque abre la cámara; segundo toque toma la foto. */
async function alPulsarCamara() {
  if (estado.leyendo) return;
  if (Camara.activa) {
    await tomarFoto();
  } else {
    await abrirCamara();
  }
}

async function abrirCamara() {
  const aviso = $("#camara-aviso");
  try {
    await Camara.abrir($("#video"));
    $("#lienzo").hidden = true;
    $("#video").hidden = false;
    aviso.textContent = DOCUMENTOS[estado.indiceDocumento].instruccion;
  } catch (error) {
    aviso.textContent = error.message.includes("localhost")
      ? error.message
      : "No pudimos abrir la cámara. Revisa el permiso o escribe los datos a mano.";
  }
  pintarBotonCamara();
}

async function tomarFoto() {
  const documento = DOCUMENTOS[estado.indiceDocumento];
  const video = $("#video");
  const lienzo = $("#lienzo");

  estado.leyendo = true;
  Camara.capturar(video, lienzo);
  Camara.detener(video);
  video.hidden = true;
  lienzo.hidden = false;
  pintarBotonCamara();
  $("#camara-aviso").textContent = "Leyendo el documento…";

  const lectura = await Ocr.leer(documento);

  // Si la persona volvió atrás mientras se leía, no se rellena nada
  if (!estado.leyendo) return;

  Object.entries(lectura).forEach(([id, valor]) => {
    $(`#campo-${id}`).value = valor;
  });
  Camara.borrar(lienzo);
  lienzo.hidden = true;
  $("#camara-aviso").textContent = "Documento leído";
  $("#chip-leido").hidden = false;
  estado.leyendo = false;
}

/** Valida los campos; si todo está bien, los guarda en el estado. */
function validarDocumento(documento) {
  let primerError = null;

  documento.campos.forEach((campo) => {
    const entrada = $(`#campo-${campo.id}`);
    const valor = entrada.value.trim();
    const correcto = campo.validar(valor, estado.datos);

    entrada.classList.toggle("is-invalid", !correcto);
    if (correcto) estado.datos[campo.id] = valor;
    if (!correcto && !primerError) primerError = entrada;
  });

  if (primerError) primerError.focus();
  return primerError === null;
}

function alEnviarDocumento(evento) {
  evento.preventDefault();
  if (estado.leyendo) return;
  if (!validarDocumento(DOCUMENTOS[estado.indiceDocumento])) return;

  Camara.detener($("#video"));
  if (estado.indiceDocumento < DOCUMENTOS.length - 1) {
    abrirEscaneo(estado.indiceDocumento + 1);
  } else {
    abrirCupos();
  }
}

/* 
   5. CUPOS
    */
function abrirCupos() {
  estado.agenda = Agenda.crear();
  estado.diaElegido = 0;
  estado.horaElegida = null;

  pintarCabecera(3, "Elige tu cupo");
  ponerTexto("especialidad", estado.datos.especialidad);
  pintarDias();
  pintarHoras();
  pintarResumenCita();
  mostrarPantalla("cupo");
}

function pintarDias() {
  $("#dias").innerHTML = estado.agenda
    .map((dia, indice) => {
      const clase = indice === estado.diaElegido ? "opcion opcion--elegida" : "opcion";
      const nombre = DIAS_CORTOS[dia.fecha.getDay()];
      return `<button type="button" class="${clase}" data-indice="${indice}">
                <small>${nombre}</small>${dia.fecha.getDate()}</button>`;
    })
    .join("");
}

function pintarHoras() {
  const dia = estado.agenda[estado.diaElegido];
  $("#horas").innerHTML = CONFIG.horas
    .map((hora) => {
      const clase = hora === estado.horaElegida ? "opcion opcion--elegida" : "opcion";
      const ocupada = dia.ocupadas.has(hora) ? "disabled" : "";
      return `<button type="button" class="${clase}" data-hora="${hora}" ${ocupada}>${hora}</button>`;
    })
    .join("");
}

function pintarResumenCita() {
  const hayHora = estado.horaElegida !== null;
  const dia = estado.agenda[estado.diaElegido];

  ponerTexto("resumen-cita", hayHora ? Agenda.texto(dia, estado.horaElegida) : "Elige día y hora");
  $("#btn-reservar").disabled = !hayHora;
}

function alElegirDia(evento) {
  const boton = evento.target.closest("[data-indice]");
  if (!boton) return;
  estado.diaElegido = Number(boton.dataset.indice);
  estado.horaElegida = null;
  pintarDias();
  pintarHoras();
  pintarResumenCita();
}

function alElegirHora(evento) {
  const boton = evento.target.closest("[data-hora]");
  if (!boton || boton.disabled) return;
  estado.horaElegida = boton.dataset.hora;
  pintarHoras();
  pintarResumenCita();
}

function alReservar() {
  if (estado.horaElegida === null) return;
  const dia = estado.agenda[estado.diaElegido];

  dia.ocupadas.add(estado.horaElegida); // el cupo deja de estar libre
  estado.citaTexto = Agenda.texto(dia, estado.horaElegida);
  mostrarConfirmacion();
}

/* 
   6. CONFIRMACIÓN
    */
function mostrarConfirmacion() {
  ponerTexto("cita", estado.citaTexto);
  ponerTexto("especialidad", estado.datos.especialidad);
  ponerTexto("nombre", estado.datos.nombre);
  ponerTexto("lugar", CONFIG.lugar);
  mostrarPantalla("confirmacion");
}

function alPulsarTengoCita() {
  if (estado.citaTexto) {
    mostrarConfirmacion();
  } else {
    $("#aviso-inicio").hidden = false;
  }
}

function alReiniciar() {
  estado.datos = {};
  estado.citaTexto = null;
  estado.indiceDocumento = 0;
  $("#aviso-inicio").hidden = true;
  mostrarPantalla("inicio");
}

/* 
   7. INICIO: se conectan todos los eventos en un solo lugar
    */
function iniciar() {
  $("#btn-empezar").addEventListener("click", () => abrirEscaneo(0));
  $("#btn-tengo-cita").addEventListener("click", alPulsarTengoCita);
  $("#btn-ayuda").addEventListener("click", () => $("#dialogo-ayuda").showModal());
  $("#btn-volver").addEventListener("click", alPulsarVolver);

  $("#btn-camara").addEventListener("click", alPulsarCamara);
  $("#form-documento").addEventListener("submit", alEnviarDocumento);

  $("#dias").addEventListener("click", alElegirDia);
  $("#horas").addEventListener("click", alElegirHora);
  $("#btn-reservar").addEventListener("click", alReservar);

  $("#btn-descargar").addEventListener("click", () => Fua.descargar(estado.datos, estado.citaTexto));
  $("#btn-reiniciar").addEventListener("click", alReiniciar);

  mostrarPantalla("inicio");
}

iniciar();

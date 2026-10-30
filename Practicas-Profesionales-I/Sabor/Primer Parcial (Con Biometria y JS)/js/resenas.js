// Ventana de reseñas del catálogo.
// Se ocupa de abrir/cerrar el modal, las estrellas, la validación y el envío.
// La calificación con la cámara vive en js/camara-dedos.js: se comunican con un
// evento ("camara:calificacion"), así que cada archivo se puede tocar por separado.

(() => {
  'use strict';

  // Todavía no hay servidor, así que las reseñas se guardan en el navegador (localStorage).
  const CLAVE_RESENAS = 'sabor_resenas';
  const EMAIL_GMAIL = /^[a-z0-9._%+-]+@gmail\.com$/i;

  const modal = document.getElementById('modal-resena');
  const form = document.getElementById('form-resena');
  if (!modal || !form) return;

  const gracias = document.getElementById('resena-gracias');
  const inputNombre = document.getElementById('resena-nombre');
  const inputEmail = document.getElementById('resena-email');
  const selectPlato = document.getElementById('resena-plato');
  const comentario = document.getElementById('resena-comentario');
  const contador = document.getElementById('resena-contador');
  const cartelError = document.getElementById('resena-error');
  const botonEnviar = form.querySelector('button[type="submit"]');
  const textoBotonEnviar = botonEnviar.textContent;
  const estrellas = form.querySelectorAll('input[name="calif_general"]');
  const insigniaVerificada = document.getElementById('badge-verificada');
  const avisoReintentar = document.getElementById('camara-reintentar');

  // true solo si la calificación actual la puso la cámara (y nadie la cambió después)
  let verificadaConCamara = false;

  /* ---------- Lista de platos ---------- */

  // El <select> se arma con los platos de los botones "Reseñar" de la página,
  // así que si se agrega un plato nuevo al catálogo aparece solo acá.
  const platos = [...new Set([...document.querySelectorAll('.btn-resenar')].map((b) => b.dataset.plato))];
  selectPlato.replaceChildren(...platos.map((plato) => new Option(plato, plato)));

  /* ---------- Abrir y cerrar ---------- */

  document.addEventListener('click', (e) => {
    const boton = e.target.closest('.btn-resenar');
    if (boton) abrir(boton.dataset.plato);
  });

  function abrir(plato) {
    if (modal.open) return;
    reiniciar();
    selectPlato.value = plato;
    document.body.classList.add('modal-abierto');
    modal.showModal();
  }

  modal.querySelectorAll('[data-cerrar]').forEach((boton) => {
    boton.addEventListener('click', () => modal.close());
  });

  // Clic en el fondo oscuro cierra. Se exige que el clic también haya empezado ahí:
  // si no, al seleccionar texto del comentario y soltar el mouse afuera se cerraría sola.
  let clicEmpezoEnFondo = false;
  modal.addEventListener('mousedown', (e) => { clicEmpezoEnFondo = e.target === modal; });
  modal.addEventListener('click', (e) => {
    if (e.target === modal && clicEmpezoEnFondo) modal.close();
  });

  // "close" salta con el botón ×, Cancelar, la tecla Esc o el clic en el fondo
  modal.addEventListener('close', () => document.body.classList.remove('modal-abierto'));

  function reiniciar() {
    form.reset();
    form.hidden = false;
    gracias.hidden = true;
    contador.textContent = '0/500';
    marcarVerificada(false);
    ocultarError();
    quitarMarcasDeError();
    botonEnviar.disabled = false;
    botonEnviar.textContent = textoBotonEnviar;
  }

  /* ---------- Contador del comentario ---------- */

  comentario.addEventListener('input', () => {
    contador.textContent = `${comentario.value.length}/${comentario.maxLength}`;
  });

  /* ---------- Estrellas y cámara ---------- */

  function marcarVerificada(valor) {
    verificadaConCamara = valor;
    insigniaVerificada.hidden = !valor;
    avisoReintentar.hidden = !valor;
  }

  // "change" solo salta cuando la persona toca las estrellas (no cuando las marca el código),
  // así que si las cambia a mano la reseña deja de figurar como verificada con cámara.
  estrellas.forEach((radio) => {
    radio.addEventListener('change', () => {
      marcarVerificada(false);
      ocultarError();
    });
  });

  // js/camara-dedos.js avisa con este evento cuando detectó un pulgar arriba/abajo
  modal.addEventListener('camara:calificacion', (e) => {
    const radio = form.querySelector(`input[name="calif_general"][value="${e.detail.estrellas}"]`);
    if (!radio) return;
    radio.checked = true;
    marcarVerificada(true);
    ocultarError();
  });

  /* ---------- Validación ---------- */

  function validar() {
    if (inputNombre.value.trim().length < 2) {
      return { campo: inputNombre, mensaje: 'Ingresá tu nombre (mínimo 2 letras).' };
    }
    if (!EMAIL_GMAIL.test(inputEmail.value.trim())) {
      return { campo: inputEmail, mensaje: 'Ingresá un Gmail válido, por ejemplo tunombre@gmail.com.' };
    }
    if (!form.querySelector('input[name="calif_general"]:checked')) {
      // Los radios están ocultos pero se pueden enfocar; se enfoca el de 1 estrella (la primera que se ve)
      return {
        campo: estrellas[estrellas.length - 1],
        mensaje: 'Elegí una calificación con las estrellas o con la cámara.'
      };
    }
    return null;
  }

  function mostrarError(mensaje) {
    cartelError.textContent = mensaje;
    cartelError.hidden = false;
  }

  function ocultarError() {
    cartelError.hidden = true;
    cartelError.textContent = '';
  }

  function quitarMarcasDeError() {
    [inputNombre, inputEmail].forEach((campo) => campo.removeAttribute('aria-invalid'));
  }

  [inputNombre, inputEmail].forEach((campo) => {
    campo.addEventListener('input', () => {
      campo.removeAttribute('aria-invalid');
      ocultarError();
    });
  });

  /* ---------- Envío ---------- */

  // Acá se reemplazaría por un fetch() al servidor cuando exista.
  // La espera de 600 ms simula el viaje de ida y vuelta.
  function guardarResena(resena) {
    return new Promise((resolver, rechazar) => {
      setTimeout(() => {
        try {
          const guardadas = JSON.parse(localStorage.getItem(CLAVE_RESENAS) || '[]');
          guardadas.push(resena);
          localStorage.setItem(CLAVE_RESENAS, JSON.stringify(guardadas));
          resolver();
        } catch (error) {
          rechazar(error);
        }
      }, 600);
    });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const problema = validar();
    if (problema) {
      quitarMarcasDeError();
      if (problema.campo.type !== 'radio') problema.campo.setAttribute('aria-invalid', 'true');
      mostrarError(problema.mensaje);
      problema.campo.focus();
      return;
    }
    ocultarError();

    const resena = {
      id: Date.now(),
      nombre: inputNombre.value.trim(),
      email: inputEmail.value.trim().toLowerCase(),
      plato: selectPlato.value,
      calificacion: Number(form.querySelector('input[name="calif_general"]:checked').value),
      comentario: comentario.value.trim(),
      verificadaConCamara,
      fecha: new Date().toISOString()
    };

    botonEnviar.disabled = true;
    botonEnviar.textContent = 'Enviando…';

    try {
      await guardarResena(resena);
    } catch (error) {
      botonEnviar.disabled = false;
      botonEnviar.textContent = textoBotonEnviar;
      mostrarError('No pudimos guardar tu reseña. Probá de nuevo en unos segundos.');
      return;
    }

    document.getElementById('gracias-nombre').textContent = resena.nombre;
    document.getElementById('gracias-plato').textContent = resena.plato;
    document.getElementById('gracias-email').textContent = resena.email;
    document.getElementById('gracias-verificada').hidden = !resena.verificadaConCamara;
    form.hidden = true;
    gracias.hidden = false;
  });
})();

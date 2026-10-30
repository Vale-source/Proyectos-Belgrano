// Calificación con la cámara: pulgar arriba 👍 = 5 estrellas, pulgar abajo 👎 = 1 estrella.
//
// Cómo funciona:
//  1. TensorFlow.js (modelo "hand-pose-detection") encuentra 21 puntos de la mano en cada cuadro del video.
//  2. clasificarGesto() mira la geometría de esos puntos y decide si es pulgar arriba, abajo o nada.
//  3. Si el mismo gesto se mantiene SEGUNDOS_PARA_CONFIRMAR segundos, se avisa a js/resenas.js
//     con el evento "camara:calificacion" y se apaga la cámara.
//
// Todo se procesa en el navegador: el video no se guarda ni se envía a ningún lado.
// Las librerías pesan unos MB, así que recién se descargan la primera vez que se toca el botón de la cámara.

(() => {
  'use strict';

  /* ---------- Ajustes (se pueden tocar) ---------- */

  // Si cambiás este número, actualizá también el texto de ayuda de catalogo.html ("mantené la mano firme 5 segundos")
  const SEGUNDOS_PARA_CONFIRMAR = 5;
  const TOLERANCIA_MS = 600;    // si la detección parpadea menos que esto, la cuenta no se reinicia
  const FPS_DETECCION = 15;     // no hace falta analizar los 60 cuadros por segundo
  const TIPO_MODELO = 'full';   // 'lite' es más rápido (celulares viejos), 'full' es más preciso
  const CONFIANZA_MINIMA = 0.6; // seguridad mínima del modelo para aceptar una mano
  const PALMA_MINIMA_PX = 25;   // si la palma se ve más chica que esto, la mano está muy lejos

  // Versiones fijas: así la página no se rompe si sale una versión nueva
  const URL_TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const URL_HANDPOSE = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1';
  const URL_MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

  // Se intenta primero con TensorFlow.js puro (WebGL). Si no arranca o devuelve números inválidos
  // en esa compu, se prueba con la versión de MediaPipe, que usa los mismos modelos.
  const MOTORES = ['tfjs', 'mediapipe'];

  /* ---------- Puntos de la mano (21 puntos del modelo de MediaPipe) ---------- */

  const MUNECA = 0;
  const PULGAR_MCP = 2;
  const PULGAR_IP = 3;
  const PULGAR_PUNTA = 4;
  const MEDIO_MCP = 9;
  // Los otros cuatro dedos: articulación del medio (pip) y la punta
  const DEDOS = [
    { pip: 6, punta: 8 },
    { pip: 10, punta: 12 },
    { pip: 14, punta: 16 },
    { pip: 18, punta: 20 }
  ];
  // Pares de puntos que se unen con una línea para dibujar el esqueleto de la mano
  const HUESOS = [
    [0, 1], [1, 2], [2, 3], [3, 4],
    [0, 5], [5, 6], [6, 7], [7, 8],
    [0, 9], [9, 10], [10, 11], [11, 12],
    [0, 13], [13, 14], [14, 15], [15, 16],
    [0, 17], [17, 18], [18, 19], [19, 20],
    [5, 9], [9, 13], [13, 17]
  ];

  /* ---------- Reconocer el gesto ---------- */

  // Distancia entre dos puntos (si tienen z, la usa: así no importa tanto hacia dónde mira la mano)
  function distancia(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  }

  function puntosValidos(puntos) {
    return puntos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }

  // Recibe una mano del modelo y devuelve 'arriba', 'abajo' o null.
  // Un pulgar arriba/abajo cumple cuatro cosas a la vez:
  //   1) los otros dedos están doblados (puño cerrado)
  //   2) el pulgar está derecho (no doblado)
  //   3) el pulgar apunta de forma bastante vertical
  //   4) la punta del pulgar sobresale por arriba (o por abajo) de las puntas de los otros dedos
  function clasificarGesto(mano) {
    const p2 = mano && mano.keypoints; // en píxeles del video: sirve para saber qué es "arriba"
    if (!p2 || p2.length < 21 || !puntosValidos(p2)) return null;

    // Las coordenadas 3D (en metros) no se deforman cuando la mano gira, así que se prefieren para medir
    const p3 = mano.keypoints3D && mano.keypoints3D.length === 21 && puntosValidos(mano.keypoints3D)
      ? mano.keypoints3D
      : p2;

    // El largo de la palma (muñeca → nudillo del medio) es la regla para comparar el resto
    const palma2 = distancia(p2[MUNECA], p2[MEDIO_MCP]);
    const palma3 = distancia(p3[MUNECA], p3[MEDIO_MCP]);
    if (palma2 < PALMA_MINIMA_PX || palma3 === 0) return null;

    // 1) Dedo doblado = su punta quedó más cerca de la muñeca que su articulación del medio.
    //    Alcanza con 3 de 4: el meñique suele salir movido.
    const doblados = DEDOS.filter((d) => distancia(p3[d.punta], p3[MUNECA]) < distancia(p3[d.pip], p3[MUNECA])).length;
    if (doblados < 3) return null;

    // 2) Pulgar derecho: los tres puntos (nudillo, articulación, punta) casi en línea recta
    const tramo = distancia(p3[PULGAR_MCP], p3[PULGAR_IP]) + distancia(p3[PULGAR_IP], p3[PULGAR_PUNTA]);
    if (tramo === 0 || distancia(p3[PULGAR_MCP], p3[PULGAR_PUNTA]) / tramo < 0.8) return null;

    // 3) Dirección del pulgar en la imagen (acá la y crece hacia abajo, así que dy negativo = apunta arriba)
    const dx = p2[PULGAR_PUNTA].x - p2[PULGAR_MCP].x;
    const dy = p2[PULGAR_PUNTA].y - p2[PULGAR_MCP].y;
    const largo = Math.hypot(dx, dy);
    if (largo < 0.5 * palma2) return null;     // el pulgar apunta a la cámara: no se sabe si sube o baja
    if (Math.abs(dy) / largo < 0.7) return null; // más de ~45° de inclinación: ya no es vertical

    // 4) La punta del pulgar tiene que sobresalir del puño en la dirección en la que apunta. Se mide a lo largo
    //    del propio pulgar (y no solo en altura) para que funcione aunque la mano esté inclinada.
    //    Esto evita confundirlo con un puño cerrado que tiene el pulgar apoyado al costado.
    const ux = dx / largo;
    const uy = dy / largo;
    const avance = (p) => p.x * ux + p.y * uy;
    const sobresale = avance(p2[PULGAR_PUNTA]) - Math.max(...DEDOS.map((d) => avance(p2[d.punta])));
    if (sobresale < 0.25 * palma2) return null;

    return dy < 0 ? 'arriba' : 'abajo';
  }

  // Se expone para poder probar el reconocimiento aparte, sin cámara
  window.CamaraDedos = { clasificarGesto };

  /* ---------- Elementos de la página ---------- */

  const modal = document.getElementById('modal-resena');
  const botonCamara = document.getElementById('btn-camara');
  const textoBotonCamara = document.getElementById('btn-camara-texto');
  const panel = document.getElementById('panel-camara');
  const lienzo = document.getElementById('camara-lienzo');
  const textoEstado = document.getElementById('camara-texto');
  const cartelError = document.getElementById('camara-error');
  const botonCerrar = document.getElementById('camara-cerrar');
  if (!modal || !botonCamara || !panel || !lienzo) return;

  const TEXTO_ORIGINAL_BOTON = textoBotonCamara.textContent;

  /* ---------- Cargar TensorFlow.js ---------- */

  function cargarScript(url) {
    return new Promise((resolver, rechazar) => {
      const script = document.createElement('script');
      script.src = url;
      script.async = true;
      script.onload = resolver;
      script.onerror = () => {
        script.remove();
        rechazar(new Error(`No se pudo descargar ${url}`));
      };
      document.head.appendChild(script);
    });
  }

  let promesaLibrerias = null;
  function cargarLibrerias() {
    if (!promesaLibrerias) {
      promesaLibrerias = (async () => {
        if (!window.tf) await cargarScript(URL_TFJS);
        if (!window.handPoseDetection) await cargarScript(URL_HANDPOSE);
      })().catch((error) => {
        promesaLibrerias = null; // que se pueda reintentar si fue un corte de internet
        throw error;
      });
    }
    return promesaLibrerias;
  }

  /* ---------- Crear el detector de manos ---------- */

  let indiceMotor = 0;        // en qué motor de MOTORES estamos
  let promesaDetector = null; // el detector se crea una sola vez y se reutiliza

  async function crearDetector() {
    await cargarLibrerias();
    await window.tf.ready();

    let ultimoError = new Error('Ningún motor de detección está disponible');
    while (indiceMotor < MOTORES.length) {
      const motor = MOTORES[indiceMotor];
      try {
        const config = { runtime: motor, modelType: TIPO_MODELO, maxHands: 1 };
        if (motor === 'mediapipe') {
          config.solutionPath = URL_MEDIAPIPE;
          if (!window.Hands) await cargarScript(`${URL_MEDIAPIPE}/hands.js`);
        }
        return await window.handPoseDetection.createDetector(
          window.handPoseDetection.SupportedModels.MediaPipeHands,
          config
        );
      } catch (error) {
        console.warn(`Camara: no arrancó el motor "${motor}", se prueba el siguiente.`, error);
        ultimoError = error;
        indiceMotor++;
      }
    }
    throw ultimoError;
  }

  function obtenerDetector() {
    if (!promesaDetector) {
      promesaDetector = crearDetector().catch((error) => {
        promesaDetector = null;
        throw error;
      });
    }
    return promesaDetector;
  }

  // Si un motor devuelve coordenadas inválidas (NaN), se descarta y se pasa al siguiente
  async function pasarAlSiguienteMotor() {
    const viejo = promesaDetector && (await promesaDetector.catch(() => null));
    if (viejo && viejo.dispose) viejo.dispose();
    promesaDetector = null;
    indiceMotor++;
    return obtenerDetector();
  }

  /* ---------- Mensajes en pantalla ---------- */

  let ultimoTexto = '';
  function ponerTexto(texto) {
    // Solo se toca el DOM si cambió: el texto es un aria-live y no queremos que el lector de pantalla repita lo mismo
    if (texto === ultimoTexto) return;
    ultimoTexto = texto;
    textoEstado.textContent = texto;
  }

  // 'ok' = se está detectando un gesto (verde), 'aviso' = todavía no (ámbar). Los colores están en styles.css
  function ponerEstado(estado) {
    if (estado) panel.dataset.estado = estado;
    else panel.removeAttribute('data-estado');
  }

  function mostrarError(mensaje) {
    cartelError.textContent = mensaje;
    cartelError.hidden = false;
  }

  function ocultarError() {
    cartelError.hidden = true;
    cartelError.textContent = '';
  }

  /* ---------- Abrir y cerrar la cámara ---------- */

  let sesion = null;     // lo que está activo mientras la cámara está abierta (null = cerrada)

  function liberar(s) {
    if (!s) return;
    cancelAnimationFrame(s.cuadro);
    if (s.stream) s.stream.getTracks().forEach((pista) => pista.stop()); // apaga la luz de la cámara
    if (s.video) {
      s.video.srcObject = null;
      s.video.remove();
    }
    if (s.lienzo) s.lienzo.remove();
  }

  function cerrarCamara() {
    liberar(sesion);
    sesion = null;
    panel.hidden = true;
    ponerEstado(null);
    ocultarError();
    ponerTexto('');
    botonCamara.disabled = false;
    textoBotonCamara.textContent = TEXTO_ORIGINAL_BOTON;
  }

  // Algo salió mal: se apaga la cámara pero el panel queda abierto para mostrar el motivo
  function fallar(mensaje) {
    liberar(sesion);
    sesion = null;
    ponerEstado(null);
    ponerTexto('');
    mostrarError(mensaje);
    botonCamara.disabled = false;
    textoBotonCamara.textContent = TEXTO_ORIGINAL_BOTON;
  }

  function mensajeDeErrorDeCamara(error) {
    switch (error && error.name) {
      case 'NotAllowedError':
      case 'SecurityError':
        return 'No tenemos permiso para usar la cámara. Habilitala desde el candado de la barra de direcciones y volvé a intentar.';
      case 'NotFoundError':
      case 'OverconstrainedError':
        return 'No encontramos una cámara en este dispositivo. Podés calificar tocando las estrellas.';
      case 'NotReadableError':
        return 'No pudimos acceder a la cámara: puede que otra aplicación la esté usando.';
      default:
        return 'No pudimos abrir la cámara. Podés calificar tocando las estrellas.';
    }
  }

  async function abrirCamara() {
    if (sesion) return;

    panel.hidden = false;
    ocultarError();
    ponerEstado(null);
    botonCamara.disabled = true;
    textoBotonCamara.textContent = 'Abriendo cámara…';
    ponerTexto('Pidiendo permiso para usar la cámara…');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      fallar('Este navegador no permite usar la cámara. Probá abrir la página desde localhost o https, o calificá con las estrellas.');
      return;
    }

    const s = {
      stream: null,
      video: null,
      lienzo: null,
      ctx: null,
      detector: null,
      cuadro: 0,            // id del requestAnimationFrame
      procesando: false,    // hay un análisis en curso
      ultimoAnalisis: 0,
      cambiandoMotor: false,
      cuadrosInvalidos: 0,  // cuántos análisis seguidos devolvieron NaN
      mano: null,           // última mano detectada (para dibujarla)
      gesto: null,          // 'arriba' | 'abajo' | null
      inicioGesto: 0,
      ultimoVisto: 0,       // última vez que se vio el gesto (para la tolerancia)
      progreso: 0,          // 0 a 1
      confirmada: false
    };
    sesion = s;

    // 1) Cámara
    try {
      s.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (sesion !== s) { // se cerró el modal mientras estaba el cartel de permiso
        liberar(s);
        return;
      }

      // Este <video> no se ve (ver .camara__video en styles.css): solo alimenta al modelo
      s.video = document.createElement('video');
      s.video.className = 'camara__video';
      s.video.setAttribute('playsinline', ''); // necesario en iPhone
      s.video.muted = true;
      s.video.srcObject = s.stream;
      lienzo.appendChild(s.video);
      await s.video.play();
      if (sesion !== s) return;
    } catch (error) {
      if (sesion !== s) return; // ya estaba cerrada: no hay nada que mostrar
      console.error('Camara:', error);
      fallar(mensajeDeErrorDeCamara(error));
      return;
    }

    // Lo que se ve es este canvas: el video espejado (como un espejo) con la mano dibujada encima
    s.lienzo = document.createElement('canvas');
    s.lienzo.width = s.video.videoWidth || 640;
    s.lienzo.height = s.video.videoHeight || 480;
    s.lienzo.setAttribute('role', 'img');
    s.lienzo.setAttribute('aria-label', 'Vista de tu cámara');
    s.ctx = s.lienzo.getContext('2d');
    lienzo.appendChild(s.lienzo);
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); // en pantallas chicas, que se vea todo el panel

    textoBotonCamara.textContent = 'Cámara abierta';
    ponerTexto('Cargando el reconocimiento de manos… la primera vez puede tardar unos segundos.');
    s.cuadro = requestAnimationFrame(bucle);

    // 2) Modelo de TensorFlow.js (el video ya se ve mientras se descarga)
    try {
      const detector = await obtenerDetector();
      if (sesion === s) s.detector = detector;
    } catch (error) {
      if (sesion !== s) return;
      console.error('Camara:', error);
      fallar('No pudimos cargar el reconocimiento de manos (revisá tu conexión a internet). Podés calificar tocando las estrellas.');
    }
  }

  /* ---------- Bucle principal ---------- */

  function bucle(ahoraRaf) {
    const s = sesion;
    if (!s) return;
    s.cuadro = requestAnimationFrame(bucle);

    dibujar(s);

    if (s.detector && !s.procesando && !s.cambiandoMotor && !s.confirmada &&
        ahoraRaf - s.ultimoAnalisis >= 1000 / FPS_DETECCION) {
      s.ultimoAnalisis = ahoraRaf;
      s.procesando = true;
      s.detector.estimateHands(s.video, { flipHorizontal: false })
        .then((manos) => {
          if (sesion === s) procesarManos(s, manos);
        })
        .catch((error) => {
          console.error('Camara:', error);
          if (sesion === s) fallar('El reconocimiento de manos dejó de funcionar. Podés calificar tocando las estrellas.');
        })
        .finally(() => { s.procesando = false; });
    }

    actualizarGesto(s);
  }

  function procesarManos(s, manos) {
    const mano = manos && manos[0];

    // Algunas compus devuelven coordenadas NaN con el motor WebGL: en ese caso se cambia de motor
    if (mano && !puntosValidos(mano.keypoints)) {
      s.mano = null;
      s.gesto = null;
      if (++s.cuadrosInvalidos >= 3 && !s.cambiandoMotor) {
        s.cambiandoMotor = true;
        s.detector = null;
        pasarAlSiguienteMotor()
          .then((detector) => {
            if (sesion !== s) return;
            s.detector = detector;
            s.cuadrosInvalidos = 0;
            s.cambiandoMotor = false;
          })
          .catch((error) => {
            console.error('Camara:', error);
            if (sesion === s) fallar('No pudimos iniciar el reconocimiento de manos en este dispositivo. Podés calificar tocando las estrellas.');
          });
      }
      return;
    }
    s.cuadrosInvalidos = 0;

    s.mano = mano && (mano.score === undefined || mano.score >= CONFIANZA_MINIMA) ? mano : null;
    const gesto = s.mano ? clasificarGesto(s.mano) : null;
    const ahora = performance.now();

    if (gesto) {
      if (gesto !== s.gesto) { // empezó un gesto nuevo (o cambió de arriba a abajo): la cuenta arranca de cero
        s.gesto = gesto;
        s.inicioGesto = ahora;
      }
      s.ultimoVisto = ahora;
    }
  }

  // Corre en cada cuadro: avanza la cuenta de segundos y actualiza el mensaje
  function actualizarGesto(s) {
    if (s.confirmada) return;
    const ahora = performance.now();

    // Si el gesto no se ve hace más de TOLERANCIA_MS, se pierde la cuenta
    if (s.gesto && ahora - s.ultimoVisto > TOLERANCIA_MS) s.gesto = null;

    s.progreso = s.gesto ? Math.min(1, (ahora - s.inicioGesto) / (SEGUNDOS_PARA_CONFIRMAR * 1000)) : 0;
    if (s.gesto && s.progreso >= 1) {
      confirmar(s);
      return;
    }

    if (s.gesto) {
      const restantes = Math.ceil(SEGUNDOS_PARA_CONFIRMAR - (ahora - s.inicioGesto) / 1000);
      const nombre = s.gesto === 'arriba' ? 'Pulgar arriba 👍 = 5 estrellas' : 'Pulgar abajo 👎 = 1 estrella';
      ponerEstado('ok');
      ponerTexto(`${nombre}. Mantenelo firme ${restantes} s`);
    } else if (!s.detector) {
      ponerEstado(null); // todavía cargando el modelo
    } else if (s.mano) {
      ponerEstado('aviso');
      ponerTexto('Cerrá el puño y dejá solo el pulgar hacia arriba 👍 o hacia abajo 👎');
    } else {
      ponerEstado('aviso');
      ponerTexto('No vemos tu mano. Ponela frente a la cámara, con buena luz');
    }
  }

  function confirmar(s) {
    s.confirmada = true;
    const estrellas = s.gesto === 'arriba' ? 5 : 1;
    s.progreso = 1;
    ponerEstado('ok');
    ponerTexto(`¡Listo! Registramos ${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'} ✓`);

    // js/resenas.js escucha este evento y marca las estrellas
    modal.dispatchEvent(new CustomEvent('camara:calificacion', { detail: { estrellas, gesto: s.gesto } }));

    // Un momento para que se vea el mensaje de éxito antes de apagar la cámara
    setTimeout(() => {
      if (sesion === s) cerrarCamara();
    }, 900);
  }

  /* ---------- Dibujo ---------- */

  function dibujar(s) {
    const { ctx, lienzo: canvas, video } = s;
    if (!ctx || video.readyState < 2) return;
    const ancho = canvas.width;
    const alto = canvas.height;

    // Video espejado: si movés la mano a la derecha, en pantalla también va a la derecha
    ctx.save();
    ctx.translate(ancho, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, ancho, alto);
    ctx.restore();

    if (s.mano) {
      const color = s.gesto ? '#2e9e45' : '#ffffff';
      const punto = (i) => ({ x: ancho - s.mano.keypoints[i].x, y: s.mano.keypoints[i].y }); // x espejada

      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = color;
      ctx.beginPath();
      HUESOS.forEach(([a, b]) => {
        const pa = punto(a);
        const pb = punto(b);
        ctx.moveTo(pa.x, pa.y);
        ctx.lineTo(pb.x, pb.y);
      });
      ctx.stroke();

      ctx.fillStyle = color;
      for (let i = 0; i < 21; i++) {
        const p = punto(i);
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === PULGAR_PUNTA ? 7 : 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Gesto detectado: ícono arriba a la izquierda + barra de progreso abajo
    if (s.gesto) {
      ctx.font = '48px system-ui, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(s.gesto === 'arriba' ? '👍' : '👎', 14, 10);
    }
    if (s.progreso > 0) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
      ctx.fillRect(0, alto - 10, ancho, 10);
      ctx.fillStyle = '#2e9e45';
      ctx.fillRect(0, alto - 10, ancho * s.progreso, 10);
    }
  }

  /* ---------- Eventos ---------- */

  botonCamara.addEventListener('click', abrirCamara);
  botonCerrar.addEventListener('click', cerrarCamara);

  // Si se cierra el modal (×, Cancelar, Esc) la cámara se apaga sola
  modal.addEventListener('close', cerrarCamara);

  // Si se cambia de pestaña, también se apaga: la luz de la cámara no debería quedar prendida de fondo
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sesion) cerrarCamara();
  });
})();

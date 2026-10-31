

(() => {
  'use strict';

  /* ---------- Ajustes---------- */


  const SEGUNDOS_PARA_CONFIRMAR = 5;
  const TOLERANCIA_MS = 600;    
  const FPS_DETECCION = 15;     
  const TIPO_MODELO = 'full';   
  const CONFIANZA_MINIMA = 0.6; 
  const PALMA_MINIMA_PX = 25;   

  // Versiones fijas: así la página no se rompe si sale una versión nueva
  const URL_TFJS = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';
  const URL_HANDPOSE = 'https://cdn.jsdelivr.net/npm/@tensorflow-models/hand-pose-detection@2.0.1';
  const URL_MEDIAPIPE = 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240';

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

  function distancia(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0));
  }

  function puntosValidos(puntos) {
    return puntos.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  }


  function clasificarGesto(mano) {
    const p2 = mano && mano.keypoints; 
    if (!p2 || p2.length < 21 || !puntosValidos(p2)) return null;

    const p3 = mano.keypoints3D && mano.keypoints3D.length === 21 && puntosValidos(mano.keypoints3D)
      ? mano.keypoints3D
      : p2;


    const palma2 = distancia(p2[MUNECA], p2[MEDIO_MCP]);
    const palma3 = distancia(p3[MUNECA], p3[MEDIO_MCP]);
    if (palma2 < PALMA_MINIMA_PX || palma3 === 0) return null;


    const doblados = DEDOS.filter((d) => distancia(p3[d.punta], p3[MUNECA]) < distancia(p3[d.pip], p3[MUNECA])).length;
    if (doblados < 3) return null;


    const tramo = distancia(p3[PULGAR_MCP], p3[PULGAR_IP]) + distancia(p3[PULGAR_IP], p3[PULGAR_PUNTA]);
    if (tramo === 0 || distancia(p3[PULGAR_MCP], p3[PULGAR_PUNTA]) / tramo < 0.8) return null;

    const dx = p2[PULGAR_PUNTA].x - p2[PULGAR_MCP].x;
    const dy = p2[PULGAR_PUNTA].y - p2[PULGAR_MCP].y;
    const largo = Math.hypot(dx, dy);
    if (largo < 0.5 * palma2) return null;     
    if (Math.abs(dy) / largo < 0.7) return null; 


    const ux = dx / largo;
    const uy = dy / largo;
    const avance = (p) => p.x * ux + p.y * uy;
    const sobresale = avance(p2[PULGAR_PUNTA]) - Math.max(...DEDOS.map((d) => avance(p2[d.punta])));
    if (sobresale < 0.25 * palma2) return null;

    return dy < 0 ? 'arriba' : 'abajo';
  }

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
        promesaLibrerias = null; 
        throw error;
      });
    }
    return promesaLibrerias;
  }

  /* ---------- Crear el detector de manos ---------- */

  let indiceMotor = 0;       
  let promesaDetector = null; 

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
    if (texto === ultimoTexto) return;
    ultimoTexto = texto;
    textoEstado.textContent = texto;
  }


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

  let sesion = null;     

  function liberar(s) {
    if (!s) return;
    cancelAnimationFrame(s.cuadro);
    if (s.stream) s.stream.getTracks().forEach((pista) => pista.stop()); 
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
      cuadro: 0,            
      procesando: false,    
      ultimoAnalisis: 0,
      cambiandoMotor: false,
      cuadrosInvalidos: 0,  
      mano: null,           
      gesto: null,          
      inicioGesto: 0,
      ultimoVisto: 0,       
      progreso: 0,          
      confirmada: false
    };
    sesion = s;


    try {
      s.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false
      });
      if (sesion !== s) { 
        liberar(s);
        return;
      }


      s.video = document.createElement('video');
      s.video.className = 'camara__video';
      s.video.setAttribute('playsinline', ''); 
      s.video.muted = true;
      s.video.srcObject = s.stream;
      lienzo.appendChild(s.video);
      await s.video.play();
      if (sesion !== s) return;
    } catch (error) {
      if (sesion !== s) return; 
      console.error('Camara:', error);
      fallar(mensajeDeErrorDeCamara(error));
      return;
    }

  
    s.lienzo = document.createElement('canvas');
    s.lienzo.width = s.video.videoWidth || 640;
    s.lienzo.height = s.video.videoHeight || 480;
    s.lienzo.setAttribute('role', 'img');
    s.lienzo.setAttribute('aria-label', 'Vista de tu cámara');
    s.ctx = s.lienzo.getContext('2d');
    lienzo.appendChild(s.lienzo);
    panel.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); 

    textoBotonCamara.textContent = 'Cámara abierta';
    ponerTexto('Cargando el reconocimiento de manos… la primera vez puede tardar unos segundos.');
    s.cuadro = requestAnimationFrame(bucle);

    
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
      if (gesto !== s.gesto) { 
        s.gesto = gesto;
        s.inicioGesto = ahora;
      }
      s.ultimoVisto = ahora;
    }
  }

  function actualizarGesto(s) {
    if (s.confirmada) return;
    const ahora = performance.now();

  
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
      ponerEstado(null); 
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


    modal.dispatchEvent(new CustomEvent('camara:calificacion', { detail: { estrellas, gesto: s.gesto } }));


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


  modal.addEventListener('close', cerrarCamara);


  document.addEventListener('visibilitychange', () => {
    if (document.hidden && sesion) cerrarCamara();
  });
})();

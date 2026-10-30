// Cartel "Abierto ahora" / "Cerrado ahora" para cada sucursal.
// Los horarios salen de los atributos data-apertura y data-cierre de cada tarjeta,
// así que si se cambian en el HTML no hay que tocar este archivo.

// Zona horaria de las sedes: así el resultado es el mismo sin importar
// desde dónde se abra la página (por ejemplo, otro país o una compu mal configurada).
const ZONA_HORARIA = 'America/Argentina/Mendoza';

// Las sedes atienden de lunes a viernes ("Lun a Vie")
const DIAS_ABIERTO = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// Devuelve el día de la semana y los minutos transcurridos desde las 00:00
function obtenerAhora() {
  try {
    const partes = new Intl.DateTimeFormat('en-US', {
      timeZone: ZONA_HORARIA,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(new Date());

    const valor = (tipo) => partes.find((p) => p.type === tipo).value;
    return {
      dia: valor('weekday'),
      minutos: parseInt(valor('hour'), 10) * 60 + parseInt(valor('minute'), 10)
    };
  } catch (error) {
    // Plan B: si el navegador no soporta la zona horaria, usamos la hora local
    const ahora = new Date();
    const dias = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { dia: dias[ahora.getDay()], minutos: ahora.getHours() * 60 + ahora.getMinutes() };
  }
}

// Convierte "07:30" en minutos (450). Un cierre a las "00:00" cuenta como medianoche (1440),
// porque si no la sede de la noche (20:00 a 00:00) nunca figuraría abierta.
function aMinutos(hhmm, esCierre) {
  const [horas, minutos] = hhmm.split(':').map(Number);
  const total = horas * 60 + minutos;
  return esCierre && total === 0 ? 24 * 60 : total;
}

function estaAbierta(sucursal, ahora) {
  if (!DIAS_ABIERTO.includes(ahora.dia)) return false;

  const apertura = aMinutos(sucursal.dataset.apertura, false);
  const cierre = aMinutos(sucursal.dataset.cierre, true);

  // Abre justo a la hora de apertura y cierra justo a la hora de cierre
  return ahora.minutos >= apertura && ahora.minutos < cierre;
}

function actualizarEstados() {
  const ahora = obtenerAhora();

  document.querySelectorAll('.sucursal').forEach((sucursal) => {
    const cartel = sucursal.querySelector('.estado');
    if (!cartel) return;

    const abierta = estaAbierta(sucursal, ahora);
    const texto = abierta ? 'Abierto ahora' : 'Cerrado ahora';
    // Solo se toca el DOM si cambió, para no molestar a los lectores de pantalla
    if (cartel.textContent !== texto) cartel.textContent = texto;
    cartel.classList.toggle('abierto', abierta);
    cartel.classList.toggle('cerrado', !abierta);
  });
}

actualizarEstados();
// Se vuelve a calcular cada 30 segundos, así el cartel cambia solo sin recargar la página
setInterval(actualizarEstados, 30 * 1000);

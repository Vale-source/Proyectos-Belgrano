// Variables principales del juego
let numeroSecreto = 0;
let intentosRestantes = 0;
let numeroMaximo = 50;
let historialNumeros = [];
let juegoTerminado = false;

// Referencias a los elementos del HTML
const selectorDificultad = document.getElementById("selector-dificultad");
const textoRango = document.getElementById("texto-rango");
const inputNumero = document.getElementById("numero-usuario");
const btnAdivinar = document.getElementById("btn-adivinar");
const cajaMensaje = document.getElementById("caja-mensaje");
const mensajeJuego = document.getElementById("mensaje-juego");
const textoIntentos = document.getElementById("intentos-restantes");
const textoHistorial = document.getElementById("historial-intentos");
const btnReiniciar = document.getElementById("btn-reiniciar");

// Funcion para empezar o reiniciar una partida
function iniciarJuego() {
    // Leemos que dificultad esta elegida
    const dificultad = selectorDificultad.value;

    if (dificultad === "facil") {
        numeroMaximo = 10;
        intentosRestantes = 5;
    } else if (dificultad === "medio") {
        numeroMaximo = 50;
        intentosRestantes = 7;
    } else if (dificultad === "dificil") {
        numeroMaximo = 100;
        intentosRestantes = 5;
    }

    // Generamos un numero al azar entre 1 y el maximo
    numeroSecreto = Math.floor(Math.random() * numeroMaximo) + 1;

    // Reseteamos las variables de estado
    historialNumeros = [];
    juegoTerminado = false;

    // Actualizamos la pantalla con los valores iniciales
    textoRango.innerHTML = "Estoy pensando un número entre <strong>1</strong> y <strong>" + numeroMaximo + "</strong>";
    inputNumero.max = numeroMaximo;
    inputNumero.value = "";
    inputNumero.disabled = false;
    btnAdivinar.disabled = false;

    textoIntentos.textContent = intentosRestantes;
    textoHistorial.textContent = "-";

    // Mensaje de bienvenida
    mostrarMensaje("¡Mucha suerte! Haz tu primer intento.", "");

    // Ponemos el cursor listo en el campo para escribir
    inputNumero.focus();
}

// Funcion que comprueba el numero ingresado por el jugador
function verificarNumero() {
    // Si la partida ya termino, no hacemos nada
    if (juegoTerminado) {
        return;
    }

    // Convertimos lo que escribio el usuario a numero entero
    const numeroIngresado = parseInt(inputNumero.value);

    // Validamos que haya puesto un numero dentro del rango
    if (isNaN(numeroIngresado) || numeroIngresado < 1 || numeroIngresado > numeroMaximo) {
        mostrarMensaje("Por favor ingresa un número válido entre 1 y " + numeroMaximo, "mensaje-pista");
        inputNumero.value = "";
        inputNumero.focus();
        return;
    }

    // Guardamos el numero en el historial y restamos un intento
    historialNumeros.push(numeroIngresado);
    intentosRestantes--;

    // Actualizamos la informacion en la pantalla
    textoIntentos.textContent = intentosRestantes;
    textoHistorial.textContent = historialNumeros.join(", ");

    // Comparamos el numero con el secreto
    if (numeroIngresado === numeroSecreto) {
        // El jugador gano
        const intentosUsados = historialNumeros.length;
        mostrarMensaje("¡Excelente! Adivinaste el número en " + intentosUsados + " intentos.", "mensaje-ganaste");
        finalizarPartida();
    } else if (intentosRestantes === 0) {
        // Se acabaron los intentos y perdio
        mostrarMensaje("¡Te quedaste sin intentos! El número secreto era " + numeroSecreto + ".", "mensaje-perdiste");
        finalizarPartida();
    } else if (numeroIngresado < numeroSecreto) {
        // Pista: es mayor
        mostrarMensaje("El número secreto es MAYOR que " + numeroIngresado + " ⬆️", "mensaje-pista");
    } else {
        // Pista: es menor
        mostrarMensaje("El número secreto es MENOR que " + numeroIngresado + " ⬇️", "mensaje-pista");
    }

    // Limpiamos el input para el siguiente intento
    inputNumero.value = "";
    inputNumero.focus();
}

// Funcion auxiliar para mostrar el texto y cambiar el color de la caja
function mostrarMensaje(texto, claseColor) {
    mensajeJuego.textContent = texto;
    cajaMensaje.className = "caja-mensaje " + claseColor;
}

// Bloquea los controles cuando termina el juego
function finalizarPartida() {
    juegoTerminado = true;
    inputNumero.disabled = true;
    btnAdivinar.disabled = true;
}

// Eventos de botones y teclado
btnAdivinar.addEventListener("click", verificarNumero);

// Tambien permite probar apretando la tecla Enter
inputNumero.addEventListener("keypress", function (evento) {
    if (evento.key === "Enter") {
        verificarNumero();
    }
});

// Cuando se cambia la dificultad, se reinicia la partida con el nuevo rango
selectorDificultad.addEventListener("change", iniciarJuego);

// Boton para jugar otra vez
btnReiniciar.addEventListener("click", iniciarJuego);

// Iniciar el juego automaticamente al abrir la pagina
iniciarJuego();

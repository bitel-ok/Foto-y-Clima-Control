/* * DASHBOARD + PORTARRETRATOS - VANILLA ES5
 * Optimizado para Samsung Tab 3 Lite (Android 4.2.2)
 */

// --- CONFIGURACIÓN CLIMA ---
var GAS_URL = "https://script.google.com/macros/s/AKfycbz_dcFsbF5HE6yXBQk6rI8nyhJtTmuwdg9OtkK7_gJCBK4qplPbxn9A7cVMBnvOVoIe/exec"; 
var INTERVALO_CLIMA = 15 * 60 * 1000; // 15 min

// --- CONFIGURACIÓN PORTARRETRATOS (NUEVO) ---
// TIEMPO_INACTIVIDAD: 20 minutos (20 * 60 * 1000 ms)
var TIEMPO_INACTIVIDAD = 20 * 60 * 1000; 
// INTERVALO_FOTOS: Tiempo entre cambio de foto (ej. 30 segundos)
var INTERVALO_FOTOS = 30 * 1000; 

// LISTA DE FOTOS (Crucial: Usar URLs reales y optimizadas < 100KB cada una)
// Puedes subirlas a la misma carpeta de GitHub.
var listaFotos = [
    "fotos/foto1.jpg",
    "fotos/foto2.jpg",
    "fotos/foto3.jpg"
    // Añade máx 5-10 fotos para no saturar caché del navegador
];

// --- VARIABLES DE ESTADO ---
var timerInactividad;
var intervalorRotacionFotos;
var indiceFotoActual = 0;
var modoPortarretratosActivo = false;
var dom = {}; // Caché de elementos DOM

// --- INICIALIZACIÓN ---
function inicializar() {
    // Cachear elementos DOM (Mejora rendimiento en JS viejo)
    dom.cuerpo = document.getElementById('cuerpo');
    dom.dashboard = document.getElementById('app');
    dom.fotoContenedor = document.getElementById('portarretratos-container');
    dom.fotoImg = document.getElementById('foto-frame');

    // Inicializar Clima
    actualizarClima();
    setInterval(actualizarClima, INTERVALO_CLIMA);

    // --- Configurar Detección de Actividad ---
    // 'touchstart' es fundamental en tablets viejas, 'mousedown' para pruebas en PC
    document.addEventListener('touchstart', resetearTemporizadorInactividad, false);
    document.addEventListener('mousedown', resetearTemporizadorInactividad, false);

    // Iniciar temporizador por primera vez
    resetearTemporizadorInactividad();
}

// --- LÓGICA DE INACTIVIDAD (El núcleo del portarretratos) ---

function resetearTemporizadorInactividad() {
    // Si el portarretratos está activo, lo quitamos inmediatamente al tocar
    if (modoPortarretratosActivo) {
        desactivarPortarretratos();
    }

    // Limpiamos el temporizador existente
    clearTimeout(timerInactividad);

    // Volvemos a empezar la cuenta atrás
    timerInactividad = setTimeout(activarPortarretratos, TIEMPO_INACTIVIDAD);
}

function activarPortarretratos() {
    if (modoPortarretratosActivo) return; // Ya está activo

    console.log("Activando modo portarretratos por inactividad.");
    modoPortarretratosActivo = true;

    // UI: Mostramos contenedor de fotos, ocultamos dashboard
    dom.fotoContenedor.style.display = "block";
    dom.dashboard.style.display = "none";
    dom.cuerpo.className = "modo-foto";

    // Iniciamos la rotación de fotos inmediatamente
    mostrarSiguienteFoto();
    intervalorRotacionFotos = setInterval(mostrarSiguienteFoto, INTERVALO_FOTOS);
}

function desactivarPortarretratos() {
    console.log("Desactivando modo portarretratos.");
    modoPortarretratosActivo = false;

    // Detenemos la rotación
    clearInterval(intervalorRotacionFotos);

    // UI: Ocultamos fotos, mostramos dashboard
    dom.fotoContenedor.style.display = "none";
    dom.dashboard.style.display = "block";
    dom.cuerpo.className = "";

    // GESTIÓN DE MEMORIA CRÍTICA (Senior Tip):
    // Vaciamos el src de la imagen para que el navegador libere la RAM de la foto.
    dom.fotoImg.src = ""; 
}

function mostrarSiguienteFoto() {
    if (listaFotos.length === 0) return;

    // Preparamos la URL de la foto
    var urlFoto = listaFotos[indiceFotoActual];

    // GESTIÓN DE MEMORIA (Senior Tip):
    // No cambiamos el .src directamente. Primero esperamos a que la imagen 
    // se descargue en caché de fondo usando un objeto Image temporal.
    // Esto evita pantallazos negros o blancos mientras carga en navegadores lentos.
    
    var imgPreload = new Image();
    imgPreload.onload = function() {
        // Solo cuando está cargada en caché, la pasamos al DOM
        if (modoPortarretratosActivo) { // Verificamos si seguimos en modo foto
            dom.fotoImg.src = urlFoto;
        }
        // Ayudamos al Garbage Collector eliminando la referencia temporal
        imgPreload = null; 
    };
    imgPreload.onerror = function() {
        console.error("Error cargando foto:", urlFoto);
        imgPreload = null;
    };
    
    // Iniciamos descarga de fondo
    imgPreload.src = urlFoto;

    // Avanzamos índice
    indiceFotoActual = (indiceFotoActual + 1) % listaFotos.length;
}

function actualizarClima() {
    var statusEl = document.getElementById('status');
    statusEl.className = "status loading"; // Mostramos carga

    // Usamos XHR (Ajax clásico), fetch() no existe en Android 4.2 nativo
    var xhr = new XMLHttpRequest();
    
    xhr.open('GET', GAS_URL, true);

    xhr.onreadystatechange = function() {
        if (xhr.readyState === 4) { // Petición completada
            if (xhr.status === 200) {
                try {
                    // Parseamos el JSON JSON simplificado que nos envía GAS
                    var datos = JSON.parse(xhr.responseText);
                    
                    if (datos.error) {
                        manejarError("Error en API");
                    } else {
                        renderizarDatos(datos);
                        statusEl.className = "status ok";
                    }
                } catch (e) {
                    manejarError("Error JSON");
                }
            } else {
                manejarError("Error Conexión");
            }
        }
    };

    // Manejo de errores de red (offline)
    xhr.onerror = function() {
        manejarError("Offline");
    };

    xhr.send();
}

function renderizarDatos(data) {
    // Actualizamos el DOM elemento por elemento (ES5 compatible)
    document.getElementById('ciudad').innerText = data.ciudad;
    document.getElementById('hora-actualizacion').innerText = "Act: " + data.actualizado;
    document.getElementById('temp-valor').innerText = data.temp;
    document.getElementById('st-valor').innerText = data.sencacion;
    document.getElementById('hum-valor').innerText = data.humedad;
    document.getElementById('viento-valor').innerText = data.viento;
    document.getElementById('clima-desc').innerText = data.desc;

    // Actualizar icono (OpenWeather URL)
    var iconoEl = document.getElementById('clima-icono');
    // Usamos la versión @2x para que no se vea tan pixelado en la tablet
    iconoEl.src = "https://openweathermap.org/img/wn/" + data.icono + "@2x.png";
    iconoEl.style.display = "block"; // Lo mostramos
}
function manejarError(mensaje) {
    document.getElementById('status').className = "status error";
    document.getElementById('clima-desc').innerText = mensaje;
    // No borramos los datos viejos, es mejor mostrar datos viejos que nada.
    console.error("Error Dashboard:", mensaje);
}

// Arrancamos
window.onload = inicializar;

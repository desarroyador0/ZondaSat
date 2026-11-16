// =====================================================================
// ZondaSat — bienvenida y selección de la parcela
// Usa Leaflet (cargado desde index.html) y, si está disponible, logica.js.
// =====================================================================

import { iniciarI18n, alCambiarIdioma, t, esIngles } from './i18n/i18n.js';

// logica.js es opcional en esta pantalla: si no carga, el mapa funciona igual
// y solo se omite la zona con datos de clima.
let logica = null;
let zonas = [];
try {
    logica = await import('./logica.js');
    ({ ZONAS_SAN_JUAN: zonas } = await import('./datos_clima.js'));
} catch (error) {
    console.warn('No se pudo cargar logica.js; se omite la zona de clima.', error);
}

// ---------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------
const SAN_JUAN = {
    encuadre: [[-32.65, -70.65], [-28.35, -66.70]],   // provincia completa
    limites: [[-34.2, -72.6], [-26.8, -64.8]],        // hasta dónde se puede mover el mapa
    zoomParaMarcar: 12,                               // por debajo de este zoom, tocar acerca en vez de marcar
    zoomAlAcercar: 14
};
const MAX_PUNTOS = 20;
const CLAVE_PARCELA = 'zondasat:parcela';
const CLAVE_INFORME = 'zondasat:informe';

const $ = id => document.getElementById(id);
const el = {
    bienvenida: $('vista-bienvenida'), mapaVista: $('vista-mapa'),
    comenzar: $('btn-comenzar'), volver: $('btn-volver'),
    pista: $('pista'), ubicacion: $('btn-ubicacion'),
    puntos: $('dato-puntos'), superficie: $('dato-superficie'), centro: $('dato-centro'),
    filaCentro: $('fila-centro'), filaZona: $('fila-zona'), zona: $('dato-zona'), avisoLejos: $('aviso-lejos'),
    herramientas: $('herramientas'), deshacer: $('btn-deshacer'), borrar: $('btn-borrar'),
    analizar: $('btn-analizar'), notaAnalizar: $('nota-analizar'),
    panelMarcando: $('panel-marcando'), panelLista: $('panel-lista'),
    resumen: $('resumen-parcela'), otra: $('btn-otra')
};

// ---------------------------------------------------------------------
// Cambio de vista (el botón "atrás" del teléfono también funciona)
// ---------------------------------------------------------------------
function mostrarVista() {
    const enMapa = location.hash === '#mapa';
    el.bienvenida.hidden = enMapa;
    el.mapaVista.hidden = !enMapa;
    document.body.dataset.vista = enMapa ? 'mapa' : 'bienvenida';
    if (enMapa) {
        iniciarMapa();
        requestAnimationFrame(() => mapa && mapa.invalidateSize());
    }
    window.scrollTo(0, 0);
}

el.comenzar.addEventListener('click', () => { location.hash = '#mapa'; });
el.volver.addEventListener('click', () => { location.hash = ''; });
window.addEventListener('hashchange', mostrarVista);

// ---------------------------------------------------------------------
// Mapa
// ---------------------------------------------------------------------
let mapa = null;
let controlZoom = null;
let capas = {};
let trazo = null;          // polígono (o línea mientras hay menos de 3 puntos)
const vertices = [];       // marcadores de Leaflet, en orden
let pistaTemporal = null;
let claveAvisoActual = null;
let paramsAvisoActual = {};

function iniciarMapa() {
    if (mapa) return;
    if (!window.L) {
        fijarPista(t('map.errorLoadMap'), true);
        return;
    }

    mapa = L.map('mapa', {
        zoomControl: false,
        maxBounds: SAN_JUAN.limites,
        maxBoundsViscosity: 0.8,
        minZoom: 6,
        maxZoom: 18
    });
    controlZoom = L.control.zoom({
        position: 'topright',
        zoomInTitle: t('map.zoomInTitle'),
        zoomOutTitle: t('map.zoomOutTitle')
    }).addTo(mapa);

    capas = {
        satelite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 18, attribution: t('map.attrEsri')
        }),
        calles: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18, attribution: t('map.attrOsm')
        })
    };
    capas.satelite.addTo(mapa);
    mapa.fitBounds(SAN_JUAN.encuadre);

    // Zonas con datos de clima: tocarlas acerca el mapa a esa zona
    for (const z of zonas) {
        L.marker([z.lat, z.lon], {
            icon: L.divIcon({ className: '', html: '<div class="zona-punto"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
            title: z.nombre, keyboard: false
        })
            .bindTooltip(z.nombre, { direction: 'top', offset: [0, -8], className: 'zona-etiqueta' })
            .on('click', () => mapa.flyTo([z.lat, z.lon], SAN_JUAN.zoomAlAcercar, { duration: 0.8 }))
            .addTo(mapa);
    }

    mapa.on('click', alTocarMapa);
    mapa.on('zoomend', actualizarPista);
    actualizar();
}

function actualizarTextosMapa() {
    if (!mapa) return;
    const zoomInBtn = document.querySelector('.leaflet-control-zoom-in');
    const zoomOutBtn = document.querySelector('.leaflet-control-zoom-out');
    if (zoomInBtn) {
        zoomInBtn.title = t('map.zoomInTitle');
        zoomInBtn.setAttribute('aria-label', t('map.zoomInTitle'));
    }
    if (zoomOutBtn) {
        zoomOutBtn.title = t('map.zoomOutTitle');
        zoomOutBtn.setAttribute('aria-label', t('map.zoomOutTitle'));
    }
    if (capas.satelite) capas.satelite.options.attribution = t('map.attrEsri');
    if (capas.calles) capas.calles.options.attribution = t('map.attrOsm');
    if (mapa.attributionControl) {
        mapa.attributionControl._update();
    }
}

function alTocarMapa(evento) {
    if (!el.panelLista.hidden) return;                       // parcela ya registrada
    if (mapa.getZoom() < SAN_JUAN.zoomParaMarcar) {          // todavía muy lejos: primero acercar
        mapa.flyTo(evento.latlng, SAN_JUAN.zoomAlAcercar, { duration: 0.8 });
        return;
    }
    if (vertices.length >= MAX_PUNTOS) {
        avisar('map.maxPointsAlert', { max: MAX_PUNTOS });
        return;
    }
    agregarVertice(evento.latlng);
}

function iconoVertice(numero) {
    return L.divIcon({ className: '', html: `<div class="vertice">${numero}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
}

function agregarVertice(latlng) {
    const marcador = L.marker(latlng, { icon: iconoVertice(vertices.length + 1), draggable: true, keyboard: false });
    marcador.on('drag', dibujarTrazo);
    marcador.on('dragend', actualizar);
    marcador.addTo(mapa);
    vertices.push(marcador);
    actualizar();
}

function quitarUltimo() {
    const ultimo = vertices.pop();
    if (ultimo) ultimo.remove();
    actualizar();
}

function borrarTodo() {
    while (vertices.length) vertices.pop().remove();
    actualizar();
}

function dibujarTrazo() {
    if (trazo) { trazo.remove(); trazo = null; }
    const posiciones = vertices.map(v => v.getLatLng());
    if (posiciones.length < 2) return;
    const estilo = { color: '#C26838', weight: 3, fillColor: '#C26838', fillOpacity: 0.22, interactive: false };
    trazo = (posiciones.length >= 3 ? L.polygon(posiciones, estilo) : L.polyline(posiciones, { ...estilo, dashArray: '6 8' })).addTo(mapa);
}

// ---------------------------------------------------------------------
// Cálculos de la parcela
// ---------------------------------------------------------------------
const puntosDeLaParcela = () => vertices.map(v => {
    const { lat, lng } = v.getLatLng();
    return { lat, lon: lng };
});

// Superficie en hectáreas (proyección plana local; suficiente para una parcela)
function superficieHa(puntos) {
    if (puntos.length < 3) return 0;
    const R = 6371000;
    const rad = g => g * Math.PI / 180;
    const lat0 = rad(puntos.reduce((s, p) => s + p.lat, 0) / puntos.length);
    const xy = puntos.map(p => [R * rad(p.lon) * Math.cos(lat0), R * rad(p.lat)]);
    let suma = 0;
    for (let i = 0; i < xy.length; i++) {
        const [x1, y1] = xy[i];
        const [x2, y2] = xy[(i + 1) % xy.length];
        suma += x1 * y2 - x2 * y1;
    }
    return Math.abs(suma) / 2 / 10000;
}

function centroDe(puntos) {
    if (logica) return logica.calcularCentroide(puntos);
    return {
        lat: puntos.reduce((s, p) => s + p.lat, 0) / puntos.length,
        lon: puntos.reduce((s, p) => s + p.lon, 0) / puntos.length
    };
}

const formatoHa = ha => {
    const txt = (ha >= 100 ? Math.round(ha) : ha.toFixed(ha >= 10 ? 1 : 2)).toString();
    return (esIngles() ? txt : txt.replace('.', ',')) + ' ha';
};
const formatoCoord = c => `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`.replaceAll('-', '−');

function describirParcela() {
    const puntos = puntosDeLaParcela();
    if (puntos.length < 3) return null;
    const centroide = centroDe(puntos);
    const ubicacion = logica ? logica.ubicarZona(centroide.lat, centroide.lon) : null;
    return {
        puntos,
        superficieHa: superficieHa(puntos),
        centroide,
        zona: ubicacion ? { id: ubicacion.zona.id, nombre: ubicacion.zona.nombre } : null,
        distanciaKm: ubicacion ? ubicacion.distanciaKm : null,
        fueraDeRango: ubicacion ? ubicacion.fueraDeRango : false
    };
}

// ---------------------------------------------------------------------
// Actualización de la pantalla
// ---------------------------------------------------------------------
function actualizar() {
    vertices.forEach((v, i) => v.setIcon(iconoVertice(i + 1)));
    dibujarTrazo();

    const n = vertices.length;
    const parcela = describirParcela();

    el.puntos.textContent = n;
    el.superficie.textContent = parcela ? formatoHa(parcela.superficieHa) : t('map.unmarked');
    el.filaCentro.hidden = !parcela;
    if (parcela) el.centro.textContent = formatoCoord(parcela.centroide);

    el.filaZona.hidden = !(parcela && parcela.zona);
    el.avisoLejos.hidden = !(parcela && parcela.fueraDeRango);
    if (parcela && parcela.zona) {
        const km = Math.round(parcela.distanciaKm);
        el.zona.textContent = t('map.zoneDistance', { zona: parcela.zona.nombre, km });
        if (parcela.fueraDeRango) {
            el.avisoLejos.textContent = t('map.farWarning', { km });
        }
    }

    el.herramientas.hidden = n === 0 || !el.panelLista.hidden;
    el.analizar.disabled = n < 3;
    el.notaAnalizar.hidden = n >= 3;
    actualizarPista();
}

function textoDePista() {
    if (!mapa) return t('map.hintZoom');
    const n = vertices.length;
    if (!el.panelLista.hidden) return t('map.hintRegistered');
    if (n === 0 && mapa.getZoom() < SAN_JUAN.zoomParaMarcar) return t('map.hintZoom');
    if (n === 0) return t('map.hintFirstCorner');
    if (n < 3) return n === 1 ? t('map.hintNeed2') : t('map.hintNeed1');
    return t('map.hintReady');
}

function fijarPista(texto, esAviso = false) {
    el.pista.textContent = texto;
    el.pista.classList.toggle('pista--aviso', esAviso);
}

function actualizarPista() {
    if (pistaTemporal) {
        if (claveAvisoActual) {
            fijarPista(t(claveAvisoActual, paramsAvisoActual), true);
        }
        return;
    }
    fijarPista(textoDePista());
}

// Mensaje breve que reemplaza la pista durante unos segundos
function avisar(clave, params = {}) {
    clearTimeout(pistaTemporal);
    claveAvisoActual = clave;
    paramsAvisoActual = params;
    fijarPista(t(clave, params), true);
    pistaTemporal = setTimeout(() => {
        pistaTemporal = null;
        claveAvisoActual = null;
        actualizarPista();
    }, 3500);
}

// ---------------------------------------------------------------------
// Controles
// ---------------------------------------------------------------------
el.deshacer.addEventListener('click', quitarUltimo);
el.borrar.addEventListener('click', borrarTodo);

document.querySelectorAll('.conmutador__opcion').forEach(boton => {
    boton.addEventListener('click', () => {
        if (!mapa) return;
        const elegida = boton.dataset.capa;
        for (const [nombre, capa] of Object.entries(capas)) {
            if (nombre === elegida) capa.addTo(mapa); else capa.remove();
        }
        document.querySelectorAll('.conmutador__opcion').forEach(b => b.setAttribute('aria-pressed', String(b === boton)));
    });
});

el.ubicacion.addEventListener('click', () => {
    if (!mapa) return;
    if (!navigator.geolocation) { avisar('map.noGeolocation'); return; }
    el.ubicacion.classList.add('buscando');
    navigator.geolocation.getCurrentPosition(
        posicion => {
            el.ubicacion.classList.remove('buscando');
            const aqui = L.latLng(posicion.coords.latitude, posicion.coords.longitude);
            if (!L.latLngBounds(SAN_JUAN.encuadre).contains(aqui)) { avisar('map.outsideSanJuan'); return; }
            mapa.flyTo(aqui, 16, { duration: 0.8 });
        },
        () => {
            el.ubicacion.classList.remove('buscando');
            avisar('map.geolocationError');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
});

// ---------------------------------------------------------------------
// Comenzar el análisis
// ---------------------------------------------------------------------
el.analizar.addEventListener('click', () => {
    const parcela = describirParcela();
    if (!parcela) return;

    let informe = null;
    if (logica) {
        try { informe = logica.planificarTerreno(parcela.centroide); }   // recibe solo el centro de la parcela
        catch (error) { console.error('No se pudo generar el informe', error); }
    }

    // La parcela y el informe quedan guardados para la pantalla siguiente
    sessionStorage.setItem(CLAVE_PARCELA, JSON.stringify(parcela));
    if (informe) sessionStorage.setItem(CLAVE_INFORME, JSON.stringify(informe));
    document.dispatchEvent(new CustomEvent('zondasat:parcela-lista', { detail: { parcela, informe } }));

    // Pantalla de resultados: lee la parcela y el informe guardados arriba
    window.location.href = 'resultado/resultado.html';
});

el.otra.addEventListener('click', () => {
    el.panelLista.hidden = true;
    el.panelMarcando.hidden = false;
    borrarTodo();
});

iniciarI18n();
alCambiarIdioma(() => {
    actualizarTextosMapa();
    actualizar();
});

mostrarVista();

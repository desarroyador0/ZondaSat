// =====================================================================
// ZondaSat — pantalla de Resultados
//
// Flujo: lee el informe guardado por app.js (sessionStorage), pide a ia.js
// la redacción (Gemini según config.js, o texto de respaldo) y dibuja
// el informe como un hilo de pasos numerados:
//   1 Tu campo → 2 Clima → 3 Tu plan → 4 Comparación → (5 Permanente) → Antes de sembrar
// Todos los números salen de logica.js; la IA solo aporta los textos.
// =====================================================================

import { generarResultadosDesdeInforme, redactarSinIA, armarResultados } from '../ia.js';
import { planificarTerreno } from '../logica.js';
import { iniciarI18n, alCambiarIdioma, obtenerIdioma, esIngles, t, traducirPlan } from '../i18n/i18n.js';

const CLAVE_PARCELA = 'zondasat:parcela';
const CLAVE_INFORME = 'zondasat:informe';
const claveResultados = (idioma = obtenerIdioma()) => `zondasat:resultados:${idioma}`;

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(n).toLocaleString(esIngles() ? 'en-US' : 'es-AR');
const usd = n => n === null || n === undefined ? t('results.notEstimable') : (n < 0 ? '−' : '') + num(Math.abs(n)) + ' USD';
const coord = c => c ? `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`.replaceAll('-', '−') : '—';
const ha = n => {
    const txt = (n >= 100 ? Math.round(n) : n.toFixed(n >= 10 ? 1 : 2)).toString();
    return (esIngles() ? txt : txt.replace('.', ',')) + ' ha';
};
const dec1 = n => {
    const txt = Number(n).toFixed(1);
    return esIngles() ? txt : txt.replace('.', ',');
};
const leer = clave => { try { return JSON.parse(sessionStorage.getItem(clave)); } catch { return null; } };

function firma(texto) {                       // hash corto para saber si el informe cambió
    let h = 0;
    for (let i = 0; i < texto.length; i++) h = (Math.imul(31, h) + texto.charCodeAt(i)) | 0;
    return String(h);
}

const ICONOS = {
    sol: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    copo: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    hoja: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c9 0 14-5 14-14C10 5 5 10 5 19Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M5 19c3-6 7-9 11-11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
    info: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 11v5M12 8h.01" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>',
    alerta: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 7v6M12 17h.01" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="2.3" fill="currentColor"/></svg>',
    reloj: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
};
const iconoEstacion = e => `<span class="icono-estacion icono-estacion--${e}">${e === 'verano' ? ICONOS.sol : ICONOS.copo}</span>`;
const cap = txt => txt ? txt.charAt(0).toUpperCase() + txt.slice(1) : '';
const nombreEstacion = e => e === 'verano' ? t('results.summer') : t('results.winter');

// ---------------------------------------------------------------------
// Estados de la pantalla
// ---------------------------------------------------------------------
let estadoActual = null;       // 'vacio' | 'error' | null
let parcelaActual = null;
let informeActual = null;
let resultadosActuales = null;
let planActivoClave = null;
let visorSecciones = null;

function mostrarEstado(tipo) {
    estadoActual = tipo;
    const estado = $('estado');
    estado.hidden = false;
    estado.classList.add('estado--fija');
    const cfg = tipo === 'vacio'
        ? { titulo: t('results.noParcelTitle'), texto: t('results.noParcelText'), boton: { href: '../index.html#mapa', texto: t('results.goToMapBtn') } }
        : { titulo: t('results.errorTitle'), texto: t('results.errorText'), boton: { href: 'resultado.html', texto: t('results.retryBtn') } };
    estado.innerHTML = `
        <h1 class="estado__titulo">${esc(cfg.titulo)}</h1>
        <p class="estado__texto">${esc(cfg.texto)}</p>
        ${cfg.boton ? `<a class="boton boton--primario" href="${esc(cfg.boton.href)}">${esc(cfg.boton.texto)}</a>` : ''}`;
    $('contenido').hidden = true;
}

// ---------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------
function portada(r, parcela) {
    const chips = [
        `<span class="chip">${ICONOS.pin}${esc(t('results.chipZone', { zona: r.campo.zona }))}</span>`,
        parcela && parcela.superficieHa ? `<span class="chip">${ICONOS.hoja}${ha(parcela.superficieHa)}</span>` : '',
        `<span class="chip">${ICONOS.reloj}${esc(t('results.chipDuration'))}</span>`,
        r.fuente === 'ia'
            ? `<span class="chip">${esc(t('results.chipAi'))}</span>`
            : `<span class="chip chip--acento">${esc(t('results.chipSummary'))}</span>`
    ].join('');
    return `
        <p class="portada__etiqueta">${esc(t('results.readyBadge'))}</p>
        <h1 class="portada__titulo">${esc(r.encabezado.titulo)}</h1>
        <p class="portada__resumen">${esc(r.encabezado.resumen)}</p>
        <div class="chips">${chips}</div>
        ${r.aviso ? `<p class="aviso-ia" role="status">${esc(r.aviso)}</p>` : ''}`;
}

function seccionCampo(r, parcela) {
    const c = r.campo;
    const centro = c.centro || (parcela && parcela.centroide) || null;
    return `
        <p class="paso__texto">${esc(c.texto)}</p>
        <div class="tarjeta">
            <div class="campo-datos">
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.climateZone'))}</span><span class="metrica__valor">${esc(c.zona)}</span></div>
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.surface'))}</span><span class="metrica__valor">${parcela && parcela.superficieHa ? ha(parcela.superficieHa) : '—'}</span></div>
                <div class="metrica ancho"><span class="metrica__etiqueta">${esc(t('results.parcelCenter'))}</span><span class="metrica__valor mono" style="font-size:1.05rem;font-weight:500">${coord(centro)}</span></div>
                ${c.distanciaKm !== null ? `<div class="metrica"><span class="metrica__etiqueta">${esc(t('results.distanceToZone'))}</span><span class="metrica__valor">${num(c.distanciaKm)} <small>km</small></span></div>` : ''}
            </div>
        </div>
        ${c.fueraDeRango ? `<p class="aviso-ia">${esc(t('results.outOfRangeWarning'))}</p>` : ''}`;
}

function seccionClima(r) {
    const tarjeta = (estacion, titulo, d) => `
        <div class="tarjeta clima-tarjeta">
            <div class="clima-tarjeta__cabeza">${iconoEstacion(estacion)}<span>${esc(titulo)}</span></div>
            <div class="clima-tarjeta__datos">
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.avgMaxTemp'))}</span><span class="metrica__valor mono">${num(d.tempMaxC)}<small> °C</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.avgMinTemp'))}</span><span class="metrica__valor mono">${num(d.tempMinC)}<small> °C</small></span></div>
                <div class="metrica metrica--acento"><span class="metrica__etiqueta">${esc(t('results.seasonRain'))}</span><span class="metrica__valor mono">${num(d.lluviaMm)}<small> mm</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.evaporation'))}</span><span class="metrica__valor mono">${dec1(d.evapotranspiracionMmDia)}<small> ${esc(t('results.mmPerDay'))}</small></span></div>
            </div>
        </div>`;
    return `
        <p class="paso__texto">${esc(r.clima.texto)}</p>
        <div class="rejilla">
            ${tarjeta('verano', t('results.summer'), r.clima.verano)}
            ${tarjeta('invierno', t('results.winter'), r.clima.invierno)}
        </div>`;
}

// ----- Plan -----
function nombreCorto(plan) {
    return traducirPlan(plan.clave, 'corto') || cap(plan.nombre.replace(/^Plan (de |del )?/i, '').replace(/ plan$/i, ''));
}

function vistazo(plan) {
    const filas = [1, 2, 3].map(anio => {
        const delAnio = plan.temporadas.filter(tp => tp.anio === anio);
        return `<div class="vistazo__fila">
            <span class="vistazo__anio">${esc(t('results.yearN', { n: anio }))}</span>
            ${delAnio.map(tp => `<div class="vistazo__celda vistazo__celda--${tp.estacion}"><small>${esc(nombreEstacion(tp.estacion))}</small><b>${esc(tp.cultivo)}</b></div>`).join('')}
        </div>`;
    });
    return `<div class="vistazo" aria-label="${esc(t('results.atAGlanceAria'))}">${filas.join('')}</div>`;
}

function indicadores(ind) {
    const rango = ind.margenMalosUSD !== null && ind.margenBuenosUSD !== null
        ? t('results.marginRange', { min: usd(ind.margenMalosUSD), max: usd(ind.margenBuenosUSD) })
        : t('results.noRange');
    const mejora = ind.sueloFinal - ind.sueloInicial;
    const sueloNota = mejora === 0
        ? t('results.soilSame')
        : mejora > 0
            ? t('results.soilImproves', { n: mejora })
            : t('results.soilDrops', { n: Math.abs(mejora) });
    return `<div class="indicadores">
        <div class="tarjeta metrica metrica--acento">
            <span class="metrica__etiqueta">${esc(t('results.expectedMarginHa'))}</span>
            <span class="metrica__valor">${usd(ind.margenUSD)}</span>
            <span class="metrica__nota">${esc(rango)}</span>
        </div>
        <div class="tarjeta metrica">
            <span class="metrica__etiqueta">${esc(t('results.totalIrrigation'))}</span>
            <span class="metrica__valor">${num(ind.riegoMm)} <small>mm</small></span>
            <span class="metrica__nota">${esc(t('results.m3PerHa', { m3: num(ind.riegoM3PorHa) }))}</span>
        </div>
        <div class="tarjeta metrica">
            <span class="metrica__etiqueta">${esc(t('results.soilState'))}</span>
            <span class="metrica__valor">${ind.sueloInicial} → ${ind.sueloFinal} <small>/ 100</small></span>
            <span class="metrica__nota">${esc(sueloNota)}</span>
        </div>
    </div>`;
}

function tarjetaTemporada(tp) {
    const descanso = tp.nombreCompleto === 'Barbecho (sin cultivo viable)' || tp.cultivo === 'Descanso del lote' || tp.cultivo === 'Fallow (field rest)';
    const delta = tp.sueloDespues - tp.sueloAntes;
    return `
        <article class="temporada temporada--${tp.estacion}${descanso ? ' temporada--descanso' : ''}">
            <div class="temporada__cabeza">
                ${iconoEstacion(tp.estacion)}
                <div>
                    <p class="temporada__etiqueta">${esc(t('results.seasonN', { n: tp.numero, estacion: nombreEstacion(tp.estacion) }))}</p>
                    <h4 class="temporada__cultivo">${esc(tp.cultivo)}</h4>
                    <p class="temporada__tipo">${esc(tp.tipo)}</p>
                </div>
            </div>
            <p class="temporada__texto">${esc(tp.explicacion)}</p>
            <div class="temporada__datos">
                <span class="dato"><small>${esc(t('results.irrigation'))}</small><b>${num(tp.riegoMm)} mm</b></span>
                ${tp.margenUSD === null ? '' : `<span class="dato${tp.margenUSD < 0 ? ' dato--negativo' : ''}"><small>${esc(t('results.margin'))}</small><b>${usd(tp.margenUSD)}</b></span>`}
            </div>
            <div class="suelo" aria-label="${esc(t('results.soilAria', { antes: tp.sueloAntes, despues: tp.sueloDespues }))}">
                <div class="suelo__fila"><span>${esc(t('results.soil'))}</span><b>${tp.sueloAntes} → ${tp.sueloDespues}${delta ? ` (${delta > 0 ? '+' : '−'}${Math.abs(delta)})` : ''}</b></div>
                <div class="suelo__barra">
                    <div class="suelo__relleno" style="width:${Math.max(0, Math.min(100, tp.sueloDespues))}%"></div>
                    <div class="suelo__marca" style="left:calc(${Math.max(0, Math.min(100, tp.sueloAntes))}% - 1.5px)"></div>
                </div>
            </div>
        </article>`;
}

function panelPlan(plan) {
    const anios = [1, 2, 3].map(anio => `
        <div class="anio">
            <h4 class="anio__titulo">${esc(t('results.yearN', { n: anio }))}</h4>
            ${plan.temporadas.filter(tp => tp.anio === anio).map(tarjetaTemporada).join('')}
        </div>`).join('');
    return `
        <div class="plan">
            <div class="plan__intro">
                <p class="plan__frase">${esc(plan.enUnaFrase)}</p>
                ${plan.convieneSi ? `<div class="nota-caja">${ICONOS.info}<span>${esc(plan.convieneSi)}</span></div>` : ''}
            </div>
            <div><h3 class="subtitulo" style="margin-bottom:10px">${esc(t('results.atAGlanceTitle'))}</h3>${vistazo(plan)}</div>
            ${indicadores(plan.indicadores)}
            <div style="display:grid;gap:18px">
                <h3 class="subtitulo">${esc(t('results.seasonBySeasonTitle'))}</h3>
                ${anios}
            </div>
            <div class="cierre"><span class="cierre__titulo">${esc(t('results.inSummary'))}</span><p>${esc(plan.cierre)}</p></div>
        </div>`;
}

function seccionPlanes(r) {
    const lista = r.planes.lista;
    const elegido = lista.find(p => p.clave === planActivoClave) || lista[0];
    planActivoClave = elegido.clave;
    return `
        <div class="selector" role="tablist" aria-label="${esc(t('results.choosePlanAria'))}">
            ${lista.map(p => `<button class="selector__opcion" type="button" role="tab" id="tab-${esc(p.clave)}" data-plan="${esc(p.clave)}" aria-selected="${p.clave === elegido.clave}" aria-controls="panel-plan">${esc(nombreCorto(p))}</button>`).join('')}
        </div>
        <div id="panel-plan" role="tabpanel" aria-live="polite">${panelPlan(elegido)}</div>`;
}

function activarPlanes(r) {
    const panel = $('panel-plan');
    const botones = document.querySelectorAll('.selector__opcion');
    botones.forEach(b => b.addEventListener('click', () => {
        const plan = r.planes.lista.find(p => p.clave === b.dataset.plan);
        if (!plan) return;
        planActivoClave = plan.clave;
        botones.forEach(x => x.setAttribute('aria-selected', String(x === b)));
        panel.setAttribute('aria-labelledby', b.id);
        panel.innerHTML = panelPlan(plan);
        b.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    }));
}

// ----- Comparación -----
function seccionComparacion(r) {
    const c = r.comparacion;
    const tarjetas = r.planes.lista.map(p => {
        const ins = [];
        if (!c.planesCoinciden) {
            if (c.mayorMargen === p.clave) ins.push(t('results.badgeHighestGain'));
            if (c.menorRiego === p.clave) ins.push(t('results.badgeLeastWater'));
            if (c.mejorSuelo === p.clave) ins.push(t('results.badgeBestSoil'));
        }
        const i = p.indicadores;
        return `<div class="tarjeta comparar__plan">
            <h3 class="comparar__nombre">${esc(p.nombre)}</h3>
            <div class="comparar__insignias">${ins.map(x => `<span class="insignia">${esc(x)}</span>`).join('')}</div>
            <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.expectedMargin'))}</span><span class="metrica__valor">${usd(i.margenUSD)}</span></div>
            <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.totalIrrigation'))}</span><span class="metrica__valor">${num(i.riegoMm)} <small>mm</small></span></div>
            <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.soilEnd'))}</span><span class="metrica__valor">${i.sueloFinal} <small>/ 100</small></span></div>
            <p class="comparar__cultivos">${esc([...new Set(p.temporadas.map(tp => tp.cultivo))].join(' · '))}</p>
        </div>`;
    }).join('');
    return `<p class="paso__texto">${esc(c.texto)}</p><div class="comparar">${tarjetas}</div>`;
}

// ----- Permanente -----
function seccionPermanente(p) {
    return `
        <p class="paso__texto">${esc(p.texto)}</p>
        <div class="tarjeta permanente">
            <div class="rejilla">
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.cropLabel'))}</span><span class="metrica__valor">${esc(p.cultivo)}</span></div>
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.startsProducing'))}</span><span class="metrica__valor">${esc(t('results.yearN', { n: p.aniosHastaProducir }))}</span></div>
                <div class="metrica metrica--acento"><span class="metrica__etiqueta">${esc(t('results.initialInvestment'))}</span><span class="metrica__valor">${usd(p.inversionUSDporHa)} <small>/ ha</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">${esc(t('results.irrigationPerYear'))}</span><span class="metrica__valor">${num(p.riegoPorAnioMm)} <small>mm</small></span></div>
            </div>
        </div>`;
}

// ----- Antes de sembrar + próximos pasos -----
function lista(puntos, tipo) {
    const icono = tipo === 'avisos' ? ICONOS.alerta : ICONOS.check;
    return `<ul class="lista lista--${tipo}" style="list-style:none;margin:0;padding:0">
        ${puntos.map(p => `<li class="lista__item"><span class="lista__marca">${icono}</span><span>${esc(p)}</span></li>`).join('')}
    </ul>`;
}

function seccionCierre(r) {
    return `
        <div class="tarjeta" style="display:grid;gap:14px">
            <h3 class="subtitulo">${esc(r.antesDeSembrar.titulo)}</h3>
            ${lista(r.antesDeSembrar.puntos, 'avisos')}
        </div>
        <div class="tarjeta" style="display:grid;gap:14px">
            <h3 class="subtitulo">${esc(r.proximosPasos.titulo)}</h3>
            ${lista(r.proximosPasos.puntos, 'pasos')}
        </div>`;
}

// ---------------------------------------------------------------------
// Armado del hilo
// ---------------------------------------------------------------------
function dibujar(r, parcela) {
    estadoActual = null;
    resultadosActuales = r;
    const pasos = [
        { id: 'campo', nav: t('results.navField'), titulo: r.campo.titulo, cuerpo: seccionCampo(r, parcela) },
        { id: 'clima', nav: t('results.navClimate'), titulo: r.clima.titulo, cuerpo: seccionClima(r) },
        { id: 'planes', nav: t('results.navPlan'), titulo: r.planes.titulo, cuerpo: seccionPlanes(r) },
        { id: 'comparacion', nav: t('results.navComparison'), titulo: r.comparacion.titulo, cuerpo: seccionComparacion(r) }
    ];
    if (r.permanente) pasos.push({ id: 'permanente', nav: t('results.navPermanent'), titulo: r.permanente.titulo, cuerpo: seccionPermanente(r.permanente) });
    pasos.push({ id: 'cierre', nav: t('results.navBeforePlanting'), titulo: t('results.secClosingTitle'), cuerpo: seccionCierre(r) });

    $('portada').innerHTML = portada(r, parcela);
    $('hilo').innerHTML = pasos.map((p, i) => `
        <section class="paso" id="${p.id}" aria-labelledby="t-${p.id}" style="animation-delay:${Math.min(i, 4) * 60}ms">
            <span class="paso__nodo" aria-hidden="true">${i + 1}</span>
            <div class="paso__encabezado"><h2 class="paso__titulo" id="t-${p.id}">${esc(p.titulo)}</h2></div>
            ${p.cuerpo}
        </section>`).join('');

    const nav = $('nav');
    nav.innerHTML = pasos.map((p, i) => `<a href="#${p.id}" data-paso="${p.id}"><span>${i + 1}</span>${esc(p.nav)}</a>`).join('');
    nav.hidden = false;

    $('pie').innerHTML = `
        <div class="r-pie__acciones">
            <a class="boton boton--secundario" href="../index.html#mapa">${esc(t('results.markAnotherParcelBtn'))}</a>
            <button class="boton boton--primario" id="btn-imprimir" type="button">${esc(t('results.saveOrPrintBtn'))}</button>
        </div>
        <p class="r-pie__nota">${esc(t('results.footerDisclaimer'))}</p>`;
    $('btn-imprimir').addEventListener('click', () => window.print());

    $('estado').hidden = true;
    $('contenido').hidden = false;
    activarPlanes(r);
    activarNavegacion(pasos);
    document.body.dataset.customTitle = 'true';
    document.title = `${r.encabezado.titulo} · ZondaSat`;
}

// Resalta en la barra la sección que se está leyendo
function activarNavegacion(pasos) {
    if (visorSecciones) {
        visorSecciones.disconnect();
        visorSecciones = null;
    }
    const enlaces = new Map([...document.querySelectorAll('#nav a')].map(a => [a.dataset.paso, a]));
    const marcar = id => enlaces.forEach((a, k) => {
        if (k === id) { a.setAttribute('aria-current', 'true'); a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
        else a.removeAttribute('aria-current');
    });
    marcar(pasos[0].id);
    if (!('IntersectionObserver' in window)) return;
    visorSecciones = new IntersectionObserver(entradas => {
        for (const e of entradas) if (e.isIntersecting) marcar(e.target.id);
    }, { rootMargin: '-25% 0px -65% 0px' });
    pasos.forEach(p => {
        const elPaso = $(p.id);
        if (elPaso) visorSecciones.observe(elPaso);
    });
}

// ---------------------------------------------------------------------
// Cambio dinámico de idioma sin recargar la página
// ---------------------------------------------------------------------
async function actualizarPorIdioma(nuevoIdioma) {
    if (estadoActual) {
        mostrarEstado(estadoActual);
        return;
    }
    if (!informeActual) return;

    const marca = firma(JSON.stringify(informeActual));
    const guardado = leer(claveResultados(nuevoIdioma));
    if (guardado && guardado.marca === marca && guardado.resultados) {
        dibujar(guardado.resultados, parcelaActual);
        return;
    }

    // Redibujado instantáneo en el nuevo idioma usando el redactor determinista
    const instantaneo = armarResultados(
        informeActual,
         null,
        redactarSinIA(informeActual, nuevoIdioma),
        resultadosActuales ? resultadosActuales.fuente : 'local',
        resultadosActuales ? (resultadosActuales.aviso ? t('results.aiFallbackNotice', {}, nuevoIdioma) : null) : null,
        nuevoIdioma
    );
    dibujar(instantaneo, parcelaActual);

    // Si la explicación original provino de IA, solicitamos en segundo plano la versión IA en el nuevo idioma
    try {
        const { resultados } = await generarResultadosDesdeInforme(informeActual, nuevoIdioma);
        if (resultados.fuente === 'ia') {
            try { sessionStorage.setItem(claveResultados(nuevoIdioma), JSON.stringify({ marca, resultados })); } catch { /* sin espacio */ }
            if (obtenerIdioma() === nuevoIdioma) {
                dibujar(resultados, parcelaActual);
            }
        }
    } catch {
        // Ya quedó renderizada la versión traducida instantánea
    }
}

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
async function iniciar() {
    iniciarI18n();
    alCambiarIdioma(actualizarPorIdioma);

    const parcela = leer(CLAVE_PARCELA);
    let informe = leer(CLAVE_INFORME);

    if (!informe && parcela && parcela.centroide) {
        try { informe = planificarTerreno(parcela.centroide); }
        catch (error) { console.error('No se pudo generar el informe', error); }
    }
    if (!informe) {
        mostrarEstado('vacio');
        return;
    }

    parcelaActual = parcela;
    informeActual = informe;
    const idioma = obtenerIdioma();

    // Si ya se redactó con IA para este mismo informe e idioma, se reutiliza
    const marca = firma(JSON.stringify(informe));
    const guardado = leer(claveResultados(idioma));
    if (guardado && guardado.marca === marca && guardado.resultados) {
        dibujar(guardado.resultados, parcela);
        return;
    }

    try {
        const { resultados } = await generarResultadosDesdeInforme(informe, idioma);
        if (resultados.fuente === 'ia') {
            try { sessionStorage.setItem(claveResultados(idioma), JSON.stringify({ marca, resultados })); } catch { /* sin espacio: no se guarda */ }
        }
        dibujar(resultados, parcela);
    } catch (error) {
        console.error('ZondaSat: no se pudieron armar los resultados', error);
        mostrarEstado('error');
    }
}

iniciar();

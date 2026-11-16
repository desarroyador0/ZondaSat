// =====================================================================
// ZondaSat — pantalla de Resultados
//
// Flujo: lee el informe guardado por app.js (sessionStorage), pide a ia.js
// la redacción (Gemini según config_ia.js, o texto de respaldo) y dibuja
// el informe como un hilo de pasos numerados:
//   1 Tu campo → 2 Clima → 3 Tu plan → 4 Comparación → (5 Permanente) → Antes de sembrar
// Todos los números salen de logica.js; la IA solo aporta los textos.
// =====================================================================

import { generarResultadosDesdeInforme } from '../ia.js';
import { planificarTerreno } from '../logica.js';

const CLAVE_PARCELA = 'zondasat:parcela';
const CLAVE_INFORME = 'zondasat:informe';
const CLAVE_RESULTADOS = 'zondasat:resultados';

const $ = id => document.getElementById(id);

// ---------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = n => Math.round(n).toLocaleString('es-AR');
const usd = n => n === null || n === undefined ? 'No estimable' : (n < 0 ? '−' : '') + num(Math.abs(n)) + ' USD';
const coord = c => c ? `${c.lat.toFixed(4)}, ${c.lon.toFixed(4)}`.replaceAll('-', '−') : '—';
const ha = n => (n >= 100 ? Math.round(n) : n.toFixed(n >= 10 ? 1 : 2)).toString().replace('.', ',') + ' ha';
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
const cap = t => t.charAt(0).toUpperCase() + t.slice(1);

// ---------------------------------------------------------------------
// Estados de la pantalla
// ---------------------------------------------------------------------
function mostrarEstado({ titulo, texto, boton }) {
    const estado = $('estado');
    estado.hidden = false;
    estado.classList.add('estado--fija');
    estado.innerHTML = `
        <h1 class="estado__titulo">${esc(titulo)}</h1>
        <p class="estado__texto">${esc(texto)}</p>
        ${boton ? `<a class="boton boton--primario" href="${esc(boton.href)}">${esc(boton.texto)}</a>` : ''}`;
    $('contenido').hidden = true;
}

// ---------------------------------------------------------------------
// Secciones
// ---------------------------------------------------------------------
function portada(r, parcela) {
    const chips = [
        `<span class="chip">${ICONOS.pin}Zona ${esc(r.campo.zona)}</span>`,
        parcela && parcela.superficieHa ? `<span class="chip">${ICONOS.hoja}${ha(parcela.superficieHa)}</span>` : '',
        `<span class="chip">${ICONOS.reloj}3 años · 6 temporadas</span>`,
        r.fuente === 'ia' ? '<span class="chip">Explicado con IA</span>' : '<span class="chip chip--acento">Versión resumida</span>'
    ].join('');
    return `
        <p class="portada__etiqueta">Tu plan está listo</p>
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
                <div class="metrica"><span class="metrica__etiqueta">Zona de clima</span><span class="metrica__valor">${esc(c.zona)}</span></div>
                <div class="metrica"><span class="metrica__etiqueta">Superficie</span><span class="metrica__valor">${parcela && parcela.superficieHa ? ha(parcela.superficieHa) : '—'}</span></div>
                <div class="metrica ancho"><span class="metrica__etiqueta">Centro de la parcela</span><span class="metrica__valor mono" style="font-size:1.05rem;font-weight:500">${coord(centro)}</span></div>
                ${c.distanciaKm !== null ? `<div class="metrica"><span class="metrica__etiqueta">Distancia a la zona</span><span class="metrica__valor">${num(c.distanciaKm)} <small>km</small></span></div>` : ''}
            </div>
        </div>
        ${c.fueraDeRango ? '<p class="aviso-ia">Tu parcela queda lejos de las zonas con datos: el resultado puede no representar bien tu campo.</p>' : ''}`;
}

function seccionClima(r) {
    const tarjeta = (estacion, titulo, d) => `
        <div class="tarjeta clima-tarjeta">
            <div class="clima-tarjeta__cabeza">${iconoEstacion(estacion)}<span>${titulo}</span></div>
            <div class="clima-tarjeta__datos">
                <div class="metrica"><span class="metrica__etiqueta">Máxima media</span><span class="metrica__valor mono">${num(d.tempMaxC)}<small> °C</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">Mínima media</span><span class="metrica__valor mono">${num(d.tempMinC)}<small> °C</small></span></div>
                <div class="metrica metrica--acento"><span class="metrica__etiqueta">Lluvia de la temporada</span><span class="metrica__valor mono">${num(d.lluviaMm)}<small> mm</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">Evaporación</span><span class="metrica__valor mono">${d.evapotranspiracionMmDia.toFixed(1).replace('.', ',')}<small> mm/día</small></span></div>
            </div>
        </div>`;
    return `
        <p class="paso__texto">${esc(r.clima.texto)}</p>
        <div class="rejilla">
            ${tarjeta('verano', 'Verano', r.clima.verano)}
            ${tarjeta('invierno', 'Invierno', r.clima.invierno)}
        </div>`;
}

// ----- Plan -----
function nombreCorto(nombre) {
    return cap(nombre.replace(/^Plan (de |del )?/i, ''));
}

function vistazo(plan) {
    const filas = [1, 2, 3].map(anio => {
        const delAnio = plan.temporadas.filter(t => t.anio === anio);
        return `<div class="vistazo__fila">
            <span class="vistazo__anio">Año ${anio}</span>
            ${delAnio.map(t => `<div class="vistazo__celda vistazo__celda--${t.estacion}"><small>${cap(t.estacion)}</small><b>${esc(t.cultivo)}</b></div>`).join('')}
        </div>`;
    });
    return `<div class="vistazo" aria-label="Rotación de un vistazo">${filas.join('')}</div>`;
}

function indicadores(ind) {
    const rango = ind.margenMalosUSD !== null && ind.margenBuenosUSD !== null
        ? `Entre ${usd(ind.margenMalosUSD)} y ${usd(ind.margenBuenosUSD)}` : 'Sin rango disponible';
    const mejora = ind.sueloFinal - ind.sueloInicial;
    const sueloNota = mejora === 0 ? 'Queda igual' : mejora > 0 ? `Mejora ${mejora} puntos` : `Baja ${Math.abs(mejora)} puntos`;
    return `<div class="indicadores">
        <div class="tarjeta metrica metrica--acento">
            <span class="metrica__etiqueta">Margen esperado por ha</span>
            <span class="metrica__valor">${usd(ind.margenUSD)}</span>
            <span class="metrica__nota">${esc(rango)}</span>
        </div>
        <div class="tarjeta metrica">
            <span class="metrica__etiqueta">Riego total</span>
            <span class="metrica__valor">${num(ind.riegoMm)} <small>mm</small></span>
            <span class="metrica__nota">${num(ind.riegoM3PorHa)} m³ por hectárea</span>
        </div>
        <div class="tarjeta metrica">
            <span class="metrica__etiqueta">Estado del suelo</span>
            <span class="metrica__valor">${ind.sueloInicial} → ${ind.sueloFinal} <small>/ 100</small></span>
            <span class="metrica__nota">${sueloNota}</span>
        </div>
    </div>`;
}

function tarjetaTemporada(t) {
    const descanso = t.cultivo === 'Descanso del lote';
    const delta = t.sueloDespues - t.sueloAntes;
    return `
        <article class="temporada temporada--${t.estacion}${descanso ? ' temporada--descanso' : ''}">
            <div class="temporada__cabeza">
                ${iconoEstacion(t.estacion)}
                <div>
                    <p class="temporada__etiqueta">Temporada ${t.numero} · ${cap(t.estacion)}</p>
                    <h4 class="temporada__cultivo">${esc(t.cultivo)}</h4>
                    <p class="temporada__tipo">${esc(t.tipo)}</p>
                </div>
            </div>
            <p class="temporada__texto">${esc(t.explicacion)}</p>
            <div class="temporada__datos">
                <span class="dato"><small>Riego</small><b>${num(t.riegoMm)} mm</b></span>
                ${t.margenUSD === null ? '' : `<span class="dato${t.margenUSD < 0 ? ' dato--negativo' : ''}"><small>Margen</small><b>${usd(t.margenUSD)}</b></span>`}
            </div>
            <div class="suelo" aria-label="Suelo de ${t.sueloAntes} a ${t.sueloDespues} sobre 100">
                <div class="suelo__fila"><span>Suelo</span><b>${t.sueloAntes} → ${t.sueloDespues}${delta ? ` (${delta > 0 ? '+' : '−'}${Math.abs(delta)})` : ''}</b></div>
                <div class="suelo__barra">
                    <div class="suelo__relleno" style="width:${Math.max(0, Math.min(100, t.sueloDespues))}%"></div>
                    <div class="suelo__marca" style="left:calc(${Math.max(0, Math.min(100, t.sueloAntes))}% - 1.5px)"></div>
                </div>
            </div>
        </article>`;
}

function panelPlan(plan) {
    const anios = [1, 2, 3].map(anio => `
        <div class="anio">
            <h4 class="anio__titulo">Año ${anio}</h4>
            ${plan.temporadas.filter(t => t.anio === anio).map(tarjetaTemporada).join('')}
        </div>`).join('');
    return `
        <div class="plan">
            <div class="plan__intro">
                <p class="plan__frase">${esc(plan.enUnaFrase)}</p>
                ${plan.convieneSi ? `<div class="nota-caja">${ICONOS.info}<span>${esc(plan.convieneSi)}</span></div>` : ''}
            </div>
            <div><h3 class="subtitulo" style="margin-bottom:10px">La rotación de un vistazo</h3>${vistazo(plan)}</div>
            ${indicadores(plan.indicadores)}
            <div style="display:grid;gap:18px">
                <h3 class="subtitulo">Temporada por temporada</h3>
                ${anios}
            </div>
            <div class="cierre"><span class="cierre__titulo">En resumen</span><p>${esc(plan.cierre)}</p></div>
        </div>`;
}

function seccionPlanes(r) {
    const lista = r.planes.lista;
    return `
        <div class="selector" role="tablist" aria-label="Elegí un plan">
            ${lista.map((p, i) => `<button class="selector__opcion" type="button" role="tab" id="tab-${esc(p.clave)}" data-plan="${esc(p.clave)}" aria-selected="${i === 0}" aria-controls="panel-plan">${esc(nombreCorto(p.nombre))}</button>`).join('')}
        </div>
        <div id="panel-plan" role="tabpanel" aria-live="polite">${panelPlan(lista[0])}</div>`;
}

function activarPlanes(r) {
    const panel = $('panel-plan');
    const botones = document.querySelectorAll('.selector__opcion');
    botones.forEach(b => b.addEventListener('click', () => {
        const plan = r.planes.lista.find(p => p.clave === b.dataset.plan);
        if (!plan) return;
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
            if (c.mayorMargen === p.clave) ins.push('Mayor ganancia');
            if (c.menorRiego === p.clave) ins.push('Menos riego');
            if (c.mejorSuelo === p.clave) ins.push('Mejor suelo');
        }
        const i = p.indicadores;
        return `<div class="tarjeta comparar__plan">
            <h3 class="comparar__nombre">${esc(p.nombre)}</h3>
            <div class="comparar__insignias">${ins.map(x => `<span class="insignia">${x}</span>`).join('')}</div>
            <div class="metrica"><span class="metrica__etiqueta">Margen esperado</span><span class="metrica__valor">${usd(i.margenUSD)}</span></div>
            <div class="metrica"><span class="metrica__etiqueta">Riego total</span><span class="metrica__valor">${num(i.riegoMm)} <small>mm</small></span></div>
            <div class="metrica"><span class="metrica__etiqueta">Suelo al final</span><span class="metrica__valor">${i.sueloFinal} <small>/ 100</small></span></div>
            <p class="comparar__cultivos">${esc([...new Set(p.temporadas.map(t => t.cultivo))].join(' · '))}</p>
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
                <div class="metrica"><span class="metrica__etiqueta">Cultivo</span><span class="metrica__valor">${esc(p.cultivo)}</span></div>
                <div class="metrica"><span class="metrica__etiqueta">Empieza a producir</span><span class="metrica__valor">Año ${p.aniosHastaProducir}</span></div>
                <div class="metrica metrica--acento"><span class="metrica__etiqueta">Inversión inicial</span><span class="metrica__valor">${usd(p.inversionUSDporHa)} <small>/ ha</small></span></div>
                <div class="metrica"><span class="metrica__etiqueta">Riego por año</span><span class="metrica__valor">${num(p.riegoPorAnioMm)} <small>mm</small></span></div>
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
    const pasos = [
        { id: 'campo', nav: 'Tu campo', titulo: r.campo.titulo, cuerpo: seccionCampo(r, parcela) },
        { id: 'clima', nav: 'Clima', titulo: r.clima.titulo, cuerpo: seccionClima(r) },
        { id: 'planes', nav: 'Tu plan', titulo: r.planes.titulo, cuerpo: seccionPlanes(r) },
        { id: 'comparacion', nav: 'Comparación', titulo: r.comparacion.titulo, cuerpo: seccionComparacion(r) }
    ];
    if (r.permanente) pasos.push({ id: 'permanente', nav: 'Permanente', titulo: r.permanente.titulo, cuerpo: seccionPermanente(r.permanente) });
    pasos.push({ id: 'cierre', nav: 'Antes de sembrar', titulo: 'Antes de sembrar y próximos pasos', cuerpo: seccionCierre(r) });

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
            <a class="boton boton--secundario" href="../index.html#mapa">Marcar otra parcela</a>
            <button class="boton boton--primario" id="btn-imprimir" type="button">Guardar o imprimir el plan</button>
        </div>
        <p class="r-pie__nota">Estimaciones orientativas con datos de NASA POWER. Confirmalas con un técnico del INTA antes de sembrar. Prototipo creado para NASA Space Apps 2026.</p>`;
    $('btn-imprimir').addEventListener('click', () => window.print());

    $('estado').hidden = true;
    $('contenido').hidden = false;
    activarPlanes(r);
    activarNavegacion(pasos);
    document.title = `${r.encabezado.titulo} · ZondaSat`;
}

// Resalta en la barra la sección que se está leyendo
function activarNavegacion(pasos) {
    const enlaces = new Map([...document.querySelectorAll('#nav a')].map(a => [a.dataset.paso, a]));
    const marcar = id => enlaces.forEach((a, k) => {
        if (k === id) { a.setAttribute('aria-current', 'true'); a.scrollIntoView({ block: 'nearest', inline: 'center' }); }
        else a.removeAttribute('aria-current');
    });
    marcar(pasos[0].id);
    if (!('IntersectionObserver' in window)) return;
    const visor = new IntersectionObserver(entradas => {
        for (const e of entradas) if (e.isIntersecting) marcar(e.target.id);
    }, { rootMargin: '-25% 0px -65% 0px' });
    pasos.forEach(p => visor.observe($(p.id)));
}

// ---------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------
async function iniciar() {
    const parcela = leer(CLAVE_PARCELA);
    let informe = leer(CLAVE_INFORME);

    if (!informe && parcela && parcela.centroide) {
        try { informe = planificarTerreno(parcela.centroide); }
        catch (error) { console.error('No se pudo generar el informe', error); }
    }
    if (!informe) {
        mostrarEstado({
            titulo: 'Todavía no marcaste tu parcela',
            texto: 'Marcá las esquinas de tu campo en el mapa y armamos tu plan.',
            boton: { href: '../index.html#mapa', texto: 'Ir al mapa' }
        });
        return;
    }

    // Si ya se redactó con IA para este mismo informe, se reutiliza (evita otra llamada)
    const marca = firma(JSON.stringify(informe));
    const guardado = leer(CLAVE_RESULTADOS);
    if (guardado && guardado.marca === marca && guardado.resultados) {
        dibujar(guardado.resultados, parcela);
        return;
    }

    try {
        const { resultados } = await generarResultadosDesdeInforme(informe);
        if (resultados.fuente === 'ia') {
            try { sessionStorage.setItem(CLAVE_RESULTADOS, JSON.stringify({ marca, resultados })); } catch { /* sin espacio: no se guarda */ }
        }
        dibujar(resultados, parcela);
    } catch (error) {
        console.error('ZondaSat: no se pudieron armar los resultados', error);
        mostrarEstado({
            titulo: 'No pudimos armar tu plan',
            texto: 'Hubo un problema al redactar la explicación. Probá de nuevo en unos segundos.',
            boton: { href: 'resultado.html', texto: 'Reintentar' }
        });
    }
}

iniciar();
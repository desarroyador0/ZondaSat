import { ZONAS_SAN_JUAN } from './datos_clima.js';
import { CULTIVOS_SAN_JUAN } from './cultivos.js';

// =====================================================================
// Parámetros del modelo. Son supuestos de diseño: ajustarlos acá.
// =====================================================================
export const PARAMS = {
    maxDistanciaKm: 80,              // más lejos que esto de toda zona => fueraDeRango
    amortiguacionTendencia: 0.3,     // escenario "tendencia": fracción del cambio 2026 vs. histórico que se extrapola

    aguaDesdeClima: true,            // true: el puntaje de agua se calcula con el clima de la zona
                                     // false: se usa el puntaje fijo de cultivos.js (puntajes[0])
    lluviaEfectiva: 0.7,             // fracción de la lluvia que aprovecha el cultivo
    riegoReferenciaMm: 1200,         // riego por temporada que equivale a puntaje de agua 0

    sueloInicial: 50,                // salud del suelo 0-100 al empezar el plan
    sueloNeutro: 6,                  // puntaje de "Cuidado del suelo" que ni mejora ni degrada
    puntosSueloPorNivel: 3,          // cuánto cambia el suelo por cada punto sobre/bajo el neutro
    bonoSueloFijaN: 4,               // mejora extra del suelo si el cultivo fija nitrógeno
    bonoGananciaTrasFijaN: 1.1,      // el cultivo que sigue a una leguminosa rinde 10 % más
    rindeSueloMin: 0.7,              // con suelo 0 la ganancia se multiplica por 0,7 ...
    rindeSueloRango: 0.6,            // ... y con suelo 100 por 1,3
    penalizacionRepetirFamilia: 0.85,// ganancia si la misma familia ocupó el lote un año antes
    recuperacionBarbecho: 3,         // puntos de suelo que recupera una temporada sin cultivo
    tipoCambioARSporUSD: 1400        // con el que se convirtieron los precios de cultivos.js
};

// Los tres planes (los pesos suman 100)
export const PERFILES = {
    economico: { nombre: "Plan económico", objetivo: "Obtener la mayor ganancia por hectárea",
                 pesos: { agua: 20, ganancia: 60, suelo: 20 } },
    hidrico:   { nombre: "Plan de ahorro de agua", objetivo: "Usar la menor cantidad de agua de riego",
                 pesos: { agua: 60, ganancia: 20, suelo: 20 } },
    suelo:     { nombre: "Plan de cuidado del suelo", objetivo: "Dejar el suelo en el mejor estado a largo plazo",
                 pesos: { agua: 20, ganancia: 20, suelo: 60 } }
};

const ESCENARIOS = {
    base: "Promedio de los cinco años 2022-2026, igual para los tres años del plan",
    como2026: "Los tres años del plan se parecen a 2026",
    tendencia: "Parte de 2026 y prolonga, amortiguado, el cambio respecto de 2022-2025"
};

// Datos agronómicos que no están en cultivos.js
//   temporada : "caliente" (verano) | "fria" (invierno) | "ambas" | "perenne"
//   porAnio   : true si rendimiento y costo de cultivos.js son anuales (se reparten en 2 temporadas)
//   kc        : coeficiente de cultivo promedio del ciclo (aproximado a partir de FAO-56; verificar)
//   dias      : días que el cultivo ocupa el lote dentro de la temporada
//   confianza : solidez de los datos económicos cargados ("media" | "baja")
const AGRONOMIA = {
    "Vid (Uva)":                 { tipo: "Frutal perenne", temporada: "perenne", familia: "Vitaceae", familiaComun: "vides",
                                   fijaN: false, porAnio: true, kc: { verano: 0.60, invierno: 0.15 }, dias: 182, confianza: "media",
                                   aniosHastaProducir: 3, implantacionUSDha: 20000,
                                   clima: { tempMaxTolerada: 38, tempMinTolerada: -2, humedadRaicesMin: 0.31, vientoMaxTolerado: 9.0 } },
    "Olivo":                     { tipo: "Frutal perenne", temporada: "perenne", familia: "Oleaceae", familiaComun: "olivos",
                                   fijaN: false, porAnio: true, kc: { verano: 0.70, invierno: 0.65 }, dias: 182, confianza: "baja",
                                   aniosHastaProducir: 3, implantacionUSDha: 12000,
                                   clima: { tempMaxTolerada: 41, tempMinTolerada: -4, humedadRaicesMin: 0.26, vientoMaxTolerado: 11.0 } },
    "Pistacho":                  { tipo: "Frutal perenne de alto valor", temporada: "perenne", familia: "Anacardiaceae", familiaComun: "pistachos",
                                   fijaN: false, porAnio: true, kc: { verano: 0.85, invierno: 0.15 }, dias: 182, confianza: "media",
                                   aniosHastaProducir: 5, implantacionUSDha: 14000,
                                   clima: { tempMaxTolerada: 42, tempMinTolerada: -6, humedadRaicesMin: 0.27, vientoMaxTolerado: 10.5 } },
    "Tomate para industria":     { tipo: "Hortaliza de verano", temporada: "caliente", familia: "Solanaceae", familiaComun: "solanáceas",
                                   fijaN: false, porAnio: false, kc: { verano: 0.90 }, dias: 135, confianza: "media",
                                   clima: { tempMaxTolerada: 34, tempMinTolerada: 7, humedadRaicesMin: 0.34, vientoMaxTolerado: 7.5 } },
    "Melón":                     { tipo: "Hortaliza de verano", temporada: "caliente", familia: "Cucurbitaceae", familiaComun: "cucurbitáceas",
                                   fijaN: false, porAnio: false, kc: { verano: 0.80 }, dias: 100, confianza: "baja",
                                   clima: { tempMaxTolerada: 36, tempMinTolerada: 8, humedadRaicesMin: 0.33, vientoMaxTolerado: 8.0 } },
    "Ajo":                       { tipo: "Hortaliza de invierno", temporada: "fria", familia: "Amaryllidaceae", familiaComun: "aliáceas (ajo y cebolla)",
                                   fijaN: false, porAnio: false, kc: { invierno: 0.85 }, dias: 182, confianza: "media",
                                   clima: { tempMaxTolerada: 27, tempMinTolerada: -4, humedadRaicesMin: 0.29, vientoMaxTolerado: 9.5 } },
    "Cebolla":                   { tipo: "Hortaliza de invierno", temporada: "fria", familia: "Amaryllidaceae", familiaComun: "aliáceas (ajo y cebolla)",
                                   fijaN: false, porAnio: false, kc: { invierno: 0.90 }, dias: 182, confianza: "baja",
                                   clima: { tempMaxTolerada: 29, tempMinTolerada: -3, humedadRaicesMin: 0.30, vientoMaxTolerado: 9.5 } },
    "Garbanzo (Leguminosa)":     { tipo: "Legumbre de invierno", temporada: "fria", familia: "Fabaceae", familiaComun: "leguminosas",
                                   fijaN: true, porAnio: false, kc: { invierno: 0.70 }, dias: 150, confianza: "baja",
                                   clima: { tempMaxTolerada: 30, tempMinTolerada: -2, humedadRaicesMin: 0.27, vientoMaxTolerado: 9.0 } },
    "Alfalfa / Cobertura Verde": { tipo: "Forrajera y recuperadora de suelo", temporada: "ambas", familia: "Fabaceae", familiaComun: "leguminosas",
                                   fijaN: true, porAnio: true, kc: { verano: 0.95, invierno: 0.60 }, dias: 182, confianza: "baja",
                                   clima: { tempMaxTolerada: 37, tempMinTolerada: -5, humedadRaicesMin: 0.25, vientoMaxTolerado: 11.5 } }
};

const BARBECHO = "Barbecho (sin cultivo viable)";
const VARIABLES_CLIMA = ["radiacion", "tempMax", "tempMin", "viento", "humedadSup", "humedadRaices", "precipitacion"];
const redondear = (x, d = 2) => Number(x.toFixed(d));
const limitar = (x, a, b) => Math.max(a, Math.min(b, x));
const esPerenne = nombre => AGRONOMIA[nombre].temporada === "perenne";

// =====================================================================
// 1. Ubicación del terreno
// =====================================================================

// Utilidad para el frontend: centro de un polígono [{lat, lon}, ...].
// planificarTerreno ya no la usa: recibe el centro calculado.
export function calcularCentroide(puntos) {
    let sumaLat = 0;
    let sumaLon = 0;
    for (let i = 0; i < puntos.length; i++) {
        sumaLat += puntos[i].lat;
        sumaLon += puntos[i].lon;
    }
    return { lat: sumaLat / puntos.length, lon: sumaLon / puntos.length };
}

// Distancia real sobre la superficie terrestre, en km (fórmula de haversine)
function distanciaKm(lat1, lon1, lat2, lon2) {
    const rad = g => g * Math.PI / 180;
    const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 +
              Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(a));
}

// Devuelve la zona más cercana, a cuántos km está y si el terreno queda fuera de rango
export function ubicarZona(latUsuario, lonUsuario, maxKm = PARAMS.maxDistanciaKm) {
    let zona = ZONAS_SAN_JUAN[0];
    let menor = Infinity;
    for (const z of ZONAS_SAN_JUAN) {
        const km = distanciaKm(latUsuario, lonUsuario, z.lat, z.lon);
        if (km < menor) { menor = km; zona = z; }
    }
    return { zona, distanciaKm: redondear(menor, 1), fueraDeRango: menor > maxKm };
}

// Igual que antes: devuelve solo la zona (se mantiene para no romper el código existente)
export function encontrarZonaMasCercana(latUsuario, lonUsuario) {
    return ubicarZona(latUsuario, lonUsuario).zona;
}

// =====================================================================
// 2. Clima de las seis temporadas
//   opciones.inicio    : "verano" (por defecto) | "invierno"
//   opciones.escenario : "base" (por defecto) | "como2026" | "tendencia"
// =====================================================================
export function obtenerSeisTemporadas(zonaSeleccionada, opciones = {}) {
    const inicio = opciones.inicio === "invierno" ? "invierno" : "verano";
    const escenario = ESCENARIOS[opciones.escenario] ? opciones.escenario : "base";
    const orden = inicio === "verano" ? ["verano", "invierno"] : ["invierno", "verano"];
    const lista = [];

    for (let anio = 1; anio <= 3; anio++) {
        for (const estacion of orden) {
            const hist = zonaSeleccionada.datos[estacion].historico_22_25;
            const act26 = zonaSeleccionada.datos[estacion].actual_2026;
            const clima = {};

            for (const v of VARIABLES_CLIMA) {
                let valor;
                if (escenario === "como2026") {
                    valor = act26[v];
                } else if (escenario === "tendencia") {
                    const cambioAnual = (act26[v] - hist[v]) / 2.5;   // 2,5 años entre el centro de 2022-25 y 2026
                    valor = act26[v] + cambioAnual * anio * PARAMS.amortiguacionTendencia;
                } else {
                    valor = (4 * hist[v] + act26[v]) / 5;             // promedio de los 5 años 2022-2026
                }

                // Límites físicos
                if (v === "humedadSup" || v === "humedadRaices") valor = limitar(valor, 0, 1);
                else if (v === "precipitacion" || v === "viento" || v === "radiacion") valor = Math.max(0, valor);

                clima[v] = redondear(valor);
            }

            lista.push({
                titulo: `${estacion.charAt(0).toUpperCase() + estacion.slice(1)} - Año ${anio}`,
                estacion,
                anio,
                clima
            });
        }
    }
    return lista;
}

// =====================================================================
// 3. Agua y economía de un cultivo
// =====================================================================

// Evapotranspiración de referencia en mm/día (Hargreaves, forma con radiación medida).
// radiacion en MJ/m²/día; 2,45 MJ evaporan 1 mm de agua.
export function calcularET0(clima) {
    const tempMedia = (clima.tempMax + clima.tempMin) / 2;
    return Math.max(0, 0.0135 * (tempMedia + 17.8) * clima.radiacion / 2.45);
}

function calcularAgua(ag, temporada) {
    const kc = ag.kc[temporada.estacion];
    const et0 = calcularET0(temporada.clima);
    const demanda = kc * et0 * ag.dias;
    const lluvia = PARAMS.lluviaEfectiva * temporada.clima.precipitacion * ag.dias;
    const riego = Math.max(0, demanda - lluvia);
    return {
        riegoEstimadoMm: Math.round(riego),
        riegoM3PorHa: Math.round(riego) * 10,           // 1 mm = 10 m³ por hectárea
        demandaDelCultivoMm: Math.round(demanda),
        lluviaAprovechadaMm: Math.round(lluvia),
        et0MmPorDia: redondear(et0),
        coeficienteCultivoKc: kc,
        diasEnElLote: ag.dias
    };
}

// Margen en USD por hectárea y temporada. null en perennes: depende de la implantación y los años sin producir.
function calcularEconomia(cultivo) {
    const ag = AGRONOMIA[cultivo.nombre];
    const base = { rendimientoTHa: cultivo.rendimientoTHa, precioUSDt: cultivo.precioUSDt, costoUSDha: cultivo.costoUSDha,
                   datosPorAnio: ag.porAnio, confianzaDatos: ag.confianza };
    if (ag.temporada === "perenne") {
        return { ...base, margenEsperadoUSD: null, aniosHastaProducir: ag.aniosHastaProducir, implantacionUSDha: ag.implantacionUSDha };
    }
    const r = cultivo.rendimientoTHa;
    const margen = rinde => Math.round((rinde * cultivo.precioUSDt - cultivo.costoUSDha) / (ag.porAnio ? 2 : 1));
    return {
        ...base,
        margenEsperadoUSD: margen(0.25 * r.min + 0.5 * r.media + 0.25 * r.max),
        margenMalAnioUSD: margen(r.min),
        margenAnioMedioUSD: margen(r.media),
        margenBuenAnioUSD: margen(r.max)
    };
}

function normalizarPesos(pesos) {
    const total = pesos.agua + pesos.ganancia + pesos.suelo;
    if (!(total > 0)) throw new Error("Los pesos deben sumar más que cero");
    return { agua: pesos.agua / total, ganancia: pesos.ganancia / total, suelo: pesos.suelo / total };
}

// =====================================================================
// 4. Evaluación de un cultivo en una temporada
//   anteriores: nombres de los cultivos de las temporadas previas (null si hubo barbecho)
//   Devuelve { viable: false, motivoDescarte } o { viable: true, ...detalle }
// =====================================================================
function evaluarPaso(cultivo, anteriores, suelo, pesos, temporada) {
    const ag = AGRONOMIA[cultivo.nombre];
    const clima = temporada.clima;
    const tol = ag.clima;
    const perenne = ag.temporada === "perenne";
    const descartar = (codigo, texto) => ({ viable: false, cultivo: cultivo.nombre, motivoDescarte: { codigo, texto } });

    if (clima.tempMax > tol.tempMaxTolerada)
        return descartar("calor", `La temperatura máxima media de la temporada (${clima.tempMax} °C) supera lo que tolera (${tol.tempMaxTolerada} °C)`);
    if (clima.tempMin < tol.tempMinTolerada)
        return descartar("frio", `La temperatura mínima media de la temporada (${clima.tempMin} °C) está por debajo de lo que tolera (${tol.tempMinTolerada} °C)`);
    if (clima.viento > tol.vientoMaxTolerado)
        return descartar("viento", `El viento medio de la temporada (${clima.viento} m/s) supera lo que tolera (${tol.vientoMaxTolerado} m/s)`);

    const hace = n => anteriores[anteriores.length - n] || null;
    const previo = hace(1);
    const unAnioAntes = hace(2);
    if (!perenne && previo && AGRONOMIA[previo].familia === ag.familia)
        return descartar("familia_consecutiva", `Es de la misma familia (${ag.familiaComun}) que el cultivo anterior (${previo}); no se repite familia en temporadas seguidas`);

    const [aguaFija, gananciaBase, sueloBase] = cultivo.puntajes;
    const efectos = [];

    // Agua
    const agua = calcularAgua(ag, temporada);
    const puntajeAgua = PARAMS.aguaDesdeClima
        ? limitar(10 * (1 - agua.riegoEstimadoMm / PARAMS.riegoReferenciaMm), 0, 10)
        : aguaFija * Math.min(1, clima.humedadRaices / tol.humedadRaicesMin);

    // Ganancia: depende del estado del suelo y de lo que se cultivó antes
    const factorSuelo = PARAMS.rindeSueloMin + PARAMS.rindeSueloRango * suelo / 100;
    let ganancia = gananciaBase * factorSuelo;
    const pctSuelo = Math.round((factorSuelo - 1) * 100);
    if (pctSuelo !== 0)
        efectos.push({ codigo: "estado_suelo", texto: `El estado del suelo al sembrar (${suelo}/100) ${pctSuelo > 0 ? "sube" : "baja"} la ganancia esperada un ${Math.abs(pctSuelo)} %` });
    if (!perenne && previo && AGRONOMIA[previo].fijaN && !ag.fijaN) {
        ganancia *= PARAMS.bonoGananciaTrasFijaN;
        efectos.push({ codigo: "bono_leguminosa", texto: `Viene después de ${previo}, que deja nitrógeno en el suelo: +${Math.round((PARAMS.bonoGananciaTrasFijaN - 1) * 100)} % de ganancia` });
    }
    if (!perenne && unAnioAntes && AGRONOMIA[unAnioAntes].familia === ag.familia) {
        ganancia *= PARAMS.penalizacionRepetirFamilia;
        efectos.push({ codigo: "repite_familia", texto: `La misma familia (${ag.familiaComun}) ocupó el lote un año antes (${unAnioAntes}): −${Math.round((1 - PARAMS.penalizacionRepetirFamilia) * 100)} % de ganancia por mayor riesgo de plagas y enfermedades` });
    }
    if (ganancia > 10) { ganancia = 10; efectos.push({ codigo: "ganancia_al_tope", texto: "El puntaje de ganancia quedó en el máximo de la escala (10)" }); }

    // Suelo
    const cambioSuelo = (sueloBase - PARAMS.sueloNeutro) * PARAMS.puntosSueloPorNivel + (ag.fijaN ? PARAMS.bonoSueloFijaN : 0);
    const sueloDespues = redondear(limitar(suelo + cambioSuelo, 0, 100), 0);
    if (ag.fijaN) efectos.push({ codigo: "fija_nitrogeno", texto: "Es una leguminosa: fija nitrógeno del aire y lo deja disponible para el cultivo siguiente" });
    if (sueloDespues > suelo) efectos.push({ codigo: "mejora_suelo", texto: `Mejora el suelo ${sueloDespues - suelo} puntos (de ${suelo} a ${sueloDespues})` });
    if (sueloDespues < suelo) efectos.push({ codigo: "desgasta_suelo", texto: `Desgasta el suelo ${suelo - sueloDespues} puntos (de ${suelo} a ${sueloDespues})` });

    const puntos = pesos.agua * puntajeAgua + pesos.ganancia * ganancia + pesos.suelo * sueloBase;

    return {
        viable: true,
        cultivo: cultivo.nombre,
        tipo: ag.tipo,
        familia: ag.familiaComun,
        puntos: redondear(puntos),
        desglose: { agua: redondear(puntajeAgua), ganancia: redondear(ganancia), suelo: sueloBase },
        agua,
        economia: calcularEconomia(cultivo),
        suelo: { antes: suelo, despues: sueloDespues, cambio: sueloDespues - suelo, fijaNitrogeno: ag.fijaN },
        climaFrenteATolerancia: {
            tempMaxC: { temporada: clima.tempMax, tolera: tol.tempMaxTolerada },
            tempMinC: { temporada: clima.tempMin, tolera: tol.tempMinTolerada },
            vientoMs: { temporada: clima.viento, tolera: tol.vientoMaxTolerado }
        },
        efectos
    };
}

function pasoBarbecho(suelo) {
    const despues = limitar(suelo + PARAMS.recuperacionBarbecho, 0, 100);
    return {
        viable: true, cultivo: BARBECHO, tipo: "Descanso del lote", familia: null, puntos: 0,
        desglose: { agua: 0, ganancia: 0, suelo: 0 },
        agua: { riegoEstimadoMm: 0, riegoM3PorHa: 0 },
        economia: { margenEsperadoUSD: 0 },
        suelo: { antes: suelo, despues, cambio: despues - suelo, fijaNitrogeno: false },
        efectos: [{ codigo: "barbecho", texto: "Ningún cultivo de la lista se puede sembrar esta temporada; el lote descansa y el suelo se recupera un poco" }]
    };
}

const candidatosDe = temporada => {
    const tipo = temporada.estacion === "verano" ? "caliente" : "fria";
    return CULTIVOS_SAN_JUAN.filter(c => {
        const t = AGRONOMIA[c.nombre].temporada;
        return t === "ambas" || t === tipo;
    });
};

// Totales de una secuencia de pasos
function totales(pasos) {
    const suma = campo => pasos.reduce((s, p) => s + p.economia[campo], 0);
    const conMargen = pasos.every(p => p.economia.margenEsperadoUSD !== null);
    const conRango = conMargen && pasos.every(p => p.cultivo === BARBECHO || p.economia.margenMalAnioUSD !== undefined);
    const usados = {};
    for (const p of pasos) usados[p.cultivo] = (usados[p.cultivo] || 0) + 1;
    return {
        puntaje: redondear(pasos.reduce((s, p) => s + p.puntos, 0) / pasos.length),   // promedio 0-10
        margenTotalUSD: conMargen ? suma("margenEsperadoUSD") : null,
        margenTotalMalosAniosUSD: conRango ? pasos.reduce((s, p) => s + (p.economia.margenMalAnioUSD ?? 0), 0) : null,
        margenTotalBuenosAniosUSD: conRango ? pasos.reduce((s, p) => s + (p.economia.margenBuenAnioUSD ?? 0), 0) : null,
        riegoTotalMm: pasos.reduce((s, p) => s + p.agua.riegoEstimadoMm, 0),
        riegoTotalM3PorHa: pasos.reduce((s, p) => s + p.agua.riegoM3PorHa, 0),
        sueloInicial: pasos[0].suelo.antes,
        sueloFinal: pasos[pasos.length - 1].suelo.despues,
        vecesPorCultivo: usados
    };
}

// =====================================================================
// 5. Planes
//   opciones: { inicio, escenario, sueloInicial }
// =====================================================================

// Un plan con los pesos indicados, por ejemplo { agua: 30, ganancia: 50, suelo: 20 }
export function generarPlan(zona, pesosUsuario, opciones = {}) {
    const pesos = normalizarPesos(pesosUsuario);
    const temporadas = obtenerSeisTemporadas(zona, opciones);
    const suelo0 = opciones.sueloInicial ?? PARAMS.sueloInicial;
    const perennes = CULTIVOS_SAN_JUAN.filter(c => esPerenne(c.nombre));

    // --- Rotación: se prueban todas las secuencias válidas de 6 temporadas ---
    const completas = [];
    const buscar = (pasos, anteriores, suelo, total) => {
        const t = pasos.length;
        if (t === temporadas.length) { completas.push({ total, pasos: pasos.slice() }); return; }
        let hubo = false;
        for (const c of candidatosDe(temporadas[t])) {
            const paso = evaluarPaso(c, anteriores, suelo, pesos, temporadas[t]);
            if (!paso.viable) continue;
            hubo = true;
            pasos.push(paso); anteriores.push(c.nombre);
            buscar(pasos, anteriores, paso.suelo.despues, total + paso.puntos);
            pasos.pop(); anteriores.pop();
        }
        if (!hubo) {   // ningún cultivo sirve esta temporada: el lote descansa
            const paso = pasoBarbecho(suelo);
            pasos.push(paso); anteriores.push(null);
            buscar(pasos, anteriores, paso.suelo.despues, total);
            pasos.pop(); anteriores.pop();
        }
    };
    buscar([], [], suelo0, 0);
    completas.sort((a, b) => b.total - a.total);
    const mejor = completas[0].pasos;

    // Detalle de la rotación elegida: qué otras opciones había en cada temporada y por qué no se eligieron
    const anteriores = [];
    const detalle = mejor.map((paso, i) => {
        const opciones = candidatosDe(temporadas[i]).map(c => {
            const e = evaluarPaso(c, anteriores, paso.suelo.antes, pesos, temporadas[i]);
            return e.viable
                ? { cultivo: c.nombre, sePodiaSembrar: true, puntos: e.puntos, desglose: e.desglose, elegido: c.nombre === paso.cultivo }
                : { cultivo: c.nombre, sePodiaSembrar: false, motivoDescarte: e.motivoDescarte.texto, elegido: false };
        });
        const viables = opciones.filter(o => o.sePodiaSembrar).sort((a, b) => b.puntos - a.puntos);
        const mejorSuelta = viables[0] || null;
        const eraLaMejor = !mejorSuelta || mejorSuelta.elegido;
        anteriores.push(paso.cultivo === BARBECHO ? null : paso.cultivo);
        const { viable, ...resto } = paso;
        return {
            numero: i + 1,
            titulo: temporadas[i].titulo,
            estacion: temporadas[i].estacion,
            anio: temporadas[i].anio,
            ...resto,
            eleccion: {
                cantidadDeOpcionesViables: viables.length,
                eraLaDeMayorPuntajeEnEstaTemporada: eraLaMejor,
                nota: viables.length <= 1
                    ? "Era la única opción que se podía sembrar esta temporada"
                    : eraLaMejor
                        ? "Fue la opción de mayor puntaje entre las que se podían sembrar esta temporada"
                        : `Mirando solo esta temporada, ${mejorSuelta.cultivo} puntuaba más (${mejorSuelta.puntos} contra ${paso.puntos}); se eligió ${paso.cultivo} porque la secuencia completa de seis temporadas suma más así`
            },
            opcionesDeLaTemporada: opciones
        };
    });

    // --- Cultivo permanente: el mismo perenne las 6 temporadas ---
    const evaluados = perennes.map(c => {
        const pasos = [];
        let suelo = suelo0;
        for (const temporada of temporadas) {
            const paso = evaluarPaso(c, [], suelo, pesos, temporada);
            if (!paso.viable) return { cultivo: c.nombre, viable: false, motivoDescarte: `${temporada.titulo}: ${paso.motivoDescarte.texto}` };
            pasos.push(paso);
            suelo = paso.suelo.despues;
        }
        const t = totales(pasos);
        const ag = AGRONOMIA[c.nombre];
        return {
            cultivo: c.nombre, viable: true, tipo: ag.tipo, puntaje: t.puntaje,
            desglosePromedio: {
                agua: redondear(pasos.reduce((s, p) => s + p.desglose.agua, 0) / pasos.length),
                ganancia: redondear(pasos.reduce((s, p) => s + p.desglose.ganancia, 0) / pasos.length),
                suelo: pasos[0].desglose.suelo
            },
            riegoPorAnioMm: Math.round(t.riegoTotalMm / 3),
            riegoPorAnioM3PorHa: Math.round(t.riegoTotalM3PorHa / 3),
            sueloFinal: t.sueloFinal,
            aniosHastaProducir: ag.aniosHastaProducir,
            implantacionUSDha: ag.implantacionUSDha,
            confianzaDatos: ag.confianza,
            aclaracion: `Plantado ahora, empezaría a producir recién al año ${ag.aniosHastaProducir}: dentro de los 3 años del plan casi no genera ingresos y requiere una inversión inicial de unos ${ag.implantacionUSDha} USD por hectárea. Su puntaje de ganancia mide la rentabilidad a lo largo de toda su vida útil.`
        };
    });
    const viablesPerennes = evaluados.filter(e => e.viable).sort((a, b) => b.puntaje - a.puntaje);

    return {
        pesos: pesosUsuario,
        rotacion: { ...totales(mejor), cultivos: mejor.map(p => p.cultivo), temporadas: detalle },
        alternativas: completas.slice(1, 3).map(x => ({ ...totales(x.pasos), cultivos: x.pasos.map(p => p.cultivo) })),
        permanente: viablesPerennes[0] || null,                          // null si ningún perenne tolera el clima
        otrosPermanentes: evaluados.filter(e => e !== viablesPerennes[0])
    };
}

// Los tres planes: económico, hídrico y de suelo
export function generarPlanes(zona, opciones = {}) {
    const planes = {};
    for (const [clave, perfil] of Object.entries(PERFILES)) {
        planes[clave] = { nombre: perfil.nombre, objetivo: perfil.objetivo, ...generarPlan(zona, perfil.pesos, opciones) };
    }
    return planes;
}

// =====================================================================
// 6. Informe completo (lo que recibe el frontend y el modelo de lenguaje)
//   opciones: { inicio, escenario, sueloInicial, pesosUsuario }
// =====================================================================

function resumirClima(zona, temporadas) {
    const resumen = {
        fuente: "NASA POWER (promedios de temporada de la celda que contiene la zona, de unos 50 km de lado)",
        unidades: { radiacion: "MJ/m² por día", tempMax: "°C", tempMin: "°C", viento: "m/s",
                    humedadSup: "índice 0-1", humedadRaices: "índice 0-1", precipitacion: "mm por día" }
    };
    for (const estacion of ["verano", "invierno"]) {
        const usada = temporadas.find(t => t.estacion === estacion);
        const hist = zona.datos[estacion].historico_22_25;
        const act = zona.datos[estacion].actual_2026;
        const comparacion = {};
        for (const v of VARIABLES_CLIMA) comparacion[v] = { promedio2022a2025: hist[v], anio2026: act[v], diferencia: redondear(act[v] - hist[v]) };
        resumen[estacion] = {
            usadoEnElPlan: usada.clima,
            evapotranspiracionET0MmPorDia: redondear(calcularET0(usada.clima)),
            lluviaDeLaTemporadaMm: Math.round(usada.clima.precipitacion * 182),
            como2026FrenteAlHistorico: comparacion
        };
    }
    return resumen;
}

function compararPlanes(planes) {
    const filas = Object.entries(planes).map(([clave, p]) => ({
        plan: clave, nombre: p.nombre, cultivos: p.rotacion.cultivos,
        margenTotalUSD: p.rotacion.margenTotalUSD, riegoTotalMm: p.rotacion.riegoTotalMm, sueloFinal: p.rotacion.sueloFinal
    }));
    const mejorEn = (campo, signo) => filas.reduce((a, b) => (signo * (b[campo] - a[campo]) > 0 ? b : a)).plan;
    const referencia = filas.find(f => f.plan === "economico") || filas[0];
    const iguales = filas.every(f => f.cultivos.join("|") === filas[0].cultivos.join("|"));
    return {
        tabla: filas,
        mayorMargen: mejorEn("margenTotalUSD", 1),
        menorRiego: mejorEn("riegoTotalMm", -1),
        mejorSueloFinal: mejorEn("sueloFinal", 1),
        frenteAlPlanEconomico: filas.filter(f => f !== referencia).map(f => ({
            plan: f.plan,
            diferenciaMargenUSD: f.margenTotalUSD - referencia.margenTotalUSD,
            diferenciaRiegoMm: f.riegoTotalMm - referencia.riegoTotalMm,
            diferenciaSueloFinal: f.sueloFinal - referencia.sueloFinal
        })),
        losPlanesCoinciden: iguales,
        notaSiCoinciden: iguales
            ? "Los planes proponen la misma rotación porque el clima de la zona deja muy pocos cultivos posibles en cada temporada"
            : null
    };
}

function armarAdvertencias(terreno, planes, sueloEsSupuesto) {
    const usados = new Set();
    for (const p of Object.values(planes)) for (const c of p.rotacion.cultivos) usados.add(c);
    const avisos = [
        "Los resultados son estimaciones orientativas para comparar opciones. Conviene confirmarlos con un técnico o con el INTA de la zona antes de decidir.",
        "Las temperaturas son promedios de toda la temporada: no muestran heladas puntuales, olas de calor ni ráfagas de viento Zonda.",
        "El clima corresponde a un área amplia y no reemplaza a una estación meteorológica local.",
        `Rendimientos, precios y costos provienen de fuentes públicas de 2020 a 2026 y pueden cambiar. Los precios en pesos se convirtieron a ${PARAMS.tipoCambioARSporUSD} ARS por USD.`,
        "El margen en dólares es el valor base de cada cultivo: no incluye el efecto del estado del suelo ni de la rotación, que sí influyen en el puntaje.",
        "El riego estimado supone riego eficiente y usa coeficientes de cultivo aproximados; con riego por surco el consumo real es mayor."
    ];
    if (sueloEsSupuesto)
        avisos.push("No se cargó un análisis de suelo: el estado inicial del suelo es un valor medio supuesto.");
    if (terreno && terreno.fueraDeRango)
        avisos.unshift(`El terreno está a ${terreno.distanciaKm} km de la zona con datos más cercana (${terreno.zona.nombre}); el clima usado puede no representarlo.`);
    const flojos = [...usados].filter(c => AGRONOMIA[c] && AGRONOMIA[c].confianza === "baja");
    if (flojos.length) avisos.push(`Los datos económicos de ${flojos.join(", ")} son estimaciones con poca información local.`);
    if (usados.has("Alfalfa / Cobertura Verde"))
        avisos.push("El margen de la alfalfa supone un alfalfar ya en producción; sembrada para una sola temporada rinde menos y hay que sumar el costo de siembra.");
    if (usados.has(BARBECHO)) avisos.push("En alguna temporada ningún cultivo de la lista tolera el clima de la zona y el lote queda en descanso.");
    return avisos;
}

const METODOLOGIA = [
    "Cada cultivo recibe en cada temporada tres puntajes de 0 a 10: ahorro de agua, ganancia y cuidado del suelo. El puntaje de la temporada es su promedio ponderado con los pesos del plan.",
    "Se prueban todas las combinaciones posibles de seis temporadas y se elige la de mayor puntaje total, por eso a veces conviene un cultivo que rinde menos hoy pero deja mejor el lote para el siguiente.",
    "Un cultivo se descarta si la temperatura máxima, la mínima o el viento medios de la temporada quedan fuera de lo que tolera.",
    "No se repite la misma familia botánica en temporadas seguidas; si vuelve al año siguiente, su ganancia se reduce por mayor riesgo de plagas y enfermedades.",
    "Ahorro de agua: se estima el riego necesario a partir de la evapotranspiración (radiación y temperatura de NASA POWER), el coeficiente del cultivo y la lluvia. Menos riego, más puntaje.",
    "Ganancia: índice de 0 a 10 basado en el margen esperado por hectárea (rendimiento por precio, menos costo), donde 5 equivale a no ganar ni perder. Se ajusta según el estado del suelo y el cultivo anterior.",
    "Cuidado del suelo: cada cultivo mejora o desgasta un indicador de salud del suelo de 0 a 100; las leguminosas lo mejoran más porque fijan nitrógeno.",
    "Los frutales perennes (vid, olivo, pistacho) no entran en la rotación: se muestran aparte como alternativa de cultivo permanente."
];

export function generarInforme(zona, opciones = {}, terreno = null) {
    const temporadas = obtenerSeisTemporadas(zona, opciones);
    const escenario = ESCENARIOS[opciones.escenario] ? opciones.escenario : "base";
    const planes = generarPlanes(zona, opciones);
    if (opciones.pesosUsuario) {
        planes.personalizado = { nombre: "Plan personalizado", objetivo: "Equilibrio elegido por el usuario",
                                 ...generarPlan(zona, opciones.pesosUsuario, opciones) };
    }
    return {
        terreno: terreno || { zona: { id: zona.id, nombre: zona.nombre } },
        configuracion: {
            temporadaDeInicio: temporadas[0].estacion,
            cantidadDeTemporadas: temporadas.length,
            duracion: "3 años, con una temporada cálida (verano) y una fría (invierno) por año",
            escenarioClimatico: escenario,
            descripcionDelEscenario: ESCENARIOS[escenario],
            sueloInicial: opciones.sueloInicial ?? PARAMS.sueloInicial,
            sueloInicialEsSupuesto: opciones.sueloInicial === undefined,
            superficieDeReferencia: "Todos los valores son por hectárea"
        },
        clima: resumirClima(zona, temporadas),
        planes,
        comparacion: compararPlanes(planes),
        metodologia: METODOLOGIA,
        advertencias: armarAdvertencias(terreno, planes, opciones.sueloInicial === undefined)
    };
}

// Valida y normaliza el punto que llega del frontend: { lat, lon } (también acepta lng)
function normalizarPunto(punto) {
    const lat = Number(punto?.lat);
    const lon = Number(punto?.lon ?? punto?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        throw new Error("planificarTerreno espera el centro de la parcela como { lat, lon }");
    }
    return { lat, lon };
}

// Flujo completo: del centro de la parcela (ya calculado en el frontend) al informe técnico
//   punto: { lat: -31.55, lon: -68.73 }
export function planificarTerreno(punto, opciones = {}) {
    const centroide = normalizarPunto(punto);
    const u = ubicarZona(centroide.lat, centroide.lon);
    const terreno = {
        centroide: { lat: redondear(centroide.lat, 4), lon: redondear(centroide.lon, 4) },
        zona: { id: u.zona.id, nombre: u.zona.nombre },
        distanciaKm: u.distanciaKm,
        fueraDeRango: u.fueraDeRango
    };
    return generarInforme(u.zona, opciones, terreno);
}

// =====================================================================
// 7. Redacción en lenguaje natural
//   Está en ia.js (llamada a Gemini y texto de respaldo sin conexión)
//   y se configura en config_ia.js (clave, modelo y prompt).
// =====================================================================
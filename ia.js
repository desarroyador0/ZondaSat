// =====================================================================
// ZondaSat — de informe técnico a explicación en lenguaje natural
//
// Uso típico desde la pantalla de resultados:
//   import { generarResultados } from './ia.js';
//   const { resultados, informe } = await generarResultados({ lat: -31.55, lon: -68.73 });
//
// "resultados" ya trae las secciones en orden, con los números verificados
// (salen de logica.js, nunca de la IA) y los textos redactados.
// La clave, el modelo y el prompt se configuran en config_ia.js.
// =====================================================================

import { CONFIG_IA, PROMPT_SISTEMA } from './config.js';
import { planificarTerreno } from './logica.js';
import { obtenerIdioma, t, traducirCultivo, traducirTipoCultivo, traducirPlan } from './i18n/i18n.js';

const BARBECHO = "Barbecho (sin cultivo viable)";

const NOMBRE_VISIBLE = {
    "Garbanzo (Leguminosa)": "Garbanzo",
    "Alfalfa / Cobertura Verde": "Alfalfa",
    "Vid (Uva)": "Vid",
    [BARBECHO]: "Descanso del lote"
};
const nombreVisible = (n, idioma = obtenerIdioma()) => traducirCultivo(NOMBRE_VISIBLE[n] || n, idioma);
// Reemplaza los nombres largos dentro de un texto ("Alfalfa / Cobertura Verde" -> "Alfalfa")
const limpiarNombres = (txt, idioma = 'es') => Object.entries(NOMBRE_VISIBLE)
    .reduce((acc, [largo, corto]) => acc.split(largo).join(traducirCultivo(corto, idioma)), txt || "");

const titulosPorIdioma = (idioma = obtenerIdioma()) => ({
    campo: t('results.secFieldTitle', {}, idioma),
    clima: t('results.secClimateTitle', {}, idioma),
    planes: t('results.secPlanesTitle', {}, idioma),
    comparacion: t('results.secComparisonTitle', {}, idioma),
    permanente: t('results.secPermanentTitle', {}, idioma),
    antesDeSembrar: t('results.secBeforePlantingTitle', {}, idioma),
    proximosPasos: t('results.secNextStepsTitle', {}, idioma)
});

// =====================================================================
// 1. Punto de entrada
// =====================================================================

// Desde el centro de la parcela: calcula el informe y lo redacta
export async function generarResultados(punto, opciones = {}, idioma = obtenerIdioma()) {
    const informe = planificarTerreno(punto, opciones);
    return generarResultadosDesdeInforme(informe, idioma);
}

// Desde un informe ya calculado (por ejemplo, el guardado en sessionStorage)
export async function generarResultadosDesdeInforme(informe, idioma = obtenerIdioma()) {
    const local = redactarSinIA(informe, idioma);
    let textos = local;
    let fuente = "local";
    let aviso = null;

    if (CONFIG_IA.apiKey || CONFIG_IA.endpoint) {
        try {
            textos = await redactarConGemini(informe, idioma);
            fuente = "ia";
        } catch (error) {
            if (!CONFIG_IA.usarRespaldoSinIA) throw error;
            console.warn("ZondaSat: no se pudo redactar con Gemini, se usa el texto de respaldo.", error);
            aviso = t('results.aiFallbackNotice', {}, idioma);
        }
    }

    return { informe, resultados: armarResultados(informe, textos, local, fuente, aviso, idioma) };
}

// =====================================================================
// 2. Datos que se le envían a la IA (versión compacta del informe)
// =====================================================================
export function datosParaIA(informe) {
    const climaDe = e => {
        const c = informe.clima[e];
        return {
            tempMaxMediaC: c.usadoEnElPlan.tempMax,
            tempMinMediaC: c.usadoEnElPlan.tempMin,
            vientoMedioMs: c.usadoEnElPlan.viento,
            lluviaDeLaTemporadaMm: c.lluviaDeLaTemporadaMm,
            evapotranspiracionMmPorDia: c.evapotranspiracionET0MmPorDia,
            anio2026FrenteAlPromedio: {
                tempMaxC: c.como2026FrenteAlHistorico.tempMax.diferencia,
                lluviaMmPorDia: c.como2026FrenteAlHistorico.precipitacion.diferencia
            }
        };
    };

    const planes = {};
    for (const [clave, p] of Object.entries(informe.planes)) {
        const r = p.rotacion;
        planes[clave] = {
            nombre: p.nombre,
            objetivo: p.objetivo,
            pesos: p.pesos,
            totales: {
                margenEsperadoUSDporHa: r.margenTotalUSD,
                margenSiTodasLasTemporadasSonMalasUSD: r.margenTotalMalosAniosUSD,
                margenSiTodasLasTemporadasSonBuenasUSD: r.margenTotalBuenosAniosUSD,
                riegoTotalMm: r.riegoTotalMm,
                riegoTotalM3porHa: r.riegoTotalM3PorHa,
                sueloInicial: r.sueloInicial,
                sueloFinal: r.sueloFinal
            },
            temporadas: r.temporadas.map(t => ({
                numero: t.numero,
                titulo: t.titulo,
                cultivo: nombreVisible(t.cultivo),
                tipo: t.tipo,
                riegoMm: t.agua.riegoEstimadoMm,
                margenEsperadoUSD: t.economia.margenEsperadoUSD,
                suelo: { antes: t.suelo.antes, despues: t.suelo.despues },
                efectos: (t.efectos || []).map(e => limpiarNombres(e.texto)),
                eleccion: t.eleccion ? limpiarNombres(t.eleccion.nota) : null,
                otrasOpcionesPosibles: (t.opcionesDeLaTemporada || [])
                    .filter(o => o.sePodiaSembrar && !o.elegido)
                    .map(o => ({ cultivo: nombreVisible(o.cultivo), puntaje: o.puntos })),
                descartados: (t.opcionesDeLaTemporada || [])
                    .filter(o => !o.sePodiaSembrar)
                    .map(o => ({ cultivo: nombreVisible(o.cultivo), motivo: limpiarNombres(o.motivoDescarte) }))
            })),
            otrasRotacionesCasiIgualDeBuenas: p.alternativas.map(a => a.cultivos.map(nombreVisible))
        };
    }

    const perm = permanenteDe(informe);
    return {
        terreno: {
            zona: informe.terreno.zona.nombre,
            distanciaALaZonaKm: informe.terreno.distanciaKm ?? null,
            fueraDeRango: Boolean(informe.terreno.fueraDeRango)
        },
        configuracion: {
            temporadaDeInicio: informe.configuracion.temporadaDeInicio,
            duracion: informe.configuracion.duracion,
            escenarioClimatico: informe.configuracion.descripcionDelEscenario,
            sueloInicial: informe.configuracion.sueloInicial,
            sueloInicialEsSupuesto: informe.configuracion.sueloInicialEsSupuesto,
            unidad: informe.configuracion.superficieDeReferencia
        },
        clima: { verano: climaDe("verano"), invierno: climaDe("invierno") },
        planes,
        comparacion: {
            planConMayorMargen: informe.comparacion.mayorMargen,
            planConMenosRiego: informe.comparacion.menorRiego,
            planQueMejorDejaElSuelo: informe.comparacion.mejorSueloFinal,
            frenteAlPlanEconomico: informe.comparacion.frenteAlPlanEconomico,
            losPlanesCoinciden: informe.comparacion.losPlanesCoinciden,
            nota: informe.comparacion.notaSiCoinciden
        },
        cultivoPermanente: perm ? {
            cultivo: nombreVisible(perm.cultivo),
            tipo: perm.tipo,
            aniosHastaProducir: perm.aniosHastaProducir,
            inversionInicialUSDporHa: perm.implantacionUSDha,
            riegoPorAnioMm: perm.riegoPorAnioMm,
            aclaracion: perm.aclaracion
        } : null,
        advertencias: informe.advertencias,
        comoSeCalculo: informe.metodologia
    };
}

// =====================================================================
// 3. Estructura que devuelve la IA (la usa la pantalla de resultados: no cambiarla)
// =====================================================================
const S = (description) => ({ type: "STRING", description });
const LISTA = (description) => ({ type: "ARRAY", description, items: { type: "STRING" } });

const ESQUEMA_RESPUESTA = {
    type: "OBJECT",
    properties: {
        titulo: S("Título breve y cálido del informe, de menos de 10 palabras"),
        resumen: S("2 o 3 oraciones con lo más importante: dónde está el campo, qué planes hay y la idea central"),
        tuCampo: S("2 o 3 oraciones sobre la ubicación de la parcela y la zona de clima usada. Si está fuera de rango, decilo"),
        clima: S("3 o 4 oraciones sobre el clima de verano e invierno y qué significa para el riego y los cultivos"),
        planes: {
            type: "ARRAY",
            description: "Un elemento por cada plan del JSON, en el mismo orden",
            items: {
                type: "OBJECT",
                properties: {
                    clave: S("La clave del plan tal como figura en el JSON (economico, hidrico, suelo o personalizado)"),
                    enUnaFrase: S("Qué busca este plan, en una frase"),
                    temporadas: {
                        type: "ARRAY",
                        description: "Las seis temporadas del plan, en orden",
                        items: {
                            type: "OBJECT",
                            properties: {
                                numero: { type: "INTEGER", description: "Número de temporada, de 1 a 6" },
                                explicacion: S("2 o 3 oraciones: qué se siembra, por qué se eligió y, si corresponde, qué quedó afuera y por qué")
                            },
                            required: ["numero", "explicacion"]
                        }
                    },
                    cierre: S("2 oraciones con el resultado del plan: margen esperado con su rango, riego total y cómo queda el suelo"),
                    convieneSi: S("Una frase: a qué productor o situación le conviene este plan")
                },
                required: ["clave", "enUnaFrase", "temporadas", "cierre", "convieneSi"]
            }
        },
        comparacion: S("3 o 4 oraciones comparando los planes: qué se gana y qué se resigna con cada uno. Sin elegir uno"),
        permanente: S("2 o 3 oraciones sobre el cultivo permanente como alternativa aparte, con los años hasta producir y la inversión inicial. Vacío si no hay"),
        antesDeSembrar: LISTA("Las advertencias reformuladas en lenguaje simple, una por elemento"),
        proximosPasos: LISTA("2 o 3 recomendaciones prácticas que se apoyen en los datos")
    },
    required: ["titulo", "resumen", "tuCampo", "clima", "planes", "comparacion", "permanente", "antesDeSembrar", "proximosPasos"]
};

// =====================================================================
// 4. Llamada a Gemini (vía Netlify Functions o clave local en .env / config.js)
// =====================================================================
let claveLocalEnv = null;

async function obtenerClaveLocal() {
    if (CONFIG_IA.apiKey) return CONFIG_IA.apiKey;
    if (claveLocalEnv !== null) return claveLocalEnv;
    // En desarrollo local (ej. Live Server), intenta leer ../.env (ignorado por Git)
    for (const ruta of ["../.env", "/.env", ".env"]) {
        try {
            const r = await fetch(ruta, { cache: "no-store" });
            if (!r.ok) continue;
            const txt = await r.text();
            const m = txt.match(/^\s*GEMINI_API_KEY\s*=\s*([^\s#]+)/m);
            if (m && m[1]) {
                claveLocalEnv = m[1].replace(/^["']|["']$/g, "");
                return claveLocalEnv;
            }
        } catch {
            // Ignorar si no existe
        }
    }
    claveLocalEnv = "";
    return "";
}

async function pedirAGeminiDirecto(modelo, cuerpo, apiKey) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelo)}:generateContent`;
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), CONFIG_IA.tiempoMaximoMs);
    try {
        return await fetch(url, {
            method: "POST",
            signal: control.signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(cuerpo)
        });
    } finally {
        clearTimeout(reloj);
    }
}

async function pedirAGemini(modelo, cuerpo) {
    const apiKeyConfig = CONFIG_IA.apiKey;
    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), CONFIG_IA.tiempoMaximoMs);
    try {
        if (!apiKeyConfig && CONFIG_IA.endpoint) {
            const respProxy = await fetch(CONFIG_IA.endpoint, {
                method: "POST",
                signal: control.signal,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ modelo, cuerpo })
            });
            // Si estamos en Live Server local, el POST a /.netlify/functions/gemini devuelve 404 o 405
            if (respProxy.status !== 404 && respProxy.status !== 405) {
                return respProxy;
            }
        }
        const apiKey = await obtenerClaveLocal();
        if (!apiKey) {
            throw new Error("No se encontró la función de Netlify (405) ni una clave local en .env");
        }
        return await pedirAGeminiDirecto(modelo, cuerpo, apiKey);
    } catch (error) {
        throw new Error(error.name === "AbortError" ? "Gemini tardó demasiado en responder" : `No se pudo conectar con Gemini: ${error.message}`);
    } finally {
        clearTimeout(reloj);
    }
}

export async function redactarConGemini(informe, idioma = obtenerIdioma()) {
    if (!CONFIG_IA.apiKey && !CONFIG_IA.endpoint) throw new Error("Falta la clave de Gemini o el endpoint de Netlify");

    const promptIdioma = idioma === 'en'
        ? `${PROMPT_SISTEMA}\n\nIMPORTANT LANGUAGE RULE: Write ALL text values in the JSON response in clear, natural, accessible English for a farmer/grower. Translate crop names and agronomic concepts into natural English while keeping the exact JSON keys required by the schema.`
        : PROMPT_SISTEMA;

    const instruccionUsuario = idioma === 'en'
        ? "Here is the analysis data for my parcel. Please explain it in English following the requested JSON structure.\n\n"
        : "Estos son los datos del análisis de mi parcela. Explicámelos siguiendo la estructura pedida.\n\n";

    const cuerpo = {
        systemInstruction: { parts: [{ text: promptIdioma }] },
        contents: [{
            role: "user",
            parts: [{ text: instruccionUsuario + JSON.stringify(datosParaIA(informe)) }]
        }],
        generationConfig: {
            temperature: CONFIG_IA.temperatura,
            maxOutputTokens: CONFIG_IA.maxTokens,
            responseMimeType: "application/json",
            responseSchema: ESQUEMA_RESPUESTA
        }
    };

    const modelos = [...new Set([
        CONFIG_IA.modelo,
        ...(CONFIG_IA.modelosRespaldo || []),
        "gemini-3.8-flash",
        "gemini-flash-latest"
    ].filter(Boolean))];
    let respuesta = null;
    let ultimoDetalle = "";

    for (const modelo of modelos) {
        respuesta = await pedirAGemini(modelo, cuerpo);
        if (respuesta.ok) break;
        ultimoDetalle = await respuesta.text().catch(() => "");
        if (respuesta.status !== 404) {
            throw new Error(`Gemini (${modelo}) respondió ${respuesta.status}: ${ultimoDetalle.slice(0, 400)}`);
        }
    }

    // Si todos los nombres fijos dieron 404, consulta a la API qué modelo Flash tiene habilitado esta clave
    if (!respuesta || !respuesta.ok) {
        try {
            const claveLocal = await obtenerClaveLocal();
            const usaProxy = !claveLocal && CONFIG_IA.endpoint;
            const listaResp = usaProxy
                ? await fetch(CONFIG_IA.endpoint, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ accion: "listar" })
                })
                : await fetch("https://generativelanguage.googleapis.com/v1beta/models", {
                    headers: { "x-goog-api-key": claveLocal }
                });
            if (listaResp.ok) {
                const { models = [] } = await listaResp.json();
                const disponibles = models
                    .filter(m => (m.supportedGenerationMethods || []).includes("generateContent"))
                    .map(m => m.name.replace(/^models\//, ""))
                    .filter(n => /gemini/i.test(n) && !/embedding|imagen|veo|tts|audio|vision/i.test(n));
                const preferido = disponibles.find(n => /flash/i.test(n)) || disponibles[0];
                if (preferido && !modelos.includes(preferido)) {
                    respuesta = await pedirAGemini(preferido, cuerpo);
                    if (!respuesta.ok) ultimoDetalle = await respuesta.text().catch(() => "");
                }
            }
        } catch {
            // Si falla el listado, se informa el error original abajo
        }
    }

    if (!respuesta || !respuesta.ok) {
        throw new Error(`Gemini respondió ${respuesta ? respuesta.status : "error"}: ${ultimoDetalle.slice(0, 400)}`);
    }

    const json = await respuesta.json();
    const candidato = json.candidates && json.candidates[0];
    const texto = candidato && candidato.content && (candidato.content.parts || []).map(p => p.text || "").join("");
    if (!texto) {
        const motivo = (candidato && candidato.finishReason) || (json.promptFeedback && json.promptFeedback.blockReason) || "sin motivo informado";
        throw new Error(`Gemini no devolvió texto (${motivo})`);
    }

    try {
        return JSON.parse(texto.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
        const corte = candidato.finishReason === "MAX_TOKENS" ? " La respuesta se cortó: subí maxTokens en config_ia.js." : "";
        throw new Error("La respuesta de Gemini no es un JSON válido." + corte);
    }
}

// =====================================================================
// 5. Texto de respaldo, armado con los datos y sin IA
//    Se usa si no hay clave, si no hay internet o si Gemini falla.
// =====================================================================
const numero = (n, idioma = 'es') => Math.round(n).toLocaleString(idioma === 'en' ? "en-US" : "es-AR");
const usd = (n, idioma = 'es') => `${numero(n, idioma)} USD`;
const conMinuscula = txt => txt ? txt.charAt(0).toLowerCase() + txt.slice(1) : txt;
const conPunto = txt => /[.!?]$/.test(txt) ? txt : txt + ".";

function permanenteDe(informe) {
    const planes = Object.values(informe.planes);
    return (informe.planes.economico && informe.planes.economico.permanente) ||
           (planes.find(p => p.permanente) || {}).permanente || null;
}

const unirNombres = (nombres, idioma = 'es') => {
    if (nombres.length === 1) return nombres[0];
    const conj = idioma === 'en' ? 'or' : 'ni';
    return `${nombres.slice(0, -1).join(", ")} ${conj} ${nombres[nombres.length - 1]}`;
};

function traducirEfectoIngles(e, t) {
    if (e.codigo === "bono_leguminosa") {
        return `Follows a nitrogen-fixing legume crop, increasing expected profit.`;
    }
    if (e.codigo === "repite_familia") {
        return `Same botanical family as one year ago: −15% profit due to higher pest and disease risk.`;
    }
    if (e.codigo === "mejora_suelo") {
        return `Improves soil health by ${t.suelo.despues - t.suelo.antes} points (from ${t.suelo.antes} to ${t.suelo.despues}).`;
    }
    if (e.codigo === "desgasta_suelo") {
        return `Depletes soil health by ${t.suelo.antes - t.suelo.despues} points (from ${t.suelo.antes} to ${t.suelo.despues}).`;
    }
    return conPunto(limpiarNombres(e.texto, 'en'));
}

function traducirMotivoDescarteIngles(motivo) {
    let m = limpiarNombres(motivo, 'en');
    m = m.replace(/La temperatura máxima media de la temporada \(([^)]+)\) supera lo que tolera \(([^)]+)\)/, "average high temperature ($1) exceeds its tolerance ($2)");
    m = m.replace(/La temperatura mínima media de la temporada \(([^)]+)\) está por debajo de lo que tolera \(([^)]+)\)/, "average low temperature ($1) is below its tolerance ($2)");
    m = m.replace(/El viento medio de la temporada \(([^)]+)\) supera lo que tolera \(([^)]+)\)/, "average wind speed ($1) exceeds its tolerance ($2)");
    return conPunto(m);
}

function explicarTemporadaSinIA(tp, idioma = 'es') {
    if (idioma === 'en') {
        if (tp.cultivo === BARBECHO) {
            return "No crop from the list can be planted this season; the field rests and the soil recovers slightly.";
        }
        const cultivo = nombreVisible(tp.cultivo, 'en');
        const tipo = conMinuscula(traducirTipoCultivo(tp.tipo, 'en'));
        const partes = [`${cultivo}, ${tipo}.`];

        const opciones = tp.opcionesDeLaTemporada || [];
        const viables = opciones.filter(o => o.sePodiaSembrar).sort((x, y) => y.puntos - x.puntos);
        if (viables.length <= 1) partes.push("It was the only viable option this season.");
        else if (tp.eleccion && tp.eleccion.eraLaDeMayorPuntajeEnEstaTemporada) partes.push("It was the highest-scoring option for this season.");
        else partes.push(`Looking at this season alone, ${nombreVisible(viables[0].cultivo, 'en')} scored higher, but choosing ${cultivo} yields a better overall 6-season plan.`);

        for (const e of tp.efectos || []) {
            if (["bono_leguminosa", "repite_familia", "mejora_suelo", "desgasta_suelo"].includes(e.codigo)) {
                partes.push(traducirEfectoIngles(e, tp));
            }
        }
        partes.push(`Requires about ${numero(tp.agua.riegoEstimadoMm, 'en')} mm of irrigation.`);

        const descartados = opciones.filter(o => !o.sePodiaSembrar);
        const porFamilia = descartados.filter(o => o.motivoDescarte.startsWith("Es de la misma familia")).map(o => nombreVisible(o.cultivo, 'en'));
        if (porFamilia.length) {
            partes.push(`${unirNombres(porFamilia, 'en')} ${porFamilia.length > 1 ? "were" : "was"} not selected because ${porFamilia.length > 1 ? "they belong" : "it belongs"} to the same botanical family as the previous crop, avoiding consecutive seasons of the same family.`);
        }
        for (const d of descartados.filter(o => !o.motivoDescarte.startsWith("Es de la misma familia")).slice(0, 2)) {
            partes.push(`${nombreVisible(d.cultivo, 'en')} was ruled out: ${traducirMotivoDescarteIngles(d.motivoDescarte)}`);
        }
        return partes.join(" ");
    }

    if (tp.cultivo === BARBECHO) return conPunto(tp.efectos[0].texto);
    const cultivo = nombreVisible(tp.cultivo, 'es');
    const partes = [`${cultivo}, ${conMinuscula(tp.tipo)}.`];

    // Por qué se eligió
    const opciones = tp.opcionesDeLaTemporada || [];
    const viables = opciones.filter(o => o.sePodiaSembrar).sort((x, y) => y.puntos - x.puntos);
    if (viables.length <= 1) partes.push("Era la única opción posible esta temporada.");
    else if (tp.eleccion && tp.eleccion.eraLaDeMayorPuntajeEnEstaTemporada) partes.push("Fue la mejor opción para esta temporada.");
    else partes.push(`Mirando solo esta temporada convenía ${nombreVisible(viables[0].cultivo, 'es')}, pero con ${cultivo} el plan completo de seis temporadas da mejor resultado.`);

    for (const e of tp.efectos || []) {
        if (["bono_leguminosa", "repite_familia", "mejora_suelo", "desgasta_suelo"].includes(e.codigo)) partes.push(conPunto(limpiarNombres(e.texto, 'es')));
    }
    partes.push(`Necesita unos ${numero(tp.agua.riegoEstimadoMm, 'es')} mm de riego.`);

    // Qué quedó afuera
    const descartados = opciones.filter(o => !o.sePodiaSembrar);
    const porFamilia = descartados.filter(o => o.motivoDescarte.startsWith("Es de la misma familia")).map(o => nombreVisible(o.cultivo, 'es'));
    if (porFamilia.length) {
        const plural = porFamilia.length > 1;
        partes.push(`No se eligi${plural ? "eron" : "ó"} ${unirNombres(porFamilia, 'es')}: ${plural ? "son" : "es"} de la misma familia que el cultivo anterior, y no se repite familia en temporadas seguidas.`);
    }
    for (const d of descartados.filter(o => !o.motivoDescarte.startsWith("Es de la misma familia")).slice(0, 2)) {
        partes.push(`No se eligió ${nombreVisible(d.cultivo, 'es')}: ${conPunto(conMinuscula(limpiarNombres(d.motivoDescarte, 'es')))}`);
    }
    return partes.join(" ");
}

const montoConSigno = (n, idioma = 'es') => {
    if (idioma === 'en') return n < 0 ? `a loss of ${usd(-n, 'en')}` : usd(n, 'en');
    return n < 0 ? `una pérdida de ${usd(-n, 'es')}` : usd(n, 'es');
};

function cierreSinIA(r, idioma = 'es') {
    if (idioma === 'en') {
        const margen = r.margenTotalUSD === null
            ? "The margin cannot be estimated within the plan."
            : `Across all six seasons, the expected margin is about ${usd(r.margenTotalUSD, 'en')} per hectare` +
              (r.margenTotalMalosAniosUSD !== null ? ` (ranging from ${montoConSigno(r.margenTotalMalosAniosUSD, 'en')} in poor years to ${montoConSigno(r.margenTotalBuenosAniosUSD, 'en')} in good years).` : ".");
        const suelo = r.sueloFinal === r.sueloInicial ? "soil health stays unchanged" :
            r.sueloFinal > r.sueloInicial ? `soil health improves from ${r.sueloInicial} to ${r.sueloFinal} points` : `soil health drops from ${r.sueloInicial} to ${r.sueloFinal} points`;
        return `${margen} It uses about ${numero(r.riegoTotalMm, 'en')} mm of total irrigation and ${suelo}.`;
    }
    const margen = r.margenTotalUSD === null
        ? "El margen no se puede estimar dentro del plan."
        : `En las seis temporadas el margen esperado es de unos ${usd(r.margenTotalUSD, 'es')} por hectárea` +
          (r.margenTotalMalosAniosUSD !== null ? ` (entre ${montoConSigno(r.margenTotalMalosAniosUSD, 'es')} si todo sale mal y ${montoConSigno(r.margenTotalBuenosAniosUSD, 'es')} si todo sale bien).` : ".");
    const suelo = r.sueloFinal === r.sueloInicial ? "el suelo queda igual" :
        r.sueloFinal > r.sueloInicial ? `el suelo mejora de ${r.sueloInicial} a ${r.sueloFinal} puntos` : `el suelo baja de ${r.sueloInicial} a ${r.sueloFinal} puntos`;
    return `${margen} Usa unos ${numero(r.riegoTotalMm, 'es')} mm de riego en total y ${suelo}.`;
}

function comparacionSinIA(informe, idioma = 'es') {
    const c = informe.comparacion;
    const nombre = clave => conMinuscula(traducirPlan(clave, 'nombre', idioma) || informe.planes[clave].nombre);
    if (idioma === 'en') {
        if (c.losPlanesCoinciden) {
            return "All plans propose the same crop rotation because the local climate leaves very few viable crops in each season.";
        }
        const frases = [];
        const ref = informe.planes.economico ? "economico" : Object.keys(informe.planes)[0];
        frases.push(`The ${nombre(c.mayorMargen)} yields the highest profit, the ${nombre(c.menorRiego)} uses the least water, and the ${nombre(c.mejorSueloFinal)} leaves the soil in the best condition.`);
        c.frenteAlPlanEconomico.forEach((f, indice) => {
            const margen = f.diferenciaMargenUSD === 0 ? "earns the same" : `earns ${usd(Math.abs(f.diferenciaMargenUSD), 'en')} ${f.diferenciaMargenUSD < 0 ? "less" : "more"}`;
            const riego = f.diferenciaRiegoMm === 0 ? "uses the same amount of water" : `uses ${numero(Math.abs(f.diferenciaRiegoMm), 'en')} mm ${f.diferenciaRiegoMm < 0 ? "less" : "more"} irrigation`;
            const suelo = f.diferenciaSueloFinal === 0 ? "leaves the soil the same" : `leaves the soil ${Math.abs(f.diferenciaSueloFinal)} points ${f.diferenciaSueloFinal > 0 ? "better" : "worse"}`;
            frases.push(indice === 0
                ? `Compared to the ${nombre(ref)}, the ${nombre(f.plan)} ${margen}, ${riego}, and ${suelo}.`
                : `The ${nombre(f.plan)} ${margen}, ${riego}, and ${suelo}.`);
        });
        return frases.join(" ");
    }

    if (c.losPlanesCoinciden) return conPunto(c.notaSiCoinciden);
    const frases = [];
    const ref = informe.planes.economico ? "economico" : Object.keys(informe.planes)[0];
    frases.push(`El ${nombre(c.mayorMargen)} es el que más gana, el ${nombre(c.menorRiego)} el que menos agua usa y el ${nombre(c.mejorSueloFinal)} el que mejor deja el suelo.`);
    c.frenteAlPlanEconomico.forEach((f, indice) => {
        const margen = f.diferenciaMargenUSD === 0 ? "gana lo mismo" : `gana ${usd(Math.abs(f.diferenciaMargenUSD), 'es')} ${f.diferenciaMargenUSD < 0 ? "menos" : "más"}`;
        const riego = f.diferenciaRiegoMm === 0 ? "usa la misma agua" : `usa ${numero(Math.abs(f.diferenciaRiegoMm), 'es')} mm ${f.diferenciaRiegoMm < 0 ? "menos" : "más"} de riego`;
        const suelo = f.diferenciaSueloFinal === 0 ? "deja el suelo igual" : `deja el suelo ${Math.abs(f.diferenciaSueloFinal)} puntos ${f.diferenciaSueloFinal > 0 ? "mejor" : "peor"}`;
        frases.push(indice === 0
            ? `Frente al ${nombre(ref)}, el ${nombre(f.plan)} ${margen}, ${riego} y ${suelo}.`
            : `El ${nombre(f.plan)} ${margen}, ${riego} y ${suelo}.`);
    });
    return frases.join(" ");
}

function advertenciasSinIA(informe, idioma = 'es') {
    if (idioma !== 'en') return informe.advertencias.slice();
    return informe.advertencias.map(a => {
        if (a.startsWith("Los resultados son estimaciones orientativas"))
            return "Results are indicative estimates to help compare options. Confirm them with a local agronomist or INTA advisor before deciding.";
        if (a.startsWith("Las temperaturas son promedios"))
            return "Temperatures are seasonal averages: they do not reflect specific frosts, heatwaves, or Zonda wind gusts.";
        if (a.startsWith("El clima corresponde a un área amplia"))
            return "Climate data covers a broad grid cell (~50 km) and does not replace a local weather station.";
        if (a.startsWith("Rendimientos, precios y costos"))
            return "Yields, prices, and costs come from public sources (2020–2026) and may vary.";
        if (a.startsWith("El margen en dólares es el valor base"))
            return "The USD margin is the base value for each crop: soil health and rotation effects influence the score.";
        if (a.startsWith("El riego estimado supone riego eficiente"))
            return "Estimated irrigation assumes efficient watering and approximate crop coefficients; flood/furrow irrigation consumes more water.";
        if (a.startsWith("No se cargó un análisis de suelo"))
            return "No soil test was provided: the initial soil state is an assumed medium value.";
        if (a.startsWith("El margen de la alfalfa supone"))
            return "Alfalfa margin assumes an already established stand; planted for a single season, yield is lower and seeding costs must be added.";
        if (a.startsWith("En alguna temporada ningún cultivo"))
            return "In some seasons no crop on the list tolerates the local climate, so the plot rests in fallow.";
        if (a.startsWith("El terreno está a "))
            return `Your parcel is ${informe.terreno.distanciaKm} km from the nearest zone with data (${informe.terreno.zona.nombre}); the climate used may not represent it accurately.`;
        if (a.startsWith("Los datos económicos de "))
            return "Economic data for some of the selected crops are estimates based on limited local data.";
        return a;
    });
}

export function redactarSinIA(informe, idioma = obtenerIdioma()) {
    const zona = informe.terreno.zona.nombre;
    const km = informe.terreno.distanciaKm;
    const v = informe.clima.verano, i = informe.clima.invierno;
    const cantidad = Object.keys(informe.planes).length;
    const perm = permanenteDe(informe);

    if (idioma === 'en') {
        return {
            titulo: "Your crop rotation plan for the next three years",
            resumen: `Your parcel is located in the ${zona} zone. Based on its climate, we built ${cantidad === 3 ? "three 6-season rotation plans" : `${cantidad} rotation plans`}: one to maximize profit, one to save water, and one to care for your soil.`,
            tuCampo: `We used climate data from ${zona}` +
                (km === undefined || km === null ? "." : km < 1 ? ", right where your parcel is located." : `, about ${numero(km, 'en')} km from the center of your parcel.`) +
                (informe.terreno.fueraDeRango ? " Your parcel is far from the zones with data, so the results may not accurately represent your field." : ""),
            clima: `In summer, average highs reach around ${numero(v.usadoEnElPlan.tempMax, 'en')} °C and lows around ${numero(v.usadoEnElPlan.tempMin, 'en')} °C; in winter, ${numero(i.usadoEnElPlan.tempMax, 'en')} °C and ${numero(i.usadoEnElPlan.tempMin, 'en')} °C. ` +
                `Rainfall is very scarce: about ${numero(v.lluviaDeLaTemporadaMm, 'en')} mm in summer and ${numero(i.lluviaDeLaTemporadaMm, 'en')} mm in winter, meaning almost all water must come from irrigation.`,
            planes: Object.entries(informe.planes).map(([clave, p]) => ({
                clave,
                enUnaFrase: conPunto(traducirPlan(clave, 'objetivo', 'en') || p.objetivo),
                temporadas: p.rotacion.temporadas.map(tp => ({ numero: tp.numero, explicacion: explicarTemporadaSinIA(tp, 'en') })),
                cierre: cierreSinIA(p.rotacion, 'en'),
                convieneSi: traducirPlan(clave, 'convieneSi', 'en')
            })),
            comparacion: comparacionSinIA(informe, 'en'),
            permanente: perm
                ? `${nombreVisible(perm.cultivo, 'en')} is an alternative if you prefer a permanent crop instead of rotating. ` +
                  `Planted now, it would begin producing in year ${perm.aniosHastaProducir}, generating almost no income during these first three years, ` +
                  `with an initial investment of around ${usd(perm.implantacionUSDha, 'en')} per hectare. Its appeal lies in its long-term profitability over its entire productive lifespan.`
                : "",
            antesDeSembrar: advertenciasSinIA(informe, 'en'),
            proximosPasos: [
                "Run a soil test: this plan assumes a medium initial soil health.",
                "Confirm how much water and what irrigation turns you will have available each season.",
                "Review this plan with an INTA agronomist in your area before planting."
            ]
        };
    }

    return {
        titulo: "Tu plan de cultivos para los próximos tres años",
        resumen: `Tu parcela queda en la zona ${zona}. Con su clima armamos ${cantidad === 3 ? "tres planes" : `${cantidad} planes`} de rotación de seis temporadas: uno para ganar más, uno para ahorrar agua y uno para cuidar el suelo.`,
        tuCampo: `Usamos los datos de clima de ${zona}` +
            (km === undefined || km === null ? "." : km < 1 ? ", justo donde está tu parcela." : `, a unos ${numero(km, 'es')} km del centro de tu parcela.`) +
            (informe.terreno.fueraDeRango ? " Tu parcela está lejos de las zonas con datos, así que el resultado puede no representar bien tu campo." : ""),
        clima: `En verano la máxima media ronda los ${numero(v.usadoEnElPlan.tempMax, 'es')} °C y la mínima los ${numero(v.usadoEnElPlan.tempMin, 'es')} °C; en invierno, ${numero(i.usadoEnElPlan.tempMax, 'es')} °C y ${numero(i.usadoEnElPlan.tempMin, 'es')} °C. ` +
            `Llueve muy poco: unos ${numero(v.lluviaDeLaTemporadaMm, 'es')} mm en verano y ${numero(i.lluviaDeLaTemporadaMm, 'es')} mm en invierno, así que casi toda el agua tiene que venir del riego.`,
        planes: Object.entries(informe.planes).map(([clave, p]) => ({
            clave,
            enUnaFrase: conPunto(traducirPlan(clave, 'objetivo', 'es') || p.objetivo),
            temporadas: p.rotacion.temporadas.map(tp => ({ numero: tp.numero, explicacion: explicarTemporadaSinIA(tp, 'es') })),
            cierre: cierreSinIA(p.rotacion, 'es'),
            convieneSi: traducirPlan(clave, 'convieneSi', 'es')
        })),
        comparacion: comparacionSinIA(informe, 'es'),
        permanente: perm
            ? `${nombreVisible(perm.cultivo, 'es')} es una alternativa si preferís un cultivo permanente en lugar de rotar. ` +
              `Plantado ahora, empezaría a producir recién al año ${perm.aniosHastaProducir}, así que en estos tres años casi no da ingresos, ` +
              `y la inversión inicial ronda los ${usd(perm.implantacionUSDha, 'es')} por hectárea. Su atractivo está en la rentabilidad a lo largo de toda su vida útil.`
            : "",
        antesDeSembrar: informe.advertencias.slice(),
        proximosPasos: [
            "Hacé un análisis de suelo: el plan supone un suelo en estado medio.",
            "Confirmá cuánta agua y qué turnos de riego vas a tener en cada temporada.",
            "Revisá el plan con un técnico del INTA de tu zona antes de sembrar."
        ]
    };
}

// =====================================================================
// 6. Resultado final para la pantalla: números del informe + textos
// =====================================================================
const texto = (valor, respaldo) => (typeof valor === "string" && valor.trim()) ? valor.trim() : respaldo;
const lista = (valor, respaldo) => {
    const limpia = Array.isArray(valor) ? valor.filter(x => typeof x === "string" && x.trim()).map(x => x.trim()) : [];
    return limpia.length ? limpia : respaldo;
};

export function armarResultados(informe, textosIA, textosLocales = null, fuente = "local", aviso = null, idioma = obtenerIdioma()) {
    const ia = textosIA || {};
    const loc = textosLocales || redactarSinIA(informe, idioma);
    const titulos = titulosPorIdioma(idioma);
    const tr = informe.terreno;
    const climaDe = e => ({
        tempMaxC: informe.clima[e].usadoEnElPlan.tempMax,
        tempMinC: informe.clima[e].usadoEnElPlan.tempMin,
        lluviaMm: informe.clima[e].lluviaDeLaTemporadaMm,
        evapotranspiracionMmDia: informe.clima[e].evapotranspiracionET0MmPorDia
    });
    const perm = permanenteDe(informe);

    return {
        idioma,
        fuente,                  // "ia" o "local"
        aviso,                   // texto para mostrar si se cayó a la versión sin IA; null si no
        encabezado: {
            titulo: texto(ia.titulo, loc.titulo),
            resumen: texto(ia.resumen, loc.resumen)
        },
        campo: {
            titulo: titulos.campo,
            texto: texto(ia.tuCampo, loc.tuCampo),
            zona: tr.zona.nombre,
            centro: tr.centroide || null,
            distanciaKm: tr.distanciaKm ?? null,
            fueraDeRango: Boolean(tr.fueraDeRango)
        },
        clima: {
            titulo: titulos.clima,
            texto: texto(ia.clima, loc.clima),
            verano: climaDe("verano"),
            invierno: climaDe("invierno")
        },
        planes: {
            titulo: titulos.planes,
            lista: Object.entries(informe.planes).map(([clave, p]) => {
                const pIA = (Array.isArray(ia.planes) ? ia.planes : []).find(x => x && x.clave === clave) || {};
                const pLoc = loc.planes.find(x => x.clave === clave);
                const r = p.rotacion;
                return {
                    clave,
                    nombre: traducirPlan(clave, 'nombre', idioma) || p.nombre,
                    objetivo: traducirPlan(clave, 'objetivo', idioma) || p.objetivo,
                    enUnaFrase: texto(pIA.enUnaFrase, pLoc.enUnaFrase),
                    convieneSi: texto(pIA.convieneSi, pLoc.convieneSi),
                    indicadores: {
                        margenUSD: r.margenTotalUSD,
                        margenMalosUSD: r.margenTotalMalosAniosUSD,
                        margenBuenosUSD: r.margenTotalBuenosAniosUSD,
                        riegoMm: r.riegoTotalMm,
                        riegoM3PorHa: r.riegoTotalM3PorHa,
                        sueloInicial: r.sueloInicial,
                        sueloFinal: r.sueloFinal
                    },
                    temporadas: r.temporadas.map(tp => {
                        const tIA = (Array.isArray(pIA.temporadas) ? pIA.temporadas : []).find(x => x && Number(x.numero) === tp.numero) || {};
                        const tLoc = pLoc.temporadas.find(x => x.numero === tp.numero);
                        return {
                            numero: tp.numero,
                            titulo: tp.titulo,
                            estacion: tp.estacion,
                            anio: tp.anio,
                            cultivo: nombreVisible(tp.cultivo, idioma),
                            nombreCompleto: tp.cultivo,
                            tipo: traducirTipoCultivo(tp.tipo, idioma),
                            explicacion: texto(tIA.explicacion, tLoc.explicacion),
                            riegoMm: tp.agua.riegoEstimadoMm,
                            margenUSD: tp.economia.margenEsperadoUSD,
                            sueloAntes: tp.suelo.antes,
                            sueloDespues: tp.suelo.despues
                        };
                    }),
                    cierre: texto(pIA.cierre, pLoc.cierre)
                };
            })
        },
        comparacion: {
            titulo: titulos.comparacion,
            texto: texto(ia.comparacion, loc.comparacion),
            mayorMargen: informe.comparacion.mayorMargen,
            menorRiego: informe.comparacion.menorRiego,
            mejorSuelo: informe.comparacion.mejorSueloFinal,
            planesCoinciden: informe.comparacion.losPlanesCoinciden
        },
        permanente: perm ? {
            titulo: titulos.permanente,
            cultivo: nombreVisible(perm.cultivo, idioma),
            texto: texto(ia.permanente, loc.permanente),
            aniosHastaProducir: perm.aniosHastaProducir,
            inversionUSDporHa: perm.implantacionUSDha,
            riegoPorAnioMm: perm.riegoPorAnioMm
        } : null,
        antesDeSembrar: { titulo: titulos.antesDeSembrar, puntos: lista(ia.antesDeSembrar, loc.antesDeSembrar) },
        proximosPasos: { titulo: titulos.proximosPasos, puntos: lista(ia.proximosPasos, loc.proximosPasos) }
    };
}
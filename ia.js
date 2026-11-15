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

import { CONFIG_IA, PROMPT_SISTEMA } from './config_ia.js';
import { planificarTerreno } from './logica.js';

const BARBECHO = "Barbecho (sin cultivo viable)";

const NOMBRE_VISIBLE = {
    "Garbanzo (Leguminosa)": "Garbanzo",
    "Alfalfa / Cobertura Verde": "Alfalfa",
    "Vid (Uva)": "Vid",
    [BARBECHO]: "Descanso del lote"
};
const nombreVisible = n => NOMBRE_VISIBLE[n] || n;
// Reemplaza los nombres largos dentro de un texto ("Alfalfa / Cobertura Verde" -> "Alfalfa")
const limpiarNombres = t => Object.entries(NOMBRE_VISIBLE)
    .reduce((acc, [largo, corto]) => acc.split(largo).join(corto), t || "");

const TITULOS = {
    campo: "Tu campo",
    clima: "El clima de tu zona",
    planes: "Tres planes para los próximos tres años",
    comparacion: "Qué ganás y qué resignás con cada plan",
    permanente: "Si preferís un cultivo permanente",
    antesDeSembrar: "Antes de sembrar",
    proximosPasos: "Próximos pasos"
};

// =====================================================================
// 1. Punto de entrada
// =====================================================================

// Desde el centro de la parcela: calcula el informe y lo redacta
export async function generarResultados(punto, opciones = {}) {
    const informe = planificarTerreno(punto, opciones);
    return generarResultadosDesdeInforme(informe);
}

// Desde un informe ya calculado (por ejemplo, el guardado en sessionStorage)
export async function generarResultadosDesdeInforme(informe) {
    const local = redactarSinIA(informe);
    let textos = local;
    let fuente = "local";
    let aviso = null;

    if (CONFIG_IA.apiKey) {
        try {
            textos = await redactarConGemini(informe);
            fuente = "ia";
        } catch (error) {
            if (!CONFIG_IA.usarRespaldoSinIA) throw error;
            console.warn("ZondaSat: no se pudo redactar con Gemini, se usa el texto de respaldo.", error);
            aviso = "No pudimos generar la explicación con IA. Te mostramos una versión resumida con los mismos datos.";
        }
    }

    return { informe, resultados: armarResultados(informe, textos, local, fuente, aviso) };
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
// 4. Llamada a Gemini
// =====================================================================
export async function redactarConGemini(informe) {
    if (!CONFIG_IA.apiKey) throw new Error("Falta la clave de Gemini en config_ia.js");

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(CONFIG_IA.modelo)}:generateContent`;
    const cuerpo = {
        systemInstruction: { parts: [{ text: PROMPT_SISTEMA }] },
        contents: [{
            role: "user",
            parts: [{ text: "Estos son los datos del análisis de mi parcela. Explicámelos siguiendo la estructura pedida.\n\n" + JSON.stringify(datosParaIA(informe)) }]
        }],
        generationConfig: {
            temperature: CONFIG_IA.temperatura,
            maxOutputTokens: CONFIG_IA.maxTokens,
            responseMimeType: "application/json",
            responseSchema: ESQUEMA_RESPUESTA
        }
    };

    const control = new AbortController();
    const reloj = setTimeout(() => control.abort(), CONFIG_IA.tiempoMaximoMs);
    let respuesta;
    try {
        respuesta = await fetch(url, {
            method: "POST",
            signal: control.signal,
            headers: { "Content-Type": "application/json", "x-goog-api-key": CONFIG_IA.apiKey },
            body: JSON.stringify(cuerpo)
        });
    } catch (error) {
        throw new Error(error.name === "AbortError" ? "Gemini tardó demasiado en responder" : `No se pudo conectar con Gemini: ${error.message}`);
    } finally {
        clearTimeout(reloj);
    }

    if (!respuesta.ok) {
        const detalle = await respuesta.text().catch(() => "");
        throw new Error(`Gemini respondió ${respuesta.status}: ${detalle.slice(0, 400)}`);
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
const numero = n => Math.round(n).toLocaleString("es-AR");
const usd = n => `${numero(n)} USD`;
const conMinuscula = t => t ? t.charAt(0).toLowerCase() + t.slice(1) : t;
const conPunto = t => /[.!?]$/.test(t) ? t : t + ".";

function permanenteDe(informe) {
    const planes = Object.values(informe.planes);
    return (informe.planes.economico && informe.planes.economico.permanente) ||
           (planes.find(p => p.permanente) || {}).permanente || null;
}

const CONVIENE_SI = {
    economico: "Te conviene si tenés el agua asegurada y buscás el mejor resultado económico.",
    hidrico: "Te conviene si tu turno de riego es corto o el agua viene escasa.",
    suelo: "Te conviene si tu lote viene cansado o pensás trabajarlo muchos años más.",
    personalizado: "Refleja el equilibrio entre ganancia, agua y suelo que elegiste."
};

const unirNombres = nombres => nombres.length === 1 ? nombres[0] : `${nombres.slice(0, -1).join(", ")} ni ${nombres[nombres.length - 1]}`;

function explicarTemporadaSinIA(t) {
    if (t.cultivo === BARBECHO) return conPunto(t.efectos[0].texto);
    const cultivo = nombreVisible(t.cultivo);
    const partes = [`${cultivo}, ${conMinuscula(t.tipo)}.`];

    // Por qué se eligió
    const opciones = t.opcionesDeLaTemporada || [];
    const viables = opciones.filter(o => o.sePodiaSembrar).sort((x, y) => y.puntos - x.puntos);
    if (viables.length <= 1) partes.push("Era la única opción posible esta temporada.");
    else if (t.eleccion && t.eleccion.eraLaDeMayorPuntajeEnEstaTemporada) partes.push("Fue la mejor opción para esta temporada.");
    else partes.push(`Mirando solo esta temporada convenía ${nombreVisible(viables[0].cultivo)}, pero con ${cultivo} el plan completo de seis temporadas da mejor resultado.`);

    for (const e of t.efectos || []) {
        if (["bono_leguminosa", "repite_familia", "mejora_suelo", "desgasta_suelo"].includes(e.codigo)) partes.push(conPunto(limpiarNombres(e.texto)));
    }
    partes.push(`Necesita unos ${numero(t.agua.riegoEstimadoMm)} mm de riego.`);

    // Qué quedó afuera
    const descartados = opciones.filter(o => !o.sePodiaSembrar);
    const porFamilia = descartados.filter(o => o.motivoDescarte.startsWith("Es de la misma familia")).map(o => nombreVisible(o.cultivo));
    if (porFamilia.length) {
        const plural = porFamilia.length > 1;
        partes.push(`No se eligi${plural ? "eron" : "ó"} ${unirNombres(porFamilia)}: ${plural ? "son" : "es"} de la misma familia que el cultivo anterior, y no se repite familia en temporadas seguidas.`);
    }
    for (const d of descartados.filter(o => !o.motivoDescarte.startsWith("Es de la misma familia")).slice(0, 2)) {
        partes.push(`No se eligió ${nombreVisible(d.cultivo)}: ${conPunto(conMinuscula(limpiarNombres(d.motivoDescarte)))}`);
    }
    return partes.join(" ");
}

const montoConSigno = n => n < 0 ? `una pérdida de ${usd(-n)}` : usd(n);

function cierreSinIA(r) {
    const margen = r.margenTotalUSD === null
        ? "El margen no se puede estimar dentro del plan."
        : `En las seis temporadas el margen esperado es de unos ${usd(r.margenTotalUSD)} por hectárea` +
          (r.margenTotalMalosAniosUSD !== null ? ` (entre ${montoConSigno(r.margenTotalMalosAniosUSD)} si todo sale mal y ${montoConSigno(r.margenTotalBuenosAniosUSD)} si todo sale bien).` : ".");
    const suelo = r.sueloFinal === r.sueloInicial ? "el suelo queda igual" :
        r.sueloFinal > r.sueloInicial ? `el suelo mejora de ${r.sueloInicial} a ${r.sueloFinal} puntos` : `el suelo baja de ${r.sueloInicial} a ${r.sueloFinal} puntos`;
    return `${margen} Usa unos ${numero(r.riegoTotalMm)} mm de riego en total y ${suelo}.`;
}

function comparacionSinIA(informe) {
    const c = informe.comparacion;
    const nombre = clave => conMinuscula(informe.planes[clave].nombre);
    if (c.losPlanesCoinciden) return conPunto(c.notaSiCoinciden);
    const frases = [];
    const ref = informe.planes.economico ? "economico" : Object.keys(informe.planes)[0];
    frases.push(`El ${nombre(c.mayorMargen)} es el que más gana, el ${nombre(c.menorRiego)} el que menos agua usa y el ${nombre(c.mejorSueloFinal)} el que mejor deja el suelo.`);
    c.frenteAlPlanEconomico.forEach((f, indice) => {
        const margen = f.diferenciaMargenUSD === 0 ? "gana lo mismo" : `gana ${usd(Math.abs(f.diferenciaMargenUSD))} ${f.diferenciaMargenUSD < 0 ? "menos" : "más"}`;
        const riego = f.diferenciaRiegoMm === 0 ? "usa la misma agua" : `usa ${numero(Math.abs(f.diferenciaRiegoMm))} mm ${f.diferenciaRiegoMm < 0 ? "menos" : "más"} de riego`;
        const suelo = f.diferenciaSueloFinal === 0 ? "deja el suelo igual" : `deja el suelo ${Math.abs(f.diferenciaSueloFinal)} puntos ${f.diferenciaSueloFinal > 0 ? "mejor" : "peor"}`;
        frases.push(indice === 0
            ? `Frente al ${nombre(ref)}, el ${nombre(f.plan)} ${margen}, ${riego} y ${suelo}.`
            : `El ${nombre(f.plan)} ${margen}, ${riego} y ${suelo}.`);
    });
    return frases.join(" ");
}

export function redactarSinIA(informe) {
    const zona = informe.terreno.zona.nombre;
    const km = informe.terreno.distanciaKm;
    const v = informe.clima.verano, i = informe.clima.invierno;
    const cantidad = Object.keys(informe.planes).length;
    const perm = permanenteDe(informe);

    return {
        titulo: "Tu plan de cultivos para los próximos tres años",
        resumen: `Tu parcela queda en la zona ${zona}. Con su clima armamos ${cantidad === 3 ? "tres planes" : `${cantidad} planes`} de rotación de seis temporadas: uno para ganar más, uno para ahorrar agua y uno para cuidar el suelo.`,
        tuCampo: `Usamos los datos de clima de ${zona}` +
            (km === undefined || km === null ? "." : km < 1 ? ", justo donde está tu parcela." : `, a unos ${numero(km)} km del centro de tu parcela.`) +
            (informe.terreno.fueraDeRango ? " Tu parcela está lejos de las zonas con datos, así que el resultado puede no representar bien tu campo." : ""),
        clima: `En verano la máxima media ronda los ${numero(v.usadoEnElPlan.tempMax)} °C y la mínima los ${numero(v.usadoEnElPlan.tempMin)} °C; en invierno, ${numero(i.usadoEnElPlan.tempMax)} °C y ${numero(i.usadoEnElPlan.tempMin)} °C. ` +
            `Llueve muy poco: unos ${numero(v.lluviaDeLaTemporadaMm)} mm en verano y ${numero(i.lluviaDeLaTemporadaMm)} mm en invierno, así que casi toda el agua tiene que venir del riego.`,
        planes: Object.entries(informe.planes).map(([clave, p]) => ({
            clave,
            enUnaFrase: conPunto(p.objetivo),
            temporadas: p.rotacion.temporadas.map(t => ({ numero: t.numero, explicacion: explicarTemporadaSinIA(t) })),
            cierre: cierreSinIA(p.rotacion),
            convieneSi: CONVIENE_SI[clave] || ""
        })),
        comparacion: comparacionSinIA(informe),
        permanente: perm
            ? `${nombreVisible(perm.cultivo)} es una alternativa si preferís un cultivo permanente en lugar de rotar. ` +
              `Plantado ahora, empezaría a producir recién al año ${perm.aniosHastaProducir}, así que en estos tres años casi no da ingresos, ` +
              `y la inversión inicial ronda los ${usd(perm.implantacionUSDha)} por hectárea. Su atractivo está en la rentabilidad a lo largo de toda su vida útil.`
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

export function armarResultados(informe, textosIA, textosLocales = redactarSinIA(informe), fuente = "local", aviso = null) {
    const ia = textosIA || {};
    const loc = textosLocales;
    const t = informe.terreno;
    const climaDe = e => ({
        tempMaxC: informe.clima[e].usadoEnElPlan.tempMax,
        tempMinC: informe.clima[e].usadoEnElPlan.tempMin,
        lluviaMm: informe.clima[e].lluviaDeLaTemporadaMm,
        evapotranspiracionMmDia: informe.clima[e].evapotranspiracionET0MmPorDia
    });
    const perm = permanenteDe(informe);

    return {
        fuente,                  // "ia" o "local"
        aviso,                   // texto para mostrar si se cayó a la versión sin IA; null si no
        encabezado: {
            titulo: texto(ia.titulo, loc.titulo),
            resumen: texto(ia.resumen, loc.resumen)
        },
        campo: {
            titulo: TITULOS.campo,
            texto: texto(ia.tuCampo, loc.tuCampo),
            zona: t.zona.nombre,
            centro: t.centroide || null,
            distanciaKm: t.distanciaKm ?? null,
            fueraDeRango: Boolean(t.fueraDeRango)
        },
        clima: {
            titulo: TITULOS.clima,
            texto: texto(ia.clima, loc.clima),
            verano: climaDe("verano"),
            invierno: climaDe("invierno")
        },
        planes: {
            titulo: TITULOS.planes,
            lista: Object.entries(informe.planes).map(([clave, p]) => {
                const pIA = (Array.isArray(ia.planes) ? ia.planes : []).find(x => x && x.clave === clave) || {};
                const pLoc = loc.planes.find(x => x.clave === clave);
                const r = p.rotacion;
                return {
                    clave,
                    nombre: p.nombre,
                    objetivo: p.objetivo,
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
                            cultivo: nombreVisible(tp.cultivo),
                            nombreCompleto: tp.cultivo,
                            tipo: tp.tipo,
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
            titulo: TITULOS.comparacion,
            texto: texto(ia.comparacion, loc.comparacion),
            mayorMargen: informe.comparacion.mayorMargen,
            menorRiego: informe.comparacion.menorRiego,
            mejorSuelo: informe.comparacion.mejorSueloFinal,
            planesCoinciden: informe.comparacion.losPlanesCoinciden
        },
        permanente: perm ? {
            titulo: TITULOS.permanente,
            cultivo: nombreVisible(perm.cultivo),
            texto: texto(ia.permanente, loc.permanente),
            aniosHastaProducir: perm.aniosHastaProducir,
            inversionUSDporHa: perm.implantacionUSDha,
            riegoPorAnioMm: perm.riegoPorAnioMm
        } : null,
        antesDeSembrar: { titulo: TITULOS.antesDeSembrar, puntos: lista(ia.antesDeSembrar, loc.antesDeSembrar) },
        proximosPasos: { titulo: TITULOS.proximosPasos, puntos: lista(ia.proximosPasos, loc.proximosPasos) }
    };
}
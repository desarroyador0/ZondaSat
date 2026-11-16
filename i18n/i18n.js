// =====================================================================
// ZondaSat — Sistema de internacionalización (i18n) Español / Inglés
// Basado en diccionarios JSON (i18n/es.json y i18n/en.json) con
// persistencia en localStorage y actualización reactiva instantánea.
// =====================================================================

const CLAVE_IDIOMA = 'zondasat:idioma';
const IDIOMA_POR_DEFECTO = 'es';

// Diccionarios precargados para cambio instantáneo sin parpadeos (sincronizados con es.json y en.json)
const DICCIONARIOS = {
    es: {
        meta: {
            homeTitle: "ZondaSat",
            homeDescription: "ZondaSat arma un plan de rotación de cultivos para tu parcela de San Juan con datos de clima de la NASA.",
            resultsTitle: "Tu plan · ZondaSat",
            resultsDescription: "Tu plan de rotación de cultivos a tres años, temporada por temporada."
        },
        header: {
            brandAria: "ZondaSat, inicio",
            langSelectorAria: "Seleccionar idioma",
            langEs: "Español",
            langEn: "Inglés",
            backToHome: "Volver",
            backToParcel: "Mi parcela"
        },
        welcome: {
            greeting: "Hola, productor.",
            title: "Planificá qué sembrar en tu campo los próximos tres años",
            subtitle: "Marcá tu parcela en el mapa y armamos un plan de rotación de cultivos con datos de clima de la NASA para tu zona de San Juan.",
            step1: "Marcá las esquinas de tu parcela",
            step2: "Analizamos el clima de tu zona",
            step3: "Recibís tu plan, temporada por temporada",
            note: "Lleva menos de un minuto. No hace falta crear una cuenta.",
            startBtn: "Comenzar",
            figureLabel: "Tu parcela",
            footer: "Prototipo creado para NASA Space Apps 2026 con datos de NASA POWER."
        },
        map: {
            appAria: "Mapa de San Juan para marcar tu parcela",
            hintZoom: "Tocá el mapa para acercarte a tu campo",
            hintFirstCorner: "Tocá la primera esquina de tu parcela",
            hintNeed2: "Bien. Faltan 2 esquinas",
            hintNeed1: "Falta 1 esquina",
            hintReady: "Listo. Podés sumar esquinas o comenzar el análisis",
            hintRegistered: "Parcela registrada",
            errorLoadMap: "No se pudo cargar el mapa. Revisá tu conexión a internet.",
            maxPointsAlert: "Podés marcar hasta {max} esquinas",
            noGeolocation: "Este dispositivo no permite obtener tu ubicación",
            outsideSanJuan: "Tu ubicación está fuera de San Juan",
            geolocationError: "No pudimos obtener tu ubicación. Buscá tu campo en el mapa",
            zoomInTitle: "Acercar",
            zoomOutTitle: "Alejar",
            attrEsri: "Imágenes &copy; Esri y proveedores",
            attrOsm: "&copy; colaboradores de OpenStreetMap",
            mapTypeAria: "Tipo de mapa",
            layerSatellite: "Satélite",
            layerStreets: "Mapa",
            myLocationAria: "Ir a mi ubicación",
            undo: "Deshacer",
            clear: "Borrar",
            panelAria: "Tu parcela",
            panelTitle: "Marcá tu parcela",
            panelHelp: "Tocá el mapa en cada esquina de tu terreno. Podés arrastrar un punto para corregirlo.",
            cornersLabel: "Esquinas",
            areaLabel: "Superficie",
            unmarked: "Sin marcar",
            centerLabel: "Centro de la parcela",
            climateZoneLabel: "Zona con datos de clima",
            zoneDistance: "{zona} (a {km} km)",
            farWarning: "Tu parcela está a {km} km de la zona con datos más cercana. El análisis puede no representar bien tu campo.",
            startAnalysisBtn: "Comenzar análisis",
            minCornersNote: "Marcá al menos 3 esquinas para comenzar.",
            registeredTitle: "Parcela registrada",
            markAnotherBtn: "Marcar otra parcela"
        },
        results: {
            navAria: "Secciones del informe",
            loadingTitle: "Armando tu plan…",
            loadingText: "Estamos analizando el clima de tu zona y redactando la explicación. Puede tardar unos segundos.",
            noParcelTitle: "Todavía no marcaste tu parcela",
            noParcelText: "Marcá las esquinas de tu campo en el mapa y armamos tu plan.",
            goToMapBtn: "Ir al mapa",
            errorTitle: "No pudimos armar tu plan",
            errorText: "Hubo un problema al redactar la explicación. Probá de nuevo en unos segundos.",
            retryBtn: "Reintentar",
            readyBadge: "Tu plan está listo",
            chipZone: "Zona {zona}",
            chipDuration: "3 años · 6 temporadas",
            chipAi: "Explicado con IA",
            chipSummary: "Versión resumida",
            aiFallbackNotice: "No pudimos generar la explicación con IA. Te mostramos una versión resumida con los mismos datos.",
            navField: "Tu campo",
            navClimate: "Clima",
            navPlan: "Tu plan",
            navComparison: "Comparación",
            navPermanent: "Permanente",
            navBeforePlanting: "Antes de sembrar",
            secFieldTitle: "Tu campo",
            secClimateTitle: "El clima de tu zona",
            secPlanesTitle: "Tres planes para los próximos tres años",
            secComparisonTitle: "Qué ganás y qué resignás con cada plan",
            secPermanentTitle: "Si preferís un cultivo permanente",
            secBeforePlantingTitle: "Antes de sembrar",
            secNextStepsTitle: "Próximos pasos",
            secClosingTitle: "Antes de sembrar y próximos pasos",
            climateZone: "Zona de clima",
            surface: "Superficie",
            parcelCenter: "Centro de la parcela",
            distanceToZone: "Distancia a la zona",
            outOfRangeWarning: "Tu parcela queda lejos de las zonas con datos: el resultado puede no representar bien tu campo.",
            summer: "Verano",
            winter: "Invierno",
            avgMaxTemp: "Máxima media",
            avgMinTemp: "Mínima media",
            seasonRain: "Lluvia de la temporada",
            evaporation: "Evaporación",
            mmPerDay: "mm/día",
            choosePlanAria: "Elegí un plan",
            atAGlanceTitle: "La rotación de un vistazo",
            atAGlanceAria: "Rotación de un vistazo",
            yearN: "Año {n}",
            seasonBySeasonTitle: "Temporada por temporada",
            seasonN: "Temporada {n} · {estacion}",
            expectedMarginHa: "Margen esperado por ha",
            expectedMargin: "Margen esperado",
            marginRange: "Entre {min} y {max}",
            noRange: "Sin rango disponible",
            notEstimable: "No estimable",
            totalIrrigation: "Riego total",
            m3PerHa: "{m3} m³ por hectárea",
            soilState: "Estado del suelo",
            soilEnd: "Suelo al final",
            soilSame: "Queda igual",
            soilImproves: "Mejora {n} puntos",
            soilDrops: "Baja {n} puntos",
            irrigation: "Riego",
            margin: "Margen",
            soil: "Suelo",
            soilAria: "Suelo de {antes} a {despues} sobre 100",
            inSummary: "En resumen",
            badgeHighestGain: "Mayor ganancia",
            badgeLeastWater: "Menos riego",
            badgeBestSoil: "Mejor suelo",
            cropLabel: "Cultivo",
            startsProducing: "Empieza a producir",
            initialInvestment: "Inversión inicial",
            irrigationPerYear: "Riego por año",
            markAnotherParcelBtn: "Marcar otra parcela",
            saveOrPrintBtn: "Guardar o imprimir el plan",
            footerDisclaimer: "Estimaciones orientativas con datos de NASA POWER. Confirmalas con un técnico del INTA antes de sembrar. Prototipo creado para NASA Space Apps 2026."
        },
        crops: {
            names: {
                "Vid (Uva)": "Vid",
                "Vid": "Vid",
                "Olivo": "Olivo",
                "Pistacho": "Pistacho",
                "Tomate para industria": "Tomate para industria",
                "Melón": "Melón",
                "Ajo": "Ajo",
                "Cebolla": "Cebolla",
                "Garbanzo (Leguminosa)": "Garbanzo",
                "Garbanzo": "Garbanzo",
                "Alfalfa / Cobertura Verde": "Alfalfa",
                "Alfalfa": "Alfalfa",
                "Barbecho (sin cultivo viable)": "Descanso del lote",
                "Descanso del lote": "Descanso del lote"
            },
            types: {
                "Frutal perenne": "Frutal perenne",
                "Frutal perenne de alto valor": "Frutal perenne de alto valor",
                "Hortaliza de verano": "Hortaliza de verano",
                "Hortaliza de invierno": "Hortaliza de invierno",
                "Legumbre de invierno": "Legumbre de invierno",
                "Forrajera y recuperadora de suelo": "Forrajera y recuperadora de suelo",
                "Descanso del lote": "Descanso del lote"
            },
            plans: {
                economico: {
                    nombre: "Plan económico",
                    corto: "Económico",
                    objetivo: "Obtener la mayor ganancia por hectárea",
                    convieneSi: "Te conviene si tenés el agua asegurada y buscás el mejor resultado económico."
                },
                hidrico: {
                    nombre: "Plan de ahorro de agua",
                    corto: "Ahorro de agua",
                    objetivo: "Usar la menor cantidad de agua de riego",
                    convieneSi: "Te conviene si tu turno de riego es corto o el agua viene escasa."
                },
                suelo: {
                    nombre: "Plan de cuidado del suelo",
                    corto: "Cuidado del suelo",
                    objetivo: "Dejar el suelo en el mejor estado a largo plazo",
                    convieneSi: "Te conviene si tu lote viene cansado o pensás trabajarlo muchos años más."
                },
                personalizado: {
                    nombre: "Plan personalizado",
                    corto: "Personalizado",
                    objetivo: "Equilibrio elegido por el usuario",
                    convieneSi: "Refleja el equilibrio entre ganancia, agua y suelo que elegiste."
                }
            }
        }
    },
    en: {
        meta: {
            homeTitle: "ZondaSat",
            homeDescription: "ZondaSat builds a 3-year crop rotation plan for your parcel in San Juan using NASA climate data.",
            resultsTitle: "Your Plan · ZondaSat",
            resultsDescription: "Your three-year crop rotation plan, season by season."
        },
        header: {
            brandAria: "ZondaSat, home",
            langSelectorAria: "Select language",
            langEs: "Spanish",
            langEn: "English",
            backToHome: "Back",
            backToParcel: "My parcel"
        },
        welcome: {
            greeting: "Hello, grower.",
            title: "Plan what to plant in your field over the next three years",
            subtitle: "Mark your parcel on the map and we will build a crop rotation plan using NASA climate data for your area in San Juan.",
            step1: "Mark the corners of your parcel",
            step2: "We analyze the climate of your area",
            step3: "Get your plan, season by season",
            note: "Takes less than a minute. No account required.",
            startBtn: "Get started",
            figureLabel: "Your parcel",
            footer: "Prototype created for NASA Space Apps 2026 using NASA POWER data."
        },
        map: {
            appAria: "Map of San Juan to mark your parcel",
            hintZoom: "Tap the map to zoom in to your field",
            hintFirstCorner: "Tap the first corner of your parcel",
            hintNeed2: "Good. 2 corners left",
            hintNeed1: "1 corner left",
            hintReady: "Ready. You can add more corners or start the analysis",
            hintRegistered: "Parcel registered",
            errorLoadMap: "Could not load the map. Please check your internet connection.",
            maxPointsAlert: "You can mark up to {max} corners",
            noGeolocation: "This device does not support geolocation",
            outsideSanJuan: "Your location is outside San Juan",
            geolocationError: "We couldn't get your location. Find your field on the map",
            zoomInTitle: "Zoom in",
            zoomOutTitle: "Zoom out",
            attrEsri: "Imagery &copy; Esri and contributors",
            attrOsm: "&copy; OpenStreetMap contributors",
            mapTypeAria: "Map type",
            layerSatellite: "Satellite",
            layerStreets: "Map",
            myLocationAria: "Go to my location",
            undo: "Undo",
            clear: "Clear",
            panelAria: "Your parcel",
            panelTitle: "Mark your parcel",
            panelHelp: "Tap the map on each corner of your land. You can drag a point to adjust it.",
            cornersLabel: "Corners",
            areaLabel: "Area",
            unmarked: "Unmarked",
            centerLabel: "Parcel center",
            climateZoneLabel: "Climate data zone",
            zoneDistance: "{zona} ({km} km away)",
            farWarning: "Your parcel is {km} km away from the nearest zone with data. The analysis may not accurately represent your field.",
            startAnalysisBtn: "Start analysis",
            minCornersNote: "Mark at least 3 corners to start.",
            registeredTitle: "Parcel registered",
            markAnotherBtn: "Mark another parcel"
        },
        results: {
            navAria: "Report sections",
            loadingTitle: "Building your plan…",
            loadingText: "We are analyzing your area's climate and writing the report. This may take a few seconds.",
            noParcelTitle: "You haven't marked your parcel yet",
            noParcelText: "Mark the corners of your field on the map and we'll build your plan.",
            goToMapBtn: "Go to map",
            errorTitle: "We couldn't build your plan",
            errorText: "There was a problem generating the explanation. Please try again in a few seconds.",
            retryBtn: "Retry",
            readyBadge: "Your plan is ready",
            chipZone: "{zona} Zone",
            chipDuration: "3 years · 6 seasons",
            chipAi: "Explained with AI",
            chipSummary: "Summary version",
            aiFallbackNotice: "We couldn't generate the AI explanation. Here is a summary version using the exact same data.",
            navField: "Your field",
            navClimate: "Climate",
            navPlan: "Your plan",
            navComparison: "Comparison",
            navPermanent: "Permanent",
            navBeforePlanting: "Before planting",
            secFieldTitle: "Your field",
            secClimateTitle: "Your area's climate",
            secPlanesTitle: "Three plans for the next three years",
            secComparisonTitle: "What you gain and trade off with each plan",
            secPermanentTitle: "If you prefer a permanent crop",
            secBeforePlantingTitle: "Before planting",
            secNextStepsTitle: "Next steps",
            secClosingTitle: "Before planting & next steps",
            climateZone: "Climate zone",
            surface: "Area",
            parcelCenter: "Parcel center",
            distanceToZone: "Distance to zone",
            outOfRangeWarning: "Your parcel is far from the zones with data: the results may not accurately represent your field.",
            summer: "Summer",
            winter: "Winter",
            avgMaxTemp: "Avg. high",
            avgMinTemp: "Avg. low",
            seasonRain: "Seasonal rainfall",
            evaporation: "Evaporation",
            mmPerDay: "mm/day",
            choosePlanAria: "Choose a plan",
            atAGlanceTitle: "Rotation at a glance",
            atAGlanceAria: "Rotation at a glance",
            yearN: "Year {n}",
            seasonBySeasonTitle: "Season by season",
            seasonN: "Season {n} · {estacion}",
            expectedMarginHa: "Expected margin per ha",
            expectedMargin: "Expected margin",
            marginRange: "Between {min} and {max}",
            noRange: "No range available",
            notEstimable: "Not estimable",
            totalIrrigation: "Total irrigation",
            m3PerHa: "{m3} m³ per hectare",
            soilState: "Soil health",
            soilEnd: "Final soil state",
            soilSame: "Stays the same",
            soilImproves: "Improves by {n} points",
            soilDrops: "Drops by {n} points",
            irrigation: "Irrigation",
            margin: "Margin",
            soil: "Soil",
            soilAria: "Soil from {antes} to {despues} out of 100",
            inSummary: "In summary",
            badgeHighestGain: "Highest profit",
            badgeLeastWater: "Least water",
            badgeBestSoil: "Best soil",
            cropLabel: "Crop",
            startsProducing: "Starts producing",
            initialInvestment: "Initial investment",
            irrigationPerYear: "Irrigation per year",
            markAnotherParcelBtn: "Mark another parcel",
            saveOrPrintBtn: "Save or print plan",
            footerDisclaimer: "Indicative estimates based on NASA POWER data. Confirm with a local INTA agronomist before planting. Prototype created for NASA Space Apps 2026."
        },
        crops: {
            names: {
                "Vid (Uva)": "Grapevine",
                "Vid": "Grapevine",
                "Olivo": "Olive",
                "Pistacho": "Pistachio",
                "Tomate para industria": "Processing Tomato",
                "Melón": "Melon",
                "Ajo": "Garlic",
                "Cebolla": "Onion",
                "Garbanzo (Leguminosa)": "Chickpea",
                "Garbanzo": "Chickpea",
                "Alfalfa / Cobertura Verde": "Alfalfa",
                "Alfalfa": "Alfalfa",
                "Barbecho (sin cultivo viable)": "Fallow (field rest)",
                "Descanso del lote": "Fallow (field rest)"
            },
            types: {
                "Frutal perenne": "Perennial fruit crop",
                "Frutal perenne de alto valor": "High-value perennial fruit crop",
                "Hortaliza de verano": "Summer vegetable",
                "Hortaliza de invierno": "Winter vegetable",
                "Legumbre de invierno": "Winter legume",
                "Forrajera y recuperadora de suelo": "Forage & soil-restoring crop",
                "Descanso del lote": "Field rest"
            },
            plans: {
                economico: {
                    nombre: "Economic plan",
                    corto: "Economic",
                    objetivo: "Obtain the highest profit per hectare",
                    convieneSi: "Best suited if your water supply is secure and you want the highest financial return."
                },
                hidrico: {
                    nombre: "Water-saving plan",
                    corto: "Water-saving",
                    objetivo: "Use the least amount of irrigation water",
                    convieneSi: "Best suited if your irrigation turn is short or water is scarce."
                },
                suelo: {
                    nombre: "Soil-care plan",
                    corto: "Soil-care",
                    objetivo: "Leave the soil in the best long-term condition",
                    convieneSi: "Best suited if your plot is depleted or you plan to farm it for many years to come."
                },
                personalizado: {
                    nombre: "Custom plan",
                    corto: "Custom",
                    objetivo: "User-selected balance",
                    convieneSi: "Reflects the balance between profit, water, and soil that you selected."
                }
            }
        }
    }
};

// Carga asíncrona opcional de los archivos es.json y en.json para mantener sincronía con archivos externos
async function sincronizarArchivosJSON() {
    const base = new URL('.', import.meta.url).href;
    for (const lang of ['es', 'en']) {
        try {
            const resp = await fetch(`${base}${lang}.json`);
            if (resp.ok) {
                DICCIONARIOS[lang] = await resp.json();
            }
        } catch {
            // Se usa el diccionario en memoria si falla la red
        }
    }
}
sincronizarArchivosJSON();

const suscriptores = new Set();

export function obtenerIdioma() {
    try {
        const guardado = localStorage.getItem(CLAVE_IDIOMA);
        if (guardado === 'es' || guardado === 'en') return guardado;
    } catch {
        // localStorage bloqueado
    }
    return IDIOMA_POR_DEFECTO;
}

export function esIngles() {
    return obtenerIdioma() === 'en';
}

export function t(ruta, params = {}, idioma = obtenerIdioma()) {
    const dic = DICCIONARIOS[idioma] || DICCIONARIOS[IDIOMA_POR_DEFECTO];
    const valor = ruta.split('.').reduce((acc, parte) => (acc && acc[parte] !== undefined ? acc[parte] : undefined), dic);
    if (typeof valor !== 'string') return ruta;
    return valor.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}

export function traducirCultivo(nombre, idioma = obtenerIdioma()) {
    if (!nombre) return '';
    const mapa = (DICCIONARIOS[idioma] || DICCIONARIOS.es).crops.names;
    return mapa[nombre] || nombre;
}

export function traducirTipoCultivo(tipo, idioma = obtenerIdioma()) {
    if (!tipo) return '';
    const mapa = (DICCIONARIOS[idioma] || DICCIONARIOS.es).crops.types;
    return mapa[tipo] || tipo;
}

export function traducirPlan(clave, campo = 'nombre', idioma = obtenerIdioma()) {
    const planes = (DICCIONARIOS[idioma] || DICCIONARIOS.es).crops.plans;
    return (planes[clave] && planes[clave][campo]) || '';
}

export function traducirDOM(raiz = document) {
    const idioma = obtenerIdioma();
    if (raiz === document) {
        document.documentElement.lang = idioma;
    }

    raiz.querySelectorAll('[data-i18n]').forEach(el => {
        const clave = el.dataset.i18n;
        if (clave) el.textContent = t(clave, {}, idioma);
    });

    raiz.querySelectorAll('[data-i18n-aria]').forEach(el => {
        const clave = el.dataset.i18nAria;
        if (clave) el.setAttribute('aria-label', t(clave, {}, idioma));
    });

    raiz.querySelectorAll('[data-i18n-title]').forEach(el => {
        const clave = el.dataset.i18nTitle;
        if (clave) el.setAttribute('title', t(clave, {}, idioma));
    });

    raiz.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const clave = el.dataset.i18nPlaceholder;
        if (clave) el.setAttribute('placeholder', t(clave, {}, idioma));
    });

    raiz.querySelectorAll('[data-i18n-alt]').forEach(el => {
        const clave = el.dataset.i18nAlt;
        if (clave) el.setAttribute('alt', t(clave, {}, idioma));
    });

    const metaDesc = document.querySelector('meta[name="description"][data-i18n-meta]');
    if (metaDesc) {
        metaDesc.setAttribute('content', t(metaDesc.dataset.i18nMeta, {}, idioma));
    }

    const titleEl = document.querySelector('title[data-i18n-doc-title]');
    if (titleEl && !document.body.dataset.customTitle) {
        document.title = t(titleEl.dataset.i18nDocTitle, {}, idioma);
    }

    actualizarSelectoresIdioma(idioma);
}

function actualizarSelectoresIdioma(idioma) {
    document.querySelectorAll('.selector-idioma').forEach(grupo => {
        grupo.setAttribute('aria-label', t('header.langSelectorAria', {}, idioma));
        grupo.querySelectorAll('[data-lang]').forEach(btn => {
            const activo = btn.dataset.lang === idioma;
            btn.setAttribute('aria-pressed', String(activo));
            btn.classList.toggle('selector-idioma__btn--activo', activo);
            const claveLabel = btn.dataset.lang === 'es' ? 'header.langEs' : 'header.langEn';
            btn.setAttribute('aria-label', t(claveLabel, {}, idioma));
            btn.setAttribute('title', t(claveLabel, {}, idioma));
        });
    });
}

export function cambiarIdioma(nuevoIdioma) {
    if (nuevoIdioma !== 'es' && nuevoIdioma !== 'en') return;
    const actual = obtenerIdioma();
    try {
        localStorage.setItem(CLAVE_IDIOMA, nuevoIdioma);
    } catch {
        // Ignorar si localStorage no está disponible
    }
    traducirDOM();
    if (actual !== nuevoIdioma) {
        suscriptores.forEach(fn => {
            try { fn(nuevoIdioma); } catch (e) { console.error(e); }
        });
        document.dispatchEvent(new CustomEvent('zondasat:idioma', { detail: { idioma: nuevoIdioma } }));
    }
}

export function alCambiarIdioma(fn) {
    suscriptores.add(fn);
    return () => suscriptores.delete(fn);
}

export function iniciarI18n() {
    document.querySelectorAll('.selector-idioma').forEach(grupo => {
        if (grupo.dataset.i18nIniciado) return;
        grupo.dataset.i18nIniciado = 'true';
        grupo.querySelectorAll('[data-lang]').forEach(btn => {
            btn.addEventListener('click', () => cambiarIdioma(btn.dataset.lang));
        });
    });
    traducirDOM();
}

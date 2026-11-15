const CORE_PARAMETERS = [
  "GWETROOT", "GWETTOP", "GWETPROF",
  "TS_MAX", "TS_MIN", "T2M_MAX", "T2M_MIN", "RH2M",
  "PRECTOTCORR_SUM", "EVLAND",
  "WS2M_MAX", "WD2M",
  "ALLSKY_SFC_SW_DWN", "ALLSKY_SFC_PAR_TOT", "CLOUD_AMT"
];

const HISTORY_PARAMETERS = ["GWETTOP", "GWETROOT", "TS", "EVLAND", "PRECTOTCORR"];

const PARAM_DICTIONARY = {
  GWETROOT: {
    categoria: "💧 Humedad del Suelo (Reserva Hídrica)",
    titulo: "Humedad en Zona de Raíces (0–100 cm)",
    explicacion: "Agua disponible donde absorben las raíces. Define la batería hídrica entre turnos de riego."
  },
  GWETTOP: {
    categoria: "💧 Humedad del Suelo (Reserva Hídrica)",
    titulo: "Humedad Superficial (0–5 cm)",
    explicacion: "Humedad en la capa de siembra. Valores < 0.22 indican evaporación rápida y riesgo de ascenso de sales."
  },
  GWETPROF: {
    categoria: "💧 Humedad del Suelo (Reserva Hídrica)",
    titulo: "Humedad del Perfil Completo",
    explicacion: "Reserva hídrica profunda del suelo. Útil para evaluar viabilidad de cultivos perennes o de raíz profunda (ej. alfalfa)."
  },
  TS_MAX: {
    categoria: "🌡️ Estrés Térmico y Riesgo de Heladas",
    titulo: "Temperatura Máxima de Superficie del Suelo",
    explicacion: "Calor directo en la tierra. Picos > 45 °C sobre suelo desnudo dañan la microbiología y exigen cobertura vegetal."
  },
  TS_MIN: {
    categoria: "🌡️ Estrés Térmico y Riesgo de Heladas",
    titulo: "Temperatura Mínima de Superficie del Suelo",
    explicacion: "Enfriamiento directo a nivel de suelo y cuello de planta; clave para detectar heladas agronómicas."
  },
  T2M_MAX: {
    categoria: "🌡️ Estrés Térmico y Riesgo de Heladas",
    titulo: "Temperatura Máxima del Aire (2 m)",
    explicacion: "Picos de calor atmosférico. Superar los 38 °C provoca aborto floral en cultivos sensibles como el tomate."
  },
  T2M_MIN: {
    categoria: "🌡️ Estrés Térmico y Riesgo de Heladas",
    titulo: "Temperatura Mínima del Aire (2 m)",
    explicacion: "Detecta ventanas de heladas tardías en primavera (Sep/Oct) para ajustar fechas seguras de siembra."
  },
  RH2M: {
    categoria: "🌡️ Estrés Térmico y Riesgo de Heladas",
    titulo: "Humedad Relativa del Aire (2 m)",
    explicacion: "Demanda atmosférica. Valores < 40% aceleran la deshidratación de hojas entre riegos."
  },
  PRECTOTCORR_SUM: {
    categoria: "🌧️ Balance Hídrico (Lluvia vs. Evaporación)",
    titulo: "Precipitación Acumulada Corregida",
    explicacion: "Lluvia total anual y mensual. Define si el lote es apto para secano (> 750 mm) o depende de riego."
  },
  EVLAND: {
    categoria: "🌧️ Balance Hídrico (Lluvia vs. Evaporación)",
    titulo: "Evaporación Directa del Terreno",
    explicacion: "Milímetros de agua que se pierden por día desde el suelo hacia el aire. Justifica el uso de mulch/cobertura."
  },
  WS2M_MAX: {
    categoria: "💨 Viento a Nivel de Cultivo",
    titulo: "Ráfagas Máximas de Viento (2 m)",
    explicacion: "Velocidad máxima del viento sobre las plantas. Ráfagas > 14 m/s en invierno seco erosionan suelos descubiertos."
  },
  WD2M: {
    categoria: "💨 Viento a Nivel de Cultivo",
    titulo: "Dirección Dominante del Viento (2 m)",
    explicacion: "Orientación en grados (270° = Oeste). Permite orientar surcos y cortinas de cobertura contra el viento Zonda."
  },
  ALLSKY_SFC_SW_DWN: {
    categoria: "☀️ Radiación Solar y Energía Fotosintética",
    titulo: "Radiación Solar Incidente Total",
    explicacion: "Energía solar total que llega al lote. Alta radiación impulsa crecimiento pero aumenta la evapotranspiración."
  },
  ALLSKY_SFC_PAR_TOT: {
    categoria: "☀️ Radiación Solar y Energía Fotosintética",
    titulo: "Radiación Fotosintéticamente Activa (PAR)",
    explicacion: "Fracción exacta de luz que usan las plantas para hacer fotosíntesis y generar biomasa todo el año."
  },
  CLOUD_AMT: {
    categoria: "☀️ Radiación Solar y Energía Fotosintética",
    titulo: "Nubosidad Promedio (%)",
    explicacion: "Porcentaje de cielo cubierto. Baja nubosidad (< 40%) confirma alta insolación directa y eficiencia para cultivos de servicio."
  }
};

// Catálogo agronómico con requisitos de intervalo de riego y función ecosistémica en rotación
const CROP_KNOWLEDGE_BASE = [
  {
    nombre: "Tomate Industria / Hortícola Estival",
    intervaloMaxDias: 8,
    toleraSalinidad: false,
    rol: "Renta comercial estival (alta demanda hídrica y sensible a >38°C)"
  },
  {
    nombre: "Lechuga / Hortalizas de Hoja Superficial",
    intervaloMaxDias: 6,
    toleraSalinidad: false,
    rol: "Ciclo corto superficial (requiere humedad constante en 0–15 cm)"
  },
  {
    nombre: "Zapallo Anco / Melón (Riego por Surco)",
    intervaloMaxDias: 15,
    toleraSalinidad: true,
    rol: "Renta estival de raíz media-profunda compatible con turnos quincenales"
  },
  {
    nombre: "Alfalfa (Perenne Pivotante Profunda)",
    intervaloMaxDias: 18,
    toleraSalinidad: true,
    rol: "Fija nitrógeno, rompe capas compactadas e infiltra agua hasta 1.5 m"
  },
  {
    nombre: "Consorcio Vicia Villosa + Centeno (Puente Verde Invernal)",
    intervaloMaxDias: 25,
    toleraSalinidad: true,
    rol: "Cubre suelo desnudo en invierno, fija N atmosférico y frena evaporación salina"
  },
  {
    nombre: "Cebada Forrajera / Sorgo Granífero Tolerante",
    intervaloMaxDias: 21,
    toleraSalinidad: true,
    rol: "Alta eficiencia de uso de agua (WUE) y extracción moderada de sales"
  },
  {
    nombre: "Maíz / Soja de Secano Extensivo",
    intervaloMaxDias: 99,
    requiereSecanoMm: 650,
    toleraSalinidad: false,
    rol: "Cultivo extensivo dependiente de recarga pluvial estival"
  }
];

const MESES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MESES_ES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Inicializar mapa centrado en Valle de Tulum, San Juan
const map = L.map("map").setView([-31.6874, -68.5955], 14);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Esri World Imagery",
  maxZoom: 19
}).addTo(map);
L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
  maxZoom: 19
}).addTo(map);

let polygonVertices = [];
let vertexMarkers = [];
let parcelPolygon = null;
let selectedCenter = null;
let parcelAreaHa = 0;
let lastMergedData = null;

const lblVertices = document.getElementById("lbl-vertices");
const lblCenter = document.getElementById("lbl-center");
const lblArea = document.getElementById("lbl-area");
const btnUndo = document.getElementById("btn-undo");
const btnReset = document.getElementById("btn-reset");
const btnFetch = document.getElementById("btn-fetch");
const btnDownloadGeoJSON = document.getElementById("btn-download-geojson");
const btnDownloadJSON = document.getElementById("btn-download-json");
const statusBadge = document.getElementById("status-badge");
const resultsContainer = document.getElementById("results-container");
const filterInput = document.getElementById("filter-input");
const selIrrigationTurn = document.getElementById("sel-irrigation-turn");
const selPriority = document.getElementById("sel-priority");

function calcularAreaHectareas(latlngs) {
  if (latlngs.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < latlngs.length; i++) {
    const p1 = latlngs[i];
    const p2 = latlngs[(i + 1) % latlngs.length];
    const lon1 = (p1.lng * Math.PI) / 180;
    const lon2 = (p2.lng * Math.PI) / 180;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }
  area = Math.abs((area * R * R) / 2);
  return area / 10000;
}

function actualizarPoligono() {
  vertexMarkers.forEach((m) => map.removeLayer(m));
  vertexMarkers = [];
  if (parcelPolygon) {
    map.removeLayer(parcelPolygon);
    parcelPolygon = null;
  }

  polygonVertices.forEach((latlng, idx) => {
    const marker = L.circleMarker(latlng, {
      radius: idx === 0 ? 8 : 6,
      color: idx === 0 ? "#38bdf8" : "#10b981",
      fillColor: idx === 0 ? "#38bdf8" : "#10b981",
      fillOpacity: 1
    }).addTo(map);
    vertexMarkers.push(marker);
  });

  lblVertices.textContent = polygonVertices.length;
  btnUndo.disabled = polygonVertices.length === 0;

  if (polygonVertices.length >= 3) {
    parcelPolygon = L.polygon(polygonVertices, {
      color: "#10b981",
      weight: 2.5,
      fillColor: "#10b981",
      fillOpacity: 0.24
    }).addTo(map);

    selectedCenter = parcelPolygon.getBounds().getCenter();
    parcelAreaHa = calcularAreaHectareas(polygonVertices);

    lblCenter.textContent = `${selectedCenter.lat.toFixed(4)}, ${selectedCenter.lng.toFixed(4)}`;
    lblArea.textContent = `${parcelAreaHa.toFixed(2)} ha`;
    btnFetch.disabled = false;
    btnDownloadGeoJSON.disabled = false;
    statusBadge.textContent = `Polígono listo (${polygonVertices.length} vértices · ${parcelAreaHa.toFixed(2)} ha)`;
  } else {
    selectedCenter = null;
    parcelAreaHa = 0;
    lblCenter.textContent = "Sin definir";
    lblArea.textContent = "0 ha";
    btnFetch.disabled = true;
    btnDownloadGeoJSON.disabled = true;
    statusBadge.textContent =
      polygonVertices.length === 0
        ? "Tocá el mapa para marcar los vértices de tu parcela"
        : `Faltan ${3 - polygonVertices.length} vértice(s) para cerrar la parcela`;
  }
}

map.on("click", (e) => {
  polygonVertices.push(e.latlng);
  actualizarPoligono();
});

btnUndo.addEventListener("click", () => {
  polygonVertices.pop();
  actualizarPoligono();
});

btnReset.addEventListener("click", () => {
  polygonVertices = [];
  actualizarPoligono();
});

function construirGeoJSON() {
  const coords = polygonVertices.map((p) => [Number(p.lng.toFixed(6)), Number(p.lat.toFixed(6))]);
  if (coords.length > 0) coords.push(coords[0]);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          nombre: "Parcela Productiva TerraShift",
          area_hectareas: Number(parcelAreaHa.toFixed(3)),
          centroide: selectedCenter ? [selectedCenter.lng, selectedCenter.lat] : null,
          turno_riego_configurado: selIrrigationTurn.value,
          prioridad_productor: selPriority.value,
          fecha_relevamiento: new Date().toISOString()
        },
        geometry: {
          type: "Polygon",
          coordinates: [coords]
        }
      }
    ]
  };
}

// 1. MÓDULO FÍSICA DEL TERRENO (NASA SRTM + FAO GAEZ)
async function obtenerFisicaTerrenoSRTM(center, vertices) {
  const puntos = [center, ...vertices.slice(0, 6)];
  const locationsParam = puntos.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");

  let elevaciones = [];
  let fuenteDEM = "NASA SRTM 30m (Open-Elevation)";

  try {
    const res = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locationsParam}`);
    if (res.ok) {
      const data = await res.json();
      elevaciones = data.results.map((r) => r.elevation);
    }
  } catch (_) {
    fuenteDEM = "Modelo Topográfico Regional Estimado";
  }

  if (elevaciones.length === 0) {
    const isCuyo = center.lat < -28 && center.lat > -35 && center.lng < -66.5;
    elevaciones = puntos.map((_, i) => (isCuyo ? 635 + i * 0.4 : 180 + i * 1.2));
  }

  const altitudMedia = elevaciones.reduce((a, b) => a + b, 0) / elevaciones.length;
  const maxElev = Math.max(...elevaciones);
  const minElev = Math.min(...elevaciones);
  const desnivelM = maxElev - minElev;

  let maxDistM = 100;
  for (let i = 0; i < vertices.length; i++) {
    for (let j = i + 1; j < vertices.length; j++) {
      const d = vertices[i].distanceTo(vertices[j]);
      if (d > maxDistM) maxDistM = d;
    }
  }

  const pendientePct = Number(((desnivelM / maxDistM) * 100).toFixed(2));
  const posicionRelativa =
    elevaciones[0] <= altitudMedia - 0.8 ? "Bajo / Depresión (acumula aire frío)" : "Plano / Nivelado";

  return {
    fuente: fuenteDEM,
    altitud_msnm: Math.round(altitudMedia),
    desnivel_metros: Number(desnivelM.toFixed(1)),
    pendiente_porcentaje: pendientePct,
    microrelieve: posicionRelativa
  };
}

function clasificarEcorregionFAOGAEZ(center, lluviaAnual, srtm) {
  const { lat, lng } = center;

  if (lat >= -34.5 && lat <= -28.0 && lng >= -70.5 && lng <= -66.5 && lluviaAnual < 350) {
    return {
      codigo_gaez: "AEZ-ARID-IRR-CUYO",
      ecorregion: "Oasis Árido Bajo Riego (Monte / Cuyo - San Juan)",
      regimen_hidrico: "Riego Artificial Obligatorio (Turnos de Canal / Presurizado)",
      riesgo_dominante: "Salinización por ascenso capilar, heladas tardías en bajos y viento Zonda",
      ajuste_reglas: {
        umbral_salinidad_gwettop: 0.24,
        alerta_pendiente_pct: 3.0,
        bono_helada_bajo_c: srtm.microrelieve.includes("Bajo") ? -1.5 : 0
      }
    };
  }

  if (lat >= -28.5 && lat <= -25.0 && lng >= -56.5 && lng <= -53.5 && lluviaAnual > 1300) {
    return {
      codigo_gaez: "AEZ-SUBTROP-HUMID-MISIONES",
      ecorregion: "Ladera Subtropical Húmeda (Selva Paranaense - Misiones)",
      regimen_hidrico: "Secano Subtropical (> 1.500 mm/año)",
      riesgo_dominante: "Erosión hídrica laminar y en cárcavas por lluvia intensa en pendiente",
      ajuste_reglas: {
        umbral_salinidad_gwettop: 0.15,
        alerta_pendiente_pct: 4.5,
        bono_helada_bajo_c: 0
      }
    };
  }

  if (lat >= -39.0 && lat <= -31.0 && lng >= -64.5 && lng <= -57.0 && lluviaAnual >= 700) {
    return {
      codigo_gaez: "AEZ-TEMP-SUBHUMID-PAMPA",
      ecorregion: "Llanura Pampeana (Secano Extensivo)",
      regimen_hidrico: "Secano Templado con napa freática fluctuante",
      riesgo_dominante: "Anegamiento en bajos y pérdida de materia orgánica sin rotación",
      ajuste_reglas: {
        umbral_salinidad_gwettop: 0.20,
        alerta_pendiente_pct: 2.5,
        bono_helada_bajo_c: -0.5
      }
    };
  }

  return {
    codigo_gaez: lluviaAnual < 450 ? "AEZ-DRY-GENERIC" : "AEZ-HUMID-GENERIC",
    ecorregion: lluviaAnual < 450 ? "Zona Semiárida / Árida (FAO GAEZ)" : "Zona Subhúmeda / Húmeda (FAO GAEZ)",
    regimen_hidrico: lluviaAnual < 450 ? "Riego suplementario o integral" : "Secano",
    riesgo_dominante: srtm.pendiente_porcentaje > 5 ? "Escorrentía y erosión por pendiente" : "Estrés térmico/hídrico estacional",
    ajuste_reglas: {
      umbral_salinidad_gwettop: 0.22,
      alerta_pendiente_pct: 5.0,
      bono_helada_bajo_c: 0
    }
  };
}

// 2. MÓDULO REGISTRO HISTÓRICO 5 AÑOS
async function analizarHistorial5Anios(center) {
  const startYear = 2021;
  const endYear = 2025;
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${HISTORY_PARAMETERS.join(",")}&community=AG&longitude=${center.lng.toFixed(4)}&latitude=${center.lat.toFixed(4)}&start=${startYear}&end=${endYear}&format=JSON`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Error historial 5 años HTTP ${res.status}`);
  const data = await res.json();
  const p = data.properties.parameter;

  const anios = [2021, 2022, 2023, 2024, 2025];
  const resumenAnual = [];

  anios.forEach((yr) => {
    let mesesSueloDesnudo = [];
    let sumaIndiceSalinizacion = 0;
    let mesesValidos = 0;

    for (let m = 1; m <= 12; m++) {
      const key = `${yr}${String(m).padStart(2, "0")}`;
      const gwetTop = p.GWETTOP?.[key];
      const gwetRoot = p.GWETROOT?.[key];
      const ts = p.TS?.[key];
      const evland = p.EVLAND?.[key];

      if (gwetTop === undefined || gwetTop === -999) continue;
      mesesValidos++;

      const esSueloDesnudo = (gwetTop < 0.24 && ts > 22) || (gwetTop < 0.20 && evland > 1.2);
      if (esSueloDesnudo) {
        mesesSueloDesnudo.push(MESES_ES[m - 1]);
      }

      const gradienteHumedad = Math.max(0, (gwetRoot || 0.3) - gwetTop);
      const indiceMes = gradienteHumedad * (evland || 1) * 10;
      sumaIndiceSalinizacion += indiceMes;
    }

    const indiceSalAnual = mesesValidos > 0 ? Number((sumaIndiceSalinizacion / mesesValidos).toFixed(2)) : 0;

    resumenAnual.push({
      anio: yr,
      meses_desnudo_count: mesesSueloDesnudo.length,
      ventanas_desnudo: mesesSueloDesnudo,
      indice_salinizacion: indiceSalAnual
    });
  });

  const promInicial = (resumenAnual[0].indice_salinizacion + resumenAnual[1].indice_salinizacion) / 2;
  const promReciente = (resumenAnual[3].indice_salinizacion + resumenAnual[4].indice_salinizacion) / 2;
  const deltaSal = promInicial > 0 ? ((promReciente - promInicial) / promInicial) * 100 : 0;

  let tendenciaSalinizacion = "Estable";
  if (deltaSal > 12) tendenciaSalinizacion = `En Aumento (+${deltaSal.toFixed(0)}%)`;
  else if (deltaSal < -12) tendenciaSalinizacion = `En Retroceso (${deltaSal.toFixed(0)}%)`;

  const promedioMesesDesnudo = (
    resumenAnual.reduce((acc, r) => acc + r.meses_desnudo_count, 0) / resumenAnual.length
  ).toFixed(1);

  return {
    periodo: "2021–2025 (60 meses)",
    promedio_meses_suelo_desnudo_anio: Number(promedioMesesDesnudo),
    tendencia_salinizacion: tendenciaSalinizacion,
    detalle_anual: resumenAnual
  };
}

// 3. MÓDULO SINCRONIZACIÓN CON TURNOS DE RIEGO (2 FASES: NATURAL + ARTIFICIAL) Y ROTACIÓN SIMBIÓTICA
function calcularSincronizacionHidricaYRotacion(valoresClim, turnoSeleccionado, prioridad, gaez, hist) {
  const lluviaAnual = valoresClim.PRECTOTCORR_SUM?.ANN ?? 0;
  const evlandDia = valoresClim.EVLAND?.ANN ?? 1.5;
  const evapAnualAprox = Math.round(evlandDia * 365);
  const balanceNatural = Math.round(lluviaAnual - evapAnualAprox);
  const gwetRoot = valoresClim.GWETROOT?.ANN ?? 0.35;

  const mapTurnos = {
    secano: { label: "Sin riego artificial (100% Secano)", diasIntervalo: 99, laminaMm: 0 },
    canal_21: { label: "Turno de canal cada 21 días", diasIntervalo: 21, laminaMm: 95 },
    canal_15: { label: "Turno de canal cada 15 días", diasIntervalo: 15, laminaMm: 85 },
    canal_8: { label: "Turno de canal cada 7–10 días", diasIntervalo: 8, laminaMm: 65 },
    goteo: { label: "Riego presurizado / Goteo continuo", diasIntervalo: 2, laminaMm: 35 }
  };

  const configTurno = mapTurnos[turnoSeleccionado] || mapTurnos.canal_15;

  // Fase 1: Disponibilidad Hídrica Natural (Lluvias NASA POWER)
  const fase1Natural = {
    lluvia_anual_mm: lluviaAnual,
    evaporacion_directa_anual_mm: evapAnualAprox,
    deficit_natural_mm: balanceNatural,
    diagnostico:
      lluviaAnual < 350
        ? `Aporte pluvial insuficiente (${lluviaAnual} mm/año frente a ~${evapAnualAprox} mm/año de evaporación potencial). La Fase Natural no sostiene cultivos comerciales sin riego.`
        : lluviaAnual < 700
        ? `Aporte pluvial estacional (${lluviaAnual} mm/año). Permite cultivos invernales de cobertura en secano, pero requiere riego suplementario en verano.`
        : `Recarga pluvial abundante (${lluviaAnual} mm/año). Fase Natural autosuficiente para rotaciones de secano.`
  };

  // Fase 2: Disponibilidad Hídrica Artificial (Turnos de Riego)
  const demandaEntreTurnosMm = Number((evlandDia * Math.min(configTurno.diasIntervalo, 30)).toFixed(1));
  const esCompatibleSecano = turnoSeleccionado === "secano" && lluviaAnual >= 650;

  const fase2Artificial = {
    sistema: configTurno.label,
    intervalo_dias: configTurno.diasIntervalo,
    demanda_evaporativa_entre_turnos_mm: demandaEntreTurnosMm,
    diagnostico:
      turnoSeleccionado === "secano"
        ? esCompatibleSecano
          ? "Sin riego artificial: viable por alta recarga pluvial (Fase 1)."
          : "CRÍTICO: Sin riego artificial en zona árida/semiárida (<650 mm); solo sobreviven especies xerófitas o coberturas de invierno."
        : `Entre turnos de ${configTurno.diasIntervalo} días el suelo pierde ~${demandaEntreTurnosMm} mm por evaporación directa; la batería radicular actual (GWETROOT ${gwetRoot}) exige cultivos que toleren ese intervalo sin estrés.`
  };

  // Filtrar cultivos incompatibles según Fase 1 + Fase 2
  const compatibles = [];
  const descartados = [];

  CROP_KNOWLEDGE_BASE.forEach((crop) => {
    if (crop.requiereSecanoMm && lluviaAnual < crop.requiereSecanoMm && turnoSeleccionado === "secano") {
      descartados.push(`${crop.nombre} (exige >${crop.requiereSecanoMm} mm de lluvia)`);
      return;
    }
    if (turnoSeleccionado !== "secano" && crop.intervaloMaxDias < configTurno.diasIntervalo) {
      descartados.push(
        `${crop.nombre} (requiere riego cada ≤${crop.intervaloMaxDias} días; incompatible con turno cada ${configTurno.diasIntervalo} días)`
      );
      return;
    }
    if (turnoSeleccionado === "secano" && !crop.requiereSecanoMm && lluviaAnual < 450 && crop.intervaloMaxDias < 25) {
      descartados.push(`${crop.nombre} (inviable sin turno de riego en régimen árido)`);
      return;
    }
    compatibles.push(crop);
  });

  // Armar rotación simbiótica encadenada (3 etapas preparándose entre sí)
  const hayRiesgoSalino = hist.tendencia_salinizacion.includes("Aumento") || (valoresClim.GWETTOP?.ANN ?? 0) < 0.24;

  const rotacionEncadenada = [
    {
      etapa: "Fase A · Otoño / Invierno (Puente Verde)",
      especie: "Consorcio Vicia villosa + Centeno forrajero",
      preparacion:
        "Aprovecha la menor evaporación invernal (EVLAND mínimo) para cubrir el suelo desnudo, fijar 60–90 kg/ha de Nitrógeno biológico y bloquear el ascenso capilar de sales."
    },
    {
      etapa: "Fase B · Primavera / Verano (Cultivo Principal)",
      especie:
        configTurno.diasIntervalo <= 8
          ? "Tomate / Hortícola comercial sobre rastrojo rolado"
          : configTurno.diasIntervalo <= 15
          ? "Zapallo Anco o Cebada/Sorgo de alta eficiencia hídrica"
          : "Sorgo granífero o Melón rústico adaptado a turnos largos",
      preparacion:
        "Se siembra directamente sobre la cobertura muerta de Vicia+Centeno, reduciendo un 30% la pérdida de agua entre turnos de riego y aprovechando el nitrógeno fijado."
    },
    {
      etapa: "Fase C · Consolidación Radicular / Desalinización",
      especie: hayRiesgoSalino || prioridad === "regeneracion" ? "Alfalfa perenne pivotante (2–3 ciclos)" : "Avena + Melilotus (descompactación)",
      preparacion:
        "Sus raíces profundas abren bioporos verticales, mejoran la infiltración del próximo turno de canal y lavan sales fuera de los primeros 50 cm."
    }
  ];

  return {
    fase_1_natural: fase1Natural,
    fase_2_artificial: fase2Artificial,
    prioridad_aplicada: prioridad,
    cultivos_compatibles: compatibles.map((c) => c.nombre),
    cultivos_descartados: descartados,
    rotacion_simbiotica: rotacionEncadenada
  };
}

// 4. MÓDULO EXPLICABILIDAD Y TRANSPARENCIA (3 ESTRATEGIAS LADO A LADO)
function construirComparativaEstrategias(data, syncHidrica) {
  const v = data.valores_climatologicos;
  const srtm = data.fisica_terreno_srtm;
  const gaez = data.contexto_regional_gaez;
  const hist = data.historial_satelital_5_anios;

  const lluvia = v.PRECTOTCORR_SUM?.ANN ?? 0;
  const gwetTop = v.GWETTOP?.ANN ?? 0;
  const gwetRoot = v.GWETROOT?.ANN ?? 0;
  const tsMax = v.TS_MAX?.ANN ?? 0;
  const par = v.ALLSKY_SFC_PAR_TOT?.ANN ?? 0;

  return [
    {
      dimension: "Manejo del Suelo y Cobertura",
      linea_base: "Barbecho desnudo entre cosechas y labranza convencional periódica.",
      adaptacion_hidrica: "Mulch inerte o rastrojo picado en surco para reducir evaporación entre turnos de agua.",
      regeneracion_simbiotica: "Cobertura viva permanente (Vicia + Centeno en invierno) encadenada al cultivo de renta.",
      evidencia_nasa: `GWETTOP=${gwetTop} vs GWETROOT=${gwetRoot} · Historial 2021–2025: ${hist.promedio_meses_suelo_desnudo_anio} meses/año desnudo.`
    },
    {
      dimension: "Gestión del Agua (2 Fases)",
      linea_base: "Riego por calendario fijo ignorando demanda atmosférica y lluvia efectiva.",
      adaptacion_hidrica: `Sincronización estricta con ${syncHidrica.fase_2_artificial.sistema} y descarte de cultivos sensibles.`,
      regeneracion_simbiotica: "Infiltración biológica profunda (raíces pivotantes) + aprovechamiento de lluvia invernal en cobertura.",
      evidencia_nasa: `PRECTOTCORR_SUM=${lluvia} mm/año · EVLAND=${v.EVLAND?.ANN ?? "-"} mm/día (${gaez.codigo_gaez}).`
    },
    {
      dimension: "Control Térmico y Salinidad",
      linea_base: "Alta exposición solar directa sobre suelo mineral; ascenso capilar de sales en verano.",
      adaptacion_hidrica: "Riegos de lavado puntuales y programación de siembra fuera de ventanas de heladas.",
      regeneracion_simbiotica: "Sombreado vivo (amortigua TS_MAX) y bombeo biológico radicular que frena salinización.",
      evidencia_nasa: `TS_MAX=${tsMax} °C · T2M_MIN Sep/Oct=${v.T2M_MIN?.SEP ?? "-"}°/${v.T2M_MIN?.OCT ?? "-"}° · Tendencia salina: ${hist.tendencia_salinizacion}.`
    },
    {
      dimension: "Balance Energético y Topográfico",
      linea_base: "Surcos trazados sin considerar pendiente ni radiación fotosintética invernal.",
      adaptacion_hidrica: "Nivelación láser y orientación de surcos según viento dominante y pendiente.",
      regeneracion_simbiotica: "Captura de radiación PAR todo el año para generar biomasa y materia orgánica in situ.",
      evidencia_nasa: `ALLSKY_SFC_PAR_TOT=${par} MJ/m²/día · SRTM: ${srtm.altitud_msnm} m s.n.m., pendiente ${srtm.pendiente_porcentaje}%.`
    }
  ];
}

btnFetch.addEventListener("click", async () => {
  if (!selectedCenter || polygonVertices.length < 3) return;

  btnFetch.disabled = true;
  statusBadge.textContent = "Cruzando NASA POWER + SRTM + Turnos de Riego...";
  resultsContainer.innerHTML = `<div class="empty-state"><h2>Ejecutando motor agroclimático, hídrico y topográfico...</h2><p>Sincronizando Fase Natural (lluvias), Fase Artificial (${selIrrigationTurn.options[selIrrigationTurn.selectedIndex].text}), historial 2021–2025 y SRTM para ${parcelAreaHa.toFixed(2)} ha.</p></div>`;

  try {
    const climatologyUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${CORE_PARAMETERS.join(",")}&community=AG&longitude=${selectedCenter.lng.toFixed(4)}&latitude=${selectedCenter.lat.toFixed(4)}&format=JSON`;

    const [climRes, historial5Anios, fisicaSRTM] = await Promise.all([
      fetch(climatologyUrl).then((r) => {
        if (!r.ok) throw new Error(`NASA POWER HTTP ${r.status}`);
        return r.json();
      }),
      analizarHistorial5Anios(selectedCenter),
      obtenerFisicaTerrenoSRTM(selectedCenter, polygonVertices)
    ]);

    const valoresClim = climRes.properties.parameter;
    const lluviaAnual = valoresClim.PRECTOTCORR_SUM?.ANN ?? 0;
    const contextoGAEZ = clasificarEcorregionFAOGAEZ(selectedCenter, lluviaAnual, fisicaSRTM);

    const sincronizacionHidrica = calcularSincronizacionHidricaYRotacion(
      valoresClim,
      selIrrigationTurn.value,
      selPriority.value,
      contextoGAEZ,
      historial5Anios
    );

    lastMergedData = {
      parcela_geojson: construirGeoJSON(),
      sincronizacion_turnos_riego: sincronizacionHidrica,
      fisica_terreno_srtm: fisicaSRTM,
      contexto_regional_gaez: contextoGAEZ,
      historial_satelital_5_anios: historial5Anios,
      fuente_nasa: climRes.header,
      metadatos_oficiales: climRes.parameters,
      valores_climatologicos: valoresClim
    };

    lastMergedData.comparativa_estrategias = construirComparativaEstrategias(lastMergedData, sincronizacionHidrica);

    statusBadge.textContent = `✓ Sincronizado (${sincronizacionHidrica.fase_2_artificial.sistema.split("(")[0].trim()})`;
    btnDownloadJSON.disabled = false;
    btnFetch.disabled = false;

    renderResults(lastMergedData, "");
  } catch (error) {
    console.error(error);
    statusBadge.textContent = "Error al consultar servicios satelitales";
    btnFetch.disabled = false;
    resultsContainer.innerHTML = `<div class="empty-state"><h2>Error de conexión</h2><p>${error.message}. Verificá tu conexión e intentá nuevamente.</p></div>`;
  }
});

function generarConclusionesAgronomicas(data) {
  const v = data.valores_climatologicos;
  const srtm = data.fisica_terreno_srtm;
  const gaez = data.contexto_regional_gaez;
  const hist = data.historial_satelital_5_anios;
  const sync = data.sincronizacion_turnos_riego;
  const insights = [];

  // 1. Sincronización en 2 fases
  insights.push({
    tipo: sync.cultivos_descartados.length > 2 ? "warn" : "ok",
    texto: `💧 Balance Hídrico en 2 Fases: Fase Natural aporta ${sync.fase_1_natural.lluvia_anual_mm} mm/año (déficit ${sync.fase_1_natural.deficit_natural_mm} mm/año) y Fase Artificial opera bajo "${sync.fase_2_artificial.sistema}". Se filtraron ${sync.cultivos_descartados.length} cultivo(s) incompatibles con este intervalo.`
  });

  // 2. Regla Física Regional (SRTM + FAO GAEZ)
  if (srtm.pendiente_porcentaje > gaez.ajuste_reglas.alerta_pendiente_pct) {
    insights.push({
      tipo: "danger",
      texto: `⛰️ Alerta Topográfica SRTM (${srtm.pendiente_porcentaje}% de pendiente a ${srtm.altitud_msnm} m s.n.m.): Supera el umbral seguro para ${gaez.ecorregion}. Obligatorio labranza en curvas de nivel y cobertura viva permanente.`
    });
  } else {
    insights.push({
      tipo: "ok",
      texto: `📐 Relieve Favorable (${srtm.pendiente_porcentaje}% pendiente · ${srtm.altitud_msnm} m s.n.m. · ${srtm.microrelieve}): Calibrado bajo perfil ${gaez.codigo_gaez}.`
    });
  }

  // 3. Registro Histórico 5 Años
  if (hist.promedio_meses_suelo_desnudo_anio >= 4) {
    insights.push({
      tipo: "danger",
      texto: `🛰️ Registro Histórico 2021–2025: El lote permaneció con suelo desnudo un promedio de ${hist.promedio_meses_suelo_desnudo_anio} meses/año. Tendencia de salinización: ${hist.tendencia_salinizacion}.`
    });
  } else {
    insights.push({
      tipo: "ok",
      texto: `🌱 Cobertura Histórica Estable (2021–2025): Solo ${hist.promedio_meses_suelo_desnudo_anio} meses/año de exposición desnuda. Tendencia salina: ${hist.tendencia_salinizacion}.`
    });
  }

  // 4. Heladas tardías ajustadas por microrelieve SRTM
  const ajusteFrio = gaez.ajuste_reglas.bono_helada_bajo_c;
  const tMinSep = Number(((v.T2M_MIN?.SEP ?? 5) + ajusteFrio).toFixed(1));
  const tMinOct = Number(((v.T2M_MIN?.OCT ?? 5) + ajusteFrio).toFixed(1));
  if (tMinSep < 0.5 || tMinOct < 1.5) {
    insights.push({
      tipo: "warn",
      texto: `❄️ Riesgo de Heladas Tardías Ajustado por Relieve (${srtm.microrelieve}): Mínimas estimadas de ${tMinSep} °C en septiembre y ${tMinOct} °C en octubre.`
    });
  }

  return insights;
}

function renderResults(data, filterText) {
  const term = filterText.toLowerCase().trim();
  const grouped = {};

  CORE_PARAMETERS.forEach((code) => {
    const vals = data.valores_climatologicos[code];
    if (!vals) return;

    const meta = data.metadatos_oficiales[code] || { units: "" };
    const infoEs = PARAM_DICTIONARY[code] || {
      categoria: "📊 Otros Indicadores",
      titulo: code,
      explicacion: meta.longname || ""
    };

    if (
      term &&
      !code.toLowerCase().includes(term) &&
      !infoEs.titulo.toLowerCase().includes(term) &&
      !infoEs.explicacion.toLowerCase().includes(term)
    ) {
      return;
    }

    if (!grouped[infoEs.categoria]) grouped[infoEs.categoria] = [];
    grouped[infoEs.categoria].push({ code, meta, infoEs, vals });
  });

  resultsContainer.innerHTML = "";

  if (!term) {
    const srtm = data.fisica_terreno_srtm;
    const gaez = data.contexto_regional_gaez;
    const hist = data.historial_satelital_5_anios;
    const sync = data.sincronizacion_turnos_riego;

    // 1. MÓDULO SINCRONIZACIÓN CON TURNOS DE RIEGO (2 FASES) + ROTACIÓN SIMBIÓTICA
    const irrigationSection = document.createElement("section");
    irrigationSection.className = "module-box irrigation";
    irrigationSection.innerHTML = `
      <h2>
        <span>💧 Sincronización Hídrica en 2 Fases & Rotación Simbiótica</span>
        <span class="tag-pill blue">${sync.fase_2_artificial.sistema}</span>
      </h2>
      <div class="kpi-row-2">
        <div class="kpi-mini">
          <span>Fase 1 · Riego Natural (Lluvias NASA POWER)</span>
          <strong>${sync.fase_1_natural.lluvia_anual_mm} mm/año (Balance: ${sync.fase_1_natural.deficit_natural_mm} mm)</strong>
          <p>${sync.fase_1_natural.diagnostico}</p>
        </div>
        <div class="kpi-mini">
          <span>Fase 2 · Riego Artificial (Infraestructura / Turnos)</span>
          <strong>Demanda entre turnos: ~${sync.fase_2_artificial.demanda_evaporativa_entre_turnos_mm} mm</strong>
          <p>${sync.fase_2_artificial.diagnostico}</p>
        </div>
      </div>

      ${
        sync.cultivos_descartados.length > 0
          ? `<div class="filtered-out-box"><strong>🚫 Cultivos descartados por incompatibilidad hídrica:</strong> ${sync.cultivos_descartados.join(" · ")}</div>`
          : ""
      }

      <div class="rotation-chain">
        ${sync.rotacion_simbiotica
          .map(
            (step) => `
          <div class="rotation-step">
            <span class="step-season">${step.etapa}</span>
            <div class="step-crop">${step.especie}</div>
            <div class="step-synergy">${step.preparacion}</div>
          </div>
        `
          )
          .join("")}
      </div>
    `;
    resultsContainer.appendChild(irrigationSection);

    // 2. MÓDULO EXPLICABILIDAD Y TRANSPARENCIA (3 ESTRATEGIAS LADO A LADO)
    const transparencySection = document.createElement("section");
    transparencySection.className = "module-box transparency";
    transparencySection.innerHTML = `
      <h2>
        <span>⚖️ Explicabilidad y Transparencia · Comparativa de 3 Estrategias</span>
        <span class="tag-pill green">Evidencia Satelital Trazable</span>
      </h2>
      <div class="strategy-table-wrap">
        <table class="strategy-table">
          <thead>
            <tr>
              <th>Dimensión</th>
              <th class="col-base">1. Línea Base (Convencional)</th>
              <th class="col-water">2. Adaptación Hídrica (Por Turnos)</th>
              <th class="col-regen">3. Regeneración Simbiótica (Recomendada)</th>
            </tr>
          </thead>
          <tbody>
            ${data.comparativa_estrategias
              .map(
                (row) => `
              <tr>
                <td class="row-label">
                  ${row.dimension}
                  <br/><span class="nasa-cite">${row.evidencia_nasa}</span>
                </td>
                <td>${row.linea_base}</td>
                <td>${row.adaptacion_hidrica}</td>
                <td><strong>${row.regeneracion_simbiotica}</strong></td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="disclaimer-box">
        <strong>⚠️ Transparencia Metodológica y Límites de Resolución Espacial:</strong> Los indicadores agroclimáticos de <strong>NASA POWER</strong> poseen una grilla nativa regional (~0.5° × 0.625°, equivalente a ~50 km), mientras que el modelo de elevación <strong>NASA SRTM</strong> opera a 30 metros por píxel. Estas métricas representan el comportamiento mesoclimático y topográfico de referencia, pero <strong>no reemplazan el muestreo físico intraparcelario</strong> (conductividad eléctrica real CEe, textura por horizontes, aforo de caudal en compuerta ni calidad química del agua de riego). <strong>Validar toda prescripción de siembra y lámina de lavado con un ingeniero agrónomo local matriculado.</strong>
      </div>
    `;
    resultsContainer.appendChild(transparencySection);

    // 3. MÓDULO FÍSICA SRTM/FAO GAEZ + HISTORIAL SATELITAL 5 AÑOS
    const dualGrid = document.createElement("div");
    dualGrid.className = "dual-module-grid";
    dualGrid.innerHTML = `
      <section class="module-box srtm">
        <h2>
          <span>🏔️ Física del Terreno (SRTM + FAO GAEZ)</span>
          <span class="tag-pill">${gaez.codigo_gaez}</span>
        </h2>
        <div class="kpi-row">
          <div class="kpi-mini"><span>Altitud Media</span><strong>${srtm.altitud_msnm} m s.n.m.</strong></div>
          <div class="kpi-mini"><span>Pendiente Lote</span><strong>${srtm.pendiente_porcentaje}% (${srtm.desnivel_metros} m)</strong></div>
          <div class="kpi-mini"><span>Área Delimitada</span><strong>${parcelAreaHa.toFixed(2)} ha</strong></div>
        </div>
        <div style="font-size:0.8rem; color:var(--text); line-height:1.4;">
          <strong>Ecorregión:</strong> ${gaez.ecorregion}<br/>
          <span style="color:var(--muted);"><strong>Riesgo Regional:</strong> ${gaez.riesgo_dominante}</span>
        </div>
      </section>

      <section class="module-box history">
        <h2>
          <span>🛰️ Registro Histórico 5 Años (2021–2025)</span>
          <span class="tag-pill" style="color:var(--amber); border-color:rgba(245,158,11,0.4); background:rgba(245,158,11,0.12);">${hist.tendencia_salinizacion}</span>
        </h2>
        <div class="timeline-years">
          ${hist.detalle_anual
            .map(
              (y) => `
            <div class="year-card" title="Meses desnudo: ${y.ventanas_desnudo.join(", ") || "Ninguno"}">
              <span class="yr">${y.anio}</span>
              <span class="bare-months">${y.meses_desnudo_count}m</span>
              <span style="font-size:0.64rem; color:var(--muted);">desnudo</span>
              <span class="sal-idx">Sal: ${y.indice_salinizacion}</span>
            </div>
          `
            )
            .join("")}
        </div>
        <div style="font-size:0.76rem; color:var(--muted);">
          Ventanas críticas recientes (2025): <strong style="color:var(--text);">${
            hist.detalle_anual[4].ventanas_desnudo.join(", ") || "Cobertura continua"
          }</strong>
        </div>
      </section>
    `;
    resultsContainer.appendChild(dualGrid);

    // 4. DIAGNÓSTICO CALIBRADO
    const insights = generarConclusionesAgronomicas(data);
    if (insights.length > 0) {
      const banner = document.createElement("section");
      banner.className = "insights-banner";
      banner.innerHTML = `
        <h2>🧠 Diagnóstico Calibrado por Ecorregión, Turno de Agua y Relieve</h2>
        <div class="insight-list">
          ${insights
            .map((i) => `<div class="insight-item ${i.tipo === "ok" ? "ok" : i.tipo === "danger" ? "danger" : ""}">${i.texto}</div>`)
            .join("")}
        </div>
      `;
      resultsContainer.appendChild(banner);
    }
  }

  // 5. GRILLA DE 15 VARIABLES NASA POWER
  Object.entries(grouped).forEach(([categoria, items]) => {
    const section = document.createElement("section");
    section.className = "category-section";
    section.innerHTML = `<h3>${categoria} (${items.length})</h3>`;

    const grid = document.createElement("div");
    grid.className = "param-grid";

    items.forEach(({ code, meta, infoEs, vals }) => {
      const annVal = vals.ANN !== undefined && vals.ANN !== -999 ? vals.ANN : "N/D";
      const unitLabel = code === "PRECTOTCORR_SUM" ? "mm/año" : meta.units;

      const monthsHTML = MESES.map((m, idx) => {
        const v = vals[m] !== undefined && vals[m] !== -999 ? vals[m] : "-";
        return `<div class="month-cell"><span>${MESES_ES[idx]}</span><strong>${v}</strong></div>`;
      }).join("");

      const card = document.createElement("div");
      card.className = "param-card";
      card.innerHTML = `
        <div class="param-top">
          <div>
            <span class="param-code">${code}</span>
            <div class="param-title">${infoEs.titulo}</div>
          </div>
          <span class="param-ann">${annVal} <small class="param-unit">${unitLabel}</small></span>
        </div>
        <div class="param-desc">${infoEs.explicacion}</div>
        <div class="months-strip">${monthsHTML}</div>
      `;
      grid.appendChild(card);
    });

    section.appendChild(grid);
    resultsContainer.appendChild(section);
  });

  // 6. PAYLOAD JSON COMPLETO
  const rawSection = document.createElement("section");
  rawSection.className = "category-section";
  rawSection.innerHTML = `
    <h3>🧾 Payload Completo (GeoJSON + Turnos 2 Fases + Comparativa + SRTM + NASA POWER)</h3>
    <pre class="raw-json">${JSON.stringify(data, null, 2)}</pre>
  `;
  resultsContainer.appendChild(rawSection);
}

filterInput.addEventListener("input", (e) => {
  if (lastMergedData) {
    renderResults(lastMergedData, e.target.value);
  }
});

// Recalcular dinámicamente si el productor cambia su turno de riego o prioridad tras analizar
[selIrrigationTurn, selPriority].forEach((el) => {
  el.addEventListener("change", () => {
    if (!lastMergedData) return;
    const sync = calcularSincronizacionHidricaYRotacion(
      lastMergedData.valores_climatologicos,
      selIrrigationTurn.value,
      selPriority.value,
      lastMergedData.contexto_regional_gaez,
      lastMergedData.historial_satelital_5_anios
    );
    lastMergedData.sincronizacion_turnos_riego = sync;
    lastMergedData.comparativa_estrategias = construirComparativaEstrategias(lastMergedData, sync);
    renderResults(lastMergedData, filterInput.value);
  });
});

btnDownloadGeoJSON.addEventListener("click", () => {
  if (polygonVertices.length < 3) return;
  const geojson = construirGeoJSON();
  const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `parcela-terrashift-${selectedCenter.lat.toFixed(4)}_${selectedCenter.lng.toFixed(4)}.geojson`;
  a.click();
  URL.revokeObjectURL(url);
});

btnDownloadJSON.addEventListener("click", () => {
  if (!lastMergedData) return;
  const blob = new Blob([JSON.stringify(lastMergedData, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `terrashift-reporte-completo-${selectedCenter.lat.toFixed(3)}_${selectedCenter.lng.toFixed(3)}.json`;
  a.click();
  URL.revokeObjectURL(url);
});
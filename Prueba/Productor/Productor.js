const CORE_PARAMETERS = [
  "GWETROOT", "GWETTOP", "TS_MAX", "T2M_MIN",
  "PRECTOTCORR_SUM", "EVLAND", "WS2M_MAX", "ALLSKY_SFC_PAR_TOT"
];
const HISTORY_PARAMETERS = ["GWETTOP", "GWETROOT", "TS", "EVLAND"];
const MESES = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MESES_CORTOS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

// Catálogo en lenguaje claro para el productor
const CULTIVOS_CAMPO = [
  {
    nombre: "Tomate o pimiento de verano",
    maxDiasSinAgua: 8,
    motivoOk: "Tenés agua seguida para que no aborte la flor con el calor.",
    motivoNo: "Necesita agua cada 7-8 días; con tu turno más largo se va a estresar y perder rinde."
  },
  {
    nombre: "Verduras de hoja (lechuga, acelga, espinaca)",
    maxDiasSinAgua: 6,
    motivoOk: "Tu riego mantiene húmeda la capa de arriba donde están sus raíces.",
    motivoNo: "Sus raíces son muy cortitas: si pasan más de una semana sin riego, se queman."
  },
  {
    nombre: "Zapallo anco, melón o sandía",
    maxDiasSinAgua: 15,
    motivoOk: "Aguanta bien turnos de 15 días si cubrís el surco para guardar humedad.",
    motivoNo: "Sin riego ni lluvias suficientes en verano le falta agua para llenar el fruto."
  },
  {
    nombre: "Alfalfa (pastura perenne)",
    maxDiasSinAgua: 18,
    motivoOk: "Sus raíces bajan hondo, buscan agua guardada y mejoran la tierra.",
    motivoNo: "En secano muy seco necesita al menos riegos de apoyo para implantarse."
  },
  {
    nombre: "Vicia + Centeno (cultivo de cobertura en invierno)",
    maxDiasSinAgua: 25,
    motivoOk: "Crece con poca agua en invierno, tapa la tierra y le deja abono natural gratis.",
    motivoNo: "Ideal casi siempre para proteger el suelo en los meses fríos."
  },
  {
    nombre: "Sorgo o cebada forrajera",
    maxDiasSinAgua: 21,
    motivoOk: "Muy rústico: rinde bien incluso cuando los turnos de canal vienen largos.",
    motivoNo: "Requiere al menos humedad inicial para nacer."
  },
  {
    nombre: "Maíz o soja de secano (solo con lluvia)",
    maxDiasSinAgua: 99,
    requiereLluviaMm: 650,
    motivoOk: "Las lluvias de tu zona alcanzan para llevarlo sin riego artificial.",
    motivoNo: "En tu zona llueve poco (<650 mm): sin riego se seca antes de dar grano."
  }
];

// Mapa centrado por defecto en zona agrícola de San Juan
const map = L.map("map").setView([-31.6874, -68.5955], 14);
L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
  attribution: "Imágenes Satelitales Esri",
  maxZoom: 19
}).addTo(map);
L.tileLayer("https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {
  maxZoom: 19
}).addTo(map);

let vertices = [];
let markers = [];
let polygon = null;
let center = null;
let areaHa = 0;

const lblStatus = document.getElementById("lbl-parcel-status");
const lblArea = document.getElementById("lbl-area");
const lblPoints = document.getElementById("lbl-points");
const btnUndo = document.getElementById("btn-undo");
const btnReset = document.getElementById("btn-reset");
const btnAnalyze = document.getElementById("btn-analyze");
const selTurn = document.getElementById("sel-turn");
const selGoal = document.getElementById("sel-goal");
const storyResults = document.getElementById("story-results");

function calcularHectareas(pts) {
  if (pts.length < 3) return 0;
  const R = 6378137;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const p1 = pts[i];
    const p2 = pts[(i + 1) % pts.length];
    area += ((p2.lng - p1.lng) * Math.PI / 180) *
      (2 + Math.sin(p1.lat * Math.PI / 180) + Math.sin(p2.lat * Math.PI / 180));
  }
  return Math.abs((area * R * R) / 2) / 10000;
}

function refrescarMapa() {
  markers.forEach((m) => map.removeLayer(m));
  markers = [];
  if (polygon) {
    map.removeLayer(polygon);
    polygon = null;
  }

  vertices.forEach((pt, idx) => {
    const m = L.circleMarker(pt, {
      radius: idx === 0 ? 8 : 6,
      color: "#ffffff",
      weight: 2,
      fillColor: idx === 0 ? "#0284c7" : "#15803d",
      fillOpacity: 1
    }).addTo(map);
    markers.push(m);
  });

  lblPoints.textContent = vertices.length;
  btnUndo.disabled = vertices.length === 0;

  if (vertices.length >= 3) {
    polygon = L.polygon(vertices, {
      color: "#22c55e",
      weight: 3,
      fillColor: "#22c55e",
      fillOpacity: 0.28
    }).addTo(map);

    center = polygon.getBounds().getCenter();
    areaHa = calcularHectareas(vertices);
    lblArea.textContent = `${areaHa.toFixed(2)} ha`;
    lblStatus.textContent = `✅ Lote listo (${areaHa.toFixed(2)} ha)`;
    btnAnalyze.disabled = false;
  } else {
    center = null;
    areaHa = 0;
    lblArea.textContent = "0.00 ha";
    btnAnalyze.disabled = true;
    lblStatus.textContent =
      vertices.length === 0
        ? "Tocá las esquinas de tu finca"
        : `Marcá ${3 - vertices.length} esquina(s) más`;
  }
}

map.on("click", (e) => {
  vertices.push(e.latlng);
  refrescarMapa();
});

btnUndo.addEventListener("click", () => {
  vertices.pop();
  refrescarMapa();
});

btnReset.addEventListener("click", () => {
  vertices = [];
  refrescarMapa();
  storyResults.classList.add("hidden");
});

// Consultar elevación SRTM
async function obtenerRelieve(c, pts) {
  const sample = [c, ...pts.slice(0, 5)];
  const locs = sample.map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`).join("|");
  try {
    const r = await fetch(`https://api.open-elevation.com/api/v1/lookup?locations=${locs}`);
    if (r.ok) {
      const d = await r.json();
      const elevs = d.results.map((x) => x.elevation);
      const avg = Math.round(elevs.reduce((a, b) => a + b, 0) / elevs.length);
      const diff = Math.max(...elevs) - Math.min(...elevs);
      let maxDist = 100;
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          maxDist = Math.max(maxDist, pts[i].distanceTo(pts[j]));
        }
      }
      const slope = Number(((diff / maxDist) * 100).toFixed(1));
      return { altitud: avg, pendiente: slope, esBajo: elevs[0] <= avg - 0.8 };
    }
  } catch (_) {}
  return { altitud: 635, pendiente: 0.8, esBajo: false };
}

// Consultar historial 5 años
async function obtenerHistorial5Anios(c) {
  const url = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${HISTORY_PARAMETERS.join(",")}&community=AG&longitude=${c.lng.toFixed(4)}&latitude=${c.lat.toFixed(4)}&start=2021&end=2025&format=JSON`;
  const res = await fetch(url);
  const json = await res.json();
  const p = json.properties.parameter;

  const anios = [2021, 2022, 2023, 2024, 2025];
  const detalle = anios.map((yr) => {
    let desnudo = 0;
    let salSum = 0;
    for (let m = 1; m <= 12; m++) {
      const k = `${yr}${String(m).padStart(2, "0")}`;
      const top = p.GWETTOP?.[k] ?? 0.3;
      const root = p.GWETROOT?.[k] ?? 0.3;
      const ts = p.TS?.[k] ?? 20;
      const ev = p.EVLAND?.[k] ?? 1;
      if ((top < 0.24 && ts > 22) || (top < 0.20 && ev > 1.2)) desnudo++;
      salSum += Math.max(0, root - top) * ev * 10;
    }
    return { anio: yr, mesesDesnudo: desnudo, indiceSal: Number((salSum / 12).toFixed(2)) };
  });

  const promDesnudo = (detalle.reduce((a, b) => a + b.mesesDesnudo, 0) / 5).toFixed(1);
  const subeSal = detalle[4].indiceSal > detalle[0].indiceSal * 1.1;
  return { detalle, promDesnudo: Number(promDesnudo), subeSal };
}

btnAnalyze.addEventListener("click", async () => {
  if (!center || vertices.length < 3) return;

  btnAnalyze.disabled = true;
  btnAnalyze.textContent = "⏳ Leyendo satélites sobre tu finca...";

  try {
    const climUrl = `https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=${CORE_PARAMETERS.join(",")}&community=AG&longitude=${center.lng.toFixed(4)}&latitude=${center.lat.toFixed(4)}&format=JSON`;

    const [climData, histData, relieve] = await Promise.all([
      fetch(climUrl).then((r) => r.json()),
      obtenerHistorial5Anios(center),
      obtenerRelieve(center, vertices)
    ]);

    const v = climData.properties.parameter;
    renderizarHistoriaParaProductor(v, histData, relieve);

    storyResults.classList.remove("hidden");
    document.getElementById("step-2").scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    alert("No pudimos conectar con el satélite. Revisá tu señal e intentá de nuevo.");
    console.error(err);
  } finally {
    btnAnalyze.disabled = false;
    btnAnalyze.textContent = "🔍 Actualizar análisis de mi tierra";
  }
});

function renderizarHistoriaParaProductor(v, hist, relieve) {
  const lluviaAnual = Math.round(v.PRECTOTCORR_SUM?.ANN ?? 0);
  const gwetTop = v.GWETTOP?.ANN ?? 0.2;
  const gwetRoot = v.GWETROOT?.ANN ?? 0.35;
  const tsMax = Math.round(v.TS_MAX?.ANN ?? 35);
  const tMinSep = v.T2M_MIN?.SEP ?? 4;
  const tMinOct = v.T2M_MIN?.OCT ?? 6;
  const turno = selTurn.value;
  const goal = selGoal.value;

  const diasTurnoMap = { secano: 99, canal_21: 21, canal_15: 15, canal_8: 8, goteo: 2 };
  const diasTurno = diasTurnoMap[turno] || 15;

  // 1. TITULAR PRINCIPAL
  const esArido = lluviaAnual < 350;
  document.getElementById("headline-verdict").textContent = esArido
    ? `Finca en zona seca (${lluviaAnual} mm de lluvia al año): cuidar cada gota es la clave`
    : `Finca con buen aporte de lluvia (${lluviaAnual} mm al año): tierra con buen potencial`;

  document.getElementById("subheadline-verdict").textContent =
    `Parcela de ${areaHa.toFixed(2)} hectáreas · Altura: ${relieve.altitud} metros · Terreno ${
      relieve.pendiente > 3.5 ? "con pendiente (" + relieve.pendiente + "%)" : "parejo y fácil de regar"
    }.`;

  // 2. SEMÁFORO DE 4 TARJETAS SIMPLES
  const hayRiesgoSal = gwetTop < 0.24 && gwetRoot > gwetTop + 0.08;
  const hayHeladaTardia = tMinSep < 0.5 || tMinOct < 1.5;

  const tarjetas = [
    {
      estado: esArido && turno === "secano" ? "danger" : esArido ? "warn" : "ok",
      icono: "💧",
      titulo: "Agua disponible",
      valor: esArido ? "Depende 100% del riego" : "Buena lluvia natural",
      texto: esArido
        ? `Llueve muy poco (${lluviaAnual} mm/año). Tu cosecha depende de aprovechar bien cada turno de agua.`
        : `Las lluvias acompañan gran parte del año sin depender tanto del canal.`
    },
    {
      estado: hayRiesgoSal ? "warn" : "ok",
      icono: "🧂",
      titulo: "Riesgo de sal en el suelo",
      valor: hayRiesgoSal ? "Atención: sube sal arriba" : "Suelo equilibrado",
      texto: hayRiesgoSal
        ? "Abajo hay humedad pero arriba se seca rápido: el sol chupa el agua y deja la sal en la superficie."
        : "La humedad entre la superficie y las raíces está bien repartida."
    },
    {
      estado: tsMax > 45 ? "danger" : "ok",
      icono: "☀️",
      titulo: "Golpe de calor en la tierra",
      valor: tsMax > 45 ? `Tierra muy caliente (${tsMax}°C)` : `Temperatura manejable (${tsMax}°C)`,
      texto:
        tsMax > 45
          ? "En verano el suelo pelado quema las raíces finas y mata los bichitos buenos de la tierra."
          : "El suelo mantiene una temperatura segura para el crecimiento de raíces."
    },
    {
      estado: hayHeladaTardia ? "warn" : "ok",
      icono: "❄️",
      titulo: "Frío y heladas tardías",
      valor: hayHeladaTardia ? "Cuidado en Septiembre" : "Bajo riesgo en primavera",
      texto: hayHeladaTardia
        ? `Todavía hiela en septiembre (${tMinSep}°C)${relieve.esBajo ? " y tu lote es un bajo donde se junta el frío" : ""}. No adelantes siembras delicadas.`
        : "Las temperaturas de primavera arrancan parejas para sembrar sin sustos."
    }
  ];

  document.getElementById("traffic-cards").innerHTML = tarjetas
    .map(
      (t) => `
      <div class="traffic-card ${t.estado}">
        <div class="traffic-icon">${t.icono}</div>
        <div class="traffic-label">${t.titulo}</div>
        <div class="traffic-status">${t.valor}</div>
        <p class="traffic-explain">${t.texto}</p>
      </div>
    `
    )
    .join("");

  // 3A. ILUSTRACIÓN SVG DEL PERFIL DE SUELO
  const pctTop = Math.min(100, Math.round(gwetTop * 100));
  const pctRoot = Math.min(100, Math.round(gwetRoot * 100));

  document.getElementById("soil-illustration").innerHTML = `
    <svg viewBox="0 0 360 195" width="100%" style="background:#fff; border-radius:12px; border:1px solid #dce5df;">
      <!-- Cielo y Sol -->
      <rect x="0" y="0" width="360" height="52" fill="#e0f2fe" />
      <circle cx="315" cy="24" r="14" fill="#f59e0b" />
      <text x="14" y="22" font-size="11" font-weight="bold" fill="#0369a1">☀️ Sol y aire arriba</text>
      <text x="14" y="38" font-size="10" fill="#475569">Evaporación directa desde la superficie</text>

      <!-- Capa Superficial (0-10 cm) -->
      <rect x="0" y="52" width="360" height="56" fill="#d6b892" />
      <rect x="0" y="52" width="${Math.max(25, pctTop * 3.6)}" height="56" fill="#38bdf8" opacity="0.35" />
      <text x="14" y="75" font-size="12" font-weight="bold" fill="#451a03">Capa de arriba (donde nace la semilla)</text>
      <text x="14" y="93" font-size="11" fill="#451a03">Humedad guardada: ${pctTop}% ${pctTop < 25 ? "⚠️ Se seca muy rápido" : "✅ Buena"}</text>

      <!-- Capa Profunda de Raíces (10-100 cm) -->
      <rect x="0" y="108" width="360" height="87" fill="#8c6239" />
      <rect x="0" y="108" width="${Math.max(35, pctRoot * 3.6)}" height="87" fill="#0284c7" opacity="0.45" />
      <text x="14" y="136" font-size="12" font-weight="bold" fill="#ffffff">Zona profunda (donde toman agua las raíces)</text>
      <text x="14" y="155" font-size="11" fill="#f0f9ff">Reserva de agua profunda: ${pctRoot}% ${pctRoot > 32 ? "✅ Buena reserva" : "⚠️ Poca reserva"}</text>
      <text x="14" y="176" font-size="10" fill="#fde68a">💡 Consejo: si tapás la capa de arriba con pasto o cobertura, no se escapa el agua de abajo.</text>
    </svg>
  `;

  document.getElementById("soil-caption").textContent =
    pctRoot > pctTop + 10
      ? "Tenés buena agua guardada abajo, pero la capa de arriba se seca rápido. Tapar el suelo evita que esa humedad se pierda al aire."
      : "La humedad está pareja en todo el perfil del suelo.";

  // 3B. GRÁFICO DE BARRAS MES A MES (LLUVIA VS EVAPORACIÓN)
  const lluviasMes = MESES.map((m) => v.PRECTOTCORR_SUM?.[m] ?? 0);
  const evapMes = MESES.map((m) => Math.round((v.EVLAND?.[m] ?? 1) * 30));
  const maxVal = Math.max(...lluviasMes, ...evapMes, 60);

  document.getElementById("monthly-bars-chart").innerHTML = MESES.map((m, i) => {
    const hRain = Math.max(4, Math.round((lluviasMes[i] / maxVal) * 115));
    const hEvap = Math.max(4, Math.round((evapMes[i] / maxVal) * 115));
    return `
      <div class="bar-col" title="${MESES_CORTOS[i]}: Lluvia ${lluviasMes[i]} mm · Evaporación ~${evapMes[i]} mm">
        <div class="bar-pair">
          <div class="bar-fill rain" style="height:${hRain}px"></div>
          <div class="bar-fill evap" style="height:${hEvap}px"></div>
        </div>
        <span class="bar-month">${MESES_CORTOS[i]}</span>
      </div>
    `;
  }).join("");

  document.getElementById("water-caption").textContent =
    "Las barras naranjas muestran cuánto agua se lleva el sol cada mes. Cuando la barra naranja supera mucho a la azul, el riego y la cobertura son indispensables.";

  // 3C. HISTORIAL 5 AÑOS VISUAL
  document.getElementById("five-years-visual").innerHTML = hist.detalle
    .map((y) => {
      const pctDesnudo = Math.round((y.mesesDesnudo / 12) * 100);
      return `
        <div class="year-pill-card">
          <strong>${y.anio}</strong>
          <div class="year-bar-track">
            <div class="year-bar-exposed" style="width:${pctDesnudo}%"></div>
          </div>
          <span><b>${y.mesesDesnudo} meses</b> sin cobertura</span>
          <span>${12 - y.mesesDesnudo} meses verde</span>
        </div>
      `;
    })
    .join("");

  document.getElementById("history-caption").textContent =
    hist.promDesnudo >= 4
      ? `En los últimos 5 años, tu lote quedó pelado un promedio de ${hist.promDesnudo} meses por año. ${
          hist.subeSal ? "Además se nota una tendencia a acumular más sal en superficie." : ""
        } Sembrar un puente verde en invierno corta este problema.`
      : `¡Muy bien! Tu finca mantuvo cobertura vegetal la mayor parte de los últimos 5 años (solo ${hist.promDesnudo} meses/año descubierta).`;

  // 4. QUÉ SEMBRAR Y QUÉ EVITAR
  const buenos = [];
  const malos = [];

  CULTIVOS_CAMPO.forEach((c) => {
    if (c.requiereLluviaMm && lluviaAnual < c.requiereLluviaMm && turno === "secano") {
      malos.push(c);
      return;
    }
    if (turno !== "secano" && c.maxDiasSinAgua < diasTurno) {
      malos.push(c);
      return;
    }
    if (turno === "secano" && !c.requiereLluviaMm && lluviaAnual < 450 && c.maxDiasSinAgua < 25) {
      malos.push(c);
      return;
    }
    buenos.push(c);
  });

  document.getElementById("list-good-crops").innerHTML = buenos
    .map((c) => `<li><strong>${c.nombre}</strong><span>${c.motivoOk}</span></li>`)
    .join("");

  document.getElementById("list-bad-crops").innerHTML =
    malos.length > 0
      ? malos.map((c) => `<li><strong>${c.nombre}</strong><span>${c.motivoNo}</span></li>`).join("")
      : `<li><strong>Ningún cultivo restringido</strong><span>Con tu disponibilidad de agua podés manejar casi cualquier opción.</span></li>`;

  // 5. PLAN DE ACCIÓN EN 3 PASOS (ROTACIÓN SIMBIÓTICA)
  const cultivoVerano =
    diasTurno <= 8
      ? "Tomate o pimiento sobre rastrojo"
      : diasTurno <= 15
      ? "Zapallo anco, melón o sorgo"
      : "Sorgo granífero o cebada rústica";

  const cultivoConsolidacion =
    hayRiesgoSal || goal === "regeneracion"
      ? "Alfalfa por 2 a 3 años"
      : "Avena con trébol de olor";

  const pasosPlan = [
    {
      paso: "1️⃣ Este Otoño / Invierno",
      titulo: "Tapar la tierra con Vicia + Centeno",
      desc: "Aprovechá el frío para sembrar este abono verde. Evita que el sol saque la sal hacia arriba, frena el viento y deja nitrógeno natural listo en la tierra."
    },
    {
      paso: "2️⃣ Primavera / Verano",
      titulo: `Sembrar ${cultivoVerano}`,
      desc: "Aplastás el verde del invierno y sembrás encima. Ese colchón mantiene húmedo el surco entre tus turnos de riego y alimenta gratis al cultivo."
    },
    {
      paso: "3️⃣ Próximo Ciclo",
      titulo: `Rotar con ${cultivoConsolidacion}`,
      desc: "Sus raíces bajan profundo, abren canales naturales para que entre mejor el agua de riego y limpian las sales lejos de las raíces."
    }
  ];

  document.getElementById("action-roadmap").innerHTML = pasosPlan
    .map(
      (p) => `
      <div class="roadmap-card">
        <span class="roadmap-step-num">${p.paso}</span>
        <h4>${p.titulo}</h4>
        <p>${p.desc}</p>
      </div>
    `
    )
    .join("");

  // COMPARATIVA SIMPLE ANTES VS DESPUÉS
  document.getElementById("before-after-grid").innerHTML = `
    <div class="ba-col old">
      <h4>😐 Si seguís trabajando como siempre</h4>
      <ul>
        <li>El suelo queda pelado varios meses y se pierde agua por evaporación.</li>
        <li>Sube la sal a la superficie y cuesta más hacer nacer la semilla.</li>
        <li>Si se atrasa un turno de agua, el cultivo sufre golpe de calor.</li>
      </ul>
    </div>
    <div class="ba-col new">
      <h4>🚀 Si aplicás este plan sincronizado</h4>
      <ul>
        <li>El colchón verde guarda hasta un 30% más de humedad entre turnos de riego.</li>
        <li>El suelo produce su propio abono natural y baja la salinidad.</li>
        <li>Elegís cultivos que calzan justo con el agua real que tenés en tu finca.</li>
      </ul>
    </div>
  `;
}
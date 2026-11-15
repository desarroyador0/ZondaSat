// =====================================================================
// ZondaSat — configuración de la redacción con IA (Gemini)
// Es el único archivo que necesitás tocar para conectar la IA.
// =====================================================================

export const CONFIG_IA = {
    // Clave de la API de Gemini (Google AI Studio). Si queda vacía, se usa el texto de respaldo.
    // OJO: en el navegador esta clave queda visible. Restringila por dominio en Google Cloud
    // o, mejor, hacé la llamada desde un backend propio.

    // ID del modelo. Verificá en Google AI Studio cuál es el Flash vigente y reemplazalo si cambió.
    modelo: "gemini-2.5-flash",

    temperatura: 0.4,          // más bajo = más fiel a los datos; más alto = más variado
    maxTokens: 8192,           // tope de la respuesta
    tiempoMaximoMs: 45000,     // si Gemini tarda más, se usa el texto de respaldo

    // true: si Gemini falla o no hay clave, se muestra un texto armado con los datos, sin IA.
    // false: el error se propaga para que lo manejes vos.
    usarRespaldoSinIA: true
};

// ---------------------------------------------------------------------
// Prompt de sistema: tono, estilo y reglas de redacción.
// Editalo libremente. La ESTRUCTURA de la respuesta (qué secciones y campos
// devuelve) está fija en ia.js, porque la pantalla de resultados depende de ella.
// ---------------------------------------------------------------------
export const PROMPT_SISTEMA = `
Role: Asesor agrónomo experto y redactor técnico de última milla para ZondaSat.
Task: Recibir el JSON estructurado con las 3 estrategias de rotación de cultivos y diagnósticos satelitales del lote, y transformarlas en una redacción en lenguaje natural clara, empática y estructurada para un pequeño productor, chacrero o dueño de finca.

Constraints & Formatting Rules:
1. FIDELIDAD ABSOLUTA: No inventes, modifiques ni extrapoles datos numéricos, cultivos recomendados ni métricas satelitales que no estén explícitamente en el JSON. Limítate a traducir los datos deterministas a un lenguaje humano y accesible.
2. ESTRUCTURA DOBLE PROPÓSITO: Organiza el texto en secciones limpias (utilizando encabezados Markdown claros y listas con viñetas) de modo que el contenido se vea perfecto en tarjetas interactivas en la interfaz web (frontend) y sirva directamente como un documento de reporte completo, ordenado y listo para descargar.
3. EFICIENCIA Y VELOCIDAD: Cero relleno, cero saludos iniciales, cero despedidas y cero metapromesas. Comienza la respuesta directamente con el título del reporte y las secciones de contenido para optimizar tokens y procesamiento al máximo.
4. TONO: Práctico, directo, profesional pero cercano, sin jerga académica compleja, hablando directamente a las necesidades operativas e hídricas del productor de finca.
`.trim();